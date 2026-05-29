import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@school-syllabus/database';
import { getTenantId } from '../middleware/tenant.js';
import { syllabusService } from '../services/syllabus.service.js';
import { sendPaginated, sendSuccess } from '../utils/api-response.js';

export const syllabusController = {
  async listClasses(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await syllabusService.listClasses(getTenantId(req), req.query as never);
      sendPaginated(res, result.items, result.total, result.page, result.pageSize);
    } catch (err) {
      next(err);
    }
  },

  async createClass(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await syllabusService.createClass(getTenantId(req), req.body);
      sendSuccess(res, item, 201);
    } catch (err) {
      next(err);
    }
  },

  async getClassDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      let teacherId: string | undefined;

      if (req.user?.role === 'TEACHER') {
        const teacher = await prisma.teacher.findFirst({ where: { schoolId, userId: req.user.sub } });
        teacherId = teacher?.id;
      }

      const item = await syllabusService.getClassDetails(schoolId, String(req.params.id), teacherId);
      sendSuccess(res, item);
    } catch (err) {
      next(err);
    }
  },

  async listAssignedClasses(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const teacher = await prisma.teacher.findFirst({ where: { schoolId, userId: req.user!.sub } });
      if (!teacher) throw new Error('Teacher profile not found');
      const result = await syllabusService.listAssignedClasses(schoolId, teacher.id, req.query as never);
      sendPaginated(res, result.items, result.total, result.page, result.pageSize);
    } catch (err) {
      next(err);
    }
  },

  async updateSubject(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await syllabusService.updateSubject(getTenantId(req), String(req.params.id), req.body);
      sendSuccess(res, item);
    } catch (err) {
      next(err);
    }
  },

  async updateChapter(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await syllabusService.updateChapter(getTenantId(req), String(req.params.id), req.body);
      sendSuccess(res, item);
    } catch (err) {
      next(err);
    }
  },

  async updateTopic(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await syllabusService.updateTopic(getTenantId(req), String(req.params.id), req.body);
      sendSuccess(res, item);
    } catch (err) {
      next(err);
    }
  },

  async listSubjects(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await syllabusService.listSubjects(
        getTenantId(req),
        req.query.classId as string | undefined,
      );
      sendSuccess(res, items);
    } catch (err) {
      next(err);
    }
  },

  async createSubject(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await syllabusService.createSubject(getTenantId(req), req.body);
      sendSuccess(res, item, 201);
    } catch (err) {
      next(err);
    }
  },

  async listChapters(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      let teacherId: string | undefined;

      if (req.user?.role === 'TEACHER') {
        const { prisma } = await import('@school-syllabus/database');
        const teacher = await prisma.teacher.findFirst({
          where: { schoolId, userId: req.user.sub },
        });
        teacherId = teacher?.id;
      }

      const items = await syllabusService.listChapters(
        schoolId,
        req.query.subjectId as string | undefined,
        teacherId,
      );
      sendSuccess(res, items);
    } catch (err) {
      next(err);
    }
  },

  async createChapter(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await syllabusService.createChapter(getTenantId(req), req.body);
      sendSuccess(res, item, 201);
    } catch (err) {
      next(err);
    }
  },

  async createTopic(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await syllabusService.createTopic(getTenantId(req), req.body);
      sendSuccess(res, item, 201);
    } catch (err) {
      next(err);
    }
  },

  async getTree(req: Request, res: Response, next: NextFunction) {
    try {
      const tree = await syllabusService.getTree(getTenantId(req));
      sendSuccess(res, tree);
    } catch (err) {
      next(err);
    }
  },

  async listTopics(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await syllabusService.listTopics(
        getTenantId(req),
        String(req.query.chapterId),
      );
      sendSuccess(res, items);
    } catch (err) {
      next(err);
    }
  },

  async updateClass(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await syllabusService.updateClass(
        getTenantId(req),
        String(req.params.id),
        req.body,
      );
      sendSuccess(res, item);
    } catch (err) {
      next(err);
    }
  },

  async deleteClass(req: Request, res: Response, next: NextFunction) {
    try {
      await syllabusService.deleteClass(getTenantId(req), String(req.params.id));
      sendSuccess(res, { message: 'Class deleted' });
    } catch (err) {
      next(err);
    }
  },

  async reorderChapters(req: Request, res: Response, next: NextFunction) {
    try {
      await syllabusService.reorderChapters(getTenantId(req), req.body.orderedIds);
      sendSuccess(res, { message: 'Chapters reordered' });
    } catch (err) {
      next(err);
    }
  },

  async deleteChapter(req: Request, res: Response, next: NextFunction) {
    try {
      await syllabusService.deleteChapter(getTenantId(req), String(req.params.id));
      sendSuccess(res, { message: 'Chapter deleted' });
    } catch (err) {
      next(err);
    }
  },

  // ✅ ADDED
  async deleteSubject(req: Request, res: Response, next: NextFunction) {
    try {
      await syllabusService.deleteSubject(getTenantId(req), String(req.params.id));
      sendSuccess(res, { message: 'Subject deleted' });
    } catch (err) {
      next(err);
    }
  },

  // ✅ ADDED
  async deleteTopic(req: Request, res: Response, next: NextFunction) {
    try {
      await syllabusService.deleteTopic(getTenantId(req), String(req.params.id));
      sendSuccess(res, { message: 'Topic deleted' });
    } catch (err) {
      next(err);
    }
  },
};