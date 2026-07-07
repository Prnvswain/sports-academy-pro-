import { Router } from 'express';
import * as adminController from './admin.controller.js';
import * as gpsController from './admin.gps.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { enforceActiveSubscription } from '../../middlewares/subscription.middleware.js';
import { validationErrorHandler } from '../../middlewares/validation.middleware.js';
import { validate } from './admin.validator.js';
import { upload } from '../../config/multer.config.js';

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

/* ─── ACADEMY DETAILS ────────────────────────────────────────────────────── */
router.get('/academy', adminController.getAcademyDetails);

/* ─── SPORTS CATALOG ────────────────────────────────────────────────────── */
router.get('/sports', adminController.getSportsCatalog);
router.get('/sports/global', adminController.getGlobalSports);
router.post(
  '/sports',
  validate('createSport'),
  validationErrorHandler,
  adminController.createSport,
);
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
router.get('/accounts/receipts', adminController.getReceipts);
router.post(
  '/accounts/receipts',
  validate('createPayment'),
  validationErrorHandler,
  adminController.createReceipt,
);
router.get('/accounts/pending-dues', adminController.getPendingDues);
router.get('/accounts/revenue-summary', adminController.getRevenueSummary);

/* ─── INTEL REPORTS & ANALYTICS ─────────────────────────────────────────── */
router.get('/analytics', adminController.getAcademyReport);
router.get('/dashboard', adminController.getAcademyReport);

/* ─── PUBLIC ENQUIRIES INTERFACE ────────────────────────────────────────── */
router.get('/enquiries', adminController.getEnquiries);
router.patch('/enquiries/:id', adminController.updateEnquiry);

/* ─── PERFORMANCE TRACKER (NEW SYSTEM ADDITION) ─────────────────────────── */
router.get('/performance/attributes', adminController.getPerformanceApprovalQueue);
router.get('/performance/approval-queue', adminController.getPerformanceApprovalQueue);
router.post('/performance/attributes', adminController.createPerformanceAttribute);
router.patch('/performance/approve-attribute/:id', adminController.approvePerformanceAttribute);
router.get('/performance/sport-attributes/:sportId', adminController.getPerformanceApprovalQueue);
router.get('/performance/student-history/:studentId', adminController.getStudentPerformanceHistory);
router.get('/performance/analytics/student/:studentId', adminController.getStudentPerformanceAnalytics);
router.get('/performance/analytics/batch/:batchId', adminController.getBatchPerformanceAnalytics);
router.get('/performance/analytics/academy', adminController.getAcademyPerformanceAnalytics);

/* ─── SMART BROADCAST CENTER ─────────────────────────────────────────────── */
router.get('/announcements', adminController.getAnnouncements);
router.post('/announcements', adminController.createAnnouncement);
router.get('/coaches/:coachId/notifications', adminController.getCoachNotifications);
router.patch('/notifications/:notificationId/read', adminController.markNotificationAsRead);

/* ─── GPS ATTENDANCE SETTINGS ────────────────────────────────────────────── */
router.get('/gps/settings', gpsController.getGpsSettings);
router.patch('/gps/settings', gpsController.updateGpsSettings);
router.get('/gps/location-logs', gpsController.getAttendanceLocationLogs);
router.get('/gps/coach-location-logs', gpsController.getCoachAttendanceLocationLogs);
router.patch('/gps/academy-location', gpsController.updateAcademyLocation);
router.patch('/gps/sports/:sport_id/location', gpsController.updateSportLocation);

export default router;