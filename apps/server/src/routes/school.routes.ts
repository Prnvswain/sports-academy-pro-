import { Router } from 'express';
import { UserRole } from '@school-syllabus/types';
import { schoolController } from '../controllers/school.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { paginationSchema } from '../validators/common.validator.js';

export const schoolRoutes = Router();

schoolRoutes.use(authenticate, authorize(UserRole.SUPER_ADMIN));
schoolRoutes.get('/', validateQuery(paginationSchema), schoolController.list);
schoolRoutes.get('/:id', schoolController.getById);
schoolRoutes.post('/', schoolController.create);
schoolRoutes.patch('/:id', schoolController.update);
schoolRoutes.patch('/:id/status', schoolController.updateStatus);
schoolRoutes.delete('/:id', schoolController.delete);
