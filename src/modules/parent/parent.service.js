import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/prisma.js';
import { JWT_SECRET, JWT_EXPIRE, BCRYPT_SALT_ROUNDS } from '../../config/app.config.js';
import { generateResetCode } from '../../utils/resetCode.util.js';
import logger from '../../utils/logger.js';
import { sendPasswordChangeEmail } from '../../services/email.service.js';

export const createParentAccount = async ({ academy_id, name, email, phone, password }) => {
  const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const normalizedEmail = email.trim().toLowerCase();

  const existingParent = await prisma.parent.findUnique({
    where: {
      email_academy_id: {
        email: normalizedEmail,
        academy_id,
      },
    },
  });

  if (existingParent) {
    if (!existingParent.is_active) {
      await prisma.parent.update({
        where: { parent_id: existingParent.parent_id },
        data: { is_active: true },
      });
      logger.info('Reactivated inactive parent account', { parent_id: existingParent.parent_id });
    }

    logger.warn('Parent account already exists, returning existing record', {
      email: normalizedEmail,
    });
    return existingParent;
  }

  const parent = await prisma.parent.create({
    data: {
      academy_id,
      name,
      email: normalizedEmail,
      phone: phone || null,
      password_hash: hashedPassword,
      must_change_password: true,
    },
  });

  logger.info('Parent account created', { parent_id: parent.parent_id, email: parent.email });
  return parent;
};

export const findParentByEmail = async (email, academy_id) => {
  const parent = await prisma.parent.findUnique({
    where: {
      email_academy_id: {
        email: email.trim().toLowerCase(),
        academy_id,
      },
    },
  });

  return parent?.is_active ? parent : null;
};

export const findParentById = async (parent_id) => {
  return await prisma.parent.findUnique({
    where: { parent_id },
    include: {
      students: {
        where: { is_deleted: false },
        include: {
          sport: true,
          batch: true,
          academy: true,
        },
      },
    },
  });
};

