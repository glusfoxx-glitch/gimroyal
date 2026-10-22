// =============================================================================
// GIM ROYAL — Base de données des cartes, des tours et de l'arène.
// Les textes (description, cible/portée, vitesse/PV, mécanique) sont repris À LA LETTRE
// du document de game design. Les valeurs numériques de `stats` traduisent ces libellés
// (Lente, PV Très Élevés, Distance moyenne...) en chiffres exploitables par le serveur.
//
// Échelle de vitesse (tuiles/s) : Très Lente 0.6 · Lente 0.75 · Moyenne 1.0 ·
// Moyenne-Élevée 1.25 · Rapide / Élevée 1.5 · Très Rapide 2.0
// =============================================================================

export const CARDS = {
  theo: {
    id: 'theo',
    name: 'Théo',
    title: 'Le Tank Toxique',
    type: 'troop',
    cost: 6,
    emoji: '🥬',
    female: false,
    description: `Grand blond alsacien, élevé en mangeant beaucoup trop de choucroute.`,
    cibleEtPortee: `Sol / Courte portée (Choucroute).`,
    vitesseEtPv: `Lente / PV Très Élevés (Tank).`,
    mecanique: `Son attaque de base ralentit les ennemis. À sa mort, il lâche son "Pet fumant", un nuage toxique infligeant des dégâts de zone et un aveuglement (comme le sort de Poison).`,
    stats: {
      hp: 3800, damage: 160, hitSpeed: 1.5, firstHit: 0.6, range: 2, sight: 5.5,
      speed: 0.75, radius: 0.65, mass: 6, targets: 'ground',
      projectile: 'choucroute', projectileSpeed: 9, launchHeight: 1.0, arc: 1.2,
      slowDuration: 2,
      deathCloud: { radius: 3, duration: 5, tickEvery: 1, damage: 70, towerMult: 0.35, blind: 1.2 },
    },
  },
  vladimir: {
    id: 'vladimir',
    name: 'Vladimir',
    title: 'Le Rusher',
    type: 'troop',
    cost: 4,
    emoji: '🍾',
    female: false,
    description: `Jeune Russe banni de sa patrie avec sa chapka car il buvait un peu trop de Poliakov.`,
    cibleEtPortee: `Sol / Distance moyenne (Cocktails Molotov).`,
    vitesseEtPv: `Rapide / PV Moyens.`,
    mecanique: `Dégâts de zone. Active son "Poliakov speed" (boost de vitesse extrême) lorsqu'il traverse le pont, à la manière du Bûcheron dans Clash Royale.`,
    stats: {
      hp: 950, damage: 140, hitSpeed: 1.6, firstHit: 0.5, range: 4.5, sight: 6,
      speed: 1.5, radius: 0.5, mass: 3, targets: 'ground',
      projectile: 'molotov', projectileSpeed: 8, launchHeight: 1.1, arc: 1.8, splash: 1.3,
      poliakovMult: 1.75, poliakovDuration: 5,
    },
  },
  nolan: {
    id: 'nolan',
    name: 'Nolan',
    title: 'Le Sniper',
    type: 'troop',
    cost: 4,
    emoji: '💿',
    female: false,
    description: `Grand en taille mais petit dans le game. Il rêve d'être DJ depuis toujours, mais n'a pas compris que jeter des vinyles sur les gens n'était pas le but du métier.`,
    cibleEtPortee: `Air & Sol / Très longue portée (Vinyles).`,
    vitesseEtPv: `Moyenne / PV Faibles.`,
    mecanique: `Frappe de très loin. Si un ennemi s'approche au corps-à-corps, il déclenche un "Bass Drop" repoussant les cibles (effet de recul), mais sa vitesse de recharge est très lente.`,
    stats: {
      hp: 380, damage: 210, hitSpeed: 2.6, firstHit: 0.8, range: 9, sight: 9.5,
      speed: 1.0, radius: 0.5, mass: 3, targets: 'all',
      projectile: 'vinyle', projectileSpeed: 14, launchHeight: 1.3, arc: 0.3,
      bassTrigger: 1.6, bassRadius: 2.6, bassPush: 2.5, bassDamage: 60, bassCooldown: 12,
    },
  },
  matheo: {
    id: 'matheo',
    name: 'Mathéo',
    title: 'Le Soutien',
    type: 'troop',
    cost: 4,
    emoji: '🥐',
    female: false,
    description: `Brun à toque équipé d'un rouleau à pâtisserie. Il s'efforçait de bien étudier, mais la Fournée Dorée l'a eu : devenu mécanicien-pâtissier, il fourre les brioches avec son petit rouleau.`,
    cibleEtPortee: `Sol / Mêlée (Rouleau à pâtisserie).`,
    vitesseEtPv: `Moyenne / PV Bons.`,
    mecanique: `Lance passivement des brioches soignantes en zone autour de lui à chaque fois qu'il donne un coup.`,
    stats: {
      hp: 1500, damage: 150, hitSpeed: 1.3, firstHit: 0.4, range: 1.0, sight: 5.5,
      speed: 1.0, radius: 0.55, mass: 4, targets: 'ground',
      healRadius: 3, heal: 90,
    },
  },
  mohammed: {
    id: 'mohammed',
    name: 'Mohammed',
    title: 'Le Colosse',
    type: 'troop',
    cost: 8,
    emoji: '🧴',
    female: false,
    description: `Grand et large Algérien, tombé dans la marmite de parfum quand il était petit. Depuis, il attaque les narines des autres et passe son temps à snapper des tanas.`,
    cibleEtPortee: `Bâtiments uniquement / Mêlée ("Snap de tana", snap les bâtiments).`,
    vitesseEtPv: `Très Lente / PV Massifs.`,
    mecanique: `Ignore les troupes. Son "Parfum de haaarbi" inflige des dégâts continus (Aura) aux petits ennemis autour de lui pendant qu'il marche (Hybride entre Géant Électrique et Géant Royal).`,
    stats: {
      hp: 5200, damage: 300, hitSpeed: 1.7, firstHit: 0.6, range: 1.0, sight: 7,
      speed: 0.6, radius: 0.85, mass: 10, targets: 'buildings',
      auraRadius: 2.5, auraDamage: 22, auraTick: 0.5, auraSmallMaxHp: 1600,
    },
  },
  adam: {
    id: 'adam',
    name: 'Adam',
    title: "L'Assassin",
    type: 'troop',
    cost: 4,
    emoji: '🛴',
    female: false,
    description: `Marocain de taille moyenne qui est tombé de sa fidèle "tabouzi trottinette" un beau jour. Depuis, il fonce dans tout le monde pour se venger.`,
    cibleEtPortee: `Sol / Mêlée.`,
    vitesseEtPv: `Très Rapide (Trottinette) / PV Faibles.`,
    mecanique: `Charge l'ennemi. Son premier coup "Tabouzi trottinette" étourdit la cible pendant 1 seconde (comme le Prince ou la Voleuse). Il a la capacité unique de sauter par-dessus la rivière sans utiliser les ponts.`,
    stats: {
      hp: 650, damage: 160, hitSpeed: 1.1, firstHit: 0.3, range: 0.9, sight: 5.5,
      speed: 2.0, radius: 0.5, mass: 3, targets: 'ground',
      jumpsRiver: true, chargeDistance: 2.5, chargeSpeedMult: 1.5, chargeMult: 2, chargeStun: 1,
    },
  },
  ibrahima: {
    id: 'ibrahima',
    name: 'Ibrahima',
    title: 'Le Chevalier Mega',
    type: 'troop',
    cost: 7,
    emoji: '🖐️',
    female: false,
    description: `Grand Sénégalais tout fin en dessous de son armure, ayant froid tout le temps. Il est doté de très grandes mains, parfaites pour distribuer de longs doigts d'honneur.`,
    cibleEtPortee: `Sol / Mêlée étendue (Baffes).`,
    vitesseEtPv: `Moyenne / PV Élevés.`,
    mecanique: `Apparaît sur la map avec un "Super Saut" qui écrase les ennemis en zone. Il saute à nouveau si sa cible est éloignée.`,
    stats: {
      hp: 3300, damage: 220, hitSpeed: 1.7, firstHit: 0.6, range: 1.6, sight: 6,
      speed: 1.0, radius: 0.75, mass: 8, targets: 'ground', splash: 1.3,
      spawnJumpRadius: 2.5, spawnJumpDamage: 330,
      jumpMin: 3.5, jumpMax: 6, jumpDamage: 330, jumpRadius: 2.2, jumpDuration: 0.9,
      jumpHeight: 2.5, jumpCooldown: 1.2,
    },
  },
  yann: {
    id: 'yann',
    name: 'Yann',
    title: 'Le Fantôme',
    type: 'troop',
    cost: 4,
    emoji: '👻',
    female: false,
    description: `Grand brun moustachu qui vivait heureux avec une nymphomane. En voulant rompre, elle l'a tellement poursuivi qu'il a développé un stress post-traumatique, le rendant invisible aux femmes. Depuis, il se branle matin, midi et soir.`,
    cibleEtPortee: `Sol / Fait rouler de grosses bobines d'acier ArcelorMittal qui repoussent les ennemis.`,
    vitesseEtPv: `Rapide / PV Moyens.`,
    mecanique: `Sa "Peur des femmes" le rend invisible. Il ne peut être ciblé par les tours ou les ennemis jusqu'à ce qu'il donne son premier coup (comme le Fantôme Royal).`,
    stats: {
      hp: 1000, damage: 180, hitSpeed: 2.0, firstHit: 0.5, range: 4, sight: 6,
      speed: 1.5, radius: 0.55, mass: 4, targets: 'ground',
      bobineRange: 6, bobineSpeed: 5, bobineHitRadius: 0.7, knockback: 1.2, revealTime: 2,
    },
  },
  clement: {
    id: 'clement',
    name: 'Clément',
    title: "L'Électrocuteur",
    type: 'troop',
    cost: 5,
    emoji: '⚡',
    female: false,
    description: `Blond bouclé, musclé et torse nu avec un physique impressionnant, développé spécifiquement pour compenser son tout petit appareil génital.`,
    cibleEtPortee: `Air & Sol / Distance (Coup de fouet qui ramène les ennemis vers lui, comme le Pêcheur).`,
    vitesseEtPv: `Moyenne / PV Faibles.`,
    mecanique: `Son attaque "Électrocution Schneider" paralyse la cible et réinitialise son attaque (contre parfaitement Mohammed ou les Tours).`,
    stats: {
      hp: 600, damage: 120, hitSpeed: 1.6, firstHit: 0.5, range: 5, sight: 6.5,
      speed: 1.0, radius: 0.5, mass: 3, targets: 'all',
      stun: 0.5, pull: 3, pullMin: 1.3,
    },
  },
  aisha: {
    id: 'aisha',
    name: 'Aisha',
    title: "L'Unité Volante",
    type: 'troop',
    cost: 2,
    emoji: '🍭',
    female: true,
    description: `Petite Sénégalaise en armure. Son activité préférée : manger des sucettes au Betty, ce qui lui a fait développer un solide diabète de type 2.`,
    cibleEtPortee: `Air & Sol / Distance moyenne (Jette des sucettes depuis le ciel).`,
    vitesseEtPv: `Rapide / PV Faibles.`,
    mecanique: `C'est une unité aérienne pure, volant au-dessus des obstacles.`,
    stats: {
      hp: 260, damage: 85, hitSpeed: 1.1, firstHit: 0.4, range: 4, sight: 5.5,
      speed: 1.5, radius: 0.45, mass: 2, targets: 'all', flying: true,
      projectile: 'sucette', projectileSpeed: 9, launchHeight: 2.2, arc: 0,
    },
  },
  celine: {
    id: 'celine',
    name: 'Céline',
    title: 'La Stratège',
    type: 'troop',
    cost: 2,
    emoji: '🐆',
    female: true,
    description: `Métisse à coupe afro, en tenue léopard avec un képi. Elle suit fièrement son idole, le grand Mobutu commandant des jaguars, et se bat à l'aide d'une grande canne issue de la sapologie.`,
    cibleEtPortee: `Sol / Distance moyenne (Canne).`,
    vitesseEtPv: `Moyenne-Élevée / PV Moyens.`,
    mecanique: `Une fois déployée, elle peut faire un "Dodo stratégique" : elle devient immobile, déploie un bouclier pour se régénérer, mais ne peut ni attaquer ni bouger.`,
    stats: {
      hp: 800, damage: 100, hitSpeed: 1.2, firstHit: 0.4, range: 3.5, sight: 5.5,
      speed: 1.25, radius: 0.5, mass: 3, targets: 'ground',
      dodoShield: 400, dodoRegen: 70, dodoDuration: 8, dodoCooldown: 4,
    },
  },
  emircan: {
    id: 'emircan',
    name: 'Emircan',
    title: 'Le Combattant',
    type: 'troop',
    cost: 4,
    emoji: '🦵',
    female: false,
    description: `Jeune Turc, véritable prodige du city stade avec d'énormes talents en football... mais pas tout le temps.`,
    cibleEtPortee: `Air & Sol / Mêlée (Distribue des coups de pied en l'air).`,
    vitesseEtPv: `Élevée / PV Moyens.`,
    mecanique: `Aucune, combattant pur.`,
    stats: {
      hp: 1150, damage: 200, hitSpeed: 1.1, firstHit: 0.4, range: 1.2, sight: 5.5,
      speed: 1.5, radius: 0.55, mass: 4, targets: 'all',
    },
  },
  pasparfait: {
    id: 'pasparfait',
    name: 'Pas Parfait',
    title: 'Le Canonnier',
    type: 'troop',
    cost: 3,
    emoji: '⚽',
    female: false,
    description: `Petit homme noir avec une immense calvitie, arborant le maillot grenat du FC Metz. Toujours un ballon à la main.`,
    cibleEtPortee: `Air & Sol / Distance élevée (comme la Mousquetaire).`,
    vitesseEtPv: `Rapide / PV Faibles.`,
    mecanique: `Tire avec son ballon de foot sur les cibles (dégâts moyens, cadence rapide).`,
    stats: {
      hp: 520, damage: 110, hitSpeed: 0.8, firstHit: 0.3, range: 6, sight: 6.5,
      speed: 1.5, radius: 0.45, mass: 2, targets: 'all',
      projectile: 'ballon', projectileSpeed: 12, launchHeight: 0.9, arc: 0.5,
    },
  },
  alycia: {
    id: 'alycia',
    name: 'Alycia',
    title: 'La Supportrice',
    type: 'troop',
    cost: 3,
    emoji: '🧥',
    female: true,
    description: `Petite femme d'origine brésilienne qui ne quitte jamais sa doudoune.`,
    cibleEtPortee: `Toutes cibles / Courte-Moyenne distance.`,
    vitesseEtPv: `Très Rapide / PV Moyens.`,
    mecanique: `Elle insulte en brésilien, ce qui étourdit ses adversaires un court instant (petits dégâts). Synergie : quand elle est déployée aux côtés de Théo, ils obtiennent tous les deux un gros boost de PV et d'attaque.`,
    stats: {
      hp: 900, damage: 45, hitSpeed: 1.2, firstHit: 0.3, range: 3, sight: 5.5,
      speed: 2.0, radius: 0.45, mass: 3, targets: 'all',
      stun: 0.4, synergyRadius: 6, synergyMult: 1.4,
    },
  },
  aminematue: {
    id: 'aminematue',
    name: 'Aminematue',
    title: 'Le Sapeur Gobelin',
    type: 'troop',
    cost: 5,
    emoji: '📱',
    female: false,
    description: `Petit gobelin habillé en survêtement Lacoste TN qui court très vite et ne cible que les tours.`,
    cibleEtPortee: `Bâtiments uniquement / Mêlée.`,
    vitesseEtPv: `Très Rapide / PV Moyens.`,
    mecanique: `Se colle à la tour en fixant son téléphone et lui inflige des dégâts en Bluetooth grâce à ChatGPT (petits dégâts continus mais très rapides).`,
    stats: {
      hp: 900, damage: 32, hitSpeed: 0.25, firstHit: 0.2, range: 0.8, sight: 7,
      speed: 2.0, radius: 0.45, mass: 2, targets: 'buildings',
    },
  },

  // ------------------------------------------------------------------ BÂTIMENTS
  beti: {
    id: 'beti',
    name: 'BéTI',
    title: 'Bâtiment',
    type: 'building',
    cost: 4,
    emoji: '🏢',
    female: false,
    description: `Bâtiment moderne qui fait apparaître des "Aisha" une par une selon un timer. Il attire également les Aisha de l'équipe adverse et les convertit pour rejoindre votre camp. Possède des PV moyens et se détruit seul avec le temps.`,
    stats: {
      hp: 900, radius: 1, half: 1, mass: 100, targets: 'none', lifetime: 40,
      firstSpawn: 1, spawnEvery: 7, attractRadius: 6, convertRadius: 1.2,
    },
  },
  bureau: {
    id: 'bureau',
    name: 'Bureau de Breuer',
    title: 'Bâtiment',
    type: 'building',
    cost: 5,
    emoji: '🗄️',
    female: false,
    description: `Agit comme une Tour de l'Enfer. Plus on passe de temps à côté du bureau, plus on perd de la vie rapidement.`,
    stats: {
      hp: 1500, radius: 1, half: 1, mass: 100, targets: 'all', lifetime: 35,
      range: 6, hitSpeed: 0.4, rampTimes: [0, 2, 4], rampDamage: [30, 100, 350],
    },
  },

  // ---------------------------------------------------------------------- SORTS
  poliakov: {
    id: 'poliakov',
    name: 'Poliakov',
    title: 'Sort',
    type: 'spell',
    cost: 2,
    emoji: '🍸',
    female: false,
    description: `Agit comme un sort de Rage (Boost de vitesse et d'attaque de zone).`,
    stats: { radius: 3, duration: 6, tickEvery: 0.1 },
  },
  brioche: {
    id: 'brioche',
    name: 'Brioche Dorée',
    title: 'Sort',
    type: 'spell',
    cost: 3,
    emoji: '🍞',
    female: false,
    description: `Agit comme un sort de Soin de zone.`,
    stats: { radius: 3, duration: 3, tickEvery: 0.5, heal: 80 },
  },
};

