import express from 'express';
import * as announcementsController from './announcements.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { upload } from '../../config/multer.config.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ─── FILE UPLOAD ─────────────────────────────────────────────────────────────

// Upload attachment for announcement (max 10MB)
router.post('/upload', upload.single('file'), announcementsController.uploadAttachment);

// ─── RECIPIENT OPERATIONS (Must come before parameterized routes) ─────────────

// Get my announcements (as recipient)
router.get('/my/announcements', announcementsController.getMyAnnouncements);

// Mark all announcements as read
router.patch('/read-all', announcementsController.markAllAsRead);

// Get unread count
router.get('/unread-count', announcementsController.getUnreadCount);

// ─── ANNOUNCEMENT CRUD ───────────────────────────────────────────────────────

// Create announcement (all authenticated users can create based on role permissions)
router.post('/', announcementsController.createAnnouncement);

// Get announcements for sender (history)
router.get('/', announcementsController.getAnnouncements);

// Get single announcement details
router.get('/:id', announcementsController.getAnnouncementById);

// Update announcement (only draft/scheduled)
router.patch('/:id', announcementsController.updateAnnouncement);

// Delete announcement
router.delete('/:id', announcementsController.deleteAnnouncement);

// Archive announcement
router.patch('/:id/archive', announcementsController.archiveAnnouncement);

// Mark announcement as read
router.patch('/:id/read', announcementsController.markAsRead);

// Get announcement statistics (for sender)
router.get('/:id/stats', announcementsController.getAnnouncementStats);

// ─── SCHEDULING ENDPOINTS (typically called by cron jobs) ─────────────────────

// Publish scheduled announcements (internal/cron endpoint)
router.post('/scheduled/publish', announcementsController.publishScheduledAnnouncements);

// Expire announcements (internal/cron endpoint)
router.post('/expire', announcementsController.expireAnnouncements);

export default router;
