/**
 * GPS Verification Middleware
 * Verifies user location before allowing attendance marking
 */

import prisma from '../config/prisma.js';
import { verifyLocation, getAttendanceLocation } from '../utils/gpsUtils.js';

/**
 * Verify GPS location for attendance marking
 * Checks if user is within allowed radius of attendance location
 */
export const verifyAttendanceLocation = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;
    const academy_id = req.user.academy_id;
    const user_role = req.user.role;

    // Get GPS settings for the academy
    const gpsSettings = await prisma.gpsAttendanceSettings.findUnique({
      where: { academy_id }
    });

    // If GPS verification is disabled, allow attendance
    if (!gpsSettings || !gpsSettings.gps_verification_enabled) {
      return next();
    }

    // Admin override - if enabled and user is admin, skip verification
    if (gpsSettings.admin_override_enabled && user_role === 'ACADEMY_ADMIN') {
      return next();
    }

    // Check if GPS coordinates are provided
    if (!latitude || !longitude) {
      const error = new Error('GPS coordinates are required for attendance');
      error.statusCode = 400;
      error.code = 'GPS_REQUIRED';
      return next(error);
    }

    // Validate coordinates format
    const isValidLat = latitude >= -90 && latitude <= 90;
    const isValidLon = longitude >= -180 && longitude <= 180;

    if (!isValidLat || !isValidLon) {
      const error = new Error('Invalid GPS coordinates provided');
      error.statusCode = 400;
      error.code = 'INVALID_COORDINATES';
      return next(error);
    }

    // Get batch/sport information to determine attendance location
    const batch_id = req.body.batch_id || req.params.batch_id;
    
    if (!batch_id) {
      const error = new Error('Batch ID is required for location verification');
      error.statusCode = 400;
      error.code = 'BATCH_REQUIRED';
      return next(error);
    }

    // Fetch batch with sport and academy information
    const batch = await prisma.batch.findUnique({
      where: { batch_id: parseInt(batch_id) },
      include: {
        sport: true,
        academy: true
      }
    });

    if (!batch) {
      const error = new Error('Batch not found');
      error.statusCode = 404;
      return next(error);
    }

    // Verify batch belongs to the user's academy
    if (batch.academy_id !== academy_id) {
      const error = new Error('Unauthorized: Batch does not belong to your academy');
      error.statusCode = 403;
      return next(error);
    }

    // Get attendance location (custom sport location or academy location)
    const attendanceLocation = getAttendanceLocation(batch.sport, batch.academy);

    if (!attendanceLocation) {
      const error = new Error('Attendance location not configured. Please contact academy admin.');
      error.statusCode = 400;
      error.code = 'LOCATION_NOT_CONFIGURED';
      return next(error);
    }

    // Verify location is within allowed radius
    const verification = verifyLocation(
      latitude,
      longitude,
      attendanceLocation.latitude,
      attendanceLocation.longitude,
      gpsSettings.attendance_radius_meters
    );

    if (!verification.valid) {
      const error = new Error(
        `You are ${verification.distance}m away from attendance location. Maximum allowed distance is ${verification.radius}m.`
      );
      error.statusCode = 403;
      error.code = 'LOCATION_OUT_OF_RANGE';
      error.distance = verification.distance;
      error.radius = verification.radius;
      return next(error);
    }

    // Attach verification result to request for later use
    req.gpsVerification = {
      verified: true,
      distance: verification.distance,
      location_source: attendanceLocation.source
    };

    next();
  } catch (error) {
    console.error('GPS Verification Error:', error);
    next(error);
  }
};

/**
 * Optional GPS verification - only verifies if coordinates are provided
 * Used for scenarios where GPS is optional
 */
export const optionalGpsVerification = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;
    const academy_id = req.user.academy_id;

    // If no GPS coordinates provided, skip verification
    if (!latitude || !longitude) {
      return next();
    }

    // Get GPS settings
    const gpsSettings = await prisma.gpsAttendanceSettings.findUnique({
      where: { academy_id }
    });

    // If GPS verification is disabled, skip
    if (!gpsSettings || !gpsSettings.gps_verification_enabled) {
      return next();
    }

    // Get batch information
    const batch_id = req.body.batch_id || req.params.batch_id;
    if (!batch_id) {
      return next();
    }

    const batch = await prisma.batch.findUnique({
      where: { batch_id: parseInt(batch_id) },
      include: {
        sport: true,
        academy: true
      }
    });

    if (!batch) {
      return next();
    }

    // Get attendance location
    const attendanceLocation = getAttendanceLocation(batch.sport, batch.academy);
    if (!attendanceLocation) {
      return next();
    }

    // Verify location
    const verification = verifyLocation(
      latitude,
      longitude,
      attendanceLocation.latitude,
      attendanceLocation.longitude,
      gpsSettings.attendance_radius_meters
    );

    // Attach verification result
    req.gpsVerification = {
      verified: verification.valid,
      distance: verification.distance,
      location_source: attendanceLocation.source
    };

    next();
  } catch (error) {
    // Don't block attendance on error for optional verification
    console.error('Optional GPS Verification Error:', error);
    next();
  }
};
