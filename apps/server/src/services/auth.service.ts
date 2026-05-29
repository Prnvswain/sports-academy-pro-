import { prisma } from '@school-syllabus/database';
import { UserRole } from '@school-syllabus/types';
import { env } from '../config/env.js';
import { COOKIE_NAMES } from '../constants/index.js';
import { AppError } from '../middleware/error-handler.js';
import { userRepository } from '../repositories/user.repository.js';
import {
  comparePassword,
  generateSecurePassword,
  hashPassword,
  hashToken,
  isPasswordValid,
} from '../utils/password.js';
import {
  createSessionId,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.js';
import type { Response } from 'express';

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export const authService = {
  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email.toLowerCase());
    if (!user) throw new AppError('Invalid credentials', 401);

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) throw new AppError('Invalid credentials', 401);

    if (user.status !== 'ACTIVE') throw new AppError('Account is not active', 403);

    const sessionId = createSessionId();
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      schoolId: user.schoolId,
      sessionId,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await userRepository.updateLastLogin(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        schoolId: user.schoolId,
        avatar: user.avatar,
      },
      accessToken,
      refreshToken,
    };
  },

  setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  },

  clearAuthCookies(res: Response) {
    res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, cookieOptions);
    res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, cookieOptions);
  },

  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);

    const stored = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!stored) throw new AppError('Invalid refresh token', 401);

    const user = await userRepository.findById(payload.sub);
    if (!user) throw new AppError('User not found', 404);

    const newPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      schoolId: user.schoolId,
      sessionId: payload.sessionId,
    };

    const accessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(newRefreshToken),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    return { accessToken, refreshToken: newRefreshToken, user: newPayload };
  },

  async logout(refreshToken: string | undefined) {
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  },

  async registerSchoolAdmin(data: {
    schoolName: string;
    adminName: string;
    email: string;
    password: string;
    phone?: string;
  }) {
    if (!isPasswordValid(data.password)) {
      throw new AppError('Password does not meet security requirements', 422);
    }

    const slug = data.schoolName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const existing = await userRepository.findByEmail(data.email);
    if (existing) throw new AppError('Email already registered', 409);

    const passwordHash = await hashPassword(data.password);

    const trialPlan = await prisma.subscriptionPlan.findFirst({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: data.schoolName,
          slug: `${slug}-${Date.now().toString(36)}`,
          email: data.email.toLowerCase(),
          phone: data.phone,
        },
      });

      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          name: data.adminName,
          role: 'SCHOOL_ADMIN',
          schoolId: school.id,
          phone: data.phone,
        },
      });

      if (trialPlan) {
        await tx.subscription.create({
          data: {
            schoolId: school.id,
            planId: trialPlan.id,
            status: 'TRIAL',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      }

      return { school, user };
    });
  },

  generateSecurePassword,
};
