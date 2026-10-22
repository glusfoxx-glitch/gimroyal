'use client';
// =============================================================================
// Déploiement des cartes : Drag & Drop tactile et souris depuis la main (HUD) vers
// l'arène, ou "tap carte puis tap terrain". Raycast sur le plan du sol, aimantation
// sur la grille de 0,5 tuile, fantôme vert/rouge, zones autorisées en surbrillance.
// =============================================================================
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CARDS } from '@shared/cards.js';
import { canDeploy, deployRects } from '@shared/zones.js';
import { gameStore } from '@/lib/store';
import { drag, bridge } from '@/lib/drag';
import { arenaToWorld, worldToArena } from '@/lib/coords';
import { clampDeploy, deployStateFromSnap, tryDeploy } from '@/lib/actions';
import { getModelGeometry, ghostMaterial } from './models';

const ringGeo = new THREE.RingGeometry(0.94, 1, 56);
const tileGeo = new THREE.PlaneGeometry(1, 1);

export default function DeployController({ layout, team }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const ghostRef = useRef();
  const modelRef = useRef();
  const rangeRef = useRef();
  const tileRef = useRef();
  const zoneRefs = useRef([]);
  const forbidRef = useRef();
  const cache = useRef({ key: '', model: '' });

  const tools = useMemo(
    () => ({
      ray: new THREE.Raycaster(),
      plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
      ndc: new THREE.Vector2(),
      hit: new THREE.Vector3(),
    }),
    [],
  );
  const mats = useMemo(
    () => ({
      ok: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false }),
      bad: new THREE.MeshBasicMaterial({ color: '#ff4b55', transparent: true, opacity: 0.9, depthWrite: false }),
      tileOk: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false }),
      tileBad: new THREE.MeshBasicMaterial({ color: '#ff4b55', transparent: true, opacity: 0.45, depthWrite: false }),
      zone: new THREE.MeshBasicMaterial({ color: '#7cf29a', transparent: true, opacity: 0.12, depthWrite: false }),
      forbid: new THREE.MeshBasicMaterial({ color: '#ff3355', transparent: true, opacity: 0.14, depthWrite: false }),
    }),
    [],
  );

  useEffect(() => {
    const el = gl.domElement;
    bridge.screenToArena = (sx, sy) => {
      const r = el.getBoundingClientRect();
      tools.ndc.set(((sx - r.left) / r.width) * 2 - 1, -((sy - r.top) / r.height) * 2 + 1);
      tools.ray.setFromCamera(tools.ndc, camera);
      if (!tools.ray.ray.intersectPlane(tools.plane, tools.hit)) return null;
      return worldToArena(layout, tools.hit.x, tools.hit.z);
    };
    bridge.isOverCanvas = (sx, sy) => {
      const r = el.getBoundingClientRect();
      return sx >= r.left && sx <= r.right && sy >= r.top && sy <= r.bottom;
    };
    // Mode "tap" : carte sélectionnée dans la main, puis tap / clic sur le terrain
    const onMove = (e) => {
      if (drag.active) return;
      drag.sx = e.clientX;
      drag.sy = e.clientY;
      drag.hover = true;
    };
    const onLeave = () => {
      drag.hover = false;
    };
    const onUp = (e) => {
      if (drag.active) return;
      const { selected, snap } = gameStore.get();
      if (selected < 0 || !snap) return;
      const pos = bridge.screenToArena(e.clientX, e.clientY);
      if (pos) tryDeploy(selected, snap.hd[selected], pos[0], pos[1]);
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('pointerup', onUp);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('pointerup', onUp);
      bridge.screenToArena = null;
      bridge.isOverCanvas = null;
    };
  }, [camera, gl, layout, tools]);

  useFrame(() => {
    const ghost = ghostRef.current;
    if (!ghost) return;
    const { snap, selected } = gameStore.get();
    let cardId = null;
    let sx = 0;
    let sy = 0;
    if (snap && drag.active && drag.moved && drag.over) {
      cardId = drag.cardId;
      sx = drag.sx;
      sy = drag.sy - drag.touchOffset;
    } else if (snap && !drag.active && selected >= 0 && drag.hover) {
      cardId = snap.hd[selected];
      sx = drag.sx;
      sy = drag.sy;
    }
    const holding = snap && (drag.active || selected >= 0);
    const holdCard = holding ? CARDS[drag.active ? drag.cardId : snap.hd[selected]] : null;

    // ---- Zones autorisées (affichées tant qu'une carte est tenue / sélectionnée)
    const state = snap && (holdCard || cardId) ? deployStateFromSnap(layout, snap) : null;
    if (holdCard && state) {
      const aliveKey = state.towers.map((t) => (t.alive ? 1 : 0)).join('');
      const key = `${holdCard.type}|${aliveKey}|${team}`;
      if (cache.current.key !== key) {
        cache.current.key = key;
        const rects = deployRects(layout, team, holdCard.type, state.towers);
        zoneRefs.current.forEach((m, i) => {
          if (!m) return;
          const r = rects[i];
          m.visible = !!r && holdCard.type !== 'spell';
          if (!r) return;
          const [cx, cz] = arenaToWorld(layout, (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2);
          m.position.set(cx, 0.03, cz);
          m.scale.set(r.x1 - r.x0, r.y1 - r.y0, 1);
        });
        if (forbidRef.current) {
          // moitié adverse (rivière comprise) teintée en rouge
          forbidRef.current.visible = holdCard.type !== 'spell';
          const y0 = team === 0 ? layout.riverMin : 0;
          const y1 = team === 0 ? layout.length : layout.riverMax;
          const [cx, cz] = arenaToWorld(layout, layout.width / 2, (y0 + y1) / 2);
          forbidRef.current.position.set(cx, 0.025, cz);
          forbidRef.current.scale.set(layout.width, y1 - y0, 1);
        }
      }
    } else if (cache.current.key !== '') {
      cache.current.key = '';
      zoneRefs.current.forEach((m) => m && (m.visible = false));
      if (forbidRef.current) forbidRef.current.visible = false;
    }

    // ---- Fantôme de pose
    const card = cardId ? CARDS[cardId] : null;
    const pos = card ? bridge.screenToArena?.(sx, sy) : null;
    if (!card || !pos || !state) {
      ghost.visible = false;
      return;
    }
    const [px, py] = clampDeploy(layout, team, card, pos[0], pos[1], state);
    const ok = canDeploy(layout, team, card, px, py, state) && snap.el >= card.cost;
    const [X, Z] = arenaToWorld(layout, px, py);
    ghost.visible = true;
    ghost.position.set(X, 0, Z);

    const model = modelRef.current;
    if (card.type === 'spell') {
      model.visible = false;
    } else {
      if (cache.current.model !== card.id) {
        model.geometry = getModelGeometry(card.id);
        cache.current.model = card.id;
      }
      model.visible = true;
      model.rotation.y = team === 0 ? Math.PI : 0;
      model.position.y = card.stats.flying ? 1.9 : 0;
    }
    const range = card.type === 'spell' ? card.stats.radius : card.type === 'building' ? card.stats.range || card.stats.half + 0.2 : Math.max(card.stats.radius + 0.3, card.stats.range >= 2.5 ? card.stats.range : 0);
    rangeRef.current.scale.set(range, range, 1);
    rangeRef.current.material = ok ? mats.ok : mats.bad;
    const tileSize = card.type === 'building' ? card.stats.half * 2 : 1;
    tileRef.current.scale.set(tileSize, tileSize, 1);
    tileRef.current.visible = card.type !== 'spell';
    tileRef.current.material = ok ? mats.tileOk : mats.tileBad;
  });

  return (
    <group>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(m) => {
            zoneRefs.current[i] = m;
          }}
          geometry={tileGeo}
          material={mats.zone}
          rotation-x={-Math.PI / 2}
          visible={false}
          renderOrder={2}
        />
      ))}
      <mesh ref={forbidRef} geometry={tileGeo} material={mats.forbid} rotation-x={-Math.PI / 2} visible={false} renderOrder={2} />
      <group ref={ghostRef} visible={false}>
        <mesh ref={tileRef} geometry={tileGeo} material={mats.tileOk} rotation-x={-Math.PI / 2} position-y={0.05} renderOrder={3} />
        <mesh ref={rangeRef} geometry={ringGeo} material={mats.ok} rotation-x={-Math.PI / 2} position-y={0.07} renderOrder={3} />
        <mesh ref={modelRef} geometry={getModelGeometry('emircan')} material={ghostMaterial} />
      </group>
    </group>
  );
}
