'use client';
// =============================================================================
// Modèles low-poly procéduraux. Chaque personnage = UNE géométrie fusionnée à
// couleurs de sommets → 1 seul draw call par unité, 1 seul matériau partagé.
// Repère local : +Z = avant du personnage, Y = haut, pieds à y = 0.
// =============================================================================
import * as THREE from 'three';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

function paint(geo, color) {
  _c.set(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = _c.r;
    arr[i * 3 + 1] = _c.g;
    arr[i * 3 + 2] = _c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

/** Place une primitive (position, rotation, échelle) et la colore. */
function P(geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) {
  _e.set(rot[0], rot[1], rot[2]);
  _q.setFromEuler(_e);
  _m.compose(_p.set(pos[0], pos[1], pos[2]), _q, _s.set(scl[0], scl[1], scl[2]));
  geo.applyMatrix4(_m);
  return paint(geo, color);
}

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const sph = (r, ws = 8, hs = 6) => new THREE.SphereGeometry(r, ws, hs);
const hemi = (r) => new THREE.SphereGeometry(r, 9, 4, 0, Math.PI * 2, 0, Math.PI / 2);
const cyl = (rt, rb, h, seg = 8) => new THREE.CylinderGeometry(rt, rb, h, seg);
const cone = (r, h, seg = 6) => new THREE.ConeGeometry(r, h, seg);
const torus = (r, t, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, 5, 14, arc);

export function mergeParts(parts) {
  let vc = 0;
  let ic = 0;
  for (const g of parts) {
    vc += g.attributes.position.count;
    ic += g.index ? g.index.count : g.attributes.position.count;
  }
  const pos = new Float32Array(vc * 3);
  const nor = new Float32Array(vc * 3);
  const col = new Float32Array(vc * 3);
  const idx = vc > 65535 ? new Uint32Array(ic) : new Uint16Array(ic);
  let vo = 0;
  let io = 0;
  for (const g of parts) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, vo * 3);
    nor.set(g.attributes.normal.array, vo * 3);
    col.set(g.attributes.color.array, vo * 3);
    if (g.index) {
      const a = g.index.array;
      for (let k = 0; k < a.length; k++) idx[io + k] = a[k] + vo;
      io += a.length;
    } else {
      for (let k = 0; k < n; k++) idx[io + k] = vo + k;
      io += n;
    }
    vo += n;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}

// --------------------------------------------------------------------- HUMANOÏDE
function humanoid(o) {
  const parts = [];
  const bw = o.bulk ?? 1;
  const y0 = o.lift ?? 0;
  const skin = o.skin;
  const shirt = o.shirt;
  const sleeves = o.sleeves ?? shirt;
  const pants = o.pants ?? '#334155';
  const shoes = o.shoes ?? '#1f2937';
  // jambes + chaussures
  for (const sx of [-1, 1]) {
    parts.push(P(box(0.17, 0.5, 0.2), pants, [sx * 0.11 * bw, y0 + 0.3, 0]));
    parts.push(P(box(0.19, 0.09, 0.28), shoes, [sx * 0.11 * bw, y0 + 0.045, 0.03]));
  }
  // torse
  if (o.belly) parts.push(P(sph(0.36, 10, 8), shirt, [0, y0 + 0.84, 0.05], [0, 0, 0], [bw * 0.95, 1, 1.08]));
  else if (o.puffy) parts.push(P(sph(0.33, 10, 8), shirt, [0, y0 + 0.86, 0], [0, 0, 0], [1.05 * bw, 1.05, 0.8]));
  else parts.push(P(box(0.5 * bw, 0.58, 0.3), shirt, [0, y0 + 0.84, 0]));
  // bras + mains
  const hr = o.bigHands ? 0.15 : 0.08;
  for (const sx of [-1, 1]) {
    parts.push(P(box(o.puffy ? 0.18 : 0.14, 0.5, o.puffy ? 0.2 : 0.16), sleeves, [sx * 0.34 * bw, y0 + 0.85, 0]));
    parts.push(P(sph(hr, 6, 5), skin, [sx * 0.34 * bw, y0 + 0.56, 0.02]));
  }
  // cou + tête
  const hz = o.neckForward ? 0.16 : 0;
  const hy = y0 + 1.36;
  parts.push(P(cyl(0.07, 0.08, 0.16, 6), skin, [0, y0 + 1.17, hz * 0.45], [o.neckForward ? 0.7 : 0, 0, 0]));
  parts.push(P(sph(0.2, 10, 8), skin, [0, hy, hz]));
  for (const sx of [-1, 1]) parts.push(P(box(0.05, 0.06, 0.02), '#111111', [sx * 0.07, hy + 0.03, hz + 0.19]));
  // cheveux
  const hair = o.hair;
  if (hair) {
    if (o.hairStyle === 'curly') {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        parts.push(P(sph(0.085, 6, 5), hair, [Math.cos(a) * 0.15, hy + 0.13 + (i % 2) * 0.04, hz + Math.sin(a) * 0.15 - 0.02]));
      }
      parts.push(P(sph(0.1, 6, 5), hair, [0, hy + 0.2, hz]));
    } else {
      parts.push(P(hemi(0.215), hair, [0, hy + 0.02, hz - 0.01]));
      if (o.hairStyle === 'long') parts.push(P(box(0.36, 0.46, 0.1), hair, [0, hy - 0.16, hz - 0.15]));
      if (o.hairStyle === 'bun') parts.push(P(sph(0.1, 6, 5), hair, [0, hy + 0.2, hz - 0.12]));
    }
  }
  return parts;
}

