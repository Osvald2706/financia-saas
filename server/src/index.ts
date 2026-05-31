import express from 'express';
import cors from 'cors';
import path from 'path';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from './config';
import { initializeDatabase } from './database';
import { authRouter } from './routes/auth';
import { accountsRouter } from './routes/accounts';
import { transactionsRouter } from './routes/transactions';
import { debtsRouter } from './routes/debts';
import { goalsRouter } from './routes/goals';
import { analyticsRouter } from './routes/analytics';
import { aiRouter } from './routes/ai';
import { reportsRouter } from './routes/reports';
import { authMiddleware } from './middleware/auth';

const app = express();
const server = http.createServer(app);

const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRouter);
app.use('/api/accounts', authMiddleware, accountsRouter);
app.use('/api/transactions', authMiddleware, transactionsRouter);
app.use('/api/debts', authMiddleware, debtsRouter);
app.use('/api/goals', authMiddleware, goalsRouter);
app.use('/api/analytics', authMiddleware, analyticsRouter);
app.use('/api/ai', authMiddleware, aiRouter);
app.use('/api/reports', authMiddleware, reportsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const wss = new WebSocketServer({ server, path: '/ws' });

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

wss.on('connection', (ws: AuthenticatedSocket, req) => {
  ws.isAlive = true;

  ws.on('pong', () => { ws.isAlive = true; });

  const urlParams = new URLSearchParams(req.url?.split('?')[1] || '');
  const token = urlParams.get('token');
  if (!token) { ws.close(4001, 'Auth required'); return; }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
    ws.userId = decoded.userId;
    ws.send(JSON.stringify({ type: 'connected', message: 'Real-time sync active' }));
  } catch {
    ws.close(4001, 'Invalid token');
  }
});

const clients = new Map<string, Set<AuthenticatedSocket>>();

export function notifyUser(userId: string, event: string, data: any): void {
  wss.clients.forEach((client) => {
    const ws = client as AuthenticatedSocket;
    if (ws.userId === userId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: event, data }));
    }
  });
}

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    const client = ws as AuthenticatedSocket;
    if (client.isAlive === false) return client.terminate();
    client.isAlive = false;
    client.ping();
  });
}, 30000);

wss.on('close', () => clearInterval(interval));

initializeDatabase();

server.listen(config.port, () => {
  console.log(`🏦 Financia Server running on port ${config.port}`);
  console.log(`🔗 API: http://localhost:${config.port}/api`);
  console.log(`🔌 WS: ws://localhost:${config.port}/ws`);
});

export { app, server };
