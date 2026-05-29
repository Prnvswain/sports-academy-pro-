import type { Request, Response, NextFunction } from 'express';
import { subscriptionPlanService } from '../services/subscription-plan.service.js';
import { sendSuccess } from '../utils/api-response.js';

export const subscriptionPlanController = {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await subscriptionPlanService.list();
      sendSuccess(res, plans);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const plan = await subscriptionPlanService.getById(String(req.params.id));
      sendSuccess(res, plan);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const plan = await subscriptionPlanService.create(req.body);
      sendSuccess(res, plan, 201);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const plan = await subscriptionPlanService.update(String(req.params.id), req.body);
      sendSuccess(res, plan);
    } catch (err) {
      next(err);
    }
  },

  async toggleActive(req: Request, res: Response, next: NextFunction) {
    try {
      const plan = await subscriptionPlanService.toggleActive(String(req.params.id));
      sendSuccess(res, plan);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await subscriptionPlanService.softDelete(String(req.params.id));
      sendSuccess(res, { message: 'Plan deleted' });
    } catch (err) {
      next(err);
    }
  },
};
