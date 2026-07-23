import { Router } from 'express';
import * as inventoryController from './inventory.controller.js';
import { upload } from '../../config/multer.config.js';

const router = Router();

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
