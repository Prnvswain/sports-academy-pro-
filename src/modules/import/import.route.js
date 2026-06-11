import express from 'express';
import * as importController from './import.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'ACADEMY_ADMIN'));

router.get('/:entity/template.csv', importController.getTemplate);
router.post('/:entity/validate', importController.validateImport);
router.post('/:entity/commit', importController.commitImport);

export default router;
