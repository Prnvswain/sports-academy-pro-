import prisma from '../../config/prisma.js';

import { NOT_DELETED } from '../../utils/softDelete.util.js';

import {

  sendCoachAbsenceAlertToAdmin,

  sendParentAttendanceEmail

} from '../../services/mail.service.js';

import { logAudit } from '../../utils/audit.util.js';

import logger from '../../utils/logger.js';

import { calculateStudentFee } from '../../utils/fee.util.js';
import * as receiptService from '../../services/receipt.service.js';
import * as emailService from '../../services/email.service.js';
import { verifyLocation, getAttendanceLocation, validateCoordinates } from '../../utils/gpsUtils.js';

export const getUtcMidnight = (val) => {
  if (!val) {
    const d = new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  }
  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [year, month, day] = val.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day));
    }
    const dateMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      const year = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10);
      const day = parseInt(dateMatch[3], 10);
      return new Date(Date.UTC(year, month - 1, day));
    }
  }
  const d = new Date(val);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

const VALID_ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE'];



// Helper function to calculate distance between two GPS coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};



// ==================== Batch Session Functions ====================



export const startBatchSession = async (coach_id, academy_id, batch_id, latitude, longitude, accuracy) => {

  const coachId = parseInt(coach_id, 10);

  const academyId = parseInt(academy_id, 10);

  const batchId = parseInt(batch_id, 10);

  const today = getUtcMidnight();



  // Verify batch exists and belongs to academy

  const batch = await prisma.batch.findFirst({

    where: {

      batch_id: batchId,

      academy_id: academyId,

      status: 'ACTIVE'

    },

    include: {

      sport: true,

      academy: true,

      coaches: {

        include: {

          coach: {

            select: {

              name: true

            }

          }

        }

      }

    }

  });



  if (!batch) {

    const error = new Error('Batch not found or not active');

    error.statusCode = 404;

    throw error;

  }



  // Verify coach is assigned to this batch

  const coachAssignment = await prisma.batchCoach.findFirst({

    where: {

      batch_id: batchId,

      coach_id: coachId

    }

  });



  if (!coachAssignment) {

    const error = new Error('Coach is not assigned to this batch');

    error.statusCode = 403;

    throw error;

  }



  // GPS Verification (removed - no longer required for session start)
  // Session can be started after coach marks attendance (Present/Late/Absent)
  // GPS is only required for coach attendance marking, not session start

  // Check if session already exists for today

  const existingSession = await prisma.batchSession.findFirst({

    where: {

      batch_id: batchId,

      coach_id: coachId,

      academy_id: academyId,

      session_date: today

    }

  });



  if (existingSession) {

    const error = new Error('Batch session already exists for today');

    error.statusCode = 400;

    throw error;

  }



  // Determine session status based on start time vs batch timing
  let sessionStatus = 'LIVE';
  const currentTime = new Date();
  
  // Parse batch timing (format: "09:00 AM - 11:00 AM")
  if (batch.timing) {
    const timeMatch = batch.timing.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const meridiem = timeMatch[3].toUpperCase();
      
      if (meridiem === 'PM' && hours !== 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;
      
      const batchStartTime = new Date(today);
      batchStartTime.setHours(hours, minutes, 0, 0);
      
      const gracePeriodMinutes = batch.academy?.late_grace_period_minutes || 15;
      const graceEndTime = new Date(batchStartTime.getTime() + gracePeriodMinutes * 60000);
      
      logger.info('Session status determination', {
        currentTime,
        batchStartTime,
        graceEndTime,
        gracePeriodMinutes,
        isLate: currentTime > graceEndTime
      });
      
      if (currentTime > graceEndTime) {
        sessionStatus = 'LATE_START';
      }
    }
  }

  // Create batch session

  const session = await prisma.batchSession.create({

    data: {

      batch_id: batchId,

      coach_id: coachId,

      academy_id: academyId,

      session_date: today,

      start_time: new Date(),

      status: sessionStatus

    },

    include: {

      batch: {

        include: {

          sport: true

        }

      },

      coach: {

        select: {

          name: true

        }

      }

    }

  });



  logger.info('Batch session started', {

    session_id: session.session_id,

    batch_id: batchId,

    coach_id: coachId,

    academy_id: academyId,

    status: sessionStatus

  });



  // Create notifications (non-blocking)

  try {

    // Notify admin

    const adminUser = await prisma.user.findFirst({

      where: {

        academy_id: academyId,

        role: 'ACADEMY_ADMIN',

        is_deleted: false

      }

    });



    if (adminUser) {
      await prisma.notification.create({
        data: {
          academy_id: academyId,
          user_id: adminUser.user_id,
          type: 'BATCH_STARTED',
          title: 'Batch Started',
          body: `Coach ${session.coach.name} has started the ${batch.timing} ${batch.sport.name} batch.`,
          metadata: JSON.stringify({
            subtype: 'batch_started',
            session_id: session.session_id,
            batch_id: batchId,
            batch_name: batch.name,
            coach_name: session.coach.name,
            sport_name: batch.sport.name,
            timing: batch.timing
          })
        }
      });

      // Send email to admin if email exists
      if (adminUser.email) {
        emailService.sendBatchSessionStartEmail(
          adminUser.email,
          adminUser.name || 'Admin',
          {
            batch_name: batch.name,
            sport_name: batch.sport.name,
            coach_name: session.coach.name,
            timing: batch.timing,
            start_time: session.start_time
          }
        );
      }
    }



    // Notify parents of students in this batch

    const students = await prisma.student.findMany({

      where: {

        academy_id: academyId,

        batch_id: batchId,

        status: 'ACTIVE',

        ...NOT_DELETED

      },

      include: {

        parent: true

      }

    });



    for (const student of students) {
      if (student.parent) {
        await prisma.notification.create({
          data: {
            academy_id: academyId,
            user_id: student.parent.user_id,
            type: 'BATCH_STARTED',
            title: 'Batch Started',
            body: `Coach ${session.coach.name} has started the ${batch.timing} ${batch.sport.name} batch for ${student.name}.`,
            metadata: JSON.stringify({
              subtype: 'batch_started',
              session_id: session.session_id,
              batch_id: batchId,
              batch_name: batch.name,
              coach_name: session.coach.name,
              sport_name: batch.sport.name,
              student_name: student.name
            })
          }
        });

        // Send email to parent if email exists
        if (student.parent.email) {
          emailService.sendBatchSessionStartEmail(
            student.parent.email,
            student.parent.name || 'Parent',
            {
              batch_name: batch.name,
              sport_name: batch.sport.name,
              coach_name: session.coach.name,
              timing: batch.timing,
              start_time: session.start_time
            }
          );
        }
      }
    }



    logger.info('Batch start notifications sent', {

      session_id: session.session_id,

      parent_count: students.length

    });

  } catch (notificationError) {

    logger.error('Failed to send batch start notifications', {

      error: notificationError.message,

      session_id: session.session_id

    });

  }



  return session;

};



