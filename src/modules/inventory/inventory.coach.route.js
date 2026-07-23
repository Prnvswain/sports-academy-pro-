import { Router } from 'express';
import * as inventoryController from './inventory.controller.js';
import { upload } from '../../config/multer.config.js';

const router = Router();

router.get('/', inventoryController.getCoachAssignments);
router.get('/requests', inventoryController.getCoachRequests);
router.post('/requests', upload.single('proof_file'), inventoryController.createCoachRequest);

export default router;
