import * as coachService from './coach.service.js';
import * as adminService from '../admin/admin.service.js';
import { successResponse } from '../../utils/response.js';

export const getMyBatches = async (req, res, next) => {
  try {
    const data = await coachService.getCoachBatches(
      req.user.coach_id,
      req.user.academy_id
    );
    res.json(successResponse('Assigned batches retrieved successfully', data));
  } catch (err) {
    next(err);
  }
};

export const getBatchById = async (req, res, next) => {
  try {
    const data = await coachService.getCoachBatchById(
      req.params.id,
      req.user.coach_id,
      req.user.academy_id
    );
    res.json(successResponse('Batch details retrieved successfully', data));
  } catch (err) {
    next(err);
  }
};

export const getDashboard = async (req, res, next) => {
  try {
    const data = await coachService.getCoachDashboard(
      req.user.coach_id,
      req.user.academy_id
    );
    res.json(successResponse('Coach dashboard loaded', data));
  } catch (err) {
    next(err);
  }
};

export const getSports = async (req, res, next) => {
  try {
    const sports = await adminService.getSportsCatalog(req.user.academy_id);
    res.json(successResponse('Sports retrieved successfully', sports));
  } catch (err) {
    next(err)
  }
};

export const getPayments = async (req, res, next) => {
  try {
    const payments = await coachService.getCoachPayments(
      req.user.coach_id,
      req.user.academy_id
    );
    res.json(successResponse('Coach payments retrieved', payments));
  } catch (err) {
    next(err);
  }
};

export const getStudentsFeeSummary = async (req, res, next) => {
  try {
    const batchId = req.query.batch_id || null;
    
    const summary = await coachService.getCoachStudentsFeeSummary(
      req.user.coach_id,
      req.user.academy_id,
      batchId
    );
    
    res.json(successResponse('Students fee summary retrieved successfully', summary));
  } catch (err) {
    next(err);
  }
};

export const getStudentLedger = async (req, res, next) => {
  try {
    const ledger = await adminService.getStudentLedger(req.user.academy_id, req.params.student_id);
    res.json(successResponse('Student ledger retrieved successfully', ledger));
  } catch (err) {
    next(err);
  }
};

export const recordPayment = async (req, res, next) => {
  try {
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

    const payload = { ...req.body };

    if (req.file) {
      payload.proof_url = req.file.path;
      console.log("Saved proof:", req.file.path);
    } else {
      console.log("❌ No file received");
    }

    const payment = await coachService.recordCoachPayment(
      req.user.coach_id,
      req.user.academy_id,
      payload
    );

    res.status(201).json(
      successResponse("Payment recorded and pending admin approval", payment)
    );
  } catch (err) {
    next(err);
  }
};

export const updatePaymentProof = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    
    // If a file was uploaded, set the proof_url to the file path
    if (req.file) {
      payload.proof_url = req.file.path;
    }
    
    const updatedPayment = await coachService.updatePaymentProof(
      req.user.coach_id,
      req.user.academy_id,
      req.params.receiptId,
      payload.proof_url
    );
    
    res.json(successResponse('Payment proof updated successfully', updatedPayment));
  } catch (err) {
    next(err);
  }
};

export const getSelfAttendance = async (req, res, next) => {
  try {
    const { date, batch_id } = req.query;
    
    if (!batch_id) {
      const error = new Error('Batch ID is required');
      error.statusCode = 400;
      throw error;
    }
    
    const record = await coachService.getCoachSelfAttendanceByDate(
      req.user.coach_id,
      req.user.academy_id,
      batch_id,
      date
    );
    
    if (!record) {
      return res.json(successResponse('No attendance record found for this batch and date', null));
    }
    
    res.json(successResponse('Coach attendance retrieved', record));
  } catch (err) {
    next(err);
  }
};

export const markSelfAttendance = async (req, res, next) => {
  try {
    const record = await coachService.markCoachSelfAttendance(
      req.user.coach_id,
      req.user.academy_id,
      req.body
    );

    res.json(successResponse("Coach attendance recorded", record));
  } catch (err) {
    next(err);
  }
};

export const markCoachAbsent = async (req, res, next) => {
  try {
    const { batch_id, reason } = req.body;
    
    if (!batch_id) {
      const error = new Error('Batch ID is required');
      error.statusCode = 400;
      throw error;
    }

    const record = await coachService.markCoachAbsent(
      req.user.coach_id,
      req.user.academy_id,
      batch_id,
      reason
    );
    res.json(successResponse('Coach absence recorded and admin notified', record));
  } catch (err) {
    next(err);
  }
};

export const markAttendance = async (req, res, next) => {
  try {
    // Include GPS verification data from middleware
    const payload = {
      ...req.body,
      gpsVerification: req.gpsVerification
    };
    
    const result = await coachService.markStudentAttendance(
      req.user.coach_id,
      req.user.academy_id,
      payload
    );
    res.status(201).json(
      successResponse('Attendance recorded and parent notifications sent', result)
    );
  } catch (err) {
    next(err);
  }
};

export const startBatchSession = async (req, res, next) => {
  try {
    const { batch_id } = req.body;
    
    if (!batch_id) {
      const error = new Error('Batch ID is required');
      error.statusCode = 400;
      throw error;
    }
    
    const session = await coachService.startBatchSession(
      req.user.coach_id,
      req.user.academy_id,
      batch_id
    );
    
    res.status(201).json(
      successResponse('Batch session started', session)
    );
  } catch (err) {
    next(err);
  }
};

export const endBatchSession = async (req, res, next) => {
  try {
    const { batch_id } = req.body;
    
    if (!batch_id) {
      const error = new Error('Batch ID is required');
      error.statusCode = 400;
      throw error;
    }
    
    const session = await coachService.endBatchSession(
      req.user.coach_id,
      req.user.academy_id,
      batch_id
    );
    
    res.json(
      successResponse('Batch session ended', session)
    );
  } catch (err) {
    next(err);
  }
};

export const getActiveSessions = async (req, res, next) => {
  try {
    const sessions = await coachService.getActiveBatchSessions(
      req.user.coach_id,
      req.user.academy_id
    );
    
    res.json(
      successResponse('Active batch sessions retrieved', sessions)
    );
  } catch (err) {
    next(err);
  }
};
