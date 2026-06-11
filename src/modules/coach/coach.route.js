import express from 'express';
import { body } from 'express-validator';
import * as coachController from './coach.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { enforceActiveSubscription } from '../../middlewares/subscription.middleware.js';
import { validationErrorHandler } from '../../middlewares/validation.middleware.js';
import { validate } from './coach.validator.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('COACH'));
router.use(enforceActiveSubscription);

router.get('/dashboard', coachController.getDashboard);
router.get('/batches', coachController.getMyBatches);
router.post('/attendance', validate('markAttendance'), validationErrorHandler, coachController.markAttendance);
router.post(
  '/payments',
  [
    body('student_id').isInt(),
    body('amount').isFloat({ min: 0.01 }),
    body('payment_date').optional().isISO8601(),
    body('method').optional().isIn(['cash', 'cheque', 'online', 'upi']),
    body('remarks').optional().isString(),
    body('proof_url').optional().isString()
  ],
  validationErrorHandler,
  coachController.recordPayment
);
router.post(
  '/self-attendance',
  [
    body('date').optional().isISO8601(),
    body('status').isIn(['PRESENT', 'ABSENT', 'present', 'absent']),
    body('remarks').optional().isString()
  ],
  validationErrorHandler,
  coachController.markSelfAttendance
);

export default router;
