'use client';
// Bandeau supérieur : adversaire(s), couronnes, timer, badge élixir x2 / prolongations.
import { useState } from 'react';
import { useGame } from '@/lib/store';
import { forfeit } from '@/lib/actions';

function formatTime(t) {
  const s = Math.max(0, Math.ceil(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function Crowns({ n, side }) {
  return (
    <span className={`crowns crowns-${side}`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < n ? 'on' : ''}>
          ♛
        </span>
      ))}
    </span>
  );
}

export default function TopBar() {
  const match = useGame((s) => s.match);
  const team = match?.team ?? 0;
  const tl = useGame((s) => s.snap?.tl ?? 180);
  const phase = useGame((s) => s.snap?.ph ?? 'countdown');
  const x2 = useGame((s) => !!s.snap?.x2);
  const myCrowns = useGame((s) => s.snap?.cr?.[team] ?? 0);
  const enemyCrowns = useGame((s) => s.snap?.cr?.[1 - team] ?? 0);
  const connected = useGame((s) => s.connected);
  const [confirm, setConfirm] = useState(false);
  if (!match) return null;
  const enemies = match.players.filter((p) => p.team !== team).map((p) => p.pseudo);
  const allies = match.players.filter((p) => p.team === team).map((p) => p.pseudo);
  const overtime = phase === 'overtime';
  const urgent = (phase === 'battle' || overtime) && tl <= 10;

  return (
    <div className="topbar">
      <div className="topbar-side enemy">
        <span className="names">{enemies.join(' & ')}</span>
        <Crowns n={enemyCrowns} side="enemy" />
      </div>
      <div className={`timer ${urgent ? 'urgent' : ''}`}>
        <small>{overtime ? 'Prolongations' : 'Temps restant'}</small>
        <strong>{formatTime(tl)}</strong>
        {x2 && <span className="badge-x2">Élixir x2</span>}
      </div>
      <div className="topbar-side ally">
        <span className="names">{allies.join(' & ')}</span>
        <Crowns n={myCrowns} side="ally" />
      </div>
      {!connected && <div className="net-warning">Reconnexion…</div>}
      <button
        className={`forfeit ${confirm ? 'armed' : ''}`}
        onClick={() => {
          if (confirm) forfeit();
          else {
            setConfirm(true);
            setTimeout(() => setConfirm(false), 2500);
          }
        }}
        aria-label="Abandonner"
      >
        {confirm ? 'Abandonner ?' : '🏳️'}
      </button>
    </div>
  );
}
