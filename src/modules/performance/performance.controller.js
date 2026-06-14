import * as performanceService from './performance.service.js';
import { successResponse } from '../../utils/response.js';

export const getAttributes = async (req, res, next) => {
  try {
    const data = await performanceService.getAttributes(
      req.user.academy_id,
      req.query
    );
    res.json(successResponse('Performance attributes retrieved successfully', data));
  } catch (err) {
    next(err);
  }
};

export const createAttribute = async (req, res, next) => {
  try {
    const attribute = await performanceService.createAttribute(
      req.user.academy_id,
      req.user.user_id,
      req.user.role,
      req.body
    );
    res.status(201).json(
      successResponse('Performance attribute created successfully', attribute)
    );
  } catch (err) {
    next(err);
  }
};

export const approveAttribute = async (req, res, next) => {
  try {
    const attribute = await performanceService.approveAttribute(
      req.user.academy_id,
      req.params.attributeId
    );
    res.json(successResponse('Performance attribute approved successfully', attribute));
  } catch (err) {
    next(err);
  }
};

export const rejectAttribute = async (req, res, next) => {
  try {
    const attribute = await performanceService.rejectAttribute(
      req.user.academy_id,
      req.params.attributeId
    );
    res.json(successResponse('Performance attribute rejected successfully', attribute));
  } catch (err) {
    next(err);
  }
};

export const getScores = async (req, res, next) => {
  try {
    const data = await performanceService.getScores(
      req.user.academy_id,
      req.query
    );
    res.json(successResponse('Performance scores retrieved successfully', data));
  } catch (err) {
    next(err);
  }
};

export const createScore = async (req, res, next) => {
  try {
    const score = await performanceService.createScore(
      req.user.academy_id,
      req.user.coach_id || req.user.user_id,
      req.user.role,
      req.body
    );
    res.status(201).json(
      successResponse('Performance score recorded successfully', score)
    );
  } catch (err) {
    next(err);
  }
};

export const getStudentPerformance = async (req, res, next) => {
  try {
    const data = await performanceService.getStudentPerformance(
      req.user.academy_id,
      req.params.studentId,
      req.query
    );
    res.json(successResponse('Student performance retrieved successfully', data));
  } catch (err) {
    next(err);
  }
};

export const getBatchPerformance = async (req, res, next) => {
  try {
    const data = await performanceService.getBatchPerformance(
      req.user.academy_id,
      req.params.batchId,
      req.query
    );
    res.json(successResponse('Batch performance retrieved successfully', data));
  } catch (err) {
    next(err);
  }
};

export const getApprovalQueue = async (req, res, next) => {
  try {
    const data = await performanceService.getApprovalQueue(req.user.academy_id);
    res.json(successResponse('Approval queue retrieved successfully', data));
  } catch (err) {
    next(err);
  }
};
