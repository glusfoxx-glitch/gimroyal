// =============================================================================
// GIM ROYAL — Test de l'API d'authentification (sans Supabase, base fichier temporaire).
// Lancement : npm run test:auth
// =============================================================================

import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createHttpHandler } from '../http.js';
import { createDb } from '../db.js';
import { verifyToken, hashPassword, verifyPassword } from '../auth.js';

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'gimroyal-'));
process.env.DATA_FILE = path.join(tmp, 'players.json');
delete process.env.SUPABASE_URL;
const secret = 'x'.repeat(40);
const db = await createDb();
const server = http.createServer(createHttpHandler({ db, jwtSecret: secret, corsOrigins: ['*'] }));
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

async function call(method, url, body, token) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, cors: res.headers.get('access-control-allow-origin'), data: await res.json().catch(() => null) };
}

try {
  assert.equal(await verifyPassword('secret123', await hashPassword('secret123')), true);
  assert.equal(await verifyPassword('mauvais', await hashPassword('secret123')), false);

  let r = await call('POST', '/api/auth/register', { pseudo: 'Théo', password: 'choucroute' });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.equal(r.cors, '*');
  assert.equal(verifyToken(r.data.token, secret).sub, 'Théo');

  r = await call('POST', '/api/auth/register', { pseudo: 'théo', password: 'autrechose' });
  assert.equal(r.status, 409, 'pseudo unique sans tenir compte de la casse');

  r = await call('POST', '/api/auth/register', { pseudo: 'ab', password: 'choucroute' });
  assert.equal(r.status, 400);

  r = await call('POST', '/api/auth/login', { pseudo: 'Théo', password: 'faux-mdp' });
  assert.equal(r.status, 401);

  r = await call('POST', '/api/auth/login', { pseudo: 'THÉO', password: 'choucroute' });
  assert.equal(r.status, 200);
  const token = r.data.token;

  r = await call('GET', '/api/me', null, token);
  assert.equal(r.status, 200);
  assert.equal(r.data.profile.pseudo, 'Théo');

  r = await call('GET', '/api/me', null, `${token}x`);
  assert.equal(r.status, 401, 'jeton altéré refusé');

  await db.recordResult('Théo', 'win');
  r = await call('GET', '/api/me', null, token);
  assert.equal(r.data.profile.wins, 1);

  const raw = await fs.readFile(process.env.DATA_FILE, 'utf8').catch(() => '{}');
  void raw;
  console.log('✅ API d’authentification OK (inscription, connexion, jeton, profil, statistiques)');
} finally {
  server.close();
  if (db.flush) await db.flush();
  await fs.rm(tmp, { recursive: true, force: true });
}
