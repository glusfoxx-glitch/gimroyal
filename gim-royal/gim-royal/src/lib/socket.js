'use client';
// Connexion Socket.io unique pour toute l'application (lobby -> partie -> lobby).
import { io } from 'socket.io-client';
import { getServerUrl } from './config';
import { getToken, clearToken } from './session';
import { gameStore, showToast } from './store';
import { applySnapshot, resetRegistry } from './registry';

let socket = null;

export function getSocket() {
  return socket;
}

export function connectSocket() {
  if (socket) return socket;
  const token = getToken();
  if (!token) return null;
  socket = io(getServerUrl(), {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
  });

  socket.on('connect', () => gameStore.set({ connected: true }));
  socket.on('disconnect', () => gameStore.set({ connected: false }));
  socket.on('connect_error', (err) => {
    if (err?.message === 'AUTH') {
      clearToken();
      disconnectSocket();
      window.location.href = '/';
    }
  });
  socket.on('session', (profile) => gameStore.set({ session: profile }));
  socket.on('queue:status', (q) => gameStore.set({ queue: q && q.mode ? q : null }));
  socket.on('match:found', (m) => {
    const current = gameStore.get().match;
    if (!current || current.matchId !== m.matchId) {
      resetRegistry();
      gameStore.set({ match: m, matchChecked: true, snap: null, result: null, queue: null, unitKey: '', zoneKey: '', selected: -1 });
    } else {
      gameStore.set({ match: m, matchChecked: true });
    }
  });
  socket.on('match:none', () => gameStore.set({ match: null, matchChecked: true }));
  socket.on('s', (s) => applySnapshot(s));
  socket.on('match:end', (r) => gameStore.set({ result: r }));
  socket.on('toast', (t) => t?.message && showToast(t.message));
  socket.on('kicked', (t) => {
    showToast(t?.message || 'Session fermée.');
    disconnectSocket();
    setTimeout(() => {
      window.location.href = '/';
    }, 1600);
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  gameStore.set({ connected: false });
}

export function emit(event, data) {
  if (socket) socket.emit(event, data);
}

export function leaveMatchView() {
  resetRegistry();
  gameStore.set({ match: null, matchChecked: false, snap: null, result: null, unitKey: '', zoneKey: '', selected: -1 });
}
