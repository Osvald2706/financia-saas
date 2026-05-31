import { Router, Response } from 'express';
import db from '../database';
import { AuthRequest } from '../middleware/auth';
import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';

export const reportsRouter = Router();

reportsRouter.get('/pdf', (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  const transactions = db.prepare('SELECT t.*, a.name as account_name FROM transactions t LEFT JOIN accounts a ON t.account_id = a.id WHERE t.user_id = ? ORDER BY t.date DESC LIMIT 100').all(userId);
  const debts = db.prepare('SELECT * FROM debts WHERE user_id = ?').all(userId);
  const accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ?').all(userId);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=financia-report-${new Date().toISOString().split('T')[0]}.pdf`);
  doc.pipe(res);

  doc.fontSize(24).font('Helvetica-Bold').text('Financia', { align: 'center' });
  doc.fontSize(12).font('Helvetica').text(`Reporte Financiero - ${user?.name || 'Usuario'}`, { align: 'center' });
  doc.fontSize(10).text(`Generado: ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });
  doc.moveDown(1.5);

  doc.fontSize(16).font('Helvetica-Bold').text('Resumen');
  doc.moveDown(0.5);

  const totalBalance = accounts.reduce((s: number, a: any) => s + a.balance, 0);
  const totalDebt = debts.reduce((s: number, d: any) => s + (d.total_amount - d.paid_amount), 0);
  const totalIncome = transactions.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0);
  const totalExpenses = transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0);

  doc.fontSize(11).font('Helvetica');
  doc.text(`Balance Total: $${totalBalance.toLocaleString()}`);
  doc.text(`Deuda Total: $${totalDebt.toLocaleString()}`);
  doc.text(`Patrimonio Neto: $${(totalBalance - totalDebt).toLocaleString()}`);
  doc.text(`Ingresos Totales: $${totalIncome.toLocaleString()}`);
  doc.text(`Gastos Totales: $${totalExpenses.toLocaleString()}`);
  doc.moveDown(1);

  if (accounts.length > 0) {
    doc.fontSize(16).font('Helvetica-Bold').text('Cuentas');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    accounts.forEach((a: any) => {
      doc.text(`• ${a.name} (${a.type}): $${a.balance.toLocaleString()}`);
    });
    doc.moveDown(1);
  }

  if (debts.length > 0) {
    doc.fontSize(16).font('Helvetica-Bold').text('Deudas');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    debts.forEach((d: any) => {
      const remaining = d.total_amount - d.paid_amount;
      const pct = d.total_amount > 0 ? ((d.paid_amount / d.total_amount) * 100).toFixed(0) : 0;
      doc.text(`• ${d.name}: $${remaining.toLocaleString()} restantes (${pct}% pagado)`);
    });
    doc.moveDown(1);
  }

  if (transactions.length > 0) {
    doc.fontSize(16).font('Helvetica-Bold').text('Últimos Movimientos');
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica');
    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Fecha', 40, tableTop);
    doc.text('Categoría', 120, tableTop);
    doc.text('Cuenta', 230, tableTop);
    doc.text('Monto', 400, tableTop, { align: 'right' });
    doc.moveDown(0.3);
    doc.font('Helvetica');

    let y = doc.y;
    transactions.slice(0, 30).forEach((t: any) => {
      if (y > 720) { doc.addPage(); y = 40; }
      const sign = t.type === 'income' ? '+' : '-';
      const color = t.type === 'income' ? '#00c853' : '#ff1744';
      doc.fontSize(9).fillColor(color).text(sign + '$' + Math.abs(t.amount).toLocaleString(), 400, y, { align: 'right' });
      doc.fillColor('#000').text(new Date(t.date).toLocaleDateString('es-MX'), 40, y);
      doc.text(t.category, 120, y);
      doc.text(t.account_name || '—', 230, y);
      y += 16;
    });
  }

  doc.end();
});

reportsRouter.get('/excel', (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const transactions = db.prepare('SELECT t.*, a.name as account_name FROM transactions t LEFT JOIN accounts a ON t.account_id = a.id WHERE t.user_id = ? ORDER BY t.date DESC').all(userId);
  const debts = db.prepare('SELECT * FROM debts WHERE user_id = ?').all(userId);
  const accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ?').all(userId);
  const goals = db.prepare('SELECT * FROM goals WHERE user_id = ?').all(userId);

  const wb = XLSX.utils.book_new();

  const txnData = transactions.map((t: any) => ({
    Fecha: t.date,
    Tipo: t.type === 'income' ? 'Ingreso' : 'Gasto',
    Categoría: t.category,
    Cuenta: t.account_name || '—',
    Monto: t.type === 'income' ? t.amount : -t.amount,
    Nota: t.note || '',
  }));
  const txnSheet = XLSX.utils.json_to_sheet(txnData);
  XLSX.utils.book_append_sheet(wb, txnSheet, 'Movimientos');

  const debtData = debts.map((d: any) => ({
    Nombre: d.name,
    Acreedor: d.creditor || '—',
    'Monto Total': d.total_amount,
    'Monto Pagado': d.paid_amount,
    Restante: d.total_amount - d.paid_amount,
    'Tasa Interés': d.interest_rate + '%',
    'Fecha Vencimiento': d.due_date || '—',
  }));
  const debtSheet = XLSX.utils.json_to_sheet(debtData);
  XLSX.utils.book_append_sheet(wb, debtSheet, 'Deudas');

  const accountData = accounts.map((a: any) => ({
    Nombre: a.name,
    Tipo: a.type,
    Saldo: a.balance,
  }));
  const accSheet = XLSX.utils.json_to_sheet(accountData);
  XLSX.utils.book_append_sheet(wb, accSheet, 'Cuentas');

  const goalData = goals.map((g: any) => ({
    Meta: g.name,
    'Monto Objetivo': g.target_amount,
    'Monto Ahorrado': g.saved_amount,
    Restante: g.target_amount - g.saved_amount,
    Progreso: g.target_amount > 0 ? ((g.saved_amount / g.target_amount) * 100).toFixed(0) + '%' : '0%',
    'Fecha Límite': g.deadline || '—',
  }));
  const goalSheet = XLSX.utils.json_to_sheet(goalData);
  XLSX.utils.book_append_sheet(wb, goalSheet, 'Metas');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=financia-data-${new Date().toISOString().split('T')[0]}.xlsx`);
  res.send(buf);
});