const RH = (bw = 1, y0 = 0) => [0.34 * bw, y0 + 0.6, 0.16]; // main droite tenue en avant

// ---------------------------------------------------------------------- PERSONNAGES
const BUILDERS = {
  theo: () => {
    const p = humanoid({ skin: '#f2c9a0', hair: '#f3d36b', hairStyle: 'short', shirt: '#2f7d4a', pants: '#3b3f58', bulk: 1.15, belly: true });
    const [x, y, z] = RH(1.15);
    p.push(P(cyl(0.18, 0.12, 0.1, 10), '#f5f5f5', [x, y, z + 0.04]));
    p.push(P(cyl(0.16, 0.16, 0.05, 10), '#e9d36c', [x, y + 0.06, z + 0.04]));
    p.push(P(cyl(0.035, 0.035, 0.24, 6), '#b5651d', [x, y + 0.11, z + 0.04], [0, 0, Math.PI / 2]));
    return { parts: p, scale: 1.12 };
  },
  vladimir: () => {
    const p = humanoid({ skin: '#f1d2b6', shirt: '#c62828', pants: '#263238' });
    p.push(P(cyl(0.23, 0.24, 0.2, 10), '#6d4c2f', [0, 1.56, 0]));
    p.push(P(cyl(0.2, 0.23, 0.05, 10), '#8d6e4f', [0, 1.68, 0]));
    for (const sx of [-1, 1]) p.push(P(box(0.06, 0.18, 0.14), '#6d4c2f', [sx * 0.22, 1.42, 0]));
    const [x, y, z] = RH();
    p.push(P(cyl(0.065, 0.075, 0.26, 8), '#2e7d32', [x, y, z]));
    p.push(P(cyl(0.025, 0.04, 0.1, 6), '#2e7d32', [x, y + 0.18, z]));
    p.push(P(cone(0.05, 0.14, 6), '#ff8f00', [x, y + 0.3, z]));
    return { parts: p, scale: 1.0 };
  },
  nolan: () => {
    const p = humanoid({ skin: '#ecc6a2', hair: '#4e342e', hairStyle: 'short', shirt: '#212121', pants: '#3f51b5' });
    p.push(P(torus(0.23, 0.025, Math.PI), '#111111', [0, 1.38, 0]));
    for (const sx of [-1, 1]) p.push(P(box(0.08, 0.15, 0.13), '#e91e63', [sx * 0.23, 1.36, 0]));
    const [x, y, z] = RH();
    p.push(P(cyl(0.2, 0.2, 0.015, 16), '#111111', [x, y + 0.05, z + 0.05], [Math.PI / 2, 0, 0]));
    p.push(P(cyl(0.06, 0.06, 0.02, 10), '#ffeb3b', [x, y + 0.05, z + 0.055], [Math.PI / 2, 0, 0]));
    return { parts: p, scale: 1.24 };
  },
  matheo: () => {
    const p = humanoid({ skin: '#e9bf98', hair: '#3e2723', hairStyle: 'short', shirt: '#fafafa', pants: '#263238' });
    p.push(P(cyl(0.17, 0.16, 0.26, 10), '#ffffff', [0, 1.66, 0]));
    p.push(P(sph(0.21, 8, 6), '#ffffff', [0, 1.83, 0], [0, 0, 0], [1, 0.6, 1]));
    p.push(P(box(0.42, 0.5, 0.02), '#ffcc80', [0, 0.74, 0.16]));
    const [x, y, z] = RH();
    p.push(P(cyl(0.05, 0.05, 0.5, 8), '#d7a86e', [x - 0.1, y, z + 0.06], [0, 0, Math.PI / 2]));
    for (const sx of [-1, 1]) p.push(P(cyl(0.025, 0.025, 0.12, 6), '#8d6e4f', [x - 0.1 + sx * 0.3, y, z + 0.06], [0, 0, Math.PI / 2]));
    return { parts: p, scale: 1.0 };
  },
  mohammed: () => {
    const bw = 1.5;
    const p = humanoid({ skin: '#c8966a', hair: '#1b1b1b', hairStyle: 'short', shirt: '#1e293b', pants: '#3b4a6b', bulk: bw });
    p.push(P(torus(0.17, 0.025), '#f5c518', [0, 1.06, 0.12], [1.2, 0, 0]));
    p.push(P(box(0.32, 0.06, 0.03), '#111111', [0, 1.4, 0.19]));
    const [x, y, z] = RH(bw);
    p.push(P(box(0.14, 0.22, 0.1), '#9c27b0', [x, y + 0.04, z]));
    p.push(P(cyl(0.04, 0.04, 0.07, 8), '#f5c518', [x, y + 0.19, z]));
    return { parts: p, scale: 1.38 };
  },
  adam: () => {
    const lift = 0.1;
    const p = humanoid({ skin: '#c99466', hair: '#151515', hairStyle: 'short', shirt: '#0ea5e9', pants: '#334155', lift });
    p.push(P(hemi(0.215), '#ef4444', [0, 1.49, 0]));
    p.push(P(box(0.22, 0.02, 0.16), '#ef4444', [0, 1.5, 0.22]));
    p.push(P(box(0.24, 0.05, 0.95), '#424242', [0, 0.06, 0.05]));
    for (const sz of [-0.42, 0.45]) p.push(P(cyl(0.07, 0.07, 0.06, 10), '#111111', [0, 0.07, sz], [0, 0, Math.PI / 2]));
    p.push(P(cyl(0.025, 0.025, 1.0, 6), '#9e9e9e', [0, 0.56, 0.5], [-0.12, 0, 0]));
    p.push(P(cyl(0.02, 0.02, 0.5, 6), '#9e9e9e', [0, 1.05, 0.44], [0, 0, Math.PI / 2]));
    return { parts: p, scale: 1.0 };
  },
  ibrahima: () => {
    const bw = 1.1;
    const p = humanoid({ skin: '#4a2c1d', hair: '#111111', hairStyle: 'short', shirt: '#9ca3af', sleeves: '#6b7280', pants: '#4b5563', bigHands: true, bulk: bw });
    for (const sx of [-1, 1]) p.push(P(sph(0.16, 8, 6), '#6b7280', [sx * 0.34 * bw, 1.12, 0], [0, 0, 0], [1, 0.7, 1]));
    p.push(P(box(0.32, 0.32, 0.04), '#d1d5db', [0, 0.9, 0.16]));
    p.push(P(torus(0.11, 0.055), '#d32f2f', [0, 1.16, 0], [Math.PI / 2, 0, 0]));
    p.push(P(hemi(0.22), '#d32f2f', [0, 1.45, 0]));
    p.push(P(sph(0.065, 6, 5), '#ffffff', [0, 1.7, 0]));
    return { parts: p, scale: 1.3 };
  },
  yann: () => {
    const p = humanoid({ skin: '#e8c4a0', hair: '#3b2a1f', hairStyle: 'short', shirt: '#607d8b', pants: '#263238' });
    p.push(P(box(0.17, 0.045, 0.03), '#2b1d14', [0, 1.3, 0.19]));
    p.push(P(cyl(0.27, 0.27, 0.36, 14), '#b0bec5', [0, 0.3, 0.48], [0, 0, Math.PI / 2]));
    p.push(P(cyl(0.09, 0.09, 0.38, 10), '#455a64', [0, 0.3, 0.48], [0, 0, Math.PI / 2]));
    return { parts: p, scale: 1.2 };
  },
  clement: () => {
    const bw = 1.18;
    const skin = '#f0c8a0';
    const p = humanoid({ skin, hair: '#f5d76e', hairStyle: 'curly', shirt: skin, sleeves: skin, pants: '#1e3a8a', bulk: bw });
    for (const sx of [-1, 1]) {
      p.push(P(box(0.21, 0.12, 0.03), '#dcae84', [sx * 0.12, 1.0, 0.155]));
      for (const yy of [0.82, 0.7]) p.push(P(box(0.11, 0.08, 0.02), '#dcae84', [sx * 0.065, yy, 0.155]));
    }
    p.push(P(box(0.5 * bw + 0.02, 0.07, 0.32), '#3dcd58', [0, 0.58, 0]));
    const [x, y, z] = RH(bw);
    p.push(P(cyl(0.02, 0.02, 0.62, 5), '#4e342e', [x, y + 0.12, z + 0.25], [Math.PI / 2.4, 0, 0]));
    p.push(P(sph(0.08, 6, 5), '#60a5fa', [x, y + 0.32, z + 0.53]));
    return { parts: p, scale: 1.05 };
  },
  aisha: () => {
    const p = humanoid({ skin: '#5b3a26', hair: '#111111', hairStyle: 'bun', shirt: '#cbd5e1', sleeves: '#94a3b8', pants: '#64748b' });
    p.push(P(box(0.55, 0.3, 0.03), '#f1f5f9', [-0.4, 1.0, -0.2], [0, 0.4, 0.3]));
    p.push(P(box(0.55, 0.3, 0.03), '#f1f5f9', [0.4, 1.0, -0.2], [0, -0.4, -0.3]));
    const [x, y, z] = RH();
    p.push(P(cyl(0.015, 0.015, 0.35, 4), '#ffffff', [x, y + 0.15, z]));
    p.push(P(cyl(0.13, 0.13, 0.04, 12), '#ec4899', [x, y + 0.38, z], [Math.PI / 2, 0, 0]));
    p.push(P(torus(0.07, 0.016), '#ffffff', [x, y + 0.38, z + 0.025]));
    return { parts: p, scale: 0.85 };
  },
  celine: () => {
    const p = humanoid({ skin: '#a8724f', shirt: '#e0a63a', pants: '#c98a2e' });
    p.push(P(sph(0.31, 10, 8), '#1a110c', [0, 1.46, -0.06]));
    p.push(P(cyl(0.17, 0.18, 0.15, 10), '#2e4a2e', [0, 1.68, 0.02]));
    p.push(P(box(0.24, 0.02, 0.13), '#111111', [0, 1.62, 0.19]));
    const spots = [[-0.12, 1.0], [0.1, 0.92], [-0.05, 0.78], [0.14, 0.7], [-0.15, 0.64], [0.02, 1.06], [0.06, 0.6]];
    for (const [sx, sy] of spots) p.push(P(sph(0.035, 5, 4), '#3b2412', [sx, sy, 0.15], [0, 0, 0], [1, 1, 0.4]));
    const [x, , z] = RH();
    p.push(P(cyl(0.02, 0.02, 1.15, 6), '#2a1a0a', [x + 0.02, 0.56, z]));
    p.push(P(sph(0.055, 6, 5), '#f5c518', [x + 0.02, 1.15, z]));
    return { parts: p, scale: 1.0 };
  },
  emircan: () => {
    const p = humanoid({ skin: '#ddb089', hair: '#141414', hairStyle: 'short', shirt: '#e30a17', pants: '#fafafa', shoes: '#111111' });
    for (const sx of [-1, 1]) p.push(P(box(0.18, 0.16, 0.21), '#e30a17', [sx * 0.11, 0.17, 0]));
    p.push(P(box(0.2, 0.18, 0.01), '#ffffff', [0, 0.9, -0.155]));
    return { parts: p, scale: 1.0 };
  },
  pasparfait: () => {
    const p = humanoid({ skin: '#4a2d1d', shirt: '#7a1e2c', pants: '#7a1e2c', shoes: '#ffffff' });
    p.push(P(sph(0.06, 6, 4), '#7a5a48', [0.06, 1.53, 0.06]));
    p.push(P(box(0.22, 0.04, 0.02), '#ffffff', [0, 1.11, 0.155]));
    const [x, y, z] = RH();
    p.push(P(sph(0.14, 10, 8), '#fafafa', [x, y + 0.05, z + 0.04]));
    for (const [dx, dy, dz] of [[0, 0.12, 0.06], [0.1, 0.02, 0.08], [-0.08, 0.0, 0.1]]) {
      p.push(P(sph(0.045, 5, 4), '#111111', [x + dx, y + 0.05 + dy, z + 0.04 + dz]));
    }
    return { parts: p, scale: 0.88 };
  },
  alycia: () => {
    const p = humanoid({ skin: '#c69a74', hair: '#2b1a12', hairStyle: 'long', shirt: '#f97316', sleeves: '#fb923c', pants: '#1e293b', puffy: true });
    for (const yy of [0.72, 0.9, 1.06]) p.push(P(torus(0.3, 0.035), '#ea580c', [0, yy, 0], [Math.PI / 2, 0, 0], [1.05, 0.8, 1]));
    p.push(P(torus(0.17, 0.065), '#fb923c', [0, 1.18, -0.02], [Math.PI / 2, 0, 0]));
    const [x, y, z] = RH();
    p.push(P(cyl(0.012, 0.012, 0.5, 4), '#5d4037', [x, y + 0.22, z]));
    p.push(P(box(0.3, 0.2, 0.01), '#16a34a', [x + 0.15, y + 0.38, z]));
    p.push(P(box(0.14, 0.14, 0.012), '#facc15', [x + 0.15, y + 0.38, z + 0.004], [0, 0, Math.PI / 4]));
    return { parts: p, scale: 0.86 };
  },
  aminematue: () => {
    const g = '#7cc243';
    const p = humanoid({ skin: g, shirt: '#f8fafc', pants: '#f8fafc', shoes: '#111111' });
    for (const sx of [-1, 1]) {
      p.push(P(cone(0.06, 0.26, 5), g, [sx * 0.25, 1.42, 0], [0, 0, -sx * 1.2]));
      p.push(P(box(0.03, 0.5, 0.01), '#16a34a', [sx * 0.2, 0.86, 0.152]));
      p.push(P(box(0.2, 0.04, 0.29), '#f59e0b', [sx * 0.11, 0.1, 0.03]));
    }
    p.push(P(cone(0.045, 0.15, 5), '#6aa83a', [0, 1.33, 0.23], [Math.PI / 2, 0, 0]));
    p.push(P(box(0.07, 0.035, 0.01), '#16a34a', [0.12, 1.02, 0.152]));
    p.push(P(box(0.11, 0.17, 0.02), '#111111', [0.18, 0.78, 0.28], [-0.6, 0, 0]));
    p.push(P(box(0.09, 0.14, 0.006), '#38bdf8', [0.18, 0.782, 0.292], [-0.6, 0, 0]));
    return { parts: p, scale: 0.8 };
  },

  // ---------------------------------------------------------------- BÂTIMENTS
  beti: () => {
    const p = [];
    p.push(P(box(2, 0.15, 2), '#475569', [0, 0.075, 0]));
    p.push(P(box(1.6, 1.9, 1.6), '#bae6fd', [0, 1.1, 0]));
    for (const yy of [0.6, 1.05, 1.5]) p.push(P(box(1.63, 0.17, 1.63), '#0c4a6e', [0, yy, 0]));
    p.push(P(box(1.72, 0.12, 1.72), '#334155', [0, 2.1, 0]));
    p.push(P(box(0.5, 0.7, 0.03), '#0f172a', [0, 0.5, 0.81]));
    p.push(P(box(1.1, 0.36, 0.06), '#ec4899', [0, 1.78, 0.84]));
    p.push(P(cyl(0.02, 0.02, 0.55, 4), '#94a3b8', [0.55, 2.42, 0.55]));
    p.push(P(sph(0.05, 6, 5), '#f43f5e', [0.55, 2.72, 0.55]));
    return { parts: p, scale: 1 };
  },
  bureau: () => {
    const p = [];
    p.push(P(box(1.9, 0.1, 1.1), '#8d5a2b', [0, 0.78, 0]));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.push(P(box(0.08, 0.74, 0.08), '#5d3a1a', [sx * 0.85, 0.37, sz * 0.45]));
    p.push(P(box(0.5, 0.56, 1.0), '#7a4a22', [0.62, 0.45, 0]));
    p.push(P(box(0.72, 0.46, 0.05), '#111111', [-0.25, 1.17, -0.3]));
    p.push(P(box(0.64, 0.38, 0.01), '#1e88e5', [-0.25, 1.17, -0.272]));
    p.push(P(box(0.08, 0.2, 0.08), '#333333', [-0.25, 0.92, -0.32]));
    p.push(P(box(0.4, 0.12, 0.3), '#fafafa', [0.45, 0.89, 0.25]));
    p.push(P(cyl(0.06, 0.06, 0.13, 8), '#e53935', [-0.72, 0.9, 0.3]));
    p.push(P(cyl(0.1, 0.12, 0.04, 8), '#333333', [0.7, 0.85, -0.35]));
    p.push(P(cyl(0.02, 0.02, 0.5, 5), '#333333', [0.7, 1.1, -0.35]));
    p.push(P(cone(0.15, 0.22, 8), '#ff7043', [0.7, 1.38, -0.28], [Math.PI * 0.75, 0, 0]));
    return { parts: p, scale: 1 };
  },

  // -------------------------------------------------------------- PROFS (TOURS)
  gilet: () => {
    const p = humanoid({ skin: '#e9c4a2', hair: '#9e9e9e', hairStyle: 'short', shirt: '#cfd8dc', pants: '#455a64', neckForward: true });
    p.push(P(box(0.54, 0.5, 0.33), '#6d5c45', [0, 0.87, 0]));
    p.push(P(torus(0.38, 0.03, Math.PI), '#5d3a1a', [-0.36, 0.92, 0.14], [0, -Math.PI / 2, -Math.PI / 2]));
    p.push(P(cyl(0.006, 0.006, 0.76, 4), '#eeeeee', [-0.36, 0.92, 0.14]));
    p.push(P(cyl(0.014, 0.014, 0.13, 4), '#fafafa', [0.04, 1.3, 0.4], [Math.PI / 2, 0, 0]));
    p.push(P(sph(0.02, 4, 3), '#ff5722', [0.04, 1.3, 0.47]));
    return { parts: p, scale: 1.05 };
  },
  breuer: () => {
    const p = humanoid({ skin: '#eec39a', hair: '#5d4037', hairStyle: 'short', shirt: '#1e40af', pants: '#1f2937', belly: true, bulk: 1.35 });
    p.push(P(box(0.08, 0.3, 0.02), '#dc2626', [0, 0.98, 0.41]));
    p.push(P(cyl(0.2, 0.21, 0.13, 10), '#facc15', [0, 1.62, 0]));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
      p.push(P(cone(0.05, 0.13, 4), '#facc15', [Math.cos(a) * 0.19, 1.75, Math.sin(a) * 0.19]));
    }
    p.push(P(sph(0.04, 5, 4), '#e11d48', [0, 1.63, 0.21]));
    p.push(P(cyl(0.12, 0.15, 0.85, 10), '#f8fafc', [0.62, 0.75, 0.25], [Math.PI / 2, 0, 0]));
    for (const sx of [-1, 1]) p.push(P(cyl(0.15, 0.15, 0.06, 10), '#6d4c41', [0.62 + sx * 0.17, 0.6, 0.12], [0, 0, Math.PI / 2]));
    return { parts: p, scale: 1.4 };
  },
};

