'use client';
// =============================================================================
// Rendu des troupes et bâtiments. React ne re-rend la liste qu'à l'apparition ou à la
// disparition d'une unité ; positions, animations et barres de vie sont mises à jour
// impérativement dans une seule boucle useFrame (interpolation des snapshots 10 Hz).
// Barres de vie et ombres : 3 InstancedMesh = 3 draw calls pour toutes les unités.
// =============================================================================
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CARDS } from '@shared/cards.js';
import { FLAGS } from '@shared/constants.js';
import { useGame } from '@/lib/store';
import { registry } from '@/lib/registry';
import { arenaToWorld, facingToRotY, lerpAngle } from '@/lib/coords';
import { getModelGeometry, UNIT_HEIGHT, vertexMaterial, ghostMaterial, flashMaterial, TEAM_COLORS } from './models';
import { getBlobTexture, getLabelTexture } from './textures';

const MAX_BARS = 160;
const MAX_BEAMS = 8;
const unitRefs = new Map();

const ringGeo = new THREE.RingGeometry(0.78, 1, 28);
const mkRingMat = (color) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false });
const ringMats = { me: mkRingMat(TEAM_COLORS.me), mate: mkRingMat(TEAM_COLORS.mate), enemy: mkRingMat(TEAM_COLORS.enemy) };
const auraGeo = new THREE.CircleGeometry(1, 36);
const auraMat = new THREE.MeshBasicMaterial({ color: '#c084fc', transparent: true, opacity: 0.16, depthWrite: false });
const shieldGeo = new THREE.SphereGeometry(1, 16, 12);
const shieldMat = new THREE.MeshBasicMaterial({ color: '#7dd3fc', transparent: true, opacity: 0.3, depthWrite: false });
const starGeo = new THREE.OctahedronGeometry(0.11);
const starMat = new THREE.MeshBasicMaterial({ color: '#fde047' });
const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
beamGeo.rotateX(Math.PI / 2);
const beamMats = ['#fde047', '#fb923c', '#ef4444'].map(
  (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }),
);
const BUREAU_LAMP = new THREE.Vector3(0.7, 1.38, -0.28);

function Unit({ id }) {
  const u = registry.units.get(id);
  const code = u?.code;
  const card = CARDS[code];
  const radius = card?.stats.radius ?? 0.5;
  const isBuilding = card?.type === 'building';
  const groupRef = useRef();
  const bodyRef = useRef();
  const ringRef = useRef();
  const shieldRef = useRef();
  const starsRef = useRef();
  const label = useMemo(() => {
    if (code === 'beti') return getLabelTexture('BéTI', { color: '#ffffff', stroke: '#9d174d', size: 44 });
    if (code === 'bureau') return getLabelTexture('M. BREUER', { color: '#fef3c7', stroke: '#422006', size: 36 });
    return null;
  }, [code]);

  useLayoutEffect(() => {
    unitRefs.set(id, {
      group: groupRef.current,
      body: bodyRef.current,
      ring: ringRef.current,
      shield: shieldRef.current,
      stars: starsRef.current,
      radius,
      isBuilding,
    });
    return () => unitRefs.delete(id);
  }, [id, radius, isBuilding]);

  if (!u) return null;
  return (
    <group ref={groupRef}>
      <mesh ref={ringRef} geometry={ringGeo} material={ringMats.enemy} rotation-x={-Math.PI / 2} position-y={0.04} scale={isBuilding ? 1.3 : radius + 0.12} />
      {code === 'mohammed' && (
        <mesh geometry={auraGeo} material={auraMat} rotation-x={-Math.PI / 2} position-y={0.03} scale={card.stats.auraRadius} />
      )}
      <mesh ref={bodyRef} geometry={getModelGeometry(code)} material={vertexMaterial}>
        {label && code === 'beti' && (
          <mesh position={[0, 1.78, 0.875]}>
            <planeGeometry args={[1.0, 1.0 / label.aspect]} />
            <meshBasicMaterial map={label.tex} transparent depthWrite={false} />
          </mesh>
        )}
        {label && code === 'bureau' && (
          <mesh position={[-0.2, 0.6, 0.57]}>
            <planeGeometry args={[0.9, 0.9 / label.aspect]} />
            <meshBasicMaterial map={label.tex} transparent depthWrite={false} />
          </mesh>
        )}
      </mesh>
      {code === 'celine' && <mesh ref={shieldRef} geometry={shieldGeo} material={shieldMat} position-y={0.85} scale={0.95} visible={false} />}
      <group ref={starsRef} visible={false}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} geometry={starGeo} material={starMat} position={[Math.cos((i / 3) * Math.PI * 2) * 0.35, 0, Math.sin((i / 3) * Math.PI * 2) * 0.35]} />
        ))}
      </group>
    </group>
  );
}

