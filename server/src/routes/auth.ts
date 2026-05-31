import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import db from '../database';
import { config } from '../config';

export const authRouter = Router();

authRouter.post('/register', (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, password and name are required' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const id = uuid();
    const hash = bcrypt.hashSync(password, 12);
    db.prepare('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)').run(id, email, name, hash);

    const token = jwt.sign({ userId: id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });
    res.status(201).json({ token, user: { id, email, name } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

authRouter.post('/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, currency: user.currency } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

authRouter.get('/profile', (req: any, res: Response) => {
  try {
    const user = db.prepare('SELECT id, email, name, currency, created_at FROM users WHERE id = ?').get(req.userId) as any;
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

authRouter.put('/profile', (req: any, res: Response) => {
  try {
    const { name, currency } = req.body;
    db.prepare('UPDATE users SET name = COALESCE(?, name), currency = COALESCE(?, currency), updated_at = datetime(\'now\') WHERE id = ?')
      .run(name || null, currency || null, req.userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