// Hauteur (au-dessus des pieds) pour placer barre de vie et effets
export const UNIT_HEIGHT = {
  theo: 1.9, vladimir: 1.8, nolan: 2.2, matheo: 2.0, mohammed: 2.4, adam: 1.8, ibrahima: 2.4,
  yann: 2.0, clement: 1.9, aisha: 1.5, celine: 1.8, emircan: 1.7, pasparfait: 1.5, alycia: 1.5,
  aminematue: 1.4, beti: 2.9, bureau: 1.7,
};

const geoCache = new Map();
export function getModelGeometry(code) {
  if (geoCache.has(code)) return geoCache.get(code);
  const build = BUILDERS[code] || BUILDERS.emircan;
  const { parts, scale } = build();
  const geo = mergeParts(parts);
  geo.scale(scale, scale, scale);
  geo.computeBoundingSphere();
  geoCache.set(code, geo);
  return geo;
}

// --------------------------------------------------------------- SOCLES DES TOURS
const towerCache = new Map();
export function getTowerBaseGeometry(type) {
  const key = `base-${type}`;
  if (towerCache.has(key)) return towerCache.get(key);
  const p = [];
  if (type === 'king') {
    p.push(P(box(3.7, 2.1, 3.7), '#7a6957', [0, 1.05, 0]));
    p.push(P(box(4.1, 0.25, 4.1), '#4e4134', [0, 2.22, 0]));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.push(P(box(0.6, 2.6, 0.6), '#6b5a49', [sx * 1.75, 1.3, sz * 1.75]));
    p.push(P(box(1.9, 1.0, 0.06), '#24452f', [0, 1.15, 1.87]));
    p.push(P(box(1.9, 0.06, 0.15), '#8d6e4f', [0, 0.62, 1.9]));
    p.push(P(box(2.2, 0.2, 0.5), '#5d4e40', [0, 0.1, 2.05]));
  } else {
    p.push(P(box(2.8, 1.7, 2.8), '#8d7b68', [0, 0.85, 0]));
    p.push(P(box(3.1, 0.22, 3.1), '#5d4e40', [0, 1.8, 0]));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.push(P(box(0.5, 0.45, 0.5), '#7a6a58', [sx * 1.3, 2.13, sz * 1.3]));
    p.push(P(box(1.3, 0.8, 0.06), '#24452f', [0, 0.95, 1.42]));
    p.push(P(box(1.3, 0.05, 0.12), '#8d6e4f', [0, 0.53, 1.45]));
  }
  const geo = mergeParts(p);
  towerCache.set(key, geo);
  return geo;
}

