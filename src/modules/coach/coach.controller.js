import * as coachService from './coach.service.js';
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

export const recordPayment = async (req, res, next) => {
  try {
    const payment = await coachService.recordCoachPayment(
      req.user.coach_id,
      req.user.academy_id,
      req.body
    );
    res.status(201).json(
      successResponse('Payment recorded and pending admin approval', payment)
    );
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
    res.json(successResponse('Coach attendance recorded', record));
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
