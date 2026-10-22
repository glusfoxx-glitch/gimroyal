// =============================================================================
// GIM ROYAL — Test du matchmaking avec des sockets simulées (sans réseau) :
// file d'attente, création de match, pose, déconnexion / reconnexion, abandon,
// enregistrement des statistiques, mode Entraînement, session unique.
// Lancement : npm run test:matchmaking
// =============================================================================

import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { Matchmaker } from '../matchmaking.js';
import { createDb } from '../db.js';
import { DEFAULT_DECK, CARDS } from '../../shared/cards.js';

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'gimroyal-mm-'));
process.env.DATA_FILE = path.join(tmp, 'players.json');
delete process.env.SUPABASE_URL;
const db = await createDb();
await db.createPlayer({ pseudo: 'Alice', passwordHash: 'x' });
await db.createPlayer({ pseudo: 'Bob', passwordHash: 'x' });

let nextId = 1;
function fakeSocket(pseudo) {
  const handlers = {};
  const s = {
    id: `s${nextId++}`,
    data: { pseudo },
    events: [],
    on(ev, fn) {
      (handlers[ev] ||= []).push(fn);
      return s;
    },
    emit(ev, data) {
      s.events.push([ev, data]);
      return s;
    },
    send(ev, data) {
      (handlers[ev] || []).forEach((f) => f(data));
    },
    disconnect() {
      (handlers.disconnect || []).forEach((f) => f());
    },
    last(ev) {
      for (let i = s.events.length - 1; i >= 0; i--) if (s.events[i][0] === ev) return s.events[i][1];
      return undefined;
    },
  };
  return s;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const mm = new Matchmaker({ io: null, db });
let passed = 0;
const ok = (c, m) => {
  assert.ok(c, m);
  passed++;
  console.log(`  ✅ ${m}`);
};

try {
  const A = fakeSocket('Alice');
  const B = fakeSocket('Bob');
  mm.handleConnection(A);
  mm.handleConnection(B);
  await wait(20);
  ok(A.last('session')?.pseudo === 'Alice', 'profil envoyé à la connexion');

  A.send('queue:join', { mode: 'classic', deck: ['theo'] });
  ok(A.last('toast')?.message.includes('Deck invalide'), 'deck invalide refusé');

  A.send('queue:join', { mode: 'classic', deck: DEFAULT_DECK });
  ok(A.last('queue:status')?.waiting === 1, 'Alice en file (1/2)');
  B.send('queue:join', { mode: 'classic', deck: DEFAULT_DECK });
  const fa = A.last('match:found');
  const fb = B.last('match:found');
  ok(fa && fb && fa.matchId === fb.matchId && fa.team !== fb.team, 'match 1V1 créé, équipes opposées');

  await wait(3400);
  const snap = A.last('s');
  ok(snap && snap.ph === 'battle', 'snapshots reçus, combat lancé');
  ok(!('hd' in snap) || Array.isArray(snap.hd), 'main présente dans le snapshot');

  const ly = fa.team === 0 ? 8 : 24;
  const hi = snap.hd.findIndex((id) => CARDS[id].type === 'troop' && CARDS[id].cost <= snap.el);
  A.send('match:deploy', { handIndex: hi, cardId: snap.hd[hi], x: 9, y: ly });
  await wait(250);
  const after = A.last('s');
  ok(after.u.some((u) => u[3] === fa.index), 'unité d’Alice présente dans la simulation');

  B.send('match:deploy', { handIndex: 0, cardId: 'mohammed', x: 9, y: 8 });
  await wait(60);
  ok(B.last('toast')?.message === 'Carte non disponible.', 'triche (carte absente de la main) refusée');

  A.disconnect();
  await wait(60);
  const A2 = fakeSocket('Alice');
  mm.handleConnection(A2);
  ok(A2.last('match:found')?.matchId === fa.matchId, 'reconnexion : retour automatique dans la partie');

  const A3 = fakeSocket('Alice');
  mm.handleConnection(A3);
  ok(A2.last('kicked'), 'session unique : l’ancienne connexion est fermée');

  B.send('match:leave');
  await wait(150);
  ok(A3.last('match:end')?.result === 'win', 'abandon de Bob : victoire d’Alice');
  ok(B.last('match:end')?.result === 'loss', 'Bob reçoit la défaite');
  await wait(100);
  ok((await db.getProfile('Alice')).wins === 1 && (await db.getProfile('Bob')).losses === 1, 'statistiques enregistrées');

  A3.send('queue:join', { mode: 'training', deck: DEFAULT_DECK });
  const ft = A3.last('match:found');
  ok(ft && ft.matchId !== fa.matchId && ft.players.some((p) => p.bot), 'Entraînement : match immédiat contre le bot');

  const C = fakeSocket('Chloe');
  const D = fakeSocket('Dylan');
  const E = fakeSocket('Emma');
  const F = fakeSocket('Farid');
  for (const s of [C, D, E, F]) mm.handleConnection(s);
  for (const s of [C, D, E]) s.send('queue:join', { mode: 'duo', deck: DEFAULT_DECK });
  ok(E.last('queue:status')?.waiting === 3 && !E.last('match:found'), '2V2 : on attend 4 joueurs');
  F.send('queue:join', { mode: 'duo', deck: DEFAULT_DECK });
  const teams = [C, D, E, F].map((s) => s.last('match:found')?.team);
  ok(teams.filter((t) => t === 0).length === 2 && teams.filter((t) => t === 1).length === 2, '2V2 : 2 contre 2');

  const G = fakeSocket('Gina');
  mm.handleConnection(G);
  G.send('queue:join', { mode: 'draft' });
  G.send('queue:leave');
  ok(G.last('queue:status')?.mode === null, 'quitter la file d’attente');

  console.log(`\n${passed} vérifications matchmaking OK`);
} finally {
  mm.stop();
  if (db.flush) await db.flush();
  await fs.rm(tmp, { recursive: true, force: true });
}
