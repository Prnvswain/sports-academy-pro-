import type { NextFunction, Request, Response } from 'express';
import { UserRole } from '@school-syllabus/types';
import { AppError } from './error-handler.js';

/**
 * Enforces tenant isolation. school_id is ALWAYS taken from JWT, never from request body/query.
 * Super admins may pass ?schoolId for cross-tenant operations only on allowed routes.
 */
export function tenantGuard(allowSuperAdminOverride = false) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (req.user.role === UserRole.SUPER_ADMIN) {
      if (allowSuperAdminOverride && req.query.schoolId) {
        req.schoolId = String(req.query.schoolId);
      } else {
        req.schoolId = null;
      }
      return next();
    }

    if (!req.user.schoolId) {
      return next(new AppError('Tenant context missing', 403));
    }

    // Strip any client-provided school_id from body to prevent tampering
    if (req.body && typeof req.body === 'object') {
      delete req.body.schoolId;
      delete req.body.school_id;
    }

    req.schoolId = req.user.schoolId;
    next();
  };
}

export function getTenantId(req: Request): string {
  if (!req.schoolId) {
    throw new AppError('Tenant context required', 403);
  }
  return req.schoolId;
}
