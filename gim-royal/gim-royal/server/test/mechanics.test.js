// =============================================================================
// GIM ROYAL — Tests des mécaniques spéciales (une par carte) + règles de match.
// Lancement : npm run test:mechanics
// =============================================================================

import assert from 'node:assert/strict';
import { World } from '../game/World.js';
import { Match } from '../game/Match.js';
import { CARDS } from '../../shared/cards.js';
import { DT, LAYOUTS, MATCH_RULES } from '../../shared/constants.js';
import { canDeploy } from '../../shared/zones.js';

let passed = 0;
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

function run(world, seconds) {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) world.step(DT);
}
function troop(w, id, team, x, y, deploy = 0) {
  return w.spawnTroop(CARDS[id], team, team, x, y, deploy);
}
function tower(w, team, key) {
  return [...w.entities.values()].find((e) => e.kind === 'tower' && e.team === team && e.key === key);
}

test('Yann est invisible pour les tours jusqu’à son premier coup', () => {
  const w = new World('1v1');
  const gilet = tower(w, 1, 'L');
  const yann = troop(w, 'yann', 0, gilet.x, gilet.y - 7); // dans la portée de la tour, hors de la sienne
  w.step(DT);
  assert.equal(w.canTarget(gilet, yann), false);
  run(w, 0.5);
  assert.notEqual(gilet.targetId, yann.id);
  run(w, 4);
  assert.ok(gilet.hp < gilet.maxHp, 'Yann a frappé la tour');
});

test('Les femmes (Aisha, Céline, Alycia) ne ciblent jamais Yann', () => {
  const w = new World('1v1');
  const yann = troop(w, 'yann', 0, 9, 10);
  yann.stealthed = false;
  for (const id of ['aisha', 'celine', 'alycia']) {
    const f = troop(w, id, 1, 9, 12);
    assert.equal(w.canTarget(f, yann), false, id);
  }
  const emircan = troop(w, 'emircan', 1, 9, 12);
  assert.equal(w.canTarget(emircan, yann), true);
});

test('Adam traverse la rivière sans pont', () => {
  const w = new World('1v1');
  const adam = troop(w, 'adam', 0, 9, 12);
  let crossedRiverCell = false;
  for (let i = 0; i < 200 && adam.alive; i++) {
    w.step(DT);
    if (w.nav.isRiver(adam.x, adam.y)) crossedRiverCell = true;
  }
  assert.ok(crossedRiverCell, 'Adam est passé par une cellule de rivière');
  assert.ok(adam.y > 17 || !adam.alive);
});

test('Une unité au sol normale passe par un pont', () => {
  const w = new World('1v1');
  const em = troop(w, 'emircan', 0, 9, 12);
  for (let i = 0; i < 300 && em.alive; i++) {
    w.step(DT);
    assert.equal(w.nav.isRiver(em.x, em.y), false);
  }
  assert.ok(em.y > 17, 'Emircan a traversé');
});

test('Adam charge : coup doublé + étourdissement 1 s', () => {
  const w = new World('1v1');
  const adam = troop(w, 'adam', 0, 9, 7);
  const target = troop(w, 'emircan', 1, 9, 13.5);
  target.speed = 0;
  let hit = false;
  for (let i = 0; i < 200 && !hit; i++) {
    w.step(DT);
    if (target.hp < target.maxHp) hit = true;
  }
  assert.ok(hit);
  assert.equal(target.maxHp - target.hp, CARDS.adam.stats.damage * 2);
  assert.ok(target.stunUntil > w.time + 0.8);
});

test('Vladimir active le Poliakov speed après le pont', () => {
  const w = new World('1v1');
  const v = troop(w, 'vladimir', 0, 3.5, 13);
  run(w, 4);
  assert.ok(v.crossed, 'a traversé');
  assert.ok(v.poliakovUntil > 0);
});

