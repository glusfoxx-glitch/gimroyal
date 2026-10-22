// =============================================================================
// GIM ROYAL — Règles de déploiement partagées.
// Le client s'en sert pour afficher les zones autorisées pendant le drag & drop,
// le serveur s'en sert pour VALIDER chaque pose (autorité stricte, anti-triche).
// =============================================================================

export function snapToGrid(v) {
  return Math.round(v * 2) / 2;
}

/** Convertit un y global en y "local" (du point de vue de l'équipe, son camp = petits y). */
export function localY(layout, team, y) {
  return team === 0 ? y : layout.length - y;
}

/** Inverse de localY. */
export function globalY(layout, team, ly) {
  return team === 0 ? ly : layout.length - ly;
}

export function laneOf(layout, x) {
  return x < layout.width / 2 ? 0 : 1;
}

/**
 * Construit l'état minimal nécessaire à la validation à partir des positions des tours
 * d'un plan d'arène. `aliveByKey` : { '0L': true, '1K': false, ... }
 */
export function towersFromLayout(layout, aliveByKey) {
  const out = [];
  for (const team of [0, 1]) {
    for (const def of layout.towers) {
      const half = def.type === 'king' ? 2 : 1.5;
      out.push({
        team,
        key: def.key,
        type: def.type,
        x: def.x,
        y: globalY(layout, team, def.y),
        half,
        lane: def.type === 'king' ? -1 : laneOf(layout, def.x),
        alive: aliveByKey ? aliveByKey[`${team}${def.key}`] !== false : true,
      });
    }
  }
  return out;
}

function overlaps(x, y, half, s, pad = 0) {
  return Math.abs(s.x - x) < s.half + half - pad && Math.abs(s.y - y) < s.half + half - pad;
}

/**
 * @param layout  plan d'arène (LAYOUTS[...])
 * @param team    0 ou 1
 * @param card    entrée de CARDS
 * @param x,y     position globale (déjà alignée sur la grille de 0,5)
 * @param state   objet contenant towers (team, type, lane, x, y, half, alive) et buildings (x, y, half)
 */
export function canDeploy(layout, team, card, x, y, state) {
  const W = layout.width;
  const L = layout.length;
  if (!card || !Number.isFinite(x) || !Number.isFinite(y)) return false;

  // Les sorts se lancent n'importe où dans l'arène
  if (card.type === 'spell') return x >= 0 && x <= W && y >= 0 && y <= L;

  const ly = localY(layout, team, y);

  if (card.type === 'building') {
    const h = card.stats.half;
    if (x - h < 0 || x + h > W || ly - h < 0 || ly + h > layout.riverMin) return false;
    for (const s of state.towers) if (overlaps(x, y, h, s)) return false;
    for (const s of state.buildings) if (overlaps(x, y, h, s)) return false;
    return true;
  }

  // Troupes
  if (x < 0.5 || x > W - 0.5 || ly < 0.5 || ly > L - 0.5) return false;
  let ok = ly <= layout.riverMin - 0.5;
  if (!ok && ly >= layout.riverMax + 0.5 && ly <= layout.riverMax + layout.pocketDepth) {
    const lane = laneOf(layout, x);
    const enemyPrincess = state.towers.find((t) => t.team !== team && t.type === 'princess' && t.lane === lane);
    ok = !!enemyPrincess && !enemyPrincess.alive;
  }
  if (!ok) return false;
  for (const s of state.towers) if (s.alive && overlaps(x, y, 0, s, 0.01)) return false;
  for (const s of state.buildings) if (overlaps(x, y, 0, s, 0.01)) return false;
  return true;
}

/** Rectangles (coordonnées globales) où le joueur a le droit de poser ce type de carte. */
export function deployRects(layout, team, cardType, towers) {
  const W = layout.width;
  const L = layout.length;
  if (cardType === 'spell') return [{ x0: 0, y0: 0, x1: W, y1: L }];
  const toGlobal = (ly0, ly1) => (team === 0 ? [ly0, ly1] : [L - ly1, L - ly0]);
  const rects = [];
  const [a, b] = toGlobal(0, layout.riverMin);
  rects.push({ x0: 0, y0: a, x1: W, y1: b });
  if (cardType === 'troop') {
    for (const lane of [0, 1]) {
      const enemy = towers.find((t) => t.team !== team && t.type === 'princess' && t.lane === lane);
      if (enemy && !enemy.alive) {
        const [c, d] = toGlobal(layout.riverMax, layout.riverMax + layout.pocketDepth);
        rects.push({ x0: lane === 0 ? 0 : W / 2, x1: lane === 0 ? W / 2 : W, y0: c, y1: d });
      }
    }
  }
  return rects;
}
