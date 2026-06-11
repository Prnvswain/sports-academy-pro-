import 'dotenv/config';

const trimEnv = (value) => (typeof value === 'string' ? value.trim() : '');

export const SMTP_HOST = trimEnv(process.env.SMTP_HOST) || 'smtp.gmail.com';
export const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
export const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
export const SMTP_USER = trimEnv(process.env.SMTP_USER);
export const SMTP_PASS = trimEnv(process.env.SMTP_PASS);
export const MAIL_FROM = trimEnv(process.env.MAIL_FROM) || SMTP_USER || 'noreply@sams.local';
export const APP_URL = trimEnv(process.env.APP_URL) || 'http://localhost:5000';
export const COACH_LOGIN_URL =
  trimEnv(process.env.COACH_LOGIN_URL) || `${APP_URL}/coach-login.html`;
export const RESET_CODE_EXPIRE_MINUTES =
  Number(process.env.RESET_CODE_EXPIRE_MINUTES) || 15;

export const isSmtpConfigured = () => Boolean(SMTP_USER && SMTP_PASS);
