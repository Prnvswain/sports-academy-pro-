import prisma from '../../config/prisma.js';
import logger from '../../utils/logger.js';

// ==================== ENQUIRY DASHBOARD STATS ====================

/**
 * Get enquiry dashboard statistics
 * Returns total enquiries, new enquiries, follow-ups due today, converted enquiries, and conversion rate
 */
export const getEnquiryDashboardStats = async (academyId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalEnquiries,
    newEnquiries,
    followUpsDueToday,
    convertedEnquiries
  ] = await Promise.all([
    // Total enquiries
    prisma.enquiry.count({
      where: { academy_id: academyId }
    }),
    // New enquiries (status = NEW)
    prisma.enquiry.count({
      where: {
        academy_id: academyId,
        status: 'NEW'
      }
    }),
    // Follow-ups due today (using created_at as fallback since follow_up_date field may not be synced)
    prisma.enquiry.count({
      where: {
        academy_id: academyId,
        created_at: {
          gte: today,
          lt: tomorrow
        },
        status: {
          not: 'CONVERTED'
        }
      }
    }),
    // Converted enquiries
    prisma.enquiry.count({
      where: {
        academy_id: academyId,
        status: 'CONVERTED'
      }
    })
  ]);

  // Calculate conversion rate
  const conversionRate = totalEnquiries > 0
    ? ((convertedEnquiries / totalEnquiries) * 100).toFixed(2)
    : '0.00';

  return {
    totalEnquiries,
    newEnquiries,
    followUpsDueToday,
    convertedEnquiries,
    conversionRate: parseFloat(conversionRate)
  };
};

/**
 * Get overdue follow-ups (created_at < today and status not CONVERTED/CLOSED/NOT_INTERESTED)
 * Using created_at as fallback since follow_up_date field may not be synced
 */
export const getOverdueFollowUps = async (academyId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueEnquiries = await prisma.enquiry.findMany({
    where: {
      academy_id: academyId,
      created_at: {
        lt: today
      },
      status: {
        notIn: ['CONVERTED', 'CLOSED', 'NOT_INTERESTED']
      }
    },
    orderBy: {
      created_at: 'asc'
    }
  });

  return overdueEnquiries.map(enq => ({
    ...enq,
    id: enq.enquiry_id
  }));
};

// ==================== ENQUIRY CRUD OPERATIONS ====================

/**
 * Get all enquiries with optional filters
 */
