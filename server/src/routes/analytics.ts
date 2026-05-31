import { Router, Response } from 'express';
import db from '../database';
import { AuthRequest } from '../middleware/auth';

export const analyticsRouter = Router();

analyticsRouter.get('/dashboard', (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const accounts = db.prepare('SELECT SUM(balance) as total FROM accounts WHERE user_id = ?').get(userId) as any;
  const totalBalance = accounts?.total || 0;

  const monthlyIncome = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id = ? AND type = \'income\' AND strftime(\'%Y\', date) = ? AND strftime(\'%m\', date) = ?')
    .get(userId, String(year), String(month).padStart(2, '0')) as any;
  const monthlyExpenses = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id = ? AND type = \'expense\' AND strftime(\'%Y\', date) = ? AND strftime(\'%m\', date) = ?')
    .get(userId, String(year), String(month).padStart(2, '0')) as any;

  const totalDebt = db.prepare('SELECT COALESCE(SUM(total_amount - paid_amount),0) as total FROM debts WHERE user_id = ?').get(userId) as any;
  const activeDebts = db.prepare('SELECT COUNT(*) as count FROM debts WHERE user_id = ? AND paid_amount < total_amount').get(userId) as any;

  const totalIncome = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id = ? AND type = \'income\'').get(userId) as any;
  const totalExpenses = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id = ? AND type = \'expense\'').get(userId) as any;
  const savings = Math.max(0, totalIncome.total - totalExpenses.total);

  const goals = db.prepare('SELECT COUNT(*) as total, COALESCE(SUM(saved_amount),0) as saved, COALESCE(SUM(target_amount),0) as target FROM goals WHERE user_id = ?').get(userId) as any;

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevIncome = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id = ? AND type = \'income\' AND strftime(\'%Y\', date) = ? AND strftime(\'%m\', date) = ?')
    .get(userId, String(prevYear), String(prevMonth).padStart(2, '0')) as any;
  const prevExpenses = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id = ? AND type = \'expense\' AND strftime(\'%Y\', date) = ? AND strftime(\'%m\', date) = ?')
    .get(userId, String(prevYear), String(prevMonth).padStart(2, '0')) as any;

  const incomeChange = prevIncome.total > 0 ? ((monthlyIncome.total - prevIncome.total) / prevIncome.total) * 100 : 0;
  const expenseChange = prevExpenses.total > 0 ? ((monthlyExpenses.total - prevExpenses.total) / prevExpenses.total) * 100 : 0;

  res.json({
    totalBalance,
    monthlyIncome: monthlyIncome.total,
    monthlyExpenses: monthlyExpenses.total,
    cashflow: monthlyIncome.total - monthlyExpenses.total,
    savings,
    totalDebt: totalDebt.total,
    activeDebts: activeDebts.count,
    netWorth: totalBalance - totalDebt.total,
    savingsRate: monthlyIncome.total > 0 ? ((monthlyIncome.total - monthlyExpenses.total) / monthlyIncome.total) * 100 : 0,
    incomeChange,
    expenseChange,
    goals: { total: goals.total || 0, saved: goals.saved || 0, target: goals.target || 0 },
  });
});

analyticsRouter.get('/expenses-by-category', (req: AuthRequest, res: Response) => {
  const { year, month } = req.query;
  const userId = req.userId!;
  const now = new Date();
  const y = year || String(now.getFullYear());
  const m = month || String(now.getMonth() + 1).padStart(2, '0');

  const categories = db.prepare('SELECT category, SUM(amount) as total FROM transactions WHERE user_id = ? AND type = \'expense\' AND strftime(\'%Y\', date) = ? AND strftime(\'%m\', date) = ? GROUP BY category ORDER BY total DESC')
    .all(userId, String(y), String(m).padStart(2, '0'));
  res.json(categories);
});

analyticsRouter.get('/income-by-category', (req: AuthRequest, res: Response) => {
  const { year, month } = req.query;
  const userId = req.userId!;
  const now = new Date();
  const y = year || String(now.getFullYear());
  const m = month || String(now.getMonth() + 1).padStart(2, '0');

  const categories = db.prepare('SELECT category, SUM(amount) as total FROM transactions WHERE user_id = ? AND type = \'income\' AND strftime(\'%Y\', date) = ? AND strftime(\'%m\', date) = ? GROUP BY category ORDER BY total DESC')
    .all(userId, String(y), String(m).padStart(2, '0'));
  res.json(categories);
});

analyticsRouter.get('/monthly-trends', (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const months = db.prepare(`
    SELECT strftime('%Y-%m', date) as month,
           SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
           SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expenses
    FROM transactions WHERE user_id = ?
    GROUP BY month ORDER BY month DESC LIMIT 12
  `).all(userId);
  res.json(months.reverse());
});

analyticsRouter.get('/upcoming-payments', (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const today = new Date().toISOString().split('T')[0];
  const thirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const debts = db.prepare('SELECT * FROM debts WHERE user_id = ? AND due_date BETWEEN ? AND ? AND paid_amount < total_amount ORDER BY due_date ASC')
    .all(userId, today, thirtyDays);

  const recurring = db.prepare('SELECT r.*, a.name as account_name FROM recurring_transactions r LEFT JOIN accounts a ON r.account_id = a.id WHERE r.user_id = ? AND r.active = 1 AND r.next_date BETWEEN ? AND ? ORDER BY r.next_date ASC')
    .all(userId, today, thirtyDays);

  res.json({ debts, recurring });
});

analyticsRouter.get('/health-score', (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const allIncome = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id = ? AND type = \'income\'').get(userId) as any;
  const allExpenses = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id = ? AND type = \'expense\'').get(userId) as any;
  const totalDebt = db.prepare('SELECT COALESCE(SUM(total_amount - paid_amount),0) as total FROM debts WHERE user_id = ?').get(userId) as any;
  const txCount = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE user_id = ?').get(userId) as any;

  if (txCount.count === 0) {
    res.json({ score: 0, level: 'Sin datos', color: '#666' });
    return;
  }

  let score = 50;
  const savingsRate = allIncome.total > 0 ? ((allIncome.total - allExpenses.total) / allIncome.total) * 100 : 0;
  score += Math.min(25, savingsRate * 0.5);

  const debtRatio = allIncome.total > 0 ? totalDebt.total / allIncome.total : 0;
  score -= Math.min(30, debtRatio * 20);

  const monthsActive = db.prepare('SELECT COUNT(DISTINCT strftime(\'%Y-%m\', date)) as count FROM transactions WHERE user_id = ? AND type = \'income\'').get(userId) as any;
  score += Math.min(15, monthsActive.count * 3);

  if (allIncome.total > 0) {
    const expRatio = allExpenses.total / allIncome.total;
    if (expRatio < 0.5) score += 10;
    else if (expRatio < 0.7) score += 5;
    else if (expRatio < 0.9) score += 2;
  }

  if (allIncome.total > allExpenses.total && allIncome.total > 0) score += 10;

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  let level, color;
  if (finalScore >= 90) { level = 'Excelente'; color = '#00c853'; }
  else if (finalScore >= 70) { level = 'Buena'; color = '#2979ff'; }
  else if (finalScore >= 50) { level = 'Regular'; color = '#ff9100'; }
  else if (finalScore >= 25) { level = 'Precaria'; color = '#ff1744'; }
  else { level = 'Crítica'; color = '#d50000'; }

  res.json({ score: finalScore, level, color });
});
