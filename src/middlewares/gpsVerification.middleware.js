/**
 * GPS Verification Middleware
 * Verifies user location before allowing attendance marking
 */

import prisma from '../config/prisma.js';
import { verifyLocation, getAttendanceLocation } from '../utils/gpsUtils.js';

// Configuration constants
const GRACE_PERIOD_BEFORE_START = 10; // minutes
const GRACE_PERIOD_AFTER_END = 15; // minutes
const SESSION_TIMEOUT_MINUTES = 60; // minutes
const GPS_ACCURACY_THRESHOLD = 30; // meters
const GRACE_BUFFER_PERCENTAGE = 0.05; // 5% radius tolerance

/**
 * Parse batch timing string to hours and minutes
 * @param {string} timing - Format: "HH:MM-HH:MM" or "HH:MM"
 * @returns {object} { startHour, startMin, endHour, endMin }
 */
function parseBatchTiming(timing) {
  if (!timing) return null;
  
  const parts = timing.split('-');
  const startTime = parts[0].trim();
  const endTime = parts[1] ? parts[1].trim() : null;
  
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime ? endTime.split(':').map(Number) : [null, null];
  
  return { startHour, startMin, endHour, endMin };
}

/**
 * Check if current time is within allowed attendance window
 * @param {object} batch - Batch object with timing
 * @returns {object} { allowed, reason, batchStart, batchEnd, currentTime }
 */
function validateAttendanceWindow(batch) {
  const now = new Date();
  const timing = parseBatchTiming(batch.timing);
  
  if (!timing) {
    return { allowed: true, reason: 'No timing configured' };
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const batchStart = new Date(today);
  batchStart.setHours(timing.startHour, timing.startMin, 0, 0);
  
  const batchEnd = timing.endHour !== null ? new Date(today) : null;
  if (batchEnd) {
    batchEnd.setHours(timing.endHour, timing.endMin, 0, 0);
  }
  
  const allowedStart = new Date(batchStart.getTime() - GRACE_PERIOD_BEFORE_START * 60000);
  const allowedEnd = batchEnd ? new Date(batchEnd.getTime() + GRACE_PERIOD_AFTER_END * 60000) : null;
  
  if (now < allowedStart) {
    return {
      allowed: false,
      reason: 'TOO_EARLY',
      batchStart,
      batchEnd,
      currentTime: now,
      minutesUntilStart: Math.round((allowedStart - now) / 60000)
    };
  }
  
  if (allowedEnd && now > allowedEnd) {
    return {
      allowed: false,
      reason: 'TOO_LATE',
      batchStart,
      batchEnd,
      currentTime: now,
      minutesAfterEnd: Math.round((now - allowedEnd) / 60000)
    };
  }
  
  return {
    allowed: true,
    reason: 'WITHIN_WINDOW',
    batchStart,
    batchEnd,
    currentTime: now
  };
}

/**
 * Detect potential GPS spoofing
 * @param {number} latitude - Current latitude
 * @param {number} longitude - Current longitude
 * @param {number} accuracy - GPS accuracy in meters (if provided)
 * @returns {object} { isSpoofed, reason }
 */
function detectGpsSpoofing(latitude, longitude, accuracy) {
  // Check if coordinates are at origin (common spoofing location)
  if (latitude === 0 && longitude === 0) {
    return { isSpoofed: true, reason: 'Coordinates at origin (0,0)' };
  }
  
  // Check if coordinates are at null island
  if (Math.abs(latitude) < 0.01 && Math.abs(longitude) < 0.01) {
    return { isSpoofed: true, reason: 'Coordinates near null island' };
  }
  
  // Check if accuracy is too poor
  if (accuracy && accuracy > GPS_ACCURACY_THRESHOLD) {
    return { isSpoofed: true, reason: `GPS accuracy too poor: ${accuracy}m` };
  }
  
  // Check for extreme values
  if (Math.abs(latitude) > 85 || Math.abs(longitude) > 175) {
    return { isSpoofed: true, reason: 'Extreme coordinate values' };
  }
  
  return { isSpoofed: false, reason: null };
}

/**
 * Check if attendance session is active and valid
 * @param {number} batch_id - Batch ID
 * @param {number} coach_id - Coach ID
 * @returns {object} { active, session, reason }
 */
async function checkAttendanceSession(batch_id, coach_id) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check for existing active session
  const activeSession = await prisma.attendanceAuditLog.findFirst({
    where: {
      batch_id: parseInt(batch_id),
      coach_id: parseInt(coach_id),
      attendance_start_time: {
        gte: today
      },
      status: {
        in: ['GPS Verified', 'On Time', 'Late']
      }
    },
    orderBy: {
      attendance_start_time: 'desc'
    }
  });

  if (!activeSession) {
    return { active: false, session: null, reason: 'NO_ACTIVE_SESSION' };
  }

  // Check if session has expired (60 minutes timeout)
  const sessionAge = Date.now() - new Date(activeSession.attendance_start_time).getTime();
  const sessionAgeMinutes = sessionAge / 60000;

  if (sessionAgeMinutes > SESSION_TIMEOUT_MINUTES) {
    return { active: false, session: activeSession, reason: 'SESSION_EXPIRED', ageMinutes: sessionAgeMinutes };
  }

  return { active: true, session: activeSession, reason: 'SESSION_ACTIVE', ageMinutes: sessionAgeMinutes };
}

