import express from 'express';
import * as reportsController from './reports.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'ACADEMY_ADMIN'));

router.get('/attendance.csv', reportsController.exportReport('attendance'));
router.get('/students.csv', reportsController.exportReport('students'));
router.get('/fees.csv', reportsController.exportReport('fees'));

export default router;
