const path = require('path');
const fs = require('fs');
const serverless = require('serverless-http');

const dbPath = '/tmp/financia.db';
process.env.DATABASE_PATH = dbPath;
process.env.VERCEL = 'true';

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const serverDist = path.resolve(__dirname, '..', 'server', 'dist');

const { default: db, initializeDatabase } = require(path.join(serverDist, 'database.js'));
initializeDatabase();

const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@financia.app');
if (!existingUser) {
  const bcrypt = require('bcryptjs');
  const { v4: uuid } = require('uuid');
  const userId = uuid();
  const hash = bcrypt.hashSync('demo1234', 12);
  db.prepare('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)').run(userId, 'demo@financia.app', 'Usuario Demo', hash);
  [['BBVA','checking',25000,'#2979ff'],['Efectivo','cash',8500,'#00c853'],['Nu','savings',15000,'#7c4dff']].forEach(([n,t,b,c]) => {
    db.prepare('INSERT INTO accounts (id, user_id, name, type, balance, color) VALUES (?, ?, ?, ?, ?, ?)').run(uuid(), userId, n, t, b, c);
  });
  const txns = [['Salario',18000,'income','2026-05-01'],['Freelance',4500,'income','2026-05-05'],['Comida',3200,'expense','2026-05-03'],['Transporte',1200,'expense','2026-05-04'],['Servicios',2100,'expense','2026-05-06']];
  const ins = db.prepare('INSERT INTO transactions (id, user_id, account_id, type, category, amount, date) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const acc = db.prepare('SELECT id FROM accounts WHERE user_id = ?').all(userId);
  txns.forEach(([cat,amt,type,date]) => ins.run(uuid(), userId, acc[0].id, type, cat, amt, date));
}

const { app } = require(path.join(serverDist, 'index.js'));
module.exports = serverless(app);
