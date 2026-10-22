'use client';
// Persistance locale : jeton de session et deck préféré (try/catch : navigation privée).
import { DEFAULT_DECK, validateDeck } from '@shared/cards.js';

const TOKEN_KEY = 'gimroyal.token';
const DECK_KEY = 'gimroyal.deck';

export function getToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* stockage indisponible : la session durera le temps de l'onglet */
  }
}

export function clearToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* rien à faire */
  }
}

export function getDeck() {
  try {
    const deck = JSON.parse(window.localStorage.getItem(DECK_KEY) || 'null');
    return validateDeck(deck) ? deck : [...DEFAULT_DECK];
  } catch {
    return [...DEFAULT_DECK];
  }
}

export function saveDeck(deck) {
  try {
    window.localStorage.setItem(DECK_KEY, JSON.stringify(deck));
  } catch {
    /* rien à faire */
  }
}