export const authenticateParent = async ({ email, password, academy_id }) => {
  let parent;
  const normalizedEmail = email.trim().toLowerCase();

  logger.info('Parent authentication attempt', { email: normalizedEmail, academy_id });

  if (academy_id) {
    parent = await findParentByEmail(normalizedEmail, academy_id);
  } else {
    // If no academy_id provided, find by email only (first active match)
    parent = await prisma.parent.findFirst({
      where: {
        email: normalizedEmail,
        is_active: true,
      },
    });
  }

  if (!parent) {
    logger.warn('Parent not found or inactive', { email: normalizedEmail, academy_id });
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  logger.info('Parent found, verifying password', { parent_id: parent.parent_id, email: parent.email });

  const isValidPassword = await bcrypt.compare(password, parent.password_hash);

  if (!isValidPassword) {
    logger.warn('Invalid password for parent', { parent_id: parent.parent_id, email: parent.email });
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  if (!parent.is_active) {
    logger.warn('Parent account inactive', { parent_id: parent.parent_id, email: parent.email });
    const error = new Error('Account is inactive');
    error.statusCode = 401;
    throw error;
  }

  // Update last login
  await prisma.parent.update({
    where: { parent_id: parent.parent_id },
    data: { last_login_at: new Date() },
  });

  const token = jwt.sign(
    {
      id: parent.parent_id,
      role: 'PARENT',
      academy_id: parent.academy_id,
      email: parent.email,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE },
  );

  logger.info('Parent authenticated successfully', { parent_id: parent.parent_id, email: parent.email });

  return {
    token,
    parent: {
      id: parent.parent_id,
      name: parent.name,
      email: parent.email,
      phone: parent.phone,
      must_change_password: parent.must_change_password,
    },
  };
};

export const changeParentPassword = async (parent_id, currentPassword, newPassword) => {
  const parent = await prisma.parent.findUnique({
    where: { parent_id },
  });

  if (!parent) {
    throw new Error('Parent not found');
  }

  const isValidPassword = await bcrypt.compare(currentPassword, parent.password_hash);

  if (!isValidPassword) {
    throw new Error('Current password is incorrect');
  }

  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

  await prisma.parent.update({
    where: { parent_id },
    data: {
      password_hash: hashedPassword,
      must_change_password: false,
    },
  });

  logger.info('Parent password changed', { parent_id });

  // Send password change email
  try {
    await sendPasswordChangeEmail(parent.email, parent.name, newPassword);
    logger.info('Password change email sent successfully', { parent_id, email: parent.email });
  } catch (emailError) {
    logger.error('Failed to send password change email', { 
      error: emailError.message, 
      parent_id, 
      email: parent.email 
    });
    // Don't throw error - password was changed successfully, email is secondary
  }

  return { success: true };
};

export const updateParentProfile = async (parent_id, { name, email, phone }) => {
  const parent = await prisma.parent.findUnique({
    where: { parent_id },
  });

  if (!parent) {
    throw new Error('Parent not found');
  }

  const normalizedEmail = email ? email.trim().toLowerCase() : parent.email;

  // Check if email is being changed and if it conflicts with another parent
  if (email && email !== parent.email) {
    const existingParent = await prisma.parent.findFirst({
      where: {
        email: normalizedEmail,
        academy_id: parent.academy_id,
        parent_id: { not: parent_id },
      },
    });

    if (existingParent) {
      throw new Error('Email already exists in this academy');
    }
  }

  const updatedParent = await prisma.parent.update({
    where: { parent_id },
    data: {
      name: name || parent.name,
      email: normalizedEmail,
      phone: phone !== undefined ? phone : parent.phone,
    },
  });

  logger.info('Parent profile updated', { parent_id });
  return updatedParent;
};

export const linkStudentToParent = async (student_id, parent_id) => {
  const student = await prisma.student.update({
    where: { student_id },
    data: { parent_id },
    include: {
      parent: true,
      academy: true,
    },
  });

  logger.info('Student linked to parent', { student_id, parent_id });
  return student;
};

export const getParentChildren = async (parent_id) => {
  const parent = await prisma.parent.findUnique({
    where: { parent_id },
    include: {
      students: {
        where: { is_deleted: false },
        include: {
          sport: true,
          batch: true,
          enrollments: {
            where: { is_active: true },
            include: {
              duration_plan: true,
            },
          },
        },
      },
    },
  });

  return parent.students;
};

export const getParentDashboardData = async (parent_id, studentId = null) => {
  const parent = await prisma.parent.findUnique({
    where: { parent_id },
    include: {
      students: {
        where: { is_deleted: false },
        include: {
          sport: true,
          batch: true,
          academy: true,
          enrollments: {
            where: { is_active: true },
            include: {
              duration_plan: true,
            },
          },
          student_attendances: {
            orderBy: { date: 'desc' },
            take: 30,
          },
          performance_scores: {
            include: {
              attribute: true,
            },
            orderBy: { scored_at: 'desc' },
            take: 20,
          },
          daily_notes: {
            orderBy: { note_date: 'desc' },
            take: 10,
          },
          receipts: {
            orderBy: { payment_date: 'desc' },
            take: 10,
          },
        },
      },
    },
  });

  if (!parent) {
    throw new Error('Parent not found');
  }

  // Filter students if studentId is provided
  let filteredStudents = parent.students;
  if (studentId) {
    filteredStudents = parent.students.filter((s) => s.student_id === studentId);
    if (filteredStudents.length === 0) {
      // If specific student not found, use first student as fallback
      filteredStudents = parent.students;
    }
  }

  // Calculate aggregated metrics for dashboard
  const allAttendances = filteredStudents.flatMap((s) => s.student_attendances);
  const presentCount = allAttendances.filter((a) => a.status === 'PRESENT').length;
  const attendanceRate =
    allAttendances.length > 0 ? Math.round((presentCount / allAttendances.length) * 100) : 0;

  const allPerformanceScores = filteredStudents.flatMap((s) => s.performance_scores);
  const avgPerformanceScore =
    allPerformanceScores.length > 0
      ? Math.round(
          allPerformanceScores.reduce((sum, s) => sum + s.score, 0) / allPerformanceScores.length,
        )
      : 0;

  const allReceipts = filteredStudents.flatMap((s) => s.receipts);
  const pendingFees = allReceipts
    .filter((r) => r.status === 'PENDING' || r.status === 'DUE')
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  const recentNotes = filteredStudents.flatMap((s) => s.daily_notes).slice(0, 5);

  return {
    parent: {
      id: parent.parent_id,
      name: parent.name,
      email: parent.email,
      phone: parent.phone,
    },
    students: parent.students, // Return all students for dropdown
    metrics: {
      attendanceRate,
      avgPerformanceScore,
      pendingFees,
      totalStudents: parent.students.length,
      totalAttendances: allAttendances.length,
      recentNotes,
      filteredStudentId: studentId, // Return the filtered student ID
    },
  };
};
