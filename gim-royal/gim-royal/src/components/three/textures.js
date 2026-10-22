'use client';
// =============================================================================
// Textures générées au chargement (aucun fichier image à télécharger).
// Le sol du "Couloir du Lycée" contient l'éclairage CUIT (baked) : ombres des tours,
// occlusion le long des casiers, reflets des néons — rendu avec un matériau non éclairé.
// =============================================================================
import * as THREE from 'three';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function finish(c, { repeat = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  t.needsUpdate = true;
  return t;
}

// next/font renomme la famille (ex : "__Lilita_One_a1b2") : on lit la vraie valeur CSS
function displayFont() {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim();
    if (v) return `${v}, "Arial Black", sans-serif`;
  } catch {
    /* rendu hors navigateur */
  }
  return '"Lilita One", "Arial Black", sans-serif';
}

// roundRect natif absent sur les vieux Safari iOS : tracé manuel de secours
function rrect(g, x, y, w, h, r) {
  g.beginPath();
  if (g.roundRect) {
    g.roundRect(x, y, w, h, r);
    return;
  }
  const rr = Math.min(r, w / 2, h / 2);
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

// Générateur pseudo-aléatoire déterministe (le sol est identique pour tous les joueurs)
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function makeFloorTexture(layout) {
  const ppt = 32;
  const W = layout.width;
  const L = layout.length;
  const [c, g] = canvas(W * ppt, L * ppt);
  const X = (x) => x * ppt;
  const Y = (y) => (L - y) * ppt;
  const rand = rng(1337);

  // 1) Lino à damier de couloir de lycée
  for (let ty = 0; ty < L; ty++) {
    for (let tx = 0; tx < W; tx++) {
      g.fillStyle = (tx + ty) % 2 ? '#d8ccb0' : '#c8b994';
      g.fillRect(X(tx), Y(ty + 1), ppt, ppt);
    }
  }
  // grain du lino
  for (let i = 0; i < W * L * 6; i++) {
    g.fillStyle = rand() > 0.5 ? 'rgba(90,70,40,0.10)' : 'rgba(255,255,255,0.10)';
    g.fillRect(rand() * W * ppt, rand() * L * ppt, 2, 2);
  }
  // joints
  g.strokeStyle = 'rgba(120,100,70,0.35)';
  g.lineWidth = 1;
  for (let tx = 0; tx <= W; tx++) {
    g.beginPath();
    g.moveTo(X(tx) + 0.5, 0);
    g.lineTo(X(tx) + 0.5, L * ppt);
    g.stroke();
  }
  for (let ty = 0; ty <= L; ty++) {
    g.beginPath();
    g.moveTo(0, Y(ty) + 0.5);
    g.lineTo(W * ppt, Y(ty) + 0.5);
    g.stroke();
  }

  // 2) Reflets des néons du plafond (cuits)
  for (let y = 3; y < L; y += 6.5) {
    const grd = g.createRadialGradient(X(W / 2), Y(y), 4, X(W / 2), Y(y), W * ppt * 0.38);
    grd.addColorStop(0, 'rgba(255,252,235,0.30)');
    grd.addColorStop(1, 'rgba(255,252,235,0)');
    g.fillStyle = grd;
    g.fillRect(0, Y(y + 4), W * ppt, 8 * ppt);
  }

  // 3) Occlusion ambiante le long des casiers
  for (const side of [0, 1]) {
    const x0 = side === 0 ? 0 : W * ppt;
    const grd = g.createLinearGradient(x0, 0, side === 0 ? 1.6 * ppt : W * ppt - 1.6 * ppt, 0);
    grd.addColorStop(0, 'rgba(30,20,50,0.55)');
    grd.addColorStop(1, 'rgba(30,20,50,0)');
    g.fillStyle = grd;
    g.fillRect(side === 0 ? 0 : W * ppt - 1.6 * ppt, 0, 1.6 * ppt, L * ppt);
  }
  for (const end of [0, 1]) {
    const y0 = end === 0 ? L * ppt : 0;
    const grd = g.createLinearGradient(0, y0, 0, end === 0 ? L * ppt - 1.2 * ppt : 1.2 * ppt);
    grd.addColorStop(0, 'rgba(30,20,50,0.5)');
    grd.addColorStop(1, 'rgba(30,20,50,0)');
    g.fillStyle = grd;
    g.fillRect(0, end === 0 ? L * ppt - 1.2 * ppt : 0, W * ppt, 1.2 * ppt);
  }

  // 4) Ombres cuites des tours (lumière venant du haut-droite)
  for (const team of [0, 1]) {
    for (const t of layout.towers) {
      const ty = team === 0 ? t.y : L - t.y;
      const half = t.type === 'king' ? 2 : 1.5;
      const cx = X(t.x - 0.7);
      const cy = Y(ty + 0.6);
      const grd = g.createRadialGradient(cx, cy, half * ppt * 0.6, cx, cy, half * ppt * 2.1);
      grd.addColorStop(0, 'rgba(25,15,40,0.55)');
      grd.addColorStop(1, 'rgba(25,15,40,0)');
      g.fillStyle = grd;
      g.beginPath();
      g.ellipse(cx, cy, half * ppt * 2.1, half * ppt * 1.7, 0, 0, Math.PI * 2);
      g.fill();
    }
  }

  // 5) Logos GIM au centre de chaque camp
  g.save();
  g.font = `bold ${Math.round(ppt * 2.6)}px sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(120,90,160,0.16)';
  g.fillText('GIM', X(W / 2), Y(L * 0.32));
  g.translate(X(W / 2), Y(L * 0.68));
  g.rotate(Math.PI);
  g.fillText('GIM', 0, 0);
  g.restore();

  // 6) Rivière d'huile
  const ry0 = Y(layout.riverMax);
  const rh = (layout.riverMax - layout.riverMin) * ppt;
  const oil = g.createLinearGradient(0, ry0, 0, ry0 + rh);
  oil.addColorStop(0, '#2a1a04');
  oil.addColorStop(0.25, '#6b4a10');
  oil.addColorStop(0.5, '#8a6216');
  oil.addColorStop(0.75, '#6b4a10');
  oil.addColorStop(1, '#2a1a04');
  g.fillStyle = oil;
  g.fillRect(0, ry0, W * ppt, rh);
  g.strokeStyle = 'rgba(255,214,120,0.22)';
  g.lineWidth = 2;
  for (let i = 0; i < W * 1.5; i++) {
    const x = rand() * W * ppt;
    const y = ry0 + 6 + rand() * (rh - 12);
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + 10, y - 3, x + 22 + rand() * 18, y);
    g.stroke();
  }
  // berges
  g.fillStyle = '#5b4a6e';
  g.fillRect(0, ry0 - 3, W * ppt, 4);
  g.fillRect(0, ry0 + rh - 1, W * ppt, 4);

  // 7) Ponts (planches)
  for (const b of layout.bridges) {
    const bx = X(b.xMin);
    const bw = (b.xMax - b.xMin) * ppt;
    const by = ry0 - ppt * 0.35;
    const bh = rh + ppt * 0.7;
    g.fillStyle = 'rgba(20,10,30,0.45)';
    g.fillRect(bx - 6, by + 6, bw + 12, bh);
    g.fillStyle = '#9a6b3c';
    g.fillRect(bx, by, bw, bh);
    g.strokeStyle = '#6e4826';
    g.lineWidth = 2;
    for (let y = by; y < by + bh; y += ppt * 0.33) {
      g.beginPath();
      g.moveTo(bx, y);
      g.lineTo(bx + bw, y);
      g.stroke();
    }
  }

  return finish(c);
}

/** Reflets mobiles de l'huile (texture qui défile). */
export function makeOilSheenTexture() {
  const [c, g] = canvas(256, 64);
  const rand = rng(42);
  g.clearRect(0, 0, 256, 64);
  for (let i = 0; i < 26; i++) {
    const x = rand() * 256;
    const y = 8 + rand() * 48;
    const w = 20 + rand() * 50;
    const grd = g.createLinearGradient(x, 0, x + w, 0);
    grd.addColorStop(0, 'rgba(255,220,140,0)');
    grd.addColorStop(0.5, 'rgba(255,230,160,0.8)');
    grd.addColorStop(1, 'rgba(255,220,140,0)');
    g.strokeStyle = grd;
    g.lineWidth = 2 + rand() * 2;
    g.beginPath();
    g.moveTo(x, y);
    g.bezierCurveTo(x + w * 0.3, y - 4, x + w * 0.6, y + 4, x + w, y);
    g.stroke();
  }
  return finish(c, { repeat: true });
}

/** Mur de casiers métalliques (côtés du couloir). */
export function makeLockerTexture() {
  const [c, g] = canvas(128, 256);
  g.fillStyle = '#2f5d9e';
  g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 2; i++) {
    const x = i * 64;
    g.fillStyle = i ? '#3a6db5' : '#33639f';
    g.fillRect(x + 3, 6, 58, 244);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    for (let k = 0; k < 4; k++) g.fillRect(x + 14, 22 + k * 8, 36, 3);
    g.fillStyle = '#c7d2e0';
    g.fillRect(x + 50, 120, 5, 22);
    g.fillStyle = 'rgba(255,255,255,0.12)';
    g.fillRect(x + 5, 8, 4, 240);
  }
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(0, 248, 128, 8);
  return finish(c, { repeat: true });
}

/** Tableau noir au fond du couloir. */
export function makeBoardTexture(lines) {
  const [c, g] = canvas(512, 160);
  g.fillStyle = '#6d4c2f';
  g.fillRect(0, 0, 512, 160);
  g.fillStyle = '#21402c';
  g.fillRect(10, 10, 492, 140);
  g.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 40; i++) g.fillRect(Math.random() * 492 + 10, Math.random() * 140 + 10, 30, 2);
  g.fillStyle = '#f5f5f0';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = 'bold 44px "Comic Sans MS", "Segoe Print", cursive';
  g.fillText(lines[0], 256, 58);
  g.font = '28px "Comic Sans MS", "Segoe Print", cursive';
  g.fillText(lines[1] || '', 256, 112);
  return finish(c);
}

/** Étiquette texte (emoji compris) pour les sprites : cache par contenu. */
const labelCache = new Map();
export function getLabelTexture(text, { color = '#ffffff', stroke = '#1b1035', size = 56, bg = null } = {}) {
  const key = `${text}|${color}|${stroke}|${size}|${bg}`;
  if (labelCache.has(key)) return labelCache.get(key);
  const font = `900 ${size}px ${displayFont()}`;
  const [m, mg] = canvas(8, 8);
  void m;
  mg.font = font;
  const w = Math.ceil(mg.measureText(text).width + size * 0.8);
  const h = Math.ceil(size * 1.5);
  const [c, g] = canvas(w, h);
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (bg) {
    g.fillStyle = bg;
    const r = h / 2.4;
    rrect(g, 2, 2, w - 4, h - 4, r);
    g.fill();
  }
  g.lineJoin = 'round';
  g.lineWidth = size * 0.16;
  g.strokeStyle = stroke;
  g.strokeText(text, w / 2, h / 2 + 2);
  g.fillStyle = color;
  g.fillText(text, w / 2, h / 2 + 2);
  const tex = finish(c);
  const entry = { tex, aspect: w / h };
  labelCache.set(key, entry);
  return entry;
}

/** Ombre ronde douce (sous les unités). */
let blobTex = null;
export function getBlobTexture() {
  if (blobTex) return blobTex;
  const [c, g] = canvas(64, 64);
  const grd = g.createRadialGradient(32, 32, 4, 32, 32, 30);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  blobTex = finish(c);
  return blobTex;
}

/** Barre de vie + PV d'une tour, redessinée seulement quand les PV changent. */
export function drawTowerHp(entry, hp, maxHp, color, label) {
  const { ctx, tex, canvas: c } = entry;
  const w = c.width;
  const h = c.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(15,10,30,0.85)';
  rrect(ctx, 4, 26, w - 8, 30, 10);
  ctx.fill();
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  ctx.fillStyle = color;
  if (ratio > 0) {
    rrect(ctx, 8, 30, Math.max(14, (w - 16) * ratio), 22, 7);
    ctx.fill();
  }
  ctx.font = `900 22px ${displayFont()}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#120a24';
  ctx.strokeText(String(hp), w / 2, 42);
  ctx.fillStyle = '#fff';
  ctx.fillText(String(hp), w / 2, 42);
  ctx.font = `900 20px ${displayFont()}`;
  ctx.strokeText(label, w / 2, 12);
  ctx.fillText(label, w / 2, 12);
  tex.needsUpdate = true;
}

export function createTowerHpCanvas() {
  const [c, ctx] = canvas(192, 60);
  const tex = finish(c);
  return { canvas: c, ctx, tex };
}