export const endBatchSessionById = async (session_id, academy_id) => {

  const sessionId = parseInt(session_id, 10);

  const academyId = parseInt(academy_id, 10);

  const today = getUtcMidnight();

  logger.info('endBatchSessionById called', {
    sessionId,
    academyId,
    today: today.toISOString(),
    todayDateOnly: today.toDateString()
  });



  // Find the session by ID (no date filter for admin - can end any LIVE session)

  const session = await prisma.batchSession.findFirst({

    where: {

      session_id: sessionId,

      academy_id: academyId,

      status: {

        in: ['LIVE', 'LATE_START']

      }

    },

    include: {

      batch: {

        include: {

          sport: true

        }

      },

      coach: {

        select: {

          name: true

        }

      }

    }

  });



  if (!session) {

    logger.error('Session not found with strict date match, trying without date filter', {
      sessionId,
      academyId
    });

    // Try to find session without date filter for debugging
    const sessionWithoutDate = await prisma.batchSession.findFirst({
      where: {
        session_id: sessionId,
        academy_id: academyId
      },
      include: {
        batch: true
      }
    });

    if (sessionWithoutDate) {
      logger.error('Session found but date mismatch', {
        sessionId,
        academyId,
        sessionDate: sessionWithoutDate.session_date,
        sessionStatus: sessionWithoutDate.status,
        expectedDate: today
      });
    } else {
      logger.error('Session not found at all', {
        sessionId,
        academyId
      });
    }

    const error = new Error('Active batch session not found');

    error.statusCode = 404;

    throw error;

  }



  const endTime = new Date();

  const durationMinutes = Math.floor((endTime - new Date(session.start_time)) / 60000);



  // Get attendance summary for this session (use session's actual date)

  const attendanceRecords = await prisma.studentAttendance.findMany({

    where: {

      academy_id: academyId,

      batch_id: session.batch_id,

      date: session.session_date

    }

  });



  const presentCount = attendanceRecords.filter(a => a.status === 'PRESENT').length;

  const absentCount = attendanceRecords.filter(a => a.status === 'ABSENT').length;

  const lateCount = attendanceRecords.filter(a => a.status === 'LATE').length;



  const attendanceSummary = {

    present: presentCount,

    absent: absentCount,

    late: lateCount

  };



  // Update session

  const updatedSession = await prisma.batchSession.update({

    where: { session_id: sessionId },

    data: {

      end_time: endTime,

      duration_minutes: durationMinutes,

      status: 'COMPLETED',

      attendance_summary: JSON.stringify(attendanceSummary)

    },

    include: {

      batch: {

        include: {

          sport: true

        }

      },

      coach: {

        select: {

          name: true

        }

      }

    }

  });



  logger.info('Batch session ended by admin', {

    session_id: sessionId,

    batch_id: session.batch_id,

    coach_id: session.coach_id,

    duration_minutes: durationMinutes,

    attendance_summary

  });



  // Lock all student attendance records for this session (use session's actual date)

  await prisma.studentAttendance.updateMany({

    where: {

      batch_session_id: sessionId,

      date: session.session_date

    },

    data: {

      locked: true,

      locked_at: new Date()

    }

  });



  logger.info('Student attendance locked for session', {

    session_id: sessionId,

    batch_id: session.batch_id

  });



  return updatedSession;

};



export const endBatchSession = async (coach_id, academy_id, batch_id) => {

  const coachId = parseInt(coach_id, 10);

  const academyId = parseInt(academy_id, 10);

  const batchId = parseInt(batch_id, 10);

  const today = getUtcMidnight();



  // Verify batch exists

  const batch = await prisma.batch.findFirst({

    where: {

      batch_id: batchId,

      academy_id: academyId,

      status: 'ACTIVE'

    },

    include: {

      sport: true

    }

  });



  if (!batch) {

    const error = new Error('Batch not found or not active');

    error.statusCode = 404;

    throw error;

  }



  // Find active session (also accept LATE_START status)
  const session = await prisma.batchSession.findFirst({

    where: {

      batch_id: batchId,

      coach_id: coachId,

      academy_id: academyId,

      session_date: today,

      status: {
        in: ['LIVE', 'LATE_START']
      }

    },

    include: {

      coach: {

        select: {

          name: true

        }

      }

    }

  });



  if (!session) {

    const error = new Error('No active batch session found');

    error.statusCode = 404;

    throw error;

  }



  const endTime = new Date();

  const durationMinutes = Math.floor((endTime - new Date(session.start_time)) / 60000);



  // Get attendance summary for this session

  const attendanceRecords = await prisma.studentAttendance.findMany({

    where: {

      academy_id: academyId,

      batch_id: batchId,

      date: today

    }

  });



  const presentCount = attendanceRecords.filter(a => a.status === 'PRESENT').length;

  const absentCount = attendanceRecords.filter(a => a.status === 'ABSENT').length;

  const lateCount = attendanceRecords.filter(a => a.status === 'LATE').length;



  const attendanceSummary = {

    present: presentCount,

    absent: absentCount,

    late: lateCount

  };



  // Update session

  const updatedSession = await prisma.batchSession.update({

    where: { session_id: session.session_id },

    data: {

      end_time: endTime,

      duration_minutes: durationMinutes,

      status: 'COMPLETED',

      attendance_summary: JSON.stringify(attendanceSummary)

    },

    include: {

      batch: {

        include: {

          sport: true

        }

      },

      coach: {

        select: {

          name: true

        }

      }

    }

  });



  logger.info('Batch session ended', {

    session_id: session.session_id,

    batch_id: batchId,

    coach_id: coachId,

    duration_minutes: durationMinutes,

    attendance_summary

  });



  // Lock all student attendance records for this session
  await prisma.studentAttendance.updateMany({
    where: {
      batch_session_id: session.session_id,
      date: today
    },
    data: {
      locked: true,
      locked_at: new Date()
    }
  });

  logger.info('Student attendance locked for session', {
    session_id: session.session_id,
    batch_id: batchId
  });



  // Create notifications (non-blocking)

  try {

    // Notify admin

    const adminUser = await prisma.user.findFirst({

      where: {

        academy_id: academyId,

        role: 'ACADEMY_ADMIN',

        is_deleted: false

      }

    });



    if (adminUser) {
      await prisma.notification.create({
        data: {
          academy_id: academyId,
          user_id: adminUser.user_id,
          type: 'BATCH_COMPLETED',
          title: 'Batch Completed',
          body: `Coach ${updatedSession.coach.name} has completed the ${batch.timing} ${batch.sport.name} batch. Duration: ${durationMinutes} minutes. Present: ${presentCount}, Absent: ${absentCount}, Late: ${lateCount}.`,
          metadata: JSON.stringify({
            subtype: 'batch_completed',
            session_id: session.session_id,
            batch_id: batchId,
            batch_name: batch.name,
            coach_name: updatedSession.coach.name,
            sport_name: batch.sport.name,
            timing: batch.timing,
            duration_minutes: durationMinutes,
            attendance_summary
          })
        }
      });

      // Send email to admin if email exists
      if (adminUser.email) {
        emailService.sendBatchSessionEndEmail(
          adminUser.email,
          adminUser.name || 'Admin',
          {
            batch_name: batch.name,
            sport_name: batch.sport.name,
            coach_name: updatedSession.coach.name,
            duration_minutes: durationMinutes,
            present_count: presentCount,
            absent_count: absentCount,
            late_count: lateCount
          }
        );
      }
    }



    // Notify parents

    const students = await prisma.student.findMany({

      where: {

        academy_id: academyId,

        batch_id: batchId,

        status: 'ACTIVE',

        ...NOT_DELETED

      },

      include: {

        parent: true

      }

    });



    for (const student of students) {
      if (student.parent) {
        const studentAttendance = attendanceRecords.find(a => a.student_id === student.student_id);
        const status = studentAttendance ? studentAttendance.status : 'NOT_MARKED';

        await prisma.notification.create({
          data: {
            academy_id: academyId,
            user_id: student.parent.user_id,
            type: 'BATCH_COMPLETED',
            title: 'Batch Completed',
            body: `Coach ${updatedSession.coach.name} has completed the ${batch.timing} ${batch.sport.name} batch. ${student.name} was marked as ${status}.`,
            metadata: JSON.stringify({
              subtype: 'batch_completed',
              session_id: session.session_id,
              batch_id: batchId,
              batch_name: batch.name,
              coach_name: updatedSession.coach.name,
              sport_name: batch.sport.name,
              student_name: student.name,
              student_status: status
            })
          }
        });

        // Send email to parent if email exists
        if (student.parent.email) {
          emailService.sendBatchSessionEndEmail(
            student.parent.email,
            student.parent.name || 'Parent',
            {
              batch_name: batch.name,
              sport_name: batch.sport.name,
              coach_name: updatedSession.coach.name,
              duration_minutes: durationMinutes,
              present_count: presentCount,
              absent_count: absentCount,
              late_count: lateCount
            }
          );
        }
      }
    }



    logger.info('Batch completion notifications sent', {

      session_id: session.session_id,

      parent_count: students.length

    });

  } catch (notificationError) {

    logger.error('Failed to send batch completion notifications', {

      error: notificationError.message,

      session_id: session.session_id

    });

  }



  return updatedSession;

};