export const getEnquiries = async (academyId, filters = {}) => {
  const {
    status,
    sportInterested,
    search,
    startDate,
    endDate
  } = filters;

  const where = {
    academy_id: academyId
  };

  // Apply status filter
  if (status) {
    where.status = status;
  }

  // Apply sport filter
  if (sportInterested) {
    where.sport_interested = sportInterested;
  }

  // Apply search filter (search in student_name, parent_name, phone, email)
  if (search) {
    where.OR = [
      { student_name: { contains: search } },
      { parent_name: { contains: search } },
      { phone: { contains: search } },
      { email: { contains: search } }
    ];
  }

  // Apply date range filter
  if (startDate || endDate) {
    where.enquiry_date = {};
    if (startDate) {
      where.enquiry_date.gte = new Date(startDate);
    }
    if (endDate) {
      where.enquiry_date.lte = new Date(endDate);
    }
  }

  const enquiries = await prisma.enquiry.findMany({
    where,
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

/**
 * Get single enquiry by ID
 */
export const getEnquiryById = async (academyId, enquiryId) => {
  const enquiry = await prisma.enquiry.findFirst({
    where: {
      enquiry_id: parseInt(enquiryId),
      academy_id: academyId
    }
  });

  if (!enquiry) {
    const error = new Error('Enquiry not found');
    error.statusCode = 404;
    throw error;
  }

  return {
    ...enquiry,
    id: enquiry.enquiry_id
  };
};

/**
 * Create new enquiry
 */
export const createEnquiry = async (academyId, data) => {
  const {
    student_name,
    parent_name,
    phone,
    email,
    sport_interested,
    interested_sports,
    age,
    gender,
    enquiry_source,
    enquiry_date,
    follow_up_date,
    notes
  } = data;

  // Validate required fields
  if (!student_name || !phone) {
    const error = new Error('Student name and phone are required');
    error.statusCode = 400;
    throw error;
  }

  // Validate phone format (basic validation)
  const phoneRegex = /^[0-9]{10,15}$/;
  if (!phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
    const error = new Error('Invalid phone number format');
    error.statusCode = 400;
    throw error;
  }

  // Validate email format if provided
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error = new Error('Invalid email format');
      error.statusCode = 400;
      throw error;
    }
  }

  // Handle interested_sports - store as JSON array
  let interestedSportsJson = null;
  if (interested_sports && Array.isArray(interested_sports) && interested_sports.length > 0) {
    interestedSportsJson = JSON.stringify(interested_sports);
    // Also set sport_interested for backward compatibility (first sport)
    sport_interested = interested_sports[0];
  }

  const enquiry = await prisma.enquiry.create({
    data: {
      academy_id: parseInt(academyId),
      student_name,
      parent_name,
      phone,
      email,
      sport_interested,
      interested_sports: interestedSportsJson,
      age: age ? parseInt(age) : null,
      gender,
      enquiry_source,
      enquiry_date: enquiry_date ? new Date(enquiry_date) : new Date(),
      follow_up_date: follow_up_date ? new Date(follow_up_date) : null,
      notes,
      status: 'NEW'
    }
  });

  logger.info('Enquiry created', {
    enquiry_id: enquiry.enquiry_id,
    academy_id: academyId,
    student_name: enquiry.student_name
  });

  return {
    ...enquiry,
    id: enquiry.enquiry_id
  };
};

/**
 * Update enquiry
 */
export const updateEnquiry = async (academyId, enquiryId, data) => {
  const {
    student_name,
    parent_name,
    phone,
    email,
    sport_interested,
    interested_sports,
    age,
    gender,
    enquiry_source,
    enquiry_date,
    follow_up_date,
    status,
    notes
  } = data;

  const enquiry = await prisma.enquiry.findFirst({
    where: {
      enquiry_id: parseInt(enquiryId),
      academy_id: academyId
    }
  });

  if (!enquiry) {
    const error = new Error('Enquiry not found');
    error.statusCode = 404;
    throw error;
  }

  // Validate phone format if provided
  if (phone) {
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
      const error = new Error('Invalid phone number format');
      error.statusCode = 400;
      throw error;
    }
  }

  // Validate email format if provided
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error = new Error('Invalid email format');
      error.statusCode = 400;
      throw error;
    }
  }

  const updateData = {};
  if (student_name) updateData.student_name = student_name;
  if (parent_name !== undefined) updateData.parent_name = parent_name;
  if (phone) updateData.phone = phone;
  if (email !== undefined) updateData.email = email;
  if (sport_interested !== undefined) updateData.sport_interested = sport_interested;
  if (interested_sports !== undefined) {
    if (Array.isArray(interested_sports) && interested_sports.length > 0) {
      updateData.interested_sports = JSON.stringify(interested_sports);
      // Also update sport_interested for backward compatibility
      updateData.sport_interested = interested_sports[0];
    } else {
      updateData.interested_sports = null;
    }
  }
  if (age !== undefined) updateData.age = age ? parseInt(age) : null;
  if (gender !== undefined) updateData.gender = gender;
  if (enquiry_source !== undefined) updateData.enquiry_source = enquiry_source;
  if (enquiry_date !== undefined) updateData.enquiry_date = new Date(enquiry_date);
  if (follow_up_date !== undefined) updateData.follow_up_date = follow_up_date ? new Date(follow_up_date) : null;
  if (status) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;

  const updated = await prisma.enquiry.update({
    where: { enquiry_id: parseInt(enquiryId) },
    data: updateData
  });

  logger.info('Enquiry updated', {
    enquiry_id: enquiryId,
    academy_id: academyId,
    status: updated.status
  });

  return {
    ...updated,
    id: updated.enquiry_id
  };
};

/**
 * Delete enquiry
 */
