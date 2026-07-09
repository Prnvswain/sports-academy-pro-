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
router.get('/payments', coachController.getPayments);
router.get('/students-fee-summary', coachController.getStudentsFeeSummary);
router.get('/student-ledger/:student_id', coachController.getStudentLedger);
router.post('/attendance', verifyAttendanceLocation, validate('markAttendance'), validationErrorHandler, coachController.markAttendance);
router.post(
  '/payments',
  upload.single('proof_file'),
  [
    body('student_id').custom((value) => {
      if (!value) throw new Error('student_id is required');
      return true;
    }),
    body('amount').custom((value) => {
      if (!value || isNaN(parseFloat(value)) || parseFloat(value) <= 0) {
        throw new Error('amount must be a positive number');
      }
      return true;
    }),
    body('payment_date').optional().isISO8601(),
    body('method').optional().isIn(['cash', 'cheque', 'online', 'upi']),
    body('remarks').optional().isString(),
    body('proof_url').optional().isString()
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

// Performance routes for coaches
router.get('/performance/attributes', performanceController.getAttributes);
router.post('/performance/attributes', validationErrorHandler, performanceController.createAttribute);
router.get('/performance/assessments', performanceController.getAssessmentHistory);
router.get('/performance/assessments/:assessmentId', performanceController.getAssessmentById);
router.get('/performance/students/:studentId', performanceController.getStudentPerformance);
router.post('/performance/scores', validationErrorHandler, performanceController.createScore);
router.post('/performance/weekly-performance', validationErrorHandler, performanceController.submitWeeklyPerformance);

export default router;
