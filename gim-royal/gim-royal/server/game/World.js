// =============================================================================
// GIM ROYAL — Simulation du champ de bataille (100 % côté serveur).
// Entités : tours (Gilet / Breuer), troupes, bâtiments, projectiles, zones de sorts.
// Chaque mécanique spéciale du document de game design est implémentée ici.
// =============================================================================

import { CARDS, TOWERS } from '../../shared/cards.js';
import { LAYOUTS, MATCH_RULES, FLAGS, EFFECTS } from '../../shared/constants.js';
import { laneOf } from '../../shared/zones.js';
import { NavGrid } from './Pathfinding.js';

const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;

export class World {
  constructor(layoutId) {
    this.layout = LAYOUTS[layoutId];
    this.time = 0;
    this.nextId = 1;
    this.entities = new Map();
    this.projectiles = [];
    this.zones = [];
    this.fx = [];
    this.crowns = [0, 0];
    this.kingDestroyed = [false, false];
    this.nav = new NavGrid(this.layout);
    this.navDirty = true;
    this.createTowers();
  }

  newId() {
    return this.nextId++;
  }

  emitFx(kind, x, y, a = 0, b = 0, c = 0) {
    this.fx.push([kind, r1(x), r1(y), a, b, c]);
  }

  // --------------------------------------------------------------- CRÉATION
  baseEntity({ kind, code, team, owner, x, y, stats }) {
    return {
      id: this.newId(),
      kind,
      code,
      team,
      owner,
      x,
      y,
      z: 0,
      hp: stats.hp,
      maxHp: stats.hp,
      alive: true,
      radius: stats.radius ?? 0.5,
      half: stats.half ?? 0,
      flying: !!stats.flying,
      targets: stats.targets || 'ground',
      damage: stats.damage || 0,
      damageMult: 1,
      hitSpeed: stats.hitSpeed || 1,
      firstHit: stats.firstHit ?? 0.3,
      range: stats.range || 0,
      sight: stats.sight || 6,
      speed: stats.speed || 0,
      mass: stats.mass || 3,
      stats,
      targetId: null,
      charge: 0,
      attackSeq: 0,
      facing: team === 0 ? 0 : Math.PI,
      path: null,
      pathIdx: 0,
      repathAt: 0,
      pathTargetId: null,
      pathTx: 0,
      pathTy: 0,
      stunUntil: 0,
      slowUntil: 0,
      rageUntil: 0,
      blindUntil: 0,
      poliakovUntil: 0,
      deployUntil: 0,
      deployed: true,
      attacking: false,
      retargetAt: 0,
      female: false,
      jumper: false,
      stealthed: false,
      shield: 0,
      synergy: false,
      charging: false,
      attractedTo: null,
      jump: null,
    };
  }

  createTowers() {
    const L = this.layout.length;
    for (const team of [0, 1]) {
      for (const def of this.layout.towers) {
        const tower = def.type === 'king' ? TOWERS.breuer : TOWERS.gilet;
        const e = this.baseEntity({
          kind: 'tower',
          code: tower.id,
          team,
          owner: -1,
          x: def.x,
          y: team === 0 ? def.y : L - def.y,
          stats: tower.stats,
        });
        e.towerType = def.type;
        e.key = def.key;
        e.lane = def.type === 'king' ? -1 : laneOf(this.layout, def.x);
        e.asleep = def.type === 'king';
        e.charge = e.hitSpeed - e.firstHit;
        this.entities.set(e.id, e);
      }
    }
  }

  spawnCard(cardId, team, owner, x, y) {
    const card = CARDS[cardId];
    if (!card) return null;
    if (card.type === 'spell') return this.castSpell(card, team, owner, x, y);
    if (card.type === 'building') return this.spawnBuilding(card, team, owner, x, y);
    return this.spawnTroop(card, team, owner, x, y, MATCH_RULES.deployTime);
  }

  spawnTroop(card, team, owner, x, y, deployTime) {
    const e = this.baseEntity({ kind: 'troop', code: card.id, team, owner, x, y, stats: card.stats });
    const s = card.stats;
    e.female = !!card.female;
    e.jumper = !!s.jumpsRiver;
    e.deployUntil = this.time + deployTime;
    e.deployed = deployTime <= 0;
    if (e.deployed) e.charge = Math.max(0, e.hitSpeed - e.firstHit);
    switch (card.id) {
      case 'yann':
        e.stealthed = true; // "Peur des femmes" : invisible dès le déploiement
        e.revealUntil = 0;
        break;
      case 'nolan':
        e.bassReadyAt = 0;
        break;
      case 'mohammed':
        e.auraAt = 0;
        break;
      case 'adam':
        e.chargeDist = 0;
        break;
      case 'ibrahima':
        e.jumpCdUntil = 0;
        break;
      case 'clement':
        e.pulled = new Set();
        break;
      case 'celine':
        e.dodoUntil = 0;
        e.dodoCdUntil = 0;
        break;
      case 'vladimir':
        e.crossed = false;
        break;
      default:
        break;
    }
    this.entities.set(e.id, e);
    return e;
  }

  spawnBuilding(card, team, owner, x, y) {
    const e = this.baseEntity({ kind: 'building', code: card.id, team, owner, x, y, stats: card.stats });
    e.lifetime = card.stats.lifetime;
    e.deployUntil = this.time + MATCH_RULES.deployTime;
    e.deployed = false;
    if (card.id === 'beti') {
      e.spawnAt = this.time + MATCH_RULES.deployTime + card.stats.firstSpawn;
      e.attractAt = 0;
    }
    if (card.id === 'bureau') {
      e.ramp = 0;
      e.rampStage = 0;
    }
    this.entities.set(e.id, e);
    this.navDirty = true;
    return e;
  }