export const getActiveBatchSessions = async (coach_id, academy_id) => {

  const coachId = parseInt(coach_id, 10);

  const academyId = parseInt(academy_id, 10);

  const today = getUtcMidnight();



  const activeSessions = await prisma.batchSession.findMany({

    where: {

      coach_id: coachId,

      academy_id: academyId,

      session_date: today

    },

    include: {

      batch: {

        include: {

          sport: true

        }

      }

    },

    orderBy: {

      start_time: 'desc'

    }

  });



  return activeSessions.map(session => ({

    session_id: session.session_id,

    batch_id: session.batch_id,

    batch_name: session.batch.name,

    sport_name: session.batch.sport?.name,

    timing: session.batch.timing,

    start_time: session.start_time,

    status: session.status,

    duration_minutes: session.end_time 

      ? session.duration_minutes 

      : Math.floor((new Date() - new Date(session.start_time)) / 60000)

  }));

};



export const getBatchSessionHistory = async (academy_id, filters = {}) => {

  const academyId = parseInt(academy_id, 10);

  const { batch_id, coach_id, date_from, date_to, status } = filters;



  const where = {

    academy_id: academyId

  };



  if (batch_id) where.batch_id = parseInt(batch_id);

  if (coach_id) where.coach_id = parseInt(coach_id);

  if (date_from) where.session_date = { ...where.session_date, gte: new Date(date_from) };

  if (date_to) where.session_date = { ...where.session_date, lte: new Date(date_to) };

  if (status) where.status = status;



  const sessions = await prisma.batchSession.findMany({

    where,

    include: {

      batch: {

        include: {

          sport: true

        }

      },

      coach: {

        select: {

          name: true

        }

      }

    },

    orderBy: [
      { session_date: 'desc' },
      { start_time: 'desc' }
    ],

    take: 100

  });



  return sessions.map(session => ({

    session_id: session.session_id,

    batch_id: session.batch_id,

    batch_name: session.batch.name,

    sport_name: session.batch.sport?.name,

    timing: session.batch.timing,

    coach_id: session.coach_id,

    coach_name: session.coach.name,

    session_date: session.session_date,

    start_time: session.start_time,

    end_time: session.end_time,

    duration_minutes: session.duration_minutes,

    status: session.status,

    attendance_summary: session.attendance_summary ? JSON.parse(session.attendance_summary) : null,

    notes: session.notes

  }));

};



export const getCoachStudentsFeeSummary = async (coach_id, academy_id, batch_id = null) => {

  

  const coachId = parseInt(coach_id, 10);

  const academyId = parseInt(academy_id, 10);

  const batchId = batch_id ? parseInt(batch_id, 10) : null;

  

  // Get all batches assigned to this coach

  const batches = await prisma.batch.findMany({

    where: {

      academy_id: academyId,

      coaches: {

        some: {

          coach_id: coachId,

        },

      },

    },

    select: {

      batch_id: true,

    },

  });



  const batchIds = batches.map(b => b.batch_id);



  if (batchIds.length === 0) {

    return {

      students: [],

      summary: {

        total_students: 0,

        fully_paid: 0,

        partially_paid: 0,

        unpaid: 0,

        total_outstanding: 0,

      },

    };

  }



  // If batch_id filter is provided, check if it's assigned to this coach

  if (batchId && !batchIds.includes(batchId)) {
    const error = new Error('Batch not assigned to this coach');
    error.statusCode = 403;
    throw error;
  }



  // Filter by specific batch if provided

  const targetBatchIds = batchId ? [batchId] : batchIds;



  // Get students enrolled in coach's batches

  const students = await prisma.student.findMany({

    where: {

      academy_id: academyId,

      enrollments: {

        some: {

          academy_id: academyId,

          batch_id: { in: targetBatchIds },

        },

      },

    },

    include: {

      batch: true,
      sport: true,
      enrollments: {

        where: {

          academy_id: academyId,

          batch_id: { in: targetBatchIds },

        },

        include: {

          duration_plan: true,

          batch: {

            include: {

              sport: true,

            },

          },

        },

      },

      receipts: {

        where: {

          academy_id: academyId,

          status: 'COMPLETED',

        },

        orderBy: { payment_date: 'desc' },

      },

      parent: true,
      student_attendances: {
        where: {
          academy_id: academyId,
        },
        orderBy: { date: 'desc' },
      },
      fees: {
        where: {
          academy_id: academyId,
        },
      },

    },

  });



  // Calculate fee summary for each student

  const studentsSummary = await Promise.all(

    students.map(async (student) => {

      // Calculate total fee due from enrollments (only from coach's batches) using centralized fee utility

      const totalFeeDue = student.enrollments.reduce((sum, e) => {

        const feeBreakdown = calculateStudentFee(e);

        return sum + feeBreakdown.totalComputedFee;

      }, 0);



      // Calculate total paid from receipts

      const totalPaid = student.receipts.reduce((sum, r) => sum + Number(r.amount), 0);



      // Calculate balance outstanding

      const balanceOutstanding = Math.max(0, totalFeeDue - totalPaid);



      // Determine fee status

      const feeStatus = balanceOutstanding === 0 ? 'paid' : 'unpaid';



      // Get last paid date

      const lastPaidDate = student.receipts.length > 0 ? student.receipts[0].payment_date : null;



      // Get batch names for this student

      const batchNames = student.enrollments

        .map(e => e.batch?.name)

        .filter(Boolean)

        .join(', ');



      // Calculate attendance summary
      const presentCount = student.student_attendances?.filter(a => a.status === 'PRESENT').length || 0;
      const absentCount = student.student_attendances?.filter(a => a.status === 'ABSENT').length || 0;
      const attendanceSummary = {
        present_count: presentCount,
        absent_count: absentCount,
      };



      return {

        student_id: student.student_id,

        name: student.name,

        profile_photo: student.profile_photo,

        age: student.age,

        gender: student.gender,

        dob: student.dob,

        height: student.height ? Number(student.height) : null,

        weight: student.weight ? Number(student.weight) : null,

        blood_group: student.blood_group,

        category: student.category,

        joining_date: student.joining_date,

        status: student.status,

        parent_name: student.parent?.name || student.parent_name || '',

        parent_phone: student.parent?.phone || student.parent_phone || '',

        parent_email: student.parent?.email || student.parent_email || '',

        phone: student.phone || student.parent?.phone || '',

        batch: student.batch,

        sport: student.sport,

        enrollments: student.enrollments,

        receipts: student.receipts,

        student_attendances: student.student_attendances,

        fees: student.fees,

        total_fee: totalFeeDue,

        paid_amount: totalPaid,

        due_amount: balanceOutstanding,

        fee_status: feeStatus,

        attendance_summary: attendanceSummary,

        last_paid_date: lastPaidDate,

        payment_count: student.receipts.length,

        batch_names: batchNames,

      };

    })

  );



  // Calculate overall summary stats

  const totalStudents = studentsSummary.length;

  const fullyPaid = studentsSummary.filter(s => s.fee_status === 'paid').length;

  const partiallyPaid = studentsSummary.filter(s => s.paid_amount > 0 && s.due_amount > 0).length;

  const unpaid = studentsSummary.filter(s => s.fee_status === 'unpaid').length;

  const totalOutstanding = studentsSummary.reduce((sum, s) => sum + s.due_amount, 0);



  const finalResponse = {

    students: studentsSummary,

    summary: {

      total_students: totalStudents,

      fully_paid: fullyPaid,

      partially_paid: partiallyPaid,

      unpaid: unpaid,

      total_outstanding: totalOutstanding,

    },

  };



  return finalResponse;

};