export function getRubbleGeometry(type) {
  const key = `rubble-${type}`;
  if (towerCache.has(key)) return towerCache.get(key);
  const s = type === 'king' ? 1.3 : 1;
  const p = [
    P(box(2.6 * s, 0.5, 2.6 * s), '#5b5150', [0, 0.25, 0]),
    P(box(0.9 * s, 0.5, 0.7 * s), '#6e6463', [0.6 * s, 0.6, 0.3 * s], [0.3, 0.5, 0.2]),
    P(box(0.7 * s, 0.4, 0.9 * s), '#4b4241', [-0.7 * s, 0.55, -0.4 * s], [-0.2, 0.9, 0.1]),
    P(box(0.5 * s, 0.35, 0.5 * s), '#7a706f', [-0.3 * s, 0.6, 0.8 * s], [0.4, 0.2, 0.5]),
    P(box(0.4 * s, 1.0, 0.4 * s), '#5b5150', [1.0 * s, 0.7, -0.9 * s], [0.25, 0, 0.3]),
  ];
  const geo = mergeParts(p);
  towerCache.set(key, geo);
  return geo;
}

// ------------------------------------------------- DÉCOR : TABLES RENVERSÉES + PONTS
export function riverSegments(layout) {
  const segs = [];
  let x = 0;
  for (const b of [...layout.bridges].sort((a, c) => a.xMin - c.xMin)) {
    if (b.xMin > x) segs.push([x, b.xMin]);
    x = b.xMax;
  }
  if (x < layout.width) segs.push([x, layout.width]);
  return segs;
}

