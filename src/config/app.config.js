export const PORT = process.env.PORT || 5000;
export const NODE_ENV = process.env.NODE_ENV || 'development';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production');
}
export const JWT_SECRET = jwtSecret || 'dev-only-change-me-not-for-production';
export const JWT_EXPIRE = process.env.JWT_EXPIRE || '24h';
export const APP_URL = process.env.APP_URL || 'http://localhost:5000';
export const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
export const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || '';
export const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || '';

// Google OAuth Configuration
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';