// Helper function to create attendance audit log

const createAttendanceAuditLog = async (auditData) => {

  try {

    await prisma.attendanceAuditLog.create({

      data: auditData

    });

  } catch (error) {

    logger.error('Failed to create attendance audit log', { error: error.message });

  }

};



export const markCoachAbsent = async (coach_id, academy_id, batch_id, reason = null) => {

  const coachId = parseInt(coach_id, 10);

  const academyId = parseInt(academy_id, 10);

  const batchId = parseInt(batch_id, 10);

  const today = new Date();

  today.setHours(0, 0, 0, 0);



  // Verify batch belongs to coach's academy

  const batch = await prisma.batch.findFirst({

    where: {

      batch_id: batchId,

      academy_id: academyId,

      status: 'ACTIVE'

    },

    include: {

      sport: true

    }

  });



  if (!batch) {

    const error = new Error('Batch not found or not active');

    error.statusCode = 404;

    throw error;

  }



  // Check if coach is assigned to this batch

  const coachAssignment = await prisma.batchCoach.findFirst({

    where: {

      batch_id: batchId,

      coach_id: coachId

    }

  });



  if (!coachAssignment) {

    const error = new Error('Coach is not assigned to this batch');

    error.statusCode = 403;

    throw error;

  }



  // Check if attendance already marked for this coach, batch, and date

  const startOfDay = new Date(today);

  startOfDay.setHours(0, 0, 0, 0);

  

  const endOfDay = new Date(today);

  endOfDay.setHours(23, 59, 59, 999);



  const existingAttendance = await prisma.coachAttendance.findFirst({

    where: {

      coach_id: coachId,

      batch_id: batchId,

      date: {

        gte: startOfDay,

        lte: endOfDay

      }

    }

  });



  if (existingAttendance) {

    const error = new Error('Attendance already marked for this batch today');

    error.statusCode = 400;

    throw error;

  }



  // Create absent attendance record

  const attendance = await prisma.coachAttendance.create({

    data: {

      coach_id: coachId,

      academy_id: academyId,

      batch_id: batchId,

      date: startOfDay,

      status: 'ABSENT',

      is_clocked_in: false,

      remarks: reason || 'Coach marked absent',

      latitude: null,

      longitude: null,

      location_verified: false

    },

    include: {

      coach: {

        select: {

          name: true,

          email: true

        }

      },

      batch: {

        select: {

          name: true,

          sport: {

            select: {

              name: true

            }

          }

        }

      }

    }

  });



  logger.info('Coach marked absent', {

    coach_id: coachId,

    academy_id: academyId,

    batch_id: batchId,

    reason

  });



  // Create attendance audit log

  await createAttendanceAuditLog({

    academy_id: academyId,

    coach_id: coachId,

    batch_id: batchId,

    sport_id: batch.sport_id,

    gps_latitude: null,

    gps_longitude: null,

    sport_center_latitude: null,

    sport_center_longitude: null,

    distance_meters: null,

    gps_accuracy_meters: null,

    attendance_radius_meters: null,

    batch_start_time: batch.timing,

    batch_end_time: batch.timing,

    attendance_start_time: new Date(),

    attendance_submit_time: new Date(),

    status: 'Absent',

    reason: reason || 'Coach marked absent',

    location_verified: false,

    location_source: null,

    ip_address: null

  });



  // Notify admin about coach absence

  try {

    await prisma.notification.create({

      data: {

        academy_id: academyId,

        type: 'COACH_ABSENT',

        title: 'Coach Absent Alert',

        body: `Coach ${attendance.coach.name} marked themselves absent for batch "${attendance.batch.name}" (${attendance.batch.sport.name}).${reason ? ` Reason: ${reason}` : ''}`,

        metadata: JSON.stringify({

          coach_id: coachId,

          coach_name: attendance.coach.name,

          batch_id: batchId,

          batch_name: attendance.batch.name,

          sport_name: attendance.batch.sport.name,

          reason: reason,

          date: today.toISOString()

        })

      }

    });



    logger.info('Admin notification created for coach absence', {

      coach_id: coachId,

      batch_id: batchId

    });

  } catch (notificationError) {

    logger.error('Failed to create admin notification for coach absence', {

      error: notificationError.message

    });

  }



  return attendance;

};



export const clockIn = async (coach_id, academy_id, batch_id, location_data = {}) => {

  const coachId = parseInt(coach_id, 10);

  const academyId = parseInt(academy_id, 10);

  const batchId = parseInt(batch_id, 10);

  const today = new Date();

  today.setHours(0, 0, 0, 0);



  // Validate batch exists and belongs to academy

  const batch = await prisma.batch.findFirst({

    where: {

      batch_id: batchId,

      academy_id: academyId,

      status: 'ACTIVE'

    },

    include: {
      sport: true,
      academy: true
    }

  });



  if (!batch) {

    const error = new Error('Batch not found or not active');

    error.statusCode = 404;

    throw error;

  }



  // Validate coach is assigned to this batch

  const coachAssignment = await prisma.batchCoach.findFirst({

    where: {

      batch_id: batchId,

      coach_id: coachId

    }

  });



  if (!coachAssignment) {

    const error = new Error('Coach is not assigned to this batch');

    error.statusCode = 403;

    throw error;

  }



  // Use date range for consistent comparison

  const startOfDay = new Date(today);

  startOfDay.setHours(0, 0, 0, 0);

  

  const endOfDay = new Date(today);

  endOfDay.setHours(23, 59, 59, 999);



  const existingAttendance = await prisma.coachAttendance.findFirst({

    where: {

      coach_id: coachId,

      batch_id: batchId,

      date: {

        gte: startOfDay,

        lte: endOfDay

      },

      is_clocked_in: true

    }

  });



  if (existingAttendance) {

    const error = new Error('Already clocked in for this batch today');

    error.statusCode = 400;

    throw error;

  }



  // Determine if coach is late based on batch timing and grace period
  const gracePeriodMinutes = batch.academy?.late_grace_period_minutes || 15;
  const currentTime = new Date();
  let attendanceStatus = 'PRESENT';
  
  // Parse batch timing (format: "09:00 AM - 11:00 AM")
  if (batch.timing) {
    const timeMatch = batch.timing.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const meridiem = timeMatch[3].toUpperCase();
      
      if (meridiem === 'PM' && hours !== 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;
      
      const batchStartTime = new Date(today);
      batchStartTime.setHours(hours, minutes, 0, 0);
      
      const graceEndTime = new Date(batchStartTime.getTime() + gracePeriodMinutes * 60000);
      
      if (currentTime > graceEndTime) {
        attendanceStatus = 'LATE';
      }
    }
  }

  const attendance = await prisma.coachAttendance.create({

    data: {

      coach_id: coachId,

      academy_id: academyId,

      batch_id: batchId,

      date: startOfDay,

      status: attendanceStatus,

      clock_in_time: new Date(),

      is_clocked_in: true,

      latitude: location_data.latitude || null,

      longitude: location_data.longitude || null,

      location_verified: location_data.location_verified || false

    },

    include: {

      coach: {

        select: {

          name: true,

          email: true

        }

      }

    }

  });



  logger.info('Coach clocked in', { coach_id: coachId, academy_id: academyId });

  // Notify admin about coach attendance
  try {
    const adminUser = await prisma.user.findFirst({
      where: {
        academy_id: academyId,
        role: 'ACADEMY_ADMIN',
        is_deleted: false
      }
    });

    if (adminUser) {
      const notificationType = attendanceStatus === 'LATE' ? 'COACH_LATE' : 'COACH_PRESENT';
      await prisma.notification.create({
        data: {
          academy_id: academyId,
          user_id: adminUser.user_id,
          type: notificationType,
          title: `Coach ${attendanceStatus}`,
          body: `Coach ${attendance.coach.name} has marked ${attendanceStatus} for ${batch.name} batch.`,
          metadata: JSON.stringify({
            subtype: 'coach_attendance',
            coach_id: coachId,
            batch_id: batchId,
            batch_name: batch.name,
            status: attendanceStatus,
            timing: batch.timing
          })
        }
      });

      // Send email notification for late arrival
      if (attendanceStatus === 'LATE' && adminUser.email) {
        // TODO: Add email notification for coach late
      }
    }
  } catch (notificationError) {
    logger.error('Failed to create coach attendance notification', { error: notificationError });
  }

  return attendance;

};



