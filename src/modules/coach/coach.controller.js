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
