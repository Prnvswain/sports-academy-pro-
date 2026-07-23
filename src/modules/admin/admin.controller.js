import * as adminService from './admin.service.js';
import * as coachService from '../coach/coach.service.js';
import { successResponse } from '../../utils/response.js';
import logger from '../../utils/logger.js';

export const getAcademyDetails = async (req, res, next) => {
  try {
    const academy = await adminService.getAcademyDetails(req.user.academy_id);
    res.json(successResponse('Academy details retrieved successfully', academy));
  } catch (err) {
    next(err);
  }
};

export const updateAcademyDetails = async (req, res, next) => {
  try {
    const academy = await adminService.updateAcademyDetails(req.user.academy_id, {
      ...req.body,
      logo: req.file
    });
    res.json(successResponse('Academy details updated successfully', academy));
  } catch (err) {
    next(err)
  }
};

export const getSportsCatalog = async (req, res, next) => {
  try {
    const sports = await adminService.getSportsCatalog(req.user.academy_id);
    res.json(successResponse('Sports catalog retrieved successfully', sports));
  } catch (err) {
    next(err);
  }
};

export const getGlobalSports = async (req, res, next) => {
  try {
    const sports = await adminService.getGlobalSports();
    res.json(successResponse('Global sports retrieved successfully', sports));
  } catch (err) {
    next(err);
  }
};

export const getDurationPlans = async (req, res, next) => {
  try {
    const plans = await adminService.getDurationPlans(req.user.academy_id);
    res.json(successResponse('Duration plans retrieved successfully', plans));
  } catch (err) {
    next(err);
  }
};

export const createDurationPlan = async (req, res, next) => {
  try {
    const plan = await adminService.createDurationPlan(req.user.academy_id, req.body);
    res.status(201).json(successResponse('Duration plan created successfully', plan));
  } catch (err) {
    next(err);
  }
};

export const deleteDurationPlan = async (req, res, next) => {
  try {
    const plan = await adminService.deleteDurationPlan(req.user.academy_id, req.params.plan_id);
    res.json(successResponse('Duration plan deleted successfully', plan));
  } catch (err) {
    next(err);
  }
};

export const getStudentDetails = async (req, res, next) => {
  try {
    const details = await adminService.getStudentDetails(
      req.user.academy_id,
      req.params.student_id,
    );
    res.json(successResponse('Student details retrieved successfully', details));
  } catch (err) {
    next(err);
  }
};

export const bulkUploadStudents = async (req, res, next) => {
  try {
    const result = await adminService.bulkUploadStudents(req.user.academy_id, req.body.students);
    res.status(201).json(successResponse('Bulk upload completed', result));
  } catch (err) {
    next(err);
  }
};

export const bulkStudentAction = async (req, res, next) => {
  try {
    const result = await adminService.bulkStudentAction(req.user.academy_id, req.body);
    res.json(successResponse('Bulk action completed successfully', result));
  } catch (err) {
    next(err);
  }
};

export const createSport = async (req, res, next) => {
  try {
    const sport = await adminService.createSport(req.user.academy_id, req.body);
    res.status(201).json(successResponse('Sport created successfully', sport));
  } catch (err) {
    next(err);
  }
};

export const updateSportStatus = async (req, res, next) => {
  try {
    const sport = await adminService.updateSportStatus(
      req.user.academy_id,
      req.params.id,
      req.body,
    );
    res.json(successResponse('Sport status updated successfully', sport));
  } catch (err) {
    logger.error('Failed to update sport status', err);
    next(err);
  }
};

export const updateSport = async (req, res, next) => {
  try {
    const sport = await adminService.updateSport(
      req.user.academy_id,
      req.params.id,
      req.body,
    );
    res.json(successResponse('Sport updated successfully', sport));
  } catch (err) {
    logger.error('Failed to update sport', err);
    next(err);
  }
};

export const deleteSport = async (req, res, next) => {
  try {
    await adminService.deleteSport(req.user.academy_id, req.params.id);
    res.json(successResponse('Sport deleted successfully', {}));
  } catch (err) {
    logger.error('Failed to delete sport', err);
    next(err);
  }
};

export const bulkSportAction = async (req, res, next) => {
  try {
    const result = await adminService.bulkSportAction(req.user.academy_id, req.body);
    res.json(successResponse('Bulk action completed successfully', result));
  } catch (err) {
    next(err);
  }
};

