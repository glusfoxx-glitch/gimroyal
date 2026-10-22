'use client';
// =============================================================================
// Interface de combat : canvas 3D (chargé côté client uniquement) + HUD HTML/CSS
// superposé — timer, couronnes, barre d'élixir, main de cartes, capacités, draft, fin.
// =============================================================================
import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { gameStore, useGame } from '@/lib/store';
import { connectSocket } from '@/lib/socket';
import { getToken } from '@/lib/session';
import TopBar from '@/components/hud/TopBar';
import ElixirBar from '@/components/hud/ElixirBar';
import CardHand from '@/components/hud/CardHand';
import AbilityBar from '@/components/hud/AbilityBar';
import DraftScreen from '@/components/hud/DraftScreen';
import { Countdown, Toasts, EndScreen } from '@/components/hud/Overlays';

const GameCanvas = dynamic(() => import('@/components/three/GameCanvas'), {
  ssr: false,
  loading: () => <div className="canvas-loading">Chargement du Couloir du Lycée…</div>,
});

export default function GamePage() {
  const router = useRouter();
  const match = useGame((s) => s.match);
  const checked = useGame((s) => s.matchChecked);
  const hasSnap = useGame((s) => !!s.snap);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/');
      return;
    }
    const socket = connectSocket();
    if (socket && !gameStore.get().match) socket.emit('match:sync');
  }, [router]);

  useEffect(() => {
    if (checked && !match) router.replace('/lobby');
  }, [checked, match, router]);

  // Empêche le zoom / défilement accidentel pendant le combat (iOS)
  useEffect(() => {
    const prevent = (e) => e.preventDefault();
    const preventMove = (e) => {
      if (e.target instanceof Element && e.target.closest('.modal')) return; // fiches de cartes défilables
      e.preventDefault();
    };
    document.addEventListener('gesturestart', prevent);
    document.addEventListener('touchmove', preventMove, { passive: false });
    return () => {
      document.removeEventListener('gesturestart', prevent);
      document.removeEventListener('touchmove', preventMove);
    };
  }, []);

  if (!match) return <div className="screen-center">Connexion à la partie…</div>;

  return (
    <div className="game-root">
      <div className="game-stage">
        <GameCanvas key={match.matchId} />
        <TopBar />
        <AbilityBar />
        <Countdown />
        <Toasts />
        {!hasSnap && <div className="canvas-loading">Synchronisation…</div>}
      </div>
      <div className="hud-bottom">
        <CardHand />
        <ElixirBar />
      </div>
      <DraftScreen />
      <EndScreen />
    </div>
  );
}
