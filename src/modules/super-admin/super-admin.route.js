import express from 'express';
import * as superAdminController from './super-admin.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { authRateLimiter } from '../../middlewares/rateLimit.middleware.js';
import { validationErrorHandler } from '../../middlewares/validation.middleware.js';
import { validate } from './super-admin.validator.js';

const router = express.Router();

router.post(
  '/login',
  authRateLimiter,
  validate('login'),
  validationErrorHandler,
  superAdminController.login
);

router.use(authenticate);
router.use(authorize('SUPER_ADMIN'));

router.get('/stats', superAdminController.getStats);
router.get('/academies', superAdminController.getAcademies);
router.patch(
  '/academies/:academy_id/status',
  validate('updateAcademyStatus'),
  validationErrorHandler,
  superAdminController.patchAcademyStatus
);
router.get('/settings', superAdminController.getSettings);
router.put(
  '/settings',
  validate('putSetting'),
  validationErrorHandler,
  superAdminController.putSetting
);

export default router;
