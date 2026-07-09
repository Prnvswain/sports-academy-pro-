import express from 'express';
import * as parentController from './parent.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { body } from 'express-validator';
import { validationErrorHandler } from '../../middlewares/validation.middleware.js';

const router = express.Router();

// Public routes
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validationErrorHandler,
  parentController.login
);

// Protected routes
router.use(authenticate);

router.get('/profile', parentController.getProfile);
router.put(
  '/update-profile',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
  ],
  validationErrorHandler,
  parentController.updateProfile
);
router.patch(
  '/change-password',
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  validationErrorHandler,
  parentController.changePassword
);
router.get('/children', parentController.getChildren);
router.get('/children/:child_id', parentController.getChildDetails);
router.get('/dashboard', parentController.getDashboard);
router.get('/children/:child_id/performance', parentController.getChildPerformance);
router.get('/children/:child_id/performance/history', parentController.getChildPerformanceHistory);
router.get('/children/:child_id/performance/analytics', parentController.getChildPerformanceAnalytics);

export default router;