export const clockOut = async (coach_id, academy_id, batch_id) => {

  const coachId = parseInt(coach_id, 10);

  const academyId = parseInt(academy_id, 10);

  const batchId = parseInt(batch_id, 10);

  const today = new Date();

  today.setHours(0, 0, 0, 0);



  // Validate batch exists and belongs to academy

  const batch = await prisma.batch.findFirst({

    where: {

      batch_id: batchId,

      academy_id: academyId,

      status: 'ACTIVE'

    }

  });



  if (!batch) {

    const error = new Error('Batch not found or not active');

    error.statusCode = 404;

    throw error;

  }



  // Validate coach is assigned to this batch

  const coachAssignment = await prisma.batchCoach.findFirst({

    where: {

      batch_id: batchId,

      coach_id: coachId

    }

  });



  if (!coachAssignment) {

    const error = new Error('Coach is not assigned to this batch');

    error.statusCode = 403;

    throw error;

  }



  // Use date range for consistent comparison

  const startOfDay = new Date(today);

  startOfDay.setHours(0, 0, 0, 0);

  

  const endOfDay = new Date(today);

  endOfDay.setHours(23, 59, 59, 999);



  const attendance = await prisma.coachAttendance.findFirst({

    where: {

      coach_id: coachId,

      batch_id: batchId,

      date: {

        gte: startOfDay,

        lte: endOfDay

      },

      is_clocked_in: true

    }

  });



  if (!attendance) {

    const error = new Error('No active clock-in found for this batch today');

    error.statusCode = 400;

    throw error;

  }



  const updatedAttendance = await prisma.coachAttendance.update({

    where: { attendance_id: attendance.attendance_id },

    data: {

      clock_out_time: new Date(),

      is_clocked_in: false

    },

    include: {

      coach: {

        select: {

          name: true,

          email: true

        }

      }

    }

  });



  logger.info('Coach clocked out', { coach_id: coachId, academy_id: academyId });

  return updatedAttendance;

};



export const getCoachBatches = async (coach_id, academy_id) => {

  console.log('=== getCoachBatches DEBUG ===');

  console.log('coach_id:', coach_id, 'type:', typeof coach_id);

  console.log('academy_id:', academy_id, 'type:', typeof academy_id);



  const academy = await prisma.academy.findUnique({

    where: { academy_id: parseInt(academy_id, 10) },

    select: { 

      name: true,

      latitude: true,

      longitude: true,

      attendance_radius_meters: true

    }

  });



  const batches = await prisma.batch.findMany({

    where: {

      coaches: {

        some: {

          coach_id: parseInt(coach_id, 10)

        }

      },

      academy_id: parseInt(academy_id, 10),

      status: 'ACTIVE'

    },

    include: {

      sport: {

        select: {

          sport_id: true,

          name: true,

          sport_center: true,

          attendance_radius_meters: true,

          latitude: true,

          longitude: true,

          use_custom_location: true

        }

      },

      students: { where: { ...NOT_DELETED, status: 'ACTIVE' } }

    }

  });



  console.log('Batches found:', batches.length);

  if (batches.length > 0) {

    console.log('Sample batch:', batches[0]);

    console.log('Sample batch sport_id:', batches[0].sport_id);

    console.log('Sample batch sport:', batches[0].sport);

  }



  // Debug: Check if any batches have NULL sport_id

  const batchesWithNullSport = batches.filter(b => b.sport_id === null);

  if (batchesWithNullSport.length > 0) {

    console.log('WARNING: Found batches with NULL sport_id:', batchesWithNullSport.map(b => ({ batch_id: b.batch_id, name: b.name })));

    

    // Debug: Check what sports exist in this academy

    const academySports = await prisma.sport.findMany({

      where: { academy_id: parseInt(academy_id, 10) },

      select: { sport_id: true, name: true }

    });

    console.log('Academy sports available:', academySports);

  }



  return {

    coach_context: {

      academy_name: academy?.name || 'Academy'

    },

    batches: batches.map(batch => ({

      ...batch,

      academy: {

        latitude: academy?.latitude ? parseFloat(academy.latitude) : null,

        longitude: academy?.longitude ? parseFloat(academy.longitude) : null,

        attendance_radius_meters: academy?.attendance_radius_meters || 100

      },

      students: (batch.students || []).map(student => ({
        ...student,
        batch: {
          batch_id: batch.batch_id,
          name: batch.name
        }
      }))

    }))

  };

};



export const getCoachBatchById = async (batchId, coach_id, academy_id) => {

  const batch = await prisma.batch.findFirst({

    where: {

      batch_id: parseInt(batchId, 10),

      academy_id: parseInt(academy_id, 10),

      coaches: {

        some: {

          coach_id: parseInt(coach_id, 10)

        }

      },

      status: 'ACTIVE'

    },

    include: {

      sport: true,

      coaches: {

        include: {

          coach: {

            select: {

              coach_id: true,

              name: true,

              specialization: true

            }

          }

        }

      },

      students: {

        where: { ...NOT_DELETED, status: 'ACTIVE' },

        include: {

          sport: true

        }

      }

    }

  });



  if (!batch) {

    const error = new Error('Batch not found or not assigned to this coach');

    error.statusCode = 404;

    throw error;

  }



  return batch;

};



export const getCoachDashboard = async (coach_id, academy_id) => {

  const coach = await prisma.coach.findFirst({

    where: { coach_id: parseInt(coach_id, 10), ...NOT_DELETED },

    include: { academy: { select: { name: true } } }

  });



  if (!coach) {

    const error = new Error('Coach not found');

    error.statusCode = 404;

    throw error;

  }



  const today = new Date();

  today.setHours(0, 0, 0, 0);



  const batches = await prisma.batch.findMany({

    where: {

      coaches: {

        some: {

          coach_id: coach.coach_id

        }

      },

      academy_id: parseInt(academy_id, 10),

      status: 'ACTIVE'

    },

    include: {

      students: { where: { ...NOT_DELETED, status: 'ACTIVE' } },

      sport: true

    }

  });



  const todayStudentCount = batches.reduce((sum, b) => sum + b.students.length, 0);



  const todayAttendance = await prisma.studentAttendance.findMany({

    where: {

      academy_id: parseInt(academy_id, 10),

      marked_by_coach_id: coach.coach_id,

      date: today

    }

  });



  const presentToday = todayAttendance.filter((a) => a.status === 'PRESENT').length;

  const attendanceRate =

    todayAttendance.length > 0

      ? Math.round((presentToday / todayAttendance.length) * 100)

      : 0;



  const pendingFees = await prisma.student.count({

    where: {

      academy_id: parseInt(academy_id, 10),

      batch_id: { in: batches.map((b) => b.batch_id) },

      ...NOT_DELETED,

      fees_status: { in: ['unpaid', 'pending', 'partial'] }

    }

  });



  return {

    coach_name: coach.name,

    academy_name: coach.academy?.name,

    assigned_batches: batches.length,

    todays_students: todayStudentCount,

    attendance_summary: {

      marked_today: todayAttendance.length,

      present_today: presentToday,

      rate_percent: attendanceRate

    },

    pending_fees_count: pendingFees,

    batches

  };

};



