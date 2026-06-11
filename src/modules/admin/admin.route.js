import express from 'express';
import * as adminController from './admin.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { enforceActiveSubscription } from '../../middlewares/subscription.middleware.js';
import { validationErrorHandler } from '../../middlewares/validation.middleware.js';
import { validate } from './admin.validator.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'ACADEMY_ADMIN'));
router.use(enforceActiveSubscription);

router.get('/sports', adminController.getSportsCatalog);
router.post('/sports', validate('createSport'), validationErrorHandler, adminController.createSport);
router.get('/duration-plans', adminController.getDurationPlans);
router.post('/duration-plans', validate('createDurationPlan'), validationErrorHandler, adminController.createDurationPlan);
router.delete('/duration-plans/:plan_id', adminController.deleteDurationPlan);

router.get('/coaches', adminController.getAllCoaches);
router.post('/coaches', validate('createCoach'), validationErrorHandler, adminController.createCoach);
router.put('/coaches/:coach_id', validate('updateCoach'), validationErrorHandler, adminController.updateCoach);
router.delete('/coaches/:coach_id', adminController.deleteCoach);

router.get('/students', adminController.getAllStudents);
router.post('/students', validate('createStudent'), validationErrorHandler, adminController.createStudent);
router.put('/students/:student_id', validate('updateStudent'), validationErrorHandler, adminController.updateStudent);
router.get('/students/:student_id/details', adminController.getStudentDetails);
router.post('/students/bulk-upload', adminController.bulkUploadStudents);
router.post(
  '/students/:student_id/exit',
  validate('exitStudent'),
  validationErrorHandler,
  adminController.exitStudent
);
router.delete('/students/:student_id', adminController.deleteStudent);

router.get('/batches', adminController.getAllBatches);
router.get('/batches/available', adminController.getAvailableBatches);
router.post('/batches', validate('createBatch'), validationErrorHandler, adminController.createBatch);
router.put('/batches/:batch_id', validate('updateBatch'), validationErrorHandler, adminController.updateBatch);
router.delete('/batches/:batch_id', adminController.deleteBatch);

router.post('/coach-attendance', validate('markAttendance'), validationErrorHandler, adminController.markCoachAttendance);
router.get('/coach-attendance/:coach_id', adminController.getCoachAttendance);

router.get('/payments', adminController.getAllPayments);
router.get('/accounts', adminController.getAllPayments);
router.post('/payments', validate('createPayment'), validationErrorHandler, adminController.createPayment);
router.post('/accounts', validate('createPayment'), validationErrorHandler, adminController.createPayment);
router.patch('/payments/:payment_id/status', validate('updatePaymentStatus'), validationErrorHandler, adminController.updatePaymentStatus);
router.patch('/accounts/:payment_id/status', validate('updatePaymentStatus'), validationErrorHandler, adminController.updatePaymentStatus);

// New Accounts & Receipts endpoints
router.get('/accounts/student-ledger/:student_id', adminController.getStudentLedger);
router.get('/accounts/receipts', adminController.getReceipts);
router.post('/accounts/receipts', validate('createPayment'), validationErrorHandler, adminController.createReceipt);
router.get('/accounts/pending-dues', adminController.getPendingDues);
router.get('/accounts/revenue-summary', adminController.getRevenueSummary);

router.get('/analytics', adminController.getAcademyReport);
router.get('/dashboard', adminController.getAcademyReport);

export default router;
