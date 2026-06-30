import * as feesService from './fees.service.js';
import { successResponse } from '../../utils/response.js';

export const createFee = async (req, res, next) => {
  try {
    const fee = await feesService.createFee(req.user.academy_id, req.body);
    res.status(201).json(successResponse('Fee created successfully', fee));
  } catch (err) {
    next(err);
  }
};

export const getStudentFees = async (req, res, next) => {
  try {
    const fees = await feesService.getStudentFees(req.user.academy_id, req.params.student_id);
    res.json(successResponse('Student fees retrieved successfully', fees));
  } catch (err) {
    next(err);
  }
};

export const getAcademyFees = async (req, res, next) => {
  try {
    const fees = await feesService.getAcademyFees(req.user.academy_id, req.query);
    res.json(successResponse('Academy fees retrieved successfully', fees));
  } catch (err) {
    next(err);
  }
};

export const markFeeAsPaid = async (req, res, next) => {
  try {
    const fee = await feesService.markFeeAsPaid(req.user.academy_id, req.params.fee_id, req.body.amount_paid);
    res.json(successResponse('Fee marked as paid successfully', fee));
  } catch (err) {
    next(err);
  }
};

export const getFeeStats = async (req, res, next) => {
  try {
    // [SUPER ADMIN VISIBILITY UPGRADE] 
    // Agar login user SUPER_ADMIN hai, toh platform owner view ke liye academy_id null bhejenge
    const academyId = req.user.role === 'SUPER_ADMIN' ? null : req.user.academy_id;
    
    const stats = await feesService.getFeeStats(academyId);
    res.json(successResponse('Fee statistics retrieved successfully', stats));
  } catch (err) {
    next(err);
  }
};

export const checkOverdueFees = async (req, res, next) => {
  try {
    const result = await feesService.checkOverdueFees();
    res.json(successResponse('Overdue fees checked successfully', result));
  } catch (err) {
    next(err);
  }
};

export const sendOverdueFeeReminders = async (req, res, next) => {
  try {
    const result = await feesService.sendOverdueFeeReminders();
    res.json(successResponse('Overdue fee reminders sent successfully', result));
  } catch (err) {
    next(err);
  }
};