export const getCoachPayments = async (coach_id, academy_id) => {

  const coachId = parseInt(coach_id, 10);

  const academyId = parseInt(academy_id, 10);



  const payments = await prisma.receipt.findMany({

    where: {

      academy_id: academyId,

      collected_by_coach_id: coachId

    },

    include: {

      student: {

        select: {

          student_id: true,

          name: true

        }

      }

    },

    orderBy: {

      created_at: 'desc'

    },

    take: 50

  });



  return payments.map(payment => ({

    id: payment.receipt_id,

    student_id: payment.student_id,

    student_name: payment.student?.name,

    amount: payment.amount,

    method: payment.method,

    status: payment.status,

    payment_date: payment.payment_date,

    remarks: payment.remarks,

    proof_url: payment.proof_url,

    created_at: payment.created_at

  }));

};



export const markStudentAttendance = async (coach_id, academy_id, payload) => {

  const coachId = parseInt(coach_id, 10);

  const academyId = parseInt(academy_id, 10);

  const batchId = parseInt(payload.batch_id, 10);

  const attendanceDate = getUtcMidnight(payload.date);

  const records = payload.records || [];



  logger.info('markStudentAttendance called', { 
    coach_id: coachId, 
    academy_id: academyId, 
    batch_id: batchId, 
    date: attendanceDate.toISOString(),
    records_count: records.length,
    payload: JSON.stringify(payload)
  });



  if (!Array.isArray(records) || records.length === 0) {

    const error = new Error('At least one attendance record is required');

    error.statusCode = 400;

    logger.error('No attendance records provided', { coach_id: coachId, batch_id: batchId });

    throw error;

  }



  let batch;
  try {
    batch = await prisma.batch.findFirst({

      where: {

        batch_id: batchId,

        academy_id: academyId,

        coaches: {

          some: {

            coach_id: coachId

          }

        },

        status: 'ACTIVE'

      },

      include: { sport: true }

    });
  } catch (error) {
    logger.error('Prisma error finding batch', { error: error.message, code: error.code, batch_id: batchId, coach_id: coachId });
    const err = new Error('Database error while finding batch');
    err.statusCode = 500;
    err.code = 'DATABASE_ERROR';
    throw err;
  }



  if (!batch) {

    const error = new Error('Batch not found or not assigned to this coach');

    error.statusCode = 404;

    error.code = 'BATCH_NOT_FOUND';

    logger.error('Batch not found or not assigned', { batch_id: batchId, coach_id: coachId });

    throw error;

  }



  // Verify that there is an active batch session for today
  const today = getUtcMidnight();

  let activeSession;
  try {
    activeSession = await prisma.batchSession.findFirst({
      where: {
        batch_id: batchId,
        coach_id: coachId,
        academy_id: academyId,
        session_date: today,
        status: {
          in: ['LIVE', 'LATE_START']
        }
      }
    });
  } catch (error) {
    logger.error('Prisma error finding active session', { error: error.message, code: error.code, batch_id: batchId, coach_id: coachId });
    const err = new Error('Database error while finding active session');
    err.statusCode = 500;
    err.code = 'DATABASE_ERROR';
    throw err;
  }

  if (!activeSession) {
    const error = new Error('No active batch session found. Please start the batch session before marking student attendance.');
    error.statusCode = 403;
    error.code = 'NO_ACTIVE_SESSION';
    logger.error('No active session found', { batch_id: batchId, coach_id: coachId });
    throw error;
  }



  const results = [];

  const emailDispatches = [];



  for (const record of records) {

    const status = String(record.status || '').toUpperCase();



    if (!VALID_ATTENDANCE_STATUSES.includes(status)) {

      const error = new Error(`Invalid attendance status for student ${record.student_id}`);

      error.statusCode = 400;

      logger.error('Invalid attendance status', { student_id: record.student_id, status });

      throw error;

    }



    let student;
    try {
      student = await prisma.student.findFirst({

        where: {

          student_id: parseInt(record.student_id, 10),

          academy_id: academyId,

          batch_id: batchId,

          ...NOT_DELETED,

          status: 'ACTIVE'

        }

      });
    } catch (error) {
      logger.error('Prisma error finding student', { error: error.message, code: error.code, student_id: record.student_id });
      const err = new Error('Database error while finding student');
      err.statusCode = 500;
      err.code = 'DATABASE_ERROR';
      throw err;
    }



    if (!student) {

      const error = new Error(`Student ${record.student_id} not found in assigned batch`);

      error.statusCode = 404;

      error.code = 'STUDENT_NOT_FOUND';

      logger.error('Student not found', { student_id: record.student_id, batch_id: batchId });

      throw error;

    }



    let attendance;
    try {
      attendance = await prisma.studentAttendance.upsert({

      where: {

        student_id_batch_id_date: {

          student_id: student.student_id,

          batch_id: batchId,

          date: attendanceDate

        }

      },

      create: {

        academy_id: academyId,

        student_id: student.student_id,

        batch_id: batchId,

        batch_session_id: activeSession.session_id,

        date: attendanceDate,

        status,

        marked_by_coach_id: coachId,

        remarks: record.remarks || null

      },

      update: {
        
        // Check if attendance is locked before updating
        data: {
          status,

          marked_by_coach_id: coachId,

          remarks: record.remarks || null

        }
      }

    });
    } catch (error) {
      logger.error('Prisma error upserting attendance', { error: error.message, code: error.code, student_id: student.student_id });
      const err = new Error('Database error while upserting attendance');
      err.statusCode = 500;
      err.code = 'DATABASE_ERROR';
      throw err;
    }

    // Check if attendance is locked - prevent coach edits
    if (attendance.locked) {
      const error = new Error('Attendance is locked and cannot be modified. Only Academy Admin can unlock or modify locked attendance.');
      error.statusCode = 403;
      throw error;
    }

    // Log attendance edit if status changed
    if (attendance.status !== status) {
      await prisma.attendanceEditLog.create({
        data: {
          attendance_id: attendance.attendance_id,
          student_id: student.student_id,
          batch_id: batchId,
          batch_session_id: activeSession.session_id,
          previous_status: attendance.status,
          new_status: status,
          changed_by_user_id: coachId,
          changed_by_role: 'COACH',
          change_reason: 'Attendance marked by coach'
        }
      });
    }



    results.push(attendance);



    if (student.parent_email) {

      emailDispatches.push(

        sendParentAttendanceEmail({

          parentEmail: student.parent_email,

          studentName: student.name,

          status,

          batchName: batch.name,

          remarks: record.remarks || null,

          markedAt: new Date()

        }).catch((mailErr) => {

          logger.error('Parent attendance email failed', {

            student_id: student.student_id,

            message: mailErr.message

          });

        })

      );

    }

  }



  await Promise.all(emailDispatches);



  await logAudit({

    academy_id: academyId,

    actor_type: 'COACH',

    actor_id: coachId,

    action: 'STUDENT_ATTENDANCE_SUBMITTED',

    entity_type: 'Batch',

    entity_id: batchId,

    metadata: { records_count: results.length, date: attendanceDate }

  });



  logger.info('Student attendance marked', {

    coach_id: coachId,

    batch_id: batchId,

    records_count: results.length

  });



  return {

    batch_id: batchId,

    date: attendanceDate,

    marked_count: results.length,

    attendance_records: results

  };

};



