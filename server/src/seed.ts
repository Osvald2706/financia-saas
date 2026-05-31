import { initializeDatabase } from './database';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import db from './database';

console.log('🌱 Seeding database...');
initializeDatabase();

const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@financia.app');
if (existingUser) {
  console.log('⚠️ Demo user already exists, skipping seed.');
  process.exit(0);
}

const userId = uuid();
const hash = bcrypt.hashSync('demo1234', 12);
db.prepare('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)').run(userId, 'demo@financia.app', 'Usuario Demo', hash);

const account1 = uuid();
const account2 = uuid();
const account3 = uuid();

db.prepare('INSERT INTO accounts (id, user_id, name, type, balance, color) VALUES (?, ?, ?, ?, ?, ?)').run(account1, userId, 'BBVA', 'checking', 25000, '#2979ff');
db.prepare('INSERT INTO accounts (id, user_id, name, type, balance, color) VALUES (?, ?, ?, ?, ?, ?)').run(account2, userId, 'Efectivo', 'cash', 8500, '#00c853');
db.prepare('INSERT INTO accounts (id, user_id, name, type, balance, color) VALUES (?, ?, ?, ?, ?, ?)').run(account3, userId, 'Nu', 'savings', 15000, '#7c4dff');

const transactions = [
  { type: 'income', category: 'Salario', amount: 18000, date: '2026-05-01', accountId: account1 },
  { type: 'income', category: 'Freelance', amount: 4500, date: '2026-05-05', accountId: account1 },
  { type: 'expense', category: 'Comida', amount: 3200, date: '2026-05-03', accountId: account2 },
  { type: 'expense', category: 'Transporte', amount: 1200, date: '2026-05-04', accountId: account2 },
  { type: 'expense', category: 'Servicios', amount: 2100, date: '2026-05-06', accountId: account1 },
  { type: 'expense', category: 'Suscripciones', amount: 850, date: '2026-05-07', accountId: account1 },
  { type: 'expense', category: 'Entretenimiento', amount: 1400, date: '2026-05-10', accountId: account2 },
  { type: 'expense', category: 'Salud', amount: 900, date: '2026-05-12', accountId: account2 },
  { type: 'income', category: 'Negocios', amount: 3200, date: '2026-05-15', accountId: account3 },
  { type: 'expense', category: 'Compras', amount: 2500, date: '2026-05-18', accountId: account1 },
  { type: 'expense', category: 'Comida', amount: 1800, date: '2026-05-20', accountId: account2 },
  { type: 'expense', category: 'Transporte', amount: 600, date: '2026-05-22', accountId: account2 },
  { type: 'income', category: 'Salario', amount: 18000, date: '2026-06-01', accountId: account1 },
  { type: 'expense', category: 'Comida', amount: 2800, date: '2026-06-02', accountId: account2 },
  { type: 'expense', category: 'Servicios', amount: 2100, date: '2026-06-05', accountId: account1 },
];

const insertTxn = db.prepare('INSERT INTO transactions (id, user_id, account_id, type, category, amount, date) VALUES (?, ?, ?, ?, ?, ?, ?)');
transactions.forEach(t => {
  insertTxn.run(uuid(), userId, t.accountId, t.type, t.category, t.amount, t.date);
});

const debts = [
  { name: 'Tarjeta de Crédito', creditor: 'BBVA', totalAmount: 15000, paidAmount: 3000, interestRate: 24, dueDate: '2026-06-15' },
  { name: 'Préstamo Personal', creditor: 'Kueski', totalAmount: 8000, paidAmount: 2000, interestRate: 18, dueDate: '2026-07-10' },
  { name: 'Deuda Familiar', creditor: 'Papá', totalAmount: 5000, paidAmount: 1000, interestRate: 0, dueDate: '2026-12-31' },
];

const insertDebt = db.prepare('INSERT INTO debts (id, user_id, name, creditor, total_amount, paid_amount, interest_rate, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
debts.forEach(d => {
  insertDebt.run(uuid(), userId, d.name, d.creditor, d.totalAmount, d.paidAmount, d.interestRate, d.dueDate);
});

const goals = [
  { name: 'Fondo de Emergencia', targetAmount: 30000, savedAmount: 8500, deadline: '2026-12-31', icon: '🛡️' },
  { name: 'Viaje a Japón', targetAmount: 50000, savedAmount: 5000, deadline: '2027-06-30', icon: '✈️' },
  { name: 'Nueva Laptop', targetAmount: 25000, savedAmount: 12000, deadline: '2026-08-31', icon: '💻' },
];

const insertGoal = db.prepare('INSERT INTO goals (id, user_id, name, target_amount, saved_amount, deadline, icon) VALUES (?, ?, ?, ?, ?, ?, ?)');
goals.forEach(g => {
  insertGoal.run(uuid(), userId, g.name, g.targetAmount, g.savedAmount, g.deadline, g.icon);
});

console.log('✅ Database seeded successfully!');
console.log('📧 Email: demo@financia.app');
console.log('🔑 Password: demo1234');
