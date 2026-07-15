import express from 'express';
import * as parentController from './parent.controller.js';
import * as announcementsController from '../announcements/announcements.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { body } from 'express-validator';
import { validationErrorHandler } from '../../middlewares/validation.middleware.js';
import { upload } from '../../config/multer.config.js';

const router = express.Router();

// Public routes

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validationErrorHandler,
  parentController.login
);

// Protected routes
router.use(authenticate);

router.get('/profile', parentController.getProfile);
router.put(
  '/update-profile',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
  ],
  validationErrorHandler,
  parentController.updateProfile
);
router.patch(
  '/change-password',
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  validationErrorHandler,
  parentController.changePassword
);
router.get('/children', parentController.getChildren);
router.get('/children/:child_id', parentController.getChildDetails);
router.get('/dashboard', parentController.getDashboard);
router.get('/payments', parentController.getPayments);
router.get('/payments/:receiptId', parentController.getReceiptById);
router.get('/payments/:receiptId/download', parentController.downloadReceipt);
router.post(
  '/payments',
  upload.single('proof_file'),
  [
    body('student_id').notEmpty().withMessage('Student ID is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('payment_date').notEmpty().withMessage('Payment date is required').isISO8601(),
    body('method').isIn(['upi', 'bank_transfer', 'neft', 'rtgs', 'imps']).withMessage('Invalid payment method. Only UPI and Bank Transfer are allowed'),
    body('transaction_number').isLength({ min: 12, max: 50 }).withMessage('Transaction number must be between 12 and 50 characters').matches(/^[a-zA-Z0-9]+$/).withMessage('Transaction number can only contain letters and numbers'),
    body('remarks').optional().isString(),
  ],
  validationErrorHandler,
  parentController.recordPayment
);
router.patch('/payments/:receiptId/proof', upload.single('proof_file'), parentController.updatePaymentProof);
router.get('/children/:child_id/performance', parentController.getChildPerformance);
router.get('/children/:child_id/performance/history', parentController.getChildPerformanceHistory);
router.get('/children/:child_id/performance/analytics', parentController.getChildPerformanceAnalytics);
router.get('/children/:child_id/performance/dashboard', parentController.getChildPerformanceDashboard);

// ─── ANNOUNCEMENT ROUTES ─────────────────────────────────────────────────────

// Get my announcements (as recipient)
router.get('/announcements', announcementsController.getMyAnnouncements);

// Get unread count (must be before :id route)
router.get('/announcements/unread-count', announcementsController.getUnreadCount);

// Mark all announcements as read (must be before :id route)
router.patch('/announcements/read-all', announcementsController.markAllAsRead);

// Get single announcement details
router.get('/announcements/:id', announcementsController.getAnnouncementById);

// Mark announcement as read
router.patch('/announcements/:id/read', announcementsController.markAsRead);

export default router;
