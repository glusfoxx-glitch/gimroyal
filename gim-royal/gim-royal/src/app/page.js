'use client';
// Page d'accueil : connexion / inscription (Pseudo + Mot de passe).
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ARENA_INFO } from '@shared/cards.js';
import AuthForm from '@/components/AuthForm';
import { api } from '@/lib/api';
import { getToken, clearToken } from '@/lib/session';

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setChecking(false);
      return;
    }
    api
      .me(token)
      .then(() => router.replace('/lobby'))
      .catch((err) => {
        if (err.status === 401) clearToken();
        setChecking(false);
      });
  }, [router]);

  return (
    <main className="auth-page">
      <div className="auth-hero">
        <div className="logo">
          <span className="logo-crown">👑</span>
          <h1>
            GIM <em>Royal</em>
          </h1>
          <p className="logo-sub">{ARENA_INFO.name}</p>
        </div>
        {checking ? <div className="spinner" aria-label="Chargement" /> : <AuthForm />}
        <p className="auth-foot">{ARENA_INFO.environnement}</p>
      </div>
    </main>
  );
}
