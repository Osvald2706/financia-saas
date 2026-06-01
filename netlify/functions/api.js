const path = require('path');
const fs = require('fs');
const serverless = require('serverless-http');

const dbPath = '/tmp/financia.db';
process.env.DATABASE_PATH = dbPath;
process.env.NETLIFY = 'true';

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const serverDist = path.resolve(__dirname, '..', '..', 'server', 'dist');
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
}

const { app } = require(path.join(serverDist, 'index.js'));
exports.handler = serverless(app);
