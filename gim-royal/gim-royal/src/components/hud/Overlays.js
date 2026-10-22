'use client';
// Décompte de départ, notifications (toasts), écran de fin de partie.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/lib/store';
import { leaveMatchView } from '@/lib/socket';

export function Countdown() {
  const phase = useGame((s) => s.snap?.ph);
  const cd = useGame((s) => s.snap?.cd ?? 0);
  const [fight, setFight] = useState(false);
  const prev = useRef(phase);
  useEffect(() => {
    if (prev.current === 'countdown' && phase === 'battle') {
      setFight(true);
      const t = setTimeout(() => setFight(false), 900);
      prev.current = phase;
      return () => clearTimeout(t);
    }
    prev.current = phase;
    return undefined;
  }, [phase]);
  if (phase === 'countdown') {
    return (
      <div className="countdown">
        <span key={Math.ceil(cd)}>{Math.max(1, Math.ceil(cd))}</span>
      </div>
    );
  }
  if (fight) {
    return (
      <div className="countdown">
        <span className="fight">BAGARRE !</span>
      </div>
    );
  }
  return null;
}

export function Toasts() {
  const toast = useGame((s) => s.toast);
  if (!toast) return null;
  return (
    <div className="toast" key={toast.id}>
      {toast.message}
    </div>
  );
}

const REASONS = {
  king: 'Breuer est tombé !',
  time: 'Fin du temps réglementaire',
  suddendeath: 'Mort subite en prolongations',
  tiebreak: 'Départage aux PV des tours',
  forfeit: 'Abandon',
  draw: 'Égalité parfaite',
  error: 'Partie interrompue',
};

export function EndScreen() {
  const result = useGame((s) => s.result);
  const router = useRouter();
  if (!result) return null;
  const title = result.result === 'win' ? 'VICTOIRE !' : result.result === 'loss' ? 'DÉFAITE…' : 'ÉGALITÉ';
  return (
    <div className="end-screen">
      <div className={`end-card end-${result.result}`}>
        <h1>{title}</h1>
        <div className="end-crowns">
          <div>
            <span className="crown-big ally">♛</span>
            <b>{result.myCrowns}</b>
          </div>
          <span className="vs">—</span>
          <div>
            <b>{result.enemyCrowns}</b>
            <span className="crown-big enemy">♛</span>
          </div>
        </div>
        <p>{REASONS[result.reason] || ''}</p>
        <button
          className="btn btn-gold"
          onClick={() => {
            leaveMatchView();
            router.replace('/lobby');
          }}
        >
          Retour au lobby
        </button>
      </div>
    </div>
  );
}
