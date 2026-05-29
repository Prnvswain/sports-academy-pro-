import type { Request, Response, NextFunction } from 'express';
import { COOKIE_NAMES } from '../constants/index.js';
import { authService } from '../services/auth.service.js';
import { sendSuccess } from '../utils/api-response.js';
import { userRepository } from '../repositories/user.repository.js';
import { prisma } from '@school-syllabus/database';
import { AppError } from '../middleware/error-handler.js';
import bcrypt from 'bcryptjs';
import { sendOtpEmail } from '../emails/send-otp-email.js';

// In-memory OTP store: userId → { otp, expiresAt }
// For production use Redis, but this works for single-server setups
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      authService.setAuthCookies(res, result.accessToken, result.refreshToken);
      sendSuccess(res, { user: result.user, accessToken: result.accessToken });
    } catch (err) {
      next(err);
    }
  },

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.registerSchoolAdmin(req.body);
      sendSuccess(
        res,
        { schoolId: result.school.id, message: 'School registered successfully' },
        201,
      );
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken =
        req.body.refreshToken || (req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN] as string);
      if (!refreshToken) {
        return res.status(401).json({ success: false, error: 'Refresh token required' });
      }
      const result = await authService.refresh(refreshToken);
      authService.setAuthCookies(res, result.accessToken, result.refreshToken);
      sendSuccess(res, { accessToken: result.accessToken });
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN] as string | undefined;
      await authService.logout(refreshToken);
      authService.clearAuthCookies(res);
      sendSuccess(res, { message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userRepository.findById(req.user!.sub);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      sendSuccess(res, {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        schoolId: user.schoolId,
        avatar: user.avatar,
        school: user.school,
        teacher: user.teacher,
      });
    } catch (err) {
      next(err);
    }
  },

  // Update profile (name, phone only — no password here)
  async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { name, phone } = req.body as { name?: string; phone?: string };

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new AppError('User not found', 404);

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(name && { name }),
          ...(phone !== undefined && { phone }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          schoolId: true,
          avatar: true,
        },
      });

      sendSuccess(res, updatedUser);
    } catch (err) {
      next(err);
    }
  },

  // Step 1 — Send OTP to user's email
  async sendPasswordOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new AppError('User not found', 404);

      const otp = generateOtp();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      otpStore.set(userId, { otp, expiresAt });

      await sendOtpEmail({
        to: user.email,
        name: user.name ?? 'User',
        otp,
      });

      sendSuccess(res, { message: `Verification code sent to ${user.email}` });
    } catch (err) {
      next(err);
    }
  },

  // Step 2 — Verify OTP + set new password
  async verifyOtpAndChangePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { otp, newPassword } = req.body as { otp: string; newPassword: string };

      const stored = otpStore.get(userId);

      if (!stored) {
        throw new AppError('No OTP requested. Please request a new code.', 400);
      }
      if (Date.now() > stored.expiresAt) {
        otpStore.delete(userId);
        throw new AppError('OTP has expired. Please request a new code.', 400);
      }
      if (stored.otp !== otp) {
        throw new AppError('Invalid verification code.', 401);
      }

      // OTP valid — update password
      const passwordHash = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      // Clear OTP after use
      otpStore.delete(userId);

      sendSuccess(res, { message: 'Password changed successfully' });
    } catch (err) {
      next(err);
    }
  },
};
