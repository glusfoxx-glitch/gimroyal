// =============================================================================
// GIM ROYAL — API HTTP d'authentification (Pseudo / Mot de passe).
//   POST /api/auth/register  { pseudo, password } -> { token, profile }
//   POST /api/auth/login     { pseudo, password } -> { token, profile }
//   GET  /api/me             (Authorization: Bearer <token>) -> { profile }
//   GET  /health
// =============================================================================

import { hashPassword, verifyPassword, signToken, verifyToken, validateCredentials } from './auth.js';
import { PseudoTakenError } from './db.js';

const MAX_BODY = 8 * 1024;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 30;

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Requête trop volumineuse.'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(Object.assign(new Error('JSON invalide.'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

export function createHttpHandler({ db, jwtSecret, corsOrigins }) {
  const hits = new Map();

  function allowOrigin(origin) {
    if (!origin) return null;
    if (corsOrigins.includes('*')) return '*';
    return corsOrigins.includes(origin) ? origin : null;
  }

  function send(res, status, body, origin) {
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      Vary: 'Origin',
    };
    const allowed = allowOrigin(origin);
    if (allowed) {
      headers['Access-Control-Allow-Origin'] = allowed;
      headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
      headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    }
    res.writeHead(status, headers);
    res.end(body === null ? '' : JSON.stringify(body));
  }

  function rateLimited(req) {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = hits.get(ip);
    if (!entry || entry.reset < now) {
      hits.set(ip, { count: 1, reset: now + RATE_WINDOW_MS });
      if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
      return false;
    }
    entry.count++;
    return entry.count > RATE_MAX;
  }

  const issue = (row) => ({
    token: signToken({ sub: row.pseudo }, jwtSecret),
    profile: { pseudo: row.pseudo, wins: row.wins || 0, losses: row.losses || 0, draws: row.draws || 0 },
  });

  return async function handler(req, res) {
    const origin = req.headers.origin;
    const url = new URL(req.url, 'http://localhost');
    try {
      if (req.method === 'OPTIONS') return send(res, 204, null, origin);

      if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/')) {
        return send(res, 200, { ok: true, name: 'gim-royal-server' }, origin);
      }

      if (req.method === 'POST' && (url.pathname === '/api/auth/register' || url.pathname === '/api/auth/login')) {
        if (rateLimited(req)) return send(res, 429, { error: 'Trop de tentatives, réessaie dans quelques minutes.' }, origin);
        const body = await readJson(req);
        const pseudo = typeof body.pseudo === 'string' ? body.pseudo.trim() : '';
        const password = body.password;
        const invalid = validateCredentials(pseudo, password);
        if (invalid) return send(res, 400, { error: invalid }, origin);

        if (url.pathname === '/api/auth/register') {
          if (await db.findByPseudo(pseudo)) return send(res, 409, { error: 'Ce pseudo est déjà pris.' }, origin);
          const passwordHash = await hashPassword(password);
          try {
            const row = await db.createPlayer({ pseudo, passwordHash });
            return send(res, 201, issue(row), origin);
          } catch (err) {
            if (err instanceof PseudoTakenError || err.code === 'PSEUDO_TAKEN') {
              return send(res, 409, { error: 'Ce pseudo est déjà pris.' }, origin);
            }
            throw err;
          }
        }

        const row = await db.findByPseudo(pseudo);
        const ok = row ? await verifyPassword(password, row.password_hash) : false;
        if (!ok) return send(res, 401, { error: 'Pseudo ou mot de passe incorrect.' }, origin);
        return send(res, 200, issue(row), origin);
      }

      if (req.method === 'GET' && url.pathname === '/api/me') {
        const auth = req.headers.authorization || '';
        const payload = verifyToken(auth.startsWith('Bearer ') ? auth.slice(7) : '', jwtSecret);
        if (!payload) return send(res, 401, { error: 'Session expirée.' }, origin);
        const profile = await db.getProfile(payload.sub);
        return send(res, 200, { profile }, origin);
      }

      return send(res, 404, { error: 'Introuvable.' }, origin);
    } catch (err) {
      console.error('[http]', err);
      return send(res, err.status || 500, { error: err.status ? err.message : 'Erreur serveur.' }, origin);
    }
  };
}
