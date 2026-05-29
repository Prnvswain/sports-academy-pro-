import type { NextFunction, Request, Response } from 'express';
import { UserRole } from '@school-syllabus/types';
import { COOKIE_NAMES } from '../constants/index.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { sendError } from '../utils/api-response.js';
import { AppError } from './error-handler.js';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;
    const cookieToken = req.cookies?.[COOKIE_NAMES.ACCESS_TOKEN] as string | undefined;
    const token = bearerToken || cookieToken;

    if (!token) {
      return sendError(res, 'Authentication required', 401);
    }

    const payload = verifyAccessToken(token);
    req.user = payload;
    req.schoolId = payload.schoolId;
    next();
  } catch {
    return sendError(res, 'Invalid or expired token', 401);
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token =
      req.headers.authorization?.replace('Bearer ', '') ||
      (req.cookies?.[COOKIE_NAMES.ACCESS_TOKEN] as string | undefined);
    if (token) {
      req.user = verifyAccessToken(token);
      req.schoolId = req.user.schoolId;
    }
  } catch {
    // optional
  }
  next();
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401);
    }
    if (!roles.includes(req.user.role)) {
      return sendError(res, 'Insufficient permissions', 403);
    }
    next();
  };
}

export function requireSchoolTenant(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }
  if (req.user.role === UserRole.SUPER_ADMIN) {
    return next();
  }
  if (!req.user.schoolId) {
    return next(new AppError('School context required', 403));
  }
  req.schoolId = req.user.schoolId;
  next();
}
