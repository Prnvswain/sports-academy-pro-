import * as adminService from './admin.service.js';
import { successResponse } from '../../utils/response.js';

export const getSportsCatalog = async (req, res, next) => {
  try {
    const sports = await adminService.getSportsCatalog(req.user.academy_id);
    res.json(successResponse('Sports catalog retrieved successfully', sports));
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
    console.log('[updateSportStatus] Request received:', {
      method: req.method,
      url: req.originalUrl,
      params: req.params,
      body: req.body,
      academy_id: req.user.academy_id,
    });
    const sport = await adminService.updateSportStatus(
      req.user.academy_id,
      req.params.id,
      req.body,
    );
    res.json(successResponse('Sport status updated successfully', sport));
  } catch (err) {
    console.error('[updateSportStatus] Error:', err);
    next(err);
  }
};

export const deleteSport = async (req, res, next) => {
  try {
    console.log('[deleteSport] Request received:', {
      method: req.method,
      url: req.originalUrl,
      params: req.params,
      academy_id: req.user.academy_id,
    });
    await adminService.deleteSport(req.user.academy_id, req.params.id);
    res.json(successResponse('Sport deleted successfully', {}));
  } catch (err) {
    console.error('[deleteSport] Error:', err);
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

export const createStudent = async (req, res, next) => {
  try {
    console.log('[createStudent] Request received:', {
      method: req.method,
      url: req.originalUrl,
      academy_id: req.user.academy_id,
      body: req.body,
    });
    const student = await adminService.createStudent(req.user.academy_id, req.body);
    console.log('[createStudent] Student created successfully:', {
      student_id: student.student_id,
      name: student.name,
    });
    res.status(201).json(successResponse('Student created successfully', student));
  } catch (err) {
    console.error('[createStudent] Error:', {
      message: err.message,
      statusCode: err.statusCode,
      stack: err.stack,
      body: req.body,
    });
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
    const batches = await adminService.getAvailableBatches(req.user.academy_id, req.query.sport_id);
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
    console.log('[getStudentLedger Controller] Request params:', req.params);
    console.log('[getStudentLedger Controller] User academy_id:', req.user.academy_id);
    const ledger = await adminService.getStudentLedger(req.user.academy_id, req.params.student_id);
    console.log('[getStudentLedger Controller] Ledger data from service:', ledger);
    res.json(successResponse('Student ledger retrieved successfully', ledger));
  } catch (err) {
    console.error('[getStudentLedger Controller] Error:', err);
    console.error('[getStudentLedger Controller] Error stack:', err.stack);
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
    console.log('[createPayment Controller] Request body:', req.body);
    console.log('[createPayment Controller] User academy_id:', req.user.academy_id);
    const payment = await adminService.createPayment(req.user.academy_id, req.body);
    console.log('[createPayment Controller] Payment created successfully:', payment);
    res.status(201).json(successResponse('Payment created successfully', payment));
  } catch (err) {
    console.error('[createPayment Controller] Error:', err);
    console.error('[createPayment Controller] Error stack:', err.stack);
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

export const getEnquiries = async (req, res, next) => {
  try {
    const enquiries = await adminService.getEnquiries(req.user.academy_id);
    res.status(200).json({ success: true, data: enquiries });
  } catch (err) {
    next(err);
  }
};

export const updateEnquiry = async (req, res, next) => {
  try {
    const enquiry = await adminService.updateEnquiry(req.user.academy_id, req.params.id, req.body);
    res.status(200).json({ success: true, data: enquiry });
  } catch (err) {
    next(err);
  }
};

export const getPerformanceApprovalQueue = async (req, res, next) => {
  try {
    // PASS REQ.QUERY HERE: This links the incoming frontend sport selection query strings to your Prisma query maps!
    const queue = await adminService.getPerformanceApprovalQueue(req.user.academy_id, req.query);
    res.status(200).json({ success: true, data: queue });
  } catch (err) {
    next(err);
  }
};

export const approvePerformanceAttribute = async (req, res, next) => {
  try {
    const result = await adminService.approvePerformanceAttribute(
      req.user.academy_id,
      req.params.id,
      req.body,
    );
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const createPerformanceAttribute = async (req, res, next) => {
  try {
    const result = await adminService.createPerformanceAttribute(req.user.academy_id, req.body);
    res
      .status(201)
      .json({ success: true, message: 'Performance attribute added cleanly', data: result });
  } catch (err) {
    next(err);
  }
};

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
