import { Router } from 'express';
import { authRoutes } from './auth.routes.js';
import { schoolRoutes } from './school.routes.js';
import { teacherRoutes } from './teacher.routes.js';
import { syllabusRoutes } from './syllabus.routes.js';
import { dashboardRoutes } from './dashboard.routes.js';
import { progressRoutes } from './progress.routes.js';
import { planRoutes } from './plan.routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/schools', schoolRoutes);
apiRouter.use('/teachers', teacherRoutes);
apiRouter.use('/syllabus', syllabusRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/progress', progressRoutes);
apiRouter.use('/plans', planRoutes);

apiRouter.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});
