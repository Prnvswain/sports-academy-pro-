import prisma from '../../config/prisma.js';
import bcrypt from 'bcryptjs';
import { BCRYPT_SALT_ROUNDS } from '../../config/app.config.js';
import { NOT_DELETED, softDeletePayload } from '../../utils/softDelete.util.js';
import { generateTempPassword } from '../../utils/password.util.js';
import { sendCoachOnboardingEmail, sendStudentExitEmail } from '../../services/mail.service.js';
import { logAudit } from '../../utils/audit.util.js';
import logger from '../../utils/logger.js';

const academyScope = (academy_id) => ({
  academy_id: parseInt(academy_id, 10),
  ...NOT_DELETED
});

const getCoachForAcademy = async (academy_id, coach_id) =>
  prisma.coach.findFirst({
    where: {
      coach_id: parseInt(coach_id, 10),
      ...academyScope(academy_id)
    }
  });

const getStudentForAcademy = async (academy_id, student_id) =>
  prisma.student.findFirst({
    where: {
      student_id: parseInt(student_id, 10),
      ...academyScope(academy_id)
    }
  });

const getBatchForAcademy = async (academy_id, batch_id) =>
  prisma.batch.findFirst({
    where: {
      batch_id: parseInt(batch_id, 10),
      academy_id: parseInt(academy_id, 10)
    },
    include: { 
      coaches: { include: { coach: true } }, 
      sport: true 
    }
  });

const getPaymentForAcademy = async (academy_id, receipt_id) =>
  prisma.receipt.findFirst({
    where: {
      receipt_id: parseInt(receipt_id, 10),
      academy_id: parseInt(academy_id, 10),
      student: NOT_DELETED
    },
    include: { student: true }
  });

const assertStudentSportBatch = async (academy_id, sport_id, batch_id) => {
  const sportId = parseInt(sport_id, 10);
  const batchId = parseInt(batch_id, 10);
  const batch = await getBatchForAcademy(academy_id, batchId);

  if (!batch) {
    const error = new Error('Batch not found');
    error.statusCode = 404;
    throw error;
  }

  if (batch.status !== 'ACTIVE') {
    const error = new Error('Batch is not active');
    error.statusCode = 400;
    throw error;
  }

  if (batch.sport_id !== sportId) {
    const error = new Error('Batch does not match selected sport');
    error.statusCode = 400;
    throw error;
  }

  if (batch.max_capacity != null) {
    const enrolled = await prisma.student.count({
      where: { batch_id: batchId, ...NOT_DELETED, status: 'ACTIVE' }
    });
    if (enrolled >= batch.max_capacity) {
      const error = new Error('Batch has no available seats');
      error.statusCode = 400;
      throw error;
    }
  }

  return batch;
};

// ==================== SPORTS ====================

export const getSportsCatalog = async (academy_id) => {
  const academyId = parseInt(academy_id, 10);

  const sports = await prisma.sport.findMany({
    where: { academy_id: academyId },
    orderBy: { name: 'asc' }
  });

  return sports;
};

export const getDurationPlans = async (academy_id) => {
  const academyId = parseInt(academy_id, 10);

  const plans = await prisma.durationPlan.findMany({
    where: {
      academy_id: academyId,
      status: 'ACTIVE'
    },
    orderBy: { duration_months: 'asc' }
  });

  return plans;
};

export const createDurationPlan = async (academy_id, data) => {
  const academyId = parseInt(academy_id, 10);

  const plan = await prisma.durationPlan.create({
    data: {
      name: data.name,
      duration_months: parseInt(data.duration_months, 10),
      multiplier: parseFloat(data.multiplier),
      status: 'ACTIVE',
      academy_id: academyId
    }
  });

  logger.info('Duration plan created', { plan_id: plan.plan_id, academy_id: academyId });
  return plan;
};

export const deleteDurationPlan = async (academy_id, plan_id) => {
  const academyId = parseInt(academy_id, 10);
  const planId = parseInt(plan_id, 10);

  const plan = await prisma.durationPlan.findFirst({
    where: {
      plan_id: planId,
      academy_id: academyId
    }
  });

  if (!plan) {
    const error = new Error('Duration plan not found');
    error.statusCode = 404;
    throw error;
  }

  await prisma.durationPlan.delete({
    where: { plan_id: planId }
  });

  logger.info('Duration plan deleted', { plan_id: planId, academy_id: academyId });
  return plan;
};

export const getStudentDetails = async (academy_id, student_id) => {
  const student = await getStudentForAcademy(academy_id, student_id);

  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  const [receipts, attendance, performanceScores, enrollments] = await Promise.all([
    prisma.receipt.findMany({
      where: {
        student_id: student.student_id,
        academy_id: parseInt(academy_id, 10)
      },
      orderBy: { payment_date: 'desc' }
    }),
    prisma.studentAttendance.findMany({
      where: {
        student_id: student.student_id,
        academy_id: parseInt(academy_id, 10)
      },
      include: { batch: true },
      orderBy: { date: 'desc' },
      take: 50
    }),
    prisma.performanceScore.findMany({
      where: {
        student_id: student.student_id,
        academy_id: parseInt(academy_id, 10)
      },
      include: {
        attribute: {
          include: { sport: true }
        },
        coach: true
      },
      orderBy: { scored_at: 'desc' },
      take: 50
    }),
    prisma.studentEnrollment.findMany({
      where: {
        student_id: student.student_id,
        academy_id: parseInt(academy_id, 10),
        is_active: true
      },
      include: {
        sport: true,
        duration_plan: true,
        batch: true
      }
    })
  ]);

  // Calculate total amount paid from completed receipts
  const amountPaid = receipts
    .filter(r => r.status === 'COMPLETED')
    .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

  return {
    student: {
      ...student,
      amount_paid: amountPaid
    },
    receipts,
    attendance,
    performance_scores: performanceScores,
    enrollments
  };
};

