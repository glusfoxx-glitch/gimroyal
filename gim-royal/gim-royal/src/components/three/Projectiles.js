'use client';
// Pool fixe de meshes réutilisés pour les projectiles (cigarettes, craie, choucroute,
// cocktails Molotov, vinyles, sucettes, ballons, bobines ArcelorMittal) : aucune
// allocation pendant le combat.
import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { registry } from '@/lib/registry';
import { arenaToWorld } from '@/lib/coords';
import { getProjectileGeometry, vertexMaterial } from './models';

const POOL = 72;

export default function Projectiles({ layout }) {
  const groupRef = useRef();
  const pool = useRef([]);

  useLayoutEffect(() => {
    const g = groupRef.current;
    const list = [];
    for (let i = 0; i < POOL; i++) {
      const m = new THREE.Mesh(getProjectileGeometry('ballon'), vertexMaterial);
      m.rotation.order = 'YXZ';
      m.visible = false;
      m.frustumCulled = false;
      g.add(m);
      list.push(m);
    }
    pool.current = list;
    return () => {
      for (const m of list) g.remove(m);
      pool.current = [];
    };
  }, []);

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-22 * dt);
    const list = pool.current;
    let i = 0;
    for (const p of registry.projectiles.values()) {
      if (i >= list.length) break;
      const m = list[i++];
      const ox = p.rx;
      const oy = p.ry;
      p.rx += (p.x - p.rx) * k;
      p.ry += (p.y - p.ry) * k;
      p.rz += (p.z - p.rz) * k;
      const dx = p.rx - ox;
      const dy = p.ry - oy;
      if (Math.hypot(dx, dy) > 1e-4) {
        p.dirX = dx;
        p.dirY = dy;
      }
      m.geometry = getProjectileGeometry(p.kind);
      const [X, Z] = arenaToWorld(layout, p.rx, p.ry);
      m.position.set(X, p.rz, Z);
      const yaw = Math.atan2(p.dirX, -p.dirY);
      p.spin += dt * 14;
      switch (p.kind) {
        case 'vinyle':
          m.rotation.set(0, p.spin, 0);
          break;
        case 'sucette':
          m.rotation.set(0, p.spin * 0.6, 0);
          break;
        case 'ballon':
        case 'bobine':
        case 'choucroute':
          m.rotation.set(p.spin, yaw, 0);
          break;
        default:
          m.rotation.set(0, yaw, 0);
      }
      m.visible = true;
    }
    for (; i < list.length; i++) list[i].visible = false;
  });

  return <group ref={groupRef} />;
}
