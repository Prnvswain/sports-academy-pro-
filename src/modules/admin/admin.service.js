import prisma from '../../config/prisma.js';

import bcrypt from 'bcryptjs';

import jwt from 'jsonwebtoken';

import { BCRYPT_SALT_ROUNDS, JWT_SECRET } from '../../config/app.config.js';

import { NOT_DELETED, softDeletePayload } from '../../utils/softDelete.util.js';

import { generateTempPassword } from '../../utils/password.util.js';

import {

  sendCoachOnboardingEmail,

  sendStudentExitEmail,

  sendPaymentSuccessEmail,

  sendPaymentFailureEmail,

  sendParentCredentialsEmail,

  sendParentChildLinkedEmail,

} from '../../services/mail.service.js';

import { logAudit } from '../../utils/audit.util.js';

import logger from '../../utils/logger.js';

import { calculateAgeAndCategory } from '../../utils/age.util.js';

import * as parentService from '../parent/parent.service.js';

import { uploadToImageKit, deleteFromImageKit, validateImageFile } from '../../utils/imagekit.util.js';

import { calculateStudentFee } from '../../utils/fee.util.js';



const normalizeGender = (gender) => {

  if (!gender) return 'Other';

  const normalized = gender.toString().toLowerCase().trim();

  if (['male', 'm'].includes(normalized)) return 'Male';

  if (['female', 'f'].includes(normalized)) return 'Female';

  return 'Other';

};



const academyScope = (academy_id) => ({

  academy_id: parseInt(academy_id, 10),

  ...NOT_DELETED,

});



export const getAcademyDetails = async (academy_id) => {

  const academy = await prisma.academy.findUnique({

    where: { academy_id: parseInt(academy_id, 10) },

    select: {

      academy_id: true,

      name: true,

      owner_name: true,

      email: true,

      phone_number: true,

      address: true,

      city: true,

      state: true,

      country: true,

      pincode: true,

      latitude: true,

      longitude: true,

      logo_url: true,

      logo_file_id: true,

      subscription_tier: true,

      subscription_plan: true,

      status: true

    }

  });



  if (!academy) {

    const error = new Error('Academy not found');

    error.statusCode = 404;

    throw error;

  }



  return academy;

};



export const updateAcademyDetails = async (academy_id, { name, owner_name, email, phone_number, address, city, state, country, pincode, logo, latitude, longitude, attendance_radius_meters, auto_deactivate_default }) => {

  const academyId = parseInt(academy_id, 10);



  // Check if academy exists

  const existingAcademy = await prisma.academy.findUnique({

    where: { academy_id: academyId }

  });



  if (!existingAcademy) {

    const error = new Error('Academy not found');

    error.statusCode = 404;

    throw error;

  }



  // Handle logo upload if provided

  let logo_url = existingAcademy.logo_url;

  let logo_file_id = existingAcademy.logo_file_id;



  if (logo) {

    // Validate logo file

    const validation = validateImageFile(logo);

    if (!validation.isValid) {

      throw new Error(validation.error);

    }



    // Delete old logo from ImageKit if exists

    if (existingAcademy.logo_file_id) {

      try {

        await deleteFromImageKit(existingAcademy.logo_file_id);

      } catch (error) {

        logger.warn('Failed to delete old logo from ImageKit', { error: error.message });

      }

    }



    // Upload new logo to ImageKit

    const buffer = logo.buffer;

    const uploadResult = await uploadToImageKit(

      buffer,

      logo.originalname || logo.name,

      'academy-logos'

    );



    logo_url = uploadResult.url;

    logo_file_id = uploadResult.fileId;

  }



  // Validate attendance radius

  let radius = existingAcademy.attendance_radius_meters;

  if (attendance_radius_meters !== undefined) {

    const radiusNum = parseInt(attendance_radius_meters, 10);

    if (radiusNum < 100 || radiusNum > 5000) {

      const error = new Error('Attendance radius must be between 100 and 5000 meters');

      error.statusCode = 400;

      throw error;

    }

    radius = radiusNum;

  }



  // Update academy details

  const updatedAcademy = await prisma.academy.update({

    where: { academy_id: academyId },

    data: {

      name: name !== undefined ? name : existingAcademy.name,

      owner_name: owner_name !== undefined ? owner_name : existingAcademy.owner_name,

      email: email !== undefined ? email : existingAcademy.email,

      phone_number: phone_number !== undefined ? phone_number : existingAcademy.phone_number,

      address: address !== undefined ? address : existingAcademy.address,

      city: city !== undefined ? city : existingAcademy.city,

      state: state !== undefined ? state : existingAcademy.state,

      country: country !== undefined ? country : existingAcademy.country,

      pincode: pincode !== undefined ? pincode : existingAcademy.pincode,

      logo_url,

      logo_file_id,

      latitude: latitude === undefined ? existingAcademy.latitude : (latitude === null ? null : parseFloat(latitude)),

      longitude: longitude === undefined ? existingAcademy.longitude : (longitude === null ? null : parseFloat(longitude)),

      attendance_radius_meters: radius,

      auto_deactivate_default: auto_deactivate_default !== undefined 
        ? (auto_deactivate_default === true || auto_deactivate_default === 'true') 
        : existingAcademy.auto_deactivate_default
    }

  });



  logger.info('Academy details updated', { academy_id: academyId });



  return updatedAcademy;

};



const getCoachForAcademy = async (academy_id, coach_id) =>

  prisma.coach.findFirst({

    where: {

      coach_id: parseInt(coach_id, 10),

      ...academyScope(academy_id),

    },

  });



const getStudentForAcademy = async (academy_id, student_id) => {

  try {

    const student = await prisma.student.findFirst({

      where: {

        student_id: parseInt(student_id, 10),

        ...academyScope(academy_id),

      },

    });

    return student;

  } catch (error) {

    logger.error('Failed to get student for academy', { academy_id, student_id, error });

    throw error;

  }

};



const getBatchForAcademy = async (academy_id, batch_id) =>

  prisma.batch.findFirst({

    where: {

      batch_id: parseInt(batch_id, 10),

      academy_id: parseInt(academy_id, 10),

    },

    include: {

      coaches: { include: { coach: true } },

      sport: true,

    },

  });



const getPaymentForAcademy = async (academy_id, receipt_id) =>

  prisma.receipt.findFirst({

    where: {

      receipt_id: parseInt(receipt_id, 10),

      academy_id: parseInt(academy_id, 10),

      student: NOT_DELETED,

    },

    include: { student: true },

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

      where: { batch_id: batchId, ...NOT_DELETED, status: 'ACTIVE' },

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



  // Fetch academy's local sports

  const academySports = await prisma.sport.findMany({

    where: { academy_id: academyId },

    include: { globalSport: true },

    orderBy: { name: 'asc' },

  });



  // Fetch global sports

  const globalSports = await prisma.globalSport.findMany({

    orderBy: { name: 'asc' }

  });



  const combinedSports = academySports.map(sport => ({

    ...sport,

    icon: sport.icon || sport.globalSport?.icon || '🏅',

    attributes: sport.globalSport?.attributes ? JSON.parse(sport.globalSport.attributes) : [],

    isAcademySport: true

  }));



  const academySportNames = new Set(academySports.map(s => s.name));

  const missingGlobalSports = globalSports

    .filter(global => !academySportNames.has(global.name))

    .map(global => ({

      id: global.id,

      sport_id: null,

      name: global.name,

      icon: global.icon || '🏅',

      base_fee: 0,

      status: 'NOT_ADDED',

      academy_id: academyId,

      isAcademySport: false,

      attributes: global.attributes ? JSON.parse(global.attributes) : []

    }));



  return [...combinedSports, ...missingGlobalSports];

};



export const getGlobalSports = async () => {

  try {

    const sports = await prisma.globalSport.findMany({

      orderBy: { name: 'asc' }

    });

    

    return sports.map(sport => ({

      id: sport.id,

      name: sport.name,

      icon: sport.icon,

      attributes: sport.attributes ? JSON.parse(sport.attributes) : []

    }));

  } catch (error) {

    return [];

  }

};



export const getDurationPlans = async (academy_id) => {

  const academyId = parseInt(academy_id, 10);



  const plans = await prisma.durationPlan.findMany({

    where: {

      academy_id: academyId,

      status: 'ACTIVE',

    },

    orderBy: { duration: 'asc' },

    include: {

      _count: {
        select: {
          enrollments: {
            where: {
              is_active: true,
            },
          },
        },
      },
    },

  });



  return plans.map(p => ({
    ...p,
    duration_months: p.duration_type === 'DAYS' ? Math.round(p.duration / 30) : p.duration
  }));

};



export const createDurationPlan = async (academy_id, data) => {

  const academyId = parseInt(academy_id, 10);



  const plan = await prisma.durationPlan.create({

    data: {

      name: data.name,

      duration_type: data.duration_type || 'MONTHS',

      duration: parseInt(data.duration, 10),

      multiplier: parseFloat(data.multiplier),

      status: 'ACTIVE',

      academy_id: academyId,

    },

  });



  logger.info('Duration plan created', { plan_id: plan.plan_id, academy_id: academyId });

  return {
    ...plan,
    duration_months: plan.duration_type === 'DAYS' ? Math.round(plan.duration / 30) : plan.duration
  };

};



export const deleteDurationPlan = async (academy_id, plan_id) => {

  const academyId = parseInt(academy_id, 10);

  const planId = parseInt(plan_id, 10);



  const plan = await prisma.durationPlan.findFirst({

    where: {

      plan_id: planId,

      academy_id: academyId,

    },

  });



  if (!plan) {

    const error = new Error('Duration plan not found');

    error.statusCode = 404;

    throw error;

  }



  await prisma.durationPlan.delete({

    where: { plan_id: planId },

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



  const [receipts, attendance, performanceScores, enrollments, dailyNotes, sportsKits] = await Promise.all([

    prisma.receipt.findMany({

      where: {

        student_id: student.student_id,

        academy_id: parseInt(academy_id, 10),

      },

      orderBy: { payment_date: 'desc' },

    }),

    prisma.studentAttendance.findMany({

      where: {

        student_id: student.student_id,

        academy_id: parseInt(academy_id, 10),

      },

      include: { batch: true },

      orderBy: { date: 'desc' },

      take: 50,

    }),

    prisma.performanceScore.findMany({

      where: {

        student_id: student.student_id,

        academy_id: parseInt(academy_id, 10),

      },

      include: {

        attribute: {

          include: { sport: true },

        },

        coach: true,

      },

      orderBy: { scored_at: 'desc' },

      take: 50,

    }),

    prisma.studentEnrollment.findMany({

      where: {

        student_id: student.student_id,

        academy_id: parseInt(academy_id, 10),

      },

      include: {

        sport: true,

        duration_plan: true,

        batch: {
          include: {
            coaches: {
              include: {
                coach: true
              }
            }
          }
        },
        coach: true,

      },

    }),

    prisma.dailyStudentNote

      .findMany({

        where: {

          student_id: student.student_id,

          academy_id: parseInt(academy_id, 10),

        },

        include: { coach: { select: { name: true } } },

        orderBy: { note_date: 'desc' },

        take: 50,

      })

      .catch((error) => {
        console.error(
          'Warning: Could not fetch student notes, falling back to empty array:',
          error.message,
        );
        return [];
      }),
    prisma.sportsKitAssignment.findMany({
      where: {
        student_id: student.student_id,
        academy_id: parseInt(academy_id, 10),
      },
      include: {
        kit: {
          include: {
            sport: true
          }
        }
      },
      orderBy: { issue_date: 'desc' }
    }).catch((error) => {
      console.error('Warning: Could not fetch sports kits assignments:', error.message);
      return [];
    })
  ]);



  // Calculate total amount paid and assigned fee from completed receipts/fees in this active cycle
  const activeEnrollment = enrollments.find(e => e.is_active) || null;
  let amountPaid = 0;
  let totalFeesAssigned = 0;
  
  if (activeEnrollment) {
    const cycleStart = new Date(activeEnrollment.created_at.getTime() - 5000);
    amountPaid = receipts
      .filter((r) => r.status === 'COMPLETED' && new Date(r.payment_date) >= cycleStart)
      .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

    const cycleFees = await prisma.fee.findMany({
      where: {
        student_id: student.student_id,
        academy_id: parseInt(academy_id, 10),
        created_at: { gte: cycleStart }
      }
    });
    totalFeesAssigned = cycleFees.reduce((sum, f) => sum + parseFloat(f.amount_due || 0), 0);
  }

  return {

    student: {

      ...student,

      amount_paid: amountPaid,
      total_fees_assigned: totalFeesAssigned,
      pending_fees: Math.max(0, totalFeesAssigned - amountPaid),
      balance_outstanding: Math.max(0, totalFeesAssigned - amountPaid)

    },

    receipts,

    attendance,

    performance_scores: performanceScores,

    enrollments,

    daily_notes: dailyNotes,

    sports_kits: sportsKits || [],

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

          gender: normalizeGender(studentData.gender),

          parent_name: studentData.parent_name || null,

          parent_email: studentData.parent_email || null,

          parent_phone: studentData.parent_phone || null,

          joining_date: new Date(),

          fees_status: 'unpaid',

          status: 'ACTIVE',

        },

      });



      createdStudents.push(student);



      await logAudit({

        academy_id: academyId,

        actor_type: 'ADMIN',

        action: 'STUDENT_BULK_CREATED',

        entity_type: 'Student',

        entity_id: student.student_id,

      });

    } catch (error) {

      errors.push({

        data: studentData,

        error: error.message,

      });

    }

  }



  logger.info('Bulk student upload completed', {

    academy_id: academyId,

    created: createdStudents.length,

    errors: errors.length,

  });



  return {

    created: createdStudents,

    errors,

    total: students.length,

    success_count: createdStudents.length,

    error_count: errors.length,

  };

};



export const bulkStudentAction = async (academy_id, data) => {

  const academyId = parseInt(academy_id, 10);

  const { action, student_ids } = data;



  const studentIds = student_ids.map((id) => parseInt(id, 10));



  // Verify all students belong to the academy

  const students = await prisma.student.findMany({

    where: {

      student_id: { in: studentIds },

      academy_id: academyId,

    },

  });



  if (students.length !== studentIds.length) {

    const error = new Error('Some students not found in this academy');

    error.statusCode = 404;

    throw error;

  }



  let result;

  switch (action) {

    case 'activate':

      result = await prisma.student.updateMany({

        where: { student_id: { in: studentIds } },

        data: { status: 'ACTIVE' },

      });

      logger.info('Students activated', { student_ids: studentIds, academy_id: academyId });

      break;

    case 'deactivate':

      result = await prisma.student.updateMany({

        where: { student_id: { in: studentIds } },

        data: { status: 'INACTIVE' },

      });

      logger.info('Students deactivated', { student_ids: studentIds, academy_id: academyId });

      break;

    case 'delete':

      result = await prisma.student.deleteMany({

        where: { student_id: { in: studentIds } },

      });

      logger.info('Students deleted', { student_ids: studentIds, academy_id: academyId });

      break;

    default:

      const error = new Error('Invalid action');

      error.statusCode = 400;

      throw error;

  }



  return { count: result.count, action };

};



export const createSport = async (academy_id, data) => {

  const academyId = parseInt(academy_id, 10);



  const existing = await prisma.sport.findFirst({

    where: {

      name: data.name,

      academy_id: academyId,

    },

  });



  if (existing) {

    const error = new Error('Sport already exists in this academy');

    error.statusCode = 409;

    throw error;

  }



  // Support both camelCase and snake_case for base_fee

  const {

    name,

    base_fee,

    baseFee,

    status,

    latitude,

    longitude,

    use_custom_location,

    sport_center,

    icon,

    require_gps,

  } = data;

  const parsedFee = parseFloat(

    base_fee !== undefined ? base_fee : baseFee !== undefined ? baseFee : 0,

  );



  // Find matching global sport by name

  const globalSport = await prisma.globalSport.findFirst({

    where: { name: name }

  });



  const defaultAttributes = [

    "Stamina",

    "Agility",

    "Speed",

    "Teamwork",

    "Technical Skill",

    "Focus/Discipline",

    "Strength",

    "Coordination",

    "Tactical Awareness",

    "Consistency"

  ];



  const result = await prisma.$transaction(async (tx) => {

    const sport = await tx.sport.create({

      data: {

        name: name,

        base_fee: parsedFee,

        status: status || 'ACTIVE',

        academy_id: academyId,

        is_custom: globalSport ? false : true,

        sport_center: sport_center || null,

        latitude: latitude ? parseFloat(latitude) : null,

        longitude: longitude ? parseFloat(longitude) : null,

        use_custom_location: use_custom_location || false,

        global_sport_id: globalSport ? globalSport.id : null,

        require_gps: require_gps !== undefined ? require_gps : true,

      },

    });



    // Use global sport attributes if available, otherwise use defaults

    let attributesToCreate = defaultAttributes;

    if (globalSport && globalSport.attributes) {

      try {

        const parsedAttributes = JSON.parse(globalSport.attributes);

        if (Array.isArray(parsedAttributes) && parsedAttributes.length > 0) {

          attributesToCreate = parsedAttributes;

        }

      } catch (e) {

        // If parsing fails, use defaults

        console.warn('Failed to parse global sport attributes, using defaults');

      }

    }



    // Seed performance attributes

    await tx.performanceAttribute.createMany({

      data: attributesToCreate.map(attr => ({

        academy_id: academyId,

        sport_id: sport.sport_id,

        name: attr,

        status: 'APPROVED'

      }))

    });



    return sport;

  });



  logger.info('Sport created with default attributes', { sport_id: result.sport_id, academy_id: academyId });

  return result;

};



export const updateSportStatus = async (academy_id, sport_id, data) => {

  const academyId = parseInt(academy_id, 10);

  const sportId = parseInt(sport_id, 10);



  const sport = await prisma.sport.findFirst({

    where: {

      sport_id: sportId,

      academy_id: academyId,

    },

  });



  if (!sport) {

    logger.error('Sport not found', { sportId, academyId });

    const error = new Error('Sport not found in this academy');

    error.statusCode = 404;

    throw error;

  }



  // Use transaction for cascading update

  const result = await prisma.$transaction(async (tx) => {

    const updatedSport = await tx.sport.update({

      where: { sport_id: sportId },

      data: { status: data.status },

    });



    // Cascade status to associated batches

    if (data.cascade !== false) {

      if (data.status === 'INACTIVE') {

        // Deactivate all active batches when sport is deactivated

        const batchUpdateResult = await tx.batch.updateMany({

          where: {

            sport_id: sportId,

            academy_id: academyId,

            status: 'ACTIVE',

          },

          data: { status: 'INACTIVE' },

        });



        logger.info('Cascaded batch deactivation', {

          sport_id: sportId,

          academy_id: academyId,

          batches_deactivated: batchUpdateResult.count,

        });



        return { sport: updatedSport, batchesDeactivated: batchUpdateResult.count };

      } else if (data.status === 'ACTIVE') {

        // Reactivate all inactive batches when sport is reactivated

        const batchUpdateResult = await tx.batch.updateMany({

          where: {

            sport_id: sportId,

            academy_id: academyId,

            status: 'INACTIVE',

          },

          data: { status: 'ACTIVE' },

        });



        logger.info('Cascaded batch reactivation', {

          sport_id: sportId,

          academy_id: academyId,

          batches_reactivated: batchUpdateResult.count,

        });



        return { sport: updatedSport, batchesReactivated: batchUpdateResult.count };

      }

    }



    return { sport: updatedSport, batchesDeactivated: 0, batchesReactivated: 0 };

  });



  logger.info('Sport status updated', {

    sport_id: sportId,

    status: data.status,

    academy_id: academyId,

  });

  logger.info('Sport status updated successfully', { sport_id: sportId, status: data.status });

  return result;

};



export const updateSport = async (academy_id, sport_id, data) => {

  const academyId = parseInt(academy_id, 10);

  const sportId = parseInt(sport_id, 10);



  const sport = await prisma.sport.findFirst({

    where: {

      sport_id: sportId,

      academy_id: academyId,

    },

  });



  if (!sport) {

    logger.error('Sport not found', { sportId, academyId });

    const error = new Error('Sport not found in this academy');

    error.statusCode = 404;

    throw error;

  }



  // Build update data object

  const updateData = {};

  if (data.base_fee !== undefined) {

    updateData.base_fee = parseFloat(data.base_fee);

  }

  if (data.name !== undefined) {

    updateData.name = data.name;

  }

  if (data.description !== undefined) {

    updateData.description = data.description;

  }

  if (data.sport_center !== undefined) {

    updateData.sport_center = data.sport_center;

  }

  if (data.attendance_radius_meters !== undefined) {

    updateData.attendance_radius_meters = data.attendance_radius_meters === null ? null : parseInt(data.attendance_radius_meters);

  }

  if (data.latitude !== undefined) {

    updateData.latitude = data.latitude === null ? null : parseFloat(data.latitude);

  }

  if (data.longitude !== undefined) {

    updateData.longitude = data.longitude === null ? null : parseFloat(data.longitude);

  }

  if (data.use_custom_location !== undefined) {

    updateData.use_custom_location = data.use_custom_location;

  }

  if (data.require_gps !== undefined) {

    updateData.require_gps = data.require_gps;

  }



  const updatedSport = await prisma.sport.update({

    where: { sport_id: sportId },

    data: updateData,

  });



  logger.info('Sport updated successfully', { sport_id: sportId, academy_id: academyId });

  return updatedSport;

};



