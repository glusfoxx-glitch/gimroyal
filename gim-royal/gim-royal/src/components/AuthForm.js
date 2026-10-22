'use client';
// =============================================================================
// Connexion / Inscription ultra-simple : Pseudo + Mot de passe, rien d'autre.
// Le serveur hache le mot de passe (scrypt) et renvoie un jeton de session signé.
// =============================================================================
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { setToken } from '@/lib/session';

const PSEUDO_RE = /^[\p{L}\p{N}_-]{3,16}$/u;

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isRegister = mode === 'register';

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    const p = pseudo.trim();
    if (!PSEUDO_RE.test(p)) return setError('Pseudo : 3 à 16 caractères (lettres, chiffres, _ ou -).');
    if (password.length < 6) return setError('Mot de passe : 6 caractères minimum.');
    if (isRegister && password !== confirm) return setError('Les deux mots de passe ne correspondent pas.');
    setLoading(true);
    try {
      const data = isRegister ? await api.register(p, password) : await api.login(p, password);
      setToken(data.token);
      router.replace('/lobby');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
    return undefined;
  }

  return (
    <form className="auth-card" onSubmit={onSubmit} noValidate>
      <div className="auth-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={!isRegister} className={!isRegister ? 'active' : ''} onClick={() => setMode('login')}>
          Connexion
        </button>
        <button type="button" role="tab" aria-selected={isRegister} className={isRegister ? 'active' : ''} onClick={() => setMode('register')}>
          Inscription
        </button>
      </div>

      <label className="field">
        <span>Pseudo</span>
        <input
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={16}
          placeholder="ex : Vladimir"
          required
        />
      </label>

      <label className="field">
        <span>Mot de passe</span>
        <div className="password">
          <input
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            maxLength={72}
            placeholder="6 caractères minimum"
            required
          />
          <button type="button" className="eye" onClick={() => setShow((v) => !v)} aria-label={show ? 'Masquer' : 'Afficher'}>
            {show ? '🙈' : '👁️'}
          </button>
        </div>
      </label>

      {isRegister && (
        <label className="field">
          <span>Confirme le mot de passe</span>
          <input
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            maxLength={72}
            required
          />
        </label>
      )}

      {error && <p className="form-error">{error}</p>}

      <button className="btn btn-gold btn-block" disabled={loading}>
        {loading ? 'Un instant…' : isRegister ? 'Créer mon compte' : 'Entrer dans le couloir'}
      </button>
      <p className="auth-hint">
        {isRegister ? 'Déjà un compte ? ' : 'Pas encore de compte ? '}
        <button type="button" className="link" onClick={() => setMode(isRegister ? 'login' : 'register')}>
          {isRegister ? 'Se connecter' : 'S’inscrire'}
        </button>
      </p>
    </form>
  );
}
