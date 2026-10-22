// =============================================================================
// GIM ROYAL — "Bot Breuer" : adversaire IA du mode Entraînement.
// Il joue avec exactement les mêmes règles qu'un humain (élixir, main, zones),
// en passant par Match.deploy() : aucun avantage caché.
// =============================================================================

import { CARDS } from '../../shared/cards.js';
import { canDeploy, snapToGrid, localY, globalY } from '../../shared/zones.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const TANKS = ['theo', 'mohammed', 'ibrahima'];

export class Bot {
  constructor(match, player) {
    this.match = match;
    this.p = player;
    this.nextThink = 2;
    this.reserve = rand(0, 2);
  }

  update(dt) {
    this.nextThink -= dt;
    if (this.nextThink > 0) return;
    this.nextThink = rand(0.5, 1.1);

    const m = this.match;
    const w = m.world;
    const L = w.layout;
    const p = this.p;
    const ly = (y) => localY(L, p.team, y);
    const gy = (y) => globalY(L, p.team, y);

    const playable = p.hand
      .map((id, i) => ({ id, i, card: CARDS[id] }))
      .filter((h) => h.card && h.card.cost <= p.elixir);
    if (!playable.length) return;

    const all = [...w.entities.values()].filter((e) => e.alive && e.kind === 'troop' && e.deployed);
    const enemies = all.filter((e) => e.team !== p.team && !e.stealthed);
    const allies = all.filter((e) => e.team === p.team);
    const threats = enemies.filter((e) => ly(e.y) < L.riverMax + 1.5);

    let choice = null;
    let pos = null;

    if (threats.length) {
      // Défense : on répond à l'unité la plus avancée
      const th = threats.reduce((a, b) => (ly(a.y) < ly(b.y) ? a : b));
      const bureau = playable.find((h) => h.id === 'bureau');
      const defenders = playable.filter((h) => h.card.type === 'troop' && h.card.stats.targets !== 'buildings');
      const air = th.flying ? defenders.filter((h) => h.card.stats.targets === 'all') : defenders;
      if (bureau && th.maxHp >= 2000) {
        choice = bureau;
        pos = [L.width / 2, gy(9)];
      } else if (air.length) {
        choice = pick(air);
        const targetLy = Math.min(L.riverMin - 1, Math.max(1.5, ly(th.y) - (choice.card.stats.range > 3 ? 4 : 2)));
        pos = [th.x + rand(-1, 1), gy(targetLy)];
      }
    }

    if (!choice) {
      const hurt = allies.filter((a) => a.hp < a.maxHp * 0.6);
      const pushing = allies.filter((a) => (p.team === 0 ? a.y > L.riverMax : a.y < L.riverMin));
      const brioche = playable.find((h) => h.id === 'brioche');
      const poliakov = playable.find((h) => h.id === 'poliakov');
      if (brioche && hurt.length >= 2) {
        choice = brioche;
        pos = [hurt[0].x, hurt[0].y];
      } else if (poliakov && pushing.length >= 2) {
        choice = poliakov;
        pos = [pushing[0].x, pushing[0].y];
      }
    }

    if (!choice && p.elixir >= Math.min(10, 7 + this.reserve)) {
      // Attaque : tank en fond de terrain ou rusher au pont
      const bridge = pick(L.bridges);
      const bx = (bridge.xMin + bridge.xMax) / 2;
      const tank = playable.find((h) => TANKS.includes(h.id));
      const troops = playable.filter((h) => h.card.type === 'troop');
      if (tank) {
        choice = tank;
        pos = [bx, gy(9)];
      } else if (troops.length) {
        choice = pick(troops);
        pos = [bx, gy(L.riverMin - 1)];
      }
      this.reserve = rand(0, 3);
    }

    if (!choice) return;
    const card = choice.card;
    const state = w.deployState();
    const candidates = [
      pos,
      [pos[0], gy(Math.min(L.riverMin - 1.5, Math.max(1, ly(pos[1]))))],
      [L.width / 2, gy(10)],
      [L.width / 2 + rand(-4, 4), gy(rand(4, 12))],
    ];
    for (const [cx, cy] of candidates) {
      const x = snapToGrid(Math.min(L.width - 1, Math.max(1, cx)));
      const y = snapToGrid(Math.min(L.length - 1, Math.max(1, cy)));
      if (canDeploy(L, p.team, card, x, y, state)) {
        m.deploy(p.index, { handIndex: choice.i, cardId: choice.id, x, y });
        return;
      }
    }
  }
}