export const recordCoachPayment = async (coach_id, academy_id, payload) => {

  const coachId = parseInt(coach_id, 10);

  const academyId = parseInt(academy_id, 10);

  const studentId = parseInt(payload.student_id, 10);
  const amount = parseFloat(payload.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    const error = new Error('Amount must be a positive number');
    error.statusCode = 400;
    throw error;
  }

  // Validate payment method is allowed for coach (offline only)
  if (!receiptService.isOfflinePaymentMethodAllowed(payload.method)) {
    const error = new Error('Invalid payment method. Only Cash and Cheque are allowed for coach');
    error.statusCode = 400;
    throw error;
  }

  const student = await prisma.student.findFirst({

    where: {

      student_id: studentId,

      academy_id: academyId,

      ...NOT_DELETED,

      status: 'ACTIVE'

    },

    include: { 

      batch: {

        include: {

          coaches: true

        }

      } 

    }

  });



  const hasCoach = student?.batch?.coaches?.some(c => c.coach_id === coachId);

  if (!student?.batch || !hasCoach) {

    const error = new Error('Student not found in your assigned batches');

    error.statusCode = 404;

    throw error;

  }



  // Generate receipt number
  const receiptNumber = await receiptService.generateReceiptNumber(academyId);

  const receipt = await prisma.receipt.create({

    data: {
      receipt_number: receiptNumber,
      academy_id: academyId,

      student_id: studentId,
      amount,
      payment_date: payload.payment_date ? new Date(payload.payment_date) : new Date(),
      method: payload.method,
      status: 'PAID', // Coach offline payments are immediately marked as PAID
      remarks: payload.remarks || null,

      proof_url: payload.proof_url || null,

      collected_by_coach_id: coachId
    },
    include: {
      student: {
        select: {
          name: true,
          parent_name: true,
        },
      },
    },
  });

  // Update student fees status
  await prisma.student.update({
    where: { student_id: studentId },
    data: { fees_status: 'paid' },
  });

  // Create in-app notification for parent when coach records payment
  try {
    const student = await prisma.student.findUnique({
      where: { student_id: studentId },
      select: { parent_id: true, name: true }
    });

    if (student && student.parent_id) {
      const announcement = await prisma.announcement.create({
        data: {
          title: 'Payment Received',
          message: `Your payment of ₹${amount.toFixed(2)} for ${student.name} has been received and recorded. Receipt is now available in the Receipts tab.`,
          category: 'PAYMENT',
          priority: 'HIGH',
          target_type: 'SELECTED_PARENTS',
          status: 'PUBLISHED',
          published_at: new Date(),
          total_recipients: 1,
          sender_type: 'COACH',
          sender_id: coachId,
          academy_id: academyId,
          delivered_count: 1
        }
      });

      await prisma.announcementRecipient.create({
        data: {
          announcement_id: announcement.announcement_id,
          recipient_type: 'PARENT',
          recipient_id_field: student.parent_id,
          delivery_status: 'DELIVERED',
          delivered_at: new Date()
        }
      });

      await prisma.announcementReadStatus.create({
        data: {
          announcement_id: announcement.announcement_id,
          recipient_type: 'PARENT',
          recipient_id_field: student.parent_id
        }
      });

      logger.info(`Coach payment notification created for parent_id: ${student.parent_id}`);
    }
  } catch (notificationError) {
    logger.error('Failed to create coach payment notification:', notificationError);
    // Don't throw error - notification is secondary to payment recording
  }

  await logAudit({

    academy_id: academyId,

    actor_type: 'COACH',

    actor_id: coachId,

    action: 'PAYMENT_RECORDED',

    entity_type: 'Receipt',

    entity_id: receipt.receipt_id,

    metadata: { student_id: studentId, amount: payload.amount }

  });



  return receipt;

};



export const updatePaymentProof = async (coach_id, academy_id, receipt_id, proof_url) => {

  const coachId = parseInt(coach_id, 10);

  const academyId = parseInt(academy_id, 10);

  const receiptId = parseInt(receipt_id, 10);



  // Verify the receipt belongs to this coach and academy

  const receipt = await prisma.receipt.findFirst({

    where: {

      receipt_id: receiptId,

      academy_id: academyId,

      collected_by_coach_id: coachId,

      student: NOT_DELETED

    }

  });



  if (!receipt) {

    const error = new Error('Payment record not found or you do not have permission to update it');

    error.statusCode = 404;

    throw error;

  }



  // Update only the proof_url

  const updatedReceipt = await prisma.receipt.update({

    where: { receipt_id: receiptId },

    data: { proof_url: proof_url }

  });



  await logAudit({

    academy_id: academyId,

    actor_type: 'COACH',

    actor_id: coachId,

    action: 'PAYMENT_PROOF_UPDATED',

    entity_type: 'Receipt',

    entity_id: receiptId,

    metadata: { previous_proof: receipt.proof_url, new_proof: proof_url }

  });



  return updatedReceipt;

};



export const getCoachSelfAttendanceByDate = async (coach_id, academy_id, batch_id, date) => {

  const coachId = parseInt(coach_id, 10);

  const academyId = parseInt(academy_id, 10);

  const batchId = parseInt(batch_id, 10);

  const normalizedDate = getUtcMidnight(date);

  const attendance = await prisma.coachAttendance.findFirst({

    where: {

      coach_id: coachId,

      batch_id: batchId,

      date: normalizedDate

    }

  });



  return attendance;

};



