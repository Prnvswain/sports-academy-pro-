import prisma from '../../config/prisma.js';
import { NOT_DELETED } from '../../utils/softDelete.util.js';
import {
  sendCoachAbsenceAlertToAdmin,
  sendParentAttendanceEmail
} from '../../services/mail.service.js';
import { logAudit } from '../../utils/audit.util.js';
import logger from '../../utils/logger.js';

const VALID_ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE'];

export const clockIn = async (coach_id, academy_id, location_data = {}) => {
  const coachId = parseInt(coach_id, 10);
  const academyId = parseInt(academy_id, 10);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingAttendance = await prisma.coachAttendance.findFirst({
    where: {
      coach_id: coachId,
      academy_id: academyId,
      date: today,
      is_clocked_in: true
    }
  });

  if (existingAttendance) {
    const error = new Error('Already clocked in today');
    error.statusCode = 400;
    throw error;
  }

  const attendance = await prisma.coachAttendance.create({
    data: {
      coach_id: coachId,
      academy_id: academyId,
      date: today,
      status: 'PRESENT',
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
  return attendance;
};

export const clockOut = async (coach_id, academy_id) => {
  const coachId = parseInt(coach_id, 10);
  const academyId = parseInt(academy_id, 10);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const attendance = await prisma.coachAttendance.findFirst({
    where: {
      coach_id: coachId,
      academy_id: academyId,
      date: today,
      is_clocked_in: true
    }
  });

  if (!attendance) {
    const error = new Error('No active clock-in found for today');
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
  const academy = await prisma.academy.findUnique({
    where: { academy_id: parseInt(academy_id, 10) },
    select: { name: true }
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
      sport: true,
      students: { where: { ...NOT_DELETED, status: 'ACTIVE' } }
    }
  });

  return {
    coach_context: {
      academy_name: academy?.name || 'Academy'
    },
    batches
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
    created_at: payment.created_at
  }));
};

export const markStudentAttendance = async (coach_id, academy_id, payload) => {
  const coachId = parseInt(coach_id, 10);
  const academyId = parseInt(academy_id, 10);
  const batchId = parseInt(payload.batch_id, 10);
  const attendanceDate = payload.date ? new Date(payload.date) : new Date();
  attendanceDate.setHours(0, 0, 0, 0);
  const records = payload.records || [];
  
  // Get GPS verification data from middleware
  const gpsVerification = payload.gpsVerification || null;

  if (!Array.isArray(records) || records.length === 0) {
    const error = new Error('At least one attendance record is required');
    error.statusCode = 400;
    throw error;
  }

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
    },
    include: { sport: true }
  });

  if (!batch) {
    const error = new Error('Batch not found or not assigned to this coach');
    error.statusCode = 404;
    throw error;
  }

  const results = [];
  const emailDispatches = [];

  for (const record of records) {
    const status = String(record.status || '').toUpperCase();

    if (!VALID_ATTENDANCE_STATUSES.includes(status)) {
      const error = new Error(`Invalid attendance status for student ${record.student_id}`);
      error.statusCode = 400;
      throw error;
    }

    const student = await prisma.student.findFirst({
      where: {
        student_id: parseInt(record.student_id, 10),
        academy_id: academyId,
        batch_id: batchId,
        ...NOT_DELETED,
        status: 'ACTIVE'
      }
    });

    if (!student) {
      const error = new Error(`Student ${record.student_id} not found in assigned batch`);
      error.statusCode = 404;
      throw error;
    }

    const attendance = await prisma.studentAttendance.upsert({
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
        date: attendanceDate,
        status,
        marked_by_coach_id: coachId,
        remarks: record.remarks || null,
        latitude: payload.latitude ? parseFloat(payload.latitude) : null,
        longitude: payload.longitude ? parseFloat(payload.longitude) : null,
        distance_from_location_meters: gpsVerification?.distance || null,
        location_verified: gpsVerification?.verified || false
      },
      update: {
        status,
        marked_by_coach_id: coachId,
        remarks: record.remarks || null,
        latitude: payload.latitude ? parseFloat(payload.latitude) : null,
        longitude: payload.longitude ? parseFloat(payload.longitude) : null,
        distance_from_location_meters: gpsVerification?.distance || null,
        location_verified: gpsVerification?.verified || false
      }
    });

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

  // Generate a temporary unique receipt tracking configuration identifier
  const targetReceiptNo = `REC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const receipt = await prisma.receipt.create({
    data: {
      receipt_number: targetReceiptNo,
      academy_id: academyId,
      student_id: studentId,
      amount: payload.amount,
      payment_date: payload.payment_date ? new Date(payload.payment_date) : new Date(),
      method: payload.method || 'cash',
      status: 'PENDING',
      remarks: payload.remarks || null,
      proof_url: payload.proof_url || null,
      collected_by_coach_id: coachId
    }
  });

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

export const markCoachSelfAttendance = async (coach_id, academy_id, payload) => {
  const coachId = parseInt(coach_id, 10);
  const academyId = parseInt(academy_id, 10);
  const attendanceDate = payload.date ? new Date(payload.date) : new Date();
  attendanceDate.setHours(0, 0, 0, 0);
  const status = String(payload.status || 'PRESENT').toUpperCase();

  const attendance = await prisma.coachAttendance.upsert({
    where: {
      coach_id_date: {
        coach_id: coachId,
        date: attendanceDate
      }
    },
    create: {
      coach_id: coachId,
      academy_id: academyId,
      date: attendanceDate,
      status,
      remarks: payload.remarks || null
    },
    update: {
      status,
      remarks: payload.remarks || null
    }
  });

  if (status === 'ABSENT') {
    // FIXED: Using standard relation schemas consistent with the rest of this file
    const coach = await prisma.coach.findUnique({
      where: { coach_id: coachId },
      include: {
        academy: {
          include: {
            users: { where: { ...NOT_DELETED, role: 'ACADEMY_ADMIN' }, take: 1 }
          }
        }
      }
    });

    const adminEmail = coach?.academy?.users?.[0]?.email;
    if (adminEmail) {
      // Safely pull active batches using the direct many-to-many lookup logic
      const activeBatches = await prisma.batch.findMany({
        where: {
          coaches: { some: { coach_id: coachId } },
          academy_id: academyId,
          status: 'ACTIVE'
        }
      });

      await sendCoachAbsenceAlertToAdmin({
        adminEmail,
        coachName: coach.name,
        date: attendanceDate.toISOString().slice(0, 10),
        batches: activeBatches
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
    metadata: { status, date: attendanceDate }
  });

  return attendance;
};