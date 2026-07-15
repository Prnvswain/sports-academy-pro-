import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/prisma.js';
import { JWT_SECRET, JWT_EXPIRE, BCRYPT_SALT_ROUNDS } from '../../config/app.config.js';
import { generateResetCode } from '../../utils/resetCode.util.js';
import logger from '../../utils/logger.js';
import { sendPasswordChangeEmail } from '../../services/email.service.js';
import * as receiptService from '../../services/receipt.service.js';
import { logAudit } from '../../utils/audit.util.js';

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

  console.log('=== PARENT AUTH DEBUG ===');
  console.log('Email:', normalizedEmail);
  console.log('Academy ID:', academy_id);
  console.log('Password provided:', password ? 'YES' : 'NO');

  logger.info('Parent authentication attempt', { email: normalizedEmail, academy_id });

  if (academy_id) {
    parent = await findParentByEmail(normalizedEmail, academy_id);
  } else {
    // If no academy_id provided, find by email only (first active match)
    console.log('Finding parent by email only...');
    parent = await prisma.parent.findFirst({
      where: {
        email: normalizedEmail,
        is_active: true,
      },
    });
  }

  console.log('Parent found:', parent ? 'YES' : 'NO');
  if (parent) {
    console.log('Parent ID:', parent.parent_id);
    console.log('Parent active:', parent.is_active);
  }

  if (!parent) {
    logger.warn('Parent not found or inactive', { email: normalizedEmail, academy_id });
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  logger.info('Parent found, verifying password', { parent_id: parent.parent_id, email: parent.email });

  const isValidPassword = await bcrypt.compare(password, parent.password_hash);
  console.log('Password valid:', isValidPassword);

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

export const getParentPayments = async (parent_id, academy_id, student_id = null) => {
  const parentId = parseInt(parent_id, 10);
  const academyId = parseInt(academy_id, 10);
  const selectedStudentId = student_id ? parseInt(student_id, 10) : null;

  const payments = await prisma.receipt.findMany({
    where: {
      academy_id: academyId,
      student: {
        parent_id: parentId,
        is_deleted: false,
        status: 'ACTIVE'
      },
      ...(selectedStudentId ? { student_id: selectedStudentId } : {}),
    },
    include: {
      student: {
        select: {
          student_id: true,
          name: true,
        },
      },
      approved_by: {
        select: {
          user_id: true,
          name: true,
        },
      },
      collected_by: {
        select: {
          coach_id: true,
          name: true,
        },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
    take: 50,
  });

  return payments.map((payment) => ({
    id: payment.receipt_id,
    receipt_id: payment.receipt_id,
    receipt_number: payment.receipt_number,
    student_id: payment.student_id,
    student_name: payment.student?.name,
    amount: payment.amount,
    method: payment.method,
    status: payment.status,
    payment_date: payment.payment_date,
    transaction_number: payment.transaction_number,
    remarks: payment.remarks,
    proof_url: payment.proof_url,
    payment_screenshot_url: payment.payment_screenshot_url,
    pdf_url: payment.pdf_url,
    created_at: payment.created_at,
    approved_by_name: payment.approved_by?.name,
    collected_by_name: payment.collected_by?.name,
  }));
};

export const getParentReceiptById = async (parent_id, academy_id, receipt_id) => {
  const parentId = parseInt(parent_id, 10);
  const academyId = parseInt(academy_id, 10);
  const receiptId = parseInt(receipt_id, 10);

  const receipt = await prisma.receipt.findFirst({
    where: {
      receipt_id: receiptId,
      academy_id: academyId,
      student: {
        parent_id: parentId,
        is_deleted: false,
        status: 'ACTIVE'
      },
    },
    include: {
      student: {
        include: {
          academy: true,
          sport: true,
          batch: true,
          parent: true,
        },
      },
      approved_by: {
        select: {
          user_id: true,
          name: true,
        },
      },
      collected_by: {
        select: {
          coach_id: true,
          name: true,
        },
      },
    },
  });

  if (!receipt) {
    const error = new Error('Receipt not found or you do not have permission to access it');
    error.statusCode = 404;
    throw error;
  }

  // Log audit event
  await logAudit({
    academy_id: academyId,
    actor_type: 'PARENT',
    actor_id: parentId,
    action: 'VIEW_RECEIPT',
    entity_type: 'Receipt',
    entity_id: receiptId,
    metadata: { receipt_number: receipt.receipt_number },
  });

  return {
    id: receipt.receipt_id,
    receipt_id: receipt.receipt_id,
    receipt_number: receipt.receipt_number,
    amount: receipt.amount,
    discount: receipt.discount,
    additional_charges: receipt.additional_charges,
    payment_date: receipt.payment_date,
    method: receipt.method,
    status: receipt.status,
    transaction_number: receipt.transaction_number,
    remarks: receipt.remarks,
    proof_url: receipt.proof_url,
    payment_screenshot_url: receipt.payment_screenshot_url,
    pdf_url: receipt.pdf_url,
    rejected_reason: receipt.rejected_reason,
    created_at: receipt.created_at,
    student: {
      student_id: receipt.student.student_id,
      name: receipt.student.name,
      parent_name: receipt.student.parent_name,
      parent_phone: receipt.student.parent_phone,
      parent_email: receipt.student.parent_email,
    },
    academy: {
      academy_id: receipt.student.academy.academy_id,
      name: receipt.student.academy.name,
      address: receipt.student.academy.address,
      phone_number: receipt.student.academy.phone_number,
      email: receipt.student.academy.email,
      logo_url: receipt.student.academy.logo_url,
    },
    sport: {
      sport_id: receipt.student.sport.sport_id,
      name: receipt.student.sport.name,
    },
    batch: {
      batch_id: receipt.student.batch.batch_id,
      name: receipt.student.batch.name,
    },
    approved_by: receipt.approved_by,
    collected_by: receipt.collected_by,
  };
};

export const logReceiptDownload = async (parent_id, academy_id, receipt_id, receipt_number) => {
  const parentId = parseInt(parent_id, 10);
  const academyId = parseInt(academy_id, 10);
  const receiptId = parseInt(receipt_id, 10);

  await logAudit({
    academy_id: academyId,
    actor_type: 'PARENT',
    actor_id: parentId,
    action: 'DOWNLOAD_RECEIPT',
    entity_type: 'Receipt',
    entity_id: receiptId,
    metadata: { receipt_number },
  });
};

export const recordParentPayment = async (parent_id, academy_id, payload) => {
  const parentId = parseInt(parent_id, 10);
  const academyId = parseInt(academy_id, 10);
  const studentId = parseInt(payload.student_id, 10);
  const amount = parseFloat(payload.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    const error = new Error('Amount must be a positive number');
    error.statusCode = 400;
    throw error;
  }

  // Validate payment method is allowed for parent portal
  if (!receiptService.isParentPaymentMethodAllowed(payload.method)) {
    const error = new Error('Invalid payment method. Only UPI and Bank Transfer are allowed for parent portal');
    error.statusCode = 400;
    throw error;
  }

  // Validate transaction number
  const transactionValidation = receiptService.validateTransactionNumber(payload.transaction_number);
  if (!transactionValidation.valid) {
    const error = new Error(transactionValidation.error);
    error.statusCode = 400;
    throw error;
  }

  // Validate payment screenshot if provided
  if (payload.proof_file) {
    const fileValidation = receiptService.validatePaymentScreenshot(payload.proof_file);
    if (!fileValidation.valid) {
      const error = new Error(fileValidation.error);
      error.statusCode = 400;
      throw error;
    }
  }

  const student = await prisma.student.findFirst({
    where: {
      student_id: studentId,
      academy_id: academyId,
      parent_id: parentId,
      is_deleted: false,
      status: 'ACTIVE',
    },
  });

  if (!student) {
    const error = new Error('Student not found or not linked to your account');
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
      status: 'PENDING_VERIFICATION',
      transaction_number: transactionValidation.value,
      payment_screenshot_url: payload.proof_url || null,
      remarks: payload.remarks || null,
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

  logger.info('Parent payment submitted for verification', {
    receipt_id: receipt.receipt_id,
    receipt_number: receipt.receipt_number,
    academy_id: academyId,
    student_id: studentId,
    amount,
    method: payload.method,
  });

  return receipt;
};

export const updateParentPaymentProof = async (parent_id, academy_id, receipt_id, proof_url) => {
  const parentId = parseInt(parent_id, 10);
  const academyId = parseInt(academy_id, 10);
  const receiptId = parseInt(receipt_id, 10);

  const receipt = await prisma.receipt.findFirst({
    where: {
      receipt_id: receiptId,
      academy_id: academyId,
      student: {
        parent_id: parentId,
        is_deleted: false,
        status: 'ACTIVE',
      },
    },
  });

  if (!receipt) {
    const error = new Error('Payment record not found or you do not have permission to update it');
    error.statusCode = 404;
    throw error;
  }

  const updatedReceipt = await prisma.receipt.update({
    where: { receipt_id: receiptId },
    data: { proof_url },
  });

  await logAudit({
    academy_id: academyId,
    actor_type: 'PARENT',
    actor_id: parentId,
    action: 'PAYMENT_PROOF_UPDATED',
    entity_type: 'Receipt',
    entity_id: receiptId,
    metadata: { previous_proof: receipt.proof_url, new_proof: proof_url },
  });

  return updatedReceipt;
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
