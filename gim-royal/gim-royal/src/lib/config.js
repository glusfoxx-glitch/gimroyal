// URL du serveur de jeu. En production (Vercel) : NEXT_PUBLIC_GAME_SERVER_URL.
// En local : même hôte que la page, port 4000 (fonctionne aussi depuis un téléphone en Wi-Fi).
export function getServerUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_GAME_SERVER_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined') return `${window.location.protocol}//${window.location.hostname}:4000`;
  return 'http://localhost:4000';
}
