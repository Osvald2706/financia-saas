import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../database';
import { AuthRequest } from '../middleware/auth';
import { notifyUser } from '../index';

export const transactionsRouter = Router();

transactionsRouter.get('/', (req: AuthRequest, res: Response) => {
  const { startDate, endDate, type, accountId, category, page = '1', limit = '50' } = req.query;
  let sql = 'SELECT t.*, a.name as account_name FROM transactions t LEFT JOIN accounts a ON t.account_id = a.id WHERE t.user_id = ?';
  const params: any[] = [req.userId];

  if (startDate) { sql += ' AND t.date >= ?'; params.push(startDate); }
  if (endDate) { sql += ' AND t.date <= ?'; params.push(endDate); }
  if (type) { sql += ' AND t.type = ?'; params.push(type); }
  if (accountId) { sql += ' AND t.account_id = ?'; params.push(accountId); }
  if (category) { sql += ' AND t.category = ?'; params.push(category); }

  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  sql += ' ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit as string), offset);

  const transactions = db.prepare(sql).all(...params);
  const countResult = db.prepare('SELECT COUNT(*) as total FROM transactions WHERE user_id = ?').get(req.userId) as any;

  res.json({ transactions, total: countResult.total, page: parseInt(page as string), limit: parseInt(limit as string) });
});

transactionsRouter.post('/', (req: AuthRequest, res: Response) => {
  const { accountId, type, category, amount, date, note } = req.body;
  if (!accountId || !type || !category || !amount || !date) {
    res.status(400).json({ error: 'accountId, type, category, amount and date are required' }); return;
  }

  const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(accountId, req.userId);
  if (!account) { res.status(404).json({ error: 'Account not found' }); return; }

  const id = uuid();
  db.prepare('INSERT INTO transactions (id, user_id, account_id, type, category, amount, date, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.userId, accountId, type, category, Math.abs(amount), date, note || null);

  const balanceChange = type === 'income' ? Math.abs(amount) : -Math.abs(amount);
  db.prepare('UPDATE accounts SET balance = balance + ?, updated_at = datetime(\'now\') WHERE id = ?').run(balanceChange, accountId);

  const txn = db.prepare('SELECT t.*, a.name as account_name FROM transactions t LEFT JOIN accounts a ON t.account_id = a.id WHERE t.id = ?').get(id);
  notifyUser(req.userId!, 'transaction_created', txn);
  res.status(201).json(txn);
});

transactionsRouter.put('/:id', (req: AuthRequest, res: Response) => {
  const existing = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any;
  if (!existing) { res.status(404).json({ error: 'Transaction not found' }); return; }

  const { accountId, type, category, amount, date, note } = req.body;

  if (accountId && accountId !== existing.account_id) {
    db.prepare('UPDATE accounts SET balance = balance - ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(existing.type === 'income' ? existing.amount : -existing.amount, existing.account_id);
    db.prepare('UPDATE accounts SET balance = balance + ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(type === 'income' ? Math.abs(amount) : -Math.abs(amount), accountId);
  } else if (amount || type) {
    const newAmount = amount ? Math.abs(amount) : existing.amount;
    const newType = type || existing.type;
    const oldEffect = existing.type === 'income' ? existing.amount : -existing.amount;
    const newEffect = newType === 'income' ? newAmount : -newAmount;
    const diff = newEffect - oldEffect;
    db.prepare('UPDATE accounts SET balance = balance + ?, updated_at = datetime(\'now\') WHERE id = ?').run(diff, existing.account_id);
  }

  db.prepare('UPDATE transactions SET account_id = COALESCE(?, account_id), type = COALESCE(?, type), category = COALESCE(?, category), amount = COALESCE(?, amount), date = COALESCE(?, date), note = COALESCE(?, note), updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?')
    .run(accountId || null, type || null, category || null, amount || null, date || null, note ?? null, req.params.id, req.userId);

  const txn = db.prepare('SELECT t.*, a.name as account_name FROM transactions t LEFT JOIN accounts a ON t.account_id = a.id WHERE t.id = ?').get(req.params.id);
  notifyUser(req.userId!, 'transaction_updated', txn);
  res.json(txn);
});

transactionsRouter.delete('/:id', (req: AuthRequest, res: Response) => {
  const existing = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any;
  if (!existing) { res.status(404).json({ error: 'Transaction not found' }); return; }

  const balanceChange = existing.type === 'income' ? -existing.amount : existing.amount;
  db.prepare('UPDATE accounts SET balance = balance + ?, updated_at = datetime(\'now\') WHERE id = ?').run(balanceChange, existing.account_id);
  db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  notifyUser(req.userId!, 'transaction_deleted', { id: req.params.id });
  res.json({ success: true });
});
