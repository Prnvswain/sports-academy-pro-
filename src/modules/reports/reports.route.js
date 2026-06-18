import express from 'express';
import * as reportsController from './reports.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'ACADEMY_ADMIN'));

router.get('/attendance.csv', reportsController.exportReport('attendance'));
router.get('/students.csv', reportsController.exportReport('students'));
router.get('/fees.csv', reportsController.exportReport('fees'));
router.get('/coaches.csv', reportsController.exportReport('coaches'));
router.get('/batches.csv', reportsController.exportReport('batches'));

router.get('/attendance.pdf', reportsController.exportReportPdf('attendance'));
router.get('/students.pdf', reportsController.exportReportPdf('students'));
router.get('/fees.pdf', reportsController.exportReportPdf('fees'));
router.get('/coaches.pdf', reportsController.exportReportPdf('coaches'));
router.get('/batches.pdf', reportsController.exportReportPdf('batches'));

export default router;
