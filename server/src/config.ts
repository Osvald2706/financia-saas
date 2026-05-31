import path from 'path';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'financia-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  dbPath: process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'financia.db'),
  openAiKey: process.env.OPENAI_API_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
