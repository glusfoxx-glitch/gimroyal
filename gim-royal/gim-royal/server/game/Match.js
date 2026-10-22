// =============================================================================
// GIM ROYAL — Cycle de vie d'un match : draft (Tirage Triple), décompte, combat,
// prolongations, fin. Gère l'élixir (x1 puis x2), les mains de cartes et la
// validation stricte de chaque action envoyée par les clients.
// =============================================================================

import { World } from './World.js';
import { Bot } from './Bot.js';
import { CARDS, CARD_ORDER } from '../../shared/cards.js';
import { MATCH_RULES as R, MODES } from '../../shared/constants.js';
import { canDeploy, snapToGrid } from '../../shared/zones.js';

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class Match {
  /**
   * @param {object} o
   * @param {string} o.id
   * @param {'classic'|'duo'|'draft'|'training'} o.mode
   * @param {Array<{pseudo:string, team:0|1, deck?:string[], bot?:boolean}>} o.players
   * @param {(playerIndex:number, event:string, data:any)=>void} o.emit
   * @param {(match:Match)=>void} o.onEnd
   */
  constructor({ id, mode, players, emit, onEnd }) {
    this.id = id;
    this.modeId = mode;
    this.mode = MODES[mode];
    this.world = new World(this.mode.layout);
    this.layout = this.world.layout;
    this.emit = emit;
    this.onEnd = onEnd;
    this.players = players.map((p, index) => ({
      index,
      pseudo: p.pseudo,
      team: p.team,
      bot: !!p.bot,
      connected: !p.bot,
      awayFor: 0,
      forfeited: false,
      deck: p.deck ? [...p.deck] : [],
      hand: [],
      queue: [],
      elixir: R.elixirStart,
      lastDeployAt: -10,
      draftPicks: [],
      draftOptions: [],
      draftPicked: false,
    }));
    this.phase = this.mode.draft ? 'draft' : 'countdown';
    this.phaseTime = 0;
    this.elapsed = 0;
    this.draftRound = 0;
    this.result = null;
    this.bots = this.players.filter((p) => p.bot).map((p) => new Bot(this, p));
    if (this.mode.draft) this.startDraftRound();
    else this.dealAll();
  }

  info(index) {
    const p = this.players[index];
    return {
      matchId: this.id,
      mode: this.modeId,
      layoutId: this.layout.id,
      index,
      team: p.team,
      players: this.players.map((q) => ({ index: q.index, pseudo: q.pseudo, team: q.team, bot: q.bot })),
    };
  }

  dealAll() {
    for (const p of this.players) {
      const deck = shuffle(p.deck);
      p.hand = deck.slice(0, R.handSize);
      p.queue = deck.slice(R.handSize);
    }
  }

  // --------------------------------------------------------------- TIRAGE TRIPLE
  startDraftRound() {
    this.draftRound++;
    this.phaseTime = 0;
    for (const p of this.players) {
      const pool = CARD_ORDER.filter((id) => !p.draftPicks.includes(id));
      p.draftOptions = shuffle(pool).slice(0, R.draftChoices);
      p.draftPicked = false;
    }
  }

  draftPick(index, cardId) {
    if (this.phase !== 'draft') return;
    const p = this.players[index];
    if (!p || p.draftPicked || typeof cardId !== 'string' || !p.draftOptions.includes(cardId)) return;
    p.draftPicks.push(cardId);
    p.draftPicked = true;
  }

  updateDraft() {
    for (const p of this.players) {
      if (p.bot && !p.draftPicked) this.draftPick(p.index, p.draftOptions[Math.floor(Math.random() * p.draftOptions.length)]);
    }
    const allPicked = this.players.every((p) => p.draftPicked);
    if (!allPicked && this.phaseTime < R.draftRoundTime) return;
    for (const p of this.players) {
      if (!p.draftPicked) this.draftPick(p.index, p.draftOptions[Math.floor(Math.random() * p.draftOptions.length)]);
    }
    if (this.draftRound >= R.draftRounds) {
      for (const p of this.players) p.deck = [...p.draftPicks];
      this.dealAll();
      this.phase = 'countdown';
      this.phaseTime = 0;
    } else {
      this.startDraftRound();
    }
  }

  // --------------------------------------------------------------- BOUCLE
  update(dt) {
    if (this.phase === 'ended') return;
    this.phaseTime += dt;
    this.checkAbsences(dt);
    if (this.phase === 'ended') return;
    switch (this.phase) {
      case 'draft':
        this.updateDraft();
        break;
      case 'countdown':
        if (this.phaseTime >= R.countdown) {
          this.phase = 'battle';
          this.phaseTime = 0;
        }
        break;
      case 'battle':
      case 'overtime':
        this.battleStep(dt);
        break;
      default:
        break;
    }
  }

  isDoubleElixir() {
    return this.phase === 'overtime' || (this.phase === 'battle' && this.elapsed >= R.doubleElixirAt);
  }

  battleStep(dt) {
    this.elapsed += dt;
    const rate = (this.isDoubleElixir() ? 2 : 1) / R.elixirSecondsPerUnit;
    for (const p of this.players) p.elixir = Math.min(R.elixirMax, p.elixir + rate * dt);
    for (const b of this.bots) b.update(dt);
    this.world.step(dt);
    this.checkEnd();
  }

  checkEnd() {
    const w = this.world;
    const [c0, c1] = w.crowns;
    if (w.kingDestroyed[0] || w.kingDestroyed[1]) {
      this.finish(w.kingDestroyed[1] ? 0 : 1, 'king');
      return;
    }
    if (this.phase === 'battle' && this.elapsed >= R.battleDuration) {
      if (c0 !== c1) {
        this.finish(c0 > c1 ? 0 : 1, 'time');
        return;
      }
      this.phase = 'overtime';
      this.phaseTime = 0;
      return;
    }
    if (this.phase === 'overtime') {
      if (c0 !== c1) {
        this.finish(c0 > c1 ? 0 : 1, 'suddendeath');
        return;
      }
      if (this.elapsed >= R.battleDuration + R.overtimeDuration) {
        const h0 = w.lowestTowerHp(0);
        const h1 = w.lowestTowerHp(1);
        if (Math.abs(h0 - h1) < 1) this.finish(-1, 'draw');
        else this.finish(h0 > h1 ? 0 : 1, 'tiebreak');
      }
    }
  }

  checkAbsences(dt) {
    for (const p of this.players) {
      if (p.bot || p.forfeited) continue;
      if (p.connected) {
        p.awayFor = 0;
        continue;
      }
      p.awayFor += dt;
      if (p.awayFor >= R.reconnectGrace) this.forfeit(p.index);
    }
  }

  setConnected(index, connected) {
    const p = this.players[index];
    if (!p) return;
    p.connected = connected;
    if (connected) p.awayFor = 0;
  }

  forfeit(index) {
    if (this.phase === 'ended') return;
    const p = this.players[index];
    if (!p) return;
    p.forfeited = true;
    p.connected = false;
    const teamGone = this.players.filter((q) => q.team === p.team && !q.bot).every((q) => q.forfeited);
    if (teamGone) this.finish(1 - p.team, 'forfeit');
  }

  abort() {
    if (this.phase !== 'ended') this.finish(-1, 'error');
  }

  finish(winnerTeam, reason) {
    if (this.phase === 'ended') return;
    this.broadcast();
    this.phase = 'ended';
    const crowns = [...this.world.crowns];
    this.result = { winnerTeam, reason, crowns };
    for (const p of this.players) {
      if (p.bot) continue;
      const outcome = winnerTeam === -1 ? 'draw' : winnerTeam === p.team ? 'win' : 'loss';
      p.outcome = outcome;
      this.emit(p.index, 'match:end', {
        result: outcome,
        reason,
        myCrowns: crowns[p.team],
        enemyCrowns: crowns[1 - p.team],
      });
    }
    this.onEnd(this);
  }

  // --------------------------------------------------------------- ACTIONS JOUEUR
  toast(index, message) {
    this.emit(index, 'toast', { message });
  }

  deploy(index, payload) {
    const p = this.players[index];
    if (!p || p.forfeited) return false;
    if (this.phase !== 'battle' && this.phase !== 'overtime') {
      this.toast(index, 'Attends le début du combat !');
      return false;
    }
    if (!payload || typeof payload !== 'object') return false;
    const { handIndex, cardId } = payload;
    const x = Number(payload.x);
    const y = Number(payload.y);
    if (!Number.isInteger(handIndex) || handIndex < 0 || handIndex >= R.handSize) return false;
    if (p.hand[handIndex] !== cardId) {
      this.toast(index, 'Carte non disponible.');
      return false;
    }
    if (this.world.time - p.lastDeployAt < R.deployCooldown) return false;
    const card = CARDS[cardId];
    if (!card) return false;
    if (p.elixir < card.cost) {
      this.toast(index, "Pas assez d'élixir !");
      return false;
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    const sx = snapToGrid(x);
    const sy = snapToGrid(y);
    if (!canDeploy(this.layout, p.team, card, sx, sy, this.world.deployState())) {
      this.toast(index, 'Zone interdite !');
      return false;
    }
    p.elixir -= card.cost;
    p.lastDeployAt = this.world.time;
    p.hand[handIndex] = p.queue.shift();
    p.queue.push(cardId);
    this.world.spawnCard(cardId, p.team, p.index, sx, sy);
    return true;
  }

  ability(index, payload) {
    if (this.phase !== 'battle' && this.phase !== 'overtime') return false;
    const unitId = Number(payload?.unitId);
    if (!Number.isInteger(unitId)) return false;
    return this.world.toggleDodo(unitId, index);
  }

  // --------------------------------------------------------------- RÉSEAU
  timeLeft() {
    if (this.phase === 'battle') return Math.max(0, R.battleDuration - this.elapsed);
    if (this.phase === 'overtime') return Math.max(0, R.battleDuration + R.overtimeDuration - this.elapsed);
    if (this.phase === 'ended') return 0;
    return R.battleDuration;
  }

  snapshotFor(p) {
    const w = this.world;
    const s = {
      ph: this.phase,
      tl: r1(this.timeLeft()),
      x2: this.isDoubleElixir(),
      cr: w.crowns,
      el: r2(p.elixir),
      hd: p.hand,
      nx: p.queue[0] ?? null,
      mt: this.players.filter((q) => q.team === p.team && q !== p).map((q) => [q.index, r1(q.elixir), q.connected || q.bot]),
      u: w.serializeUnits(p.team),
      tw: w.serializeTowers(),
      pr: w.serializeProjectiles(),
      zn: w.serializeZones(),
      fx: w.fx,
    };
    if (this.phase === 'draft') {
      s.dr = {
        round: this.draftRound,
        total: R.draftRounds,
        options: p.draftOptions,
        picked: p.draftPicked,
        picks: p.draftPicks,
        left: r1(Math.max(0, R.draftRoundTime - this.phaseTime)),
      };
    }
    if (this.phase === 'countdown') s.cd = r1(Math.max(0, R.countdown - this.phaseTime));
    return s;
  }

  broadcast() {
    if (this.phase === 'ended') return;
    for (const p of this.players) {
      if (p.bot || !p.connected) continue;
      this.emit(p.index, 's', this.snapshotFor(p));
    }
    this.world.fx = [];
  }
}
