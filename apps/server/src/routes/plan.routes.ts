import { Router } from 'express';
import { UserRole } from '@school-syllabus/types';
import { subscriptionPlanController } from '../controllers/subscription-plan.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

export const planRoutes = Router();

planRoutes.use(authenticate, authorize(UserRole.SUPER_ADMIN));
planRoutes.get('/', subscriptionPlanController.list);
planRoutes.get('/:id', subscriptionPlanController.getById);
planRoutes.post('/', subscriptionPlanController.create);
planRoutes.patch('/:id', subscriptionPlanController.update);
planRoutes.patch('/:id/toggle', subscriptionPlanController.toggleActive);
planRoutes.delete('/:id', subscriptionPlanController.delete);
