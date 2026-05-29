import { Router } from 'express';
import { UserRole } from '@school-syllabus/types';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { authenticate, authorize, requireSchoolTenant } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenant.js';

export const dashboardRoutes = Router();

dashboardRoutes.get(
  '/stats',
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  requireSchoolTenant,
  tenantGuard(true),
  dashboardController.getStats,
);

dashboardRoutes.get(
  '/analytics',
  authenticate,
  authorize(UserRole.SCHOOL_ADMIN),
  requireSchoolTenant,
  tenantGuard(),
  dashboardController.getAnalytics,
);