export default function Units({ layout, myTeam }) {
  const unitKey = useGame((s) => s.unitKey);
  const myIndex = useGame((s) => s.match?.index ?? -1);
  const ids = useMemo(() => (unitKey ? unitKey.split(',').map(Number) : []), [unitKey]);
  const camera = useThree((s) => s.camera);

  const bgRef = useRef();
  const fillRef = useRef();
  const blobRef = useRef();
  const beamsRef = useRef([]);
  const tmp = useMemo(
    () => ({
      dummy: new THREE.Object3D(),
      color: new THREE.Color(),
      right: new THREE.Vector3(),
      toCam: new THREE.Vector3(),
      flat: new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)),
      a: new THREE.Vector3(),
      b: new THREE.Vector3(),
      colors: { me: new THREE.Color(TEAM_COLORS.me), mate: new THREE.Color(TEAM_COLORS.mate), enemy: new THREE.Color(TEAM_COLORS.enemy) },
    }),
    [],
  );
  const blobMat = useMemo(() => new THREE.MeshBasicMaterial({ map: getBlobTexture(), transparent: true, depthWrite: false }), []);

  useLayoutEffect(() => {
    // couleurs d'instance initialisées avant le premier rendu (sinon le shader ne les prend pas)
    for (let i = 0; i < MAX_BARS; i++) fillRef.current.setColorAt(i, tmp.colors.me);
    fillRef.current.instanceColor.needsUpdate = true;
    bgRef.current.count = 0;
    fillRef.current.count = 0;
    blobRef.current.count = 0;
  }, [tmp]);

  useFrame((state, dt) => {
    const k = 1 - Math.exp(-14 * dt);
    const ka = 1 - Math.exp(-10 * dt);
    const t = state.clock.elapsedTime;
    const now = performance.now();
    const { dummy, right, toCam, flat, colors } = tmp;
    right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    let bars = 0;
    let blobs = 0;
    let beams = 0;

    for (const [id, r] of unitRefs) {
      const u = registry.units.get(id);
      if (!u || !r.group || !r.body) continue;
      const px = u.rx;
      const py = u.ry;
      u.rx += (u.x - u.rx) * k;
      u.ry += (u.y - u.ry) * k;
      u.rz += (u.z - u.rz) * k;
      u.ra = lerpAngle(u.ra, u.angle, ka);
      const moved = Math.hypot(u.rx - px, u.ry - py);
      if (u.seq !== u.lastSeq) {
        u.lastSeq = u.seq;
        u.lunge = 1;
      }
      u.lunge = Math.max(0, u.lunge - dt * 4);
      u.flash = Math.max(0, u.flash - dt * 7);

      const f = u.flags;
      const air = (f & FLAGS.AIR) !== 0;
      const deploying = (f & FLAGS.DEPLOYING) !== 0;
      const stealth = (f & FLAGS.STEALTH) !== 0;
      const [X, Z] = arenaToWorld(layout, u.rx, u.ry);
      r.group.position.set(X, 0, Z);

      if (moved > 0.0005) u.bob += moved * 9;
      const bobY = moved > 0.0005 && !r.isBuilding ? Math.abs(Math.sin(u.bob)) * 0.1 : 0;
      const hover = air ? 1.9 + Math.sin(t * 3 + id) * 0.12 : 0;
      const lunge = r.isBuilding ? 0 : Math.sin(u.lunge * Math.PI) * 0.22;
      const rotY = r.isBuilding ? (u.team === 0 ? 0 : Math.PI) : facingToRotY(u.ra);
      const body = r.body;
      body.rotation.y = rotY;
      body.position.set(Math.sin(rotY) * lunge, u.rz + hover + bobY, Math.cos(rotY) * lunge);
      const grow = deploying ? 0.55 + 0.45 * Math.min(1, (now - u.born) / 1000) : 1;
      const squash = 1 - Math.sin(u.lunge * Math.PI) * 0.06;
      body.scale.set(grow, grow * squash, grow);
      body.material = u.flash > 0.55 ? flashMaterial : stealth || deploying ? ghostMaterial : vertexMaterial;

      const side = u.team !== myTeam ? 'enemy' : u.owner === myIndex ? 'me' : 'mate';
      r.ring.material = ringMats[side];
      const height = (UNIT_HEIGHT[u.code] ?? 1.8) + hover + u.rz;
      if (r.shield) r.shield.visible = (f & FLAGS.SHIELD) !== 0;
      if (r.stars) {
        const stunned = (f & FLAGS.STUN) !== 0;
        r.stars.visible = stunned;
        if (stunned) {
          r.stars.rotation.y = t * 5;
          r.stars.position.y = height + 0.15;
        }
      }

      // Ombre douce
      if (blobs < MAX_BARS) {
        const s = (r.isBuilding ? 2.6 : r.radius * 2.6) * (air ? 0.7 : 1);
        dummy.position.set(X, 0.025, Z);
        dummy.quaternion.copy(flat);
        dummy.scale.set(s, s, 1);
        dummy.updateMatrix();
        blobRef.current.setMatrixAt(blobs++, dummy.matrix);
      }

      // Barre de vie (affichée si blessé, toujours pour les bâtiments qui s'usent)
      if (bars < MAX_BARS && (u.hp < u.maxHp || r.isBuilding)) {
        const w = r.isBuilding ? 1.7 : 0.9 + r.radius * 0.7;
        const h = 0.17;
        const ratio = Math.max(0, Math.min(1, u.hp / u.maxHp));
        const y = height + 0.35;
        toCam.copy(camera.position).sub(dummy.position.set(X, y, Z)).normalize().multiplyScalar(0.02);
        dummy.quaternion.copy(camera.quaternion);
        dummy.scale.set(w + 0.09, h + 0.09, 1);
        dummy.updateMatrix();
        bgRef.current.setMatrixAt(bars, dummy.matrix);
        dummy.position.set(X, y, Z).addScaledVector(right, -((1 - ratio) * w) / 2).add(toCam);
        dummy.scale.set(Math.max(0.001, w * ratio), h, 1);
        dummy.updateMatrix();
        fillRef.current.setMatrixAt(bars, dummy.matrix);
        fillRef.current.setColorAt(bars, colors[side]);
        bars++;
      }

      // Rayon de la Tour de l'Enfer (Bureau de Breuer)
      if (u.code === 'bureau' && u.tg && beams < MAX_BEAMS) {
        const target = registry.units.get(u.tg);
        const beam = beamsRef.current[beams];
        if (target && beam) {
          tmp.a.copy(BUREAU_LAMP).applyAxisAngle(THREE.Object3D.DEFAULT_UP, rotY).add(r.group.position);
          const [tx, tz] = arenaToWorld(layout, target.rx, target.ry);
          const ty = ((target.flags & FLAGS.AIR) !== 0 ? 1.9 : 0) + 0.8;
          tmp.b.set(tx, ty, tz);
          const len = tmp.a.distanceTo(tmp.b);
          const stage = Math.max(0, Math.min(2, u.aux | 0));
          beam.position.copy(tmp.a).lerp(tmp.b, 0.5);
          beam.lookAt(tmp.b);
          const thick = 0.05 + stage * 0.04 + Math.sin(t * 30) * 0.01;
          beam.scale.set(thick, thick, len);
          beam.material = beamMats[stage];
          beam.visible = true;
          beams++;
        }
      }
    }

    bgRef.current.count = bars;
    fillRef.current.count = bars;
    blobRef.current.count = blobs;
    bgRef.current.instanceMatrix.needsUpdate = true;
    fillRef.current.instanceMatrix.needsUpdate = true;
    if (fillRef.current.instanceColor) fillRef.current.instanceColor.needsUpdate = true;
    blobRef.current.instanceMatrix.needsUpdate = true;
    for (let i = beams; i < MAX_BEAMS; i++) if (beamsRef.current[i]) beamsRef.current[i].visible = false;
  });

  return (
    <group>
      <instancedMesh ref={blobRef} args={[undefined, undefined, MAX_BARS]} frustumCulled={false} material={blobMat} renderOrder={1}>
        <planeGeometry args={[1, 1]} />
      </instancedMesh>
      {ids.map((id) => (
        <Unit key={id} id={id} />
      ))}
      {Array.from({ length: MAX_BEAMS }, (_, i) => (
        <mesh
          key={`beam-${i}`}
          ref={(m) => {
            beamsRef.current[i] = m;
          }}
          geometry={beamGeo}
          material={beamMats[0]}
          visible={false}
          frustumCulled={false}
        />
      ))}
      <instancedMesh ref={bgRef} args={[undefined, undefined, MAX_BARS]} frustumCulled={false} renderOrder={5}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#140c28" transparent opacity={0.85} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={fillRef} args={[undefined, undefined, MAX_BARS]} frustumCulled={false} renderOrder={6}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#ffffff" depthWrite={false} transparent />
      </instancedMesh>
    </group>
  );
}