export const bulkUploadStudents = async (academy_id, students) => {
  const academyId = parseInt(academy_id, 10);
  
  const createdStudents = [];
  const errors = [];

  for (const studentData of students) {
    try {
      const student = await prisma.student.create({
        data: {
          academy_id: academyId,
          name: `${studentData.first_name} ${studentData.last_name || ''}`.trim(),
          first_name: studentData.first_name,
          last_name: studentData.last_name,
          phone: studentData.phone || null,
          age: studentData.age ? parseInt(studentData.age, 10) : null,
          gender: studentData.gender || 'Other',
          parent_name: studentData.parent_name || null,
          parent_email: studentData.parent_email || null,
          parent_phone: studentData.parent_phone || null,
          joining_date: new Date(),
          fees_status: 'unpaid',
          status: 'ACTIVE'
        }
      });

      createdStudents.push(student);

      await logAudit({
        academy_id: academyId,
        actor_type: 'ADMIN',
        action: 'STUDENT_BULK_CREATED',
        entity_type: 'Student',
        entity_id: student.student_id
      });
    } catch (error) {
      errors.push({
        data: studentData,
        error: error.message
      });
    }
  }

  logger.info('Bulk student upload completed', {
    academy_id: academyId,
    created: createdStudents.length,
    errors: errors.length
  });

  return {
    created: createdStudents,
    errors,
    total: students.length,
    success_count: createdStudents.length,
    error_count: errors.length
  };
};

export const createSport = async (academy_id, data) => {
  const academyId = parseInt(academy_id, 10);

  const existing = await prisma.sport.findFirst({
    where: {
      name: data.name,
      academy_id: academyId
    }
  });

  if (existing) {
    const error = new Error('Sport already exists in this academy');
    error.statusCode = 409;
    throw error;
  }

  // Support both camelCase and snake_case for base_fee
  const { name, base_fee, baseFee, status } = data;
  const parsedFee = parseFloat(base_fee !== undefined ? base_fee : (baseFee !== undefined ? baseFee : 0));

  const sport = await prisma.sport.create({
    data: {
      name: name,
      base_fee: parsedFee,
      status: status || 'ACTIVE',
      academy_id: academyId,
      is_custom: true
    }
  });

  logger.info('Sport created', { sport_id: sport.sport_id, academy_id: academyId });
  return sport;
};

// ==================== COACHES ====================

