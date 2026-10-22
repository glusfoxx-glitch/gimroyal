'use client';
// Phase de draft du mode 1V1 Tirage Triple : 8 manches, 3 cartes proposées, 1 à garder.
import { useState } from 'react';
import { CARDS } from '@shared/cards.js';
import { MATCH_RULES } from '@shared/constants.js';
import { useGame } from '@/lib/store';
import { draftPick } from '@/lib/actions';
import CardFace from '../CardFace';
import CardInfo from '../CardInfo';

export default function DraftScreen() {
  const dr = useGame((s) => (s.snap?.ph === 'draft' ? s.snap.dr : null));
  const [info, setInfo] = useState(null);
  if (!dr) return null;
  const pct = Math.max(0, Math.min(100, (dr.left / MATCH_RULES.draftRoundTime) * 100));
  return (
    <div className="draft-screen">
      <div className="draft-head">
        <h2>Tirage Triple</h2>
        <p>
          Manche {dr.round}/{dr.total} — garde une carte
        </p>
        <div className="draft-timer">
          <div style={{ width: `${pct}%` }} />
        </div>
      </div>
      {dr.picked ? (
        <p className="draft-wait">Carte choisie ! En attente de l’adversaire…</p>
      ) : (
        <div className="draft-options">
          {dr.options.map((id) => (
            <div key={id} className="draft-option">
              <button className="draft-pick" onClick={() => draftPick(id)}>
                <CardFace id={id} size="lg" />
                <span className="draft-title">{CARDS[id].title}</span>
                <span className="draft-desc">{CARDS[id].mecanique || CARDS[id].description}</span>
              </button>
              <button className="info-btn" onClick={() => setInfo(id)} aria-label="Fiche">
                ⓘ
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="draft-deck">
        {Array.from({ length: dr.total }, (_, i) => (
          <CardFace key={i} id={dr.picks[i]} size="xs" />
        ))}
      </div>
      {info && <CardInfo id={info} onClose={() => setInfo(null)} />}
    </div>
  );
}
