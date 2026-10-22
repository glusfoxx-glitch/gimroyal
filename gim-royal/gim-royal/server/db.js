// =============================================================================
// GIM ROYAL — Stockage des joueurs.
// - Production : Supabase (API REST PostgREST, clé service_role côté serveur uniquement).
// - Développement : fichier JSON local (server/data/players.json) si Supabase n'est pas configuré.
// =============================================================================

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class PseudoTakenError extends Error {
  constructor() {
    super('Ce pseudo est déjà pris.');
    this.code = 'PSEUDO_TAKEN';
  }
}

const profileOf = (row) => ({
  pseudo: row.pseudo,
  wins: row.wins || 0,
  losses: row.losses || 0,
  draws: row.draws || 0,
});

function createSupabaseDb(url, serviceKey) {
  const base = `${url.replace(/\/$/, '')}/rest/v1`;
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  async function call(pathname, init = {}) {
    const res = await fetch(`${base}${pathname}`, { ...init, headers: { ...headers, ...(init.headers || {}) } });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const err = new Error(data?.message || `Supabase ${res.status}`);
      err.status = res.status;
      err.pgCode = data?.code;
      throw err;
    }
    return data;
  }

  return {
    kind: 'supabase',
    async findByPseudo(pseudo) {
      const rows = await call(`/players?pseudo_lower=eq.${encodeURIComponent(pseudo.toLowerCase())}&select=*&limit=1`);
      return rows?.[0] || null;
    },
    async createPlayer({ pseudo, passwordHash }) {
      try {
        const rows = await call('/players', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ pseudo, pseudo_lower: pseudo.toLowerCase(), password_hash: passwordHash }),
        });
        return rows[0];
      } catch (err) {
        if (err.status === 409 || err.pgCode === '23505') throw new PseudoTakenError();
        throw err;
      }
    },
    async getProfile(pseudo) {
      const row = await this.findByPseudo(pseudo);
      return row ? profileOf(row) : { pseudo, wins: 0, losses: 0, draws: 0 };
    },
    async recordResult(pseudo, outcome) {
      await call('/rpc/record_result', {
        method: 'POST',
        body: JSON.stringify({ p_pseudo_lower: pseudo.toLowerCase(), p_outcome: outcome }),
      });
    },
  };
}

async function createFileDb(file) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  let data = {};
  try {
    data = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    data = {};
  }
  let saveTimer = null;
  let saving = Promise.resolve();
  const save = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saving = saving.then(async () => {
        const tmp = `${file}.tmp`;
        await fs.writeFile(tmp, JSON.stringify(data, null, 2));
        await fs.rename(tmp, file);
      }).catch((err) => console.error('[db] sauvegarde impossible', err));
    }, 300);
  };

  return {
    kind: 'file',
    async findByPseudo(pseudo) {
      return data[pseudo.toLowerCase()] || null;
    },
    async createPlayer({ pseudo, passwordHash }) {
      const key = pseudo.toLowerCase();
      if (data[key]) throw new PseudoTakenError();
      const row = {
        pseudo,
        pseudo_lower: key,
        password_hash: passwordHash,
        wins: 0,
        losses: 0,
        draws: 0,
        created_at: new Date().toISOString(),
      };
      data[key] = row;
      save();
      return row;
    },
    async getProfile(pseudo) {
      const row = data[pseudo.toLowerCase()];
      return row ? profileOf(row) : { pseudo, wins: 0, losses: 0, draws: 0 };
    },
    async recordResult(pseudo, outcome) {
      const row = data[pseudo.toLowerCase()];
      if (!row) return;
      if (outcome === 'win') row.wins = (row.wins || 0) + 1;
      else if (outcome === 'loss') row.losses = (row.losses || 0) + 1;
      else row.draws = (row.draws || 0) + 1;
      save();
    },
    async flush() {
      clearTimeout(saveTimer);
      const tmp = `${file}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(data, null, 2));
      await fs.rename(tmp, file);
    },
  };
}

export async function createDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    console.log('[db] Supabase connecté :', url);
    return createSupabaseDb(url, key);
  }
  const file = process.env.DATA_FILE || path.join(__dirname, 'data', 'players.json');
  console.log('[db] Mode fichier local :', file, '(configure SUPABASE_URL pour la production)');
  return createFileDb(file);
}
