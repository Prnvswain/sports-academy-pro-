import * as announcementsService from './announcements.service.js';
import { successResponse } from '../../utils/response.js';
import { uploadToImageKit } from '../../utils/imagekit.util.js';

export const uploadAttachment = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (req.file.size > maxSize) {
      return res.status(400).json({ success: false, message: 'File size exceeds 10MB limit' });
    }

    // Upload to ImageKit
    const uploadResult = await uploadToImageKit(
      req.file.buffer,
      req.file.originalname,
      'announcement-attachments'
    );

    const attachmentInfo = {
      fileName: req.file.originalname,
      url: uploadResult.url,
      type: req.file.mimetype,
      size: req.file.size,
      fileId: uploadResult.fileId
    };

    res.json(successResponse('File uploaded successfully', attachmentInfo));
  } catch (error) {
    next(error);
  }
};

export const createAnnouncement = async (req, res, next) => {
  try {
    const announcement = await announcementsService.createAnnouncement(req.user, req.body);
    res.status(201).json(successResponse('Announcement created successfully', announcement));
  } catch (error) {
    next(error);
  }
};

export const getAnnouncements = async (req, res, next) => {
  try {
    const filters = {
      category: req.query.category,
      priority: req.query.priority,
      status: req.query.status,
      sender_type: req.query.sender_type,
      search: req.query.search,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };
    const result = await announcementsService.getAnnouncements(req.user, filters);
    res.json(successResponse('Announcements retrieved successfully', result));
  } catch (error) {
    next(error);
  }
};

export const getAnnouncementById = async (req, res, next) => {
  try {
    const announcement = await announcementsService.getAnnouncementById(parseInt(req.params.id));
    res.json(successResponse('Announcement retrieved successfully', announcement));
  } catch (error) {
    next(error);
  }
};

export const updateAnnouncement = async (req, res, next) => {
  try {
    const announcement = await announcementsService.updateAnnouncement(
      req.user, 
      parseInt(req.params.id), 
      req.body
    );
    res.json(successResponse('Announcement updated successfully', announcement));
  } catch (error) {
    next(error);
  }
};

export const deleteAnnouncement = async (req, res, next) => {
  try {
    const result = await announcementsService.deleteAnnouncement(req.user, parseInt(req.params.id));
    res.json(successResponse('Announcement deleted successfully', result));
  } catch (error) {
    next(error);
  }
};

export const archiveAnnouncement = async (req, res, next) => {
  try {
    const result = await announcementsService.archiveAnnouncement(req.user, parseInt(req.params.id));
    res.json(successResponse('Announcement archived successfully', result));
  } catch (error) {
    next(error);
  }
};

export const getMyAnnouncements = async (req, res, next) => {
  try {
    const filters = {
      unread_only: req.query.unread_only === 'true',
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };
    const result = await announcementsService.getMyAnnouncements(req.user, filters);
    res.json(successResponse('My announcements retrieved successfully', result));
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const readStatus = await announcementsService.markAsRead(req.user, parseInt(req.params.id));
    res.json(successResponse('Announcement marked as read', readStatus));
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const result = await announcementsService.markAllAsRead(req.user);
    res.json(successResponse('All announcements marked as read', result));
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const result = await announcementsService.getUnreadCount(req.user);
    res.json(successResponse('Unread count retrieved', result));
  } catch (error) {
    next(error);
  }
};

export const getAnnouncementStats = async (req, res, next) => {
  try {
    const stats = await announcementsService.getAnnouncementStats(req.user, parseInt(req.params.id));
    res.json(successResponse('Announcement stats retrieved', stats));
  } catch (error) {
    next(error);
  }
};

export const publishScheduledAnnouncements = async (req, res, next) => {
  try {
    const result = await announcementsService.publishScheduledAnnouncements();
    res.json(successResponse('Scheduled announcements published', result));
  } catch (error) {
    next(error);
  }
};

export const expireAnnouncements = async (req, res, next) => {
  try {
    const result = await announcementsService.expireAnnouncements();
    res.json(successResponse('Expired announcements processed', result));
  } catch (error) {
    next(error);
  }
};