export const getAllCoaches = async (academy_id) =>
  prisma.coach.findMany({
    where: academyScope(academy_id),
    include: {
      // ✅ FIXED: Replaced batches with batch_assignments join structure lookup mapping
      batch_assignments: {
        include: { 
          batch: {
            include: { sport: true }
          }
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });

export const createCoach = async (academy_id, data) => {
  const academyId = parseInt(academy_id, 10);
  const email = data.email.trim();
  const temporaryPassword = generateTempPassword(8);
  const password_hash = await bcrypt.hash(temporaryPassword, BCRYPT_SALT_ROUNDS);

  const existingCoach = await prisma.coach.findFirst({
    where: {
      email,
      academy_id: academyId,
      ...NOT_DELETED
    }
  });

  if (existingCoach) {
    const error = new Error('Coach email already exists in this academy');
    error.statusCode = 409;
    throw error;
  }

  const deletedCoach = await prisma.coach.findFirst({
    where: {
      email,
      academy_id: academyId,
      is_deleted: true
    }
  });

  if (deletedCoach) {
    const error = new Error(
      'A coach with this email was previously removed. Restore or use a different email.'
    );
    error.statusCode = 409;
    throw error;
  }

  const coach = await prisma.coach.create({
    data: {
      academy_id: academyId,
      name: data.name,
      specialization: data.specialization,
      phone_number: data.phone_number,
      email,
      // ✅ FIXED: Explicitly maps hashed data to password_hash to populate MySQL DB columns accurately
      password_hash 
    }
  });

  let credentials_sent = false;

  try {
    await sendCoachOnboardingEmail({
      email,
      name: data.name,
      temporaryPassword
    });
    credentials_sent = true;
    logger.info('Coach provisioned with credentials email', {
      coach_id: coach.coach_id,
      academy_id: academyId,
      email
    });
  } catch (mailError) {
    logger.error('Coach created but onboarding email failed', {
      coach_id: coach.coach_id,
      academy_id: academyId,
      email,
      smtp_code: mailError.code,
      message: mailError.message
    });
    const error = new Error(
      'Coach account was created but the credentials email could not be sent. Check SMTP settings and try resending credentials.'
    );
    error.statusCode = 502;
    error.coach_id = coach.coach_id;
    throw error;
  }

  return {
    coach_id: coach.coach_id,
    name: coach.name,
    email: coach.email,
    specialization: coach.specialization,
    phone_number: coach.phone_number,
    credentials_sent
  };
};

export const updateCoach = async (academy_id, coach_id, data) => {
  const coach = await getCoachForAcademy(academy_id, coach_id);

  if (!coach) {
    const error = new Error('Coach not found');
    error.statusCode = 404;
    throw error;
  }

  return prisma.coach.update({
    where: { coach_id: coach.coach_id },
    data: {
      name: data.name ?? coach.name,
      specialization: data.specialization ?? coach.specialization,
      phone_number: data.phone_number ?? coach.phone_number,
      email: data.email ?? coach.email
    }
  });
};

export const deleteCoach = async (academy_id, coach_id) => {
  const coach = await getCoachForAcademy(academy_id, coach_id);

  if (!coach) {
    const error = new Error('Coach not found');
    error.statusCode = 404;
    throw error;
  }

  await prisma.coach.update({
    where: { coach_id: coach.coach_id },
    data: softDeletePayload()
  });

  logger.info('Coach soft-deleted', { coach_id, academy_id });
};

// ==================== STUDENTS ====================

export const getAllStudents = async (academy_id) =>
  prisma.student.findMany({
    where: academyScope(academy_id),
    include: {
      batch: true,
      sport: true,
      enrollments: {
        include: {
          sport: true,
          duration_plan: true,
          batch: true
        },
        where: { is_active: true }
      },
      receipts: {
        orderBy: { payment_date: 'desc' },
        take: 5
      }
    },
    orderBy: { created_at: 'desc' }
  });

export const createStudent = async (academy_id, data) => {
  const academyId = parseInt(academy_id, 10);
  
  // Handle multi-sport enrollment
  const sportIds = Array.isArray(data.sport_ids) ? data.sport_ids : (data.sport_id ? [data.sport_id] : []);
  const durationPlanId = data.duration_plan_id ? parseInt(data.duration_plan_id, 10) : null;
  
  // Get duration plan multiplier if provided
  let durationPlan = null;
  let planMultiplier = 1;
  if (durationPlanId) {
    durationPlan = await prisma.durationPlan.findFirst({
      where: {
        plan_id: durationPlanId,
        academy_id: academyId,
        status: 'ACTIVE'
      }
    });
    if (durationPlan) {
      planMultiplier = parseFloat(durationPlan.multiplier);
    }
  }

  // Calculate total sports fee
  let totalSportsFee = 0;
  const sportsWithFees = [];
  
  if (sportIds.length > 0) {
    const sports = await prisma.sport.findMany({
      where: {
        sport_id: { in: sportIds.map(id => parseInt(id, 10)) },
        status: 'ACTIVE'
      }
    });
    
    sports.forEach(sport => {
      const baseFee = parseFloat(sport.base_fee) || 0;
      totalSportsFee += baseFee;
      sportsWithFees.push({
        sport_id: sport.sport_id,
        base_fee: baseFee
      });
    });
  }

  // Calculate final fee
  const registrationFee = parseFloat(data.registration_fee) || 0;
  const additionalCharges = parseFloat(data.additional_charges) || 0;
  const discount = parseFloat(data.discount) || 0;
  
  const sportsFeeWithMultiplier = totalSportsFee * planMultiplier;
  const finalFee = sportsFeeWithMultiplier + registrationFee + additionalCharges - discount;

  // Calculate next due date based on duration plan
  let nextDueDate = null;
  if (durationPlan && durationPlan.duration_months) {
    const joiningDate = data.joining_date ? new Date(data.joining_date) : new Date();
    nextDueDate = new Date(joiningDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + durationPlan.duration_months);
  }

  // Create student record
  const student = await prisma.student.create({
    data: {
      academy_id: academyId,
      name: data.name,
      first_name: data.first_name || null,
      last_name: data.last_name || null,
      phone: data.phone || null,
      age: data.age,
      gender: data.gender,
      sport_id: sportIds.length > 0 ? parseInt(sportIds[0], 10) : null, // Primary sport for backward compatibility
      batch_id: data.batch_id ? parseInt(data.batch_id, 10) : null,
      blood_group: data.blood_group,
      parent_name: data.parent_name || null,
      parent_email: data.parent_email,
      parent_phone: data.parent_phone || null,
      joining_date: data.joining_date ? new Date(data.joining_date) : new Date(),
      fees_status: data.fees_status || 'unpaid',
      status: 'ACTIVE'
    },
    include: { batch: true, sport: true }
  });

  // Create enrollment records for each sport
  if (sportIds.length > 0) {
    const enrollmentData = sportIds.map((sportId, index) => {
      const sportWithFee = sportsWithFees.find(s => s.sport_id === parseInt(sportId, 10));
      const sportBaseFee = sportWithFee ? sportWithFee.base_fee : 0;
      
      return {
        academy_id: academyId,
        student_id: student.student_id,
        sport_id: parseInt(sportId, 10),
        duration_plan_id: durationPlanId,
        batch_id: index === 0 && data.batch_id ? parseInt(data.batch_id, 10) : null, // Only first sport gets batch
        registration_fee: index === 0 ? registrationFee : 0, // Registration fee only for primary enrollment
        sports_fee: sportBaseFee * planMultiplier,
        additional_charges: index === 0 ? additionalCharges : 0,
        discount: index === 0 ? discount : 0,
        final_fee: index === 0 ? finalFee : (sportBaseFee * planMultiplier),
        next_due_date: index === 0 ? nextDueDate : null,
        is_active: true
      };
    });

    await prisma.studentEnrollment.createMany({
      data: enrollmentData
    });
  }

  await logAudit({
    academy_id: academyId,
    actor_type: 'ADMIN',
    action: 'STUDENT_CREATED',
    entity_type: 'Student',
    entity_id: student.student_id
  });

  logger.info('Student created with enrollments', { student_id: student.student_id, academy_id: academyId, sport_count: sportIds.length });
  
  // Return student with enrollments
  return prisma.student.findUnique({
    where: { student_id: student.student_id },
    include: {
      batch: true,
      sport: true,
      enrollments: {
        include: {
          sport: true,
          duration_plan: true,
          batch: true
        },
        where: { is_active: true }
      }
    }
  });
};

export const updateStudent = async (academy_id, student_id, data) => {
  const student = await getStudentForAcademy(academy_id, student_id);

  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  const parsedAcademyId = parseInt(academy_id, 10);
  const parsedStudentId = parseInt(student_id, 10);

  // Handle multi-sport updates via sport_ids array
  const sportIds = data.sport_ids ? data.sport_ids.map(id => parseInt(id, 10)) : [];
  const durationPlanId = data.duration_plan_id ? parseInt(data.duration_plan_id, 10) : null;

  // Sync backward-compatible primary sport_id field using first element of sport_ids array
  const primarySportId = sportIds.length > 0 ? sportIds[0] : student.sport_id;
  const nextBatchId = data.batch_id !== undefined ? parseInt(data.batch_id, 10) : student.batch_id;

  if (primarySportId && nextBatchId) {
    await assertStudentSportBatch(parsedAcademyId, primarySportId, nextBatchId);
  }

  // Update core student details
  const updatedStudent = await prisma.student.update({
    where: { student_id: parsedStudentId },
    data: {
      name: data.name ?? student.name,
      age: data.age ?? student.age,
      gender: data.gender ?? student.gender,
      sport_id: primarySportId,
      batch_id: nextBatchId,
      blood_group: data.blood_group ?? student.blood_group,
      parent_name: data.parent_name ?? student.parent_name,
      parent_email: data.parent_email ?? student.parent_email,
      parent_phone: data.parent_phone ?? student.parent_phone,
      fees_status: data.fees_status ?? student.fees_status
    },
    include: { batch: true, sport: true, receipts: true }
  });

  // Manage active enrollment records if sport_ids or duration_plan_id provided
  if (sportIds.length > 0 || durationPlanId) {
    // Deactivate old enrollment assignments
    await prisma.studentEnrollment.updateMany({
      where: {
        academy_id: parsedAcademyId,
        student_id: parsedStudentId,
        is_active: true
      },
      data: {
        is_active: false
      }
    });

    // Create fresh StudentEnrollment rows for each selected sport
    if (sportIds.length > 0) {
      for (const sportId of sportIds) {
        // Calculate final_fee dynamically using duration_plan_id multiplier if provided
        let finalFee = 0;
        if (durationPlanId) {
          const durationPlan = await prisma.durationPlan.findUnique({
            where: { plan_id: durationPlanId },
            select: { multiplier: true }
          });
          if (durationPlan) {
            const sport = await prisma.sport.findUnique({
              where: { sport_id: sportId },
              select: { sports_fee: true }
            });
            if (sport) {
              finalFee = sport.sports_fee * durationPlan.multiplier;
            }
          }
        }

        await prisma.studentEnrollment.create({
          data: {
            academy_id: parsedAcademyId,
            student_id: parsedStudentId,
            sport_id: sportId,
            duration_plan_id: durationPlanId,
            registration_fee: 0,
            sports_fee: 0,
            additional_charges: 0,
            discount: 0,
            final_fee: finalFee,
            paid_amount: 0,
            is_active: true,
            coach_id: null,
            batch_id: nextBatchId
          }
        });
      }
    }
  }

  logger.info('Student updated successfully', {
    student_id: parsedStudentId,
    academy_id: parsedAcademyId,
    sport_ids: sportIds,
    duration_plan_id: durationPlanId
  });

  return updatedStudent;
};

export const exitStudent = async (academy_id, student_id, data, admin_user_id) => {
  const student = await getStudentForAcademy(academy_id, student_id);

  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  const updated = await prisma.student.update({
    where: { student_id: student.student_id },
    data: {
      status: 'INACTIVE',
      exit_reason: data.exit_reason,
      exit_note: data.exit_note || null,
      batch_id: null,
      ...softDeletePayload()
    }
  });

  if (student.parent_email) {
    try {
      await sendStudentExitEmail({
        parentEmail: student.parent_email,
        studentName: student.name,
        exitReason: data.exit_reason,
        exitNote: data.exit_note
      });
    } catch (mailErr) {
      logger.error('Student exit email failed', {
        student_id: student.student_id,
        message: mailErr.message
      });
    }
  }

  await logAudit({
    academy_id,
    actor_type: 'ADMIN',
    actor_id: admin_user_id,
    action: 'STUDENT_EXIT',
    entity_type: 'Student',
    entity_id: student.student_id,
    metadata: { exit_reason: data.exit_reason }
  });

  return updated;
};

export const deleteStudent = async (academy_id, student_id) => {
  const student = await getStudentForAcademy(academy_id, student_id);

  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  await prisma.student.update({
    where: { student_id: student.student_id },
    data: softDeletePayload()
  });

  logger.info('Student soft-deleted', { student_id, academy_id });
};

// ==================== BATCHES ====================

export const getAllBatches = async (academy_id) => {
  const batches = await prisma.batch.findMany({
    where: { academy_id: parseInt(academy_id, 10) },
    include: {
      coaches: { include: { coach: true } },
      sport: true,
      students: { where: { ...NOT_DELETED, status: 'ACTIVE' } }
    },
    orderBy: { batch_id: 'desc' }
  });

  return batches.map((batch) => {
    const basicCoachInfo = batch.coaches?.[0]?.coach;
    return {
      ...batch,
      coach: basicCoachInfo && basicCoachInfo.is_deleted ? null : basicCoachInfo,
      enrolled_count: batch.students.length,
      available_seats:
        batch.max_capacity != null
          ? Math.max(0, batch.max_capacity - batch.students.length)
          : null
    };
  });
};

export const getAvailableBatches = async (academy_id, sport_id) => {
  const sportId = parseInt(sport_id, 10);
  const batches = await getAllBatches(academy_id);

  return batches.filter(
    (batch) =>
      batch.status === 'ACTIVE' &&
      batch.sport_id === sportId &&
      (batch.max_capacity == null || batch.students.length < batch.max_capacity)
  );
};

export const createBatch = async (academy_id, data) => {
  const academyId = parseInt(academy_id, 10);

  const batch = await prisma.batch.create({
    data: {
      academy_id: academyId,
      name: data.name,
      sport_id: data.sport_id ? parseInt(data.sport_id, 10) : null,
      timing: data.timing,
      max_capacity: data.max_capacity ? parseInt(data.max_capacity, 10) : null,
      status: data.status || 'ACTIVE'
    },
    include: { sport: true }
  });

  if (data.coach_id) {
    const coach = await getCoachForAcademy(academyId, data.coach_id);
    if (!coach) {
      const error = new Error('Coach not found in academy workspace');
      error.statusCode = 404;
      throw error;
    }

    await prisma.batchCoach.create({
      data: {
        batch_id: batch.batch_id,
        coach_id: coach.coach_id
      }
    });
  }

  logger.info('Batch created', { batch_id: batch.batch_id, academy_id: academyId });
  return getBatchForAcademy(academy_id, batch.batch_id);
};

export const updateBatch = async (academy_id, batch_id, data) => {
  const batch = await getBatchForAcademy(academy_id, batch_id);

  if (!batch) {
    const error = new Error('Batch not found');
    error.statusCode = 404;
    throw error;
  }

  await prisma.batch.update({
    where: { batch_id: batch.batch_id },
    data: {
      name: data.name ?? batch.name,
      sport_id: data.sport_id !== undefined ? parseInt(data.sport_id, 10) : batch.sport_id,
      timing: data.timing ?? batch.timing,
      max_capacity:
        data.max_capacity !== undefined
          ? parseInt(data.max_capacity, 10)
          : batch.max_capacity,
      status: data.status ?? batch.status
    }
  });

  if (data.coach_id !== undefined) {
    await prisma.batchCoach.deleteMany({ where: { batch_id: batch.batch_id } });
    if (data.coach_id) {
      await prisma.batchCoach.create({
        data: {
          batch_id: batch.batch_id,
          coach_id: parseInt(data.coach_id, 10)
        }
      });
    }
  }

  return getBatchForAcademy(academy_id, batch.batch_id);
};

export const deleteBatch = async (academy_id, batch_id) => {
  const batch = await getBatchForAcademy(academy_id, batch_id);

  if (!batch) {
    const error = new Error('Batch not found');
    error.statusCode = 404;
    throw error;
  }

  const enrolled = await prisma.student.count({
    where: { batch_id: batch.batch_id, ...NOT_DELETED, status: 'ACTIVE' }
  });

  if (enrolled > 0) {
    const error = new Error('Cannot delete batch with enrolled students. Reassign students first.');
    error.statusCode = 400;
    throw error;
  }

  await prisma.batch.update({
    where: { batch_id: batch.batch_id },
    data: { status: 'INACTIVE' }
  });

  logger.info('Batch deactivated', { batch_id, academy_id });
};

// ==================== COACH ATTENDANCE ====================

export const markCoachAttendance = async (academy_id, marked_by_admin_id, data) => {
  const coach = await getCoachForAcademy(academy_id, data.coach_id);

  if (!coach) {
    const error = new Error('Coach not found');
    error.statusCode = 404;
    throw error;
  }

  return prisma.coachAttendance.create({
    data: {
      academy_id: parseInt(academy_id, 10),
      coach_id: coach.coach_id,
      date: new Date(data.date),
      status: data.status,
      marked_by_admin_id,
      remarks: data.remarks || null
    }
  });
};

export const getCoachAttendance = async (academy_id, coach_id) => {
  const coach = await getCoachForAcademy(academy_id, coach_id);

  if (!coach) {
    const error = new Error('Coach not found');
    error.statusCode = 404;
    throw error;
  }

  return prisma.coachAttendance.findMany({
    where: {
      coach_id: coach.coach_id,
      academy_id: parseInt(academy_id, 10)
    },
    orderBy: { date: 'desc' }
  });
};

// ==================== PAYMENTS (RECEIPTS) ====================

export const getAllPayments = async (academy_id) =>
  prisma.receipt.findMany({
    where: {
      academy_id: parseInt(academy_id, 10),
      student: NOT_DELETED
    },
    include: { student: true },
    orderBy: { payment_date: 'desc' }
  });

export const getStudentLedger = async (academy_id, student_id) => {
  const academyId = parseInt(academy_id, 10);
  const studentId = parseInt(student_id, 10);

  const student = await getStudentForAcademy(academyId, studentId);
  if (!student) {
    const error = new Error('Student not found in this academy');
    error.statusCode = 404;
    throw error;
  }

  const receipts = await prisma.receipt.findMany({
    where: {
      academy_id: academyId,
      student_id: studentId,
      status: 'COMPLETED'
    }
  });

  const totalPaid = receipts.reduce((sum, r) => sum + Number(r.amount), 0);

  // Calculate total fee due based on enrollments
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      student_id: studentId,
      academy_id: academyId,
      student: { deleted_at: null }
    },
    include: {
      batch: {
        include: {
          sport: true
        }
      }
    }
  });

  const totalFeeDue = enrollments.reduce((sum, e) => {
    const baseFee = Number(e.batch?.sport?.base_fee || 0);
    const durationMultiplier = e.duration_months || 1;
    return sum + (baseFee * durationMultiplier);
  }, 0);

  return {
    student_id: studentId,
    student_name: student.name,
    total_fee_due: totalFeeDue,
    total_paid: totalPaid,
    balance_outstanding: totalFeeDue - totalPaid,
    receipt_count: receipts.length
  };
};

