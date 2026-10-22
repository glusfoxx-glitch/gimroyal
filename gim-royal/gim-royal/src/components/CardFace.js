'use client';
// Visuel d'une carte (main, deck, draft) : emoji, nom, coût en élixir.
import { CARDS } from '@shared/cards.js';

export default function CardFace({ id, size = 'md', dim = false, progress = 1, selected = false, lifted = false }) {
  const card = CARDS[id];
  if (!card) return <div className={`card-face card-${size} card-empty`} />;
  return (
    <div className={`card-face card-${size} type-${card.type} ${dim ? 'is-dim' : ''} ${selected ? 'is-selected' : ''} ${lifted ? 'is-lifted' : ''}`}>
      <div className="card-art" aria-hidden>
        <span>{card.emoji}</span>
      </div>
      <div className="card-name">{card.name}</div>
      <div className="card-cost">{card.cost}</div>
      {dim && <div className="card-charge" style={{ height: `${Math.round((1 - progress) * 100)}%` }} />}
    </div>
  );
}
