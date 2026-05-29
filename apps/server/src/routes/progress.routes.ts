import { Router } from 'express';
import { UserRole } from '@school-syllabus/types';
import { progressController } from '../controllers/progress.controller.js';
import { authenticate, authorize, requireSchoolTenant } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenant.js';
import { validateBody } from '../middleware/validate.js';
import { updateChapterProgressSchema, updateTopicProgressSchema } from '../validators/progress.validator.js';

export const progressRoutes = Router();

progressRoutes.patch(
  '/chapters/:chapterId',
  authenticate,
  authorize(UserRole.TEACHER, UserRole.SCHOOL_ADMIN),
  requireSchoolTenant,
  tenantGuard(),
  validateBody(updateChapterProgressSchema),
  progressController.updateChapter,
);

progressRoutes.patch(
  '/topics/:topicId',
  authenticate,
  authorize(UserRole.TEACHER),
  requireSchoolTenant,
  tenantGuard(),
  validateBody(updateTopicProgressSchema),
  progressController.updateTopic,
);

progressRoutes.get(
  '/me',
  authenticate,
  authorize(UserRole.TEACHER),
  requireSchoolTenant,
  tenantGuard(),
  progressController.getTeacherProgress,
);
