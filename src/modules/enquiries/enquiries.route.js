import express from 'express';
import * as enquiriesController from './enquiries.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validationErrorHandler } from '../../middlewares/validation.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ==================== DASHBOARD STATS ====================

// Get enquiry dashboard statistics
router.get('/dashboard/stats', enquiriesController.getDashboardStats);

// Get overdue follow-ups
router.get('/dashboard/overdue', enquiriesController.getOverdueFollowUps);

// ==================== ENQUIRY CRUD ====================

// Get all enquiries with optional filters
// Query params: status, sportInterested, search, startDate, endDate
router.get('/', enquiriesController.getEnquiries);

// Get single enquiry by ID
router.get('/:id', enquiriesController.getEnquiryById);

// Create new enquiry
router.post('/', enquiriesController.createEnquiry);

// Update enquiry
router.put('/:id', enquiriesController.updateEnquiry);

// Delete enquiry
router.delete('/:id', enquiriesController.deleteEnquiry);

// ==================== FOLLOW-UP SYSTEM ====================

// Schedule follow-up for enquiry
router.post('/:id/follow-up', enquiriesController.scheduleFollowUp);

// Mark follow-up as completed
router.post('/:id/follow-up/complete', enquiriesController.completeFollowUp);

// ==================== CONVERSION SYSTEM ====================

// Convert enquiry to student
router.post('/:id/convert', enquiriesController.convertToStudent);

export default router;