export const getReceipts = async (academy_id) => {
  const academyId = parseInt(academy_id, 10);

  const receipts = await prisma.receipt.findMany({
    where: {
      academy_id: academyId,
      student: NOT_DELETED
    },
    include: {
      student: true
    },
    orderBy: { payment_date: 'desc' }
  });

  return receipts;
};

export const createReceipt = async (academy_id, data) => {
  const academyId = parseInt(academy_id, 10);

  const student = await getStudentForAcademy(academyId, data.student_id);
  if (!student) {
    const error = new Error('Student not found in this academy');
    error.statusCode = 404;
    throw error;
  }

  const year = new Date().getFullYear();
  const count = await prisma.receipt.count({
    where: {
      academy_id: academyId,
      receipt_number: {
        startsWith: `REC-${year}`
      }
    }
  });

  const receiptNumber = `REC-${year}-${String(count + 1).padStart(3, '0')}`;

  const receipt = await prisma.receipt.create({
    data: {
      receipt_number: receiptNumber,
      academy_id: academyId,
      student_id: student.student_id,
      amount: parseFloat(data.amount_paid),
      discount: parseFloat(data.discount || 0),
      additional_charges: parseFloat(data.additional_charges || 0),
      payment_date: new Date(data.payment_date),
      method: data.payment_method,
      status: 'COMPLETED'
    },
    include: {
      student: true
    }
  });

  // Update the student's active enrollment's paid_amount to maintain financial link
  const activeEnrollment = await prisma.studentEnrollment.findFirst({
    where: {
      student_id: student.student_id,
      academy_id: academyId,
      is_active: true
    }
  });

  if (activeEnrollment) {
    const currentPaidAmount = parseFloat(activeEnrollment.paid_amount || 0);
    const newPaidAmount = currentPaidAmount + parseFloat(data.amount_paid);

    await prisma.studentEnrollment.update({
      where: { enrollment_id: activeEnrollment.enrollment_id },
      data: { paid_amount: newPaidAmount }
    });
  }

  await logAudit({
    academy_id: academyId,
    actor_type: 'ADMIN',
    action: 'RECEIPT_CREATED',
    entity_type: 'Receipt',
    entity_id: receipt.receipt_id
  });

  return receipt;
};

