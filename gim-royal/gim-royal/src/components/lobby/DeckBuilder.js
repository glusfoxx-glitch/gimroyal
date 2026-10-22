'use client';
// Constructeur de deck : 8 cartes parmi les 19 (15 personnages, 2 bâtiments, 2 sorts).
import { useState } from 'react';
import { CARDS, CARD_ORDER, averageCost } from '@shared/cards.js';
import { showToast } from '@/lib/store';
import CardFace from '../CardFace';
import CardInfo from '../CardInfo';

export default function DeckBuilder({ deck, onChange }) {
  const [info, setInfo] = useState(null);

  function toggle(id) {
    if (deck.includes(id)) {
      onChange(deck.filter((d) => d !== id));
    } else if (deck.length >= 8) {
      showToast('Deck complet : retire d’abord une carte.');
    } else {
      onChange([...deck, id]);
    }
  }

  return (
    <section className="panel deck-builder">
      <div className="panel-head">
        <h2>Ton deck</h2>
        <span className="pill">
          {deck.length}/8 · Coût moyen <b>{averageCost(deck).toFixed(1)}</b>
        </span>
      </div>
      <div className="deck-slots">
        {Array.from({ length: 8 }, (_, i) => {
          const id = deck[i];
          return (
            <button key={i} className="slot" onClick={() => id && toggle(id)} aria-label={id ? `Retirer ${CARDS[id].name}` : 'Emplacement vide'}>
              {id ? <CardFace id={id} size="sm" /> : <div className="card-face card-sm card-empty">+</div>}
            </button>
          );
        })}
      </div>
      <h3 className="collection-title">Collection — touche pour ajouter / retirer, ⓘ pour la fiche</h3>
      <div className="collection">
        {CARD_ORDER.map((id) => (
          <div key={id} className={`collection-item ${deck.includes(id) ? 'in-deck' : ''}`}>
            <button className="collection-card" onClick={() => toggle(id)}>
              <CardFace id={id} size="sm" />
            </button>
            <button className="info-btn" onClick={() => setInfo(id)} aria-label={`Fiche de ${CARDS[id].name}`}>
              ⓘ
            </button>
          </div>
        ))}
      </div>
      {info && <CardInfo id={info} onClose={() => setInfo(null)} />}
    </section>
  );
}
