import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@school-syllabus/database';
import { getTenantId } from '../middleware/tenant.js';
import { progressService } from '../services/progress.service.js';
import { sendSuccess } from '../utils/api-response.js';
import { AppError } from '../middleware/error-handler.js';

export const progressController = {
  async updateChapter(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      let teacherId = req.body.teacherId;

      if (req.user!.role === 'TEACHER') {
        const teacher = await prisma.teacher.findFirst({
          where: { schoolId, userId: req.user!.sub },
        });
        if (!teacher) throw new AppError('Teacher profile not found', 404);
        teacherId = teacher.id;
      }

      const progress = await progressService.updateChapterProgress(
        schoolId,
        teacherId,
        String(req.params.chapterId),
        req.user!.sub,
        req.body,
      );
      sendSuccess(res, progress);
    } catch (err) {
      next(err);
    }
  },

  async updateTopic(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      let teacherId = req.body.teacherId as string | undefined;

      if (req.user!.role === 'TEACHER') {
        const teacher = await prisma.teacher.findFirst({
          where: { schoolId, userId: req.user!.sub },
        });
        if (!teacher) throw new AppError('Teacher profile not found', 404);
        teacherId = teacher.id;
      }
      if (!teacherId) throw new AppError('Teacher ID required', 400);

      const progress = await progressService.updateTopicProgress(
        schoolId,
        teacherId,
        String(req.params.topicId),
        req.user!.sub,
        req.body.status,
      );
      sendSuccess(res, progress);
    } catch (err) {
      next(err);
    }
  },

  async getTeacherProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const teacher = await prisma.teacher.findFirst({
        where: { schoolId, userId: req.user!.sub },
      });
      if (!teacher) throw new AppError('Teacher profile not found', 404);
      const stats = await progressService.getTeacherTopicProgress(schoolId, teacher.id);
      sendSuccess(res, stats);
    } catch (err) {
      next(err);
    }
  },
};
