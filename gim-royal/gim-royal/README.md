# 👑 GIM Royal — Le Couloir du Lycée

Clone de Clash Royale en 3D, jouable directement dans le navigateur (mobile iOS/Android et PC), sans téléchargement.

- **Front** : Next.js 16 (App Router) + React Three Fiber, HUD en HTML/CSS par-dessus le canvas 3D, à déployer sur Vercel
- **Serveur** : Node.js + Socket.io avec autorité stricte (élixir, main, zones de pose et combat calculés côté serveur, 20 ticks/s)
- **Comptes** : pseudo + mot de passe (hachage scrypt, jeton signé), stockés dans Supabase (ou dans un fichier JSON en local)
- **Modes** : 1V1 Classique, 2V2, 1V1 Tirage Triple, Entraînement contre le Bot Breuer

---

## 1. Lancer le projet en local

Prérequis : **Node.js 20.9 ou plus récent** (`node -v`).

```bash
cd gim-royal
npm install
cp .env.example .env.local     # sous Windows : copy .env.example .env.local
npm run dev
```

- Le site s'ouvre sur **http://localhost:3000** et le serveur de jeu tourne sur le port **4000**.
- Sans configuration Supabase, les comptes sont enregistrés dans `server/data/players.json`.
- Pour jouer seul, crée un compte et lance **Entraînement** : tu affrontes le Bot Breuer.
- Pour jouer à deux sur un seul PC, ouvre une seconde fenêtre en navigation privée avec un autre compte, puis lance **1V1 Classique** dans les deux fenêtres.

### Jouer depuis ton téléphone (même Wi-Fi)

1. Récupère l'IP de ton PC (`ipconfig` sous Windows, `ifconfig` sous Mac/Linux), par exemple `192.168.1.42`.
2. Dans `.env.local`, ajoute `DEV_ORIGINS=192.168.1.42`.
3. Relance `npm run dev`, puis ouvre `http://192.168.1.42:3000` sur le téléphone.

Le front contacte automatiquement `http://192.168.1.42:4000`. Si le serveur reste injoignable, autorise Node.js dans le pare-feu de ton PC.

### Commandes d'initialisation (pour repartir d'un projet vide)

Le projet est déjà complet. Pour info, voici comment il a été initialisé :

```bash
npx create-next-app@latest gim-royal --js --app --src-dir --no-tailwind --no-eslint --import-alias "@/*"
cd gim-royal
npm install three @react-three/fiber socket.io socket.io-client
```

---

## 2. Tests (sans navigateur)

```bash
npm test                 # tout : mécaniques + auth + matchmaking + simulations
npm run test:mechanics   # 26 tests, un par mécanique spéciale (Yann, Adam, Théo, BéTI...)
npm run test:auth        # inscription / connexion / jeton / statistiques
npm run test:matchmaking # files d'attente, reconnexion, abandon, 2V2, anti-triche
npm run test:sim         # matchs complets Bot contre Bot dans les 4 modes
```

---

## 3. Mise en ligne

Vercel ne garde pas de WebSocket ouverte, donc **le front et le serveur de jeu s'hébergent séparément** :

```
 Navigateur ──HTTPS──▶ Vercel (Next.js)
     │
     └──WebSocket──▶ Render / Railway (server/index.js) ──▶ Supabase (comptes)
```

### a) Supabase (comptes joueurs)

1. Crée un projet sur supabase.com.
2. Ouvre **SQL Editor**, colle le contenu de `supabase/schema.sql` et exécute-le.
3. Dans **Project Settings > API**, note l'**URL** et la clé **service_role**. Cette clé est secrète : elle ne doit jamais aller dans le front.

> Pourquoi ne pas utiliser Supabase Auth ? Supabase Auth impose un e-mail. Ici le serveur gère lui-même pseudo + mot de passe (hachés en scrypt) et utilise Supabase comme base de données. La RLS est activée sans aucune policy : seule la clé service_role du serveur peut lire la table.

### b) Serveur de jeu sur Render (gratuit)

1. Pousse le projet sur GitHub.
2. Sur render.com, choisis **New > Blueprint** et sélectionne le dépôt : `render.yaml` est détecté automatiquement.
3. Renseigne `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`. `JWT_SECRET` est généré automatiquement.
4. Note l'URL obtenue, par exemple `https://gim-royal-server.onrender.com`. Tu peux vérifier que le serveur répond sur `/health`.

