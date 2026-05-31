import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../database';
import { AuthRequest } from '../middleware/auth';
import { notifyUser } from '../index';

export const accountsRouter = Router();

accountsRouter.get('/', (req: AuthRequest, res: Response) => {
  const accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  res.json(accounts);
});

accountsRouter.get('/:id', (req: AuthRequest, res: Response) => {
  const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!account) { res.status(404).json({ error: 'Account not found' }); return; }
  res.json(account);
});

accountsRouter.post('/', (req: AuthRequest, res: Response) => {
  const { name, type, balance, color } = req.body;
  if (!name) { res.status(400).json({ error: 'Name is required' }); return; }
  const id = uuid();
  db.prepare('INSERT INTO accounts (id, user_id, name, type, balance, color) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, req.userId, name, type || 'checking', balance || 0, color || null);
  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
  notifyUser(req.userId!, 'account_created', account);
  res.status(201).json(account);
});

accountsRouter.put('/:id', (req: AuthRequest, res: Response) => {
  const { name, type, balance, color } = req.body;
  const existing = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any;
  if (!existing) { res.status(404).json({ error: 'Account not found' }); return; }
  db.prepare('UPDATE accounts SET name = ?, type = ?, balance = ?, color = COALESCE(?, color), updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?')
    .run(name || existing.name, type || existing.type, balance ?? existing.balance, color || null, req.params.id, req.userId);
  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id);
  notifyUser(req.userId!, 'account_updated', account);
  res.json(account);
});

accountsRouter.delete('/:id', (req: AuthRequest, res: Response) => {
  const existing = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) { res.status(404).json({ error: 'Account not found' }); return; }
  db.prepare('DELETE FROM transactions WHERE account_id = ?').run(req.params.id);
  db.prepare('DELETE FROM accounts WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  notifyUser(req.userId!, 'account_deleted', { id: req.params.id });
  res.json({ success: true });
});
