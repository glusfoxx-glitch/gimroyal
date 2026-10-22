'use client';
// =============================================================================
// Effets visuels : zones persistantes (Poliakov, Brioche Dorée, Pet fumant) et pool
// d'effets ponctuels (ondes de choc, éclairs, textes "BASS DROP !", insultes en
// brésilien, conversion BéTI...). Pool fixe : zéro allocation en combat.
// =============================================================================
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '@/lib/store';
import { registry } from '@/lib/registry';
import { arenaToWorld } from '@/lib/coords';
import { getLabelTexture } from './textures';

const INSULTS = ['Porra !', 'Caralho !', 'Vai se ferrar !', 'Seu otário !', 'Que merda !', 'Filho da mãe !', 'Vai catar coquinho !'];
const ZONE_STYLE = {
  poliakov: { color: '#d946ef', icon: '🍸' },
  brioche: { color: '#f59e0b', icon: '🥐' },
  petfumant: { color: '#84cc16', icon: '💨' },
};
const SPLASH_COLORS = { molotov: '#ff7a1a', craie: '#ffffff', huile: '#a16207' };

// ------------------------------------------------------------------ ZONES
const discGeo = new THREE.CircleGeometry(1, 40);
const edgeGeo = new THREE.RingGeometry(0.93, 1, 48);
const puffGeo = new THREE.IcosahedronGeometry(1, 0);

function Zone({ id, layout }) {
  const z = registry.zones.get(id);
  const groupRef = useRef();
  const discRef = useRef();
  const puffRef = useRef();
  const style = ZONE_STYLE[z?.kind] || ZONE_STYLE.poliakov;
  const mats = useMemo(
    () => ({
      disc: new THREE.MeshBasicMaterial({ color: style.color, transparent: true, opacity: 0.22, depthWrite: false }),
      edge: new THREE.MeshBasicMaterial({ color: style.color, transparent: true, opacity: 0.85, depthWrite: false }),
      puff: new THREE.MeshLambertMaterial({ color: style.color, transparent: true, opacity: 0.45, depthWrite: false }),
    }),
    [style.color],
  );
  const icon = useMemo(() => getLabelTexture(style.icon, { size: 64 }), [style.icon]);
  const puffs = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const r = 0.35 + ((i * 37) % 10) / 16;
      arr.push([Math.cos(a) * r, 0.5 + (i % 3) * 0.35, Math.sin(a) * r, 0.45 + (i % 4) * 0.12]);
    }
    return arr;
  }, []);

  useFrame((state) => {
    const zz = registry.zones.get(id);
    if (!zz || !groupRef.current) return;
    const t = state.clock.elapsedTime;
    mats.disc.opacity = 0.16 + Math.sin(t * 5) * 0.06;
    if (puffRef.current) {
      puffRef.current.rotation.y = t * 0.6;
      puffRef.current.position.y = Math.sin(t * 2) * 0.1;
    }
    if (discRef.current) discRef.current.rotation.z = t * 0.5;
  });

  if (!z) return null;
  const [X, Z] = arenaToWorld(layout, z.x, z.y);
  const r = z.radius;
  return (
    <group ref={groupRef} position={[X, 0, Z]}>
      <mesh geometry={discGeo} material={mats.disc} rotation-x={-Math.PI / 2} position-y={0.05} scale={r} />
      <mesh ref={discRef} geometry={edgeGeo} material={mats.edge} rotation-x={-Math.PI / 2} position-y={0.06} scale={r} />
      {z.kind === 'petfumant' && (
        <group ref={puffRef} scale={r / 2}>
          {puffs.map(([x, y, zz, s], i) => (
            <mesh key={i} geometry={puffGeo} material={mats.puff} position={[x * 2, y, zz * 2]} scale={s} />
          ))}
        </group>
      )}
      <sprite position={[0, 1.3, 0]} scale={[1.1, 1.1, 1]}>
        <spriteMaterial map={icon.tex} transparent depthWrite={false} />
      </sprite>
    </group>
  );
}

// ------------------------------------------------------------------ FX PONCTUELS
const POOL = 48;
const fxRingGeo = new THREE.RingGeometry(0.82, 1, 40);
const fxLineGeo = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true);
fxLineGeo.rotateX(Math.PI / 2);
const fxPuffGeo = new THREE.IcosahedronGeometry(1, 0);