// ------------------------------------------------------------------------ TOURS
export const TOWERS = {
  gilet: {
    id: 'gilet',
    name: 'Gilet',
    title: 'Tours de Gauche et Droite (Gilet)',
    role: 'Tours de la Princesse (Tours Latérales)',
    description: `Profs au cou en avant. PV modérés. Tirent très rapidement à moyenne distance avec un arc qui propulse des cigarettes.`,
    stats: {
      hp: 2500, damage: 75, hitSpeed: 0.55, firstHit: 0.3, range: 7.5, radius: 1.5, half: 1.5,
      targets: 'all', mass: 1000,
      projectile: 'cigarette', projectileSpeed: 16, launchHeight: 3.4, arc: 0.2,
    },
  },
  breuer: {
    id: 'breuer',
    name: 'Breuer',
    title: 'Le Boss (Breuer)',
    role: 'Tour du Roi (Tour Centrale)',
    description: `Gros ventre, surmonté d'une couronne estampillée de la marque GIM. PV immenses. Endormi au début. S'il subit des dégâts ou si une tour latérale tombe, il s'éveille et inflige des dégâts massifs à l'aide de son canon à craie.`,
    stats: {
      hp: 5000, damage: 220, hitSpeed: 1.2, firstHit: 0.4, range: 7, radius: 2, half: 2,
      targets: 'all', mass: 1000,
      projectile: 'craie', projectileSpeed: 12, launchHeight: 4.2, arc: 0.6, splash: 1.0,
    },
  },
};

