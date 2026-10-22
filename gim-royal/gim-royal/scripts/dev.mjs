// Lance en parallèle le front Next.js (port 3000) et le serveur de jeu (port 4000).
// Fonctionne sous Windows, macOS et Linux. Ctrl+C arrête les deux.
import { spawn } from 'node:child_process';

const procs = [
  spawn('npm run dev:server', { shell: true, stdio: 'inherit' }),
  spawn('npm run dev:web', { shell: true, stdio: 'inherit' }),
];

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const p of procs) if (!p.killed) p.kill('SIGINT');
  setTimeout(() => process.exit(code), 300);
}

for (const p of procs) p.on('exit', (code) => stop(code ?? 0));
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
