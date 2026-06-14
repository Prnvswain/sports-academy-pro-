import { Router } from 'express';
import * as adminController from './admin.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { enforceActiveSubscription } from '../../middlewares/subscription.middleware.js';
import { validationErrorHandler } from '../../middlewares/validation.middleware.js';
import { validate } from './admin.validator.js';

const router = Router();

// Global Protection Stack Matrix
router.use(authenticate);
router.use(authorize('ADMIN', 'ACADEMY_ADMIN'));
router.use(enforceActiveSubscription);

/* ─── SPORTS CATALOG ────────────────────────────────────────────────────── */
router.get('/sports', adminController.getSportsCatalog);
router.post('/sports', validate('createSport'), validationErrorHandler, adminController.createSport);

/* ─── DURATION PLANS ────────────────────────────────────────────────────── */
router.get('/duration-plans', adminController.getDurationPlans);
router.post('/duration-plans', validate('createDurationPlan'), validationErrorHandler, adminController.createDurationPlan);
router.delete('/duration-plans/:plan_id', adminController.deleteDurationPlan);

/* ─── COACH PORTALS ─────────────────────────────────────────────────────── */
router.get('/coaches', adminController.getAllCoaches);
router.post('/coaches', validate('createCoach'), validationErrorHandler, adminController.createCoach);
router.put('/coaches/:coach_id', validate('updateCoach'), validationErrorHandler, adminController.updateCoach);
router.delete('/coaches/:coach_id', adminController.deleteCoach);

/* ─── STUDENTS & ROSTER ENROLLMENTS ─────────────────────────────────────── */
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

/* ─── BATCHES TIMING & CAPACITY ─────────────────────────────────────────── */
router.get('/batches', adminController.getAllBatches);
router.get('/batches/available', adminController.getAvailableBatches);
router.post('/batches', validate('createBatch'), validationErrorHandler, adminController.createBatch);
router.put('/batches/:batch_id', validate('updateBatch'), validationErrorHandler, adminController.updateBatch);
router.delete('/batches/:batch_id', adminController.deleteBatch);

/* ─── ATTENDANCE TRACKER ────────────────────────────────────────────────── */
router.post('/coach-attendance', validate('markAttendance'), validationErrorHandler, adminController.markCoachAttendance);
router.get('/coach-attendance/:coach_id', adminController.getCoachAttendance);

/* ─── FINANCIAL LEDGERS & RECEIPTS ──────────────────────────────────────── */
router.get('/payments', adminController.getAllPayments);
router.get('/accounts', adminController.getAllPayments);
router.post('/payments', validate('createPayment'), validationErrorHandler, adminController.createPayment);
router.post('/accounts', validate('createPayment'), validationErrorHandler, adminController.createPayment);
router.patch('/payments/:payment_id/status', validate('updatePaymentStatus'), validationErrorHandler, adminController.updatePaymentStatus);
router.patch('/accounts/:payment_id/status', validate('updatePaymentStatus'), validationErrorHandler, adminController.updatePaymentStatus);

router.get('/accounts/student-ledger/:student_id', adminController.getStudentLedger);
router.get('/accounts/receipts', adminController.getReceipts);
router.post('/accounts/receipts', validate('createPayment'), validationErrorHandler, adminController.createReceipt);
router.get('/accounts/pending-dues', adminController.getPendingDues);
router.get('/accounts/revenue-summary', adminController.getRevenueSummary);

/* ─── INTEL REPORTS & ANALYTICS ─────────────────────────────────────────── */
router.get('/analytics', adminController.getAcademyReport);
router.get('/dashboard', adminController.getAcademyReport);

/* ─── PUBLIC ENQUIRIES INTERFACE ────────────────────────────────────────── */
router.get('/enquiries', adminController.getEnquiries);
router.patch('/enquiries/:id', adminController.updateEnquiry);

/* ─── PERFORMANCE TRACKER (NEW SYSTEM ADDITION) ─────────────────────────── */
// GET: Fetches all performance attributes for the academy (with dynamic query filtering)
router.get('/performance/attributes', adminController.getPerformanceApprovalQueue);
// GET: Pulls down all coach proposals matching your exact route string requirements
router.get('/performance/approval-queue', adminController.getPerformanceApprovalQueue);
// POST: Creates a new performance attribute
router.post('/performance/attributes', adminController.createPerformanceAttribute);
// PATCH: Processes 'APPROVED' or 'REJECTED' Enum statuses safely via request body mapping
router.patch('/performance/approve-attribute/:id', adminController.approvePerformanceAttribute);

export default router;