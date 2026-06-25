/**
 * GPS Settings Service
 * Manages GPS attendance verification settings for academies
 */

import prisma from '../../config/prisma.js';
import logger from '../../utils/logger.js';

/**
 * Get GPS settings for an academy
 */
export const getGpsSettings = async (academy_id) => {
  const academyId = parseInt(academy_id, 10);

  let settings = await prisma.gpsAttendanceSettings.findUnique({
    where: { academy_id: academyId }
  });

  // If settings don't exist, create default settings
  if (!settings) {
    settings = await prisma.gpsAttendanceSettings.create({
      data: {
        academy_id: academyId,
        gps_verification_enabled: true,
        attendance_radius_meters: 200,
        admin_override_enabled: true,
        require_student_gps: true,
        require_coach_gps: true
      }
    });
    logger.info('Default GPS settings created', { academy_id: academyId });
  }

  return settings;
};

/**
 * Update GPS settings for an academy
 */
export const updateGpsSettings = async (academy_id, data) => {
  const academyId = parseInt(academy_id, 10);

  const {
    gps_verification_enabled,
    attendance_radius_meters,
    admin_override_enabled,
    require_student_gps,
    require_coach_gps
  } = data;

  // Validate radius
  if (attendance_radius_meters !== undefined) {
    const radius = parseInt(attendance_radius_meters, 10);
    if (radius < 50 || radius > 5000) {
      const error = new Error('Attendance radius must be between 50 and 5000 meters');
      error.statusCode = 400;
      throw error;
    }
  }

  const settings = await prisma.gpsAttendanceSettings.upsert({
    where: { academy_id: academyId },
    create: {
      academy_id: academyId,
      gps_verification_enabled: gps_verification_enabled !== undefined ? gps_verification_enabled : true,
      attendance_radius_meters: attendance_radius_meters !== undefined ? parseInt(attendance_radius_meters, 10) : 200,
      admin_override_enabled: admin_override_enabled !== undefined ? admin_override_enabled : true,
      require_student_gps: require_student_gps !== undefined ? require_student_gps : true,
      require_coach_gps: require_coach_gps !== undefined ? require_coach_gps : true
    },
    update: {
      ...(gps_verification_enabled !== undefined && { gps_verification_enabled }),
      ...(attendance_radius_meters !== undefined && { attendance_radius_meters: parseInt(attendance_radius_meters, 10) }),
      ...(admin_override_enabled !== undefined && { admin_override_enabled }),
      ...(require_student_gps !== undefined && { require_student_gps }),
      ...(require_coach_gps !== undefined && { require_coach_gps })
    }
  });

  logger.info('GPS settings updated', { academy_id: academyId, settings });
  return settings;
};

/**
 * Get attendance location logs for an academy
 */
export const getAttendanceLocationLogs = async (academy_id, filters = {}) => {
  const academyId = parseInt(academy_id, 10);
  const { start_date, end_date, student_id, batch_id, limit = 50 } = filters;

  const where = {
    academy_id: academyId,
    ...(start_date && { date: { gte: new Date(start_date) } }),
    ...(end_date && { date: { lte: new Date(end_date) } }),
    ...(student_id && { student_id: parseInt(student_id, 10) }),
    ...(batch_id && { batch_id: parseInt(batch_id, 10) })
  };

  const logs = await prisma.studentAttendance.findMany({
    where,
    include: {
      student: {
        select: {
          student_id: true,
          name: true,
          roll_number: true
        }
      },
      batch: {
        select: {
          batch_id: true,
          name: true,
          sport: {
            select: {
              name: true
            }
          }
        }
      },
      coach: {
        select: {
          coach_id: true,
          name: true
        }
      }
    },
    orderBy: { date: 'desc' },
    take: parseInt(limit, 10)
  });

  return logs;
};

/**
 * Get coach attendance location logs
 */
export const getCoachAttendanceLocationLogs = async (academy_id, filters = {}) => {
  const academyId = parseInt(academy_id, 10);
  const { start_date, end_date, coach_id, limit = 50 } = filters;

  const where = {
    academy_id: academyId,
    ...(start_date && { date: { gte: new Date(start_date) } }),
    ...(end_date && { date: { lte: new Date(end_date) } }),
    ...(coach_id && { coach_id: parseInt(coach_id, 10) })
  };

  const logs = await prisma.coachAttendance.findMany({
    where,
    include: {
      coach: {
        select: {
          coach_id: true,
          name: true
        }
      }
    },
    orderBy: { date: 'desc' },
    take: parseInt(limit, 10)
  });

  return logs;
};

/**
 * Update academy GPS coordinates
 */
export const updateAcademyLocation = async (academy_id, data) => {
  const academyId = parseInt(academy_id, 10);
  const { latitude, longitude } = data;

  // Validate coordinates
  if (latitude !== undefined) {
    const lat = parseFloat(latitude);
    if (lat < -90 || lat > 90) {
      const error = new Error('Latitude must be between -90 and 90');
      error.statusCode = 400;
      throw error;
    }
  }

  if (longitude !== undefined) {
    const lon = parseFloat(longitude);
    if (lon < -180 || lon > 180) {
      const error = new Error('Longitude must be between -180 and 180');
      error.statusCode = 400;
      throw error;
    }
  }

  const academy = await prisma.academy.update({
    where: { academy_id: academyId },
    data: {
      ...(latitude !== undefined && { latitude: parseFloat(latitude) }),
      ...(longitude !== undefined && { longitude: parseFloat(longitude) })
    }
  });

  logger.info('Academy location updated', { academy_id: academyId, latitude, longitude });
  return academy;
};

/**
 * Update sport GPS location (custom location)
 */
export const updateSportLocation = async (academy_id, sport_id, data) => {
  const academyId = parseInt(academy_id, 10);
  const sportId = parseInt(sport_id, 10);
  const { latitude, longitude, use_custom_location } = data;

  // Verify sport belongs to academy
  const sport = await prisma.sport.findFirst({
    where: {
      sport_id: sportId,
      academy_id: academyId
    }
  });

  if (!sport) {
    const error = new Error('Sport not found in your academy');
    error.statusCode = 404;
    throw error;
  }

  // Validate coordinates if provided
  if (latitude !== undefined) {
    const lat = parseFloat(latitude);
    if (lat < -90 || lat > 90) {
      const error = new Error('Latitude must be between -90 and 90');
      error.statusCode = 400;
      throw error;
    }
  }

  if (longitude !== undefined) {
    const lon = parseFloat(longitude);
    if (lon < -180 || lon > 180) {
      const error = new Error('Longitude must be between -180 and 180');
      error.statusCode = 400;
      throw error;
    }
  }

  const updatedSport = await prisma.sport.update({
    where: { sport_id: sportId },
    data: {
      ...(latitude !== undefined && { latitude: parseFloat(latitude) }),
      ...(longitude !== undefined && { longitude: parseFloat(longitude) }),
      ...(use_custom_location !== undefined && { use_custom_location })
    }
  });

  logger.info('Sport location updated', { sport_id: sportId, academy_id: academyId });
  return updatedSport;
};