test('Théo lâche son Pet fumant à sa mort (dégâts + aveuglement)', () => {
  const w = new World('1v1');
  const theo = troop(w, 'theo', 0, 9, 10);
  const enemy = troop(w, 'emircan', 1, 9.5, 10.5);
  enemy.speed = 0;
  w.damage(theo, 99999, null);
  assert.ok(w.zones.some((z) => z.kind === 'petfumant'));
  run(w, 1.2);
  assert.ok(enemy.hp < enemy.maxHp);
  assert.ok(enemy.blindUntil > w.time);
});

test('Théo ralentit ses cibles', () => {
  const w = new World('1v1');
  troop(w, 'theo', 0, 9, 8);
  const e = troop(w, 'emircan', 1, 9, 10.5);
  e.speed = 0;
  run(w, 2.5);
  assert.ok(e.slowUntil > w.time - 0.1);
});

test('Ibrahima écrase la zone à son apparition (Super Saut)', () => {
  const w = new World('1v1');
  const e = troop(w, 'aisha', 1, 9.5, 9);
  e.flying = false; // cible au sol pour le test
  const ib = troop(w, 'ibrahima', 0, 9, 9, MATCH_RULES.deployTime);
  run(w, 1.1);
  assert.ok(ib.deployed);
  assert.ok(!e.alive || e.hp < e.maxHp);
});

test('Ibrahima saute sur une cible éloignée', () => {
  const w = new World('1v1');
  const ib = troop(w, 'ibrahima', 0, 9, 6);
  const t = troop(w, 'theo', 1, 9, 11);
  t.speed = 0;
  let jumped = false;
  for (let i = 0; i < 40; i++) {
    w.step(DT);
    if (ib.jump) jumped = true;
  }
  assert.ok(jumped);
  assert.ok(t.hp < t.maxHp);
});

test('Clément paralyse et réinitialise la Tour de l’Enfer (Bureau de Breuer)', () => {
  const w = new World('1v1');
  const bureau = w.spawnBuilding(CARDS.bureau, 1, 1, 9, 20);
  bureau.deployed = true;
  const tank = troop(w, 'theo', 0, 9, 17.5);
  tank.speed = 0;
  tank.targets = 'none';
  run(w, 3);
  assert.ok(bureau.ramp > 2, 'la tour chauffe');
  const cl = troop(w, 'clement', 0, 9, 14.5);
  cl.speed = 0;
  run(w, 1.2);
  assert.ok(bureau.ramp < 1.5, 'rampe réinitialisée');
  void cl;
});

test('Clément ramène sa cible vers lui (coup de fouet)', () => {
  const w = new World('1v1');
  const cl = troop(w, 'clement', 0, 9, 8);
  const e = troop(w, 'emircan', 1, 9, 13.5);
  e.speed = 0;
  const y0 = e.y;
  run(w, 1);
  assert.ok(e.y < y0 - 1, `tiré de ${y0} à ${e.y}`);
  void cl;
});

test('BéTI convertit les Aisha adverses', () => {
  const w = new World('1v1');
  const beti = w.spawnBuilding(CARDS.beti, 0, 0, 9, 10);
  beti.deployed = true;
  beti.spawnAt = 999;
  const a = troop(w, 'aisha', 1, 9, 14);
  run(w, 4);
  assert.equal(a.team, 0, 'Aisha a changé de camp');
});

test('BéTI fait apparaître des Aisha et se détruit avec le temps', () => {
  const w = new World('1v1');
  w.spawnBuilding(CARDS.beti, 0, 0, 9, 10);
  run(w, 3);
  assert.ok([...w.entities.values()].some((e) => e.code === 'aisha' && e.team === 0));
  run(w, 45);
  assert.ok(![...w.entities.values()].some((e) => e.code === 'beti'));
});

test('Synergie Alycia + Théo : boost de PV et d’attaque', () => {
  const w = new World('1v1');
  const t = troop(w, 'theo', 0, 9, 5);
  const a = troop(w, 'alycia', 0, 10, 5);
  w.step(DT);
  assert.ok(t.synergy && a.synergy);
  assert.ok(t.maxHp > CARDS.theo.stats.hp && a.damageMult > 1);
});

