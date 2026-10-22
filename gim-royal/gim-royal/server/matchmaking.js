// =============================================================================
// GIM ROYAL — Matchmaking, sessions Socket.io et boucle de jeu globale (20 Hz).
// - Files d'attente par mode (1V1 Classique, 2V2, Tirage Triple) + Entraînement vs Bot
// - Reconnexion automatique à une partie en cours (30 s de grâce)
// - Une seule session active par pseudo
// =============================================================================

import crypto from 'node:crypto';
import { Match } from './game/Match.js';
import { MODES, DT, TICK_RATE, SNAPSHOT_EVERY } from '../shared/constants.js';
import { validateDeck, CARD_ORDER } from '../shared/cards.js';

const BOT_DECKS = [
  ['theo', 'alycia', 'vladimir', 'nolan', 'adam', 'aisha', 'pasparfait', 'poliakov'],
  ['mohammed', 'clement', 'celine', 'emircan', 'aminematue', 'bureau', 'brioche', 'aisha'],
  ['ibrahima', 'yann', 'matheo', 'pasparfait', 'beti', 'vladimir', 'alycia', 'poliakov'],
];

export class Matchmaker {
  constructor({ io, db }) {
    this.io = io;
    this.db = db;
    this.queues = { classic: [], duo: [], draft: [] };
    this.matches = new Map();
    this.byPseudo = new Map(); // pseudo -> { matchId, index }
    this.sockets = new Map(); // pseudo -> socket
    this.tick = 0;
    this.startLoop();
  }

  emitTo(pseudo, event, data) {
    const s = this.sockets.get(pseudo);
    if (s) s.emit(event, data);
  }

  toast(socket, message) {
    socket.emit('toast', { message });
  }

  handleConnection(socket) {
    const pseudo = socket.data.pseudo;
    const prev = this.sockets.get(pseudo);
    this.sockets.set(pseudo, socket);
    if (prev && prev.id !== socket.id) {
      prev.data.replaced = true;
      prev.emit('kicked', { message: 'Ta session a été ouverte sur un autre appareil.' });
      prev.disconnect(true);
    }

    this.db
      .getProfile(pseudo)
      .then((profile) => socket.emit('session', profile))
      .catch((err) => console.error('[db] profil', err));

    const active = this.activeMatchOf(pseudo);
    if (active) {
      active.match.setConnected(active.index, true);
      socket.emit('match:found', active.match.info(active.index));
    }

    socket.on('queue:join', (payload) => this.join(socket, payload));
    socket.on('queue:leave', () => this.leaveQueues(pseudo, true));
    socket.on('match:sync', () => {
      const a = this.activeMatchOf(pseudo);
      if (a) {
        a.match.setConnected(a.index, true);
        socket.emit('match:found', a.match.info(a.index));
      } else socket.emit('match:none');
    });
    socket.on('match:deploy', (payload) => {
      const a = this.activeMatchOf(pseudo);
      if (a) a.match.deploy(a.index, payload);
    });
    socket.on('match:ability', (payload) => {
      const a = this.activeMatchOf(pseudo);
      if (a) a.match.ability(a.index, payload);
    });
    socket.on('draft:pick', (payload) => {
      const a = this.activeMatchOf(pseudo);
      if (a) a.match.draftPick(a.index, payload?.cardId);
    });
    socket.on('match:leave', () => {
      const a = this.activeMatchOf(pseudo);
      if (a) a.match.forfeit(a.index);
    });
    socket.on('disconnect', () => this.onDisconnect(socket));
  }

  activeMatchOf(pseudo) {
    const ref = this.byPseudo.get(pseudo);
    if (!ref) return null;
    const match = this.matches.get(ref.matchId);
    if (!match || match.phase === 'ended') {
      this.byPseudo.delete(pseudo);
      return null;
    }
    return { match, index: ref.index };
  }

  onDisconnect(socket) {
    const pseudo = socket.data.pseudo;
    if (this.sockets.get(pseudo) !== socket) return; // remplacé par une session plus récente
    this.sockets.delete(pseudo);
    this.leaveQueues(pseudo, false);
    const a = this.activeMatchOf(pseudo);
    if (a) a.match.setConnected(a.index, false);
  }