function makeSlot(parent) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(fxRingGeo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  const line = new THREE.Mesh(fxLineGeo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: getLabelTexture('·').tex, transparent: true, depthWrite: false, depthTest: false }));
  sprite.renderOrder = 20;
  const puffs = [];
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(fxPuffGeo, new THREE.MeshLambertMaterial({ transparent: true, depthWrite: false }));
    puffs.push(p);
    g.add(p);
  }
  g.add(ring, line, sprite);
  for (const o of [ring, line, sprite]) o.frustumCulled = false;
  g.visible = false;
  parent.add(g);
  return { g, ring, line, sprite, puffs, active: false, t0: 0, dur: 1, spec: null };
}

function textSpec(text, color, size = 0.75) {
  const lab = getLabelTexture(text, { color, size: 56 });
  return { tex: lab.tex, aspect: lab.aspect, size };
}

function specFor(f, layout) {
  const [kind, x, y, a, b] = f;
  const [X, Z] = arenaToWorld(layout, x, y);
  const base = { X, Z, ring: null, line: null, text: null, puffs: null, dur: 0.6 };
  switch (kind) {
    case 'splash':
      return { ...base, ring: { color: SPLASH_COLORS[b] || '#ffd166', r: a || 1 }, puffs: { color: SPLASH_COLORS[b] || '#ffb347', n: 4, spread: a || 1 }, dur: 0.5 };
    case 'impact':
      return { ...base, ring: { color: '#ffffff', r: 0.5 }, dur: 0.25 };
    case 'jump':
      return { ...base, ring: { color: '#e5e7eb', r: a || 2 }, puffs: { color: '#cbd5e1', n: 6, spread: a || 2 }, text: textSpec('SUPER SAUT !', '#fde68a'), dur: 0.8 };
    case 'slap':
      return { ...base, ring: { color: '#fca5a5', r: a || 1.2 }, text: textSpec('BAFFE !', '#fecaca', 0.55), dur: 0.5 };
    case 'bassdrop':
      return { ...base, ring: { color: '#a855f7', r: a || 2.5 }, text: textSpec('BASS DROP !', '#e9d5ff'), dur: 0.8 };
    case 'brioche':
      return { ...base, ring: { color: '#fbbf24', r: a || 3 }, text: textSpec('🥐 Brioches !', '#fef3c7', 0.55), dur: 0.7 };
    case 'zap': {
      const [X2, Z2] = arenaToWorld(layout, a, b);
      return { ...base, line: { color: '#60a5fa', X2, Z2, y: 1.0, thick: 0.07 }, text: textSpec('⚡', '#bfdbfe', 0.6), tX: X2, tZ: Z2, dur: 0.3 };
    }
    case 'bt': {
      const [X2, Z2] = arenaToWorld(layout, a, b);
      return { ...base, line: { color: '#38bdf8', X2, Z2, y: 0.8, thick: 0.03 }, text: textSpec('📶 ChatGPT', '#bae6fd', 0.45), dur: 0.4 };
    }
    case 'insult':
      return { ...base, text: textSpec(INSULTS[Math.floor(Math.random() * INSULTS.length)], '#86efac', 0.6), dur: 0.9 };
    case 'charge':
      return { ...base, ring: { color: '#f97316', r: 1 }, text: textSpec('TABOUZI TROTTINETTE !', '#fed7aa', 0.6), dur: 0.9 };
    case 'poliakovspeed':
      return { ...base, text: textSpec('POLIAKOV SPEED !', '#f0abfc', 0.65), dur: 1.0 };
    case 'wake':
      return { ...base, ring: { color: '#facc15', r: 3 }, text: textSpec('BREUER SE RÉVEILLE !', '#fde047', 1.0), textY: 7.5, dur: 1.6 };
    case 'tower':
      return { ...base, ring: { color: '#f87171', r: 3.5 }, puffs: { color: '#9ca3af', n: 6, spread: 2.5 }, text: textSpec('TOUR DÉTRUITE !', '#fecaca', 1.0), textY: 5, dur: 1.4 };
    case 'death':
      return { ...base, puffs: { color: '#d1d5db', n: 4, spread: 0.6 }, dur: 0.5 };
    case 'destroy':
      return { ...base, ring: { color: '#d1d5db', r: 1.6 }, puffs: { color: '#9ca3af', n: 6, spread: 1.2 }, dur: 0.7 };
    case 'petfumant':
      return { ...base, text: textSpec('💨 PET FUMANT !', '#d9f99d', 0.75), dur: 1.2 };
    case 'convert':
      return { ...base, ring: { color: '#ec4899', r: 1.2 }, text: textSpec('CONVERTIE !', '#fbcfe8', 0.6), dur: 1.0 };
    case 'synergy':
      return { ...base, ring: { color: '#facc15', r: 2 }, text: textSpec('SYNERGIE !', '#fef08a', 0.8), dur: 1.2 };
    case 'dodo':
      return { ...base, text: textSpec('💤 DODO STRATÉGIQUE', '#bae6fd', 0.6), dur: 1.2 };
    case 'spell':
      return { ...base, ring: { color: a === 'poliakov' ? '#d946ef' : '#f59e0b', r: b || 3 }, dur: 0.5 };
    default:
      return null;
  }
}

