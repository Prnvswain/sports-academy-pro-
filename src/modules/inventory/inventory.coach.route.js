import { Router } from 'express';
import * as inventoryController from './inventory.controller.js';
import * as kitsController from './kits.controller.js';
import { upload } from '../../config/multer.config.js';

const router = Router();

// Coach inventory (equipment) routes
router.get('/', inventoryController.getCoachAssignments);
router.get('/requests', inventoryController.getCoachRequests);
router.post('/requests', upload.single('proof_file'), inventoryController.createCoachRequest);

// Coach kit assignment routes
router.get('/kits', kitsController.getMyCoachKitAssignments);
router.post('/kits/:kit_id/assign', kitsController.assignKitFromCoach);
router.get('/kits/student-assignments', kitsController.getMyCoachStudentAssignments);
router.patch('/kits/student-assignments/:assignment_id/payment', kitsController.updateCoachStudentPaymentStatus);

export default router;