export const deleteSport = async (academy_id, sport_id) => {

  const academyId = parseInt(academy_id, 10);

  const sportId = parseInt(sport_id, 10);



  const sport = await prisma.sport.findFirst({

    where: {

      sport_id: sportId,

      academy_id: academyId,

    },

  });



  if (!sport) {

    logger.error('Sport not found', { sportId, academyId });

    const error = new Error('Sport not found in this academy');

    error.statusCode = 404;

    throw error;

  }



  await prisma.sport.delete({

    where: { sport_id: sportId },

  });



  logger.info('Sport deleted', { sport_id: sportId, academy_id: academyId });

  return { success: true };

};



export const bulkSportAction = async (academy_id, data) => {

  const academyId = parseInt(academy_id, 10);

  const { action, sport_ids } = data;



  const sportIds = sport_ids.map((id) => parseInt(id, 10));



  // Verify all sports belong to the academy

  const sports = await prisma.sport.findMany({

    where: {

      sport_id: { in: sportIds },

      academy_id: academyId,

    },

  });



  if (sports.length !== sportIds.length) {

    const error = new Error('Some sports not found in this academy');

    error.statusCode = 404;

    throw error;

  }



  let result;

  switch (action) {

    case 'activate':

      result = await prisma.sport.updateMany({

        where: { sport_id: { in: sportIds } },

        data: { status: 'ACTIVE' },

      });

      logger.info('Sports activated', { sport_ids: sportIds, academy_id: academyId });

      break;

    case 'deactivate':

      result = await prisma.sport.updateMany({

        where: { sport_id: { in: sportIds } },

        data: { status: 'INACTIVE' },

      });

      logger.info('Sports deactivated', { sport_ids: sportIds, academy_id: academyId });

      break;

    case 'delete':

      result = await prisma.sport.deleteMany({

        where: { sport_id: { in: sportIds } },

      });

      logger.info('Sports deleted', { sport_ids: sportIds, academy_id: academyId });

      break;

    default:

      const error = new Error('Invalid action');

      error.statusCode = 400;

      throw error;

  }



  return { count: result.count, action };

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

            include: { sport: true },

          },

        },

      },

    },

    orderBy: { created_at: 'desc' },

  });



export const createCoach = async (academy_id, data, file) => {

  const academyId = parseInt(academy_id, 10);
  await assertSubscriptionLimits(academyId, 'coach');

  const email = data.email.trim().toLowerCase();

  const temporaryPassword = generateTempPassword(8);

  const password_hash = await bcrypt.hash(temporaryPassword, BCRYPT_SALT_ROUNDS);



  // Check for existing active coach

  const existingCoach = await prisma.coach.findFirst({

    where: {

      email,

      academy_id: academyId,

      is_deleted: false,

    },

  });



  if (existingCoach) {

    const error = new Error('Coach email already exists in this academy');

    error.statusCode = 409;

    throw error;

  }



  // Handle photo upload

  let photo_url = null;

  let photo_file_id = null;



  if (file) {

    const validation = validateImageFile(file);

    if (!validation.isValid) {

      throw new Error(validation.error);

    }



    const buffer = file.buffer;

    const uploadResult = await uploadToImageKit(

      buffer,

      file.originalname || file.name,

      'coach-photos'

    );

    photo_url = uploadResult.url;

    photo_file_id = uploadResult.fileId;

  } else if (data.profile_photo && typeof data.profile_photo === 'string' && data.profile_photo.startsWith('data:image')) {

    const base64Data = data.profile_photo.replace(/^data:image\/\w+;base64,/, '');

    const buffer = Buffer.from(base64Data, 'base64');

    const mime = data.profile_photo.match(/data:(image\/\w+);base64/)?.[1] || 'image/jpeg';

    const ext = mime.split('/')[1] || 'jpg';

    

    if (buffer.length > 5 * 1024 * 1024) {

      throw new Error('File size exceeds 5MB limit.');

    }



    const uploadResult = await uploadToImageKit(

      buffer,

      `coach-photo-${Date.now()}.${ext}`,

      'coach-photos'

    );

    photo_url = uploadResult.url;

    photo_file_id = uploadResult.fileId;

  }



  // Check for soft-deleted coach and auto-restore

  const deletedCoach = await prisma.coach.findFirst({

    where: {

      email,

      academy_id: academyId,

      is_deleted: true,

    },

  });



  let coach;

  if (deletedCoach) {

    // Delete old photo if it exists

    if (deletedCoach.photo_file_id) {

      try {

        await deleteFromImageKit(deletedCoach.photo_file_id);

      } catch (err) {

        logger.warn('Failed to delete old coach photo from ImageKit during restore', { error: err.message });

      }

    }



    // Auto-restore soft-deleted coach

    coach = await prisma.coach.update({

      where: { coach_id: deletedCoach.coach_id },

      data: {

        is_deleted: false,

        deleted_at: null,

        name: data.name,

        specialization: data.specialization,

        phone_number: data.phone_number,

        password_hash,

        status: 'ACTIVE',

        photo_url,

        photo_file_id,

      },

    });

  } else {

    // Create new coach

    coach = await prisma.coach.create({

      data: {

        academy_id: academyId,

        name: data.name,

        specialization: data.specialization,

        phone_number: data.phone_number,

        email,

        password_hash,

        photo_url,

        photo_file_id,

      },

    });

  }



  let credentials_sent = false;



  try {

    await sendCoachOnboardingEmail({

      email,

      name: data.name,

      temporaryPassword,

    });

    credentials_sent = true;

    logger.info('Coach provisioned with credentials email', {

      coach_id: coach.coach_id,

      academy_id: academyId,

      email,

    });

  } catch (mailError) {

    logger.error('Coach created but onboarding email failed', {

      coach_id: coach.coach_id,

      academy_id: academyId,

      email,

      smtp_code: mailError.code,

      message: mailError.message,

    });

    // Don't throw error - coach was created successfully, email is secondary

    credentials_sent = false;

  }



  return {

    coach_id: coach.coach_id,

    name: coach.name,

    email: coach.email,

    specialization: coach.specialization,

    phone_number: coach.phone_number,

    credentials_sent,

  };

};



export const bulkImportCoaches = async (academy_id, file) => {

  const academyId = parseInt(academy_id, 10);

  const fs = await import('fs');

  const csv = await import('csv-parser');



  const results = [];

  const errors = [];



  return new Promise((resolve, reject) => {

    fs.createReadStream(file.path)

      .pipe(csv())

      .on('data', (data) => {

        results.push(data);

      })

      .on('end', async () => {

        const createdCoaches = [];

        const failedRecords = [];



        for (const row of results) {

          try {

            // Validate required fields

            if (!row.email || !row.specialization) {

              failedRecords.push({

                data: row,

                error: 'Email and specialization are required',

              });

              continue;

            }



            const coachData = {

              name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.name,

              email: row.email.trim(),

              phone_number: row.phone || row.phone_number || '',

              specialization: row.specialization,

              status: row.status || 'ACTIVE',

            };



            const coach = await createCoach(academyId.toString(), coachData);

            createdCoaches.push(coach);

          } catch (error) {

            failedRecords.push({

              data: row,

              error: error.message,

            });

          }

        }



        // Clean up uploaded file

        fs.unlinkSync(file.path);



        resolve({

          total: results.length,

          successful: createdCoaches.length,

          failed: failedRecords.length,

          created: createdCoaches,

          errors: failedRecords,

        });

      })

      .on('error', (error) => {

        fs.unlinkSync(file.path);

        reject(error);

      });

  });

};



export const updateCoach = async (academy_id, coach_id, data, file) => {

  const coach = await getCoachForAcademy(academy_id, coach_id);



  if (!coach) {

    const error = new Error('Coach not found');

    error.statusCode = 404;

    throw error;

  }



  const updateData = {

    name: data.name ?? coach.name,

    specialization: data.specialization ?? coach.specialization,

    phone_number: data.phone_number ?? coach.phone_number,

    status: data.status ?? coach.status,

  };



  if (data.email) {

    updateData.email = data.email.trim().toLowerCase();

  }



  // Handle photo upload

  if (file) {

    const validation = validateImageFile(file);

    if (!validation.isValid) {

      throw new Error(validation.error);

    }



    // Delete old photo from ImageKit if exists

    if (coach.photo_file_id) {

      try {

        await deleteFromImageKit(coach.photo_file_id);

      } catch (err) {

        logger.warn('Failed to delete old coach photo from ImageKit', { error: err.message });

      }

    }



    // Upload new photo

    const buffer = file.buffer;

    const uploadResult = await uploadToImageKit(

      buffer,

      file.originalname || file.name,

      'coach-photos'

    );

    updateData.photo_url = uploadResult.url;

    updateData.photo_file_id = uploadResult.fileId;

  } else if (data.profile_photo && typeof data.profile_photo === 'string' && data.profile_photo.startsWith('data:image')) {

    // Delete old photo from ImageKit if exists

    if (coach.photo_file_id) {

      try {

        await deleteFromImageKit(coach.photo_file_id);

      } catch (err) {

        logger.warn('Failed to delete old coach photo from ImageKit', { error: err.message });

      }

    }



    const base64Data = data.profile_photo.replace(/^data:image\/\w+;base64,/, '');

    const buffer = Buffer.from(base64Data, 'base64');

    const mime = data.profile_photo.match(/data:(image\/\w+);base64/)?.[1] || 'image/jpeg';

    const ext = mime.split('/')[1] || 'jpg';

    

    if (buffer.length > 5 * 1024 * 1024) {

      throw new Error('File size exceeds 5MB limit.');

    }



    const uploadResult = await uploadToImageKit(

      buffer,

      `coach-photo-${Date.now()}.${ext}`,

      'coach-photos'

    );

    updateData.photo_url = uploadResult.url;

    updateData.photo_file_id = uploadResult.fileId;

  } else if (data.profile_photo === 'null' || data.profile_photo === null) {

    // If explicitly deleted

    if (coach.photo_file_id) {

      try {

        await deleteFromImageKit(coach.photo_file_id);

      } catch (err) {

        logger.warn('Failed to delete coach photo from ImageKit', { error: err.message });

      }

    }

    updateData.photo_url = null;

    updateData.photo_file_id = null;

  }



  return prisma.coach.update({

    where: { coach_id: coach.coach_id },

    data: updateData,

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

    data: softDeletePayload(),

  });




  await logAudit({

    actor_type: 'ACADEMY_ADMIN',

    actor_id: academy_id,

    action: 'DELETE_COACH',

    entity_type: 'Coach',

    entity_id: coach.coach_id,

    ip_address: req?.ip,

  });




  logger.info('Coach deleted', { academy_id, coach_id });




  return { message: 'Coach deleted successfully' };

};




export const impersonateCoach = async (academy_id, coach_id, admin_user_id, ip) => {

  const academyId = parseInt(academy_id, 10);

  const coachId = parseInt(coach_id, 10);




  // Get the coach

  const coach = await prisma.coach.findUnique({

    where: { coach_id: coachId, academy_id: academyId, is_deleted: false }

  });




  if (!coach) {

    const error = new Error('Coach not found');

    error.statusCode = 404;

    throw error;

  }






  if (coach.status !== 'ACTIVE') {

    const error = new Error('Cannot impersonate an inactive coach');

    error.statusCode = 403;

    throw error;

  }






  // Get the admin user for audit logging

  const adminUser = await prisma.user.findUnique({

    where: { user_id: admin_user_id }

  });




  if (!adminUser) {

    const error = new Error('Admin user not found');

    error.statusCode = 404;

    throw error;

  }






  // Generate impersonation token with special flag

  const impersonationToken = jwt.sign(

    {

      coach_id: coach.coach_id,

      academy_id: coach.academy_id,

      email: coach.email,

      role: 'COACH',

      name: coach.name,

      impersonating: true,

      original_admin_id: admin_user_id

    },

    JWT_SECRET,

    { expiresIn: '2h' } // Shorter expiry for impersonation

  );




  // Log the impersonation action

  await logAudit({

    academy_id: academyId,

    actor_type: 'ACADEMY_ADMIN',

    actor_id: admin_user_id,

    action: 'COACH_IMPERSONATION',

    entity_type: 'Coach',

    entity_id: coach.coach_id,

    metadata: {
      impersonating: true,
      admin_id: admin_user_id,
      coach_id: coach.coach_id,
      coach_name: coach.name
    },

    ip_address: ip

  });




  logger.info('Admin impersonating coach', { 

    admin_id: admin_user_id, 

    academy_id: academyId, 

    coach_id: coachId,

    ip 

  });




  return {

    coach_token: impersonationToken,

    coach: {

      coach_id: coach.coach_id,

      name: coach.name,

      email: coach.email

    },

    redirect_url: '/coach/dashboard'

  };

};





// ==================== STUDENTS ====================



