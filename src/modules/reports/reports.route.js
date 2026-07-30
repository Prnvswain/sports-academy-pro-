import express from 'express';
import * as reportsController from './reports.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'ACADEMY_ADMIN'));

// Existing CSV/PDF export routes
router.get('/monthly-collection.csv', reportsController.exportReport('monthly-collection'));
router.get('/pending-fees.csv', reportsController.exportReport('pending-fees'));
router.get('/student-fee.csv', reportsController.exportReport('student-fee'));
router.get('/batch-collection.csv', reportsController.exportReport('batch-collection'));

router.get('/monthly-collection.pdf', reportsController.exportReportPdf('monthly-collection'));
router.get('/pending-fees.pdf', reportsController.exportReportPdf('pending-fees'));
router.get('/student-fee.pdf', reportsController.exportReportPdf('student-fee'));
router.get('/batch-collection.pdf', reportsController.exportReportPdf('batch-collection'));

// New JSON report data endpoints
router.get('/data/:type', reportsController.getReportData);
router.get('/filter-options', reportsController.getFilterOptions);

export default router;