export const getPendingDues = async (academy_id) => {
  const academyId = parseInt(academy_id, 10);

  const students = await prisma.student.findMany({
    where: {
      academy_id: academyId,
      deleted_at: null
    },
    include: {
      enrollments: {
        include: {
          batch: {
            include: {
              sport: true
            }
          }
        }
      }
    }
  });

  const pendingDues = [];

  for (const student of students) {
    const receipts = await prisma.receipt.findMany({
      where: {
        student_id: student.student_id,
        academy_id: academyId,
        status: 'COMPLETED'
      }
    });

    const totalPaid = receipts.reduce((sum, r) => sum + Number(r.amount), 0);

    const totalFeeDue = student.enrollments.reduce((sum, e) => {
      const baseFee = Number(e.batch?.sport?.base_fee || 0);
      const durationMultiplier = e.duration_months || 1;
      return sum + (baseFee * durationMultiplier);
    }, 0);

    const balanceOutstanding = totalFeeDue - totalPaid;

    if (balanceOutstanding > 0) {
      const latestEnrollment = student.enrollments[0];
      const joiningDate = latestEnrollment?.joining_date || student.created_at;
      const durationMonths = latestEnrollment?.duration_months || 1;
      const nextDueDate = new Date(joiningDate);
      nextDueDate.setMonth(nextDueDate.getMonth() + durationMonths);

      pendingDues.push({
        student_id: student.student_id,
        student_name: student.name,
        total_fee_due: totalFeeDue,
        total_paid: totalPaid,
        balance_outstanding: balanceOutstanding,
        next_due_date: nextDueDate,
        sport: latestEnrollment?.batch?.sport?.name || '—'
      });
    }
  }

  return pendingDues.sort((a, b) => b.balance_outstanding - a.balance_outstanding);
};

