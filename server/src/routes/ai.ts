import { Router, Response } from 'express';
import db from '../database';
import { AuthRequest } from '../middleware/auth';
import { generateFinancialAnalysis } from '../services/ai';

export const aiRouter = Router();

aiRouter.post('/analyze', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC LIMIT 100').all(userId);
    const debts = db.prepare('SELECT * FROM debts WHERE user_id = ?').all(userId);
    const accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ?').all(userId);
    const goals = db.prepare('SELECT * FROM goals WHERE user_id = ?').all(userId);

    const analysis = await generateFinancialAnalysis({ transactions, debts, accounts, goals });
    res.json(analysis);
  } catch (err: any) {
    res.status(500).json({ error: err.message, fallback: generateFallbackAnalysis(req.userId!) });
  }
});

aiRouter.post('/debt-plan', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const debts = db.prepare('SELECT * FROM debts WHERE user_id = ? AND paid_amount < total_amount ORDER BY total_amount ASC').all(userId) as any[];
    const monthlyIncome = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id = ? AND type = \'income\' AND strftime(\'%Y-%m\', date) = strftime(\'%Y-%m\', \'now\')').get(userId) as any;
    const monthlyExpenses = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id = ? AND type = \'expense\' AND strftime(\'%Y-%m\', date) = strftime(\'%Y-%m\', \'now\')').get(userId) as any;

    const disposable = Math.max(0, monthlyIncome.total - monthlyExpenses.total);
    const totalRemaining = debts.reduce((s: number, d: any) => s + (d.total_amount - d.paid_amount), 0);

    const plan = debts.map((d: any) => {
      const remaining = d.total_amount - d.paid_amount;
      const months = disposable > 0 ? Math.ceil(remaining / disposable) : 999;
      return {
        id: d.id,
        name: d.name,
        remaining,
        interestRate: d.interest_rate,
        suggestedMonthlyPayment: disposable > 0 ? Math.min(remaining, disposable) : 0,
        estimatedMonths: months,
        strategy: d.interest_rate > 15 ? 'pay_first' : remaining < 5000 ? 'pay_fast' : 'avalanche',
      };
    });

    plan.sort((a: any, b: any) => b.interestRate - a.interestRate);

    const totalMonths = disposable > 0 ? Math.ceil(totalRemaining / disposable) : 999;
    const completionDate = new Date();
    completionDate.setMonth(completionDate.getMonth() + totalMonths);

    res.json({
      plan,
      summary: {
        totalDebt: totalRemaining,
        disposableIncome: disposable,
        estimatedMonths: totalMonths,
        estimatedCompletionDate: completionDate.toISOString().split('T')[0],
        strategy: 'avalanche',
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

aiRouter.post('/predictions', (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const predictions: any[] = [];

  const income = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id = ? AND type = \'income\' AND strftime(\'%Y-%m\', date) = strftime(\'%Y-%m\', \'now\')').get(userId) as any;
  const expenses = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id = ? AND type = \'expense\' AND strftime(\'%Y-%m\', date) = strftime(\'%Y-%m\', \'now\')').get(userId) as any;
  const cashflow = income.total - expenses.total;

  if (cashflow > 0) {
    predictions.push({ icon: '💰', text: `Si mantienes este ritmo, ahorrarás <strong>$${(cashflow * 6).toLocaleString()}</strong> en 6 meses.` });
  }

  const lastMonth = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id = ? AND type = \'expense\' AND strftime(\'%Y-%m\', date) = strftime(\'%Y-%m\', \'now\', \'-1 month\')').get(userId) as any;
  if (lastMonth.total > 0) {
    const change = ((expenses.total - lastMonth.total) / lastMonth.total) * 100;
    predictions.push({
      icon: change > 0 ? '📈' : '📉',
      text: change > 0
        ? `Tus gastos aumentaron <strong>${Math.abs(change).toFixed(0)}%</strong> respecto al mes anterior.`
        : `Redujiste gastos en <strong>${Math.abs(change).toFixed(0)}%</strong> vs. el mes pasado.`,
    });
  }

  const totalDebt = db.prepare('SELECT COALESCE(SUM(total_amount - paid_amount),0) as total FROM debts WHERE user_id = ?').get(userId) as any;
  if (totalDebt.total > 0 && cashflow > 0) {
    const months = Math.ceil(totalDebt.total / cashflow);
    predictions.push({ icon: '⏱️', text: `Tu deuda podría liquidarse en aproximadamente <strong>${months} meses</strong>.` });
  }

  if (predictions.length === 0) {
    predictions.push({ icon: '📊', text: 'Agrega más datos financieros para obtener predicciones personalizadas.' });
  }

  res.json(predictions);
});

function generateFallbackAnalysis(userId: string) {
  const income = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id = ? AND type = \'income\'').get(userId) as any;
  const expenses = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id = ? AND type = \'expense\'').get(userId) as any;
  const debts = db.prepare('SELECT * FROM debts WHERE user_id = ?').all(userId) as any[];
  const totalDebt = debts.reduce((s: number, d: any) => s + (d.total_amount - d.paid_amount), 0);

  return {
    summary: `Tus ingresos totales son $${income.total.toLocaleString()} y tus gastos $${expenses.total.toLocaleString()}. Tu deuda total es $${totalDebt.toLocaleString()}.`,
    recommendations: expenses.total > income.total * 0.7 ? ['Tus gastos son altos respecto a tus ingresos. Considera reducir gastos en categorías no esenciales.'] : [],
    unnecessaryExpenses: [],
    debtFreeEstimate: totalDebt > 0 && (income.total - expenses.total) > 0
      ? `${Math.ceil(totalDebt / (income.total - expenses.total))} meses`
      : 'No es posible estimar con los datos actuales',
    healthTips: [
      'Registra todos tus gastos para tener mejor visibilidad',
      'Intenta ahorrar al menos el 20% de tus ingresos',
      'Revisa tus suscripciones mensuales',
    ],
  };
}
