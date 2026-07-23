import { Router } from 'express';
import * as adminController from './admin.controller.js';
import * as gpsController from './admin.gps.controller.js';
import * as performanceController from '../performance/performance.controller.js';
import * as feesController from '../fees/fees.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { enforceActiveSubscription } from '../../middlewares/subscription.middleware.js';
import { validationErrorHandler } from '../../middlewares/validation.middleware.js';
import { validate } from './admin.validator.js';
import { upload } from '../../config/multer.config.js';
import inventoryAdminRoutes from '../inventory/inventory.admin.route.js';

const router = Router();

// ─── GLOBAL PROTECTION MATRIX ─────────────────────────────────────────────
router.use(authenticate);

// 🎯 FIX 1: Allow SUPER_ADMIN inside roles matrix to smoothly fetch configurations
router.use(authorize('ADMIN', 'ACADEMY_ADMIN', 'SUPER_ADMIN'));

// 🎯 FIX 2: Dynamic Subscription Bypass Policy
// If the token belongs to a SUPER_ADMIN, completely bypass subscription checks!
router.use((req, res, next) => {
  console.log('=== Admin Route Subscription Check Debug ===');
  console.log('req.user:', req.user);
  console.log('req.user.role:', req.user.role);
  console.log('typeof req.user.role:', typeof req.user.role);

  if (req.user && req.user.role && typeof req.user.role === 'string' && req.user.role.toUpperCase() === 'SUPER_ADMIN') {
    console.log('SUPER_ADMIN bypassing subscription check');
    return next(); // Pass without subscription check
  }
  // For standard academy admins, apply normal subscription rule
  console.log('Applying normal subscription check');
  return enforceActiveSubscription(req, res, next);
});

router.use('/inventory', inventoryAdminRoutes);

/* ─── ACADEMY DETAILS ────────────────────────────────────────────────────── */
router.get('/academy', adminController.getAcademyDetails);
router.patch('/academy', upload.single('logo'), adminController.updateAcademyDetails);

/* ─── SETTINGS ────────────────────────────────────────────────────────────── */
router.get('/settings', adminController.getAcademyDetails);
router.put('/settings', upload.single('logo'), adminController.updateAcademyDetails);

/* ─── SPORTS CATALOG ────────────────────────────────────────────────────── */
router.get('/sports', adminController.getSportsCatalog);
router.get('/sports/global', adminController.getGlobalSports);
router.post(
  '/sports',
  validate('createSport'),
  validationErrorHandler,
  adminController.createSport,
);
router.patch('/sports/:id', adminController.updateSport);
router.patch('/sports/:id/status', adminController.updateSportStatus);
router.delete('/sports/:id', adminController.deleteSport);
router.post(
  '/sports/bulk-action',
  validate('bulkSportAction'),
  validationErrorHandler,
  adminController.bulkSportAction,
);

/* ─── DURATION PLANS ────────────────────────────────────────────────────── */
router.get('/duration-plans', adminController.getDurationPlans);
router.post(
  '/duration-plans',
  validate('createDurationPlan'),
  validationErrorHandler,
  adminController.createDurationPlan,
);
router.delete('/duration-plans/:plan_id', adminController.deleteDurationPlan);

/* ─── COACH PORTALS ─────────────────────────────────────────────────────── */
router.get('/coaches', adminController.getAllCoaches);
router.post(
  '/coaches',
  validate('createCoach'),
  validationErrorHandler,
  adminController.createCoach,
);
router.post('/coaches/bulk-import', upload.single('file'), adminController.bulkImportCoaches);
router.put(
  '/coaches/:coach_id',
  validate('updateCoach'),
  validationErrorHandler,
  adminController.updateCoach,
);
router.delete('/coaches/:coach_id', adminController.deleteCoach);

/* ─── STUDENTS & ROSTER ENROLLMENTS ─────────────────────────────────────── */
router.get('/students', adminController.getAllStudents);
router.post(
  '/students',
  validate('createStudent'),
  validationErrorHandler,
  adminController.createStudent,
);
router.post('/students/reset-parent-password', adminController.resetParentPassword);
router.put(
  '/students/:student_id',
  validate('updateStudent'),
  validationErrorHandler,
  adminController.updateStudent,
);
router.get('/students/:student_id/details', adminController.getStudentDetails);
router.post('/students/bulk-upload', adminController.bulkUploadStudents);
router.post(
  '/students/bulk-action',
  validate('bulkStudentAction'),
  validationErrorHandler,
  adminController.bulkStudentAction,
);
router.post(
  '/students/:student_id/exit',
  validate('exitStudent'),
  validationErrorHandler,
  adminController.exitStudent,
);
router.put('/students/:student_id/pause', adminController.pauseStudentPlan);
router.put('/students/:student_id/resume', adminController.resumeStudentPlan);
router.delete('/students/:student_id', adminController.deleteStudent);

