import { isOperationBlocked } from '../modules/calendar/calendar.service.js';

export const checkCalendarLock = (operationType) => {
  return async (req, res, next) => {
    try {
      const academyId = req.user.academy_id;
      // Extract target date from body (date or assessment_date or session_date) or default to today's local date
      const dateStr = req.body.date || req.body.assessment_date || req.body.session_date || new Date().toISOString();
      const batchId = req.body.batch_id ? parseInt(req.body.batch_id, 10) : null;

      const blocked = await isOperationBlocked(academyId, dateStr, operationType, batchId);
      if (blocked && blocked.blocked) {
        return res.status(403).json({
          success: false,
          message: blocked.message || 'This operation is not allowed because the selected date is marked as a Holiday/Event.'
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
