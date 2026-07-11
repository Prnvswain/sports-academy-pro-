import * as parentService from './parent.service.js';
import { successResponse } from '../../utils/response.js';
import logger from '../../utils/logger.js';
import prisma from '../../config/prisma.js';

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const academy_id = req.user?.academy_id || req.body.academy_id;

    const result = await parentService.authenticateParent({ email, password, academy_id });

    return res.status(200).json(
      successResponse('Login successful', result)
    );
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const parent_id = req.user.id;
    const parent = await parentService.findParentById(parent_id);

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent not found',
      });
    }

    return res.status(200).json(
      successResponse('Profile retrieved successfully', parent)
    );
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const parent_id = req.user.id;
    const { currentPassword, newPassword } = req.body;

    await parentService.changeParentPassword(parent_id, currentPassword, newPassword);

    return res.status(200).json(
      successResponse('Password changed successfully')
    );
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const parent_id = req.user.id;
    const { name, email, phone } = req.body;

    const updatedParent = await parentService.updateParentProfile(parent_id, { name, email, phone });

    return res.status(200).json(
      successResponse('Profile updated successfully', { parent: updatedParent })
    );
  } catch (error) {
    next(error);
  }
};

export const getChildren = async (req, res, next) => {
  try {
    const parent_id = req.user.id;
    const children = await parentService.getParentChildren(parent_id);

    return res.status(200).json(
      successResponse('Children retrieved successfully', children)
    );
  } catch (error) {
    next(error);
  }
};

export const getChildDetails = async (req, res, next) => {
  try {
    const parent_id = req.user.id;
    const { child_id } = req.params;

    const child = await prisma.student.findFirst({
      where: {
        student_id: parseInt(child_id),
        parent_id,
        is_deleted: false,
      },
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
    });

    if (!child) {
      return res.status(404).json({
        success: false,
        message: 'Child not found or not linked to your account',
      });
    }

    return res.status(200).json(
      successResponse('Child details retrieved successfully', child)
    );
  } catch (error) {
    next(error);
  }
};

export const getDashboard = async (req, res, next) => {
  try {
    const parent_id = req.user.id;
    const studentId = req.query.studentId ? parseInt(req.query.studentId) : null;
    const dashboardData = await parentService.getParentDashboardData(parent_id, studentId);

    return res.status(200).json(
      successResponse('Dashboard data retrieved successfully', dashboardData)
    );
  } catch (error) {
    next(error);
  }
};

export const getPayments = async (req, res, next) => {
  try {
    const parent_id = req.user.id;
    const studentId = req.query.student_id ? parseInt(req.query.student_id, 10) : null;
    const payments = await parentService.getParentPayments(parent_id, req.user.academy_id, studentId);

    return res.status(200).json(
      successResponse('Payments retrieved successfully', payments)
    );
  } catch (error) {
    next(error);
  }
};

export const recordPayment = async (req, res, next) => {
  try {
    const payload = { ...req.body };

    if (req.file) {
      payload.proof_url = req.file.path;
    }

    const receipt = await parentService.recordParentPayment(req.user.id, req.user.academy_id, payload);

    return res.status(201).json(
      successResponse('Payment submitted and pending admin approval', receipt)
    );
  } catch (error) {
    next(error);
  }
};

export const updatePaymentProof = async (req, res, next) => {
  try {
    const payload = { ...req.body };

    if (req.file) {
      payload.proof_url = req.file.path;
    }

    const receipt = await parentService.updateParentPaymentProof(
      req.user.id,
      req.user.academy_id,
      req.params.receiptId,
      payload.proof_url
    );

    return res.status(200).json(
      successResponse('Payment proof updated successfully', receipt)
    );
  } catch (error) {
    next(error);
  }
};

export const getChildPerformance = async (req, res, next) => {
  try {
    const parent_id = req.user.id;
    const { child_id } = req.params;

    // Verify child belongs to parent
    const child = await prisma.student.findFirst({
      where: {
        student_id: parseInt(child_id),
        parent_id,
        is_deleted: false,
      },
    });

    if (!child) {
      return res.status(404).json({
        success: false,
        message: 'Child not found or not linked to your account',
      });
    }

    const { performanceService } = await import('../performance/performance.service.js');
    const data = await performanceService.getStudentPerformance(child.academy_id, child_id);

    return res.status(200).json(
      successResponse('Child performance retrieved successfully', data)
    );
  } catch (error) {
    next(error);
  }
};

export const getChildPerformanceHistory = async (req, res, next) => {
  try {
    const parent_id = req.user.id;
    const { child_id } = req.params;

    // Verify child belongs to parent
    const child = await prisma.student.findFirst({
      where: {
        student_id: parseInt(child_id),
        parent_id,
        is_deleted: false,
      },
    });

    if (!child) {
      return res.status(404).json({
        success: false,
        message: 'Child not found or not linked to your account',
      });
    }

    const { performanceService } = await import('../performance/performance.service.js');
    const data = await performanceService.getAssessmentHistory(child.academy_id, {
      student_id: child_id,
      ...req.query
    });

    return res.status(200).json(
      successResponse('Child performance history retrieved successfully', data)
    );
  } catch (error) {
    next(error);
  }
};

export const getChildPerformanceAnalytics = async (req, res, next) => {
  try {
    const parent_id = req.user.id;
    const { child_id } = req.params;

    // Verify child belongs to parent
    const child = await prisma.student.findFirst({
      where: {
        student_id: parseInt(child_id),
        parent_id,
        is_deleted: false,
      },
    });

    if (!child) {
      return res.status(404).json({
        success: false,
        message: 'Child not found or not linked to your account',
      });
    }

    const { performanceAnalytics } = await import('../performance/performance.analytics.js');
    const data = await performanceAnalytics.getStudentPerformanceAnalytics(child.academy_id, child_id);

    return res.status(200).json(
      successResponse('Child performance analytics retrieved successfully', data)
    );
  } catch (error) {
    next(error);
  }
};
