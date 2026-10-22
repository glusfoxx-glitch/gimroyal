// =============================================================================
// GIM ROYAL — Test de simulation headless : des matchs complets Bot vs Bot,
// sans réseau, pour vérifier le moteur (élixir, IA, pathfinding, fin de partie).
// Lancement : npm run test:sim   (option : node server/test/simulate.js 20)
// =============================================================================

import { Match } from '../game/Match.js';
import { DT } from '../../shared/constants.js';
import { CARD_ORDER } from '../../shared/cards.js';

const N = Number(process.argv[2]) || 6;
const decks = [
  ['theo', 'alycia', 'vladimir', 'nolan', 'adam', 'aisha', 'pasparfait', 'poliakov'],
  ['mohammed', 'clement', 'celine', 'emircan', 'aminematue', 'bureau', 'brioche', 'aisha'],
  ['ibrahima', 'yann', 'matheo', 'pasparfait', 'beti', 'vladimir', 'alycia', 'poliakov'],
];

function runMatch(mode, i) {
  const events = { end: null, toasts: 0 };
  const nPlayers = mode === 'duo' ? 4 : 2;
  const players = Array.from({ length: nPlayers }, (_, k) => ({
    pseudo: `Bot${k}`,
    team: k % 2,
    bot: true,
    deck: decks[(i + k) % decks.length],
  }));
  const m = new Match({
    id: `sim-${i}`,
    mode,
    players,
    emit: (idx, ev) => {
      if (ev === 'toast') events.toasts++;
    },
    onEnd: (match) => {
      events.end = match.result;
    },
  });
  const seen = new Set();
  let maxUnits = 0;
  let ticks = 0;
  const t0 = performance.now();
  while (m.phase !== 'ended' && ticks < 20 * 60 * 10) {
    m.update(DT);
    if (ticks % 2 === 0) {
      for (const p of m.players) {
        const s = m.snapshotFor(p);
        JSON.stringify(s);
        for (const u of s.u) seen.add(u[1]);
        maxUnits = Math.max(maxUnits, s.u.length);
      }
      m.world.fx = [];
    }
    // sanity : aucune unité au sol dans la rivière (hors sauteurs)
    for (const e of m.world.entities.values()) {
      if (!e.alive || e.kind !== 'troop' || e.flying || e.jumper || e.jump) continue;
      if (m.world.nav.isRiver(e.x, e.y)) throw new Error(`${e.code} #${e.id} coincé dans la rivière (${e.x.toFixed(2)}, ${e.y.toFixed(2)})`);
      if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) throw new Error(`${e.code} position invalide`);
    }
    ticks++;
  }
  const ms = performance.now() - t0;
  return { mode, result: events.end, seconds: (ticks * DT).toFixed(0), ms: ms.toFixed(0), units: seen.size, maxUnits, toasts: events.toasts };
}

const modes = ['training', 'classic', 'duo', 'draft'];
let failures = 0;
const allSeen = new Set();
for (let i = 0; i < N; i++) {
  const mode = modes[i % modes.length];
  try {
    const r = runMatch(mode, i);
    if (!r.result) throw new Error('le match ne s\'est pas terminé');
    console.log(
      `#${i} ${r.mode.padEnd(8)} -> ${r.result.reason.padEnd(11)} vainqueur=${r.result.winnerTeam} couronnes=${r.result.crowns.join('-')} ` +
        `durée=${r.seconds}s calcul=${r.ms}ms cartes-vues=${r.units} unités-max=${r.maxUnits}`,
    );
  } catch (err) {
    failures++;
    console.error(`#${i} ${mode} ÉCHEC :`, err);
  }
}
void allSeen;
void CARD_ORDER;
if (failures) {
  console.error(`${failures} simulation(s) en échec`);
  process.exit(1);
}
console.log('✅ Toutes les simulations sont terminées sans erreur.');
