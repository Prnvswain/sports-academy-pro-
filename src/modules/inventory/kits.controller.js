import * as kitsService from './kits.service.js';
import { successResponse } from '../../utils/response.js';

export const getSportsList = async (req, res, next) => {
  try {
    const sports = await kitsService.getActiveSports(req.user.academy_id);
    res.json(successResponse('Sports retrieved successfully', sports));
  } catch (err) {
    next(err);
  }
};

export const getKits = async (req, res, next) => {
  try {
    const { sport_id } = req.query;
    if (!sport_id) {
      return res.status(400).json({ success: false, message: 'sport_id is required' });
    }
    const kits = await kitsService.getKitsBySport(req.user.academy_id, sport_id);
    res.json(successResponse('Kits retrieved successfully', kits));
  } catch (err) {
    next(err);
  }
};

export const createKit = async (req, res, next) => {
  try {
    const kit = await kitsService.createKit(req.user.academy_id, req.body);
    res.status(201).json(successResponse('Sports kit created successfully', kit));
  } catch (err) {
    next(err);
  }
};

export const updateKit = async (req, res, next) => {
  try {
    const { kit_id } = req.params;
    const kit = await kitsService.updateKit(req.user.academy_id, kit_id, req.body);
    res.json(successResponse('Sports kit updated successfully', kit));
  } catch (err) {
    next(err);
  }
};

export const deleteKit = async (req, res, next) => {
  try {
    const { kit_id } = req.params;
    await kitsService.deleteKit(req.user.academy_id, kit_id);
    res.json(successResponse('Sports kit deleted successfully'));
  } catch (err) {
    next(err);
  }
};

export const assignKit = async (req, res, next) => {
  try {
    const { kit_id } = req.params;
    const assignment = await kitsService.assignKit(req.user.academy_id, kit_id, req.body);
    res.status(201).json(successResponse('Sports kit assigned successfully', assignment));
  } catch (err) {
    next(err);
  }
};

export const returnKit = async (req, res, next) => {
  try {
    const { assignment_id } = req.params;
    const assignment = await kitsService.returnKit(req.user.academy_id, assignment_id);
    res.json(successResponse('Sports kit returned successfully', assignment));
  } catch (err) {
    next(err);
  }
};

export const updatePaymentStatus = async (req, res, next) => {
  try {
    const { assignment_id } = req.params;
    const assignment = await kitsService.updatePaymentStatus(req.user.academy_id, assignment_id, req.body);
    res.json(successResponse('Kit payment status updated successfully', assignment));
  } catch (err) {
    next(err);
  }
};

export const getAssignments = async (req, res, next) => {
  try {
    const assignments = await kitsService.getKitAssignments(req.user.academy_id, req.query);
    res.json(successResponse('Assignments retrieved successfully', assignments));
  } catch (err) {
    next(err);
  }
};

export const getDashboard = async (req, res, next) => {
  try {
    const stats = await kitsService.getDashboardStats(req.user.academy_id);
    res.json(successResponse('Dashboard stats retrieved successfully', stats));
  } catch (err) {
    next(err);
  }
};

export const getReports = async (req, res, next) => {
  try {
    const reports = await kitsService.getReportsData(req.user.academy_id, req.query);
    res.json(successResponse('Reports data retrieved successfully', reports));
  } catch (err) {
    next(err);
  }
};