export const getAllCoaches = async (req, res, next) => {
  try {
    const coaches = await adminService.getAllCoaches(req.user.academy_id);
    res.json(successResponse('Coaches retrieved successfully', coaches));
  } catch (err) {
    next(err);
  }
};

export const createCoach = async (req, res, next) => {
  try {
    const coach = await adminService.createCoach(req.user.academy_id, req.body);
    res.status(201).json(successResponse('Coach created and onboarding email sent', coach));
  } catch (err) {
    next(err)
  }
};

export const bulkImportCoaches = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error('No file uploaded');
      error.statusCode = 400;
      throw error;
    }
    const result = await adminService.bulkImportCoaches(req.user.academy_id, req.file);
    res.status(201).json(successResponse('Coaches imported successfully', result));
  } catch (err) {
    next(err);
  }
};

export const updateCoach = async (req, res, next) => {
  try {
    const coach = await adminService.updateCoach(
      req.user.academy_id,
      req.params.coach_id,
      req.body,
    );
    res.json(successResponse('Coach updated successfully', coach));
  } catch (err) {
    next(err);
  }
};

export const deleteCoach = async (req, res, next) => {
  try {
    await adminService.deleteCoach(req.user.academy_id, req.params.coach_id);
    res.json(successResponse('Coach archived successfully', {}));
  } catch (err) {
    next(err);
  }
};

export const getAllStudents = async (req, res, next) => {
  try {
    const students = await adminService.getAllStudents(req.user.academy_id);
    res.json(successResponse('Students retrieved successfully', students));
  } catch (err) {
    next(err);
  }
};

export const getStudentsByBatch = async (req, res, next) => {
  try {
    const { batch_id } = req.params;
    const result = await adminService.getStudentsByBatch(req.user.academy_id, batch_id);
    res.json(successResponse('Students retrieved successfully', result));
  } catch (err) {
    next(err);
  }
};

export const createStudent = async (req, res, next) => {
  try {
    const student = await adminService.createStudent(req.user.academy_id, req.body);
    res.status(201).json(successResponse('Student created successfully', student));
  } catch (err) {
    logger.error('Failed to create student', err);
    next(err);
  }
};

export const updateStudent = async (req, res, next) => {
  try {
    const student = await adminService.updateStudent(
      req.user.academy_id,
      req.params.student_id,
      req.body,
    );
    res.json(successResponse('Student updated successfully', student));
  } catch (err) {
    next(err);
  }
};

export const exitStudent = async (req, res, next) => {
  try {
    const student = await adminService.exitStudent(
      req.user.academy_id,
      req.params.student_id,
      req.body,
      req.user.user_id,
    );
    res.json(successResponse('Student exit recorded', student));
  } catch (err) {
    next(err);
  }
};

export const deleteStudent = async (req, res, next) => {
  try {
    await adminService.deleteStudent(req.user.academy_id, req.params.student_id);
    res.json(successResponse('Student archived successfully', {}));
  } catch (err) {
    next(err);
  }
};

export const pauseStudentPlan = async (req, res, next) => {
  try {
    const result = await adminService.pauseStudentPlan(
      req.user.academy_id,
      req.params.student_id,
      req.body,
      req.user.user_id,
    );
    res.json(successResponse('Student plan paused successfully', result));
  } catch (err) {
    logger.error('Failed to pause student plan', err);
    next(err);
  }
};

export const resumeStudentPlan = async (req, res, next) => {
  try {
    const result = await adminService.resumeStudentPlan(
      req.user.academy_id,
      req.params.student_id,
      req.user.user_id,
    );
    res.json(successResponse('Student plan resumed successfully', result));
  } catch (err) {
    logger.error('Failed to resume student plan', err);
    next(err);
  }
};

export const resetParentPassword = async (req, res, next) => {
  try {
    const { student_id, new_password, send_email } = req.body;
    
    if (!student_id || !new_password) {
      const error = new Error('Student ID and new password are required');
      error.statusCode = 400;
      throw error;
    }

    const result = await adminService.resetParentPassword(
      req.user.academy_id,
      student_id,
      new_password,
      send_email,
      req.user.user_id,
    );
    
    res.json(successResponse(
      send_email ? 'Password reset and email sent successfully' : 'Password reset successfully',
      result
    ));
  } catch (err) {
    logger.error('Failed to reset parent password', err);
    next(err);
  }
};

