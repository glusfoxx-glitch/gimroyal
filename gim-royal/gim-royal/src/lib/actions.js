'use client';
// Actions de jeu côté client : pré-validation locale (retour immédiat) puis envoi au
// serveur, qui revalide TOUT (élixir, main, zone) avant d'appliquer.
import { CARDS } from '@shared/cards.js';
import { LAYOUTS, FLAGS } from '@shared/constants.js';
import { canDeploy, snapToGrid, towersFromLayout, localY, globalY, laneOf } from '@shared/zones.js';
import { gameStore, showToast } from './store';
import { emit } from './socket';

export function deployStateFromSnap(layout, snap) {
  const alive = {};
  for (const t of snap.tw) alive[`${t[1]}${t[2]}`] = (t[5] & FLAGS.ALIVE) !== 0;
  const towers = towersFromLayout(layout, alive);
  const buildings = [];
  for (const u of snap.u) {
    const c = CARDS[u[1]];
    if (c && c.type === 'building') buildings.push({ x: u[4], y: u[5], half: c.stats.half });
  }
  return { towers, buildings };
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/**
 * Aimante la position vers la zone autorisée la plus proche (comme dans Clash Royale :
 * glisser une troupe trop loin la pose au bord de son camp).
 */
export function clampDeploy(layout, team, card, x, y, state) {
  const W = layout.width;
  const L = layout.length;
  if (card.type === 'spell') return [clamp(snapToGrid(x), 0, W), clamp(snapToGrid(y), 0, L)];
  const half = card.type === 'building' ? card.stats.half : 0.5;
  const cx = clamp(snapToGrid(x), half, W - half);
  let ly = localY(layout, team, snapToGrid(y));
  const ownMax = card.type === 'building' ? layout.riverMin - half : layout.riverMin - 0.5;
  if (ly > ownMax) {
    const lane = laneOf(layout, cx);
    const enemy = state.towers.find((t) => t.team !== team && t.type === 'princess' && t.lane === lane);
    const pocketOpen = card.type === 'troop' && enemy && !enemy.alive;
    const pocketMin = layout.riverMax + 0.5;
    const pocketMax = layout.riverMax + layout.pocketDepth;
    if (pocketOpen && ly >= (layout.riverMin + layout.riverMax) / 2) ly = clamp(ly, pocketMin, pocketMax);
    else ly = ownMax;
  }
  ly = Math.max(half, ly);
  return [cx, globalY(layout, team, ly)];
}

export function tryDeploy(handIndex, cardId, x, y) {
  const { match, snap } = gameStore.get();
  if (!match || !snap) return false;
  const card = CARDS[cardId];
  const layout = LAYOUTS[match.layoutId];
  if (!card) return false;
  if (snap.ph !== 'battle' && snap.ph !== 'overtime') {
    showToast('Attends le début du combat !');
    return false;
  }
  if (snap.hd[handIndex] !== cardId) return false;
  if (snap.el < card.cost) {
    showToast("Pas assez d'élixir !");
    return false;
  }
  const state = deployStateFromSnap(layout, snap);
  const [px, py] = clampDeploy(layout, match.team, card, x, y, state);
  if (!canDeploy(layout, match.team, card, px, py, state)) {
    showToast('Zone interdite !');
    return false;
  }
  emit('match:deploy', { handIndex, cardId, x: px, y: py });
  gameStore.set({ selected: -1 });
  return true;
}

export function toggleDodo(unitId) {
  emit('match:ability', { unitId });
}

export function draftPick(cardId) {
  emit('draft:pick', { cardId });
}

export function forfeit() {
  emit('match:leave');
}
