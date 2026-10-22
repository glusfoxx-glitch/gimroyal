// Conversion repère arène (x, y en tuiles) <-> repère monde 3D (X, Z).
// Le camp de l'équipe 0 (petits y) est vers +Z, celui de l'équipe 1 vers -Z.
export function arenaToWorld(layout, x, y) {
  return [x - layout.width / 2, layout.length / 2 - y];
}

export function worldToArena(layout, X, Z) {
  return [X + layout.width / 2, layout.length / 2 - Z];
}

// Le serveur envoie l'orientation a = atan2(dx, dy) ; le modèle regarde vers +Z.
export function facingToRotY(a) {
  return Math.PI - a;
}

export function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