export const getRevenueSummary = async (academy_id) => {
  const academyId = parseInt(academy_id, 10);

  const receipts = await prisma.receipt.findMany({
    where: {
      academy_id: academyId,
      status: 'COMPLETED'
    }
  });

  const totalRevenue = receipts.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalDiscounts = receipts.reduce((sum, r) => sum + Number(r.discount || 0), 0);
  const totalAdditionalCharges = receipts.reduce((sum, r) => sum + Number(r.additional_charges || 0), 0);

  const currentYear = new Date().getFullYear();
  const currentYearReceipts = receipts.filter(r => new Date(r.payment_date).getFullYear() === currentYear);
  const currentYearRevenue = currentYearReceipts.reduce((sum, r) => sum + Number(r.amount), 0);

  const currentMonth = new Date().getMonth();
  const currentYearMonthReceipts = receipts.filter(r => {
    const date = new Date(r.payment_date);
    return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
  });
  const currentMonthRevenue = currentYearMonthReceipts.reduce((sum, r) => sum + Number(r.amount), 0);

  // Revenue by payment method
  const revenueByMethod = receipts.reduce((acc, r) => {
    const method = r.method || 'other';
    acc[method] = (acc[method] || 0) + Number(r.amount);
    return acc;
  }, {});

  return {
    total_revenue: totalRevenue,
    total_discounts: totalDiscounts,
    total_additional_charges: totalAdditionalCharges,
    current_year_revenue: currentYearRevenue,
    current_month_revenue: currentMonthRevenue,
    total_receipts: receipts.length,
    revenue_by_method: revenueByMethod
  };
};

