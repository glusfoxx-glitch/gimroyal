// =============================================================================
// GIM ROYAL — Serveur multijoueur (Node.js + Socket.io).
// Lancement : `npm run dev:server` (dev) ou `npm run start:server` (prod).
// À héberger sur un service à connexions persistantes (Render, Railway, Fly.io) :
// Vercel (serverless) ne garde pas de WebSocket ouverte.
// =============================================================================

import './env.js';
import http from 'node:http';
import crypto from 'node:crypto';
import { Server } from 'socket.io';
import { createDb } from './db.js';
import { createHttpHandler } from './http.js';
import { verifyToken } from './auth.js';
import { Matchmaker } from './matchmaking.js';

const PORT = Number(process.env.PORT) || 4000;
const corsOrigins = (process.env.CLIENT_ORIGIN || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    console.error('JWT_SECRET manquant ou trop court (32 caractères minimum). Arrêt.');
    process.exit(1);
  }
  jwtSecret = crypto.randomBytes(48).toString('hex');
  console.warn('[auth] JWT_SECRET absent : secret temporaire généré (les sessions sautent à chaque redémarrage).');
}

const db = await createDb();
const server = http.createServer(createHttpHandler({ db, jwtSecret, corsOrigins }));

const io = new Server(server, {
  cors: { origin: corsOrigins.includes('*') ? '*' : corsOrigins, methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
  pingInterval: 10000,
  pingTimeout: 8000,
  perMessageDeflate: { threshold: 1024 },
  maxHttpBufferSize: 16 * 1024,
});

io.use((socket, next) => {
  const payload = verifyToken(socket.handshake.auth?.token, jwtSecret);
  if (!payload) return next(new Error('AUTH'));
  socket.data.pseudo = payload.sub;
  next();
});

const matchmaker = new Matchmaker({ io, db });
io.on('connection', (socket) => matchmaker.handleConnection(socket));

server.listen(PORT, () => {
  console.log(`🏫 GIM Royal — serveur de jeu prêt sur le port ${PORT}`);
});

async function shutdown() {
  console.log('Arrêt du serveur…');
  matchmaker.stop();
  io.close();
  if (db.flush) await db.flush().catch(() => {});
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
