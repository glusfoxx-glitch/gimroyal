'use client';
// Boutons de capacité : "Dodo stratégique" pour chaque Céline déployée par le joueur.
import { useGame } from '@/lib/store';
import { toggleDodo } from '@/lib/actions';

export default function AbilityBar() {
  const myIndex = useGame((s) => s.match?.index ?? -1);
  // clé primitive "id:aux|id:aux" pour ne re-rendre que si l'état change
  const key = useGame((s) => {
    if (!s.snap) return '';
    const parts = [];
    for (const u of s.snap.u) if (u[1] === 'celine' && u[3] === myIndex) parts.push(`${u[0]}:${u[13]}`);
    return parts.join('|');
  });
  if (!key) return null;
  return (
    <div className="ability-bar">
      {key.split('|').map((p) => {
        const [id, auxStr] = p.split(':');
        const aux = Number(auxStr);
        const sleeping = aux < 0;
        const cooling = aux > 0;
        return (
          <button
            key={id}
            className={`ability ${sleeping ? 'is-active' : ''}`}
            disabled={cooling}
            onClick={() => toggleDodo(Number(id))}
          >
            <span className="ability-icon">{sleeping ? '⏰' : '💤'}</span>
            <span>
              {sleeping ? `Réveil (${Math.ceil(-aux)}s)` : cooling ? `Dodo dans ${Math.ceil(aux)}s` : 'Dodo stratégique'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