export const createPayment = async (academy_id, data) => {
  const student = await getStudentForAcademy(academy_id, data.student_id);

  if (!student) {
    const error = new Error('Student not found in this academy workspace');
    error.statusCode = 404;
    throw error;
  }

  const generatedReceiptNo = `REC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const receipt = await prisma.receipt.create({
    data: {
      receipt_number: generatedReceiptNo,
      academy_id: parseInt(academy_id, 10),
      student_id: student.student_id,
      amount: data.amount,
      payment_date: new Date(data.payment_date),
      method: data.method || 'cash',
      status: data.status === 'completed' ? 'COMPLETED' : 'PENDING'
    }
  });

  if (data.status === 'completed') {
    await prisma.student.update({
      where: { student_id: student.student_id },
      data: { fees_status: 'paid' }
    });
  }

  await logAudit({
    academy_id,
    actor_type: 'ADMIN',
    action: 'PAYMENT_CREATED',
    entity_type: 'Receipt',
    entity_id: receipt.receipt_id
  });

  return receipt;
};

export const updatePaymentStatus = async (
  academy_id,
  payment_id,
  { status, rejected_reason },
  admin_user_id
) => {
  const payment = await getPaymentForAcademy(academy_id, payment_id);

  if (!payment) {
    const error = new Error('Payment record not found in this workspace');
    error.statusCode = 404;
    throw error;
  }

  const targetStatus = String(status).toUpperCase();

  const updatedReceipt = await prisma.receipt.update({
    where: { receipt_id: payment.receipt_id },
    data: {
      status: targetStatus === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
      approved_by_user_id: targetStatus === 'COMPLETED' ? admin_user_id : payment.approved_by_user_id,
      rejected_reason: targetStatus === 'REJECTED' || targetStatus === 'FAILED' ? rejected_reason || null : null
    }
  });

  if (targetStatus === 'COMPLETED') {
    await prisma.student.update({
      where: { student_id: payment.student_id },
      data: { fees_status: 'paid' }
    });
  } else {
    await prisma.student.update({
      where: { student_id: payment.student_id },
      data: { fees_status: 'unpaid' }
    });
  }

  await logAudit({
    academy_id,
    actor_type: 'ADMIN',
    actor_id: admin_user_id,
    action: 'PAYMENT_STATUS_UPDATED',
    entity_type: 'Receipt',
    entity_id: payment.receipt_id,
    metadata: { status: targetStatus }
  });

  return updatedReceipt;
};

// ==================== ANALYTICS ====================

export const getAcademyReport = async (academy_id) => {
  const academyId = parseInt(academy_id, 10);
  const activeStudentFilter = { academy_id: academyId, ...NOT_DELETED };
  const activeCoachFilter = { academy_id: academyId, ...NOT_DELETED };

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    activeCoaches,
    activeStudents,
    totalBatches,
    revenueAggregate,
    paidStudents,
    unpaidStudents,
    attendanceAgg
  ] = await Promise.all([
    prisma.coach.count({ where: activeCoachFilter }),
    prisma.student.count({ where: { ...activeStudentFilter, status: 'ACTIVE' } }),
    prisma.batch.count({ where: { academy_id: academyId, status: 'ACTIVE' } }),
    prisma.receipt.aggregate({
      where: {
        academy_id: academyId,
        status: 'COMPLETED',
        student: NOT_DELETED
      },
      _sum: { amount: true }
    }),
    prisma.student.count({
      where: { ...activeStudentFilter, fees_status: 'paid' }
    }),
    prisma.student.count({
      where: {
        ...activeStudentFilter,
        fees_status: { in: ['unpaid', 'pending', 'partial'] }
      }
    }),
    prisma.studentAttendance.groupBy({
      by: ['status'],
      where: {
        academy_id: academyId,
        date: { gte: thirtyDaysAgo }
      },
      _count: { status: true }
    })
  ]);

  const attendanceCounts = attendanceAgg.reduce(
    (acc, row) => {
      acc[row.status] = row._count.status;
      acc.total += row._count.status;
      return acc;
    },
    { total: 0 }
  );

  const presentCount =
    (attendanceCounts.PRESENT || 0) + (attendanceCounts.LATE || 0);
  const attendancePercent =
    attendanceCounts.total > 0
      ? Math.round((presentCount / attendanceCounts.total) * 100)
      : 0;

  return {
    active_coach_count: activeCoaches,
    active_student_count: activeStudents,
    total_batches: totalBatches,
    total_revenue: revenueAggregate._sum.amount || 0,
    attendance_percent: attendancePercent,
    payment_summary: {
      paid_students: paidStudents,
      unpaid_students: unpaidStudents
    }
  };
};

export const getEnquiries = async (academyId) => {
  const enquiries = await prisma.enquiry.findMany({
    where: {
      academy_id: parseInt(academyId)
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  // Map enquiry_id to id for frontend compatibility
  return enquiries.map(enq => ({
    ...enq,
    id: enq.enquiry_id
  }));
};

export const updateEnquiry = async (academyId, enquiryId, data) => {
  const { status, remarks } = data;

  const enquiry = await prisma.enquiry.findFirst({
    where: {
      enquiry_id: parseInt(enquiryId),
      academy_id: parseInt(academyId)
    }
  });

  if (!enquiry) {
    const error = new Error('Enquiry not found');
    error.statusCode = 404;
    throw error;
  }

  const updateData = {};
  if (status) {
    updateData.status = status;
  }
  if (remarks !== undefined) {
    updateData.remarks = remarks;
  }

  const updated = await prisma.enquiry.update({
    where: { enquiry_id: parseInt(enquiryId) },
    data: updateData
  });

  logger.info('Enquiry updated', {
    enquiry_id: enquiryId,
    academy_id: academyId,
    status: updated.status
  });

  // Return with id field for frontend compatibility
  return {
    ...updated,
    id: updated.enquiry_id
  };
};

// ==================== PERFORMANCE TRACKER ====================

/**
 * Enhanced Query-Aware Performance Fetch Handler
 * Resolves both the Pending Approval Queue and the Approved Sport Attributes list seamlessly.
 */
export const getPerformanceApprovalQueue = async (academyId, queryParams = {}) => {
  const parsedAcademyId = parseInt(academyId, 10);
  const parsedSportId = queryParams.sport_id ? parseInt(queryParams.sport_id, 10) : undefined;
  
  // Natively align incoming query string filter values with your Prisma Enum parameters
  const statusFilter = queryParams.status || 'PENDING'; 

  const whereClause = {
    academy_id: parsedAcademyId,
    status: statusFilter
  };

  // Dynamically inject sport_id scoping if passed by the frontend component
  if (parsedSportId && !isNaN(parsedSportId)) {
    whereClause.sport_id = parsedSportId;
  }

  const queue = await prisma.performanceAttribute.findMany({
    where: whereClause,
    include: {
      sport: {
        select: { name: true }
      },
      requested_by: {
        select: { name: true, specialization: true }
      }
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  // Map attribute_id to id for seamless frontend dataset parsing compatibility
  return queue.map(attr => ({
    ...attr,
    id: attr.attribute_id
  }));
};

export const createPerformanceAttribute = async (academy_id, body) => {
  const { sport_id, name } = body;
  const academyId = parseInt(academy_id, 10);

  const attribute = await prisma.performanceAttribute.create({
    data: {
      academy_id: academyId,
      sport_id: parseInt(sport_id, 10),
      name: name.trim(),
      status: 'APPROVED',
      reviewed_at: new Date()
    }
  });

  logger.info('Performance attribute created successfully', { attribute_id: attribute.attribute_id, academy_id: academyId });
  return attribute;
};

export const approvePerformanceAttribute = async (academyId, attributeId, data) => {
  const { action } = data;

  if (!action || !['APPROVED', 'REJECTED'].includes(action)) {
    const error = new Error('Invalid action condition status transition parameters');
    error.statusCode = 400;
    throw error;
  }

  const attribute = await prisma.performanceAttribute.findFirst({
    where: {
      attribute_id: parseInt(attributeId, 10),
      academy_id: parseInt(academyId, 10)
    }
  });

  if (!attribute) {
    const error = new Error('Performance attribute node could not be located');
    error.statusCode = 404;
    throw error;
  }

  const updated = await prisma.performanceAttribute.update({
    where: { attribute_id: parseInt(attributeId, 10) },
    data: {
      status: action,
      reviewed_at: new Date()
    }
  });

  logger.info('Performance attribute checked and modified cleanly', {
    attribute_id: attributeId,
    academy_id: academyId,
    action: action
  });

  return {
    ...updated,
    id: updated.attribute_id
  };
};