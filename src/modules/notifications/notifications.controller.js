import * as notificationsService from './notifications.service.js';
import { successResponse } from '../../utils/response.js';

export const createNotification = async (req, res, next) => {
  try {
    const notification = await notificationsService.createNotification(
      req.user.academy_id,
      req.body
    );
    res.status(201).json(successResponse('Notification created', notification));
  } catch (err) {
    next(err);
  }
};

export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await notificationsService.getNotifications(
      req.user.academy_id,
      req.user.user_id,
      req.user.coach_id
    );
    res.json(successResponse('Notifications retrieved', notifications));
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const notification = await notificationsService.markAsRead(req.params.id);
    res.json(successResponse('Notification marked as read', notification));
  } catch (err) {
    next(err);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const result = await notificationsService.markAllAsRead(
      req.user.academy_id,
      req.user.user_id,
      req.user.coach_id
    );
    res.json(successResponse('All notifications marked as read', result));
  } catch (err) {
    next(err);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const result = await notificationsService.getUnreadCount(
      req.user.academy_id,
      req.user.user_id,
      req.user.coach_id
    );
    res.json(successResponse('Unread count retrieved', result));
  } catch (err) {
    next(err);
  }
};