> Sur l'offre gratuite de Render, le serveur se met en veille après 15 minutes sans joueur. La première connexion qui suit prend alors environ 30 secondes.

### c) Front sur Vercel

1. Sur vercel.com, choisis **Add New > Project** et importe le dépôt (le framework Next.js est détecté).
2. Dans **Environment Variables**, ajoute `NEXT_PUBLIC_GAME_SERVER_URL` = l'URL Render.
3. Déploie.
4. Facultatif mais conseillé : dans Render, remplace `CLIENT_ORIGIN=*` par ton domaine Vercel (par exemple `https://gim-royal.vercel.app`).

---

## 4. Architecture

```
gim-royal/
├── shared/                    # Code commun serveur + client
│   ├── cards.js               # 19 cartes + 2 tours : textes À LA LETTRE + stats chiffrées
│   ├── constants.js           # règles (élixir, durées), modes, plans d'arène 1V1 / 2V2
│   └── zones.js               # règles de pose (validation serveur + affichage client)
├── server/
│   ├── index.js               # HTTP + Socket.io, vérification du jeton à la connexion
│   ├── http.js                # API /api/auth/register, /api/auth/login, /api/me
│   ├── auth.js                # scrypt + JWT HS256 (module crypto natif)
│   ├── db.js                  # Supabase (REST) ou fichier JSON local
│   ├── matchmaking.js         # files d'attente, reconnexion, boucle de jeu 20 Hz
│   ├── game/
│   │   ├── Match.js           # draft, décompte, élixir x1/x2, prolongations, validations
│   │   ├── World.js           # simulation : ciblage, combat, projectiles, mécaniques spéciales
│   │   ├── Pathfinding.js     # grille de collision 0,5 tuile + A* + lissage
│   │   └── Bot.js             # IA du mode Entraînement
│   └── test/                  # tests mécaniques, auth, simulations
├── src/
│   ├── app/                   # page.js (connexion), lobby/, game/
│   ├── components/
│   │   ├── hud/               # TopBar, ElixirBar, CardHand, AbilityBar, DraftScreen, Overlays
│   │   ├── lobby/DeckBuilder.js
│   │   └── three/             # GameCanvas, Arena, Towers, Units, Projectiles, Effects, DeployController
│   └── lib/                   # socket, store, registre des entités, actions, coordonnées
└── supabase/schema.sql
```

### Ce qui garde le jeu fluide sur mobile

- **Éclairage cuit** : ombres des tours, occlusion le long des casiers et reflets des néons sont peints dans la texture du sol, sans ombre calculée en temps réel.
- **Modèles low-poly fusionnés** : chaque personnage est une seule géométrie à couleurs de sommets, soit 1 draw call par unité.
- **Instanciation** : barres de vie et ombres de toutes les unités tiennent en 3 draw calls.
- **Pools** : projectiles et effets réutilisent des meshes préalloués, sans allocation pendant le combat.
- **Réseau** : 10 snapshots/s compressés, interpolés à 60 FPS côté client. Les Yann invisibles adverses ne sont jamais envoyés, ce qui empêche de les révéler en trichant.
- Résolution plafonnée à 1,75x.

### Ajuster l'équilibrage

Toutes les valeurs numériques sont dans `shared/cards.js`, dans le champ `stats` de chaque carte. Les textes (`description`, `cibleEtPortee`, `vitesseEtPv`, `mecanique`) reprennent le document de game design mot pour mot : ne modifie que `stats`. Relance ensuite `npm test`.

### Contrôles en combat

- **Glisser-déposer** une carte de la main vers l'arène, au doigt ou à la souris. Au doigt, l'unité s'affiche légèrement au-dessus du doigt pour rester visible.
- Ou **toucher une carte**, puis **toucher le terrain**.
- Pendant la pose, la zone verte est autorisée et la zone rouge appartient à l'adversaire. Une troupe lâchée trop loin est placée au bord de ton camp.
- Quand une tour adverse tombe, une zone de pose s'ouvre dans le camp adverse, sur le couloir de cette tour.
- **Dodo stratégique** de Céline : bouton en bas à gauche de l'arène.
- 🏳️ en haut à droite pour abandonner (deux appuis).
