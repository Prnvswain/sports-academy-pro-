import crypto from 'crypto';

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export const generateTempPassword = (length = 8) => {
  const bytes = crypto.randomBytes(length);
  let password = '';

  for (let i = 0; i < length; i += 1) {
    password += CHARSET[bytes[i] % CHARSET.length];
  }

  return password;
};

export const generateResetCode = () => String(crypto.randomInt(100000, 1000000));
