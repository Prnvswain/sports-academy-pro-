import { Router } from 'express';
import * as calendarController from './calendar.controller.js';

export const adminCalendarRouter = Router();
adminCalendarRouter.get('/', calendarController.listEvents);
adminCalendarRouter.post('/', calendarController.createEvent);
adminCalendarRouter.put('/:event_id', calendarController.updateEvent);
adminCalendarRouter.delete('/:event_id', calendarController.deleteEvent);
adminCalendarRouter.post('/override', calendarController.createOverride);
adminCalendarRouter.get('/dashboard', calendarController.getDashboardStats);
adminCalendarRouter.post('/reset', calendarController.resetEvents);
adminCalendarRouter.post('/clear', calendarController.clearEvents);
adminCalendarRouter.post('/copy-previous', calendarController.copyPrevious);
adminCalendarRouter.post('/weekly-off', calendarController.bulkSetWeeklyOff);

// Admin Batch Off Requests management routes
adminCalendarRouter.get('/holiday-requests', calendarController.listHolidayRequests);
adminCalendarRouter.post('/holiday-requests/:request_id/approve', calendarController.approveHolidayRequest);
adminCalendarRouter.post('/holiday-requests/:request_id/reject', calendarController.rejectHolidayRequest);

export const coachCalendarRouter = Router();
coachCalendarRouter.get('/', calendarController.listEvents);
coachCalendarRouter.get('/dashboard', calendarController.getDashboardStats);
coachCalendarRouter.post('/', calendarController.createEvent);
coachCalendarRouter.put('/:event_id', calendarController.updateEvent);
coachCalendarRouter.delete('/:event_id', calendarController.deleteEvent);

// Coach Batch Off Requests submission routes
coachCalendarRouter.post('/holiday-requests', calendarController.createHolidayRequest);
coachCalendarRouter.get('/holiday-requests', calendarController.listHolidayRequests);

export const parentCalendarRouter = Router();
parentCalendarRouter.get('/', calendarController.listEvents);
parentCalendarRouter.get('/dashboard', calendarController.getDashboardStats);