  castSpell(card, team, owner, x, y) {
    const s = card.stats;
    const zone = {
      id: this.newId(),
      kind: card.id,
      team,
      owner,
      x,
      y,
      radius: s.radius,
      until: this.time + s.duration,
      nextTick: this.time,
      tickEvery: s.tickEvery,
      stats: s,
    };
    this.zones.push(zone);
    this.emitFx('spell', x, y, card.id, s.radius);
    return zone;
  }

  // -------------------------------------------------------------- REQUÊTES
  structures() {
    const out = [];
    for (const e of this.entities.values()) {
      if (e.alive && (e.kind === 'tower' || e.kind === 'building')) out.push({ x: e.x, y: e.y, half: e.half });
    }
    return out;
  }

  /** État utilisé par shared/zones.js pour valider une pose. */
  deployState() {
    const towers = [];
    const buildings = [];
    for (const e of this.entities.values()) {
      if (e.kind === 'tower') {
        towers.push({ team: e.team, key: e.key, type: e.towerType, lane: e.lane, x: e.x, y: e.y, half: e.half, alive: e.alive });
      } else if (e.kind === 'building' && e.alive) {
        buildings.push({ x: e.x, y: e.y, half: e.half });
      }
    }
    return { towers, buildings };
  }

  isPrincessAlive(team, lane) {
    for (const e of this.entities.values()) {
      if (e.kind === 'tower' && e.team === team && e.towerType === 'princess' && e.lane === lane) return e.alive;
    }
    return false;
  }

  lowestTowerHp(team) {
    let min = Infinity;
    for (const e of this.entities.values()) {
      if (e.kind === 'tower' && e.team === team && e.alive) min = Math.min(min, e.hp);
    }
    return min === Infinity ? 0 : min;
  }

  isPastRiver(u) {
    return u.team === 0 ? u.y > this.layout.riverMax : u.y < this.layout.riverMin;
  }

  canTarget(a, e) {
    if (!e.alive || e.team === a.team) return false;
    if (!e.deployed && e.kind !== 'tower') return false;
    if (e.stealthed) return false; // Yann invisible
    if (a.female && e.code === 'yann') return false; // "invisible aux femmes" : jamais ciblé par Aisha, Céline, Alycia
    const t = a.targets;
    if (t === 'none') return false;
    if (t === 'buildings') return e.kind === 'tower' || e.kind === 'building';
    if (t === 'ground') return !e.flying;
    return true;
  }

  /** Distance bord à bord pour les troupes, centre-bord pour tours et bâtiments. */
  gap(a, e) {
    const d = dist(a.x, a.y, e.x, e.y) - e.radius;
    return a.kind === 'troop' ? d - a.radius : d;
  }

  inRange(a, e) {
    return this.gap(a, e) <= a.range;
  }

  nearestInRange(a) {
    let best = null;
    let bestD = Infinity;
    for (const e of this.entities.values()) {
      if (e.kind !== 'troop' || !this.canTarget(a, e)) continue;
      const d = this.gap(a, e);
      if (d <= a.range && d < bestD) {
        best = e;
        bestD = d;
      }
    }
    return best;
  }

  acquireTroopTarget(u) {
    let best = null;
    let bestD = Infinity;
    if (u.targets !== 'buildings') {
      for (const e of this.entities.values()) {
        if (!this.canTarget(u, e)) continue;
        const d = dist(u.x, u.y, e.x, e.y) - e.radius;
        if (d <= u.sight && d < bestD) {
          best = e;
          bestD = d;
        }
      }
      if (best) return best;
    }
    // Sinon : bâtiment ennemi le plus proche (tours ou cartes bâtiment)
    bestD = Infinity;
    for (const e of this.entities.values()) {
      if ((e.kind !== 'tower' && e.kind !== 'building') || !this.canTarget(u, e)) continue;
      const d = dist(u.x, u.y, e.x, e.y);
      if (d < bestD) {
        best = e;
        bestD = d;
      }
    }
    return best;
  }

  // ------------------------------------------------------------- MODIFICATEURS
  speedMult(u) {
    let m = 1;
    const T = this.time;
    if (T < u.slowUntil) m *= EFFECTS.slowFactor;
    if (T < u.blindUntil) m *= EFFECTS.blindSlow;
    if (T < u.rageUntil) m *= EFFECTS.rageMult;
    if (T < u.poliakovUntil) m *= u.stats.poliakovMult;
    if (u.charging) m *= u.stats.chargeSpeedMult;
    return m;
  }

  attackMult(u) {
    let m = 1;
    const T = this.time;
    if (T < u.slowUntil) m *= EFFECTS.slowFactor;
    if (T < u.rageUntil) m *= EFFECTS.rageMult;
    return m;
  }

  // --------------------------------------------------------------- COMBAT
  damage(e, amount, src) {
    if (!e.alive || amount <= 0) return;
    if (e.shield > 0) {
      const absorbed = Math.min(e.shield, amount);
      e.shield -= absorbed;
      amount -= absorbed;
    }
    if (e.kind === 'tower' && e.towerType === 'king' && e.asleep) this.wakeKing(e.team);
    if (amount <= 0) return;
    e.hp -= amount;
    if (e.hp <= 0) {
      e.hp = 0;
      e.alive = false;
      this.onDeath(e, src);
    }
  }

