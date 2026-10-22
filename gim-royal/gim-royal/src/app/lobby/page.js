'use client';
// Lobby : profil (victoires / défaites), choix du mode, deck, matchmaking.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MODES } from '@shared/constants.js';
import { ARENA_INFO, TOWERS, validateDeck } from '@shared/cards.js';
import { useGame } from '@/lib/store';
import { connectSocket, disconnectSocket, emit } from '@/lib/socket';
import { getToken, clearToken, getDeck, saveDeck } from '@/lib/session';
import DeckBuilder from '@/components/lobby/DeckBuilder';
import { Toasts } from '@/components/hud/Overlays';

const MODE_ICONS = { classic: '⚔️', duo: '👥', draft: '🎴', training: '🤖' };

export default function LobbyPage() {
  const router = useRouter();
  const session = useGame((s) => s.session);
  const queue = useGame((s) => s.queue);
  const match = useGame((s) => s.match);
  const connected = useGame((s) => s.connected);
  const [deck, setDeck] = useState([]);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/');
      return;
    }
    setDeck(getDeck());
    connectSocket();
  }, [router]);

  useEffect(() => {
    if (match) router.push('/game');
  }, [match, router]);

  useEffect(() => {
    if (!queue) return undefined;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - (queue.since || Date.now())) / 1000)), 500);
    return () => clearInterval(t);
  }, [queue]);

  function updateDeck(d) {
    setDeck(d);
    saveDeck(d);
  }

  function play(mode) {
    const def = MODES[mode];
    if (!def.draft && !validateDeck(deck)) return;
    emit('queue:join', { mode, deck: def.draft ? null : deck });
  }

  function logout() {
    disconnectSocket();
    clearToken();
    router.replace('/');
  }

  const deckOk = validateDeck(deck);
  const total = session ? session.wins + session.losses + (session.draws || 0) : 0;

  return (
    <main className="lobby">
      <header className="lobby-head">
        <div className="logo small">
          <span className="logo-crown">👑</span>
          <h1>
            GIM <em>Royal</em>
          </h1>
        </div>
        <div className="profile">
          <div className="profile-name">
            <span className={`dot ${connected ? 'on' : ''}`} />
            {session?.pseudo || '…'}
          </div>
          <div className="profile-stats">
            <span>🏆 {session?.wins ?? 0} V</span>
            <span>💀 {session?.losses ?? 0} D</span>
            {total > 0 && <span>{Math.round(((session?.wins ?? 0) / total) * 100)}%</span>}
          </div>
          <button className="btn btn-ghost" onClick={logout}>
            Déconnexion
          </button>
        </div>
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2>Modes de jeu</h2>
          <span className="pill">{ARENA_INFO.reglesElixir}</span>
        </div>
        <div className="modes">
          {Object.values(MODES).map((m) => {
            const needsDeck = !m.draft;
            const disabled = !connected || (needsDeck && !deckOk) || !!queue;
            return (
              <button key={m.id} className={`mode mode-${m.id}`} onClick={() => play(m.id)} disabled={disabled}>
                <span className="mode-icon">{MODE_ICONS[m.id]}</span>
                <span className="mode-label">{m.label}</span>
                <span className="mode-desc">{m.desc}</span>
                {needsDeck && !deckOk && <span className="mode-warn">Deck de 8 cartes requis</span>}
              </button>
            );
          })}
        </div>
      </section>

      <DeckBuilder deck={deck} onChange={updateDeck} />

      <section className="panel arena-info">
        <h2>{ARENA_INFO.name}</h2>
        <p>{ARENA_INFO.environnement}</p>
        <div className="towers-info">
          {Object.values(TOWERS).map((t) => (
            <div key={t.id} className="tower-info">
              <h3>{t.title}</h3>
              <small>{t.role}</small>
              <p>{t.description}</p>
              <span className="pill">
                {t.stats.hp} PV · {t.stats.damage} dégâts · portée {t.stats.range}
              </span>
            </div>
          ))}
        </div>
      </section>

      {queue && (
        <div className="queue-overlay">
          <div className="queue-card">
            <div className="spinner" />
            <h2>Recherche d’adversaire…</h2>
            <p>
              {MODES[queue.mode]?.label} — {queue.waiting}/{queue.needed} joueur{queue.needed > 1 ? 's' : ''} · {elapsed}s
            </p>
            <button className="btn btn-ghost" onClick={() => emit('queue:leave')}>
              Annuler
            </button>
          </div>
        </div>
      )}
      <Toasts />
    </main>
  );
}