test('Céline : Dodo stratégique (immobile, bouclier, régénération)', () => {
  const w = new World('1v1');
  const c = troop(w, 'celine', 0, 9, 9);
  c.hp = 300;
  assert.equal(w.toggleDodo(c.id, 0), true);
  const x = c.x;
  const y = c.y;
  run(w, 2);
  assert.equal(c.x, x);
  assert.equal(c.y, y);
  assert.ok(c.hp > 300 && c.shield > 0);
  assert.equal(w.toggleDodo(c.id, 1), false, 'un autre joueur ne peut pas la contrôler');
});

test('Nolan déclenche le Bass Drop au corps-à-corps (recul)', () => {
  const w = new World('1v1');
  const n = troop(w, 'nolan', 0, 9, 8);
  const e = troop(w, 'emircan', 1, 9, 9.3);
  e.speed = 0;
  const d0 = Math.hypot(e.x - n.x, e.y - n.y);
  w.step(DT);
  w.step(DT);
  const d1 = Math.hypot(e.x - n.x, e.y - n.y);
  assert.ok(d1 > d0 + 1, `repoussé ${d0.toFixed(2)} -> ${d1.toFixed(2)}`);
  assert.ok(n.bassReadyAt > w.time + 10);
});

test('Mohammed ignore les troupes et brûle les petits ennemis (aura)', () => {
  const w = new World('1v1');
  const m = troop(w, 'mohammed', 0, 9, 13);
  const small = troop(w, 'pasparfait', 1, 9.6, 14);
  small.speed = 0;
  small.targets = 'none';
  const big = troop(w, 'theo', 1, 8.4, 14);
  big.speed = 0;
  big.targets = 'none';
  run(w, 1.1);
  const t = w.entities.get(m.targetId);
  assert.ok(t && (t.kind === 'tower' || t.kind === 'building'));
  assert.ok(small.hp < small.maxHp);
  assert.equal(big.hp, big.maxHp);
});

test('Aminematue ne cible que les bâtiments', () => {
  const w = new World('1v1');
  const a = troop(w, 'aminematue', 0, 9, 10);
  troop(w, 'emircan', 1, 9, 11);
  w.step(DT);
  const t = w.entities.get(a.targetId);
  assert.ok(t.kind === 'tower' || t.kind === 'building');
});

test('Mathéo soigne en zone à chaque coup', () => {
  const w = new World('1v1');
  troop(w, 'matheo', 0, 9, 10);
  const ally = troop(w, 'emircan', 0, 8, 9);
  ally.hp = 500;
  ally.speed = 0;
  ally.targets = 'none';
  const e = troop(w, 'theo', 1, 9, 11.4);
  e.speed = 0;
  e.targets = 'none';
  run(w, 1.5);
  assert.ok(ally.hp > 500);
});

test('Breuer dort puis se réveille quand une tour latérale tombe', () => {
  const w = new World('1v1');
  const king = tower(w, 1, 'K');
  assert.equal(king.asleep, true);
  w.damage(tower(w, 1, 'L'), 99999, null);
  assert.equal(king.asleep, false);
  assert.equal(w.crowns[0], 1);
});

test('Breuer se réveille s’il subit des dégâts', () => {
  const w = new World('1v1');
  const king = tower(w, 0, 'K');
  w.damage(king, 10, null);
  assert.equal(king.asleep, false);
});

test('Sorts : Poliakov (rage) et Brioche Dorée (soin)', () => {
  const w = new World('1v1');
  const u = troop(w, 'emircan', 0, 9, 8);
  u.hp = 300;
  u.speed = 0;
  w.spawnCard('poliakov', 0, 0, 9, 8);
  w.spawnCard('brioche', 0, 0, 9, 8);
  run(w, 1.1);
  assert.ok(u.rageUntil > w.time);
  assert.ok(u.hp > 300);
});

