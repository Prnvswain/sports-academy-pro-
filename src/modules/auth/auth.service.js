import prisma from '../../config/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRE, BCRYPT_SALT_ROUNDS } from '../../config/app.config.js';
import { RESET_CODE_EXPIRE_MINUTES } from '../../config/mail.config.js';
import {
  addDays,
  getPlanLimits,
  getSubscriptionStatus,
  normalizePlanId
} from '../../config/subscription.config.js';
import { NOT_DELETED } from '../../utils/softDelete.util.js';
import {
  generateResetCode,
  hashResetCode,
  verifyResetCode
} from '../../utils/resetCode.util.js';
import {
  sendAdminWelcomeEmail,
  sendPasswordResetEmail
} from '../../services/mail.service.js';
import logger from '../../utils/logger.js';

export const signupAcademy = async ({
  name,
  email,
  password,
  academy_name,
  phone_number,
  subscription_plan,
  address,
  city,
  state,
  latitude,
  longitude,
  attendance_radius_meters
}) => {
  // Validate password length before hashing
  if (!password || password.length < 6) {
    const error = new Error('Password must be at least 6 characters long');
    error.statusCode = 400;
    throw error;
  }

  const existingUser = await prisma.user.findFirst({
    where: { email, ...NOT_DELETED }
  });

  if (existingUser) {
    const error = new Error('Email already registered');
    error.statusCode = 409;
    throw error;
  }

  const existingCoachEmail = await prisma.coach.findFirst({
    where: { email, ...NOT_DELETED }
  });

  if (existingCoachEmail) {
    const error = new Error(
      'This email is already used by a coach account. Use a different email for academy registration.'
    );
    error.statusCode = 409;
    throw error;
  }

  const password_hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const planKey = normalizePlanId(subscription_plan);
  const planLimits = getPlanLimits(subscription_plan);
  const subscription_expires_at = addDays(new Date(), planLimits.trialDays);

  // Convert empty phone_number to null for optional field
  const normalizedPhone = phone_number && phone_number.trim() ? phone_number.trim() : null;

  // Map lowercase plan keys to uppercase enum values for subscription_tier
  const tierMapping = {
    'free': 'FREE',
    'pro': 'PRO',
    'plus': 'PLUS'
  };
  const subscriptionTier = tierMapping[planKey] || 'FREE';

  try {
    const result = await prisma.$transaction(async (tx) => {
      const academy = await tx.academy.create({
        data: {
          name: academy_name,
          owner_name: name,
          email,
          phone_number: normalizedPhone,
          subscription_plan: planKey,
          subscription_tier: subscriptionTier,
          subscription_expires_at,
          status: 'ACTIVE',

          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
          city: city || null,
          state: state || null,
          address: address || null,
          attendance_radius_meters:
            attendance_radius_meters || 100
        }
      });

      const user = await tx.user.create({
        data: {
          academy_id: academy.academy_id,
          name,
          email,
          password_hash,
          role: 'ACADEMY_ADMIN'
        }
      });

      await tx.durationPlan.createMany({
        data: [
          { academy_id: academy.academy_id, name: '1 Month', duration_months: 1, multiplier: 1 },
          { academy_id: academy.academy_id, name: '3 Months', duration_months: 3, multiplier: 0.95 },
          { academy_id: academy.academy_id, name: '6 Months', duration_months: 6, multiplier: 0.9 },
          { academy_id: academy.academy_id, name: '12 Months', duration_months: 12, multiplier: 0.85 }
        ]
      });

      return { academy, user };
    });

    const token = jwt.sign(
      {
        user_id: result.user.user_id,
        email: result.user.email,
        role: result.user.role,
        academy_id: result.user.academy_id,
        name: result.user.name
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    logger.info('Academy signup completed', {
      academy_id: result.academy.academy_id,
      user_id: result.user.user_id,
      email
    });

    try {
      await sendAdminWelcomeEmail({
        email,
        name,
        academyName: academy_name,
        temporaryPassword: password
      });
    } catch (mailError) {
      logger.error('Academy signup succeeded but welcome email failed', {
        academy_id: result.academy.academy_id,
        email,
        smtp_code: mailError.code,
        message: mailError.message
      });
    }

    return {
      token,
      academy: {
        academy_id: result.academy.academy_id,
        name: result.academy.name,
        subscription_plan: result.academy.subscription_plan
      },
      user: {
        user_id: result.user.user_id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        academy_id: result.user.academy_id
      }
    };
  } catch (error) {
    if (error.statusCode) throw error;
    logger.error('Academy signup transaction failed', { message: error.message, stack: error.stack });
    // Expose true error context in development mode for debugging
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const txError = new Error(isDevelopment ? error.message : 'Failed to complete academy registration');
    txError.statusCode = 500;
    if (isDevelopment) {
      txError.details = error.message;
      txError.originalError = error;
    }
    throw txError;
  }
};

export const loginUser = async ({ email, password, ip }) => {
  logger.info('Admin login attempt', { email, ip });

  const user = await prisma.user.findFirst({
    where: { email, ...NOT_DELETED },
    include: { academy: true }
  });

  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  if (user.academy && !['active', 'approved'].includes(user.academy.status?.toLowerCase())) {
    const error = new Error('Academy account is not active. Contact support.');
    error.statusCode = 403;
    throw error;
  }

  const subscription = getSubscriptionStatus(user.academy);
  if (user.academy && subscription.expired) {
    const error = new Error('Academy subscription has expired. Renew to restore access.');
    error.statusCode = 402;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign(
    {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      academy_id: user.academy_id,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );

  logger.info('Admin login successful', { user_id: user.user_id, email, ip });

  return {
    token,
    user: {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      academy_id: user.academy_id
    }
  };
};

export const loginCoach = async ({ email, password, ip }) => {
  logger.info('Coach login attempt', { email, ip });

  const coach = await prisma.coach.findFirst({
    where: { email, ...NOT_DELETED },
    include: { academy: true }
  });

  if (!coach || !coach.password_hash) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  if (coach.academy && !['active', 'approved'].includes(coach.academy.status?.toLowerCase())) {
    const error = new Error('Academy account is not active. Contact your administrator.');
    error.statusCode = 403;
    throw error;
  }

  const subscription = getSubscriptionStatus(coach.academy);
  if (coach.academy && subscription.expired) {
    const error = new Error('Academy subscription has expired. Contact your administrator.');
    error.statusCode = 402;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, coach.password_hash);

  if (!isPasswordValid) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign(
    {
      coach_id: coach.coach_id,
      email: coach.email,
      role: 'COACH',
      academy_id: coach.academy_id,
      name: coach.name
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );

  logger.info('Coach login successful', { coach_id: coach.coach_id, email, ip });

  return {
    token,
    coach: {
      coach_id: coach.coach_id,
      name: coach.name,
      email: coach.email,
      role: 'COACH',
      academy_id: coach.academy_id
    }
  };
};

const findAccountByEmail = async (email) => {
  const user = await prisma.user.findFirst({
    where: { email, ...NOT_DELETED }
  });

  if (user) {
    return { account_type: 'ADMIN', record: user, name: user.name };
  }

  const coach = await prisma.coach.findFirst({
    where: { email, ...NOT_DELETED }
  });

  if (coach) {
    return { account_type: 'COACH', record: coach, name: coach.name };
  }

  return null;
};

export const requestPasswordReset = async ({ email }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const account = await findAccountByEmail(normalizedEmail);

  if (!account) {
    logger.info('Password reset requested for unknown email', { email: normalizedEmail });
    return { sent: true };
  }

  const code = generateResetCode();
  const code_hash = await hashResetCode(code, bcrypt);
  const expires_at = new Date(Date.now() + RESET_CODE_EXPIRE_MINUTES * 60 * 1000);

  await prisma.passwordReset.deleteMany({ where: { email: normalizedEmail } });
  await prisma.passwordReset.create({
    data: {
      email: normalizedEmail,
      code_hash,
      account_type: account.account_type,
      expires_at
    }
  });

  try {
    await sendPasswordResetEmail({
      email: normalizedEmail,
      name: account.name,
      code,
      expiresMinutes: RESET_CODE_EXPIRE_MINUTES
    });
    logger.info('Password reset email dispatched', {
      email: normalizedEmail,
      account_type: account.account_type
    });
  } catch (mailError) {
    await prisma.passwordReset.deleteMany({ where: { email: normalizedEmail } });
    logger.error('Password reset email failed', {
      email: normalizedEmail,
      smtp_code: mailError.code,
      message: mailError.message
    });
    const error = new Error('Unable to send verification code. Check SMTP configuration.');
    error.statusCode = 502;
    throw error;
  }

  return { sent: true };
};

export const resetPasswordWithCode = async ({ email, code, newPassword }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const resetRecord = await prisma.passwordReset.findFirst({
    where: { email: normalizedEmail },
    orderBy: { created_at: 'desc' }
  });

  if (!resetRecord) {
    const error = new Error('Invalid or expired verification code');
    error.statusCode = 400;
    throw error;
  }

  if (new Date() > resetRecord.expires_at) {
    await prisma.passwordReset.deleteMany({ where: { email: normalizedEmail } });
    const error = new Error('Verification code has expired. Request a new code.');
    error.statusCode = 400;
    throw error;
  }

  const codeValid = await verifyResetCode(code, resetRecord.code_hash, bcrypt);

  if (!codeValid) {
    const error = new Error('Invalid verification code');
    error.statusCode = 400;
    throw error;
  }

  const password_hash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

  if (resetRecord.account_type === 'ADMIN') {
    await prisma.user.updateMany({
      where: { email: normalizedEmail, ...NOT_DELETED },
      data: { password_hash }
    });
  } else {
    await prisma.coach.updateMany({
      where: { email: normalizedEmail, ...NOT_DELETED },
      data: { password_hash }
    });
  }

  await prisma.passwordReset.deleteMany({ where: { email: normalizedEmail } });

  logger.info('Password reset completed', {
    email: normalizedEmail,
    account_type: resetRecord.account_type
  });

  return { reset: true };
};