export const getAllStudents = async (academy_id) => {

  try {

    const students = await prisma.student.findMany({

      where: academyScope(academy_id),

      include: {

        batch: {
          include: {
            coaches: {
              include: {
                coach: true
              }
            }
          }
        },
        sport: true,
        enrollments: {
          include: {

            sport: true,

            duration_plan: true,

            batch: {
              include: {
                coaches: {
                  include: {
                    coach: true
                  }
                }
              }
            },

          },

          orderBy: { created_at: 'desc' },
          take: 5, // Get recent enrollments including inactive ones for reactivation

        },

        receipts: {

          orderBy: { payment_date: 'desc' },

          take: 5,

        },

      },

      orderBy: { created_at: 'desc' },

    });



    // Get attendance counts for all students

    const studentIds = students.map(s => s.student_id);

    const attendanceRecords = await prisma.studentAttendance.groupBy({

      by: ['student_id', 'status'],

      where: {

        student_id: { in: studentIds },

        academy_id: parseInt(academy_id, 10),

      },

      _count: {

        status: true,

      },

    });



    // Build attendance summary map

    const attendanceMap = {};

    attendanceRecords.forEach(record => {

      if (!attendanceMap[record.student_id]) {

        attendanceMap[record.student_id] = {

          present_count: 0,

          absent_count: 0,

        };

      }

      if (record.status === 'PRESENT') {

        attendanceMap[record.student_id].present_count = record._count.status;

      } else if (record.status === 'ABSENT') {

        attendanceMap[record.student_id].absent_count = record._count.status;

      }

    });



    const reminders = await prisma.notification.findMany({
      where: {
        academy_id: parseInt(academy_id, 10),
        metadata: {
          contains: `"type":"MANUAL_REMINDER"`
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const reminderMap = {};
    reminders.forEach(r => {
      try {
        const meta = JSON.parse(r.metadata);
        if (meta.student_id && !reminderMap[meta.student_id]) {
          reminderMap[meta.student_id] = r.created_at;
        }
      } catch (e) {}
    });

    // Add direct batch, sport, and attendance summary properties

    const studentsWithBatch = students.map(student => {

      const activeEnrollment = student.enrollments?.[0] || null;

      return {

        ...student,

        batch: activeEnrollment?.batch || null,

        sport: activeEnrollment?.sport || null,

        last_reminder_sent_at: reminderMap[student.student_id] || null,

        attendance_summary: attendanceMap[student.student_id] || {

          present_count: 0,

          absent_count: 0,

        },

      };

    });



    return studentsWithBatch || [];

  } catch (error) {

    console.error('Error in getAllStudents:', error);

    return [];

  }

};



export const getStudentsByBatch = async (academy_id, batch_id) => {

  try {

    const academyId = parseInt(academy_id, 10);

    const batchId = parseInt(batch_id, 10);



    const batch = await prisma.batch.findFirst({

      where: {

        batch_id: batchId,

        academy_id: academyId,

      },

      select: { batch_id: true },

    });



    if (!batch) {

      const error = new Error('Batch not found or does not belong to this academy');

      error.statusCode = 404;

      throw error;

    }



    const students = await prisma.student.findMany({

      where: {

        academy_id: academyId,

        ...NOT_DELETED,

        status: 'ACTIVE',

        OR: [

          { batch_id: batchId },

          {

            enrollments: {

              some: {

                batch_id: batchId,

                is_active: true,

              },

            },

          },

        ],

      },

      select: {

        student_id: true,

        name: true,

        first_name: true,

        last_name: true,

        profile_photo: true,

        age: true,

        category: true,

        sport_id: true,

        batch_id: true,

        status: true,

      },

      orderBy: { name: 'asc' },

    });



    return { students };

  } catch (error) {

    logger.error('Error in getStudentsByBatch', { academy_id, batch_id, error });

    throw error;

  }

};



export const createStudent = async (academy_id, data) => {

  const academyId = parseInt(academy_id, 10);
  await assertSubscriptionLimits(academyId, 'student');

  const academy = await prisma.academy.findUnique({
    where: { academy_id: academyId },
    select: { auto_deactivate_default: true }
  });

  const autoDeactivateOnDue = data.auto_deactivate_on_due !== undefined 
    ? (data.auto_deactivate_on_due === true || data.auto_deactivate_on_due === 'true')
    : (academy?.auto_deactivate_default ?? true);



  // Handle multi-sport enrollment

  const sportIds = Array.isArray(data.sport_ids)

    ? data.sport_ids

    : data.sport_id

      ? [data.sport_id]

      : [];

  const durationPlanId = data.duration_plan_id ? parseInt(data.duration_plan_id, 10) : null;



  // Get duration plan multiplier if provided

  let durationPlan = null;

  let planMultiplier = 1;

  if (durationPlanId) {

    durationPlan = await prisma.durationPlan.findFirst({

      where: {

        plan_id: durationPlanId,

        academy_id: academyId,

        status: 'ACTIVE',

      },

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

        sport_id: { in: sportIds.map((id) => parseInt(id, 10)) },

        status: 'ACTIVE',

      },

    });



    sports.forEach((sport) => {

      const baseFee = parseFloat(sport.base_fee || 0);

      totalSportsFee += baseFee;

      sportsWithFees.push({

        sport_id: sport.sport_id,

        base_fee: baseFee,

      });

    });

  }



  // Calculate final fee using the same logic as the centralized fee utility

  // totalSportsFee is already the sum of base fees from sports

  const registrationFee = parseFloat(data.registration_fee || 0);

  const additionalCharges = parseFloat(data.additional_charges || 0);

  const discount = parseFloat(data.discount || 0);



  // Apply multiplier only once to the base sports fee

  const sportsFeeWithMultiplier = totalSportsFee * planMultiplier;

  const finalFee = sportsFeeWithMultiplier + registrationFee + additionalCharges - discount;



  // Calculate next due date based on duration plan (Use 1 Month = 30 Days consistently for MONTHS type)

  let nextDueDate = null;
  let planStartDate = null;
  let planEndDate = null;

  if (durationPlan && durationPlan.duration) {

    planStartDate = data.joining_date ? new Date(data.joining_date) : new Date();
    let durationDays;

    if (durationPlan.duration_type === 'DAYS') {
      durationDays = durationPlan.duration;
    } else {
      // MONTHS type: convert to days (1 month = 30 days)
      durationDays = durationPlan.duration * 30;
    }

    planEndDate = new Date(planStartDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
    nextDueDate = planEndDate;

  }



  // Auto-calculate age and category from DOB, or use provided age

  let calculatedAge;

  let calculatedCategory;

  if (data.age !== undefined && data.age !== null) {

    calculatedAge = parseInt(data.age, 10);

    const { category } = calculateAgeAndCategory(data.dob);

    calculatedCategory = category;

  } else {

    const { age, category } = calculateAgeAndCategory(data.dob);

    calculatedAge = age;

    calculatedCategory = category;

  }



  // Parent auto-creation logic

  let parent_id = null;

  const parentEmail = data.parent_email?.trim().toLowerCase() || null;

  if (parentEmail) {

    // Resolve parent within the current academy only

    const existingParent = await prisma.parent.findUnique({

      where: {

        email_academy_id: {

          email: parentEmail,

          academy_id: academyId,

        },

      },

    });



    if (existingParent) {

      // Reactivate parent if inactive

      if (!existingParent.is_active) {

        await prisma.parent.update({

          where: { parent_id: existingParent.parent_id },

          data: { is_active: true },

        });

        logger.info('Reactivated inactive parent account', {

          parent_id: existingParent.parent_id,

          parent_email: data.parent_email,

        });

      }



      // Link to existing parent

      parent_id = existingParent.parent_id;

      logger.info('Linking student to existing parent account', {

        parent_id,

        student_name: data.name,

        parent_email: data.parent_email,

      });



      // Send "new child linked" notification email

      try {

        await sendParentChildLinkedEmail({

          to: parentEmail,

          parent_name: existingParent.name,

          student_name: data.name,

          login_url: `${process.env.APP_URL || 'http://localhost:3000'}/parent/login`,

        });

        logger.info('Sent new child linked email to parent', {

          parent_id,

          parent_email: data.parent_email,

        });

      } catch (emailError) {

        logger.error('Failed to send new child linked email', {

          error: emailError.message,

          parent_email: data.parent_email,

        });

      }

    } else {

      // Create new parent account

      const tempPassword = generateTempPassword();

      const parent = await parentService.createParentAccount({

        academy_id: academyId,

        name: data.parent_name || data.name + "'s Parent",

        email: parentEmail,

        phone: data.parent_phone,

        password: tempPassword,

      });



      parent_id = parent.parent_id;

      logger.info('Created new parent account for student', {

        parent_id,

        student_name: data.name,

        parent_email: data.parent_email,

      });



      // Send credentials email

      try {

        await sendParentCredentialsEmail({

          to: parentEmail,

          parent_name: parent.name,

          student_name: data.name,

          temp_password: tempPassword,

          login_url: `${process.env.APP_URL || 'http://localhost:3000'}/parent/login`,

        });

        logger.info('Sent parent credentials email', {

          parent_id,

          parent_email: data.parent_email,

        });

      } catch (emailError) {

        logger.error('Failed to send parent credentials email', {

          error: emailError.message,

          parent_email: data.parent_email,

        });

      }

    }

  }



  // Validate batch capacity if batch is provided
  // Handle both batch_id (single) and batch_ids (array) from frontend
  const batchIds = Array.isArray(data.batch_ids)
    ? data.batch_ids
    : data.batch_id
      ? [data.batch_id]
      : [];

  const primaryBatchId = batchIds.length > 0 ? parseInt(batchIds[0], 10) : null;

  if (data.advance_amount !== undefined && data.advance_amount !== null) {
    const adv = parseFloat(data.advance_amount);
    if (isNaN(adv) || adv < 0) {
      const error = new Error('Advance amount cannot be negative');
      error.statusCode = 400;
      throw error;
    }
  }

  const studentResult = await prisma.$transaction(async (tx) => {
    if (primaryBatchId) {
      const batch = await tx.batch.findFirst({
        where: {
          batch_id: primaryBatchId,
          academy_id: academyId,
          status: 'ACTIVE',
        },
        include: {
          _count: {
            select: { students: true },
          },
        },
      });

      if (!batch) {
        const error = new Error('Batch not found');
        error.statusCode = 404;
        throw error;
      }

      if (batch.max_capacity !== null && batch._count.students >= batch.max_capacity) {
        const error = new Error('Batch is at full capacity');
        error.statusCode = 400;
        throw error;
      }
    }

    // Create student record
    const student = await tx.student.create({
      data: {
        academy_id: academyId,
        parent_id: parent_id,
        name: data.name,
        first_name: data.first_name || null,
        middle_name: data.middle_name || null,
        last_name: data.last_name || null,
        phone: data.phone || null,
        dob: data.dob ? new Date(data.dob) : null,
        age: calculatedAge,
        category: calculatedCategory,
        profile_photo: data.profile_photo || null,
        gender: normalizeGender(data.gender),
        sport_id: sportIds.length > 0 ? parseInt(sportIds[0], 10) : null, // Primary sport for backward compatibility
        batch_id: primaryBatchId,
        blood_group: data.blood_group,
        parent_name: data.parent_name || null,
        parent_email: parentEmail,
        parent_phone: data.parent_phone || null,
        joining_date: data.joining_date ? new Date(data.joining_date) : new Date(),
        fees_status: data.fees_status || 'unpaid',
        status: 'ACTIVE',
        auto_deactivate_on_due: autoDeactivateOnDue,
        auto_deactivated: false,
        height: data.height ? Number(data.height) : null,
        weight: data.weight ? Number(data.weight) : null,
      },
      include: { batch: true, sport: true, parent: true },
    });

    // Create enrollment records for each sport
    if (sportIds.length > 0) {
      const enrollmentData = sportIds.map((sportId, index) => {
        const sportWithFee = sportsWithFees.find((s) => s.sport_id === parseInt(sportId, 10));
        const sportBaseFee = sportWithFee ? parseFloat(sportWithFee.base_fee) : 0;

        return {
          academy_id: academyId,
          student_id: student.student_id,
          sport_id: parseInt(sportId, 10),
          duration_plan_id: durationPlanId,
          batch_id: index === 0 && primaryBatchId ? primaryBatchId : null, // Only first sport gets batch
          registration_fee: index === 0 ? registrationFee : 0, // Registration fee only for primary enrollment
          sports_fee: sportBaseFee * planMultiplier,
          additional_charges: index === 0 ? additionalCharges : 0,
          discount: index === 0 ? discount : 0,
          final_fee: index === 0 ? finalFee : sportBaseFee * planMultiplier,
          next_due_date: index === 0 ? nextDueDate : null,
          plan_start_date: index === 0 ? planStartDate : null,
          plan_end_date: index === 0 ? planEndDate : null,
          is_active: true,
        };
      });

      await tx.studentEnrollment.createMany({
        data: enrollmentData,
      });
    }

    // Link enquiry if enquiry_id is provided
    if (data.enquiry_id) {
      const enquiryId = parseInt(data.enquiry_id, 10);
      try {
        const enquiry = await tx.enquiry.findFirst({
          where: {
            enquiry_id: enquiryId,
            academy_id: academyId,
          },
        });

        if (enquiry && enquiry.status !== 'CONVERTED') {
          const convertedAt = new Date();
          const auditFooter = [
            '',
            '---',
            `[CONVERTED] Student ID: ${student.student_id}`,
            `Converted At: ${convertedAt.toISOString()}`,
            data.converted_by_name ? `Converted By: ${data.converted_by_name}` : null
          ]
            .filter(Boolean)
            .join('\n');

          const updatedNotes = enquiry.notes ? `${enquiry.notes}${auditFooter}` : auditFooter.trim();

          await tx.enquiry.update({
            where: { enquiry_id: enquiryId },
            data: {
              status: 'CONVERTED',
              converted_to_student_id: student.student_id,
              notes: updatedNotes,
            },
          });

          if (enquiry.profile_photo && !student.profile_photo) {
            await tx.student.update({
              where: { student_id: student.student_id },
              data: { profile_photo: enquiry.profile_photo }
            });
          }
        }
      } catch (enquiryError) {
        logger.error('Failed to link enquiry to student during conversion inside tx', enquiryError);
      }
    }

    // Sports Kit Assignments
    if (data.kits && Array.isArray(data.kits)) {
      for (const item of data.kits) {
        const kitId = parseInt(item.kit_id, 10);
        const qty = parseInt(item.quantity || 1, 10);

        if (isNaN(qty) || qty < 1) {
          throw new Error('Sports kit quantity must be at least 1');
        }

        const kit = await tx.sportsKit.findFirst({
          where: { kit_id: kitId, academy_id: academyId }
        });

        if (!kit) {
          throw new Error(`Sports kit with ID ${kitId} not found`);
        }
        if (kit.status !== 'ACTIVE') {
          throw new Error(`Sports kit "${kit.name}" is currently inactive`);
        }
        if (kit.available_qty < qty) {
          throw new Error(`Insufficient stock for "${kit.name}". Available: ${kit.available_qty}, Requested: ${qty}`);
        }
        if (kit.sport_id !== sportIds[0]) {
          throw new Error(`Sports kit "${kit.name}" does not belong to the selected sport`);
        }

        const totalAmount = parseFloat(kit.selling_price) * qty;

        // Decrease stock
        await tx.sportsKit.update({
          where: { kit_id: kitId },
          data: {
            available_qty: { decrement: qty },
            assigned_qty: { increment: qty }
          }
        });

        // Create assignment
        const assignment = await tx.sportsKitAssignment.create({
          data: {
            academy_id: academyId,
            kit_id: kitId,
            student_id: student.student_id,
            status: 'ACTIVE',
            payment_status: 'UNPAID',
            payment_mode: 'FEE',
            quantity: qty,
            unit_price: kit.selling_price,
            total_amount: totalAmount,
            remarks: 'Assigned during student creation'
          }
        });

        // Create Fee entry
        const kitFee = await tx.fee.create({
          data: {
            academy_id: academyId,
            student_id: student.student_id,
            amount_due: totalAmount,
            due_date: planStartDate || new Date(),
            status: 'PENDING',
            description: `Sports Kit Charge: ${kit.name} (Qty: ${qty})`
          }
        });

        // Link Fee to Assignment
        await tx.sportsKitAssignment.update({
          where: { assignment_id: assignment.assignment_id },
          data: { fee_id: kitFee.fee_id }
        });
      }
    }

    // Advance Payment / Account Credit
    if (data.advance_amount && parseFloat(data.advance_amount) > 0) {
      const advanceAmt = parseFloat(data.advance_amount);
      const year = new Date().getFullYear();
      const count = await tx.receipt.count({
        where: { academy_id: academyId, receipt_number: { startsWith: `REC-${year}` } }
      });
      const receiptNumber = `REC-${year}-${String(count + 1).padStart(3, '0')}`;

      const receipt = await tx.receipt.create({
        data: {
          receipt_number: receiptNumber,
          academy_id: academyId,
          student_id: student.student_id,
          amount: advanceAmt,
          discount: 0,
          additional_charges: 0,
          payment_date: new Date(),
          method: data.payment_method || 'cash',
          status: 'COMPLETED',
          remarks: 'Advance Payment (Added to Account Credit)',
          recorded_by: 'ADMIN',
          recorded_by_name: data.admin_user_name || 'Admin',
          created_by_user_id: data.created_by_user_id ? parseInt(data.created_by_user_id, 10) : null,
        }
      });

      // Update student advance balance
      await tx.student.update({
        where: { student_id: student.student_id },
        data: { advance_balance: { increment: advanceAmt } }
      });

      // Create credit transaction
      await tx.studentCreditTransaction.create({
        data: {
          student_id: student.student_id,
          academy_id: academyId,
          amount: advanceAmt,
          type: 'ADD',
          reason: 'Advance Payment during student creation',
          reference_type: 'RECEIPT',
          reference_id: receipt.receipt_id
        }
      });
    }

    return student;
  });

  await logAudit({
    academy_id: academyId,
    actor_type: 'ADMIN',
    action: 'STUDENT_CREATED',
    entity_type: 'Student',
    entity_id: studentResult.student_id,
  });

  logger.info('Student created with enrollments', {
    student_id: studentResult.student_id,
    academy_id: academyId,
    sport_count: sportIds.length,
  });

  // Return student with enrollments
  return prisma.student.findUnique({
    where: { student_id: studentResult.student_id },
    include: {
      batch: true,
      sport: true,
      enrollments: {
        include: {
          sport: true,
          duration_plan: true,
          batch: true,
        },
        where: { is_active: true },
      },
    },
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

  const sportIds = data.sport_ids ? data.sport_ids.map((id) => parseInt(id, 10)) : [];

  const durationPlanId = data.duration_plan_id ? parseInt(data.duration_plan_id, 10) : null;



  // Sync backward-compatible primary sport_id field using first element of sport_ids array

  const primarySportId = sportIds.length > 0 ? sportIds[0] : student.sport_id;

  const nextBatchId = data.batch_id !== undefined ? parseInt(data.batch_id, 10) : student.batch_id;



  // Validate batch capacity if batch is being changed

  if (data.batch_id !== undefined && data.batch_id !== null && data.batch_id !== student.batch_id) {

    const batchId = parseInt(data.batch_id, 10);

    const batch = await prisma.batch.findFirst({

      where: {

        batch_id: batchId,

        academy_id: parsedAcademyId,

        status: 'ACTIVE',

      },

      include: {

        _count: {

          select: { students: true },

        },

      },

    });



    if (!batch) {

      const error = new Error('Batch not found');

      error.statusCode = 404;

      throw error;

    }



    if (batch.max_capacity !== null && batch._count.students >= batch.max_capacity) {

      const error = new Error('Batch is at full capacity');

      error.statusCode = 400;

      throw error;

    }

  }



  if (primarySportId && nextBatchId) {

    await assertStudentSportBatch(parsedAcademyId, primarySportId, nextBatchId);

  }



  // Auto-recalculate age and category if DOB is being updated

  let calculatedAge = student.age;

  let calculatedCategory = student.category;

  if (data.dob !== undefined) {

    const { age, category } = calculateAgeAndCategory(data.dob);

    calculatedAge = age;

    calculatedCategory = category;

  }



  // Update core student details

  const updatedStudent = await prisma.student.update({

    where: { student_id: parsedStudentId },

    data: {

      name: data.name ?? student.name,

      dob: data.dob !== undefined ? (data.dob ? new Date(data.dob) : null) : student.dob,

      age: calculatedAge,

      category: calculatedCategory,

      profile_photo: data.profile_photo !== undefined ? data.profile_photo : student.profile_photo,

      gender: normalizeGender(data.gender ?? student.gender),

      sport_id: primarySportId,

      batch_id: nextBatchId,

      blood_group: data.blood_group ?? student.blood_group,

      parent_name: data.parent_name ?? student.parent_name,

      parent_email: data.parent_email ?? student.parent_email,

      parent_phone: data.parent_phone ?? student.parent_phone,

      phone: data.phone ?? student.phone,

      fees_status: data.fees_status ?? student.fees_status,

      status: data.status ?? student.status,

      auto_deactivate_on_due: data.auto_deactivate_on_due !== undefined
        ? (data.auto_deactivate_on_due === true || data.auto_deactivate_on_due === 'true')
        : student.auto_deactivate_on_due,

      auto_activated: data.auto_activated !== undefined
        ? (data.auto_activated === true || data.auto_activated === 'true')
        : student.auto_activated,

      joining_date:

        data.joining_date !== undefined

          ? data.joining_date

            ? new Date(data.joining_date)

            : null

          : student.joining_date,

      height:

        data.height !== undefined ? (data.height ? Number(data.height) : null) : student.height,

      weight:

        data.weight !== undefined ? (data.weight ? Number(data.weight) : null) : student.weight,

    },

    include: { batch: true, sport: true, receipts: true },

  });



  // Manage active enrollment records if sport_ids or duration_plan_id provided

  if (sportIds.length > 0 || durationPlanId) {

    // Deactivate old enrollment assignments

    await prisma.studentEnrollment.updateMany({

      where: {

        academy_id: parsedAcademyId,

        student_id: parsedStudentId,

        is_active: true,

      },

      data: {

        is_active: false,

      },

    });



    // Create fresh StudentEnrollment rows for each selected sport

    if (sportIds.length > 0) {

      for (const sportId of sportIds) {

        // Calculate final_fee dynamically using duration_plan_id multiplier if provided

        let finalFee = 0;

        if (durationPlanId) {

          const durationPlan = await prisma.durationPlan.findUnique({

            where: { plan_id: durationPlanId },

            select: { multiplier: true },

          });

          if (durationPlan) {

            const sport = await prisma.sport.findUnique({

              where: { sport_id: sportId },

              select: { base_fee: true },

            });

            if (sport) {

              finalFee = sport.base_fee * durationPlan.multiplier;

            }

          }

        }



        const durationDays = durationPlanId ? await getPlanDurationDays(durationPlanId) : 30;
        const planStartDate = new Date();
        const planEndDate = new Date(planStartDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

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

            plan_start_date: planStartDate,

            plan_end_date: planEndDate,

            next_due_date: planEndDate,

            is_active: true,

            coach_id: null,

            batch_id: nextBatchId,

          },

        });

      }

    }

  }



  logger.info('Student updated successfully', {

    student_id: parsedStudentId,

    academy_id: parsedAcademyId,

    sport_ids: sportIds,

    duration_plan_id: durationPlanId,

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

      ...softDeletePayload(),

    },

  });



  if (student.parent_email) {

    try {

      await sendStudentExitEmail({

        parentEmail: student.parent_email,

        studentName: student.name,

        exitReason: data.exit_reason,

        exitNote: data.exit_note,

      });

    } catch (mailErr) {

      logger.error('Student exit email failed', {

        student_id: student.student_id,

        message: mailErr.message,

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

    metadata: { exit_reason: data.exit_reason },

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

    data: softDeletePayload(),

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

      students: { where: { ...NOT_DELETED, status: 'ACTIVE' } },

    },

    orderBy: { batch_id: 'desc' },

  });



  return batches.map((batch) => {

    const basicCoachInfo = batch.coaches?.[0]?.coach;

    return {

      ...batch,

      coach: basicCoachInfo && basicCoachInfo.is_deleted ? null : basicCoachInfo,

      enrolled_count: batch.students.length,

      available_seats:

        batch.max_capacity != null ? Math.max(0, batch.max_capacity - batch.students.length) : null,

    };

  });

};



export const getAvailableBatches = async (academy_id, sport_id, sport_ids) => {

  const batches = await getAllBatches(academy_id);



  // Handle both single sport_id and multiple sport_ids

  const targetSportIds = sport_ids

    ? sport_ids.split(',').map(id => parseInt(id.trim(), 10))

    : sport_id

      ? [parseInt(sport_id, 10)]

      : null;



  return batches.filter(

    (batch) =>

      batch.status === 'ACTIVE' &&

      (targetSportIds === null || targetSportIds.includes(batch.sport_id)) &&

      (batch.max_capacity == null || batch.students.length < batch.max_capacity),

  );

};



export const createBatch = async (academy_id, data) => {

  const academyId = parseInt(academy_id, 10);



  // Parse timing string "HH:mm - HH:mm" into start_time and end_time

  let startTime = null;

  let endTime = null;

  if (data.timing) {

    const [start, end] = data.timing.split('-').map((t) => t.trim());

    startTime = start;

    endTime = end;

  }



  const batch = await prisma.batch.create({

    data: {

      academy_id: academyId,

      name: data.name,

      sport_id: data.sport_id ? parseInt(data.sport_id, 10) : null,

      timing: data.timing,

      start_time: startTime,

      end_time: endTime,

      max_capacity: data.max_capacity ? parseInt(data.max_capacity, 10) : null,

      status: data.status || 'ACTIVE',

    },

    include: { sport: true },

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

        coach_id: coach.coach_id,

      },

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



  // Parse timing string "HH:mm - HH:mm" into start_time and end_time

  let startTime = batch.start_time;

  let endTime = batch.end_time;

  if (data.timing) {

    const [start, end] = data.timing.split('-').map((t) => t.trim());

    startTime = start;

    endTime = end;

  }



  await prisma.batch.update({

    where: { batch_id: batch.batch_id },

    data: {

      name: data.name ?? batch.name,

      sport_id: data.sport_id !== undefined ? parseInt(data.sport_id, 10) : batch.sport_id,

      timing: data.timing ?? batch.timing,

      start_time: startTime,

      end_time: endTime,

      max_capacity:

        data.max_capacity !== undefined ? parseInt(data.max_capacity, 10) : batch.max_capacity,

      status: data.status ?? batch.status,

    },

  });



  if (data.coach_id !== undefined) {

    await prisma.batchCoach.deleteMany({ where: { batch_id: batch.batch_id } });

    if (data.coach_id) {

      await prisma.batchCoach.create({

        data: {

          batch_id: batch.batch_id,

          coach_id: parseInt(data.coach_id, 10),

        },

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



  // Check for enrolled students before deleting

  const enrolled = await prisma.student.count({

    where: { batch_id: batch.batch_id, ...NOT_DELETED, status: 'ACTIVE' },

  });



  if (enrolled > 0) {

    const error = new Error('Cannot delete batch with enrolled students. Reassign students first.');

    error.statusCode = 400;

    throw error;

  }



  // Hard delete the batch from database

  // Note: Use prisma.batch (singular model name) not prisma.batches

  await prisma.batch.delete({

    where: {

      batch_id: parseInt(batch_id, 10),

    },

  });



  logger.info('Batch deleted permanently', { batch_id, academy_id });

  return true;

};



// ==================== COACH ATTENDANCE ====================



export const markCoachAttendance = async (academy_id, marked_by_admin_id, data) => {

  const coach = await getCoachForAcademy(academy_id, data.coach_id);



  if (!coach) {

    const error = new Error('Coach not found');

    error.statusCode = 404;

    throw error;

  }



  // Validate batch exists and belongs to academy

  const batch = await prisma.batch.findFirst({

    where: {

      batch_id: data.batch_id,

      academy_id: parseInt(academy_id, 10),

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

      batch_id: data.batch_id,

      coach_id: coach.coach_id

    }

  });



  if (!coachAssignment) {

    const error = new Error('Coach is not assigned to this batch');

    error.statusCode = 403;

    throw error;

  }



  // Normalize date to start of day for consistent comparison

  const attendanceDate = new Date(data.date);

  const startOfDay = new Date(attendanceDate);

  startOfDay.setHours(0, 0, 0, 0);

  

  const endOfDay = new Date(attendanceDate);

  endOfDay.setHours(23, 59, 59, 999);



  // Check if attendance already exists for this coach, batch, and date

  const existingAttendance = await prisma.coachAttendance.findFirst({

    where: {

      coach_id: coach.coach_id,

      batch_id: data.batch_id,

      date: {

        gte: startOfDay,

        lte: endOfDay

      }

    }

  });



  if (existingAttendance) {

    const error = new Error('Attendance already marked for this coach on this batch and date');

    error.statusCode = 400;

    throw error;

  }



  return prisma.coachAttendance.create({

    data: {

      academy_id: parseInt(academy_id, 10),

      coach_id: coach.coach_id,

      batch_id: data.batch_id,

      date: startOfDay,

      status: data.status,

      marked_by_admin_id,

      remarks: data.remarks || null,

    },

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

      academy_id: parseInt(academy_id, 10),

    },

    orderBy: { date: 'desc' },

  });

};



// ==================== PAYMENTS (RECEIPTS) ====================



export const getAllPayments = async (academy_id) =>

  prisma.receipt.findMany({

    where: {

      academy_id: parseInt(academy_id, 10),

      student: NOT_DELETED,

    },

    include: { 

      student: true,

      collected_by: true

    },

    orderBy: { payment_date: 'desc' },

  });



export const getStudentLedger = async (academy_id, student_id) => {

  const academyId = parseInt(academy_id, 10);

  const studentId = parseInt(student_id, 10);



  const student = await prisma.student.findFirst({
    where: {
      student_id: studentId,
      academy_id: academyId,
    },
  });

  if (!student) {

    const error = new Error('Student not found in this academy');

    error.statusCode = 404;

    throw error;

  }  const receipts = await prisma.receipt.findMany({
    where: {
      academy_id: academyId,
      student_id: studentId,
      status: 'COMPLETED',
    },
  });

  const kitAssignments = await prisma.sportsKitAssignment.findMany({
    where: {
      student_id: studentId,
      academy_id: academyId
    },
    include: {
      kit: {
        include: {
          sport: true
        }
      }
    }
  });

  const kitAssignmentsWithTotals = kitAssignments.map(assignment => {
    const kitReceipts = receipts.filter(r => r.remarks && r.remarks.includes(`[Assignment: ${assignment.assignment_id}]`));
    const paid = kitReceipts.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const total = parseFloat(assignment.total_amount || 0);
    const due = Math.max(0, total - paid);
    return {
      ...assignment,
      paid_amount: paid,
      due_amount: due
    };
  });

  const kitAssignedTotal = kitAssignmentsWithTotals.reduce((sum, a) => sum + parseFloat(a.total_amount || 0), 0);
  const kitPaidTotal = kitAssignmentsWithTotals.reduce((sum, a) => sum + parseFloat(a.paid_amount || 0), 0);
  const kitDueTotal = kitAssignmentsWithTotals.reduce((sum, a) => sum + parseFloat(a.due_amount || 0), 0);

  // Calculate total fee due based on enrollments
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      student_id: studentId,
      academy_id: academyId,
      student: { deleted_at: null },
    },
    include: {
      duration_plan: true,
      sport: true,
      batch: {
        include: {
          sport: true,
        },
      },
    },
  });

  const cycleEnrollments = getCurrentCycleEnrollments(enrollments);

  let totalFeeDue = 0;
  let totalPaid = 0;

  if (cycleEnrollments.length > 0) {
    totalFeeDue = cycleEnrollments.reduce((sum, e) => {
      const sportsBaseFee = parseFloat(e.sport?.base_fee || e.sports_base_fee || 0);
      const planMultiplier = parseFloat(e.duration_plan?.multiplier || e.plan_multiplier || 1);
      const assignedSportsFee = sportsBaseFee * planMultiplier;
      const registrationFee = parseFloat(e.registration_fee || 0);
      const additionalCharges = parseFloat(e.additional_charges || 0);
      const discount = parseFloat(e.discount || 0);
      return sum + (assignedSportsFee + registrationFee + additionalCharges - discount);
    }, 0);

    const oldestEnrollment = cycleEnrollments[0];
    const cycleStart = new Date(oldestEnrollment.created_at.getTime() - 5000);
    const cycleReceipts = receipts.filter(r => r.status === 'COMPLETED' && new Date(r.created_at) >= cycleStart && !(r.remarks && r.remarks.includes('Sports Kit')));
    totalPaid = cycleReceipts.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  }

  // Since due_date doesn't exist in schema, set overdue fees to 0
  const overdueFees = 0;
  const balanceOutstanding = Math.max(0, totalFeeDue - totalPaid);
  const pendingFees = balanceOutstanding;



  return {

    student_id: studentId,

    student_name: student.name,

    total_fees_assigned: totalFeeDue,

    total_fees_paid: totalPaid,

    pending_fees: pendingFees,

    overdue_fees: overdueFees,

    balance_outstanding: balanceOutstanding,

    receipt_count: receipts.length,

    enrollment_count: enrollments.length,
    sports_kit_fees_assigned: kitAssignedTotal,
    sports_kit_fees_paid: kitPaidTotal,
    sports_kit_fees_due: kitDueTotal,
    sports_kit_assignments: kitAssignmentsWithTotals,
    credit_balance: parseFloat(student.advance_balance || 0),

  };

};



export const getStudentsFeeSummary = async (academy_id) => {

  const academyId = parseInt(academy_id, 10);



  // Get all active students for the academy (exclude deleted and inactive students)

  const students = await prisma.student.findMany({
    where: {
      academy_id: academyId,
    },
    include: {
      enrollments: {
        where: {
          academy_id: academyId,
        },
        include: {
          duration_plan: true,
          sport: true,
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
      sports_kit_assignments: {
        include: {
          kit: {
            include: {
              sport: true
            }
          }
        }
      },
      fees: false,
      parent: true,
    },
  });

  // Calculate fee summary for each student
  const studentsSummary = await Promise.all(
    students.map(async (student) => {
      const cycleEnrollments = getCurrentCycleEnrollments(student.enrollments || []);
      const activeEnrollment = student.enrollments.find(e => e.is_active) || null;

      let totalFeeDue = 0;
      let totalPaid = 0;

      if (cycleEnrollments.length > 0) {
        totalFeeDue = cycleEnrollments.reduce((sum, e) => {
          const sportsBaseFee = parseFloat(e.sport?.base_fee || e.sports_base_fee || 0);
          const planMultiplier = parseFloat(e.duration_plan?.multiplier || e.plan_multiplier || 1);
          const assignedSportsFee = sportsBaseFee * planMultiplier;
          const registrationFee = parseFloat(e.registration_fee || 0);
          const additionalCharges = parseFloat(e.additional_charges || 0);
          const discount = parseFloat(e.discount || 0);
          return sum + (assignedSportsFee + registrationFee + additionalCharges - discount);
        }, 0);

        const oldestEnrollment = cycleEnrollments[0];
        const cycleStart = new Date(oldestEnrollment.created_at.getTime() - 5000);
        const cycleReceipts = student.receipts.filter(r => r.status === 'COMPLETED' && new Date(r.created_at) >= cycleStart && !(r.remarks && r.remarks.includes('Sports Kit')));
        totalPaid = cycleReceipts.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
      }

      const balanceOutstanding = Math.max(0, totalFeeDue - totalPaid);

      // Build cycle-grouped receipts for the frontend payment history display
      // Get ALL enrollments (including past ones) for grouping
      const allEnrollments = await prisma.studentEnrollment.findMany({
        where: { student_id: student.student_id, academy_id: academyId },
        orderBy: { created_at: 'asc' },
      });

      // Tag each receipt with which cycle it belongs to (display only — not used for totals)
      const receiptsWithCycle = student.receipts.map(r => {
        let assignedEnrollment = null;
        for (let i = allEnrollments.length - 1; i >= 0; i--) {
          const enrollBoundary = new Date(allEnrollments[i].created_at.getTime() - 5000);
          if (new Date(r.created_at) >= enrollBoundary) {
            assignedEnrollment = allEnrollments[i];
            break;
          }
        }
        const isCurrentCycle = assignedEnrollment && cycleEnrollments.some(e => e.enrollment_id === assignedEnrollment.enrollment_id);
        return {
          ...r,
          cycle_enrollment_id: assignedEnrollment?.enrollment_id || null,
          is_current_cycle: isCurrentCycle ?? false,
        };
      });

      // Determine fee status — only 'paid' if there IS a fee assigned AND it's fully paid
      const feeStatus = totalFeeDue > 0 && balanceOutstanding === 0 ? 'paid' : 'unpaid';

      // Get last paid date from receipts (display only)
      const lastPaidDate = student.receipts.length > 0 ? student.receipts[0].payment_date : null;

      const kitAssignmentsWithTotals = (student.sports_kit_assignments || []).map(assignment => {
        const kitReceipts = student.receipts.filter(r => r.remarks && r.remarks.includes(`[Assignment: ${assignment.assignment_id}]`));
        const paid = kitReceipts.reduce((sum, r) => sum + parseFloat(r.amount), 0);
        const total = parseFloat(assignment.total_amount || 0);
        const due = Math.max(0, total - paid);
        return {
          ...assignment,
          paid_amount: paid,
          due_amount: due
        };
      });

      return {

        student_id: student.student_id,

        name: student.name,

        parent_name: student.parent?.name || '',

        phone: student.phone || student.parent?.phone || '',

        total_fee: totalFeeDue,

        paid_amount: totalPaid,

        due_amount: balanceOutstanding,
        sports_kit_assignments: kitAssignmentsWithTotals,

        fee_status: feeStatus,

        last_paid_date: lastPaidDate,

        payment_count: student.receipts.length,

        enrollments: student.enrollments,

        receipts: receiptsWithCycle,

        status: student.status,

        is_deleted: student.is_deleted,

        advance_balance: parseFloat(student.advance_balance || 0),

      };

    })

  );



  // Calculate overall summary stats (filter to active students only)
  const activeSummary = studentsSummary.filter(s => s.status === 'ACTIVE' && !s.is_deleted);
  const inactiveSummary = studentsSummary.filter(s => s.status !== 'ACTIVE' || s.is_deleted);

  const totalStudents = activeSummary.length;
  const fullyPaid = activeSummary.filter(s => s.fee_status === 'paid').length;
  const partiallyPaid = activeSummary.filter(s => s.paid_amount > 0 && s.due_amount > 0).length;
  const unpaid = activeSummary.filter(s => s.fee_status === 'unpaid').length;
  const inactive = inactiveSummary.length;
  const totalOutstanding = activeSummary.reduce((sum, s) => sum + s.due_amount, 0);

  logger.info('Students fee summary calculated', {
    academy_id: academyId,
    total_students: totalStudents,
    total_outstanding: totalOutstanding,
    inactive_students: inactive,
  });

  return {
    students: studentsSummary,
    summary: {
      total_students: totalStudents,
      fully_paid: fullyPaid,
      partially_paid: partiallyPaid,
      unpaid: unpaid,
      inactive: inactive,
      total_outstanding: totalOutstanding,
    },
  };

};

export const getStudentCreditHistory = async (academy_id, student_id) => {
  const academyId = parseInt(academy_id, 10);
  const studentId = parseInt(student_id, 10);

  const student = await getStudentForAcademy(academyId, studentId);
  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  const transactions = await prisma.studentCreditTransaction.findMany({
    where: {
      academy_id: academyId,
      student_id: studentId,
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  return {
    advance_balance: parseFloat(student.advance_balance || 0),
    transactions: transactions.map(t => ({
      ...t,
      amount: parseFloat(t.amount || 0),
    })),
  };
};

export const addStudentCredit = async (academy_id, student_id, data) => {
  const academyId = parseInt(academy_id, 10);
  const studentId = parseInt(student_id, 10);
  const amount = parseFloat(data.amount);

  if (isNaN(amount) || amount <= 0) {
    const error = new Error('Invalid credit amount');
    error.statusCode = 400;
    throw error;
  }

  const student = await getStudentForAcademy(academyId, studentId);
  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  const updatedStudent = await prisma.$transaction(async (tx) => {
    const updated = await tx.student.update({
      where: { student_id: studentId },
      data: { advance_balance: { increment: amount } },
    });

    await tx.studentCreditTransaction.create({
      data: {
        student_id: studentId,
        academy_id: academyId,
        amount,
        type: 'ADD',
        reason: data.reason || 'Manual Credit Addition',
        reference_type: 'MANUAL',
      },
    });

    return updated;
  });

  return {
    advance_balance: parseFloat(updatedStudent.advance_balance || 0),
  };
};

export const useStudentCredit = async (academy_id, student_id, data, admin_user_id = null) => {
  const academyId = parseInt(academy_id, 10);
  const studentId = parseInt(student_id, 10);
  const amount = parseFloat(data.amount);
  const useFor = data.use_for; // 'KIT' or 'PLAN' or 'OTHER'
  const referenceId = data.reference_id ? parseInt(data.reference_id, 10) : null;

  let adminName = 'Admin';
  if (admin_user_id) {
    const adminUser = await prisma.user.findUnique({
      where: { user_id: parseInt(admin_user_id, 10) }
    });
    if (adminUser) {
      adminName = adminUser.name;
    }
  }

  if (isNaN(amount) || amount <= 0) {
    const error = new Error('Invalid debit amount');
    error.statusCode = 400;
    throw error;
  }

  const student = await getStudentForAcademy(academyId, studentId);
  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  const currentBalance = parseFloat(student.advance_balance || 0);
  if (currentBalance < amount) {
    const error = new Error(`Insufficient credit. Available balance: ₹${currentBalance.toFixed(2)}`);
    error.statusCode = 400;
    throw error;
  }

  const activeEnrollment = await prisma.studentEnrollment.findFirst({
    where: {
      student_id: studentId,
      academy_id: academyId,
      is_active: true,
      OR: [
        { plan_end_date: null },
        { plan_end_date: { gte: new Date() } }
      ]
    }
  });

  if (!activeEnrollment) {
    const error = new Error('No active plan found to apply/use credit.');
    error.statusCode = 400;
    throw error;
  }

  const sportsFee = parseFloat(activeEnrollment.sports_fee || 0);
  const registrationFee = parseFloat(activeEnrollment.registration_fee || 0);
  const additionalCharges = parseFloat(activeEnrollment.additional_charges || 0);
  const discount = parseFloat(activeEnrollment.discount || 0);
  const totalPlanFee = sportsFee + registrationFee + additionalCharges - discount;
  const totalPlanPaid = parseFloat(activeEnrollment.paid_amount || 0);
  const currentPlanDue = Math.max(0, totalPlanFee - totalPlanPaid);

  if (currentPlanDue > 0) {
    const error = new Error('Cannot use account credit because the current active plan still has outstanding dues');
    error.statusCode = 400;
    throw error;
  }

  const updatedStudent = await prisma.$transaction(async (tx) => {
    // 1. Decrement balance
    const updated = await tx.student.update({
      where: { student_id: studentId },
      data: { advance_balance: { decrement: amount } },
    });

    // 2. Log credit transaction
    const txLog = await tx.studentCreditTransaction.create({
      data: {
        student_id: studentId,
        academy_id: academyId,
        amount,
        type: 'USE',
        reason: data.reason || `Used credit for ${useFor}`,
        reference_type: useFor,
        reference_id: referenceId,
      },
    });

    // 3. Side effects
    if (useFor === 'KIT' && referenceId) {
      await tx.sportsKitAssignment.update({
        where: { assignment_id: referenceId },
        data: {
          payment_status: 'PAID',
          payment_mode: 'CREDIT',
        },
      });
    } else if (useFor === 'PLAN' && referenceId) {
      // Find current enrollment to update paid_amount
      const enrollment = await tx.studentEnrollment.findUnique({
        where: { enrollment_id: referenceId },
      });
      if (enrollment) {
        const newPaidAmount = parseFloat(enrollment.paid_amount || 0) + amount;
        await tx.studentEnrollment.update({
          where: { enrollment_id: referenceId },
          data: { paid_amount: newPaidAmount },
        });

        // Also create a Receipt with method CREDIT so it registers in standard payment lists
        const year = new Date().getFullYear();
        const count = await tx.receipt.count({
          where: {
            academy_id: academyId,
            receipt_number: { startsWith: `REC-${year}` },
          },
        });
        const receiptNumber = `REC-${year}-${String(count + 1).padStart(3, '0')}`;
        await tx.receipt.create({
          data: {
            receipt_number: receiptNumber,
            academy_id: academyId,
            student_id: studentId,
            amount,
            payment_date: new Date(),
            method: 'CREDIT',
            status: 'COMPLETED',
            remarks: data.reason || `Credit applied to Plan Enrollment`,
            recorded_by: 'ADMIN',
            recorded_by_name: adminName,
            created_by_user_id: admin_user_id ? parseInt(admin_user_id, 10) : null,
          },
        });
      }
    }

    return updated;
  });

  return {
    advance_balance: parseFloat(updatedStudent.advance_balance || 0),
  };
};

export const applyCreditToFees = async (academy_id, student_id, data, admin_user_id = null) => {
  const academyId = parseInt(academy_id, 10);
  const studentId = parseInt(student_id, 10);
  const amount = parseFloat(data.amount);
  const pendingFees = parseFloat(data.pending_fees || 0);

  let adminName = 'Admin';
  if (admin_user_id) {
    const adminUser = await prisma.user.findUnique({
      where: { user_id: parseInt(admin_user_id, 10) }
    });
    if (adminUser) {
      adminName = adminUser.name;
    }
  }

  if (isNaN(amount) || amount <= 0) {
    const error = new Error('Invalid credit amount');
    error.statusCode = 400;
    throw error;
  }

  const student = await getStudentForAcademy(academyId, studentId);
  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  const currentBalance = parseFloat(student.advance_balance || 0);
  if (currentBalance < amount) {
    const error = new Error(`Insufficient credit. Available balance: ₹${currentBalance.toFixed(2)}`);
    error.statusCode = 400;
    throw error;
  }

  const activeEnrollment = await prisma.studentEnrollment.findFirst({
    where: {
      student_id: studentId,
      academy_id: academyId,
      is_active: true,
      OR: [
        { plan_end_date: null },
        { plan_end_date: { gte: new Date() } }
      ]
    }
  });

  if (!activeEnrollment) {
    const error = new Error('No active plan found to apply/use credit.');
    error.statusCode = 400;
    throw error;
  }

  const sportsFee = parseFloat(activeEnrollment.sports_fee || 0);
  const registrationFee = parseFloat(activeEnrollment.registration_fee || 0);
  const additionalCharges = parseFloat(activeEnrollment.additional_charges || 0);
  const discount = parseFloat(activeEnrollment.discount || 0);
  const totalPlanFee = sportsFee + registrationFee + additionalCharges - discount;
  const totalPlanPaid = parseFloat(activeEnrollment.paid_amount || 0);
  const currentPlanDue = Math.max(0, totalPlanFee - totalPlanPaid);

  if (currentPlanDue > 0) {
    const error = new Error('Cannot use account credit because the current active plan still has outstanding dues');
    error.statusCode = 400;
    throw error;
  }

  const updatedStudent = await prisma.$transaction(async (tx) => {
    // 1. Decrement credit balance
    const updated = await tx.student.update({
      where: { student_id: studentId },
      data: { advance_balance: { decrement: amount } },
    });

    // 2. Log credit transaction
    await tx.studentCreditTransaction.create({
      data: {
        student_id: studentId,
        academy_id: academyId,
        amount,
        type: 'USE',
        reason: 'Credit Applied to Pending Fees',
        reference_type: 'FEE_PAYMENT',
      },
    });

    // 3. Get active enrollment to update paid_amount
    const activeEnrollment = await tx.studentEnrollment.findFirst({
      where: {
        student_id: studentId,
        academy_id: academyId,
        is_active: true,
      },
    });

    if (activeEnrollment) {
      const currentPaidAmount = parseFloat(activeEnrollment.paid_amount || 0);
      const newPaidAmount = currentPaidAmount + amount;
      
      await tx.studentEnrollment.update({
        where: { enrollment_id: activeEnrollment.enrollment_id },
        data: { paid_amount: newPaidAmount },
      });
    }

    // 4. Create receipt with method CREDIT
    const year = new Date().getFullYear();
    const count = await tx.receipt.count({
      where: {
        academy_id: academyId,
        receipt_number: { startsWith: `REC-${year}` },
      },
    });
    const receiptNumber = `REC-${year}-${String(count + 1).padStart(3, '0')}`;
    await tx.receipt.create({
      data: {
        receipt_number: receiptNumber,
        academy_id: academyId,
        student_id: studentId,
        amount,
        payment_date: new Date(),
        method: 'CREDIT',
        status: 'COMPLETED',
        remarks: 'Credit applied to pending fees',
        recorded_by: 'ADMIN',
        recorded_by_name: adminName,
        created_by_user_id: admin_user_id ? parseInt(admin_user_id, 10) : null,
      },
    });

    return updated;
  });

  // Calculate new pending fees
  const newPendingFees = Math.max(0, pendingFees - amount);
  const remainingCredit = parseFloat(updatedStudent.advance_balance || 0);

  return {
    advance_balance: remainingCredit,
    new_pending_fees: newPendingFees,
    amount_applied: amount,
  };
};

export const getReceipts = async (academy_id) => {

  const academyId = parseInt(academy_id, 10);



  const receipts = await prisma.receipt.findMany({

    where: {

      academy_id: academyId,

      student: NOT_DELETED,

    },

    include: {
      student: {
        include: {
          parent: true,
        }
      },
      collected_by: {
        select: {
          coach_id: true,
          name: true,
          email: true,
          phone_number: true,
        }
      },
      created_by: {
        select: {
          user_id: true,
          name: true,
        }
      },
      approved_by: {
        select: {
          user_id: true,
          name: true,
        }
      },
      submitted_by_parent: {
        select: {
          parent_id: true,
          name: true,
          email: true,
          phone: true,
        }
      }
    },

    orderBy: { payment_date: 'desc' },

  });



  return receipts;

};



export const createReceipt = async (academy_id, data, admin_user_id = null) => {

  const academyId = parseInt(academy_id, 10);
  let adminName = 'Admin';
  if (admin_user_id) {
    const adminUser = await prisma.user.findUnique({
      where: { user_id: parseInt(admin_user_id, 10) }
    });
    if (adminUser) {
      adminName = adminUser.name;
    }
  }



  const student = await getStudentForAcademy(academyId, data.student_id);

  if (!student) {

    const error = new Error('Student not found in this academy');

    error.statusCode = 404;

    throw error;

  }

  // Guard: reject payment if student is INACTIVE
  if (student.status !== 'ACTIVE') {
    const err = new Error('Cannot record a payment for an inactive student. Please reactivate the student first.');
    err.statusCode = 400;
    throw err;
  }



  const year = new Date().getFullYear();


  const count = await prisma.receipt.count({

    where: {

      academy_id: academyId,

      receipt_number: {

        startsWith: `REC-${year}`,

      },

    },

  });



  const receiptNumber = `REC-${year}-${String(count + 1).padStart(3, '0')}`;



  // Calculate payment breakdown
  const totalPayment = parseFloat(data.amount);
  const amountPaid = parseFloat(data.amount_paid || data.amount);
  const extraAmount = parseFloat(data.extra_amount || 0);
  
  // Get current fee information to calculate how much should go to fees vs credit
  const activeEnrollment = await prisma.studentEnrollment.findFirst({
    where: {
      student_id: student.student_id,
      academy_id: academyId,
      is_active: true,
    },
    include: {
      duration_plan: true,
      sport: true,
    },
  });

  let feePaymentAmount = amountPaid;
  let creditFromPayment = 0;

  if (activeEnrollment) {
    const currentPaidAmount = parseFloat(activeEnrollment.paid_amount || 0);
    
    // Calculate total fee assigned for this enrollment
    const sportsBaseFee = parseFloat(activeEnrollment.sport?.base_fee || activeEnrollment.sports_base_fee || 0);
    const planMultiplier = parseFloat(activeEnrollment.duration_plan?.multiplier || activeEnrollment.plan_multiplier || 1);
    const assignedFee = sportsBaseFee * planMultiplier;
    const registrationFee = parseFloat(activeEnrollment.registration_fee || 0);
    const additionalCharges = parseFloat(activeEnrollment.additional_charges || 0);
    const discount = parseFloat(activeEnrollment.discount || 0);
    const totalAssignedFee = assignedFee + registrationFee + additionalCharges - discount;
    
    // Calculate how much is already paid towards fees
    const remainingFeeAmount = Math.max(0, totalAssignedFee - currentPaidAmount);
    
    // If payment exceeds remaining fee, excess goes to credit
    if (amountPaid > remainingFeeAmount) {
      feePaymentAmount = remainingFeeAmount;
      creditFromPayment = amountPaid - remainingFeeAmount;
    } else {
      feePaymentAmount = amountPaid;
      creditFromPayment = 0;
    }
  }

  const receipt = await prisma.receipt.create({

    data: {

      receipt_number: receiptNumber,

      academy_id: academyId,

      student_id: student.student_id,

      amount: totalPayment,

      discount: parseFloat(data.discount || 0),

      additional_charges: parseFloat(data.additional_charges || 0),

      payment_date: new Date(data.payment_date),

      method: data.method,

      status: data.status === 'completed' ? 'COMPLETED' : 'PENDING',

      remarks: data.remarks || (creditFromPayment > 0 ? `Advance Credit: ₹${creditFromPayment.toFixed(2)}` : null),

      recorded_by: 'ADMIN',
      recorded_by_name: adminName,
      created_by_user_id: admin_user_id ? parseInt(admin_user_id, 10) : null,
    },

    include: {

      student: true,

    },

  });

  // Handle credit from payment (automatic credit when payment exceeds fees)
  if (creditFromPayment > 0) {
    await prisma.student.update({
      where: { student_id: student.student_id },
      data: { advance_balance: { increment: creditFromPayment } }
    });

    await prisma.studentCreditTransaction.create({
      data: {
        student_id: student.student_id,
        academy_id: academyId,
        amount: creditFromPayment,
        type: 'ADD',
        reason: 'Automatic Credit from Payment',
        reference_type: 'RECEIPT',
        reference_id: receipt.receipt_id
      }
    });
  }

  // Handle explicit extra amount (manual advance credit)
  if (extraAmount > 0) {
    await prisma.student.update({
      where: { student_id: student.student_id },
      data: { advance_balance: { increment: extraAmount } }
    });

    await prisma.studentCreditTransaction.create({
      data: {
        student_id: student.student_id,
        academy_id: academyId,
        amount: extraAmount,
        type: 'ADD',
        reason: 'Manual Advance Credit',
        reference_type: 'RECEIPT',
        reference_id: receipt.receipt_id
      }
    });
  }

  // Update the student's active enrollment's paid_amount to maintain financial link
  // Only update with the actual fee payment amount, not total payment
  if (activeEnrollment) {

    const currentPaidAmount = parseFloat(activeEnrollment.paid_amount || 0);

    const newPaidAmount = currentPaidAmount + feePaymentAmount;



    await prisma.studentEnrollment.update({

      where: { enrollment_id: activeEnrollment.enrollment_id },

      data: { paid_amount: newPaidAmount },

    });

  }



  await logAudit({

    academy_id: academyId,

    actor_type: 'ADMIN',

    action: 'RECEIPT_CREATED',

    entity_type: 'Receipt',

    entity_id: receipt.receipt_id,

    metadata: {
      fee_payment: feePaymentAmount,
      automatic_credit: creditFromPayment,
      manual_credit: extraAmount,
      total_payment: totalPayment
    }

  });



  return receipt;

};



export const getPendingDues = async (academy_id) => {

  const academyId = parseInt(academy_id, 10);



  const students = await prisma.student.findMany({

    where: {

      academy_id: academyId,

      deleted_at: null,

    },

    include: {

      enrollments: {

        include: {

          duration_plan: true,

          batch: {

            include: {

              sport: true,

            },

          },

        },

      },

    },

  });



  const pendingDues = [];



  for (const student of students) {

    const receipts = await prisma.receipt.findMany({

      where: {

        student_id: student.student_id,

        academy_id: academyId,

        status: 'COMPLETED',

      },

    });



    const totalPaid = receipts.reduce((sum, r) => sum + Number(r.amount), 0);



    const totalFeeDue = student.enrollments.reduce((sum, e) => {

      // Use the centralized fee calculation utility

      const feeBreakdown = calculateStudentFee(e);

      return sum + feeBreakdown.totalComputedFee;

    }, 0);



    const balanceOutstanding = totalFeeDue - totalPaid;



    if (balanceOutstanding > 0) {

      const latestEnrollment = student.enrollments[0];

      const joiningDate = latestEnrollment?.joining_date || student.created_at;

      // Get duration plan to calculate due date
      const durationPlan = latestEnrollment?.duration_plan_id ? 
        await prisma.durationPlan.findUnique({ where: { plan_id: latestEnrollment.duration_plan_id } }) : null;
      
      let nextDueDate;
      if (durationPlan) {
        if (durationPlan.duration_type === 'DAYS') {
          nextDueDate = new Date(joiningDate.getTime() + durationPlan.duration * 24 * 60 * 60 * 1000);
        } else {
          // MONTHS type: convert to days (1 month = 30 days)
          const durationDays = durationPlan.duration * 30;
          nextDueDate = new Date(joiningDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
        }
      } else {
        // Fallback to 1 month (30 days)
        nextDueDate = new Date(joiningDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      }



      pendingDues.push({

        student_id: student.student_id,

        student_name: student.name,

        total_fee_due: totalFeeDue,

        total_paid: totalPaid,

        balance_outstanding: balanceOutstanding,

        next_due_date: nextDueDate,

        sport: latestEnrollment?.batch?.sport?.name || '—',

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

      status: 'COMPLETED',

    },

  });



  const totalRevenue = receipts.reduce((sum, r) => sum + Number(r.amount), 0);

  const totalDiscounts = receipts.reduce((sum, r) => sum + Number(r.discount || 0), 0);

  const totalAdditionalCharges = receipts.reduce(

    (sum, r) => sum + Number(r.additional_charges || 0),

    0,

  );



  const currentYear = new Date().getFullYear();

  const currentYearReceipts = receipts.filter(

    (r) => new Date(r.payment_date).getFullYear() === currentYear,

  );

  const currentYearRevenue = currentYearReceipts.reduce((sum, r) => sum + Number(r.amount), 0);



  const currentMonth = new Date().getMonth();

  const currentYearMonthReceipts = receipts.filter((r) => {

    const date = new Date(r.payment_date);

    return date.getFullYear() === currentYear && date.getMonth() === currentMonth;

  });

  const currentMonthRevenue = currentYearMonthReceipts.reduce(

    (sum, r) => sum + Number(r.amount),

    0,

  );



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

    revenue_by_method: revenueByMethod,

  };

};



export const createPayment = async (academy_id, data, admin_user_id = null) => {
  const academyId = parseInt(academy_id, 10);
  let adminName = 'Admin';
  if (admin_user_id) {
    const adminUser = await prisma.user.findUnique({
      where: { user_id: parseInt(admin_user_id, 10) }
    });
    if (adminUser) {
      adminName = adminUser.name;
    }
  }
  const student = await getStudentForAcademy(academyId, data.student_id);



  if (!student) {

    const error = new Error('Student not found in this academy workspace');

    error.statusCode = 404;

    throw error;

  }

  // Payment validation: Check if payment amount exceeds remaining fee
  const paymentAmount = parseFloat(data.amount);
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    const error = new Error('Payment amount must be a positive number');
    error.statusCode = 400;
    throw error;
  }

  if (data.kit_assignment_id) {
    const assignmentId = parseInt(data.kit_assignment_id, 10);
    const assignment = await prisma.sportsKitAssignment.findFirst({
      where: { assignment_id: assignmentId, academy_id: academyId },
      include: { kit: true }
    });
    if (!assignment) {
      const error = new Error('Sports Kit assignment not found');
      error.statusCode = 404;
      throw error;
    }

    const payAmount = parseFloat(data.amount);
    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      const error = new Error('Payment amount must be a positive number');
      error.statusCode = 400;
      throw error;
    }

    const allReceipts = await prisma.receipt.findMany({
      where: {
        student_id: student.student_id,
        academy_id: academyId,
        status: 'COMPLETED'
      }
    });
    const kitReceipts = allReceipts.filter(r => r.remarks && r.remarks.includes(`[Assignment: ${assignmentId}]`));
    const alreadyPaid = kitReceipts.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const totalAmount = parseFloat(assignment.total_amount || 0);
    const remaining = Math.max(0, totalAmount - alreadyPaid);

    if (payAmount > remaining) {
      const error = new Error(`Payment amount cannot exceed the remaining kit fee of ₹${remaining.toFixed(2)}`);
      error.statusCode = 400;
      throw error;
    }

    const generatedReceiptNo = `REC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const receipt = await prisma.receipt.create({
      data: {
        receipt_number: generatedReceiptNo,
        academy_id: academyId,
        student_id: student.student_id,
        amount: payAmount,
        discount: 0,
        additional_charges: 0,
        payment_date: new Date(data.payment_date || new Date()),
        method: data.method || 'cash',
        status: 'COMPLETED',
        remarks: `Sports Kit Payment: ${assignment.kit.name} (Qty: ${assignment.quantity}) [Assignment: ${assignmentId}]`,
        recorded_by: 'ADMIN',
        recorded_by_name: adminName,
        created_by_user_id: admin_user_id ? parseInt(admin_user_id, 10) : null,
      }
    });

    const newTotalPaid = alreadyPaid + payAmount;
    let paymentStatus = 'UNPAID';
    if (newTotalPaid >= totalAmount) {
      paymentStatus = 'PAID';
    } else if (newTotalPaid > 0) {
      paymentStatus = 'PARTIAL';
    }

    await prisma.sportsKitAssignment.update({
      where: { assignment_id: assignmentId },
      data: { payment_status: paymentStatus }
    });

    if (assignment.fee_id) {
      if (paymentStatus === 'PAID') {
        await prisma.fee.delete({ where: { fee_id: assignment.fee_id } }).catch(() => {});
      } else {
        await prisma.fee.update({
          where: { fee_id: assignment.fee_id },
          data: {
            paid_amount: newTotalPaid,
            status: 'PENDING'
          }
        }).catch(() => {});
      }
    }

    return receipt;
  }

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { student_id: student.student_id, academy_id: parseInt(academy_id, 10) },
    include: { sport: true, duration_plan: true }
  });
  const cycleEnrollments = getCurrentCycleEnrollments(enrollments);
  if (cycleEnrollments.length === 0) {
    const error = new Error('No active plan found for this student. No payments can be accepted.');
    error.statusCode = 400;
    throw error;
  }

  const totalFeesAssigned = cycleEnrollments.reduce((sum, e) => {
    const sportsBaseFee = parseFloat(e.sport?.base_fee || e.sports_base_fee || 0);
    const planMultiplier = parseFloat(e.duration_plan?.multiplier || e.plan_multiplier || 1);
    const assignedSportsFee = sportsBaseFee * planMultiplier;
    const registrationFee = parseFloat(e.registration_fee || 0);
    const additionalCharges = parseFloat(e.additional_charges || 0);
    const discount = parseFloat(e.discount || 0);
    return sum + (assignedSportsFee + registrationFee + additionalCharges - discount);
  }, 0);

  const oldestEnrollment = cycleEnrollments[0];
  const cycleStart = new Date(oldestEnrollment.created_at.getTime() - 5000);
  const cycleReceipts = await prisma.receipt.findMany({
    where: {
      student_id: student.student_id,
      academy_id: parseInt(academy_id, 10),
      status: 'COMPLETED',
      created_at: { gte: cycleStart }
    }
  });
  const nonKitReceipts = cycleReceipts.filter(r => !(r.remarks && r.remarks.includes('Sports Kit')));
  const totalPaid = nonKitReceipts.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  const remainingFee = Math.max(0, totalFeesAssigned - totalPaid);

  const netPaymentAmount = paymentAmount - parseFloat(data.extra_amount || 0);
  if (totalFeesAssigned > 0 && remainingFee <= 0 && netPaymentAmount > 0) {
    const error = new Error('Student has already paid all fees for this cycle. No further payments can be accepted.');
    error.statusCode = 400;
    throw error;
  }
  if (totalFeesAssigned > 0 && netPaymentAmount > remainingFee) {
    const error = new Error('Payment amount cannot exceed the remaining fee for this cycle.');
    error.statusCode = 400;
    throw error;
  }

  const generatedReceiptNo = `REC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const receiptData = {

    receipt_number: generatedReceiptNo,

    academy_id: parseInt(academy_id, 10),

    student_id: student.student_id,

    amount: data.amount,

    payment_date: new Date(data.payment_date),

    method: data.method || 'cash',

    status: data.status === 'completed' ? 'COMPLETED' : 'PENDING',

    recorded_by: 'ADMIN',
    recorded_by_name: adminName,
    created_by_user_id: admin_user_id ? parseInt(admin_user_id, 10) : null,
  };

  let receipt;

  try {

    receipt = await prisma.receipt.create({

      data: receiptData,

    });

    logger.info('Payment receipt created', { receipt_id: receipt.receipt_id, student_id: student.student_id });

  } catch (error) {

    logger.error('Failed to create payment receipt', error);

    throw error;

  }

  const extraAmount = parseFloat(data.extra_amount || 0);
  if (extraAmount > 0) {
    await prisma.student.update({
      where: { student_id: student.student_id },
      data: { advance_balance: { increment: extraAmount } }
    });

    await prisma.studentCreditTransaction.create({
      data: {
        student_id: student.student_id,
        academy_id: parseInt(academy_id, 10),
        amount: extraAmount,
        type: 'ADD',
        reason: 'Advance Payment',
        reference_type: 'RECEIPT',
        reference_id: receipt.receipt_id
      }
    });
  }

  if (data.status === 'completed') {

    try {
      const netPaymentAmount = paymentAmount - extraAmount;
      const newTotalPaid = totalPaid + netPaymentAmount;
      let newFeesStatus = 'unpaid';
      if (newTotalPaid >= totalFeesAssigned) {
        newFeesStatus = 'paid';
      } else if (newTotalPaid > 0) {
        newFeesStatus = 'partial';
      }

      // Update active enrollment paid_amount if exists
      const activeEnrollment = await prisma.studentEnrollment.findFirst({
        where: {
          student_id: student.student_id,
          academy_id: parseInt(academy_id, 10),
          is_active: true,
        },
      });
      if (activeEnrollment) {
        const currentPaidAmount = parseFloat(activeEnrollment.paid_amount || 0);
        const newPaidAmount = currentPaidAmount + netPaymentAmount;
        await prisma.studentEnrollment.update({
          where: { enrollment_id: activeEnrollment.enrollment_id },
          data: { paid_amount: newPaidAmount },
        });
      }

      await prisma.student.update({

        where: { student_id: student.student_id },

        data: { fees_status: newFeesStatus },

      });

      logger.info('Student fees status updated dynamically', { student_id: student.student_id, fees_status: newFeesStatus });

    } catch (error) {

      logger.error('Failed to update student fees status', error);

      throw error;

    }

  }



  await logAudit({

    academy_id,

    actor_type: 'ADMIN',

    action: 'PAYMENT_CREATED',

    entity_type: 'Receipt',

    entity_id: receipt.receipt_id,

  });



  // Dispatch email notification asynchronously for COMPLETED or FAILED status

  if (receipt.status === 'COMPLETED' || receipt.status === 'FAILED') {

    setImmediate(async () => {

      try {

        if (student.parent_email) {

          const studentName =

            `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.name;

          const paymentAmount = parseFloat(receipt.amount).toFixed(2);

          const transactionId = receipt.receipt_number;

          const paymentMethod = receipt.method || 'Cash';



          if (receipt.status === 'COMPLETED') {

            await sendPaymentSuccessEmail({

              parentEmail: student.parent_email,

              studentName,

              paymentAmount,

              transactionId,

              paymentMethod,

            });

            logger.info(`Payment success email dispatched to parent: ${student.parent_email}`);

          } else if (receipt.status === 'FAILED') {

            await sendPaymentFailureEmail({

              parentEmail: student.parent_email,

              studentName,

              paymentAmount,

              transactionId,

              paymentMethod,

            });

            logger.info(`Payment failure email dispatched to parent: ${student.parent_email}`);

          }

        } else {

          logger.warn(

            `No parent email found for student_id: ${student.student_id}, skipping email notification`,

          );

        }

      } catch (mailError) {

        logger.error('Failed to dispatch payment email notification', {

          error: mailError.message,

          receipt_id: receipt.receipt_id,

          student_id: student.student_id,

        });

      }

    });

  }



  return receipt;

};



export const updatePaymentStatus = async (

  academy_id,

  payment_id,

  { status, rejected_reason },

  admin_user_id,

) => {

  const payment = await getPaymentForAcademy(academy_id, payment_id);



  if (!payment) {

    const error = new Error('Payment record not found in this workspace');

    error.statusCode = 404;

    throw error;

  }



  const targetStatus = String(status).toUpperCase();

  // Check if trying to mark as COMPLETED
  if (targetStatus === 'COMPLETED') {
    const studentRecord = await prisma.student.findUnique({
      where: { student_id: payment.student_id },
      select: { status: true }
    });
    const isDeactivated = studentRecord && studentRecord.status !== 'ACTIVE';

    const enrollments = await prisma.studentEnrollment.findMany({
      where: { student_id: payment.student_id, academy_id: parseInt(academy_id, 10) },
      include: { sport: true, duration_plan: true }
    });
    const cycleEnrollments = getCurrentCycleEnrollments(enrollments);

    if (!isDeactivated && cycleEnrollments.length === 0) {
      const error = new Error('No active plan found for this student. No payments can be accepted.');
      error.statusCode = 400;
      throw error;
    }

    const totalFeesAssigned = cycleEnrollments.reduce((sum, e) => {
      if (e.final_fee && parseFloat(e.final_fee) > 0) {
        return sum + parseFloat(e.final_fee);
      }
      const sportsBaseFee = parseFloat(e.sport?.base_fee || e.sports_base_fee || 0);
      const planMultiplier = parseFloat(e.duration_plan?.multiplier || e.plan_multiplier || 1);
      const storedSportsFee = parseFloat(e.sports_fee || 0);
      const sportsFee = storedSportsFee > 0 ? storedSportsFee : (sportsBaseFee * planMultiplier);
      const registrationFee = parseFloat(e.registration_fee || 0);
      const additionalCharges = parseFloat(e.additional_charges || 0);
      const discount = parseFloat(e.discount || 0);
      return sum + (sportsFee + registrationFee + additionalCharges - discount);
    }, 0);

    const oldestEnrollment = cycleEnrollments[0];
    const cycleStart = oldestEnrollment ? new Date(oldestEnrollment.created_at.getTime() - 5000) : new Date(0);
    const cycleReceipts = await prisma.receipt.findMany({
      where: {
        student_id: payment.student_id,
        academy_id: parseInt(academy_id, 10),
        status: 'COMPLETED',
        created_at: { gte: cycleStart },
        receipt_id: { not: payment.receipt_id } // Exclude this payment since it is not marked COMPLETED yet in the DB
      }
    });
    const currentPaidAmount = cycleReceipts.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
    const remainingFee = Math.max(0, totalFeesAssigned - currentPaidAmount);

    // Only block when there IS a fee assigned AND the cycle is already fully paid (and student is active)
    if (!isDeactivated && totalFeesAssigned > 0 && remainingFee <= 0) {
      const error = new Error('Student has already paid all fees for this cycle. No further payments can be accepted.');
      error.statusCode = 400;
      throw error;
    }

    // Only check overpayment when there IS a fee assigned (and student is active)
    if (!isDeactivated && totalFeesAssigned > 0 && Math.round(parseFloat(payment.amount) * 100) / 100 > Math.round(remainingFee * 100) / 100) {
      const error = new Error('Payment amount cannot exceed the remaining fee for this cycle.');
      error.statusCode = 400;
      throw error;
    }
  }




  const updatedReceipt = await prisma.receipt.update({

    where: { receipt_id: payment.receipt_id },

    data: {

      status: targetStatus === 'COMPLETED' ? 'COMPLETED' : 'FAILED',

      approved_by_user_id:

        targetStatus === 'COMPLETED' ? admin_user_id : payment.approved_by_user_id,

      rejected_reason:

        targetStatus === 'REJECTED' || targetStatus === 'FAILED' ? rejected_reason || null : null,

    },

  });



  if (targetStatus === 'COMPLETED') {
    // Get cycle enrollments
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { student_id: payment.student_id, academy_id: parseInt(academy_id, 10) },
      include: { sport: true, duration_plan: true }
    });
    const cycleEnrollments = getCurrentCycleEnrollments(enrollments);
    const activeEnrollment = enrollments.find(e => e.is_active) || cycleEnrollments[0] || enrollments[enrollments.length - 1] || null;
    let newFeesStatus = 'unpaid';

    if (cycleEnrollments.length > 0) {
      const oldestEnrollment = cycleEnrollments[0];
      const cycleStart = new Date(oldestEnrollment.created_at.getTime() - 5000);
      
      // Calculate total paid excluding this payment (since it's now completed)
      const studentLedger = await prisma.receipt.aggregate({
        where: {
          student_id: payment.student_id,
          academy_id: parseInt(academy_id, 10),
          status: { in: ['COMPLETED', 'PAID', 'APPROVED'] },
          created_at: { gte: cycleStart },
          receipt_id: { not: payment.receipt_id }
        },
        _sum: { amount: true }
      });
      const totalPaidOld = studentLedger._sum.amount || 0;
      const newTotalPaid = Number(totalPaidOld) + parseFloat(payment.amount);

      // Get total fees assigned dynamically
      const totalFeesAssigned = cycleEnrollments.reduce((sum, e) => {
        const sportsBaseFee = parseFloat(e.sport?.base_fee || e.sports_base_fee || 0);
        const planMultiplier = parseFloat(e.duration_plan?.multiplier || e.plan_multiplier || 1);
        const assignedSportsFee = sportsBaseFee * planMultiplier;
        const registrationFee = parseFloat(e.registration_fee || 0);
        const additionalCharges = parseFloat(e.additional_charges || 0);
        const discount = parseFloat(e.discount || 0);
        return sum + (assignedSportsFee + registrationFee + additionalCharges - discount);
      }, 0);

      if (newTotalPaid >= totalFeesAssigned) {
        newFeesStatus = 'paid';
      } else if (newTotalPaid > 0) {
        newFeesStatus = 'partial';
      }

      // Also update active enrollment paid_amount if exists
      if (activeEnrollment) {
        const currentPaidAmount = parseFloat(activeEnrollment.paid_amount || 0);
        const newPaidAmount = currentPaidAmount + parseFloat(payment.amount);
        await prisma.studentEnrollment.update({
          where: { enrollment_id: activeEnrollment.enrollment_id },
          data: { paid_amount: newPaidAmount }
        });
      }
    }

    await prisma.student.update({
      where: { student_id: payment.student_id },
      data: { fees_status: newFeesStatus },
    });
  } else {
    // If rejected or failed, recompute the status based on current payments (excluding this payment since it failed)
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { student_id: payment.student_id, academy_id: parseInt(academy_id, 10) },
      include: { sport: true, duration_plan: true }
    });
    const cycleEnrollments = getCurrentCycleEnrollments(enrollments);
    let newFeesStatus = 'unpaid';

    if (cycleEnrollments.length > 0) {
      const oldestEnrollment = cycleEnrollments[0];
      const cycleStart = new Date(oldestEnrollment.created_at.getTime() - 5000);
      const studentLedger = await prisma.receipt.aggregate({
        where: {
          student_id: payment.student_id,
          academy_id: parseInt(academy_id, 10),
          status: { in: ['COMPLETED', 'PAID', 'APPROVED'] },
          created_at: { gte: cycleStart },
          receipt_id: { not: payment.receipt_id }
        },
        _sum: { amount: true }
      });
      const totalPaid = studentLedger._sum.amount || 0;

      // Get total fees assigned dynamically
      const totalFeesAssigned = cycleEnrollments.reduce((sum, e) => {
        const sportsBaseFee = parseFloat(e.sport?.base_fee || e.sports_base_fee || 0);
        const planMultiplier = parseFloat(e.duration_plan?.multiplier || e.plan_multiplier || 1);
        const assignedSportsFee = sportsBaseFee * planMultiplier;
        const registrationFee = parseFloat(e.registration_fee || 0);
        const additionalCharges = parseFloat(e.additional_charges || 0);
        const discount = parseFloat(e.discount || 0);
        return sum + (assignedSportsFee + registrationFee + additionalCharges - discount);
      }, 0);

      if (totalPaid >= totalFeesAssigned) {
        newFeesStatus = 'paid';
      } else if (totalPaid > 0) {
        newFeesStatus = 'partial';
      }
    }

    await prisma.student.update({
      where: { student_id: payment.student_id },
      data: { fees_status: newFeesStatus },
    });
  }



  await logAudit({

    academy_id,

    actor_type: 'ADMIN',

    actor_id: admin_user_id,

    action: 'PAYMENT_STATUS_UPDATED',

    entity_type: 'Receipt',

    entity_id: payment.receipt_id,

    metadata: { status: targetStatus },

  });



  // Dispatch email notification asynchronously for COMPLETED or FAILED status

  if (targetStatus === 'COMPLETED' || targetStatus === 'FAILED') {

    setImmediate(async () => {

      try {

        if (payment.student && payment.student.parent_email) {

          const studentName =

            `${payment.student.first_name || ''} ${payment.student.last_name || ''}`.trim() ||

            payment.student.name;

          const paymentAmount = parseFloat(updatedReceipt.amount).toFixed(2);

          const transactionId = updatedReceipt.receipt_number;

          const paymentMethod = updatedReceipt.method || 'Cash';



          if (targetStatus === 'COMPLETED') {

            await sendPaymentSuccessEmail({

              parentEmail: payment.student.parent_email,

              studentName,

              paymentAmount,

              transactionId,

              paymentMethod,

            });

            logger.info(

              `Payment success email dispatched to parent: ${payment.student.parent_email}`,

            );

          } else if (targetStatus === 'FAILED') {

            await sendPaymentFailureEmail({

              parentEmail: payment.student.parent_email,

              studentName,

              paymentAmount,

              transactionId,

              paymentMethod,

            });

            logger.info(

              `Payment failure email dispatched to parent: ${payment.student.parent_email}`,

            );

          }

        } else {

          logger.warn(

            `No parent email found for student_id: ${payment.student_id}, skipping email notification`,

          );

        }

      } catch (mailError) {

        logger.error('Failed to dispatch payment status update email notification', {

          error: mailError.message,

          receipt_id: updatedReceipt.receipt_id,

          student_id: payment.student_id,

        });

      }

    });

  }



  return updatedReceipt;

};



// ==================== ANALYTICS ====================



export const getAcademyReport = async (academy_id) => {
  try {
    const academyId = parseInt(academy_id, 10);
    const activeStudentFilter = { academy_id: academyId, status: 'ACTIVE', is_deleted: false, auto_deactivated: false };

    // 1. Total Collection
    const totalCollectionRes = await prisma.receipt.aggregate({
      where: {
        academy_id: academyId,
        status: 'COMPLETED'
      },
      _sum: { amount: true }
    });
    const totalCollection = totalCollectionRes._sum.amount || 0;

    // 2. Today's Collection
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todaysCollectionRes = await prisma.receipt.aggregate({
      where: {
        academy_id: academyId,
        status: 'COMPLETED',
        payment_date: {
          gte: startOfToday,
          lte: endOfToday
        }
      },
      _sum: { amount: true }
    });
    const todaysCollection = todaysCollectionRes._sum.amount || 0;

    // 3. Fetch all active students and calculate their total computed fee vs paid to get accurate Pending Fees
    const activeStudents = await prisma.student.findMany({
      where: activeStudentFilter,
      include: {
        enrollments: {
          where: { is_active: true },
          include: { sport: true, duration_plan: true }
        },
        receipts: {
          where: { status: 'COMPLETED' }
        }
      }
    });

    let pendingFees = 0;
    let studentsWithPendingFees = 0;

    activeStudents.forEach(student => {
      // Calculate total fees assigned from active enrollments
      const totalFeeDue = student.enrollments.reduce((sum, e) => {
        const sportsBaseFee = parseFloat(e.sport?.base_fee || e.sports_base_fee || 0);
        const planMultiplier = parseFloat(e.duration_plan?.multiplier || e.plan_multiplier || 1);
        const assignedSportsFee = sportsBaseFee * planMultiplier;
        const registrationFee = parseFloat(e.registration_fee || 0);
        const additionalCharges = parseFloat(e.additional_charges || 0);
        const discount = parseFloat(e.discount || 0);
        return sum + (assignedSportsFee + registrationFee + additionalCharges - discount);
      }, 0);

      // Calculate total paid from completed receipts
      const totalPaid = student.receipts.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

      const balance = Math.max(0, totalFeeDue - totalPaid);
      if (balance > 0) {
        pendingFees += balance;
        studentsWithPendingFees += 1;
      }
    });

    // 4. Recent Payments (last 10 completed receipts)
    const recentPayments = await prisma.receipt.findMany({
      where: {
        academy_id: academyId,
        status: 'COMPLETED'
      },
      include: {
        student: true
      },
      orderBy: {
        payment_date: 'desc'
      },
      take: 10
    });

    // 5. Monthly Collection Chart (grouped by month for the last 6 months)
    const allCompletedReceipts = await prisma.receipt.findMany({
      where: {
        academy_id: academyId,
        status: 'COMPLETED'
      },
      orderBy: {
        payment_date: 'asc'
      }
    });

    const monthlyGroups = {};
    allCompletedReceipts.forEach(r => {
      const date = new Date(r.payment_date);
      const key = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      monthlyGroups[key] = (monthlyGroups[key] || 0) + parseFloat(r.amount);
    });

    const monthlyCollectionChart = Object.keys(monthlyGroups).map(key => ({
      month: key,
      amount: monthlyGroups[key]
    })).slice(-6);

    const activeCoachCount = await prisma.coach.count({ where: { academy_id: academyId, is_deleted: false } });
    const totalBatches = await prisma.batch.count({ where: { academy_id: academyId, status: 'ACTIVE' } });

    return {
      total_collection: totalCollection,
      pending_fees: pendingFees,
      students_with_pending_fees: studentsWithPendingFees,
      todays_collection: todaysCollection,
      recent_payments: recentPayments,
      monthly_collection_chart: monthlyCollectionChart,
      
      // Keep other counters for dashboard backward compatibility
      active_student_count: activeStudents.length,
      active_coach_count: activeCoachCount,
      total_batches: totalBatches,
      total_revenue: totalCollection,
      pending_dues: pendingFees,
      payment_summary: {
        paid_students: activeStudents.length - studentsWithPendingFees,
        unpaid_students: studentsWithPendingFees
      }
    };
  } catch (error) {
    logger.error('Error in getAcademyReport', error);
    return {
      total_collection: 0,
      pending_fees: 0,
      students_with_pending_fees: 0,
      todays_collection: 0,
      recent_payments: [],
      monthly_collection_chart: [],
      active_student_count: 0,
      active_coach_count: 0,
      total_batches: 0,
      total_revenue: 0,
      pending_dues: 0,
      payment_summary: {
        paid_students: 0,
        unpaid_students: 0
      }
    };
  }

};

// Performance-related controllers removed - use /performance module routes instead



// ==================== PERFORMANCE TRACKER ====================

// NOTE: Performance-related services removed - use /performance module services instead



// ==================== ATTENDANCE ====================



export const getAttendance = async (academy_id, query = {}) => {

  const academyId = parseInt(academy_id, 10);

  const { from, to, batch_id, student_id, status } = query;



  const where = {

    academy_id: academyId,

  };



  if (from || to) {

    where.date = {};

    if (from) where.date.gte = new Date(from);

    if (to) where.date.lte = new Date(to);

  }



  if (batch_id) {

    where.batch_id = parseInt(batch_id, 10);

  }



  if (student_id) {

    where.student_id = parseInt(student_id, 10);

  }



  if (status) {

    where.status = status;

  }



  const attendance = await prisma.studentAttendance.findMany({

    where,

    include: {

      student: {

        select: {

          student_id: true,

          name: true,

        },

      },

      batch: {

        select: {

          batch_id: true,

          name: true,

        },

      },

      coach: {

        select: {

          coach_id: true,

          name: true,

        },

      },

    },

    orderBy: { date: 'desc' },

  });



  return attendance.map((a) => ({

    ...a,

    id: a.attendance_id,

  }));

};



// ==================== SMART BROADCAST CENTER ====================



export const getAnnouncements = async (academy_id) => {

  const academyId = parseInt(academy_id, 10);



  const announcements = await prisma.announcement.findMany({

    where: { academy_id: academyId },

    include: {

      batch: {

        select: {

          batch_id: true,

          name: true,

        },

      },

    },

    orderBy: { created_at: 'desc' },

    take: 50,

  });



  return announcements.map((a) => ({

    ...a,

    id: a.announcement_id,

  }));

};



export const createAnnouncement = async (academy_id, data) => {

  const academyId = parseInt(academy_id, 10);

  const { title, message, target_type, batch_id, selected_coach_ids, selected_student_ids } = data;



  // Create announcement record

  const announcement = await prisma.announcement.create({

    data: {

      academy_id: academyId,

      title: title.trim(),

      message: message.trim(),

      target_type: target_type,

      batch_id: batch_id ? parseInt(batch_id, 10) : null,

      category: 'ANNOUNCEMENT',

    },

    include: {

      batch: {

        select: {

          batch_id: true,

          name: true,

        },

      },

    },

  });



  // Fetch recipient emails and create in-app notifications based on target type

  let recipientEmails = [];

  let inAppNotifications = [];



  switch (target_type) {

    case 'ALL_COACHES':

      const coaches = await prisma.coach.findMany({

        where: {

          academy_id: academyId,

          is_deleted: false,

          email: { not: null },

        },

        select: { coach_id: true, email: true, name: true },

      });

      recipientEmails = coaches.map((c) => ({ email: c.email, name: c.name }));

      // Create in-app notifications for all coaches

      inAppNotifications = coaches.map((c) => ({

        announcement_id: announcement.announcement_id,

        coach_id: c.coach_id,

        student_id: null,

        is_read: false,

      }));

      break;



    case 'SPECIFIC_COACHES':

      if (!selected_coach_ids || selected_coach_ids.length === 0) {

        const error = new Error('selected_coach_ids is required for SPECIFIC_COACHES target type');

        error.statusCode = 400;

        throw error;

      }

      const specificCoaches = await prisma.coach.findMany({

        where: {

          academy_id: academyId,

          is_deleted: false,

          coach_id: { in: selected_coach_ids.map((id) => parseInt(id, 10)) },

          email: { not: null },

        },

        select: { coach_id: true, email: true, name: true },

      });

      recipientEmails = specificCoaches.map((c) => ({ email: c.email, name: c.name }));

      // Create in-app notifications for specific coaches

      inAppNotifications = specificCoaches.map((c) => ({

        announcement_id: announcement.announcement_id,

        coach_id: c.coach_id,

        student_id: null,

        is_read: false,

      }));

      break;



    case 'BATCH_COACHES':

      if (!batch_id) {

        const error = new Error('batch_id is required for BATCH_COACHES target type');

        error.statusCode = 400;

        throw error;

      }

      const batchCoaches = await prisma.batchCoach.findMany({

        where: {

          batch_id: parseInt(batch_id, 10),

        },

        include: {

          coach: {

            select: { coach_id: true, email: true, name: true },

          },

        },

      });

      const validBatchCoaches = batchCoaches

        .filter((bc) => bc.coach.email)

        .map((bc) => ({ email: bc.coach.email, name: bc.coach.name, coach_id: bc.coach.coach_id }));

      recipientEmails = validBatchCoaches.map((c) => ({ email: c.email, name: c.name }));

      // Create in-app notifications for batch coaches

      inAppNotifications = validBatchCoaches.map((c) => ({

        announcement_id: announcement.announcement_id,

        coach_id: c.coach_id,

        student_id: null,

        is_read: false,

      }));

      break;



    case 'PARENTS_ALL':

      const allStudents = await prisma.student.findMany({

        where: {

          academy_id: academyId,

          is_deleted: false,

          parent_email: { not: null },

        },

        select: { student_id: true, parent_email: true, name: true },

      });

      recipientEmails = allStudents.map((s) => ({ email: s.parent_email, name: s.name }));

      // Create in-app notifications for all students (parents)

      inAppNotifications = allStudents.map((s) => ({

        announcement_id: announcement.announcement_id,

        coach_id: null,

        student_id: s.student_id,

        is_read: false,

      }));

      break;



    case 'PARENTS_DUE':

      const dueStudents = await prisma.student.findMany({

        where: {

          academy_id: academyId,

          is_deleted: false,

          fees_status: 'unpaid',

          parent_email: { not: null },

        },

        select: { student_id: true, parent_email: true, name: true },

      });

      recipientEmails = dueStudents.map((s) => ({ email: s.parent_email, name: s.name }));

      // Create in-app notifications for due students (parents)

      inAppNotifications = dueStudents.map((s) => ({

        announcement_id: announcement.announcement_id,

        coach_id: null,

        student_id: s.student_id,

        is_read: false,

      }));

      break;



    case 'SPECIFIC_PARENTS':

      if (!selected_student_ids || selected_student_ids.length === 0) {

        const error = new Error(

          'selected_student_ids is required for SPECIFIC_PARENTS target type',

        );

        error.statusCode = 400;

        throw error;

      }

      const specificStudents = await prisma.student.findMany({

        where: {

          academy_id: academyId,

          is_deleted: false,

          student_id: { in: selected_student_ids.map((id) => parseInt(id, 10)) },

          parent_email: { not: null },

        },

        select: { student_id: true, parent_email: true, name: true },

      });

      recipientEmails = specificStudents.map((s) => ({ email: s.parent_email, name: s.name }));

      // Create in-app notifications for specific students (parents)

      inAppNotifications = specificStudents.map((s) => ({

        announcement_id: announcement.announcement_id,

        coach_id: null,

        student_id: s.student_id,

        is_read: false,

      }));

      break;



    default:

      const error = new Error('Invalid target_type');

      error.statusCode = 400;

      throw error;

  }



  // Create in-app notifications in bulk

  if (inAppNotifications.length > 0) {

    try {

      await prisma.inAppNotification.createMany({

        data: inAppNotifications,

      });

      logger.info('In-app notifications created', {

        count: inAppNotifications.length,

        announcement_id: announcement.announcement_id,

      });

    } catch (error) {

      logger.error('Failed to create in-app notifications', {

        error: error.message,

      });

      // Continue with email dispatch even if in-app notifications fail

    }

  }



  // Send emails to all recipients

  const emailPromises = recipientEmails.map((recipient) =>

    sendBroadcastEmail({

      to: recipient.email,

      recipientName: recipient.name,

      title: title,

      message: message,

    }).catch((err) => {

      logger.error('Failed to send broadcast email', {

        email: recipient.email,

        error: err.message,

      });

      return null;

    }),

  );



  const emailResults = await Promise.all(emailPromises);

  const successfulEmails = emailResults.filter(Boolean).length;



  logger.info('Announcement created and emails dispatched', {

    announcement_id: announcement.announcement_id,

    academy_id: academyId,

    target_type: target_type,

    total_recipients: recipientEmails.length,

    successful_emails: successfulEmails,

    in_app_notifications: inAppNotifications.length,

  });



  return {

    ...announcement,

    id: announcement.announcement_id,

    email_stats: {

      total_recipients: recipientEmails.length,

      successful_emails: successfulEmails,

    },

    notification_stats: {

      total_notifications: inAppNotifications.length,

    },

  };

};



export const getCoachNotifications = async (coach_id) => {

  const coachId = parseInt(coach_id, 10);



  const notifications = await prisma.inAppNotification.findMany({

    where: {

      coach_id: coachId,

    },

    include: {

      announcement: {

        select: {

          announcement_id: true,

          title: true,

          message: true,

          created_at: true,

        },

      },

    },

    orderBy: { created_at: 'desc' },

    take: 50,

  });



  return notifications.map((n) => ({

    ...n,

    id: n.notification_id,

  }));

};



export const markNotificationAsRead = async (notification_id) => {

  const notificationId = parseInt(notification_id, 10);



  const notification = await prisma.inAppNotification.update({

    where: { notification_id: notificationId },

    data: { is_read: true },

  });



  logger.info('Notification marked as read', { notification_id: notificationId });



  return notification;

};



const sendBroadcastEmail = async ({ to, recipientName, title, message }) => {

  const subject = `${title} — SAMS Academy Announcement`;



  const html = `

    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: ${to.includes('@') ? '#f8fafc' : '#ffffff'};">

      <h2 style="color: #059669; margin-bottom: 8px;">SAMS Academy Announcement</h2>

      <p style="font-size: 14px; color: #64748b; margin-top: 0;">Important Update</p>

      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />

      <p>Dear <strong>${recipientName || 'Parent/Guardian'}</strong>,</p>

      <p style="font-size: 16px; font-weight: 600; color: #1e293b; margin: 16px 0;">${title}</p>

      <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">

        <p style="margin: 0; line-height: 1.6; color: #334155;">${message}</p>

      </div>

      <p style="font-size: 13px; color: #64748b; margin-top: 20px;">If you have any questions, please contact the academy administration.</p>

      <p style="font-size: 12px; color: #94a3b8; margin-top: 16px;">This is an automated message from SAMS Academy.</p>

    </div>

  `;



  const text = [

    `Dear ${recipientName || 'Parent/Guardian'},`,

    '',

    `SAMS Academy Announcement`,

    '',

    `${title}`,

    '',

    `${message}`,

    '',

    'If you have any questions, please contact the academy administration.',

    '',

    'This is an automated message from SAMS Academy.',

  ].join('\n');



  const { sendMail } = await import('../../services/mail.service.js');

  return sendMail({ to, subject, html, text });

};

export const assertSubscriptionLimits = async (academyId, type) => {
  const academy = await prisma.academy.findUnique({
    where: { academy_id: academyId }
  });
  if (!academy) {
    throw new Error("Academy not found");
  }

  const setting = await prisma.globalSetting.findUnique({
    where: { setting_key: 'platform_subscription_plans' }
  });
  let activePlans = [];
  if (setting) {
    try {
      activePlans = JSON.parse(setting.setting_value);
    } catch (e) {}
  }

  const planName = academy.subscription_plan || academy.subscription_tier;
  const activePlan = activePlans.find(p => p.id === planName || p.name === planName) || {
    teacher_limit: academy.subscription_tier === 'FREE' ? 3 : academy.subscription_tier === 'PRO' ? 6 : null,
    student_limit: academy.subscription_tier === 'FREE' ? 10 : academy.subscription_tier === 'PRO' ? 80 : null
  };

  if (type === 'coach') {
    const maxCoaches = activePlan.teacher_limit;
    if (maxCoaches !== null && maxCoaches !== undefined) {
      const activeCoaches = await prisma.coach.count({
        where: { academy_id: academyId, is_deleted: false, status: 'ACTIVE' }
      });
      if (activeCoaches >= maxCoaches) {
        const error = new Error(`Coach limit reached (${maxCoaches} coaches maximum). Upgrade your plan to add more coaches.`);
        error.statusCode = 403;
        throw error;
      }
    }
  } else if (type === 'student') {
    const maxStudents = activePlan.student_limit;
    if (maxStudents !== null && maxStudents !== undefined) {
      const activeStudents = await prisma.student.count({
        where: { academy_id: academyId, is_deleted: false, status: 'ACTIVE' }
      });
      if (activeStudents >= maxStudents) {
        const error = new Error(`Student limit reached (${maxStudents} students maximum). Upgrade your plan to add more students.`);
        error.statusCode = 403;
        throw error;
      }
    }
  }
};

export const getSubscriptionStatusWithCounts = async (academy_id) => {
  const academyId = parseInt(academy_id, 10);
  
  const academy = await prisma.academy.findUnique({
    where: { academy_id: academyId }
  });

  if (!academy) {
    throw new Error('Academy not found');
  }

  const { getSubscriptionStatus: getSubStatus } = await import('../../config/subscription.config.js');
  const subscription = getSubStatus(academy);
  
  // Get current counts
  const [activeCoaches, activeStudents, allCoaches, allStudents] = await Promise.all([
    prisma.coach.count({
      where: { academy_id: academyId, is_deleted: false, status: 'ACTIVE' }
    }),
    prisma.student.count({
      where: { academy_id: academyId, is_deleted: false, status: 'ACTIVE' }
    }),
    prisma.coach.count({
      where: { academy_id: academyId, is_deleted: false }
    }),
    prisma.student.count({
      where: { academy_id: academyId, is_deleted: false }
    })
  ]);

  return {
    expired: subscription.expired,
    plan: subscription.plan,
    expiresAt: subscription.expiresAt,
    daysLeft: subscription.daysLeft,
    limits: subscription.limits,
    currentUsage: {
      coaches: activeCoaches,
      students: activeStudents
    },
    totalRecords: {
      coaches: allCoaches,
      students: allStudents
    },
    needsSelection: subscription.expired && (allCoaches > 3 || allStudents > 10)
  };
};

export const selectFreePlan = async (academy_id, selectedCoaches, selectedStudents) => {
  const academyId = parseInt(academy_id, 10);

  return await prisma.$transaction(async (tx) => {
    const academy = await tx.academy.findUnique({
      where: { academy_id: academyId }
    });

    if (!academy) {
      const error = new Error('Academy not found');
      error.statusCode = 404;
      throw error;
    }

    // Get all coaches and students for this academy
    const [allCoaches, allStudents] = await Promise.all([
      tx.coach.findMany({
        where: { academy_id: academyId, is_deleted: false },
        select: { coach_id: true, status: true }
      }),
      tx.student.findMany({
        where: { academy_id: academyId, is_deleted: false },
        select: { student_id: true, status: true }
      })
    ]);

    // Validate selections
    const selectedCoachIds = selectedCoaches || [];
    const selectedStudentIds = selectedStudents || [];

    if (selectedCoachIds.length > 3) {
      const error = new Error('Cannot select more than 3 coaches for Free Plan');
      error.statusCode = 400;
      throw error;
    }

    if (selectedStudentIds.length > 10) {
      const error = new Error('Cannot select more than 10 students for Free Plan');
      error.statusCode = 400;
      throw error;
    }

    // Validate that selected IDs belong to this academy
    const validCoachIds = allCoaches.map(c => c.coach_id);
    const validStudentIds = allStudents.map(s => s.student_id);

    for (const coachId of selectedCoachIds) {
      if (!validCoachIds.includes(parseInt(coachId, 10))) {
        const error = new Error('Invalid coach selection');
        error.statusCode = 400;
        throw error;
      }
    }

    for (const studentId of selectedStudentIds) {
      if (!validStudentIds.includes(parseInt(studentId, 10))) {
        const error = new Error('Invalid student selection');
        error.statusCode = 400;
        throw error;
      }
    }

    // Lock excess coaches
    for (const coach of allCoaches) {
      const isSelected = selectedCoachIds.includes(coach.coach_id);
      if (!isSelected && coach.status === 'ACTIVE') {
        await tx.coach.update({
          where: { coach_id: coach.coach_id },
          data: { status: 'INACTIVE' }
        });
      }
    }

    // Lock excess students
    for (const student of allStudents) {
      const isSelected = selectedStudentIds.includes(student.student_id);
      if (!isSelected && student.status === 'ACTIVE') {
        await tx.student.update({
          where: { student_id: student.student_id },
          data: { status: 'INACTIVE' }
        });
      }
    }

    // Update academy to free plan
    await tx.academy.update({
      where: { academy_id: academyId },
      data: {
        subscription_plan: 'free',
        subscription_tier: 'FREE',
        subscription_expires_at: null
      }
    });

    return {
      success: true,
      message: 'Successfully moved to Free Plan',
      selectedCoaches: selectedCoachIds.length,
      selectedStudents: selectedStudentIds.length,
      lockedCoaches: allCoaches.length - selectedCoachIds.length,
      lockedStudents: allStudents.length - selectedStudentIds.length
    };
  });
};

export const getSubscriptionDetails = async (academy_id) => {
  const academyId = parseInt(academy_id, 10);
  
  const [academy, activeCoaches, activeStudents, paymentsData] = await Promise.all([
    prisma.academy.findUnique({
      where: { academy_id: academyId }
    }),
    prisma.coach.count({
      where: { academy_id: academyId, is_deleted: false, status: 'ACTIVE' }
    }),
    prisma.student.count({
      where: { academy_id: academyId, is_deleted: false, status: 'ACTIVE' }
    }),
    prisma.globalSetting.findUnique({
      where: { setting_key: 'platform_payments' }
    })
  ]);

  if (!academy) {
    throw new Error('Academy not found');
  }

  const { listPlans } = await import('../super-admin/super-admin.service.js');
  const plans = await listPlans();
  const activePlan = plans.find(p => p.id === academy.subscription_plan) || {
    name: academy.subscription_plan || academy.subscription_tier,
    teacher_limit: academy.subscription_tier === 'FREE' ? 3 : academy.subscription_tier === 'PRO' ? 6 : null,
    student_limit: academy.subscription_tier === 'FREE' ? 10 : academy.subscription_tier === 'PRO' ? 80 : null,
    features: academy.subscription_tier === 'FREE' 
      ? ['Smart batch scheduling tracking', 'Automated email notification systems', 'Standard portal access support'] 
      : ['Advanced analytic dashboard data', 'Pending fee transaction metrics', 'Priority live support channels']
  };

  const now = new Date();
  const isExpired = academy.subscription_expires_at ? new Date(academy.subscription_expires_at) < now : false;
  const daysRemaining = academy.subscription_expires_at
    ? Math.max(0, Math.ceil((new Date(academy.subscription_expires_at) - now) / (1000 * 60 * 60 * 24)))
    : null;

  let allPayments = [];
  if (paymentsData) {
    try {
      allPayments = JSON.parse(paymentsData.setting_value);
    } catch (e) {}
  }
  const academyPayments = allPayments.filter(p => parseInt(p.academy_id, 10) === academyId);

  const hasPayments = academyPayments.some(p => p.status === 'COMPLETED');
  let trialStatus = 'Paid';
  if (!hasPayments) {
    trialStatus = isExpired ? 'Trial Expired' : 'Active Trial';
  }

  return {
    current_plan: activePlan.name,
    plan_id: activePlan.id || 'free',
    plan_status: academy.status,
    trial_status: trialStatus,
    start_date: academy.subscription_starts_at,
    expiry_date: academy.subscription_expires_at,
    days_remaining: daysRemaining,
    teacher_usage: activeCoaches,
    teacher_limit: activePlan.teacher_limit,
    student_usage: activeStudents,
    student_limit: activePlan.student_limit,
    plan_features: activePlan.features,
    payment_history: academyPayments
  };
};

export const getSuperAdminPlans = async () => {
  const { listPlans } = await import('../super-admin/super-admin.service.js');
  return listPlans();
};

export const getPaymentSettings = async () => {
  const { getPaymentsData } = await import('../super-admin/super-admin.service.js');
  const data = await getPaymentsData();
  return data.settings;
};

export const purchaseSubscription = async (academy_id, data, user_id, ip) => {
  const academyId = parseInt(academy_id, 10);
  const plans = await getSuperAdminPlans();
  const plan = plans.find(p => p.id === data.plan_id);
  
  if (!plan) {
    throw new Error('Plan not found');
  }

  const academy = await prisma.academy.findUnique({
    where: { academy_id: academyId }
  });

  const txSetting = await prisma.globalSetting.findUnique({
    where: { setting_key: 'platform_payments' }
  });

  let transactions = [];
  if (txSetting) {
    try {
      transactions = JSON.parse(txSetting.setting_value);
    } catch (e) {}
  }

  const newTx = {
    id: 'tx_' + Date.now(),
    academy_id: academyId,
    academy_name: academy?.name || 'Academy #' + academyId,
    plan_id: plan.id,
    plan_name: plan.name,
    amount: parseFloat(data.amount || plan.price),
    payment_method: data.payment_method || 'UPI',
    transaction_id: data.transaction_id,
    coupon_code: data.coupon_code || null,
    status: data.auto_approve ? 'COMPLETED' : 'PENDING',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  transactions.unshift(newTx);

  await prisma.globalSetting.upsert({
    where: { setting_key: 'platform_payments' },
    create: { setting_key: 'platform_payments', setting_value: JSON.stringify(transactions) },
    update: { setting_value: JSON.stringify(transactions) }
  });

  if (newTx.status === 'COMPLETED') {
    const expiresAt = new Date();
    if (plan.duration === 'Yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else if (plan.duration === 'Half-Yearly') {
      expiresAt.setMonth(expiresAt.getMonth() + 6);
    } else if (plan.duration === 'Quarterly') {
      expiresAt.setMonth(expiresAt.getMonth() + 3);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    let subscriptionTier = 'FREE';
    const lowercaseId = String(plan.id).toLowerCase();
    if (lowercaseId.includes('plus')) {
      subscriptionTier = 'PLUS';
    } else if (lowercaseId.includes('pro')) {
      subscriptionTier = 'PRO';
    }

    // Reactivate all inactive coaches and students when upgrading from free plan
    const previousTier = academy.subscription_tier;
    if (previousTier === 'FREE' && subscriptionTier !== 'FREE') {
      await prisma.$transaction(async (tx) => {
        // Reactivate all inactive coaches
        await tx.coach.updateMany({
          where: { 
            academy_id: academyId, 
            is_deleted: false, 
            status: 'INACTIVE' 
          },
          data: { status: 'ACTIVE' }
        });

        // Reactivate all inactive students
        await tx.student.updateMany({
          where: { 
            academy_id: academyId, 
            is_deleted: false, 
            status: 'INACTIVE' 
          },
          data: { status: 'ACTIVE' }
        });

        // Update academy subscription
        await tx.academy.update({
          where: { academy_id: academyId },
          data: {
            subscription_plan: plan.id,
            subscription_tier: subscriptionTier,
            subscription_starts_at: new Date(),
            subscription_expires_at: expiresAt,
            status: 'ACTIVE'
          }
        });
      });
    } else {
      // Normal update without reactivation
      await prisma.academy.update({
        where: { academy_id: academyId },
        data: {
          subscription_plan: plan.id,
          subscription_tier: subscriptionTier,
          subscription_starts_at: new Date(),
          subscription_expires_at: expiresAt,
          status: 'ACTIVE'
        }
      });
    }

    await prisma.notification.create({
      data: {
        academy_id: academyId,
        user_id,
        type: 'GENERAL',
        title: 'Subscription Activated',
        body: `Your payment was verified. Your academy subscription to ${plan.name} has been activated until ${expiresAt.toLocaleDateString()}!`,
        metadata: JSON.stringify({ subtype: 'payment_success', transaction_id: newTx.id })
      }
    });

    await prisma.notification.create({
      data: {
        type: 'GENERAL',
        title: 'New Plan Purchase Success',
        body: `Academy "${academy?.name}" purchased ${plan.name} for ₹${newTx.amount} (Tx ID: ${newTx.transaction_id}).`,
        metadata: JSON.stringify({ subtype: 'plan_purchase', academy_id: academyId, plan_id: plan.id })
      }
    });
  } else {
    await prisma.notification.create({
      data: {
        type: 'GENERAL',
        title: 'New Subscription Payment Pending',
        body: `Academy "${academy?.name}" submitted a payment reference for ${plan.name} (Tx ID: ${newTx.transaction_id}). Review required.`,
        metadata: JSON.stringify({ subtype: 'payment_pending', academy_id: academyId, plan_id: plan.id, tx_id: newTx.id })
      }
    });
  }

  await logAudit({
    actor_type: 'ACADEMY_ADMIN',
    actor_id: user_id,
    action: 'SUBSCRIPTION_PURCHASE_SUBMITTED',
    entity_type: 'GlobalSetting',
    metadata: { plan_id: plan.id, amount: newTx.amount },
    ip_address: ip
  });

  return newTx;
};

export const getAcademyNotifications = async (academy_id, user_id) => {
  const academyId = parseInt(academy_id, 10);
  
  const notifications = await prisma.notification.findMany({
    where: {
      academy_id: academyId,
      user_id: parseInt(user_id, 10)
    },
    orderBy: { created_at: 'desc' },
    take: 50
  });

  return notifications.map(n => ({
    ...n,
    metadata: n.metadata ? JSON.parse(n.metadata) : null
  }));
};

export const markAcademyNotificationAsRead = async (id) => {
  return prisma.notification.update({
    where: { notification_id: parseInt(id, 10) },
    data: { is_read: true }
  });
};

export const pauseStudentPlan = async (academy_id, student_id, data, admin_user_id) => {
  const academyId = parseInt(academy_id, 10);
  const studentId = parseInt(student_id, 10);
  
  const student = await getStudentForAcademy(academyId, studentId);
  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  const { pause_start_date, pause_duration, pause_duration_unit, pause_end_date, pause_reason } = data;

  // Calculate pause end date if duration is provided
  let calculatedEndDate = pause_end_date;
  if (pause_duration && pause_duration_unit && !pause_end_date) {
    const startDate = new Date(pause_start_date || new Date());
    const duration = parseInt(pause_duration, 10);
    
    switch (pause_duration_unit) {
      case 'days':
        startDate.setDate(startDate.getDate() + duration);
        break;
      case 'weeks':
        startDate.setDate(startDate.getDate() + (duration * 7));
        break;
      case 'months':
        startDate.setMonth(startDate.getMonth() + duration);
        break;
      default:
        break;
    }
    calculatedEndDate = startDate.toISOString();
  }

  // Update student enrollment to pause status
  let enrollment = await prisma.studentEnrollment.findFirst({
    where: {
      student_id: studentId,
      academy_id: academyId,
      is_active: true
    }
  });

  logger.info('Enrollment query result for pause', { student_id: studentId, academy_id: academyId, enrollmentFound: !!enrollment });

  if (!enrollment) {
    // Try to find any enrollment for this student in this academy (not just active)
    const anyEnrollment = await prisma.studentEnrollment.findFirst({
      where: {
        student_id: studentId,
        academy_id: academyId
      }
    });
    
    logger.info('Fallback enrollment query result', { student_id: studentId, academy_id: academyId, anyEnrollmentFound: !!anyEnrollment });
    
    if (anyEnrollment) {
      // Use the found enrollment even if not marked as active
      // Update it to active first
      await prisma.studentEnrollment.update({
        where: { enrollment_id: anyEnrollment.enrollment_id },
        data: { is_active: true }
      });
      // Now use this enrollment
      enrollment = anyEnrollment;
    } else {
      const error = new Error('No enrollment found for student in this academy');
      error.statusCode = 404;
      throw error;
    }
  }

  // Calculate pause duration in days for the schema
  let pauseDurationDays = null;
  if (pause_duration && pause_duration_unit) {
    const duration = parseInt(pause_duration, 10);
    switch (pause_duration_unit) {
      case 'days':
        pauseDurationDays = duration;
        break;
      case 'weeks':
        pauseDurationDays = duration * 7;
        break;
      case 'months':
        pauseDurationDays = duration * 30; // Approximate
        break;
      default:
        break;
    }
  }

  // Calculate remaining validity (days from pause end to plan end)
  let remainingValidity = null;
  if (calculatedEndDate && enrollment.plan_end_date) {
    const pauseEnd = new Date(calculatedEndDate);
    const planEnd = new Date(enrollment.plan_end_date);
    const diffTime = planEnd - pauseEnd;
    remainingValidity = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Update enrollment with pause details using correct schema field names
  const updatedEnrollment = await prisma.studentEnrollment.update({
    where: { enrollment_id: enrollment.enrollment_id },
    data: {
      is_paused: true,
      pause_start_date: pause_start_date ? new Date(pause_start_date) : new Date(),
      pause_end_date: calculatedEndDate ? new Date(calculatedEndDate) : null,
      pause_duration_days: pauseDurationDays,
      pause_unit: pause_duration_unit || null,
      remaining_validity: remainingValidity,
      pause_reason: pause_reason || null
    }
  });

  // Extend the plan end date by the pause duration
  if (calculatedEndDate && enrollment.plan_end_date) {
    const currentPlanEnd = new Date(enrollment.plan_end_date);
    const pauseEnd = new Date(calculatedEndDate);
    const extensionDays = Math.ceil((pauseEnd - new Date(pause_start_date || new Date())) / (1000 * 60 * 60 * 24));
    
    currentPlanEnd.setDate(currentPlanEnd.getDate() + extensionDays);
    
    await prisma.studentEnrollment.update({
      where: { enrollment_id: enrollment.enrollment_id },
      data: {
        plan_end_date: currentPlanEnd
      }
    });
  }

  logger.info('Student plan paused', { student_id: studentId, academy_id: academyId, admin_user_id });

  return updatedEnrollment;
};

export const resumeStudentPlan = async (academy_id, student_id, admin_user_id) => {
  const academyId = parseInt(academy_id, 10);
  const studentId = parseInt(student_id, 10);
  
  const student = await getStudentForAcademy(academyId, studentId);
  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  // Find paused enrollment
  let enrollment = await prisma.studentEnrollment.findFirst({
    where: {
      student_id: studentId,
      academy_id: academyId,
      is_active: true,
      is_paused: true
    }
  });

  logger.info('Paused enrollment query result for resume', { student_id: studentId, academy_id: academyId, enrollmentFound: !!enrollment });

  if (!enrollment) {
    const error = new Error('No paused enrollment found for student');
    error.statusCode = 404;
    throw error;
  }

  // Resume the enrollment - clear all pause-related fields using correct schema names
  const updatedEnrollment = await prisma.studentEnrollment.update({
    where: { enrollment_id: enrollment.enrollment_id },
    data: {
      is_paused: false,
      pause_start_date: null,
      pause_end_date: null,
      pause_duration_days: null,
      pause_unit: null,
      remaining_validity: null,
      pause_reason: null
    }
  });

  logger.info('Student plan resumed', { student_id: studentId, academy_id: academyId, admin_user_id });

  return updatedEnrollment;
};

export const resetParentPassword = async (academy_id, student_id, new_password, send_email, admin_user_id) => {
  const academyId = parseInt(academy_id, 10);
  const studentId = parseInt(student_id, 10);
  
  logger.info('resetParentPassword called', { academy_id: academyId, student_id: studentId, send_email });

  // Get student with parent information
  const student = await prisma.student.findFirst({
    where: {
      student_id: studentId,
      academy_id: academyId,
      ...NOT_DELETED
    },
    include: {
      parent: true
    }
  });

  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  if (!student.parent) {
    const error = new Error('No parent account found for this student');
    error.statusCode = 404;
    throw error;
  }

  // Hash the new password
  const saltRounds = 10;
  const password_hash = await bcrypt.hash(new_password, saltRounds);

  // Update parent password
  const updatedParent = await prisma.parent.update({
    where: { parent_id: student.parent.parent_id },
    data: {
      password_hash,
      must_change_password: true
    }
  });

  // Log audit
  await logAudit({
    academy_id: academyId,
    actor_type: 'ADMIN',
    actor_id: admin_user_id,
    action: 'PARENT_PASSWORD_RESET',
    metadata: {
      student_id: studentId,
      parent_id: student.parent.parent_id,
      parent_email: student.parent.email,
      send_email
    }
  });

  logger.info('Parent password reset successfully', { 
    parent_id: student.parent.parent_id, 
    student_id: studentId,
    academy_id: academyId,
    send_email 
  });

  // Send email if requested
  if (send_email && student.parent.email) {
    try {
      const { sendParentPasswordResetEmail } = await import('../../services/email.service.js');
      const portalUrl = `${process.env.PARENT_PORTAL_URL || 'http://localhost:3001'}/parent/login`;
      
      await sendParentPasswordResetEmail(
        student.parent.email,
        student.parent.name,
        {
          portalUrl,
          username: student.parent.email,
          password: new_password
        }
      );
      
      logger.info('Parent password reset email sent', { 
        parent_id: student.parent.parent_id,
        email: student.parent.email 
      });
    } catch (emailError) {
      logger.error('Failed to send password reset email', { 
        error: emailError.message,
        parent_id: student.parent.parent_id 
      });
      // Don't throw error - password was reset successfully, just email failed
    }
  }

  return {
    parent_id: updatedParent.parent_id,
    email: updatedParent.email,
    must_change_password: updatedParent.must_change_password
  };
};

export const sendParentLoginDetails = async (academy_id, student_id, admin_user_id) => {
  const academyId = parseInt(academy_id, 10);
  const studentId = parseInt(student_id, 10);
  
  logger.info('sendParentLoginDetails called', { academy_id: academyId, student_id: studentId });

  // Get student with parent information
  const student = await prisma.student.findFirst({
    where: {
      student_id: studentId,
      academy_id: academyId,
      ...NOT_DELETED
    },
    include: {
      parent: true
    }
  });

  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  if (!student.parent) {
    const error = new Error('No parent account found for this student');
    error.statusCode = 404;
    throw error;
  }

  if (!student.parent.email) {
    const error = new Error('Parent email not available');
    error.statusCode = 400;
    throw error;
  }

  // Send login details email
  const { sendParentLoginDetailsEmail } = await import('../../services/mail.service.js');
  const loginUrl = `${process.env.PARENT_PORTAL_URL || 'http://localhost:3000'}/parent/login`;
  
  await sendParentLoginDetailsEmail({
    to: student.parent.email,
    parent_name: student.parent.name,
    student_name: student.name,
    login_url: loginUrl
  });

  // Log audit
  await logAudit({
    academy_id: academyId,
    actor_type: 'ADMIN',
    actor_id: admin_user_id,
    action: 'PARENT_LOGIN_DETAILS_SENT',
    metadata: {
      student_id: studentId,
      parent_id: student.parent.parent_id,
      parent_email: student.parent.email
    }
  });

  return { success: true };
};

const getPlanDurationDays = async (planId) => {
  const plan = await prisma.durationPlan.findUnique({
    where: { plan_id: planId }
  });
  if (!plan) return 30;
  
  if (plan.duration_type === 'DAYS') {
    return plan.duration;
  } else {
    // MONTHS type: convert to days (1 month = 30 days)
    return plan.duration * 30;
  }
};

const getFinalFeeForPlan = async (planId, sportId) => {
  const [plan, sport] = await Promise.all([
    prisma.durationPlan.findUnique({ where: { plan_id: planId } }),
    prisma.sport.findUnique({ where: { sport_id: sportId } })
  ]);
  const multiplier = plan ? parseFloat(plan.multiplier) : 1.0;
  const baseFee = sport ? parseFloat(sport.base_fee) : 0.0;
  return baseFee * multiplier;
};

export const getCurrentCycleEnrollments = (enrollments) => {
  if (!enrollments || enrollments.length === 0) return [];
  
  const sorted = [...enrollments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  
  let activeIndex = sorted.findIndex(e => e.is_active);
  const today = new Date();
  if (activeIndex === -1) {
    activeIndex = sorted.findIndex(e => {
      const start = new Date(e.plan_start_date);
      const end = new Date(e.plan_end_date);
      return today >= start && today <= end;
    });
  }
  if (activeIndex === -1) {
    activeIndex = sorted.length - 1;
  }
  
  const activeEnrollment = sorted[activeIndex];
  if (!activeEnrollment) return [];
  
  const cycleEnrollments = [activeEnrollment];
  
  let currentActive = activeEnrollment;
  for (let i = activeIndex - 1; i >= 0; i--) {
    const prev = sorted[i];
    // If the active enrollment is active, do not group inactive/historical ones
    if (activeEnrollment.is_active && !prev.is_active) {
      break;
    }
    const prevEnd = new Date(prev.plan_end_date);
    const currStart = new Date(currentActive.plan_start_date);
    
    const diffDays = Math.abs(currStart - prevEnd) / (1000 * 60 * 60 * 24);
    if (diffDays <= 2) {
      cycleEnrollments.unshift(prev);
      currentActive = prev;
    } else {
      break;
    }
  }
  
  currentActive = activeEnrollment;
  for (let i = activeIndex + 1; i < sorted.length; i++) {
    const next = sorted[i];
    // If the active enrollment is active, do not group inactive/historical ones
    if (activeEnrollment.is_active && !next.is_active) {
      break;
    }
    const currEnd = new Date(currentActive.plan_end_date);
    const nextStart = new Date(next.plan_start_date);
    
    const diffDays = Math.abs(nextStart - currEnd) / (1000 * 60 * 60 * 24);
    if (diffDays <= 2) {
      cycleEnrollments.push(next);
      currentActive = next;
    } else {
      break;
    }
  }
  
  return cycleEnrollments;
};

export const reactivateStudent = async (academy_id, student_id, data, admin_user_id) => {
  const academyId = parseInt(academy_id, 10);
  const studentId = parseInt(student_id, 10);
  const student = await getStudentForAcademy(academyId, studentId);
  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  const { action, duration_plan_id, sport_id, batch_id, plan_start_date, additional_charges, registration_fee, discount: rawDiscount } = data;
  let targetPlanId = duration_plan_id ? parseInt(duration_plan_id, 10) : null;
  let targetSportId = sport_id ? parseInt(sport_id, 10) : student.sport_id;
  let targetBatchId = batch_id ? parseInt(batch_id, 10) : student.batch_id;
  const additionalCharges = additional_charges ? parseFloat(additional_charges) : 0;
  const registrationFee = registration_fee ? parseFloat(registration_fee) : 0;
  const discount = rawDiscount ? parseFloat(rawDiscount) : 0;

  const latestEnrollment = await prisma.studentEnrollment.findFirst({
    where: { student_id: studentId, academy_id: academyId },
    orderBy: { created_at: 'desc' }
  });

  if (!targetPlanId && latestEnrollment) {
    targetPlanId = latestEnrollment.duration_plan_id;
    targetSportId = latestEnrollment.sport_id;
    targetBatchId = latestEnrollment.batch_id;
  }

  if (!targetPlanId) {
    const error = new Error('No plan specified and no previous plan found');
    error.statusCode = 400;
    throw error;
  }

  const durationDays = await getPlanDurationDays(targetPlanId);
  const finalFee = await getFinalFeeForPlan(targetPlanId, targetSportId);

  const result = await prisma.$transaction(async (tx) => {
    let activeEnrollmentRecord;
    if (action === 'continue' && latestEnrollment) {
      // Continue Existing Plan: Reactivate the existing enrollment, keeping dates, paid amount, and fees intact
      const updatedEnrollment = await tx.studentEnrollment.update({
        where: { enrollment_id: latestEnrollment.enrollment_id },
        data: {
          is_active: true,
          batch_id: targetBatchId
        }
      });
      activeEnrollmentRecord = updatedEnrollment;

      await tx.student.update({
        where: { student_id: studentId },
        data: {
          status: 'ACTIVE',
          auto_deactivated: false,
          batch_id: targetBatchId,
          sport_id: targetSportId
        }
      });
    } else {
      // Assign New Plan: Create a new enrollment with provided or default values
      await tx.studentEnrollment.updateMany({
        where: { student_id: studentId, is_active: true },
        data: { is_active: false }
      });

      const planStartDate = plan_start_date ? new Date(plan_start_date) : new Date();
      const planEndDate = new Date(planStartDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

      const newEnrollment = await tx.studentEnrollment.create({
        data: {
          academy_id: academyId,
          student_id: studentId,
          sport_id: targetSportId,
          duration_plan_id: targetPlanId,
          batch_id: targetBatchId,
          registration_fee: registrationFee,
          sports_fee: finalFee,
          additional_charges: additionalCharges,
          discount: discount,
          final_fee: finalFee + registrationFee + additionalCharges - discount,
          paid_amount: 0,
          plan_start_date: planStartDate,
          plan_end_date: planEndDate,
          next_due_date: planEndDate,
          is_active: true
        }
      });
      activeEnrollmentRecord = newEnrollment;

      await tx.student.update({
        where: { student_id: studentId },
        data: {
          status: 'ACTIVE',
          auto_deactivated: false,
          fees_status: 'unpaid',
          batch_id: targetBatchId,
          sport_id: targetSportId
        }
      });

      await tx.fee.create({
        data: {
          academy_id: academyId,
          student_id: studentId,
          amount_due: finalFee + registrationFee + additionalCharges - discount,
          due_date: planEndDate,
          status: 'PENDING',
          description: `Plan Reactivation (New Plan): ${planStartDate.toLocaleDateString()} to ${planEndDate.toLocaleDateString()}`
        }
      });
    }

    // Apply pending payment atomically if provided
    if (data.payment) {
      const payAmount = parseFloat(data.payment.amount || 0);
      const payExtraAmount = parseFloat(data.payment.extra_amount || 0);
      const payAmountPaid = parseFloat(data.payment.amount_paid || 0);
      const netPaymentAmount = payAmount - payExtraAmount;

      let receipt;
      if (data.payment.receipt_id) {
        receipt = await tx.receipt.update({
          where: { receipt_id: parseInt(data.payment.receipt_id, 10) },
          data: {
            status: data.payment.status === 'completed' ? 'COMPLETED' : 'PENDING',
            approved_by_user_id: admin_user_id,
            remarks: action === 'continue' ? 'Reactivation (Continue Plan)' : 'Reactivation (New Plan)'
          }
        });
      } else {
        const generatedReceiptNo = `REC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        receipt = await tx.receipt.create({
          data: {
            receipt_number: generatedReceiptNo,
            academy_id: academyId,
            student_id: studentId,
            amount: payAmount,
            payment_date: new Date(data.payment.payment_date),
            method: data.payment.method || 'cash',
            status: data.payment.status === 'completed' ? 'COMPLETED' : 'PENDING',
            remarks: action === 'continue' ? 'Reactivation (Continue Plan)' : 'Reactivation (New Plan)'
          }
        });
      }

      if (payExtraAmount > 0) {
        await tx.student.update({
          where: { student_id: studentId },
          data: { advance_balance: { increment: payExtraAmount } }
        });
        await tx.studentCreditTransaction.create({
          data: {
            student_id: studentId,
            academy_id: academyId,
            amount: payExtraAmount,
            type: 'ADD',
            reason: 'Advance Payment',
            reference_type: 'RECEIPT',
            reference_id: receipt.receipt_id
          }
        });
      }

      if (data.payment.status === 'completed') {
        const currentActiveEnrollment = activeEnrollmentRecord;

        const allUserEnrollments = await tx.studentEnrollment.findMany({
          where: { student_id: studentId, academy_id: academyId },
          include: { sport: true, duration_plan: true }
        });
        const cycleEnrollments = getCurrentCycleEnrollments(allUserEnrollments);
        let totalFeesAssigned = 0;
        if (cycleEnrollments.length > 0) {
          totalFeesAssigned = cycleEnrollments.reduce((sum, e) => {
            const sportsBaseFee = parseFloat(e.sport?.base_fee || e.sports_base_fee || 0);
            const planMultiplier = parseFloat(e.duration_plan?.multiplier || e.plan_multiplier || 1);
            const assignedSportsFee = sportsBaseFee * planMultiplier;
            const registrationFee = parseFloat(e.registration_fee || 0);
            const additionalCharges = parseFloat(e.additional_charges || 0);
            const discount = parseFloat(e.discount || 0);
            return sum + (assignedSportsFee + registrationFee + additionalCharges - discount);
          }, 0);

          const oldestEnrollment = cycleEnrollments[0];
          const cycleStart = new Date(oldestEnrollment.created_at.getTime() - 5000);

          const cycleReceipts = await tx.receipt.findMany({
            where: {
              student_id: studentId,
              academy_id: academyId,
              status: 'COMPLETED',
              created_at: { gte: cycleStart },
              receipt_id: { not: receipt.receipt_id }
            }
          });

          const totalPaid = cycleReceipts.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0) + netPaymentAmount;

          let newFeesStatus = 'unpaid';
          if (totalPaid >= totalFeesAssigned) {
            newFeesStatus = 'paid';
          } else if (totalPaid > 0) {
            newFeesStatus = 'partial';
          }

          await tx.student.update({
            where: { student_id: studentId },
            data: { fees_status: newFeesStatus }
          });

          const currentPaidAmount = parseFloat(currentActiveEnrollment.paid_amount || 0);
          const newPaidAmount = currentPaidAmount + netPaymentAmount;

          await tx.studentEnrollment.update({
            where: { enrollment_id: currentActiveEnrollment.enrollment_id },
            data: { paid_amount: newPaidAmount }
          });

          // Also set activeEnrollmentRecord's values in return object
          activeEnrollmentRecord.paid_amount = newPaidAmount;
        }
      }
    }

    return activeEnrollmentRecord;
  });

  await logAudit({
    academy_id: academyId,
    actor_type: 'ADMIN',
    actor_id: parseInt(admin_user_id, 10) || null,
    action: 'FEE_CYCLE_RESET',
    entity_type: 'Student',
    entity_id: studentId,
    metadata: JSON.stringify({
      event: 'Fee account reset \u2014 New fee cycle started',
      action_type: action === 'continue' ? 'Continue Existing Plan' : 'Assign New Plan',
      enrollment_id: result?.enrollment_id || null,
      timestamp: new Date().toISOString(),
    }),
  });

  return result;
};

export const renewStudent = async (academy_id, student_id, data, admin_user_id) => {
  const academyId = parseInt(academy_id, 10);
  const studentId = parseInt(student_id, 10);
  const student = await getStudentForAcademy(academyId, studentId);
  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  const latestEnrollment = await prisma.studentEnrollment.findFirst({
    where: { student_id: studentId, academy_id: academyId, is_active: true },
    orderBy: { created_at: 'desc' }
  });

  if (!latestEnrollment) {
    const error = new Error('No active plan found to renew. Please use Reactivate.');
    error.statusCode = 400;
    throw error;
  }

  const targetPlanId = data.duration_plan_id ? parseInt(data.duration_plan_id, 10) : latestEnrollment.duration_plan_id;
  const targetSportId = latestEnrollment.sport_id;
  const targetBatchId = latestEnrollment.batch_id;

  const durationDays = await getPlanDurationDays(targetPlanId);
  const finalFee = await getFinalFeeForPlan(targetPlanId, targetSportId);

  let planStartDate = new Date();
  if (latestEnrollment.plan_end_date) {
    const currentEnd = new Date(latestEnrollment.plan_end_date);
    if (currentEnd > planStartDate) {
      planStartDate = currentEnd;
    }
  }

  // Prevent duplicate renewals
  const upcomingRenewal = await prisma.studentEnrollment.findFirst({
    where: {
      student_id: studentId,
      academy_id: academyId,
      plan_start_date: { gte: new Date(planStartDate.getTime() - 2 * 24 * 60 * 60 * 1000) } // 2 days timezone buffer
    }
  });

  if (upcomingRenewal) {
    const error = new Error('A renewal plan has already been scheduled/added for this student.');
    error.statusCode = 400;
    throw error;
  }

  const planEndDate = new Date(planStartDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const isStarted = new Date() >= planStartDate;

  const result = await prisma.$transaction(async (tx) => {
    if (isStarted) {
      // Deactivate the previous one if the renewal has already started
      await tx.studentEnrollment.update({
        where: { enrollment_id: latestEnrollment.enrollment_id },
        data: { is_active: false }
      });
    }

    const newEnrollment = await tx.studentEnrollment.create({
      data: {
        academy_id: academyId,
        student_id: studentId,
        sport_id: targetSportId,
        duration_plan_id: targetPlanId,
        batch_id: targetBatchId,
        registration_fee: 0,
        sports_fee: finalFee,
        additional_charges: 0,
        discount: 0,
        final_fee: finalFee,
        paid_amount: 0,
        plan_start_date: planStartDate,
        plan_end_date: planEndDate,
        next_due_date: planEndDate,
        is_active: isStarted
      }
    });

    await tx.student.update({
      where: { student_id: studentId },
      data: {
        status: 'ACTIVE',
        auto_deactivated: false
      }
    });

    await tx.fee.create({
      data: {
        academy_id: academyId,
        student_id: studentId,
        amount_due: finalFee,
        due_date: planEndDate,
        status: 'PENDING',
        description: `Plan Renewal: ${planStartDate.toLocaleDateString()} to ${planEndDate.toLocaleDateString()}`
      }
    });

    return newEnrollment;
  });

  await logAudit({
    academy_id: academyId,
    actor_type: 'ADMIN',
    actor_id: parseInt(admin_user_id, 10) || null,
    action: 'PLAN_RENEWED',
    entity_type: 'Student',
    entity_id: studentId,
    metadata: JSON.stringify({
      event: 'Student plan renewed',
      action_type: 'Plan Renewal',
      enrollment_id: result?.enrollment_id || null,
      timestamp: new Date().toISOString(),
    }),
  });

  return result;
};

export const changeStudentPlan = async (academy_id, student_id, data, admin_user_id) => {
  const academyId = parseInt(academy_id, 10);
  const studentId = parseInt(student_id, 10);
  const student = await getStudentForAcademy(academyId, studentId);
  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  const { duration_plan_id } = data;
  if (!duration_plan_id) {
    const error = new Error('New duration plan ID is required');
    error.statusCode = 400;
    throw error;
  }

  const targetPlanId = parseInt(duration_plan_id, 10);

  const latestEnrollment = await prisma.studentEnrollment.findFirst({
    where: { student_id: studentId, academy_id: academyId, is_active: true }
  });

  const targetSportId = latestEnrollment ? latestEnrollment.sport_id : student.sport_id;
  const targetBatchId = latestEnrollment ? latestEnrollment.batch_id : student.batch_id;

  const durationDays = await getPlanDurationDays(targetPlanId);
  const finalFee = await getFinalFeeForPlan(targetPlanId, targetSportId);

  const planStartDate = new Date();
  const planEndDate = new Date(planStartDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const result = await prisma.$transaction(async (tx) => {
    if (latestEnrollment) {
      const updatedEnrollment = await tx.studentEnrollment.update({
        where: { enrollment_id: latestEnrollment.enrollment_id },
        data: {
          duration_plan_id: targetPlanId,
          sports_fee: finalFee,
          final_fee: finalFee,
          plan_start_date: planStartDate,
          plan_end_date: planEndDate,
          next_due_date: planEndDate,
          is_active: true
        }
      });

      await tx.student.update({
        where: { student_id: studentId },
        data: {
          status: 'ACTIVE',
          auto_deactivated: false
        }
      });

      await tx.fee.create({
        data: {
          academy_id: academyId,
          student_id: studentId,
          amount_due: finalFee,
          due_date: planEndDate,
          status: 'PENDING',
          description: `Plan Upgrade/Downgrade: ${planStartDate.toLocaleDateString()} to ${planEndDate.toLocaleDateString()}`
        }
      });

      return updatedEnrollment;
    } else {
      const newEnrollment = await tx.studentEnrollment.create({
        data: {
          academy_id: academyId,
          student_id: studentId,
          sport_id: targetSportId,
          duration_plan_id: targetPlanId,
          batch_id: targetBatchId,
          registration_fee: 0,
          sports_fee: finalFee,
          additional_charges: 0,
          discount: 0,
          final_fee: finalFee,
          paid_amount: 0,
          plan_start_date: planStartDate,
          plan_end_date: planEndDate,
          next_due_date: planEndDate,
          is_active: true
        }
      });

      await tx.student.update({
        where: { student_id: studentId },
        data: {
          status: 'ACTIVE',
          auto_deactivated: false
        }
      });

      await tx.fee.create({
        data: {
          academy_id: academyId,
          student_id: studentId,
          amount_due: finalFee,
          due_date: planEndDate,
          status: 'PENDING',
          description: `Plan Upgrade/Downgrade: ${planStartDate.toLocaleDateString()} to ${planEndDate.toLocaleDateString()}`
        }
      });

      return newEnrollment;
    }
  });

  return result;
};

