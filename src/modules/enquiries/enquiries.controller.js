import * as enquiriesService from './enquiries.service.js';
import { successResponse } from '../../utils/response.js';

// ==================== DASHBOARD STATS ====================

/**
 * Get enquiry dashboard statistics
 * GET /api/enquiries/dashboard/stats
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await enquiriesService.getEnquiryDashboardStats(req.user.academy_id);
    res.json(successResponse('Dashboard stats retrieved successfully', stats));
  } catch (err) {
    next(err);
  }
};

/**
 * Get overdue follow-ups
 * GET /api/enquiries/dashboard/overdue
 */
export const getOverdueFollowUps = async (req, res, next) => {
  try {
    const overdue = await enquiriesService.getOverdueFollowUps(req.user.academy_id);
    res.json(successResponse('Overdue follow-ups retrieved successfully', overdue));
  } catch (err) {
    next(err);
  }
};

// ==================== ENQUIRY CRUD ====================

/**
 * Get all enquiries with optional filters
 * GET /api/enquiries
 * Query params: status, sportInterested, search, startDate, endDate
 */
export const getEnquiries = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      sportInterested: req.query.sportInterested,
      search: req.query.search,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    const data = await enquiriesService.getEnquiries(req.user.academy_id, filters);
    res.json(successResponse('Enquiries retrieved successfully', data));
  } catch (err) {
    next(err);
  }
};

/**
 * Get single enquiry by ID
 * GET /api/enquiries/:id
 */
export const getEnquiryById = async (req, res, next) => {
  try {
    const enquiry = await enquiriesService.getEnquiryById(
      req.user.academy_id,
      req.params.id
    );
    res.json(successResponse('Enquiry retrieved successfully', enquiry));
  } catch (err) {
    next(err);
  }
};

/**
 * Create new enquiry
 * POST /api/enquiries
 */
export const createEnquiry = async (req, res, next) => {
  try {
    const enquiry = await enquiriesService.createEnquiry(
      req.user.academy_id,
      req.body
    );
    res.status(201).json(successResponse('Enquiry created successfully', enquiry));
  } catch (err) {
    next(err);
  }
};

/**
 * Update enquiry
 * PUT /api/enquiries/:id
 */
export const updateEnquiry = async (req, res, next) => {
  try {
    const enquiry = await enquiriesService.updateEnquiry(
      req.user.academy_id,
      req.params.id,
      req.body
    );
    res.json(successResponse('Enquiry updated successfully', enquiry));
  } catch (err) {
    next(err);
  }
};

/**
 * Delete enquiry
 * DELETE /api/enquiries/:id
 */
export const deleteEnquiry = async (req, res, next) => {
  try {
    const result = await enquiriesService.deleteEnquiry(
      req.user.academy_id,
      req.params.id
    );
    res.json(successResponse('Enquiry deleted successfully', result));
  } catch (err) {
    next(err);
  }
};

// ==================== FOLLOW-UP SYSTEM ====================

/**
 * Schedule follow-up for enquiry
 * POST /api/enquiries/:id/follow-up
 */
export const scheduleFollowUp = async (req, res, next) => {
  try {
    const { followUpDate } = req.body;
    if (!followUpDate) {
      const error = new Error('followUpDate is required');
      error.statusCode = 400;
      throw error;
    }
    const enquiry = await enquiriesService.scheduleFollowUp(
      req.user.academy_id,
      req.params.id,
      followUpDate
    );
    res.json(successResponse('Follow-up scheduled successfully', enquiry));
  } catch (err) {
    next(err);
  }
};

/**
 * Mark follow-up as completed
 * POST /api/enquiries/:id/follow-up/complete
 */
export const completeFollowUp = async (req, res, next) => {
  try {
    const enquiry = await enquiriesService.completeFollowUp(
      req.user.academy_id,
      req.params.id
    );
    res.json(successResponse('Follow-up marked as completed', enquiry));
  } catch (err) {
    next(err);
  }
};

// ==================== CONVERSION SYSTEM ====================

/**
 * Convert enquiry to student
 * POST /api/enquiries/:id/convert
 */
export const convertToStudent = async (req, res, next) => {
  try {
    const result = await enquiriesService.convertToStudent(
      req.user.academy_id,
      req.params.id
    );
    res.json(successResponse('Enquiry converted to student successfully', result));
  } catch (err) {
    next(err);
  }
};
