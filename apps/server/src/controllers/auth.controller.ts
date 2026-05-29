import type { Request, Response, NextFunction } from 'express';
import { COOKIE_NAMES } from '../constants/index.js';
import { authService } from '../services/auth.service.js';
import { sendSuccess } from '../utils/api-response.js';
import { userRepository } from '../repositories/user.repository.js';

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
};
