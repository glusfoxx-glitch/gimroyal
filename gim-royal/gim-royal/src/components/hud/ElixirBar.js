'use client';
// Barre d'élixir (10 gouttes). La valeur vient du serveur (autorité) à 10 Hz ;
// la transition CSS lisse le remplissage entre deux snapshots.
import { useGame } from '@/lib/store';

export default function ElixirBar() {
  const el = useGame((s) => s.snap?.el ?? 0);
  const x2 = useGame((s) => !!s.snap?.x2);
  const mates = useGame((s) => s.snap?.mt);
  const pct = Math.max(0, Math.min(100, (el / 10) * 100));
  return (
    <div className="elixir-wrap">
      {mates && mates.length > 0 && (
        <div className="mate-elixir">
          Coéquipier : <b>{Math.floor(mates[0][1])}</b> 💧{!mates[0][2] && ' (déconnecté)'}
        </div>
      )}
      <div className={`elixir ${x2 ? 'is-x2' : ''}`}>
        <div className="elixir-drop">
          <span>{Math.floor(el)}</span>
        </div>
        <div className="elixir-track">
          <div className="elixir-fill" style={{ width: `${pct}%` }} />
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="elixir-tick" style={{ left: `${(i + 1) * 10}%` }} />
          ))}
        </div>
        {x2 && <div className="elixir-x2">x2</div>}
      </div>
    </div>
  );
}