function FxPool({ layout }) {
  const groupRef = useRef();
  const slots = useRef([]);

  useLayoutEffect(() => {
    const g = groupRef.current;
    const list = [];
    for (let i = 0; i < POOL; i++) list.push(makeSlot(g));
    slots.current = list;
    registry.fx.length = 0;
    return () => {
      for (const s of list) {
        g.remove(s.g);
        s.ring.material.dispose();
        s.line.material.dispose();
        s.sprite.material.dispose();
        s.puffs.forEach((p) => p.material.dispose());
      }
      slots.current = [];
    };
  }, []);

  useFrame(() => {
    const now = performance.now();
    const list = slots.current;
    // 1) nouveaux effets reçus du serveur
    while (registry.fx.length) {
      const { f } = registry.fx.shift();
      const spec = specFor(f, layout);
      if (!spec) continue;
      let slot = list.find((s) => !s.active);
      if (!slot) slot = list.reduce((a, b) => (a.t0 < b.t0 ? a : b));
      slot.active = true;
      slot.t0 = now;
      slot.dur = spec.dur * 1000;
      slot.spec = spec;
      slot.g.visible = true;
      slot.g.position.set(spec.X, 0, spec.Z);
      slot.ring.visible = !!spec.ring;
      if (spec.ring) slot.ring.material.color.set(spec.ring.color);
      slot.line.visible = !!spec.line;
      if (spec.line) {
        const { X2, Z2, y, thick, color } = spec.line;
        const dx = X2 - spec.X;
        const dz = Z2 - spec.Z;
        const len = Math.hypot(dx, dz) || 0.01;
        slot.line.position.set(dx / 2, y, dz / 2);
        slot.line.lookAt(slot.g.position.x + dx, y, slot.g.position.z + dz);
        slot.line.scale.set(thick, thick, len);
        slot.line.material.color.set(color);
      }
      slot.sprite.visible = !!spec.text;
      if (spec.text) {
        slot.sprite.material.map = spec.text.tex;
        slot.sprite.scale.set(spec.text.size * spec.text.aspect, spec.text.size, 1);
      }
      slot.puffs.forEach((p, i) => {
        const on = !!spec.puffs && i < spec.puffs.n;
        p.visible = on;
        if (on) {
          p.material.color.set(spec.puffs.color);
          const a = (i / spec.puffs.n) * Math.PI * 2 + Math.random() * 0.5;
          p.userData.dx = Math.cos(a) * spec.puffs.spread * 0.6;
          p.userData.dz = Math.sin(a) * spec.puffs.spread * 0.6;
        }
      });
    }
    // 2) animation des effets actifs
    for (const s of list) {
      if (!s.active) continue;
      const p = (now - s.t0) / s.dur;
      if (p >= 1) {
        s.active = false;
        s.g.visible = false;
        continue;
      }
      const spec = s.spec;
      const fade = 1 - p;
      if (spec.ring) {
        const r = spec.ring.r * (0.3 + 0.7 * Math.sqrt(p));
        s.ring.scale.set(r, r, 1);
        s.ring.position.y = 0.08;
        s.ring.material.opacity = fade * 0.9;
      }
      if (spec.line) s.line.material.opacity = fade;
      if (spec.text) {
        const baseY = spec.textY ?? 2.6;
        s.sprite.position.set(spec.tX !== undefined ? spec.tX - spec.X : 0, baseY + p * 1.2, spec.tZ !== undefined ? spec.tZ - spec.Z : 0);
        s.sprite.material.opacity = p < 0.7 ? 1 : (1 - p) / 0.3;
      }
      if (spec.puffs) {
        for (const pf of s.puffs) {
          if (!pf.visible) continue;
          const sc = 0.25 + p * 0.45;
          pf.scale.setScalar(sc);
          pf.position.set(pf.userData.dx * (0.4 + p), 0.3 + p * 0.9, pf.userData.dz * (0.4 + p));
          pf.material.opacity = fade * 0.8;
        }
      }
    }
  });

  return <group ref={groupRef} />;
}

export default function Effects({ layout }) {
  const zoneKey = useGame((s) => s.zoneKey);
  const ids = useMemo(() => (zoneKey ? zoneKey.split(',').map(Number) : []), [zoneKey]);
  return (
    <group>
      {ids.map((id) => (
        <Zone key={id} id={id} layout={layout} />
      ))}
      <FxPool layout={layout} />
    </group>
  );
}
