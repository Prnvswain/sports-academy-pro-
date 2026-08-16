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
    let kits;
    if (sport_id && sport_id !== 'undefined' && sport_id !== 'null') {
      kits = await kitsService.getKitsBySport(req.user.academy_id, sport_id);
    } else {
      kits = await kitsService.getAllKits(req.user.academy_id);
    }
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
    const assignment = await kitsService.assignKit(req.user.academy_id, kit_id, req.body, req.user.user_id);
    const response = successResponse('Sports kit assigned successfully', assignment);
    if (assignment && assignment.warning) {
      response.warning = assignment.warning;
    }
    res.status(201).json(response);
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
    const assignment = await kitsService.updatePaymentStatus(req.user.academy_id, assignment_id, req.body, req.user.user_id);
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

// ─── COACH KIT ASSIGNMENT CONTROLLERS ────────────────────────────────────────

export const assignKitToCoach = async (req, res, next) => {
  try {
    const assignment = await kitsService.assignKitToCoach(req.user.academy_id, req.body);
    res.status(201).json(successResponse('Kit assigned to coach successfully', assignment));
  } catch (err) {
    next(err);
  }
};

export const getCoachKitAssignments = async (req, res, next) => {
  try {
    const assignments = await kitsService.getCoachKitAssignments(req.user.academy_id, req.query);
    res.json(successResponse('Coach kit assignments retrieved successfully', assignments));
  } catch (err) {
    next(err);
  }
};

export const editCoachKitAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const assignment = await kitsService.editCoachKitAssignment(req.user.academy_id, id, req.body);
    res.json(successResponse('Coach kit assignment updated successfully', assignment));
  } catch (err) {
    next(err);
  }
};

export const revokeCoachKitAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const assignment = await kitsService.revokeCoachKitAssignment(req.user.academy_id, id);
    res.json(successResponse('Coach kit assignment revoked successfully', assignment));
  } catch (err) {
    next(err);
  }
};

// Coach-facing controllers
export const getMyCoachKitAssignments = async (req, res, next) => {
  try {
    const assignments = await kitsService.getMyCoachKitAssignments(req.user.academy_id, req.user.coach_id);
    res.json(successResponse('Your kit assignments retrieved successfully', assignments));
  } catch (err) {
    next(err);
  }
};

export const assignKitFromCoach = async (req, res, next) => {
  try {
    const { kit_id } = req.params;
    const assignment = await kitsService.assignKitFromCoach(
      req.user.academy_id,
      req.user.coach_id,
      kit_id,
      req.body
    );
    const response = successResponse('Kit assigned to student successfully', assignment);
    if (assignment && assignment.warning) {
      response.warning = assignment.warning;
    }
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
};

export const getMyCoachStudentAssignments = async (req, res, next) => {
  try {
    const assignments = await kitsService.getMyCoachStudentAssignments(req.user.academy_id, req.user.coach_id);
    res.json(successResponse('Student kit assignments retrieved successfully', assignments));
  } catch (err) {
    next(err);
  }
};

export const updateCoachStudentPaymentStatus = async (req, res, next) => {
  try {
    const { assignment_id } = req.params;
    const assignment = await kitsService.updateCoachStudentPaymentStatus(
      req.user.academy_id,
      req.user.coach_id,
      assignment_id,
      req.body
    );
    res.json(successResponse('Student kit assignment payment updated successfully', assignment));
  } catch (err) {
    next(err);
  }
};


