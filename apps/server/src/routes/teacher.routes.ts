import { Router } from 'express';
import { UserRole } from '@school-syllabus/types';
import { teacherController } from '../controllers/teacher.controller.js';
import { authenticate, authorize, requireSchoolTenant } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenant.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { paginationSchema } from '../validators/common.validator.js';
import {
  assignmentIdParamSchema,
  createAssignmentSchema,
  createTeacherSchema,
  teacherIdParamSchema,
} from '../validators/teacher.validator.js';

export const teacherRoutes = Router();

teacherRoutes.use(
  authenticate,
  authorize(UserRole.SCHOOL_ADMIN),
  requireSchoolTenant,
  tenantGuard(),
);

teacherRoutes.get('/', validateQuery(paginationSchema), teacherController.list);
teacherRoutes.get('/:id', validateParams(teacherIdParamSchema), teacherController.getById);
teacherRoutes.post('/', validateBody(createTeacherSchema), teacherController.create);
teacherRoutes.post(
  '/:id/assignments',
  validateParams(teacherIdParamSchema),
  validateBody(createAssignmentSchema),
  teacherController.addAssignment,
);
teacherRoutes.delete(
  '/:id/assignments/:assignmentId',
  validateParams(assignmentIdParamSchema),
  teacherController.deleteAssignment,
);
teacherRoutes.patch('/:id', teacherController.update);
teacherRoutes.delete('/:id', teacherController.delete);