export const markCoachSelfAttendance = async (coach_id, academy_id, payload) => {

  const coachId = parseInt(coach_id, 10);

  const academyId = parseInt(academy_id, 10);

  const batchId = payload.batch_id ? parseInt(payload.batch_id, 10) : null;

  const attendanceDate = payload.date ? new Date(payload.date) : new Date();

  const attendanceStatus = payload.status?.toUpperCase() || 'PRESENT';



  logger.info('markCoachSelfAttendance called', { 
    coach_id: coachId, 
    academy_id: academyId, 
    batch_id: batchId, 
    payload: JSON.stringify(payload),
    attendanceDate: attendanceDate.toISOString(),
    attendanceStatus 
  });



  // Validate required fields
  if (!batchId || isNaN(batchId)) {
    const error = new Error('batch_id is required and must be a valid number');
    error.statusCode = 400;
    error.code = 'INVALID_BATCH_ID';
    logger.error('Invalid batch_id', { batch_id: payload.batch_id, parsed: batchId });
    throw error;
  }

  if (!coachId || isNaN(coachId)) {
    const error = new Error('Invalid coach_id');
    error.statusCode = 400;
    error.code = 'INVALID_COACH_ID';
    logger.error('Invalid coach_id', { coach_id: coachId, parsed: coachId });
    throw error;
  }

  if (!academyId || isNaN(academyId)) {
    const error = new Error('Invalid academy_id');
    error.statusCode = 400;
    error.code = 'INVALID_ACADEMY_ID';
    logger.error('Invalid academy_id', { academy_id: academyId, parsed: academyId });
    throw error;
  }



  // Check if coach has active batch sessions before marking checkout (ABSENT)
  if (attendanceStatus === 'ABSENT') {
    const today = getUtcMidnight();

    const activeSessions = await prisma.batchSession.findMany({
      where: {
        coach_id: coachId,
        academy_id: academyId,
        session_date: today,
        status: {
          in: ['LIVE', 'LATE_START']
        }
      }
    });

    if (activeSessions.length > 0) {
      // Fetch batch names for better error message
      const batchIds = activeSessions.map(s => s.batch_id);
      const batches = await prisma.batch.findMany({
        where: { batch_id: { in: batchIds } },
        select: { batch_id: true, name: true }
      });

      const batchNames = activeSessions.map(s => {
        const batch = batches.find(b => b.batch_id === s.batch_id);
        return batch ? batch.name : `Batch #${s.batch_id}`;
      }).join(', ');

      const error = new Error(
        `You have ${activeSessions.length} active batch session(s) running: ${batchNames}. Please end the batch session(s) before checking out.`
      );
      error.statusCode = 400;
      error.code = 'ACTIVE_BATCH_SESSIONS';
      throw error;
    }
  }



  // Validate batch exists and belongs to academy

  let batch;
  try {
    batch = await prisma.batch.findFirst({

      where: {

        batch_id: batchId,

        academy_id: academyId,

        status: 'ACTIVE'

      },

      include: {

        sport: true

      }

    });
  } catch (error) {
    logger.error('Prisma error finding batch', { error: error.message, code: error.code, batch_id: batchId, academy_id: academyId });
    const err = new Error('Database error while finding batch');
    err.statusCode = 500;
    err.code = 'DATABASE_ERROR';
    throw err;
  }



  if (!batch) {

    const error = new Error('Batch not found or not active');

    error.statusCode = 404;

    error.code = 'BATCH_NOT_FOUND';

    logger.error('Batch not found', { batch_id: batchId, academy_id: academyId });

    throw error;

  }



  // Validate coach is assigned to this batch

  let coachAssignment;
  try {
    coachAssignment = await prisma.batchCoach.findFirst({

      where: {

        batch_id: batchId,

        coach_id: coachId

      }

    });
  } catch (error) {
    logger.error('Prisma error finding coach assignment', { error: error.message, code: error.code, batch_id: batchId, coach_id: coachId });
    const err = new Error('Database error while finding coach assignment');
    err.statusCode = 500;
    err.code = 'DATABASE_ERROR';
    throw err;
  }



  if (!coachAssignment) {

    const error = new Error('Coach is not assigned to this batch');

    error.statusCode = 403;

    error.code = 'COACH_NOT_ASSIGNED';

    logger.error('Coach not assigned to batch', { batch_id: batchId, coach_id: coachId });

    throw error;

  }

  

  // Normalize date to start of day for consistent comparison
  const startOfDay = getUtcMidnight(attendanceDate);

  const status = String(attendanceStatus || 'PRESENT').toUpperCase();

  try {
    // Check if attendance already exists for this coach, batch, and date
    let existingAttendance;
    try {
      existingAttendance = await prisma.coachAttendance.findFirst({
        where: {
          coach_id: coachId,
          batch_id: batchId,
          date: startOfDay
        }
      });
    } catch (error) {
      logger.error('Prisma error finding existing attendance', { error: error.message, code: error.code, coach_id: coachId, batch_id: batchId });
      const err = new Error('Database error while finding existing attendance');
      err.statusCode = 500;
      err.code = 'DATABASE_ERROR';
      throw err;
    }

    // If attendance already exists, return it without creating a new one
    if (existingAttendance) {
      logger.info('Coach attendance already exists for this batch and date', { coachId, batchId, date: attendanceDate });
      return existingAttendance;
    }

    // Enforce location verification only once per batch per day
    const existingVerification = await prisma.coachAttendance.findFirst({
      where: {
        coach_id: coachId,
        batch_id: batchId,
        date: startOfDay,
        location_verified: true
      }
    });

    let isVerified = false;
    let distance = null;

    if (existingVerification) {
      isVerified = true;
      distance = existingVerification.distance_from_location_meters ? Number(existingVerification.distance_from_location_meters) : null;
      logger.info('Skipping GPS verification as verification already exists today', { coachId, batchId, date: startOfDay });
    } else if (status === 'PRESENT' || status === 'LATE') {
      if (payload.latitude && payload.longitude) {
        const batchDetails = await prisma.batch.findUnique({
          where: { batch_id: batchId },
          include: { sport: true, academy: true }
        });
        if (batchDetails) {
          const attendanceLocation = getAttendanceLocation(batchDetails.sport, batchDetails.academy);
          if (attendanceLocation) {
            const effectiveRadius = attendanceLocation.radius * 1.05;
            const verification = verifyLocation(
              payload.latitude,
              payload.longitude,
              attendanceLocation.latitude,
              attendanceLocation.longitude,
              effectiveRadius
            );
            if (verification.valid) {
              isVerified = true;
              distance = verification.distance;
            } else {
              const error = new Error(`GPS verification failed: You are ${verification.distance}m away from the sport center. Maximum allowed distance is ${Math.round(effectiveRadius)}m.`);
              error.statusCode = 403;
              error.code = 'GPS_OUT_OF_RANGE';
              throw error;
            }
          }
        }
      } else {
        const error = new Error('GPS coordinates are required for attendance verification');
        error.statusCode = 400;
        error.code = 'GPS_REQUIRED';
        throw error;
      }
    }

    // Create new attendance record
    let attendance;
    try {
      attendance = await prisma.coachAttendance.create({
        data: {
          coach_id: coachId,
          academy_id: academyId,
          batch_id: batchId,
          date: startOfDay,
          status,
          remarks: payload.remarks || null,
          latitude: payload.latitude || null,
          longitude: payload.longitude || null,
          distance_from_location_meters: distance,
          location_verified: isVerified
        }
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw error;
      }
      logger.error('Prisma error creating attendance', { error: error.message, code: error.code, coach_id: coachId, batch_id: batchId });
      const err = new Error('Database error while creating attendance');
      err.statusCode = 500;
      err.code = 'DATABASE_ERROR';
      throw err;
    }



    if (status === 'ABSENT') {

      let coach;
      try {
        coach = await prisma.coach.findUnique({

          where: { coach_id: coachId },

          include: {

            academy: {

              include: {

                users: { where: { ...NOT_DELETED, role: 'ACADEMY_ADMIN' }, take: 1 }

              }

            }

          }

        });
      } catch (error) {
        logger.error('Prisma error finding coach', { error: error.message, code: error.code, coach_id: coachId });
        // Continue without sending email if coach lookup fails
      }



      const adminEmail = coach?.academy?.users?.[0]?.email;

      if (adminEmail) {

        await sendCoachAbsenceAlertToAdmin({

          adminEmail,

          coachName: coach.name,

          date: startOfDay.toISOString().slice(0, 10),

          batches: [batch]

        }).catch((err) => {

          logger.error('Coach absence alert failed', { message: err.message });

        });

      }

    }



    await logAudit({

      academy_id: academyId,

      actor_type: 'COACH',

      actor_id: coachId,

      action: 'COACH_SELF_ATTENDANCE',

      metadata: { 

        status, 

        date: startOfDay,

        batch_id: batchId,

        sport_id: batch.sport_id || null

      }

    }).catch((err) => {
      logger.error('Failed to log audit for coach self-attendance', { 
        error: err.message, 
        coach_id: coachId, 
        batch_id: batchId 
      });
    });



    return attendance;

  } catch (error) {

    // If it's a unique constraint error (P2002), try to fetch and return existing record

    if (error.code === 'P2002') {

      logger.warn('Duplicate attendance attempt due to race condition, fetching existing record', { coachId, batchId, date: attendanceDate });

      const existingAttendance = await prisma.coachAttendance.findFirst({

        where: {

          coach_id: coachId,

          batch_id: batchId,

          date: {

            gte: startOfDay,

            lte: endOfDay

          }

        }

      });

      if (existingAttendance) {

        return existingAttendance;

      }

    }

    throw error;
  }
};

export const getStudentAttendance = async (coach_id, academy_id, batch_id, date) => {
  const coachId = parseInt(coach_id, 10);
  const academyId = parseInt(academy_id, 10);
  const batchId = parseInt(batch_id, 10);
  const dateMidnight = getUtcMidnight(date);

  const batch = await prisma.batch.findFirst({
    where: {
      batch_id: batchId,
      academy_id: academyId,
      coaches: {
        some: {
          coach_id: coachId
        }
      },
      status: 'ACTIVE'
    }
  });

  if (!batch) {
    const error = new Error('Batch not found or not assigned to this coach');
    error.statusCode = 404;
    throw error;
  }

  const attendanceRecords = await prisma.studentAttendance.findMany({
    where: {
      academy_id: academyId,
      batch_id: batchId,
      date: dateMidnight
    }
  });

  return attendanceRecords;
};