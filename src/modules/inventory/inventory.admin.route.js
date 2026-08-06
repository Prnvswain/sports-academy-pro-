import { Router } from 'express';
import * as inventoryController from './inventory.controller.js';
import * as kitsController from './kits.controller.js';
import { upload } from '../../config/multer.config.js';

const router = Router();

// ─── SPORTS KIT ROUTES ────────────────────────────────────────────────────────
router.get('/kits/sports', kitsController.getSportsList);
router.get('/kits/dashboard', kitsController.getDashboard);
router.get('/kits/reports', kitsController.getReports);
router.get('/kits/assignments', kitsController.getAssignments);

// Coach Assignment Routes (admin manages)
router.get('/kits/coach-assignments', kitsController.getCoachKitAssignments);
router.post('/kits/coach-assignments', kitsController.assignKitToCoach);
router.put('/kits/coach-assignments/:id', kitsController.editCoachKitAssignment);
router.delete('/kits/coach-assignments/:id', kitsController.revokeCoachKitAssignment);

router.get('/kits', kitsController.getKits);
router.post('/kits', kitsController.createKit);
router.put('/kits/:kit_id', kitsController.updateKit);
router.delete('/kits/:kit_id', kitsController.deleteKit);
router.post('/kits/:kit_id/assign', kitsController.assignKit);
router.patch('/kits/assignments/:assignment_id/return', kitsController.returnKit);
router.patch('/kits/assignments/:assignment_id/payment', kitsController.updatePaymentStatus);

// ─── STANDARD INVENTORY ROUTES ────────────────────────────────────────────────
router.get('/', inventoryController.getItems);
router.post('/', upload.single('image'), inventoryController.createItem);
router.put('/:item_id', upload.single('image'), inventoryController.updateItem);
router.post('/:item_id/stock', inventoryController.adjustStock);
router.post('/:item_id/assign', inventoryController.assignEquipment);
router.post('/assignment/:assignment_id/return', inventoryController.returnEquipment);
router.get('/assignments', inventoryController.getAssignments);
router.get('/requests', inventoryController.getRequests);
router.post('/requests/:request_id/action', inventoryController.actionRequest);
router.get('/dashboard', inventoryController.getDashboard);
router.get('/reports', inventoryController.getReports);

export default router;

