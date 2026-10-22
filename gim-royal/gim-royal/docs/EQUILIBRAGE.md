# GIM Royal — Stats chiffrées et architecture du code

Ce document est la référence d'équilibrage du jeu. Les **textes** des cartes restent ceux du document "Personnage map description", repris à la lettre dans `shared/cards.js`. Les **chiffres** ci-dessous sont la traduction des libellés (Lente, PV Très Élevés…) choisie lors de la génération du code (octobre 2026). Ils se modifient dans le champ `stats` de chaque carte.

## Règles de match

- Durée 180 s, élixir x2 à partir de 120 s (dernière minute), prolongations 60 s en mort subite, puis départage aux PV de la tour la plus faible
- Élixir : départ 5, max 10, +1 toutes les 2.8 s (x1)
- Déploiement 1 s ; deck de 8, main de 4 ; Tirage Triple : 8 manches de 3 choix, 12 s par manche
- Échelle de vitesse (tuiles/s) : Très Lente 0,6 · Lente 0,75 · Moyenne 1,0 · Moyenne-Élevée 1,25 · Rapide/Élevée 1,5 · Très Rapide 2,0

## Personnages

| Carte | Coût | PV | Dégâts | Cadence (s) | Portée | Vitesse | Cible | Réglages de la mécanique |
|---|---|---|---|---|---|---|---|---|
| Théo | 6 | 3800 | 160 | 1.5 | 2 | 0.75 | Sol | ralentit 2s ; Pet fumant r3, 70/s pendant 5s, aveugle 1.2s |
| Vladimir | 4 | 950 | 140 | 1.6 | 4.5 | 1.5 | Sol | zone r1.3 ; Poliakov speed x1.75 pendant 5s après le pont |
| Nolan | 4 | 380 | 210 | 2.6 | 9 | 1 | Air & Sol | Bass Drop si ennemi à 1.6 t : recul 2.5 t, 60 dégâts, recharge 12s |
| Mathéo | 4 | 1500 | 150 | 1.3 | 1 | 1 | Sol | soin 90 PV en zone r3 à chaque coup |
| Mohammed | 8 | 5200 | 300 | 1.7 | 1 | 0.6 | Bâtiments | aura 22 toutes les 0.5s, r2.5, ennemis < 1600 PV |
| Adam | 4 | 650 | 160 | 1.1 | 0.9 | 2 | Sol | charge après 2.5 t (vitesse x1.5) : coup x2 + étourdit 1s ; saute la rivière |
| Ibrahima | 7 | 3300 | 220 | 1.7 | 1.6 | 1 | Sol | zone r1.3 ; Super Saut 330 r2.5 ; saut 3.5–6 t : 330 r2.2 |
| Yann | 4 | 1000 | 180 | 2 | 4 | 1.5 | Sol | invisible jusqu'au 1er coup (re-invisible après 2s), jamais ciblé par Aisha/Céline/Alycia ; bobine 6 t, recul 1.2 |
| Clément | 5 | 600 | 120 | 1.6 | 5 | 1 | Air & Sol | paralyse 0.5s + réinitialise l'attaque ; tire la cible de 3 t |
| Aisha | 2 | 260 | 85 | 1.1 | 4 | 1.5 | Air & Sol | volante |
| Céline | 2 | 800 | 100 | 1.2 | 3.5 | 1.25 | Sol | Dodo (bouton) : bouclier 400, +70 PV/s, 8s max, recharge 4s |
| Emircan | 4 | 1150 | 200 | 1.1 | 1.2 | 1.5 | Air & Sol | — |
| Pas Parfait | 3 | 520 | 110 | 0.8 | 6 | 1.5 | Air & Sol | projectile ballon |
| Alycia | 3 | 900 | 45 | 1.2 | 3 | 2 | Air & Sol | étourdit 0.4s ; synergie avec Théo à 6 t : PV et dégâts x1.4 |
| Aminematue | 5 | 900 | 32 | 0.25 | 0.8 | 2 | Bâtiments | dégâts continus rapides (Bluetooth) |

## Bâtiments et sorts

| Carte | Coût | Réglages |
|---|---|---|
| BéTI | 4 | 900 PV, durée de vie 40s, une Aisha toutes les 7s, attire les Aisha adverses à 6 t et les convertit |
| Bureau de Breuer | 5 | 1500 PV, durée de vie 35s, portée 6, 30 → 100 → 350 dégâts toutes les 0.4s (montée à 2s et 4s) |
| Poliakov | 2 | rage x1,35 vitesse et attaque, rayon 3, 6s |
| Brioche Dorée | 3 | soin 80 PV toutes les 0.5s pendant 3s, rayon 3 |

## Tours

| Tour | PV | Dégâts | Cadence | Portée |
|---|---|---|---|---|
| Tours de Gauche et Droite (Gilet) | 2500 | 75 | 0.55s | 7.5 |
| Le Boss (Breuer) | 5000 | 220 (zone r1) | 1.2s | 7 |

## Architecture du code

- `shared/` : cartes (textes + stats), règles, zones de pose. Ce code est commun au serveur et au client.
- `server/` : Node.js + Socket.io, avec autorité stricte du serveur et simulation à 20 Hz. Contient `World.js` (combat et mécaniques), `Pathfinding.js` (grille 0,5 t + A*), `Match.js` (élixir, main, draft, fin de partie), `matchmaking.js`, auth scrypt + JWT, Supabase ou fichier JSON.
- `src/` : Next.js, avec le HUD HTML/CSS et la 3D React Three Fiber (`src/components/three/`).
- Déploiement : le front va sur Vercel, le serveur de jeu sur Render (`render.yaml`), les comptes sur Supabase (`supabase/schema.sql`).
- Tests : `npm test` lance les mécaniques, l'auth, le matchmaking et les simulations Bot contre Bot.
