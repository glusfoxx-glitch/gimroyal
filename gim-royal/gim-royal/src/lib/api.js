'use client';
import { getServerUrl } from './config';

async function request(path, { method = 'GET', body, token } = {}) {
  let res;
  try {
    res = await fetch(`${getServerUrl()}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Serveur de jeu injoignable. Vérifie qu’il est bien lancé.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Erreur ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  register: (pseudo, password) => request('/api/auth/register', { method: 'POST', body: { pseudo, password } }),
  login: (pseudo, password) => request('/api/auth/login', { method: 'POST', body: { pseudo, password } }),
  me: (token) => request('/api/me', { token }),
};
