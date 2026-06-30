import express from 'express';
import * as feesController from './fees.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validationErrorHandler } from '../../middlewares/validation.middleware.js';

const router = express.Router();

router.use(authenticate);

router.post('/', feesController.createFee);
router.get('/student/:student_id', feesController.getStudentFees);
router.get('/', feesController.getAcademyFees);
router.get('/stats', feesController.getFeeStats);
router.patch('/:fee_id/pay', feesController.markFeeAsPaid);
router.post('/check-overdue', feesController.checkOverdueFees);
router.post('/send-reminders', feesController.sendOverdueFeeReminders);

export default router;
