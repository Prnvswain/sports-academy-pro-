/**
 * GPS Settings Controller
 * Handles GPS attendance verification settings endpoints
 */

import * as gpsService from './admin.gps.service.js';
import { successResponse } from '../../utils/response.js';

/**
 * Get GPS settings for the academy
 */
export const getGpsSettings = async (req, res, next) => {
  try {
    const settings = await gpsService.getGpsSettings(req.user.academy_id);
    return res.json(successResponse('GPS settings retrieved successfully', settings));
  } catch (error) {
    next(error);
  }
};

/**
 * Update GPS settings for the academy
 */
export const updateGpsSettings = async (req, res, next) => {
  try {
    const settings = await gpsService.updateGpsSettings(req.user.academy_id, req.body);
    return res.json(successResponse('GPS settings updated successfully', settings));
  } catch (error) {
    next(error);
  }
};

/**
 * Get attendance location logs
 */
export const getAttendanceLocationLogs = async (req, res, next) => {
  try {
    const logs = await gpsService.getAttendanceLocationLogs(req.user.academy_id, req.query);
    return res.json(successResponse('Attendance location logs retrieved successfully', logs));
  } catch (error) {
    next(error);
  }
};

/**
 * Get coach attendance location logs
 */
export const getCoachAttendanceLocationLogs = async (req, res, next) => {
  try {
    const logs = await gpsService.getCoachAttendanceLocationLogs(req.user.academy_id, req.query);
    return res.json(successResponse('Coach attendance location logs retrieved successfully', logs));
  } catch (error) {
    next(error);
  }
};

/**
 * Update academy GPS coordinates
 */
export const updateAcademyLocation = async (req, res, next) => {
  try {
    const academy = await gpsService.updateAcademyLocation(req.user.academy_id, req.body);
    return res.json(successResponse('Academy location updated successfully', academy));
  } catch (error) {
    next(error);
  }
};

/**
 * Update sport GPS location
 */
export const updateSportLocation = async (req, res, next) => {
  try {
    const sport = await gpsService.updateSportLocation(req.user.academy_id, req.params.sport_id, req.body);
    return res.json(successResponse('Sport location updated successfully', sport));
  } catch (error) {
    next(error);
  }
};
