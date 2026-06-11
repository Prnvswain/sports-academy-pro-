import express from 'express';
import authRoutes from '../modules/auth/auth.route.js';
import adminRoutes from '../modules/admin/admin.route.js';
import coachRoutes from '../modules/coach/coach.route.js';
import superAdminRoutes from '../modules/super-admin/super-admin.route.js';
import importRoutes from '../modules/import/import.route.js';
import notesRoutes from '../modules/notes/notes.route.js';
import reportsRoutes from '../modules/reports/reports.route.js';
import publicRoutes from '../modules/public/public.route.js';
import { authRateLimiter } from '../middlewares/rateLimit.middleware.js';

const router = express.Router();

router.use('/public', publicRoutes);
router.use('/auth', authRateLimiter, authRoutes);
router.use('/super-admin', superAdminRoutes);
router.use('/admin', adminRoutes);
router.use('/admin/import', importRoutes);
router.use('/admin/reports', reportsRoutes);
router.use('/coach', coachRoutes);
router.use('/coach/notes', notesRoutes);

export default router;