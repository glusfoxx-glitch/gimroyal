'use client';
// =============================================================================
// Instanciation des 6 tours : Gilet (tours latérales) et Breuer (tour du roi).
// Les profs pivotent vers leur cible, Breuer dort (Zzz) tant qu'il n'est pas réveillé,
// une tour détruite laisse place à des gravats. PV affichés via sprite canvas.
// =============================================================================
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { FLAGS } from '@shared/constants.js';
import { registry } from '@/lib/registry';
import { arenaToWorld, facingToRotY, lerpAngle } from '@/lib/coords';
import { getModelGeometry, getTowerBaseGeometry, getRubbleGeometry, vertexMaterial, flashMaterial, TEAM_COLORS } from './models';
import { createTowerHpCanvas, drawTowerHp, getLabelTexture } from './textures';

function findTower(team, key) {
  for (const t of registry.towers.values()) if (t.team === team && t.key === key) return t;
  return null;
}

function Tower({ def, team, layout, myTeam }) {
  const isKing = def.type === 'king';
  const ay = team === 0 ? def.y : layout.length - def.y;
  const [X, Z] = arenaToWorld(layout, def.x, ay);
  const color = team === myTeam ? TEAM_COLORS.me : TEAM_COLORS.enemy;
  const label = isKing ? 'Breuer' : 'Gilet';

  const aliveRef = useRef();
  const rubbleRef = useRef();
  const figureRef = useRef();
  const figMeshRef = useRef();
  const zzzRef = useRef();
  const hpRef = useRef();
  const hpCanvas = useMemo(() => createTowerHpCanvas(), []);
  const gim = useMemo(() => getLabelTexture('GIM', { color: '#1e3a8a', stroke: '#facc15', size: 40 }), []);
  const zzz = useMemo(() => getLabelTexture('Zzz', { color: '#e0e7ff', stroke: '#312e81', size: 48 }), []);
  const st = useRef({ lastHp: -1, ra: team === 0 ? 0 : Math.PI, bump: 0 });

  useEffect(() => () => hpCanvas.tex.dispose(), [hpCanvas]);

  useFrame((state, dt) => {
    const t = findTower(team, def.key);
    if (!t || !aliveRef.current) return;
    const alive = (t.flags & FLAGS.ALIVE) !== 0;
    aliveRef.current.visible = alive;
    rubbleRef.current.visible = !alive;
    hpRef.current.visible = alive;
    if (!alive) return;
    if (t.hp !== st.current.lastHp) {
      drawTowerHp(hpCanvas, t.hp, t.maxHp, color, label);
      st.current.lastHp = t.hp;
    }
    const asleep = (t.flags & FLAGS.ASLEEP) !== 0;
    if (zzzRef.current) {
      zzzRef.current.visible = asleep;
      zzzRef.current.position.y = 6.2 + Math.sin(state.clock.elapsedTime * 2) * 0.18;
    }
    // le prof se tourne vers sa cible
    let target = team === 0 ? 0 : Math.PI;
    if (t.tg) {
      const u = registry.units.get(t.tg);
      if (u) target = Math.atan2(u.rx - def.x, u.ry - ay);
    }
    st.current.ra = lerpAngle(st.current.ra, target, 1 - Math.exp(-8 * dt));
    figureRef.current.rotation.y = facingToRotY(st.current.ra);
    figureRef.current.rotation.x = asleep ? 0.28 : 0;
    if (t.flash > 0) t.flash = Math.max(0, t.flash - dt * 8);
    figMeshRef.current.material = t.flash > 0.5 ? flashMaterial : vertexMaterial;
  });

  const baseRot = team === 0 ? 0 : Math.PI;
  return (
    <group position={[X, 0, Z]}>
      <group ref={aliveRef}>
        <mesh geometry={getTowerBaseGeometry(def.type)} material={vertexMaterial} rotation-y={baseRot} />
        <mesh position={[0, isKing ? 1.5 : 1.25, 0]}>
          <boxGeometry args={isKing ? [3.78, 0.32, 3.78] : [2.88, 0.3, 2.88]} />
          <meshLambertMaterial color={color} />
        </mesh>
        <group ref={figureRef} position={[0, isKing ? 2.35 : 1.91, 0]}>
          <mesh ref={figMeshRef} geometry={getModelGeometry(isKing ? 'breuer' : 'gilet')} material={vertexMaterial} />
          {isKing && (
            <mesh position={[0, 1.62 * 1.4, 0.21 * 1.4 + 0.02]}>
              <planeGeometry args={[0.46, 0.2]} />
              <meshBasicMaterial map={gim.tex} transparent depthWrite={false} />
            </mesh>
          )}
        </group>
        {isKing && (
          <sprite ref={zzzRef} position={[0.8, 6.2, 0]} scale={[1.2 * zzz.aspect * 0.6, 0.72, 1]}>
            <spriteMaterial map={zzz.tex} transparent depthWrite={false} />
          </sprite>
        )}
      </group>
      <mesh ref={rubbleRef} geometry={getRubbleGeometry(def.type)} material={vertexMaterial} visible={false} />
      <sprite ref={hpRef} position={[0, isKing ? 7.0 : 5.0, 0]} scale={[3.2, 1.0, 1]} renderOrder={10}>
        <spriteMaterial map={hpCanvas.tex} transparent depthWrite={false} depthTest={false} />
      </sprite>
    </group>
  );
}

export default function Towers({ layout, myTeam }) {
  return (
    <group>
      {[0, 1].map((team) =>
        layout.towers.map((def) => <Tower key={`${team}${def.key}`} def={def} team={team} layout={layout} myTeam={myTeam} />),
      )}
    </group>
  );
}
