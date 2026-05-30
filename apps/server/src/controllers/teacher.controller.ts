import type { Request, Response, NextFunction } from 'express';
import { teacherService } from '../services/teacher.service.js';
import { getTenantId } from '../middleware/tenant.js';
import { sendPaginated, sendSuccess } from '../utils/api-response.js';

export const teacherController = {
  async bulkCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const { teachers } = req.body;
      if (!Array.isArray(teachers) || teachers.length === 0) {
        return res.status(400).json({ success: false, error: 'Teachers array is required' });
      }
      if (teachers.length > 100) {
        return res.status(400).json({ success: false, error: 'Maximum 100 teachers per import' });
      }
      const results = await teacherService.bulkCreate(getTenantId(req), teachers);
      const succeeded = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;
      sendSuccess(res, { results, succeeded, failed }, 201);
    } catch (err) {
      next(err);
    }
  },
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const result = await teacherService.list(schoolId, req.query as never);
      sendPaginated(res, result.items, result.total, result.page, result.pageSize);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const teacher = await teacherService.getById(getTenantId(req), String(req.params.id));
      sendSuccess(res, teacher);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('[CREATE TEACHER] body:', JSON.stringify(req.body, null, 2));
      const teacher = await teacherService.create(getTenantId(req), req.body);
      sendSuccess(res, teacher, 201);
    } catch (err) {
      console.error('[CREATE TEACHER ERROR]', err);
      next(err);
    }
  },

  async addAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const assignment = await teacherService.createAssignment(
        getTenantId(req),
        String(req.params.id),
        req.body,
      );
      sendSuccess(res, assignment, 201);
    } catch (err) {
      next(err);
    }
  },

  async deleteAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      await teacherService.deleteAssignment(
        getTenantId(req),
        String(req.params.id),
        String(req.params.assignmentId),
      );
      sendSuccess(res, { message: 'Assignment removed' });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const teacher = await teacherService.update(
        getTenantId(req),
        String(req.params.id),
        req.body,
      );
      sendSuccess(res, teacher);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await teacherService.softDelete(getTenantId(req), String(req.params.id));
      sendSuccess(res, { message: 'Teacher deleted' });
    } catch (err) {
      next(err);
    }
  },
};
