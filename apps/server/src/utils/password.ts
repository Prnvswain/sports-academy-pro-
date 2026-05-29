import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PASSWORD_REGEX } from '../constants/index.js';

const SALT_ROUNDS = 12;

export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (password.length < 8) errors.push('Minimum 8 characters required');
  if (!/[A-Z]/.test(password)) errors.push('Must contain an uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Must contain a lowercase letter');
  if (!/\d/.test(password)) errors.push('Must contain a number');
  if (!/[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/]/.test(password))
    errors.push('Must contain a special character');
  return { valid: errors.length === 0, errors };
}

export function isPasswordValid(password: string): boolean {
  return PASSWORD_REGEX.test(password);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateSecurePassword(length = 14): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const special = '@$!%*?&#';
  const all = upper + lower + numbers + special;

  let password = '';
  password += upper[crypto.randomInt(upper.length)];
  password += lower[crypto.randomInt(lower.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += special[crypto.randomInt(special.length)];

  for (let i = password.length; i < length; i++) {
    password += all[crypto.randomInt(all.length)];
  }

  return password
    .split('')
    .sort(() => crypto.randomInt(3) - 1)
    .join('');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
