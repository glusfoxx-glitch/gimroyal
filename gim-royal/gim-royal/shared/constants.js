// =============================================================================
// GIM ROYAL — Constantes partagées (serveur Node + client Next.js)
// Toutes les distances sont exprimées en "tuiles" (1 tuile = 1 unité monde 3D).
// Repère arène : x de 0 (gauche) à width, y de 0 (camp équipe 0) à length (camp équipe 1).
// =============================================================================

export const TICK_RATE = 20; // simulation serveur à 20 Hz
export const DT = 1 / TICK_RATE;
export const SNAPSHOT_EVERY = 2; // envoi réseau toutes les 2 ticks = 10 Hz (le client interpole)

export const MATCH_RULES = {
  battleDuration: 180, // 3 minutes de temps réglementaire
  doubleElixirAt: 120, // élixir x2 pendant la dernière minute
  overtimeDuration: 60, // prolongations (mort subite) si égalité de couronnes
  countdown: 3, // décompte avant le combat
  elixirMax: 10,
  elixirStart: 5,
  elixirSecondsPerUnit: 2.8, // x1 : 1 goutte toutes les 2,8 s (x2 : toutes les 1,4 s)
  deployTime: 1, // temps de déploiement d'une troupe / d'un bâtiment
  deckSize: 8,
  handSize: 4,
  draftRounds: 8, // Tirage Triple : 8 manches de 3 propositions
  draftRoundTime: 12,
  draftChoices: 3,
  reconnectGrace: 30, // secondes pour revenir après une déconnexion
  deployCooldown: 0.25, // anti-spam : 4 poses max par seconde
};

// Modes de jeu (textes repris des directives du projet)
export const MODES = {
  classic: {
    id: 'classic',
    label: '1V1 Classique',
    desc: '1V1 Classique (2 ponts, 3 tours).',
    layout: '1v1',
    players: 2,
    draft: false,
    bot: false,
  },
  duo: {
    id: 'duo',
    label: '2V2',
    desc: "2V2 (Arène plus large, double génération d'élixir gérée par deux joueurs).",
    layout: '2v2',
    players: 4,
    draft: false,
    bot: false,
  },
  draft: {
    id: 'draft',
    label: '1V1 Tirage Triple',
    desc: '1V1 Tirage Triple (Phase de draft de cartes avant le match).',
    layout: '1v1',
    players: 2,
    draft: true,
    bot: false,
  },
  training: {
    id: 'training',
    label: 'Entraînement',
    desc: "Affronte le Bot Breuer pour tester tes decks sans attendre d'adversaire.",
    layout: '1v1',
    players: 1,
    draft: false,
    bot: true,
  },
};

// Plans d'arène. Les tours sont définies pour l'équipe 0 ; l'équipe 1 est en miroir sur y.
export const LAYOUTS = {
  '1v1': {
    id: '1v1',
    width: 18,
    length: 32,
    riverMin: 15,
    riverMax: 17,
    pocketDepth: 4, // zone de pose gagnée chez l'adversaire quand sa tour latérale tombe
    bridges: [
      { xMin: 2, xMax: 5 },
      { xMin: 13, xMax: 16 },
    ],
    towers: [
      { key: 'L', type: 'princess', x: 3.5, y: 6.5 },
      { key: 'R', type: 'princess', x: 14.5, y: 6.5 },
      { key: 'K', type: 'king', x: 9, y: 3 },
    ],
  },
  '2v2': {
    id: '2v2',
    width: 26,
    length: 32,
    riverMin: 15,
    riverMax: 17,
    pocketDepth: 4,
    bridges: [
      { xMin: 3, xMax: 6 },
      { xMin: 20, xMax: 23 },
    ],
    towers: [
      { key: 'L', type: 'princess', x: 4.5, y: 6.5 },
      { key: 'R', type: 'princess', x: 21.5, y: 6.5 },
      { key: 'K', type: 'king', x: 13, y: 3 },
    ],
  },
};

// Bits d'état envoyés au client pour chaque entité
export const FLAGS = {
  STUN: 1,
  SLOW: 2,
  RAGE: 4,
  STEALTH: 8,
  ASLEEP: 16,
  ATTACKING: 32,
  AIR: 64,
  SHIELD: 128,
  DEPLOYING: 256,
  BLIND: 512,
  SYNERGY: 1024,
  CHARGING: 2048,
  ATTRACTED: 4096,
  POLIAKOV: 8192,
  ALIVE: 16384,
};

// Multiplicateurs d'effets globaux
export const EFFECTS = {
  slowFactor: 0.65, // ralentissement (choucroute de Théo)
  blindSlow: 0.85, // aveuglement du Pet fumant
  rageMult: 1.35, // sort Poliakov (Rage)
};

// Format des tableaux réseau (documentation du protocole)
// unité  : [id, code, team, owner, x, y, z, hp, maxHp, flags, angle, attackSeq, targetId, aux]
// tour   : [id, team, key, hp, maxHp, flags, targetId, angle]
// projo  : [id, kind, x, y, z]
// zone   : [id, kind, team, x, y, radius, timeLeft]
// fx     : [kind, x, y, a, b, c]