/* ─── BATCHES TIMING & CAPACITY ─────────────────────────────────────────── */
router.get('/batches', adminController.getAllBatches);
router.get('/batches/available', adminController.getAvailableBatches);
router.post(
  '/batches',
  validate('createBatch'),
  validationErrorHandler,
  adminController.createBatch,
);
router.put(
  '/batches/:batch_id',
  validate('updateBatch'),
  validationErrorHandler,
  adminController.updateBatch,
);
router.post(
  '/batches/:batch_id',
  validate('updateBatch'),
  validationErrorHandler,
  adminController.updateBatch,
);

router.delete('/batches/:batch_id', adminController.deleteBatch);

/* ─── BATCH SESSIONS ─────────────────────────────────────────────────── */
router.get('/batch-sessions', adminController.getBatchSessionHistory);
router.post('/batch-sessions/:session_id/end', adminController.endBatchSession);

/* ─── ATTENDANCE TRACKER ────────────────────────────────────────────────── */
router.post(
  '/coach-attendance',
  validate('markAttendance'),
  validationErrorHandler,
  adminController.markCoachAttendance,
);
router.get('/coach-attendance/:coach_id', adminController.getCoachAttendance);
router.get('/attendance', adminController.getAttendance);

/* ─── FINANCIAL LEDGERS & RECEIPTS ──────────────────────────────────────── */
router.get('/payments', adminController.getAllPayments);
router.get('/accounts', adminController.getAllPayments);
router.post(
  '/payments',
  validate('createPayment'),
  validationErrorHandler,
  adminController.createPayment,
);
router.post(
  '/accounts',
  validate('createPayment'),
  validationErrorHandler,
  adminController.createPayment,
);
router.patch(
  '/payments/:payment_id/status',
  validate('updatePaymentStatus'),
  validationErrorHandler,
  adminController.updatePaymentStatus,
);
router.patch(
  '/accounts/:payment_id/status',
  validate('updatePaymentStatus'),
  validationErrorHandler,
  adminController.updatePaymentStatus,
);

router.get('/accounts/student-ledger/:student_id', adminController.getStudentLedger);
router.get('/accounts/students-fee-summary', adminController.getStudentsFeeSummary);
router.get('/accounts/receipts', adminController.getReceipts);
router.post(
  '/accounts/receipts',
  validate('createPayment'),
  validationErrorHandler,
  adminController.createReceipt,
);
router.get('/accounts/pending-dues', adminController.getPendingDues);
router.get('/accounts/revenue-summary', adminController.getRevenueSummary);

/* ─── FEES REMINDERS ────────────────────────────────────────────────────── */
router.post('/fees/send-reminders', feesController.sendOverdueFeeReminders);

/* ─── INTEL REPORTS & ANALYTICS ─────────────────────────────────────────── */
router.get('/analytics', adminController.getAcademyReport);
router.get('/dashboard', adminController.getAcademyReport);

/* ─── PERFORMANCE TRACKER ──────────────────────────────────────────────────── */
// Backward compatibility layer: Admin routes delegate to Performance module
// These routes maintain frontend API compatibility while using Performance as single source of truth

// Performance assessments
router.get('/performance/assessments', performanceController.getAssessmentHistory);
router.get('/performance/assessments/history', performanceController.getAssessmentHistory);
router.get('/performance/assessments/:assessmentId', performanceController.getAssessmentById);

// Performance analytics
router.get('/performance/analytics/student/:studentId', performanceController.getStudentAnalytics);
router.get('/performance/analytics/batch/:batchId', performanceController.getBatchAnalytics);
router.get('/performance/analytics/academy', performanceController.getAcademyAnalytics);

// Performance attributes
router.get('/performance/attributes', performanceController.getAttributes);
router.get('/performance/approval-queue', performanceController.getApprovalQueue);
router.get('/performance/sport-attributes/:sportId', performanceController.getSportAttributes);

/* ─── GPS ATTENDANCE SETTINGS ────────────────────────────────────────────── */
router.get('/gps/settings', gpsController.getGpsSettings);
router.patch('/gps/settings', gpsController.updateGpsSettings);
router.get('/gps/location-logs', gpsController.getAttendanceLocationLogs);
router.get('/gps/coach-location-logs', gpsController.getCoachAttendanceLocationLogs);
router.patch('/gps/academy-location', gpsController.updateAcademyLocation);
router.patch('/gps/sports/:sport_id/location', gpsController.updateSportLocation);

/* ─── PLATFORM SUBSCRIPTIONS ────────────────────────────────────────── */
router.get('/subscription', adminController.getSubscriptionDetails);
router.get('/subscription/plans', adminController.getSuperAdminPlans);
router.get('/subscription/payment-settings', adminController.getPaymentSettings);
router.post('/subscription/purchase', adminController.purchaseSubscription);

router.get('/notifications', adminController.getAcademyNotifications);
router.patch('/notifications/:id/read', adminController.markAcademyNotificationAsRead);

export default router;