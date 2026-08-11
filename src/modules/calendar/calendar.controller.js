import * as calendarService from './calendar.service.js';
import logger from '../../utils/logger.js';

export const listEvents = async (req, res) => {
  try {
    const academyId = req.user.academy_id;
    const events = await calendarService.getCalendarEvents(academyId, req.query, req.user);
    return res.status(200).json({ success: true, data: events });
  } catch (error) {
    logger.error('Error listing calendar events:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createEvent = async (req, res) => {
  try {
    const academyId = req.user.academy_id;
    const event = await calendarService.createCalendarEvent(academyId, req.body, req.user);
    return res.status(201).json({ success: true, data: event });
  } catch (error) {
    logger.error('Error creating calendar event:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const academyId = req.user.academy_id;
    const eventId = req.params.event_id;
    const event = await calendarService.updateCalendarEvent(academyId, eventId, req.body, req.user);
    return res.status(200).json({ success: true, data: event });
  } catch (error) {
    logger.error('Error updating calendar event:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const academyId = req.user.academy_id;
    const eventId = req.params.event_id;
    await calendarService.deleteCalendarEvent(academyId, eventId, req.user);
    return res.status(200).json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    logger.error('Error deleting calendar event:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const createOverride = async (req, res) => {
  try {
    const academyId = req.user.academy_id;
    const userId = req.user.user_id || req.user.id;
    const override = await calendarService.createDateOverride(academyId, userId, req.body);
    return res.status(201).json({ success: true, data: override });
  } catch (error) {
    logger.error('Error creating date override:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const academyId = req.user.academy_id;
    const stats = await calendarService.getCalendarDashboardStats(academyId, req.user, req.query);
    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    logger.error('Error fetching calendar dashboard stats:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const resetEvents = async (req, res) => {
  try {
    const academyId = req.user.academy_id;
    const { year, month } = req.body;
    await calendarService.resetCalendarEvents(academyId, year, month);
    return res.status(200).json({ success: true, message: 'Calendar reset successfully.' });
  } catch (error) {
    logger.error('Error resetting calendar events:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const clearEvents = async (req, res) => {
  try {
    const academyId = req.user.academy_id;
    const { year, month } = req.body;
    await calendarService.clearCalendarEvents(academyId, year, month);
    return res.status(200).json({ success: true, message: 'Calendar cleared successfully.' });
  } catch (error) {
    logger.error('Error clearing calendar events:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const copyPrevious = async (req, res) => {
  try {
    const academyId = req.user.academy_id;
    const { year, month } = req.body;
    await calendarService.copyCalendarFromPreviousMonth(academyId, year, month);
    return res.status(200).json({ success: true, message: 'Calendar copied from previous month.' });
  } catch (error) {
    logger.error('Error copying calendar from previous month:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const bulkSetWeeklyOff = async (req, res) => {
  try {
    const academyId = req.user.academy_id;
    const { year, month, rule } = req.body;
    await calendarService.applyWeeklyOffRule(academyId, year, month, rule);
    return res.status(200).json({ success: true, message: 'Weekly off rule applied.' });
  } catch (error) {
    logger.error('Error setting weekly off rule:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// ─── Batch Holiday Requests ───────────────────────────────────────────────────

export const createHolidayRequest = async (req, res) => {
  try {
    const academyId = req.user.academy_id;
    const request = await calendarService.createBatchHolidayRequest(academyId, req.user, req.body);
    return res.status(201).json({ success: true, data: request });
  } catch (error) {
    logger.error('Error creating batch holiday request:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const listHolidayRequests = async (req, res) => {
  try {
    const academyId = req.user.academy_id;
    const requests = await calendarService.getBatchHolidayRequests(academyId, req.user);
    return res.status(200).json({ success: true, data: requests });
  } catch (error) {
    logger.error('Error listing batch holiday requests:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const approveHolidayRequest = async (req, res) => {
  try {
    const academyId = req.user.academy_id;
    const requestId = req.params.request_id;
    const request = await calendarService.approveBatchHolidayRequest(academyId, requestId);
    return res.status(200).json({ success: true, data: request });
  } catch (error) {
    logger.error('Error approving batch holiday request:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const rejectHolidayRequest = async (req, res) => {
  try {
    const academyId = req.user.academy_id;
    const requestId = req.params.request_id;
    const { reason } = req.body;
    const request = await calendarService.rejectBatchHolidayRequest(academyId, requestId, reason);
    return res.status(200).json({ success: true, data: request });
  } catch (error) {
    logger.error('Error rejecting batch holiday request:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};