export const ARENA_INFO = {
  name: `L'Arène : Le Couloir du Lycée`,
  environnement: `Un couloir central séparé par des tables renversées avec une rivière d'huile qui sépare les deux camps. Deux ponts permettent de traverser.`,
  reglesElixir: `L'élixir double lors de la dernière minute de jeu.`,
  modes: `1V1 Classique et Mode Tirage Triple (Draft).`,
};

export const TYPE_LABELS = { troop: 'Personnage', building: 'Bâtiment', spell: 'Sort' };

export const CARD_ORDER = [
  'theo', 'vladimir', 'nolan', 'matheo', 'mohammed', 'adam', 'ibrahima', 'yann',
  'clement', 'aisha', 'celine', 'emircan', 'pasparfait', 'alycia', 'aminematue',
  'beti', 'bureau', 'poliakov', 'brioche',
];

export const DEFAULT_DECK = ['theo', 'alycia', 'vladimir', 'nolan', 'adam', 'aisha', 'pasparfait', 'poliakov'];

/** Un deck valide = 8 identifiants de cartes existants et tous différents. */
export function validateDeck(deck) {
  if (!Array.isArray(deck) || deck.length !== 8) return false;
  const set = new Set(deck);
  if (set.size !== 8) return false;
  return deck.every((id) => typeof id === 'string' && Object.prototype.hasOwnProperty.call(CARDS, id));
}

export function averageCost(deck) {
  if (!deck.length) return 0;
  return deck.reduce((s, id) => s + (CARDS[id]?.cost || 0), 0) / deck.length;
}
