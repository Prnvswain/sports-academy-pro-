import type { Request, Response, NextFunction } from 'express';
import { schoolService } from '../services/school.service.js';
import { sendPaginated, sendSuccess } from '../utils/api-response.js';

export const schoolController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await schoolService.list(req.query as never);
      sendPaginated(res, result.items, result.total, result.page, result.pageSize);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const school = await schoolService.getById(String(req.params.id));
      sendSuccess(res, school);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const school = await schoolService.create(req.body);
      sendSuccess(res, school, 201);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const school = await schoolService.update(String(req.params.id), req.body);
      sendSuccess(res, school);
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const school = await schoolService.updateStatus(String(req.params.id), req.body.status);
      sendSuccess(res, school);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await schoolService.softDelete(String(req.params.id));
      sendSuccess(res, { message: 'School deleted' });
    } catch (err) {
      next(err);
    }
  },
};
