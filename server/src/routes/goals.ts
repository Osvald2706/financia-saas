import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../database';
import { AuthRequest } from '../middleware/auth';
import { notifyUser } from '../index';

export const goalsRouter = Router();

goalsRouter.get('/', (req: AuthRequest, res: Response) => {
  const goals = db.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  res.json(goals);
});

goalsRouter.post('/', (req: AuthRequest, res: Response) => {
  const { name, targetAmount, savedAmount, deadline, icon, category } = req.body;
  if (!name || !targetAmount) { res.status(400).json({ error: 'Name and targetAmount are required' }); return; }
  const id = uuid();
  db.prepare('INSERT INTO goals (id, user_id, name, target_amount, saved_amount, deadline, icon, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.userId, name, targetAmount, savedAmount || 0, deadline || null, icon || '🎯', category || 'general');
  const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
  notifyUser(req.userId!, 'goal_created', goal);
  res.status(201).json(goal);
});

goalsRouter.put('/:id', (req: AuthRequest, res: Response) => {
  const existing = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any;
  if (!existing) { res.status(404).json({ error: 'Goal not found' }); return; }
  const { name, targetAmount, savedAmount, deadline, icon, category } = req.body;
  db.prepare('UPDATE goals SET name = COALESCE(?, name), target_amount = COALESCE(?, target_amount), saved_amount = COALESCE(?, saved_amount), deadline = COALESCE(?, deadline), icon = COALESCE(?, icon), category = COALESCE(?, category), updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?')
    .run(name || null, targetAmount ?? null, savedAmount ?? null, deadline ?? null, icon || null, category || null, req.params.id, req.userId);
  const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
  notifyUser(req.userId!, 'goal_updated', goal);
  res.json(goal);
});

goalsRouter.delete('/:id', (req: AuthRequest, res: Response) => {
  const existing = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) { res.status(404).json({ error: 'Goal not found' }); return; }
  db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  notifyUser(req.userId!, 'goal_deleted', { id: req.params.id });
  res.json({ success: true });
});