const decorCache = new Map();
export function getArenaDecorGeometry(layout) {
  if (decorCache.has(layout.id)) return decorCache.get(layout.id);
  const W = layout.width;
  const L = layout.length;
  const toX = (x) => x - W / 2;
  const toZ = (y) => L / 2 - y;
  const p = [];
  // Tables renversées le long des deux berges, pieds plongés vers l'huile
  for (const [a, b] of riverSegments(layout)) {
    const len = b - a;
    const n = Math.max(1, Math.round(len / 2));
    const tw = len / n;
    for (let i = 0; i < n; i++) {
      const cx = toX(a + tw * (i + 0.5));
      for (const side of [0, 1]) {
        const y = side === 0 ? layout.riverMin + 0.12 : layout.riverMax - 0.12;
        const z = toZ(y);
        const dirZ = side === 0 ? -1 : 1;
        const tilt = i % 2 ? 0.1 : -0.07;
        p.push(P(box(tw - 0.15, 0.85, 0.08), '#d8c49b', [cx, 0.43, z], [tilt * dirZ, 0, 0]));
        p.push(P(box(tw - 0.15, 0.06, 0.11), '#7a5c3a', [cx, 0.86, z]));
        for (const sx of [-1, 1]) {
          for (const hy of [0.18, 0.7]) {
            p.push(P(cyl(0.035, 0.035, 0.62, 5), '#5f6b7a', [cx + sx * (tw / 2 - 0.3), hy, z + dirZ * 0.33], [Math.PI / 2, 0, 0]));
          }
        }
      }
    }
  }
  // Ponts en planches avec rambardes
  const zc = toZ((layout.riverMin + layout.riverMax) / 2);
  const depth = layout.riverMax - layout.riverMin + 0.8;
  for (const b of layout.bridges) {
    const cx = toX((b.xMin + b.xMax) / 2);
    const w = b.xMax - b.xMin;
    p.push(P(box(w, 0.12, depth), '#9a6b3c', [cx, 0.06, zc]));
    for (const sx of [-1, 1]) {
      p.push(P(box(0.12, 0.38, depth), '#6e4826', [cx + sx * (w / 2 - 0.06), 0.27, zc]));
      for (const sz of [-1, 0, 1]) p.push(P(box(0.16, 0.5, 0.16), '#5a3a1f', [cx + sx * (w / 2 - 0.06), 0.3, zc + sz * (depth / 2 - 0.1)]));
    }
  }
  const geo = mergeParts(p);
  decorCache.set(layout.id, geo);
  return geo;
}

