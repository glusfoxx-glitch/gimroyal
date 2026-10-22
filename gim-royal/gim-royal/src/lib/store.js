'use client';
// Mini-store global sans dépendance (compatible useSyncExternalStore).
// Les composants HUD s'abonnent à des valeurs primitives ; la scène 3D lit l'état
// directement dans useFrame (zéro re-render React à 60 FPS).
import { useSyncExternalStore } from 'react';

function createStore(initial) {
  let state = initial;
  const listeners = new Set();
  return {
    get: () => state,
    set(patch) {
      const next = typeof patch === 'function' ? patch(state) : patch;
      state = { ...state, ...next };
      for (const l of listeners) l();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const gameStore = createStore({
  connected: false,
  session: null, // { pseudo, wins, losses, draws }
  queue: null, // { mode, waiting, needed, since }
  match: null, // { matchId, mode, layoutId, index, team, players }
  matchChecked: false,
  snap: null, // dernier snapshot serveur
  unitKey: '', // ids des unités visibles (change uniquement à l'apparition / disparition)
  zoneKey: '',
  result: null, // { result, reason, myCrowns, enemyCrowns }
  toast: null, // { id, message }
  selected: -1, // index de carte sélectionnée (mode "tap pour poser")
});

/** Le sélecteur doit renvoyer une valeur primitive ou une référence stable. */
export function useGame(selector) {
  const get = () => selector(gameStore.get());
  return useSyncExternalStore(gameStore.subscribe, get, get);
}

let toastId = 0;
export function showToast(message) {
  toastId++;
  const id = toastId;
  gameStore.set({ toast: { id, message } });
  setTimeout(() => {
    if (gameStore.get().toast?.id === id) gameStore.set({ toast: null });
  }, 1800);
}