  heal(e, amount) {
    if (!e.alive) return;
    e.hp = Math.min(e.maxHp, e.hp + amount);
  }

  stun(e, duration) {
    if (!e.alive || e.jump) return;
    e.stunUntil = Math.max(e.stunUntil, this.time + duration);
    e.charge = 0; // réinitialise l'attaque
    if (e.code === 'bureau') e.ramp = 0; // la Tour de l'Enfer repart de zéro
    if (e.code === 'adam') {
      e.charging = false;
      e.chargeDist = 0;
    }
  }

  slow(e, duration) {
    if (!e.alive || e.kind === 'tower') return;
    e.slowUntil = Math.max(e.slowUntil, this.time + duration);
  }

  knockback(e, dx, dy, d) {
    if (e.kind !== 'troop' || !e.alive || e.jump || d <= 0) return;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const x = clamp(e.x + (nx * d) / steps, e.radius, this.layout.width - e.radius);
      const y = clamp(e.y + (ny * d) / steps, e.radius, this.layout.length - e.radius);
      if (!e.flying && this.nav.isBlocked(x, y, e.jumper)) break;
      e.x = x;
      e.y = y;
    }
    e.charge = 0;
    e.path = null;
    if (e.code === 'adam') {
      e.charging = false;
      e.chargeDist = 0;
    }
  }

  /** Dégâts de zone. `filter` = 'ground' | 'all' | 'buildings'. */
  splashAt(team, x, y, radius, amount, filter, src, towerMult = 1) {
    for (const e of this.entities.values()) {
      if (!e.alive || e.team === team) continue;
      if (!e.deployed && e.kind !== 'tower') continue;
      if (filter === 'ground' && e.flying) continue;
      if (filter === 'buildings' && e.kind !== 'tower' && e.kind !== 'building') continue;
      if (dist(x, y, e.x, e.y) - e.radius <= radius) this.damage(e, e.kind === 'tower' ? amount * towerMult : amount, src);
    }
  }

  healArea(team, x, y, radius, amount) {
    for (const e of this.entities.values()) {
      if (!e.alive || e.team !== team || e.kind !== 'troop') continue;
      if (dist(x, y, e.x, e.y) - e.radius <= radius) this.heal(e, amount);
    }
  }

  wakeKing(team) {
    for (const e of this.entities.values()) {
      if (e.kind === 'tower' && e.team === team && e.towerType === 'king' && e.asleep && e.alive) {
        e.asleep = false;
        this.emitFx('wake', e.x, e.y, e.id);
      }
    }
  }

  onDeath(e, src) {
    if (e.kind === 'troop') {
      this.emitFx('death', e.x, e.y, e.code, e.team);
      if (e.code === 'theo') {
        // "Pet fumant" : nuage toxique (dégâts de zone + aveuglement)
        const c = e.stats.deathCloud;
        this.zones.push({
          id: this.newId(),
          kind: 'petfumant',
          team: e.team,
          owner: e.owner,
          x: e.x,
          y: e.y,
          radius: c.radius,
          until: this.time + c.duration,
          nextTick: this.time,
          tickEvery: c.tickEvery,
          stats: c,
        });
        this.emitFx('petfumant', e.x, e.y, c.radius);
      }
      return;
    }
    if (e.kind === 'building') {
      this.navDirty = true;
      this.emitFx('destroy', e.x, e.y, e.code);
      return;
    }
    // Tour
    this.navDirty = true;
    const other = 1 - e.team;
    this.emitFx('tower', e.x, e.y, e.id, e.team);
    if (e.towerType === 'king') {
      this.crowns[other] = 3;
      this.kingDestroyed[e.team] = true;
    } else {
      this.crowns[other] = Math.min(3, this.crowns[other] + 1);
      this.wakeKing(e.team); // une tour latérale tombe : Breuer se réveille
    }
    void src;
  }

  performAttack(u, t) {
    u.attackSeq = (u.attackSeq + 1) % 256;
    const s = u.stats;
    let dmg = u.damage * u.damageMult;
    switch (u.code) {
      case 'adam': {
        if (u.charging) {
          dmg *= s.chargeMult; // "Tabouzi trottinette"
          this.damage(t, dmg, u);
          this.stun(t, s.chargeStun);
          this.emitFx('charge', t.x, t.y);
        } else {
          this.damage(t, dmg, u);
        }
        u.charging = false;
        u.chargeDist = 0;
        return;
      }
      case 'matheo': {
        this.damage(t, dmg, u);
        this.healArea(u.team, u.x, u.y, s.healRadius, s.heal);
        this.emitFx('brioche', u.x, u.y, s.healRadius);
        return;
      }
      case 'yann': {
        this.launchBobine(u, t, dmg);
        u.stealthed = false;
        u.revealUntil = this.time + s.revealTime;
        return;
      }
      case 'clement': {
        this.damage(t, dmg, u);
        this.stun(t, s.stun); // "Électrocution Schneider"
        this.emitFx('zap', u.x, u.y, r1(t.x), r1(t.y));
        if (t.kind === 'troop' && t.alive && !u.pulled.has(t.id)) {
          u.pulled.add(t.id);
          const d = dist(t.x, t.y, u.x, u.y) - s.pullMin - u.radius - t.radius;
          if (d > 0) this.knockback(t, u.x - t.x, u.y - t.y, Math.min(s.pull, d));
        }
        return;
      }
      case 'alycia': {
        this.damage(t, dmg, u);
        this.stun(t, s.stun);
        this.emitFx('insult', u.x, u.y, u.id);
        return;
      }
      case 'aminematue': {
        this.damage(t, dmg, u);
        if (u.attackSeq % 4 === 0) this.emitFx('bt', t.x, t.y, r1(u.x), r1(u.y));
        return;
      }
      case 'ibrahima': {
        this.splashAt(u.team, t.x, t.y, s.splash, dmg, 'ground', u);
        this.emitFx('slap', t.x, t.y, s.splash);
        return;
      }
      default: {
        if (s.projectile) this.launchProjectile(u, t, dmg);
        else this.damage(t, dmg, u);
      }
    }
  }

  launchProjectile(src, t, dmg) {
    const s = src.stats;
    const total = Math.max(0.01, dist(src.x, src.y, t.x, t.y));
    this.projectiles.push({
      id: this.newId(),
      kind: s.projectile,
      team: src.team,
      srcId: src.id,
      targetId: t.id,
      x: src.x,
      y: src.y,
      tx: t.x,
      ty: t.y,
      speed: s.projectileSpeed || 10,
      damage: dmg,
      splash: s.splash || 0,
      filter: src.targets,
      slowDuration: s.slowDuration || 0,
      z0: s.launchHeight ?? 1,
      z1: t.flying ? 2.2 : t.kind === 'tower' ? 2.4 : 0.6,
      arc: s.arc || 0,
      traveled: 0,
      total,
      z: s.launchHeight ?? 1,
      alive: true,
    });
  }

  launchBobine(u, t, dmg) {
    const s = u.stats;
    const dx = t.x - u.x;
    const dy = t.y - u.y;
    const d = Math.hypot(dx, dy) || 1;
    this.projectiles.push({
      id: this.newId(),
      kind: 'bobine',
      team: u.team,
      srcId: u.id,
      x: u.x + (dx / d) * 0.6,
      y: u.y + (dy / d) * 0.6,
      dx: dx / d,
      dy: dy / d,
      speed: s.bobineSpeed,
      remaining: s.bobineRange,
      hitRadius: s.bobineHitRadius,
      damage: dmg,
      knock: s.knockback,
      hit: new Set(),
      z: 0.35,
      alive: true,
    });
  }

  updateProjectiles(dt) {
    for (const p of this.projectiles) {
      if (p.kind === 'bobine') {
        this.updateBobine(p, dt);
        continue;
      }
      const t = this.entities.get(p.targetId);
      if (t && t.alive) {
        p.tx = t.x;
        p.ty = t.y;
      }
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      const step = p.speed * dt;
      if (d <= step || d < 0.05) {
        p.x = p.tx;
        p.y = p.ty;
        p.alive = false;
        this.projectileImpact(p, t);
      } else {
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
        p.traveled += step;
      }
      const prog = clamp(p.traveled / Math.max(p.total, p.traveled + d), 0, 1);
      p.z = p.z0 + (p.z1 - p.z0) * prog + p.arc * 4 * prog * (1 - prog);
    }
    this.projectiles = this.projectiles.filter((p) => p.alive);
  }

  projectileImpact(p, t) {
    const src = this.entities.get(p.srcId) || null;
    if (p.splash > 0) {
      this.splashAt(p.team, p.x, p.y, p.splash, p.damage, p.filter === 'buildings' ? 'all' : p.filter, src);
      this.emitFx('splash', p.x, p.y, p.splash, p.kind);
    } else if (t && t.alive) {
      this.damage(t, p.damage, src);
      if (p.kind === 'vinyle' || p.kind === 'ballon' || p.kind === 'choucroute') this.emitFx('impact', p.x, p.y, p.kind);
    }
    if (p.slowDuration && t && t.alive) this.slow(t, p.slowDuration);
  }

  updateBobine(p, dt) {
    const step = p.speed * dt;
    p.x += p.dx * step;
    p.y += p.dy * step;
    p.remaining -= step;
    const W = this.layout.width;
    const L = this.layout.length;
    if (p.remaining <= 0 || p.x < 0 || p.y < 0 || p.x > W || p.y > L) {
      p.alive = false;
      return;
    }
    if (this.nav.isRiver(p.x, p.y)) {
      p.alive = false; // la bobine coule dans l'huile
      this.emitFx('splash', p.x, p.y, 0.8, 'huile');
      return;
    }
    const src = this.entities.get(p.srcId) || null;
    for (const e of this.entities.values()) {
      if (!e.alive || e.team === p.team || e.flying || p.hit.has(e.id)) continue;
      if (!e.deployed && e.kind !== 'tower') continue;
      if (dist(p.x, p.y, e.x, e.y) <= p.hitRadius + e.radius) {
        p.hit.add(e.id);
        this.damage(e, p.damage, src);
        if (e.kind === 'troop') this.knockback(e, p.dx, p.dy, p.knock);
      }
    }
  }

  // --------------------------------------------------------------- ZONES
  updateZones() {
    const T = this.time;
    for (const z of this.zones) {
      if (z.kind === 'poliakov') {
        for (const e of this.entities.values()) {
          if (!e.alive || e.team !== z.team || e.kind === 'tower') continue;
          if (dist(e.x, e.y, z.x, z.y) - e.radius * 0.5 <= z.radius) e.rageUntil = Math.max(e.rageUntil, T + 0.4);
        }
        continue;
      }
      if (T < z.nextTick) continue;
      z.nextTick += z.tickEvery;
      if (z.kind === 'brioche') {
        this.healArea(z.team, z.x, z.y, z.radius, z.stats.heal);
      } else if (z.kind === 'petfumant') {
        const c = z.stats;
        for (const e of this.entities.values()) {
          if (!e.alive || e.team === z.team) continue;
          if (dist(e.x, e.y, z.x, z.y) - e.radius * 0.5 > z.radius) continue;
          this.damage(e, e.kind === 'tower' ? c.damage * c.towerMult : c.damage, null);
          if (e.kind === 'troop') e.blindUntil = Math.max(e.blindUntil, T + c.blind);
        }
      }
    }
    this.zones = this.zones.filter((z) => T < z.until);
  }

  // --------------------------------------------------------------- DÉPLACEMENT
  tryMove(u, x, y) {
    x = clamp(x, u.radius, this.layout.width - u.radius);
    y = clamp(y, u.radius, this.layout.length - u.radius);
    if (u.flying || !this.nav.isBlocked(x, y, u.jumper)) {
      u.x = x;
      u.y = y;
      return true;
    }
    if (!this.nav.isBlocked(x, u.y, u.jumper)) {
      u.x = x;
      return true;
    }
    if (!this.nav.isBlocked(u.x, y, u.jumper)) {
      u.y = y;
      return true;
    }
    return false;
  }

  stepDirect(u, tx, ty, step) {
    const dx = tx - u.x;
    const dy = ty - u.y;
    const d = Math.hypot(dx, dy);
    if (d < 1e-4) return;
    const s = Math.min(step, d);
    u.facing = Math.atan2(dx, dy);
    this.tryMove(u, u.x + (dx / d) * s, u.y + (dy / d) * s);
  }

  moveTowards(u, t, dt, speedMult) {
    let remaining = u.speed * speedMult * dt;
    if (u.flying) {
      this.stepDirect(u, t.x, t.y, remaining);
      return;
    }
    const reach = t.radius + u.radius + u.range - 0.15;
    if (
      !u.path ||
      this.time >= u.repathAt ||
      u.pathTargetId !== t.id ||
      dist(u.pathTx, u.pathTy, t.x, t.y) > 1.5
    ) {
      u.path = this.nav.findPath(u.x, u.y, t.x, t.y, Math.max(0.3, reach), u.jumper);
      u.pathIdx = 0;
      u.repathAt = this.time + 0.5 + Math.random() * 0.25;
      u.pathTargetId = t.id;
      u.pathTx = t.x;
      u.pathTy = t.y;
    }
    let guard = 0;
    while (remaining > 1e-5 && u.path && u.pathIdx < u.path.length && guard++ < 8) {
      const [wx, wy] = u.path[u.pathIdx];
      const dx = wx - u.x;
      const dy = wy - u.y;
      const d = Math.hypot(dx, dy);
      if (d > 1e-4) u.facing = Math.atan2(dx, dy);
      if (d <= remaining) {
        if (!this.tryMove(u, wx, wy)) {
          u.path = null;
          break;
        }
        remaining -= d;
        u.pathIdx++;
      } else {
        this.tryMove(u, u.x + (dx / d) * remaining, u.y + (dy / d) * remaining);
        remaining = 0;
      }
    }
    if (remaining > 1e-5 && (!u.path || u.pathIdx >= u.path.length)) this.stepDirect(u, t.x, t.y, remaining);
  }

  // --------------------------------------------------------------- MÉCANIQUES SPÉCIALES
  onDeployed(u) {
    if (u.code === 'ibrahima') {
      // "Super Saut" à l'apparition
      const s = u.stats;
      this.splashAt(u.team, u.x, u.y, s.spawnJumpRadius, s.spawnJumpDamage, 'ground', u);
      this.emitFx('jump', u.x, u.y, s.spawnJumpRadius);
    }
    u.charge = Math.max(0, u.hitSpeed - u.firstHit);
  }

  tryStartJump(u, t) {
    const s = u.stats;
    if (this.time < u.jumpCdUntil || u.attacking || t.flying) return false;
    const d = dist(u.x, u.y, t.x, t.y) - t.radius;
    if (d < s.jumpMin || d > s.jumpMax) return false;
    const dx = u.x - t.x;
    const dy = u.y - t.y;
    const len = Math.hypot(dx, dy) || 1;
    const off = t.radius + u.radius + 0.2;
    const [lx, ly] = this.nav.nearestWalkable(t.x + (dx / len) * off, t.y + (dy / len) * off, false);
    u.jump = { fx: u.x, fy: u.y, tx: lx, ty: ly, start: this.time, end: this.time + s.jumpDuration };
    u.targetId = t.id;
    u.attackSeq = (u.attackSeq + 1) % 256;
    return true;
  }

  updateJump(u) {
    const s = u.stats;
    const j = u.jump;
    const p = clamp((this.time - j.start) / (j.end - j.start), 0, 1);
    u.x = j.fx + (j.tx - j.fx) * p;
    u.y = j.fy + (j.ty - j.fy) * p;
    u.z = 4 * s.jumpHeight * p * (1 - p);
    u.facing = Math.atan2(j.tx - j.fx, j.ty - j.fy);
    if (p >= 1) {
      u.jump = null;
      u.z = 0;
      this.splashAt(u.team, u.x, u.y, s.jumpRadius, s.jumpDamage, 'ground', u);
      this.emitFx('jump', u.x, u.y, s.jumpRadius);
      u.jumpCdUntil = this.time + s.jumpCooldown;
      u.path = null;
      u.charge = Math.max(0, u.hitSpeed - u.firstHit);
    }
  }

  mohammedAura(u) {
    const s = u.stats;
    if (this.time < u.auraAt) return;
    u.auraAt = this.time + s.auraTick;
    for (const e of this.entities.values()) {
      if (!e.alive || e.team === u.team || e.kind !== 'troop' || !e.deployed) continue;
      if (e.maxHp >= s.auraSmallMaxHp) continue;
      if (dist(u.x, u.y, e.x, e.y) - e.radius <= s.auraRadius) this.damage(e, s.auraDamage, u);
    }
  }

  nolanBassDrop(u) {
    const s = u.stats;
    if (this.time < u.bassReadyAt) return;
    let trigger = false;
    for (const e of this.entities.values()) {
      if (!e.alive || e.team === u.team || e.kind !== 'troop' || !e.deployed || e.flying || e.stealthed) continue;
      if (this.gap(u, e) <= s.bassTrigger) {
        trigger = true;
        break;
      }
    }
    if (!trigger) return;
    u.bassReadyAt = this.time + s.bassCooldown;
    u.attackSeq = (u.attackSeq + 1) % 256;
    for (const e of this.entities.values()) {
      if (!e.alive || e.team === u.team || e.kind !== 'troop' || !e.deployed) continue;
      if (dist(u.x, u.y, e.x, e.y) - e.radius > s.bassRadius) continue;
      this.damage(e, s.bassDamage, u);
      this.knockback(e, e.x - u.x, e.y - u.y, s.bassPush);
    }
    this.emitFx('bassdrop', u.x, u.y, s.bassRadius);
  }

  checkSynergy(u) {
    if (u.synergy) return;
    const partner = u.code === 'alycia' ? 'theo' : 'alycia';
    const s = CARDS.alycia.stats;
    for (const e of this.entities.values()) {
      if (!e.alive || e.team !== u.team || e.code !== partner || !e.deployed || e.synergy) continue;
      if (dist(u.x, u.y, e.x, e.y) > s.synergyRadius) continue;
      for (const x of [u, e]) {
        const bonus = x.maxHp * (s.synergyMult - 1);
        x.maxHp = Math.round(x.maxHp + bonus);
        x.hp = Math.min(x.maxHp, x.hp + bonus);
        x.damageMult *= s.synergyMult;
        x.synergy = true;
      }
      this.emitFx('synergy', (u.x + e.x) / 2, (u.y + e.y) / 2, u.id, e.id);
      return;
    }
  }

  toggleDodo(unitId, owner) {
    const u = this.entities.get(unitId);
    if (!u || !u.alive || u.code !== 'celine' || u.owner !== owner || !u.deployed) return false;
    const s = u.stats;
    if (this.time < u.dodoUntil) {
      this.endDodo(u);
      return true;
    }
    if (this.time < u.dodoCdUntil) return false;
    u.dodoUntil = this.time + s.dodoDuration;
    u.shield = s.dodoShield;
    u.attacking = false;
    u.charge = 0;
    u.path = null;
    this.emitFx('dodo', u.x, u.y, u.id);
    return true;
  }

  endDodo(u) {
    u.dodoUntil = 0;
    u.shield = 0;
    u.dodoCdUntil = this.time + u.stats.dodoCooldown;
  }

  updateAttracted(u, dt) {
    const b = this.entities.get(u.attractedTo);
    if (!b || !b.alive || b.team === u.team) {
      u.attractedTo = null;
      return false;
    }
    u.attacking = false;
    this.stepDirect(u, b.x, b.y, u.speed * this.speedMult(u) * dt);
    if (dist(u.x, u.y, b.x, b.y) <= b.radius + b.stats.convertRadius) {
      // Conversion : l'Aisha adverse rejoint notre camp
      u.team = b.team;
      u.owner = b.owner;
      u.hp = u.maxHp;
      u.attractedTo = null;
      u.targetId = null;
      u.path = null;
      this.emitFx('convert', u.x, u.y, u.id);
    }
    return true;
  }

  // --------------------------------------------------------------- MISES À JOUR
  updateTroop(u, dt) {
    const s = u.stats;
    if (!u.deployed) {
      if (this.time < u.deployUntil) return;
      u.deployed = true;
      this.onDeployed(u);
    }
    if (u.jump) {
      this.updateJump(u);
      return;
    }
    if (u.code === 'celine' && u.dodoUntil) {
      if (this.time < u.dodoUntil) {
        this.heal(u, s.dodoRegen * dt); // "Dodo stratégique" : immobile, bouclier, régénération
        return;
      }
      this.endDodo(u);
    }
    if (u.code === 'mohammed') this.mohammedAura(u); // l'aura agit même étourdi
    if (this.time < u.stunUntil) {
      u.attacking = false;
      return;
    }
    if (u.code === 'nolan') this.nolanBassDrop(u);
    if (u.code === 'yann' && !u.stealthed && this.time >= u.revealUntil) u.stealthed = true;
    if (u.code === 'alycia' || u.code === 'theo') this.checkSynergy(u);
    if (u.attractedTo && this.updateAttracted(u, dt)) return;

    // ---- Ciblage
    let t = u.targetId ? this.entities.get(u.targetId) : null;
    if (t && !this.canTarget(u, t)) t = null;
    if (t && t.kind === 'troop' && dist(u.x, u.y, t.x, t.y) > u.sight + 3) t = null;
    const blind = this.time < u.blindUntil;
    const lockedOnStructure = t && (t.kind === 'tower' || t.kind === 'building');
    if (!blind && (!t || (this.time >= u.retargetAt && !u.attacking && lockedOnStructure))) {
      u.retargetAt = this.time + 0.4;
      const nt = this.acquireTroopTarget(u);
      if (nt !== t) {
        t = nt;
        u.path = null;
      }
    }
    u.targetId = t ? t.id : null;
    if (!t) {
      u.attacking = false;
      return;
    }

    if (u.code === 'ibrahima' && this.tryStartJump(u, t)) return;

    const am = this.attackMult(u);
    if (this.inRange(u, t)) {
      u.attacking = true;
      u.facing = Math.atan2(t.x - u.x, t.y - u.y);
      u.charge += dt * am;
      if (u.charge >= u.hitSpeed) {
        u.charge = Math.min(u.charge - u.hitSpeed, u.hitSpeed);
        this.performAttack(u, t);
      }
    } else {
      u.attacking = false;
      u.charge = Math.min(u.charge + dt * am, Math.max(0, u.hitSpeed - u.firstHit));
      const ox = u.x;
      const oy = u.y;
      this.moveTowards(u, t, dt, this.speedMult(u));
      const moved = Math.hypot(u.x - ox, u.y - oy);
      if (u.code === 'adam') {
        if (moved < 1e-3) u.chargeDist = 0;
        u.chargeDist += moved;
        if (!u.charging && u.chargeDist >= s.chargeDistance) u.charging = true;
      }
      if (u.code === 'vladimir' && !u.crossed && this.isPastRiver(u)) {
        u.crossed = true; // "Poliakov speed" en traversant le pont
        u.poliakovUntil = this.time + s.poliakovDuration;
        this.emitFx('poliakovspeed', u.x, u.y, u.id);
      }
    }
  }

  updateTower(t, dt) {
    if (!t.alive) return;
    if (t.towerType === 'king' && t.asleep) {
      t.attacking = false;
      return;
    }
    if (this.time < t.stunUntil) {
      t.attacking = false;
      return;
    }
    let target = t.targetId ? this.entities.get(t.targetId) : null;
    if (target && (!this.canTarget(t, target) || !this.inRange(t, target))) target = null;
    if (!target) target = this.nearestInRange(t);
    t.targetId = target ? target.id : null;
    if (!target) {
      t.attacking = false;
      t.charge = Math.min(t.charge + dt, t.hitSpeed - t.firstHit);
      return;
    }
    t.attacking = true;
    t.facing = Math.atan2(target.x - t.x, target.y - t.y);
    t.charge += dt;
    if (t.charge >= t.hitSpeed) {
      t.charge -= t.hitSpeed;
      t.attackSeq = (t.attackSeq + 1) % 256;
      this.launchProjectile(t, target, t.damage);
    }
  }

  updateBuilding(b, dt) {
    if (!b.deployed) {
      if (this.time < b.deployUntil) return;
      b.deployed = true;
    }
    // "se détruit seul avec le temps"
    this.damage(b, (b.maxHp / b.lifetime) * dt, null);
    if (!b.alive) return;
    if (this.time < b.stunUntil) {
      b.attacking = false;
      return;
    }
    if (b.code === 'beti') this.updateBeti(b);
    else if (b.code === 'bureau') this.updateBureau(b, dt);
  }

  updateBeti(b) {
    const s = b.stats;
    if (this.time >= b.spawnAt) {
      b.spawnAt = this.time + s.spawnEvery;
      const dir = b.team === 0 ? 1 : -1;
      this.spawnTroop(CARDS.aisha, b.team, b.owner, b.x, clamp(b.y + dir * (b.half + 0.6), 1, this.layout.length - 1), 0.4);
      b.attackSeq = (b.attackSeq + 1) % 256;
    }
    if (this.time >= b.attractAt) {
      b.attractAt = this.time + 0.25;
      for (const e of this.entities.values()) {
        if (!e.alive || e.code !== 'aisha' || e.team === b.team || !e.deployed || e.attractedTo) continue;
        if (dist(e.x, e.y, b.x, b.y) <= s.attractRadius) {
          e.attractedTo = b.id;
          e.targetId = null;
        }
      }
    }
  }

  updateBureau(b, dt) {
    const s = b.stats;
    let t = b.targetId ? this.entities.get(b.targetId) : null;
    if (t && (!this.canTarget(b, t) || !this.inRange(b, t))) t = null;
    if (!t) {
      t = this.nearestInRange(b);
      b.ramp = 0;
      b.charge = 0;
    }
    b.targetId = t ? t.id : null;
    if (!t) {
      b.attacking = false;
      b.rampStage = 0;
      return;
    }
    b.attacking = true;
    b.ramp += dt;
    b.charge += dt;
    b.rampStage = b.ramp < s.rampTimes[1] ? 0 : b.ramp < s.rampTimes[2] ? 1 : 2;
    if (b.charge >= b.hitSpeed) {
      b.charge -= b.hitSpeed;
      b.attackSeq = (b.attackSeq + 1) % 256;
      this.damage(t, s.rampDamage[b.rampStage], b);
    }
  }

  separate() {
    const troops = [];
    for (const e of this.entities.values()) if (e.alive && e.kind === 'troop' && !e.jump) troops.push(e);
    for (let i = 0; i < troops.length; i++) {
      const a = troops[i];
      for (let j = i + 1; j < troops.length; j++) {
        const b = troops[j];
        if (a.flying !== b.flying) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const min = a.radius + b.radius;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        let d = Math.sqrt(d2);
        let nx;
        let ny;
        if (d < 1e-4) {
          const ang = (a.id * 7.13 + b.id * 3.7) % (Math.PI * 2);
          nx = Math.cos(ang);
          ny = Math.sin(ang);
          d = 0;
        } else {
          nx = dx / d;
          ny = dy / d;
        }
        const overlap = (min - d) * 0.5;
        const wa = (b.mass / (a.mass + b.mass)) * (a.attacking ? 0.35 : 1);
        const wb = (a.mass / (a.mass + b.mass)) * (b.attacking ? 0.35 : 1);
        this.tryMove(a, a.x - nx * overlap * wa, a.y - ny * overlap * wa);
        this.tryMove(b, b.x + nx * overlap * wb, b.y + ny * overlap * wb);
      }
    }
    // Les troupes au sol ne traversent pas les tours / bâtiments
    for (const u of troops) {
      if (u.flying) continue;
      for (const s of this.entities.values()) {
        if (!s.alive || (s.kind !== 'tower' && s.kind !== 'building')) continue;
        const dx = u.x - s.x;
        const dy = u.y - s.y;
        const min = s.radius + u.radius;
        const d = Math.hypot(dx, dy);
        if (d >= min) continue;
        const nx = d < 1e-4 ? 0 : dx / d;
        const ny = d < 1e-4 ? (u.team === 0 ? -1 : 1) : dy / d;
        const x = s.x + nx * min;
        const y = s.y + ny * min;
        if (!this.nav.isBlocked(x, y, u.jumper)) {
          u.x = x;
          u.y = y;
        }
      }
    }
  }

  step(dt) {
    this.time += dt;
    if (this.navDirty) {
      this.nav.setObstacles(this.structures());
      this.navDirty = false;
      for (const e of this.entities.values()) e.path = null;
    }
    this.updateZones();
    for (const e of this.entities.values()) {
      if (!e.alive) continue;
      if (e.kind === 'tower') this.updateTower(e, dt);
      else if (e.kind === 'building') this.updateBuilding(e, dt);
      else this.updateTroop(e, dt);
    }
    this.updateProjectiles(dt);
    this.separate();
    for (const [id, e] of this.entities) if (!e.alive && e.kind !== 'tower') this.entities.delete(id);
  }

  // --------------------------------------------------------------- SÉRIALISATION
  flagsOf(e) {
    const T = this.time;
    let f = 0;
    if (T < e.stunUntil) f |= FLAGS.STUN;
    if (T < e.slowUntil) f |= FLAGS.SLOW;
    if (T < e.rageUntil) f |= FLAGS.RAGE;
    if (e.stealthed) f |= FLAGS.STEALTH;
    if (e.asleep) f |= FLAGS.ASLEEP;
    if (e.attacking) f |= FLAGS.ATTACKING;
    if (e.flying) f |= FLAGS.AIR;
    if (e.shield > 0 || (e.code === 'celine' && T < e.dodoUntil)) f |= FLAGS.SHIELD;
    if (!e.deployed) f |= FLAGS.DEPLOYING;
    if (T < e.blindUntil) f |= FLAGS.BLIND;
    if (e.synergy) f |= FLAGS.SYNERGY;
    if (e.charging) f |= FLAGS.CHARGING;
    if (e.attractedTo) f |= FLAGS.ATTRACTED;
    if (T < e.poliakovUntil) f |= FLAGS.POLIAKOV;
    if (e.alive) f |= FLAGS.ALIVE;
    return f;
  }

  /** Les Yann invisibles adverses ne sont PAS envoyés (aucune triche possible côté client). */
  serializeUnits(viewerTeam) {
    const out = [];
    const L = this.layout;
    for (const e of this.entities.values()) {
      if (!e.alive || e.kind === 'tower') continue;
      if (e.stealthed && e.team !== viewerTeam) continue;
      let z = e.z;
      if (e.code === 'adam' && this.nav.isRiver(e.x, e.y)) {
        const p = clamp((e.y - L.riverMin) / (L.riverMax - L.riverMin), 0, 1);
        z = 1.6 * 4 * p * (1 - p);
      }
      let aux = 0;
      if (e.code === 'bureau') aux = e.rampStage;
      else if (e.code === 'celine') aux = this.time < e.dodoUntil ? -r1(e.dodoUntil - this.time) : r1(Math.max(0, e.dodoCdUntil - this.time));
      out.push([
        e.id,
        e.code,
        e.team,
        e.owner,
        r1(e.x),
        r1(e.y),
        r1(z),
        Math.ceil(e.hp),
        Math.ceil(e.maxHp),
        this.flagsOf(e),
        r2(e.facing),
        e.attackSeq,
        e.code === 'bureau' && e.attacking ? e.targetId || 0 : 0,
        aux,
      ]);
    }
    return out;
  }

  serializeTowers() {
    const out = [];
    for (const e of this.entities.values()) {
      if (e.kind !== 'tower') continue;
      out.push([e.id, e.team, e.key, Math.ceil(e.hp), e.maxHp, this.flagsOf(e), e.attacking ? e.targetId || 0 : 0, r2(e.facing)]);
    }
    return out;
  }

  serializeProjectiles() {
    return this.projectiles.map((p) => [p.id, p.kind, r1(p.x), r1(p.y), r1(p.z)]);
  }

  serializeZones() {
    return this.zones.map((z) => [z.id, z.kind, z.team, r1(z.x), r1(z.y), z.radius, r1(z.until - this.time)]);
  }
}
