'use client';
// Fiche complète d'une carte : textes du document de game design reproduits à la lettre
// + statistiques chiffrées utilisées par le serveur.
import { CARDS, TYPE_LABELS } from '@shared/cards.js';
import CardFace from './CardFace';

const TARGETS = { ground: 'Sol', all: 'Air & Sol', buildings: 'Bâtiments', none: '—' };

function StatRow({ label, value }) {
  return (
    <div className="stat-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function CardInfo({ id, onClose }) {
  const c = CARDS[id];
  if (!c) return null;
  const s = c.stats;
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal card-info" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={c.name}>
        <button className="modal-close" onClick={onClose} aria-label="Fermer">
          ✕
        </button>
        <div className="card-info-head">
          <CardFace id={id} size="lg" />
          <div>
            <h2>{c.name}</h2>
            <p className="card-info-title">
              {c.title} · {TYPE_LABELS[c.type]}
            </p>
            <p className="card-info-cost">Coût en Élixir : {c.cost}</p>
          </div>
        </div>
        <p className="card-info-desc">{c.description}</p>
        {c.cibleEtPortee && (
          <p>
            <b>Cible et Portée :</b> {c.cibleEtPortee}
          </p>
        )}
        {c.vitesseEtPv && (
          <p>
            <b>Vitesse et PV :</b> {c.vitesseEtPv}
          </p>
        )}
        {c.mecanique && (
          <p>
            <b>Mécanique Spéciale :</b> {c.mecanique}
          </p>
        )}
        <div className="stat-grid">
          {s.hp && <StatRow label="PV" value={s.hp} />}
          {s.damage ? <StatRow label="Dégâts" value={s.damage} /> : null}
          {s.rampDamage && <StatRow label="Dégâts (montée)" value={s.rampDamage.join(' → ')} />}
          {s.hitSpeed && c.type !== 'spell' ? <StatRow label="Cadence" value={`${s.hitSpeed}s`} /> : null}
          {s.speed ? <StatRow label="Vitesse" value={`${s.speed} t/s`} /> : null}
          {s.range ? <StatRow label="Portée" value={`${s.range} t`} /> : null}
          {s.targets && c.type !== 'spell' && <StatRow label="Cible" value={TARGETS[s.targets]} />}
          {s.lifetime && <StatRow label="Durée de vie" value={`${s.lifetime}s`} />}
          {c.type === 'spell' && <StatRow label="Rayon" value={`${s.radius} t`} />}
          {c.type === 'spell' && <StatRow label="Durée" value={`${s.duration}s`} />}
          {s.heal && c.type === 'spell' ? <StatRow label="Soin" value={`${s.heal} / ${s.tickEvery}s`} /> : null}
        </div>
      </div>
    </div>
  );
}
