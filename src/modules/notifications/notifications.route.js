import express from 'express';
import * as notificationsController from './notifications.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.post('/', notificationsController.createNotification);
router.get('/', notificationsController.getNotifications);
router.patch('/:id/read', notificationsController.markAsRead);
router.patch('/read-all', notificationsController.markAllAsRead);
router.get('/unread-count', notificationsController.getUnreadCount);

export default router;