// ------------------------------------------------------------------ PROJECTILES
const projCache = new Map();
const PROJECTILES = {
  cigarette: () => [
    P(cyl(0.04, 0.04, 0.42, 6), '#fafafa', [0, 0, 0.02], [Math.PI / 2, 0, 0]),
    P(cyl(0.042, 0.042, 0.13, 6), '#e0a96d', [0, 0, -0.24], [Math.PI / 2, 0, 0]),
    P(sph(0.05, 5, 4), '#ff5722', [0, 0, 0.24]),
  ],
  craie: () => [P(box(0.16, 0.16, 0.5), '#ffffff'), P(box(0.17, 0.17, 0.1), '#90caf9', [0, 0, -0.22])],
  choucroute: () => [P(sph(0.22, 7, 5), '#e8d36c'), P(cyl(0.055, 0.055, 0.34, 6), '#a0522d', [0, 0.12, 0], [0, 0, Math.PI / 2])],
  molotov: () => [
    P(cyl(0.08, 0.09, 0.3, 8), '#2e7d32', [0, 0, 0], [Math.PI / 2, 0, 0]),
    P(cone(0.08, 0.2, 6), '#ff9800', [0, 0, 0.25], [Math.PI / 2, 0, 0]),
  ],
  vinyle: () => [P(cyl(0.26, 0.26, 0.03, 16), '#111111'), P(cyl(0.08, 0.08, 0.035, 10), '#ffeb3b')],
  sucette: () => [
    P(cyl(0.17, 0.17, 0.05, 12), '#ec4899', [0, 0, 0], [Math.PI / 2, 0, 0]),
    P(cyl(0.015, 0.015, 0.3, 4), '#ffffff', [0, -0.22, 0]),
  ],
  ballon: () => [
    P(sph(0.2, 10, 8), '#fafafa'),
    P(sph(0.06, 5, 4), '#111111', [0, 0.16, 0.08]),
    P(sph(0.06, 5, 4), '#111111', [0.14, -0.04, 0.1]),
    P(sph(0.06, 5, 4), '#111111', [-0.13, -0.06, 0.1]),
  ],
  bobine: () => [
    P(cyl(0.32, 0.32, 0.42, 14), '#b0bec5', [0, 0, 0], [0, 0, Math.PI / 2]),
    P(cyl(0.11, 0.11, 0.44, 10), '#455a64', [0, 0, 0], [0, 0, Math.PI / 2]),
  ],
};

export function getProjectileGeometry(kind) {
  if (projCache.has(kind)) return projCache.get(kind);
  const build = PROJECTILES[kind] || PROJECTILES.ballon;
  const geo = mergeParts(build());
  projCache.set(kind, geo);
  return geo;
}

// ------------------------------------------------------------------ MATÉRIAUX
export const vertexMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
export const ghostMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.45, depthWrite: false });
export const flashMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff' });

export const TEAM_COLORS = {
  me: '#3d8bff',
  mate: '#58d0ff',
  enemy: '#ff4b55',
};
