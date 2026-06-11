import crypto from 'crypto';

export function generateResetCode() {
  return String(crypto.randomInt(100000, 1000000));
}

export async function hashResetCode(code, bcryptModule) {
  return bcryptModule.hash(String(code), 10);
}

export async function verifyResetCode(code, codeHash, bcryptModule) {
  return bcryptModule.compare(String(code), codeHash);
}
