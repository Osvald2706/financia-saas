import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../database';
import { AuthRequest } from '../middleware/auth';
import { notifyUser } from '../index';

export const debtsRouter = Router();

debtsRouter.get('/', (req: AuthRequest, res: Response) => {
  const debts = db.prepare('SELECT * FROM debts WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  res.json(debts);
});

debtsRouter.post('/', (req: AuthRequest, res: Response) => {
  const { name, creditor, totalAmount, paidAmount, interestRate, dueDate, category, notes } = req.body;
  if (!name || !totalAmount) { res.status(400).json({ error: 'Name and totalAmount are required' }); return; }
  const id = uuid();
  db.prepare('INSERT INTO debts (id, user_id, name, creditor, total_amount, paid_amount, interest_rate, due_date, category, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.userId, name, creditor || null, totalAmount, paidAmount || 0, interestRate || 0, dueDate || null, category || 'other', notes || null);
  const debt = db.prepare('SELECT * FROM debts WHERE id = ?').get(id);
  notifyUser(req.userId!, 'debt_created', debt);
  res.status(201).json(debt);
});

debtsRouter.put('/:id', (req: AuthRequest, res: Response) => {
  const existing = db.prepare('SELECT * FROM debts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any;
  if (!existing) { res.status(404).json({ error: 'Debt not found' }); return; }
  const { name, creditor, totalAmount, paidAmount, interestRate, dueDate, category, notes } = req.body;
  db.prepare('UPDATE debts SET name = COALESCE(?, name), creditor = COALESCE(?, creditor), total_amount = COALESCE(?, total_amount), paid_amount = COALESCE(?, paid_amount), interest_rate = COALESCE(?, interest_rate), due_date = COALESCE(?, due_date), category = COALESCE(?, category), notes = COALESCE(?, notes), updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?')
    .run(name || null, creditor ?? null, totalAmount ?? null, paidAmount ?? null, interestRate ?? null, dueDate ?? null, category || null, notes ?? null, req.params.id, req.userId);
  const debt = db.prepare('SELECT * FROM debts WHERE id = ?').get(req.params.id);
  notifyUser(req.userId!, 'debt_updated', debt);
  res.json(debt);
});

debtsRouter.delete('/:id', (req: AuthRequest, res: Response) => {
  const existing = db.prepare('SELECT * FROM debts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) { res.status(404).json({ error: 'Debt not found' }); return; }
  db.prepare('DELETE FROM debts WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  notifyUser(req.userId!, 'debt_deleted', { id: req.params.id });
  res.json({ success: true });
});
