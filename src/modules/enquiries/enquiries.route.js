import express from 'express';
import * as enquiriesController from './enquiries.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validationErrorHandler } from '../../middlewares/validation.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all enquiries
router.get('/', enquiriesController.getEnquiries);

// Update enquiry status and remarks
router.patch('/:id', validationErrorHandler, enquiriesController.updateEnquiry);

export default router;
