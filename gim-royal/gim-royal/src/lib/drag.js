'use client';
// État mutable du glisser-déposer (lu à 60 FPS par la scène 3D, sans re-render React).
export const drag = {
  active: false, // un doigt / la souris tient une carte
  cardId: null,
  handIndex: -1,
  sx: 0, // position écran courante
  sy: 0,
  startX: 0,
  startY: 0,
  moved: false,
  over: false, // le pointeur survole l'arène
  touchOffset: 0, // décalage vers le haut au doigt pour voir la pose
};

// Fonctions fournies par la scène 3D (DeployController)
export const bridge = {
  screenToArena: null, // (sx, sy) => [x, y] | null
  isOverCanvas: null, // (sx, sy) => boolean
};
