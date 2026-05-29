import type { Request, Response, NextFunction } from 'express';
import { UserRole } from '@school-syllabus/types';
import { getTenantId } from '../middleware/tenant.js';
import { progressService } from '../services/progress.service.js';
import { sendSuccess } from '../utils/api-response.js';

export const dashboardController = {
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user!.role === UserRole.SUPER_ADMIN) {
        const stats = await progressService.getSuperAdminStats();
        return sendSuccess(res, stats);
      }
      const schoolId = getTenantId(req);
      const stats = await progressService.getSchoolDashboardStats(schoolId);
      sendSuccess(res, stats);
    } catch (err) {
      next(err);
    }
  },

  async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const [subjectProgress, teacherProgress, classProgress] = await Promise.all([
        progressService.getSubjectWiseProgress(schoolId),
        progressService.getTeacherWiseProgress(schoolId),
        progressService.getClassWiseProgress(schoolId),
      ]);
      sendSuccess(res, { subjectProgress, teacherProgress, classProgress });
    } catch (err) {
      next(err);
    }
  },
};