/**
 * Verify GPS location for attendance marking
 * Checks if user is within allowed radius of attendance location
 * Also validates time window and detects GPS spoofing
 */
export const verifyAttendanceLocation = async (req, res, next) => {
  try {
    const { latitude, longitude, accuracy } = req.body;
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

    // Detect GPS spoofing
    const spoofingCheck = detectGpsSpoofing(latitude, longitude, accuracy);
    if (spoofingCheck.isSpoofed) {
      const error = new Error(`GPS verification failed: ${spoofingCheck.reason}`);
      error.statusCode = 403;
      error.code = 'GPS_SPOOFING_DETECTED';
      error.reason = spoofingCheck.reason;
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

    // Validate attendance time window
    const timeValidation = validateAttendanceWindow(batch);
    if (!timeValidation.allowed) {
      const error = new Error(
        timeValidation.reason === 'TOO_EARLY'
          ? `Attendance not allowed yet. Batch starts in ${timeValidation.minutesUntilStart} minutes.`
          : `Attendance window closed. Batch ended ${timeValidation.minutesAfterEnd} minutes ago.`
      );
      error.statusCode = 403;
      error.code = timeValidation.reason;
      error.timeValidation = timeValidation;
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

    // Apply grace buffer to radius (5% tolerance)
    const effectiveRadius = gpsSettings.attendance_radius_meters * (1 + GRACE_BUFFER_PERCENTAGE);

    // Verify location is within allowed radius
    const verification = verifyLocation(
      latitude,
      longitude,
      attendanceLocation.latitude,
      attendanceLocation.longitude,
      effectiveRadius
    );

    if (!verification.valid) {
      const error = new Error(
        `You are ${verification.distance}m away from attendance location. Maximum allowed distance is ${Math.round(effectiveRadius)}m.`
      );
      error.statusCode = 403;
      error.code = 'LOCATION_OUT_OF_RANGE';
      error.distance = verification.distance;
      error.radius = Math.round(effectiveRadius);
      error.location_source = attendanceLocation.source;
      return next(error);
    }

    // Attach verification result to request for later use
    req.gpsVerification = {
      verified: true,
      distance: verification.distance,
      location_source: attendanceLocation.source,
      timeValidation,
      gpsAccuracy: accuracy,
      effectiveRadius: Math.round(effectiveRadius)
    };

    // Create attendance audit log for GPS verification
    try {
      await prisma.attendanceAuditLog.create({
        data: {
          academy_id: academy_id,
          coach_id: req.user.coach_id || null,
          batch_id: parseInt(batch_id),
          sport_id: batch.sport_id,
          gps_latitude: latitude,
          gps_longitude: longitude,
          sport_center_latitude: attendanceLocation.latitude,
          sport_center_longitude: attendanceLocation.longitude,
          distance_meters: verification.distance,
          gps_accuracy_meters: accuracy || null,
          attendance_radius_meters: Math.round(effectiveRadius),
          batch_start_time: batch.timing,
          batch_end_time: batch.timing,
          attendance_start_time: new Date(),
          attendance_submit_time: new Date(),
          status: 'GPS Verified',
          location_verified: true,
          location_source: attendanceLocation.source,
          ip_address: req.ip || null
        }
      });
    } catch (auditError) {
      console.error('Failed to create attendance audit log:', auditError);
      // Don't block attendance on audit log failure
    }

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
