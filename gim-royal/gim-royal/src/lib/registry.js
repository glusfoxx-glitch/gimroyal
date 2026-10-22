'use client';
// =============================================================================
// Registre mutable des entités rendues. Chaque snapshot serveur (10 Hz) met à jour
// les positions CIBLES ; la scène 3D interpole vers elles à 60 FPS.
// Format des tableaux : voir shared/constants.js
// =============================================================================
import { gameStore } from './store';

export const registry = {
  units: new Map(),
  towers: new Map(),
  projectiles: new Map(),
  zones: new Map(),
  fx: [],
};

export function resetRegistry() {
  registry.units.clear();
  registry.towers.clear();
  registry.projectiles.clear();
  registry.zones.clear();
  registry.fx.length = 0;
}

export function applySnapshot(s) {
  const now = performance.now();

  // ---- Unités et bâtiments
  let unitsChanged = false;
  const seen = new Set();
  for (const a of s.u) {
    const [id, code, team, owner, x, y, z, hp, maxHp, flags, angle, seq, tg, aux] = a;
    seen.add(id);
    let u = registry.units.get(id);
    if (!u) {
      u = { id, rx: x, ry: y, rz: z, ra: angle, lastSeq: seq, lunge: 0, flash: 0, bob: 0, born: now };
      registry.units.set(id, u);
      unitsChanged = true;
    } else if (hp < u.hp) {
      u.flash = 1;
    }
    u.code = code;
    u.team = team;
    u.owner = owner;
    u.x = x;
    u.y = y;
    u.z = z;
    u.hp = hp;
    u.maxHp = maxHp;
    u.flags = flags;
    u.angle = angle;
    u.seq = seq;
    u.tg = tg;
    u.aux = aux;
  }
  for (const id of registry.units.keys()) {
    if (!seen.has(id)) {
      registry.units.delete(id);
      unitsChanged = true;
    }
  }

  // ---- Tours
  for (const a of s.tw) {
    const [id, team, key, hp, maxHp, flags, tg, angle] = a;
    let t = registry.towers.get(id);
    if (!t) {
      t = { id, ra: angle, lastSeq: 0, flash: 0, hp };
      registry.towers.set(id, t);
    } else if (hp < t.hp) {
      t.flash = 1;
    }
    t.team = team;
    t.key = key;
    t.hp = hp;
    t.maxHp = maxHp;
    t.flags = flags;
    t.tg = tg;
    t.angle = angle;
  }

  // ---- Projectiles
  const pseen = new Set();
  for (const a of s.pr) {
    const [id, kind, x, y, z] = a;
    pseen.add(id);
    let p = registry.projectiles.get(id);
    if (!p) {
      p = { id, kind, rx: x, ry: y, rz: z, spin: 0, dirX: 0, dirY: 1 };
      registry.projectiles.set(id, p);
    }
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.z = z;
  }
  for (const id of registry.projectiles.keys()) if (!pseen.has(id)) registry.projectiles.delete(id);

  // ---- Zones de sorts / nuages
  let zonesChanged = false;
  const zseen = new Set();
  for (const a of s.zn) {
    const [id, kind, team, x, y, radius, left] = a;
    zseen.add(id);
    if (!registry.zones.has(id)) zonesChanged = true;
    registry.zones.set(id, { id, kind, team, x, y, radius, left });
  }
  for (const id of registry.zones.keys()) {
    if (!zseen.has(id)) {
      registry.zones.delete(id);
      zonesChanged = true;
    }
  }

  // ---- Effets ponctuels
  for (const f of s.fx) registry.fx.push({ f, at: now });
  if (registry.fx.length > 120) registry.fx.splice(0, registry.fx.length - 120);

  const patch = { snap: s };
  if (unitsChanged) patch.unitKey = [...registry.units.keys()].join(',');
  if (zonesChanged) patch.zoneKey = [...registry.zones.keys()].join(',');
  gameStore.set(patch);
}