export const deleteEnquiry = async (academyId, enquiryId) => {
  const enquiry = await prisma.enquiry.findFirst({
    where: {
      enquiry_id: parseInt(enquiryId),
      academy_id: academyId
    }
  });

  if (!enquiry) {
    const error = new Error('Enquiry not found');
    error.statusCode = 404;
    throw error;
  }

  await prisma.enquiry.delete({
    where: { enquiry_id: parseInt(enquiryId) }
  });

  logger.info('Enquiry deleted', {
    enquiry_id: enquiryId,
    academy_id: academyId
  });

  return { message: 'Enquiry deleted successfully' };
};

// ==================== FOLLOW-UP SYSTEM ====================

/**
 * Schedule follow-up for enquiry
 */
export const scheduleFollowUp = async (academyId, enquiryId, followUpDate) => {
  const enquiry = await prisma.enquiry.findFirst({
    where: {
      enquiry_id: parseInt(enquiryId),
      academy_id: academyId
    }
  });

  if (!enquiry) {
    const error = new Error('Enquiry not found');
    error.statusCode = 404;
    throw error;
  }

  const updated = await prisma.enquiry.update({
    where: { enquiry_id: parseInt(enquiryId) },
    data: {
      follow_up_date: new Date(followUpDate),
      status: 'CONTACTED'
    }
  });

  logger.info('Follow-up scheduled', {
    enquiry_id: enquiryId,
    academy_id: academyId,
    follow_up_date: followUpDate
  });

  return {
    ...updated,
    id: updated.enquiry_id
  };
};

/**
 * Mark follow-up as completed
 */
export const completeFollowUp = async (academyId, enquiryId) => {
  const enquiry = await prisma.enquiry.findFirst({
    where: {
      enquiry_id: parseInt(enquiryId),
      academy_id: academyId
    }
  });

  if (!enquiry) {
    const error = new Error('Enquiry not found');
    error.statusCode = 404;
    throw error;
  }

  const updated = await prisma.enquiry.update({
    where: { enquiry_id: parseInt(enquiryId) },
    data: {
      follow_up_date: null
    }
  });

  logger.info('Follow-up completed', {
    enquiry_id: enquiryId,
    academy_id: academyId
  });

  return {
    ...updated,
    id: updated.enquiry_id
  };
};

// ==================== CONVERSION SYSTEM ====================

/**
 * Convert enquiry to student
 * Creates a new student record from enquiry data and updates enquiry status
 */
export const convertToStudent = async (academyId, enquiryId) => {
  const enquiry = await prisma.enquiry.findFirst({
    where: {
      enquiry_id: parseInt(enquiryId),
      academy_id: academyId
    }
  });

  if (!enquiry) {
    const error = new Error('Enquiry not found');
    error.statusCode = 404;
    throw error;
  }

  if (enquiry.status === 'CONVERTED') {
    const error = new Error('Enquiry already converted');
    error.statusCode = 400;
    throw error;
  }

  // Create student record from enquiry data
  const student = await prisma.student.create({
    data: {
      academy_id: academyId,
      name: enquiry.student_name,
      first_name: enquiry.student_name.split(' ')[0] || enquiry.student_name,
      last_name: enquiry.student_name.split(' ').slice(1).join(' ') || '',
      parent_name: enquiry.parent_name,
      phone: enquiry.phone,
      parent_email: enquiry.email,
      age: enquiry.age,
      gender: enquiry.gender,
      sport_id: null, // Will be set during enrollment
      batch_id: null, // Will be set during enrollment
      fees_status: 'unpaid',
      status: 'ACTIVE'
    }
  });

  // Update enquiry status to CONVERTED and link to student
  const updatedEnquiry = await prisma.enquiry.update({
    where: { enquiry_id: parseInt(enquiryId) },
    data: {
      status: 'CONVERTED',
      converted_to_student_id: student.student_id
    }
  });

  logger.info('Enquiry converted to student', {
    enquiry_id: enquiryId,
    academy_id: academyId,
    student_id: student.student_id
  });

  return {
    student: {
      ...student,
      id: student.student_id
    },
    enquiry: {
      ...updatedEnquiry,
      id: updatedEnquiry.enquiry_id
    }
  };
};
