'use client';
// =============================================================================
// Canvas React Three Fiber : arène, tours, unités, projectiles, effets, drag & drop.
// Optimisé mobile : DPR plafonné, pas d'ombres temps réel (éclairage cuit dans les
// textures), matériaux Lambert à couleurs de sommets, instanciation des barres de vie.
// =============================================================================
import { useLayoutEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { LAYOUTS } from '@shared/constants.js';
import { useGame } from '@/lib/store';
import Arena from './Arena';
import Towers from './Towers';
import Units from './Units';
import Projectiles from './Projectiles';
import Effects from './Effects';
import DeployController from './DeployController';

const ELEVATION = THREE.MathUtils.degToRad(57);

/** Place la caméra pour que l'arène entière tienne à l'écran, côté joueur en bas. */
function CameraRig({ layout, team }) {
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);

  useLayoutEffect(() => {
    const dir = team === 0 ? 1 : -1;
    const W = layout.width / 2 + 0.6;
    const L = layout.length / 2 + 0.6;
    const corners = [
      [-W, 0, -L],
      [W, 0, -L],
      [-W, 0, L],
      [W, 0, L],
      [-W, 1.6, -dir * (L + 0.6)],
      [W, 1.6, -dir * (L + 0.6)],
      [0, 5.5, -dir * (L - 3)],
    ];
    const test = camera.clone();
    test.aspect = width / Math.max(1, height);
    test.updateProjectionMatrix();
    const v = new THREE.Vector3();
    const place = (cam, d) => {
      cam.position.set(0, d * Math.sin(ELEVATION), dir * d * Math.cos(ELEVATION));
      cam.lookAt(0, 0, dir * 0.6);
      cam.updateMatrixWorld();
    };
    let lo = 4;
    let hi = 300;
    for (let i = 0; i < 32; i++) {
      const d = (lo + hi) / 2;
      place(test, d);
      let fits = true;
      for (const c of corners) {
        v.set(c[0], c[1], c[2]).project(test);
        if (Math.abs(v.x) > 0.99 || Math.abs(v.y) > 0.99) {
          fits = false;
          break;
        }
      }
      if (fits) hi = d;
      else lo = d;
    }
    place(camera, hi);
    camera.updateProjectionMatrix();
  }, [camera, width, height, team, layout]);

  return null;
}

export default function GameCanvas() {
  const layoutId = useGame((s) => s.match?.layoutId);
  const team = useGame((s) => s.match?.team ?? 0);
  const layout = LAYOUTS[layoutId] || LAYOUTS['1v1'];

  return (
    <Canvas
      className="game-canvas"
      dpr={[1, 1.75]}
      flat
      gl={{ antialias: true, powerPreference: 'high-performance', stencil: false, alpha: false }}
      camera={{ fov: 40, near: 0.5, far: 400, position: [0, 40, 25] }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <color attach="background" args={['#1d1536']} />
      <hemisphereLight args={['#fff3dc', '#4b3d6b', 1.25]} />
      <directionalLight position={[8, 20, 10]} intensity={1.7} color="#fff6e6" />
      <CameraRig layout={layout} team={team} />
      <Arena layout={layout} />
      <Towers layout={layout} myTeam={team} />
      <Units layout={layout} myTeam={team} />
      <Projectiles layout={layout} />
      <Effects layout={layout} myTeam={team} />
      <DeployController layout={layout} team={team} />
    </Canvas>
  );
}