export const getAllBatches = async (req, res, next) => {
  try {
    const batches = await adminService.getAllBatches(req.user.academy_id);
    res.json(successResponse('Batches retrieved successfully', batches));
  } catch (err) {
    next(err);
  }
};

export const createBatch = async (req, res, next) => {
  try {
    const batch = await adminService.createBatch(req.user.academy_id, req.body);
    res.status(201).json(successResponse('Batch created successfully', batch));
  } catch (err) {
    next(err);
  }
};

export const updateBatch = async (req, res, next) => {
  try {
    const batch = await adminService.updateBatch(
      req.user.academy_id,
      req.params.batch_id,
      req.body,
    );
    res.json(successResponse('Batch updated successfully', batch));
  } catch (err) {
    next(err);
  }
};

export const getAvailableBatches = async (req, res, next) => {
  try {
    const batches = await adminService.getAvailableBatches(
      req.user.academy_id,
      req.query.sport_id,
      req.query.sport_ids
    );
    res.json(successResponse('Available batches retrieved', batches));
  } catch (err) {
    next(err);
  }
};

export const deleteBatch = async (req, res, next) => {
  try {
    await adminService.deleteBatch(req.user.academy_id, req.params.batch_id);
    res.json(successResponse('Batch deactivated successfully', {}));
  } catch (err) {
    next(err);
  }
};

export const markCoachAttendance = async (req, res, next) => {
  try {
    const attendance = await adminService.markCoachAttendance(
      req.user.academy_id,
      req.user.user_id,
      req.body,
    );
    res.status(201).json(successResponse('Attendance marked successfully', attendance));
  } catch (err) {
    next(err);
  }
};

export const getCoachAttendance = async (req, res, next) => {
  try {
    const attendance = await adminService.getCoachAttendance(
      req.user.academy_id,
      req.params.coach_id,
    );
    res.json(successResponse('Attendance retrieved successfully', attendance));
  } catch (err) {
    next(err);
  }
};

export const getAllPayments = async (req, res, next) => {
  try {
    const payments = await adminService.getAllPayments(req.user.academy_id);
    res.json(successResponse('Payments retrieved successfully', payments));
  } catch (err) {
    next(err);
  }
};

export const getStudentLedger = async (req, res, next) => {
  try {
    const ledger = await adminService.getStudentLedger(req.user.academy_id, req.params.student_id);
    res.json(successResponse('Student ledger retrieved successfully', ledger));
  } catch (err) {
    logger.error('Failed to get student ledger', err);
    next(err);
  }
};

export const getStudentsFeeSummary = async (req, res, next) => {
  try {
    const summary = await adminService.getStudentsFeeSummary(req.user.academy_id);
    res.json(successResponse('Students fee summary retrieved successfully', summary));
  } catch (err) {
    logger.error('Failed to get students fee summary', err);
    next(err);
  }
};

export const getReceipts = async (req, res, next) => {
  try {
    const receipts = await adminService.getReceipts(req.user.academy_id);
    res.json(successResponse('Receipts retrieved successfully', receipts));
  } catch (err) {
    next(err);
  }
};

export const createReceipt = async (req, res, next) => {
  try {
    const receipt = await adminService.createReceipt(req.user.academy_id, req.body);
    res.status(201).json(successResponse('Receipt created successfully', receipt));
  } catch (err) {
    next(err);
  }
};

export const getPendingDues = async (req, res, next) => {
  try {
    const pendingDues = await adminService.getPendingDues(req.user.academy_id);
    res.json(successResponse('Pending dues retrieved successfully', pendingDues));
  } catch (err) {
    next(err);
  }
};

export const getRevenueSummary = async (req, res, next) => {
  try {
    const summary = await adminService.getRevenueSummary(req.user.academy_id);
    res.json(successResponse('Revenue summary retrieved successfully', summary));
  } catch (err) {
    next(err);
  }
};

export const createPayment = async (req, res, next) => {
  try {
    const payment = await adminService.createPayment(req.user.academy_id, req.body);
    res.status(201).json(successResponse('Payment created successfully', payment));
  } catch (err) {
    logger.error('Failed to create payment', err);
    next(err);
  }
};

