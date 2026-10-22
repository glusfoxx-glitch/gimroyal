'use client';
// =============================================================================
// L'Arène : Le Couloir du Lycée — sol en lino (éclairage cuit), rivière d'huile animée,
// tables renversées, deux ponts, murs de casiers et tableaux noirs aux deux extrémités.
// =============================================================================
import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { makeFloorTexture, makeOilSheenTexture, makeLockerTexture, makeBoardTexture } from './textures';
import { getArenaDecorGeometry, riverSegments, vertexMaterial } from './models';

export default function Arena({ layout }) {
  const W = layout.width;
  const L = layout.length;
  const floor = useMemo(() => makeFloorTexture(layout), [layout]);
  const sheen = useMemo(() => makeOilSheenTexture(), []);
  const lockers = useMemo(() => {
    const t = makeLockerTexture();
    t.repeat.set((L + 2) / 2, 1);
    return t;
  }, [L]);
  const boards = useMemo(
    () => [makeBoardTexture(['GIM ROYAL', 'Le Couloir du Lycée']), makeBoardTexture(['Interro surprise !', 'Rendez vos copies à M. Breuer'])],
    [],
  );
  const decor = useMemo(() => getArenaDecorGeometry(layout), [layout]);
  const segs = useMemo(() => riverSegments(layout), [layout]);

  useEffect(
    () => () => {
      floor.dispose();
      sheen.dispose();
      lockers.dispose();
      boards.forEach((b) => b.dispose());
    },
    [floor, sheen, lockers, boards],
  );

  useFrame((_, dt) => {
    sheen.offset.x = (sheen.offset.x + dt * 0.045) % 1;
  });

  const riverZ = L / 2 - (layout.riverMin + layout.riverMax) / 2;
  const riverD = layout.riverMax - layout.riverMin;

  return (
    <group>
      {/* Sol extérieur (prolonge le couloir hors de l'arène) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.04, 0]}>
        <planeGeometry args={[W + 60, L + 60]} />
        <meshBasicMaterial color="#231a3d" />
      </mesh>

      {/* Sol de l'arène, éclairage cuit dans la texture */}
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[W, L]} />
        <meshBasicMaterial map={floor} />
      </mesh>

      {/* Reflets mouvants sur la rivière d'huile */}
      {segs.map(([a, b]) => (
        <mesh key={`${a}-${b}`} rotation-x={-Math.PI / 2} position={[(a + b) / 2 - W / 2, 0.015, riverZ]}>
          <planeGeometry args={[b - a, riverD * 0.9]} />
          <meshBasicMaterial map={sheen} transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}

      {/* Tables renversées + ponts (une seule géométrie fusionnée) */}
      <mesh geometry={decor} material={vertexMaterial} />

      {/* Murs de casiers sur les côtés */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (W / 2 + 0.5), 0, 0]}>
          <mesh position={[0, 1.1, 0]}>
            <boxGeometry args={[1, 2.2, L + 2]} />
            <meshLambertMaterial color="#223a63" />
          </mesh>
          <mesh position={[-s * 0.505, 1.1, 0]} rotation-y={-s * (Math.PI / 2)}>
            <planeGeometry args={[L + 2, 2.2]} />
            <meshBasicMaterial map={lockers} />
          </mesh>
          <mesh position={[0, 2.24, 0]}>
            <boxGeometry args={[1.1, 0.08, L + 2.2]} />
            <meshLambertMaterial color="#9aa7bd" />
          </mesh>
        </group>
      ))}

      {/* Murs du fond avec tableaux noirs */}
      {[1, -1].map((e, i) => (
        <group key={e} position={[0, 0, e * (L / 2 + 0.5)]}>
          <mesh position={[0, 0.8, 0]}>
            <boxGeometry args={[W + 2, 1.6, 1]} />
            <meshLambertMaterial color="#3a2f55" />
          </mesh>
          <mesh position={[0, 0.85, -e * 0.505]} rotation-y={e > 0 ? Math.PI : 0}>
            <planeGeometry args={[Math.min(8, W * 0.45), 1.4]} />
            <meshBasicMaterial map={boards[i]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
