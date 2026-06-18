import express from 'express';
import * as auditController from './audit.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'ACADEMY_ADMIN', 'SUPER_ADMIN'));

router.get('/', auditController.getAuditLogs);
router.get('/:id', auditController.getAuditLogById);

export default router;