test('Zones de pose : interdit chez l’adversaire, poche après destruction', () => {
  const w = new World('1v1');
  const L = LAYOUTS['1v1'];
  assert.equal(canDeploy(L, 0, CARDS.emircan, 3, 10, w.deployState()), true);
  assert.equal(canDeploy(L, 0, CARDS.emircan, 3, 19, w.deployState()), false);
  assert.equal(canDeploy(L, 0, CARDS.emircan, 3, 16, w.deployState()), false, 'pas dans la rivière');
  assert.equal(canDeploy(L, 0, CARDS.poliakov, 3, 25, w.deployState()), true, 'sort partout');
  w.damage(tower(w, 1, 'L'), 99999, null);
  assert.equal(canDeploy(L, 0, CARDS.emircan, 3, 19, w.deployState()), true, 'poche gauche ouverte');
  assert.equal(canDeploy(L, 0, CARDS.emircan, 15, 19, w.deployState()), false, 'poche droite fermée');
  assert.equal(canDeploy(L, 0, CARDS.bureau, 3, 19, w.deployState()), false, 'bâtiments uniquement chez soi');
  assert.equal(canDeploy(L, 1, CARDS.emircan, 3, 22, w.deployState()), true, 'équipe 1 : son camp');
});

test('Élixir x1 puis x2 dans la dernière minute, main de 4 cartes qui tourne', () => {
  const m = new Match({
    id: 't',
    mode: 'classic',
    players: [
      { pseudo: 'A', team: 0, deck: ['theo', 'alycia', 'vladimir', 'nolan', 'adam', 'aisha', 'pasparfait', 'poliakov'] },
      { pseudo: 'B', team: 1, deck: ['theo', 'alycia', 'vladimir', 'nolan', 'adam', 'aisha', 'pasparfait', 'poliakov'] },
    ],
    emit: () => {},
    onEnd: () => {},
  });
  const p = m.players[0];
  for (let i = 0; i < Math.round(MATCH_RULES.countdown / DT) + 1; i++) m.update(DT);
  assert.equal(m.phase, 'battle');
  p.elixir = 0;
  for (let i = 0; i < Math.round(2.8 / DT); i++) m.update(DT);
  assert.ok(Math.abs(p.elixir - 1) < 0.05, `x1 : ${p.elixir}`);
  m.elapsed = MATCH_RULES.doubleElixirAt;
  p.elixir = 0;
  for (let i = 0; i < Math.round(1.4 / DT); i++) m.update(DT);
  assert.ok(Math.abs(p.elixir - 1) < 0.05, `x2 : ${p.elixir}`);
  p.elixir = 10;
  const card = p.hand[0];
  const next = p.queue[0];
  assert.equal(m.deploy(0, { handIndex: 0, cardId: card, x: 9, y: 8 }), true);
  assert.equal(p.hand[0], next);
  assert.equal(p.queue[p.queue.length - 1], card);
  assert.equal(m.deploy(0, { handIndex: 1, cardId: 'mohammed', x: 9, y: 8 }), false, 'carte absente refusée');
  p.elixir = 0;
  m.world.time += 1;
  assert.equal(m.deploy(0, { handIndex: 1, cardId: p.hand[1], x: 9, y: 8 }), false, 'pas assez d’élixir');
});

test('Tirage Triple : 8 manches puis deck de 8 cartes différentes', () => {
  const m = new Match({
    id: 'd',
    mode: 'draft',
    players: [
      { pseudo: 'A', team: 0 },
      { pseudo: 'B', team: 1 },
    ],
    emit: () => {},
    onEnd: () => {},
  });
  for (let r = 0; r < 8; r++) {
    for (const p of m.players) m.draftPick(p.index, p.draftOptions[0]);
    m.update(DT);
  }
  assert.equal(m.phase, 'countdown');
  for (const p of m.players) assert.equal(new Set(p.deck).size, 8);
});

for (const t of tests) {
  try {
    t.fn();
    passed++;
    console.log(`  ✅ ${t.name}`);
  } catch (err) {
    console.error(`  ❌ ${t.name}\n     ${err.message}`);
  }
}
console.log(`\n${passed}/${tests.length} tests réussis`);
if (passed !== tests.length) process.exit(1);
