import express from 'express';
import * as performanceController from './performance.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validationErrorHandler } from '../../middlewares/validation.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get performance attributes (with optional filters)
router.get('/attributes', performanceController.getAttributes);

// Create new performance attribute
router.post('/attributes', validationErrorHandler, performanceController.createAttribute);

// Approve performance attribute (Admin only)
router.put('/attributes/:attributeId/approve', performanceController.approveAttribute);

// Reject performance attribute (Admin only)
router.put('/attributes/:attributeId/reject', performanceController.rejectAttribute);

// Get approval queue (Admin only)
router.get('/approval-queue', performanceController.getApprovalQueue);

// Get performance scores (with optional filters)
router.get('/scores', performanceController.getScores);

// Create new performance score
router.post('/scores', validationErrorHandler, performanceController.createScore);

// Get assessment history with filtering
router.get('/assessments/history', performanceController.getAssessmentHistory);

// Get specific assessment by ID
router.get('/assessments/:assessmentId', performanceController.getAssessmentById);

// Get student performance
router.get('/students/:studentId', performanceController.getStudentPerformance);

// Get batch performance
router.get('/batches/:batchId', performanceController.getBatchPerformance);

// Submit weekly performance report
router.post('/weekly-performance', performanceController.submitWeeklyPerformance);

// Performance analytics endpoints
router.get('/analytics/student/:studentId', performanceController.getStudentAnalytics);
router.get('/analytics/batch/:batchId', performanceController.getBatchAnalytics);
router.get('/analytics/academy', performanceController.getAcademyAnalytics);

// Sport attributes synchronization endpoints
router.get('/sport-attributes/:sportId', performanceController.getSportAttributes);
router.post('/rate-student', performanceController.rateStudent);
router.post('/sync-global-attributes/:sportId', performanceController.syncGlobalSportAttributes);

export default router;
