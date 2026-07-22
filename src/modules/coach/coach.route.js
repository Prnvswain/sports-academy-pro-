import express from 'express';
import { body } from 'express-validator';
import * as coachController from './coach.controller.js';
import * as performanceController from '../performance/performance.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { enforceActiveSubscription } from '../../middlewares/subscription.middleware.js';
import { validationErrorHandler } from '../../middlewares/validation.middleware.js';
import { verifyAttendanceLocation, optionalGpsVerification } from '../../middlewares/gpsVerification.middleware.js';
import { validate } from './coach.validator.js';
import { upload } from '../../config/multer.config.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('COACH'));
router.use(enforceActiveSubscription);

router.get('/dashboard', coachController.getDashboard);
router.get('/batches', coachController.getMyBatches);
router.get('/batches/:id', coachController.getBatchById);
router.get('/sports', coachController.getSports);
router.get('/payments', coachController.getPayments);
router.get('/students-fee-summary', coachController.getStudentsFeeSummary);
router.get('/student-ledger/:student_id', coachController.getStudentLedger);
router.post('/attendance', verifyAttendanceLocation, validate('markAttendance'), validationErrorHandler, coachController.markAttendance);
router.post(
  '/payments',
  upload.single('proof_file'),
  [
    body('student_id').notEmpty().withMessage('Student ID is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('payment_date').notEmpty().withMessage('Payment date is required').isISO8601(),
    body('method').isIn(['cash', 'cheque']).withMessage('Invalid payment method. Only Cash and Cheque are allowed for coach'),
    body('remarks').optional().isString(),
  ],
  validationErrorHandler,
  coachController.recordPayment
);
router.patch(
  '/payments/:receiptId/proof',
  upload.single('proof_file'),
  coachController.updatePaymentProof
);
router.get('/self-attendance', coachController.getSelfAttendance);
router.post(
  '/self-attendance',
  optionalGpsVerification,
  [
    body('date').optional().isISO8601(),
    body('status').isIn(['PRESENT', 'ABSENT', 'present', 'absent']),
    body('remarks').optional().isString()
  ],
  validationErrorHandler,
  coachController.markSelfAttendance
);
router.post(
  '/mark-absent',
  [
    body('batch_id').isInt(),
    body('reason').optional().isString()
  ],
  validationErrorHandler,
  coachController.markCoachAbsent
);

// Batch session routes
router.post(
  '/batch-session/start',
  [
    body('batch_id').isInt().withMessage('Batch ID is required')
  ],
  validationErrorHandler,
  coachController.startBatchSession
);
router.post(
  '/batch-session/end',
  [
    body('batch_id').isInt().withMessage('Batch ID is required')
  ],
  validationErrorHandler,
  coachController.endBatchSession
);
router.get('/batch-session/active', coachController.getActiveSessions);

// Performance routes for coaches
router.get('/performance/attributes', performanceController.getAttributes);
router.post('/performance/attributes', validationErrorHandler, performanceController.createAttribute);
router.get('/performance/assessments', performanceController.getAssessmentHistory);
router.get('/performance/assessments/:assessmentId', performanceController.getAssessmentById);
router.get('/performance/students/:studentId', performanceController.getStudentPerformance);
router.post('/performance/scores', validationErrorHandler, performanceController.createScore);
router.post('/performance/weekly-performance', validationErrorHandler, performanceController.submitWeeklyPerformance);

export default router;