export const updatePaymentStatus = async (req, res, next) => {
  try {
    const payment = await adminService.updatePaymentStatus(
      req.user.academy_id,
      req.params.payment_id,
      {
        status: req.body.status,
        rejected_reason: req.body.rejected_reason,
      },
      req.user.user_id,
    );
    res.json(successResponse('Payment updated successfully', payment));
  } catch (err) {
    next(err);
  }
};

export const getAcademyReport = async (req, res, next) => {
  try {
    const report = await adminService.getAcademyReport(req.user.academy_id);
    res.json(successResponse('Academy analytics retrieved successfully', report));
  } catch (err) {
    next(err);
  }
};

// Performance-related controllers removed - use /performance module routes instead

export const getAttendance = async (req, res, next) => {
  try {
    const attendance = await adminService.getAttendance(req.user.academy_id, req.query);
    res.json(successResponse('Attendance retrieved successfully', attendance));
  } catch (err) {
    next(err);
  }
};

export const getAnnouncements = async (req, res, next) => {
  try {
    const announcements = await adminService.getAnnouncements(req.user.academy_id);
    res.json(successResponse('Announcements retrieved successfully', announcements));
  } catch (err) {
    next(err);
  }
};

export const createAnnouncement = async (req, res, next) => {
  try {
    const announcement = await adminService.createAnnouncement(req.user.academy_id, req.body);
    res.status(201).json(successResponse('Announcement created and emails sent successfully', announcement));
  } catch (err) {
    next(err);
  }
};

export const getCoachNotifications = async (req, res, next) => {
  try {
    const notifications = await adminService.getCoachNotifications(req.params.coachId);
    res.json(successResponse('Coach notifications retrieved successfully', notifications));
  } catch (err) {
    next(err);
  }
};

export const markNotificationAsRead = async (req, res, next) => {
  try {
    const notification = await adminService.markNotificationAsRead(req.params.notificationId);
    res.json(successResponse('Notification marked as read successfully', notification));
  } catch (err) {
    next(err);
  }
};

export const getSubscriptionDetails = async (req, res, next) => {
  try {
    const details = await adminService.getSubscriptionDetails(req.user.academy_id);
    res.json(successResponse('Subscription details retrieved', details));
  } catch (err) {
    next(err);
  }
};

export const getSuperAdminPlans = async (req, res, next) => {
  try {
    const plans = await adminService.getSuperAdminPlans();
    res.json(successResponse('Dynamic plans retrieved', plans));
  } catch (err) {
    next(err);
  }
};

export const getPaymentSettings = async (req, res, next) => {
  try {
    const settings = await adminService.getPaymentSettings();
    res.json(successResponse('Payment settings retrieved', settings));
  } catch (err) {
    next(err);
  }
};

export const purchaseSubscription = async (req, res, next) => {
  try {
    const result = await adminService.purchaseSubscription(req.user.academy_id, req.body, req.user.user_id, req.ip);
    res.status(201).json(successResponse('Subscription purchase submitted', result));
  } catch (err) {
    next(err);
  }
};

export const getAcademyNotifications = async (req, res, next) => {
  try {
    const notifications = await adminService.getAcademyNotifications(req.user.academy_id, req.user.user_id);
    res.json(successResponse('Academy notifications retrieved', notifications));
  } catch (err) {
    next(err);
  }
};

export const markAcademyNotificationAsRead = async (req, res, next) => {
  try {
    const result = await adminService.markAcademyNotificationAsRead(req.params.id);
    res.json(successResponse('Notification marked as read', result));
  } catch (err) {
    next(err);
  }
};

export const getBatchSessionHistory = async (req, res, next) => {
  try {
    const filters = {
      batch_id: req.query.batch_id,
      coach_id: req.query.coach_id,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      status: req.query.status
    };
    
    const sessions = await coachService.getBatchSessionHistory(req.user.academy_id, filters);
    res.json(successResponse('Batch session history retrieved', sessions));
  } catch (err) {
    next(err);
  }
};

export const endBatchSession = async (req, res, next) => {
  try {
    logger.info('Admin endBatchSession called', {
      session_id: req.params.session_id,
      academy_id: req.user.academy_id
    });
    const session = await coachService.endBatchSessionById(
      req.params.session_id,
      req.user.academy_id
    );
    res.json(successResponse('Batch session ended successfully', session));
  } catch (err) {
    logger.error('Admin endBatchSession error', {
      session_id: req.params.session_id,
      error: err.message
    });
    next(err);
  }
};
