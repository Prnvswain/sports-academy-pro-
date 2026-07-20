import express from 'express';
import * as superAdminController from './super-admin.controller.js';
import * as performanceController from '../performance/performance.controller.js';
import * as announcementsController from '../announcements/announcements.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { authRateLimiter } from '../../middlewares/rateLimit.middleware.js';
import { validationErrorHandler } from '../../middlewares/validation.middleware.js';
import { validate } from './super-admin.validator.js';
import { upload } from '../../config/multer.config.js';

const router = express.Router();

router.post(
  '/login',
  authRateLimiter,
  validate('login'),
  validationErrorHandler,
  superAdminController.login
);

router.use(authenticate);

// GET /sports is accessible by both SUPER_ADMIN and ADMIN
router.get('/sports', authorize(['SUPER_ADMIN', 'ADMIN']), superAdminController.getSports);

// All other routes require SUPER_ADMIN
router.use(authorize('SUPER_ADMIN'));

router.get('/stats', superAdminController.getStats);
router.get('/academies', superAdminController.getAcademies);

// Academy Details & Operations
router.get('/academies/:academy_id', superAdminController.getAcademyDetails);
router.post('/academies/:academy_id/extend', superAdminController.extendAcademySubscription);
router.post('/academies/:academy_id/upgrade', superAdminController.upgradeAcademyPlan);
router.get('/academies/:academy_id/export', superAdminController.exportAcademyData);
router.post('/academies/:academy_id/impersonate', superAdminController.impersonateAcademy);

// Plans Management (Dynamic CRUD)
router.get('/plans', superAdminController.getPlans);
router.post('/plans', superAdminController.createPlan);
router.put('/plans/:plan_id', superAdminController.updatePlan);
router.delete('/plans/:plan_id', superAdminController.deletePlan);
router.patch('/plans/:plan_id/status', superAdminController.patchPlanStatus);

// Trial Settings Config
router.get('/trial-settings', superAdminController.getTrialSettings);
router.put('/trial-settings', superAdminController.updateTrialSettings);

// Payments Management
router.get('/payments', superAdminController.getPaymentsData);
router.put('/payments/settings', superAdminController.updatePaymentSettings);
router.post('/payments/:tx_id/status', superAdminController.updatePaymentStatus);

// System notifications for Super Admin
router.get('/notifications', superAdminController.getSuperAdminNotifications);
router.patch('/notifications/:id/read', superAdminController.markSuperAdminNotificationAsRead);
router.patch('/notifications/read-all', superAdminController.markSuperAdminNotificationsAllAsRead);
router.get('/notifications/unread-count', superAdminController.getSuperAdminUnreadCount);

router.get('/sports', superAdminController.getSports);
router.post('/sports', superAdminController.createSport);
router.put('/sports/:id/attributes', validationErrorHandler, superAdminController.updateSportAttributes);
router.delete('/sports/:id', superAdminController.deleteSport);
router.post('/sports/seed', superAdminController.seedSports);

// NOTE: Super Admin should NOT use PerformanceAttribute table directly
// They should only modify GlobalSport.attributes via the sports endpoints above
// The PerformanceAttribute routes below are for Admin/Coach use only
router.patch(
  '/academies/:academy_id/status',
  validate('updateAcademyStatus'),
  validationErrorHandler,
  superAdminController.patchAcademyStatus
);
router.post(
  '/academies/:academy_id/suspend',
  superAdminController.suspendAcademy
);
router.post(
  '/academies/:academy_id/activate',
  superAdminController.activateAcademy
);
router.get('/settings', superAdminController.getSettings);
router.put(
  '/settings',
  validate('putSetting'),
  validationErrorHandler,
  superAdminController.putSetting
);

// ─── ANNOUNCEMENTS ───────────────────────────────────────────────────────────
// Upload attachment for announcement (max 10MB)
router.post('/announcements/upload', upload.single('file'), announcementsController.uploadAttachment);

// Recipient operations (must come before parameterized routes)
router.get('/announcements/my/announcements', announcementsController.getMyAnnouncements);
router.patch('/announcements/read-all', announcementsController.markAllAsRead);
router.get('/announcements/unread-count', announcementsController.getUnreadCount);

// Announcement CRUD
router.post('/announcements', announcementsController.createAnnouncement);
router.get('/announcements', announcementsController.getAnnouncements);
router.get('/announcements/:id', announcementsController.getAnnouncementById);
router.patch('/announcements/:id', announcementsController.updateAnnouncement);
router.delete('/announcements/:id', announcementsController.deleteAnnouncement);
router.patch('/announcements/:id/archive', announcementsController.archiveAnnouncement);
router.patch('/announcements/:id/read', announcementsController.markAsRead);
router.get('/announcements/:id/stats', announcementsController.getAnnouncementStats);

// Scheduling endpoints (internal/cron)
router.post('/announcements/scheduled/publish', announcementsController.publishScheduledAnnouncements);
router.post('/announcements/expire', announcementsController.expireAnnouncements);

// NOTE: Super Admin should NOT use PerformanceAttribute table directly
// They should only modify GlobalSport.attributes via the sports endpoints above
// PerformanceAttribute routes are for Admin/Coach use only (mounted in admin.route.js and coach.route.js)

export default router;