  join(socket, payload) {
    const pseudo = socket.data.pseudo;
    const mode = payload?.mode;
    const def = MODES[mode];
    if (!def) return this.toast(socket, 'Mode de jeu inconnu.');
    if (this.activeMatchOf(pseudo)) {
      const a = this.activeMatchOf(pseudo);
      socket.emit('match:found', a.match.info(a.index));
      return;
    }
    this.leaveQueues(pseudo, false);
    let deck = null;
    if (!def.draft) {
      deck = payload?.deck;
      if (!validateDeck(deck)) return this.toast(socket, 'Deck invalide : il faut 8 cartes différentes.');
    }
    if (def.bot) {
      const botDeck = BOT_DECKS[Math.floor(Math.random() * BOT_DECKS.length)].filter((id) => CARD_ORDER.includes(id));
      this.createMatch(mode, [
        { pseudo, deck, team: 0 },
        { pseudo: 'Bot Breuer', deck: botDeck, team: 1, bot: true },
      ]);
      return;
    }
    const q = this.queues[mode];
    q.push({ pseudo, deck, joinedAt: Date.now() });
    this.tryMatch(mode);
    this.broadcastQueue(mode);
  }

  leaveQueues(pseudo, notify) {
    for (const mode of Object.keys(this.queues)) {
      const q = this.queues[mode];
      const i = q.findIndex((e) => e.pseudo === pseudo);
      if (i >= 0) {
        q.splice(i, 1);
        this.broadcastQueue(mode);
      }
    }
    if (notify) this.emitTo(pseudo, 'queue:status', { mode: null, waiting: 0, needed: 0 });
  }

  broadcastQueue(mode) {
    const q = this.queues[mode];
    const needed = MODES[mode].players;
    for (const e of q) this.emitTo(e.pseudo, 'queue:status', { mode, waiting: q.length, needed, since: e.joinedAt });
  }

  tryMatch(mode) {
    const q = this.queues[mode];
    const needed = MODES[mode].players;
    while (q.length >= needed) {
      const entries = q.splice(0, needed);
      const teams = needed === 4 ? [0, 1, 0, 1] : [0, 1];
      this.createMatch(mode, entries.map((e, i) => ({ pseudo: e.pseudo, deck: e.deck, team: teams[i] })));
    }
  }

  createMatch(mode, players) {
    const id = crypto.randomUUID();
    let match = null;
    match = new Match({
      id,
      mode,
      players,
      emit: (index, event, data) => {
        const p = match?.players[index];
        if (p && !p.bot) this.emitTo(p.pseudo, event, data);
      },
      onEnd: (m) => this.onMatchEnd(m),
    });
    this.matches.set(id, match);
    match.players.forEach((p) => {
      if (p.bot) return;
      this.byPseudo.set(p.pseudo, { matchId: id, index: p.index });
      this.emitTo(p.pseudo, 'match:found', match.info(p.index));
    });
    const side = (t) => match.players.filter((p) => p.team === t).map((p) => p.pseudo).join(' & ');
    console.log(`[match] ${id} ${mode} : ${side(0)} vs ${side(1)}`);
    return match;
  }

  onMatchEnd(match) {
    for (const p of match.players) {
      if (p.bot) continue;
      if (this.byPseudo.get(p.pseudo)?.matchId === match.id) this.byPseudo.delete(p.pseudo);
      if (match.modeId !== 'training' && match.result?.reason !== 'error' && p.outcome) {
        this.db
          .recordResult(p.pseudo, p.outcome)
          .then(() => this.db.getProfile(p.pseudo))
          .then((profile) => this.emitTo(p.pseudo, 'session', profile))
          .catch((err) => console.error('[db] résultat', err));
      }
    }
    console.log(`[match] ${match.id} terminé (${match.result?.reason})`);
  }

  startLoop() {
    let last = performance.now();
    let acc = 0;
    this.timer = setInterval(() => {
      const now = performance.now();
      acc += (now - last) / 1000;
      last = now;
      let steps = 0;
      while (acc >= DT && steps < 4) {
        for (const m of this.matches.values()) {
          try {
            m.update(DT);
          } catch (err) {
            console.error('[match] erreur de simulation', m.id, err);
            m.abort();
          }
        }
        acc -= DT;
        steps++;
        this.tick++;
        if (this.tick % SNAPSHOT_EVERY === 0) {
          for (const m of this.matches.values()) {
            try {
              m.broadcast();
            } catch (err) {
              console.error('[match] erreur réseau', m.id, err);
            }
          }
        }
      }
      if (steps >= 4) acc = 0; // serveur surchargé : on ne rattrape pas indéfiniment
      for (const [id, m] of this.matches) if (m.phase === 'ended') this.matches.delete(id);
    }, 1000 / TICK_RATE);
  }

  stop() {
    clearInterval(this.timer);
  }
}
