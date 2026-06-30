import prisma from '../../config/prisma.js';
import { NOT_DELETED } from '../../utils/softDelete.util.js';
import logger from '../../utils/logger.js';
import * as mailService from '../../services/mail.service.js';

const sendMail = mailService.sendMail || mailService.default?.sendMail || mailService.default;

export const createFee = async (academy_id, data) => {
  const academyId = parseInt(academy_id, 10);
  const { student_id, amount_due, due_date, description } = data;

  const student = await prisma.student.findFirst({
    where: {
      student_id: parseInt(student_id, 10),
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

  const fee = await prisma.fee.create({
    data: {
      academy_id: academyId,
      student_id: parseInt(student_id, 10),
      amount_due: parseFloat(amount_due),
      due_date: new Date(due_date),
      description: description || null
    },
    include: {
      student: {
        include: {
          parent: true,
          academy: { select: { name: true } }
        }
      }
    }
  });

  // [AUTOMATED INVOICE INJECTION] - Trigger inline email generation immediately for new pending invoices
  if (student.parent?.email) {
    try {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">New Invoice Generated</h2>
          <p>Hello <strong>${student.parent.name}</strong>,</p>
          <p>A new billing cycle invoice has been generated for <strong>${student.name}</strong> at <strong>${fee.student.academy.name}</strong>:</p>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e2e8f0;">
            <p><strong>Invoice ID:</strong> SAMS-INV-${fee.fee_id}</p>
            <p><strong>Amount Due:</strong> ₹${fee.amount_due}</p>
            <p><strong>Due Date:</strong> ${new Date(fee.due_date).toLocaleDateString()}</p>
            <p><strong>Description:</strong> ${fee.description || 'Regular Academy Sports Fee Session'}</p>
          </div>
          <p>Please ensure payment is settled before the due date to ensure continuous training sessions.</p>
          <p style="color: #9ca3af; font-size: 11px; margin-top: 20px;">Powered by SAMS SaaS Infrastructure Platform</p>
        </div>
      `;
      await sendMail({
        to: student.parent.email,
        subject: `New Invoice Issued - ₹${fee.amount_due} for ${student.name}`,
        html,
        text: `New Invoice Generated for ${student.name}. Amount: ₹${fee.amount_due}, Due Date: ${new Date(fee.due_date).toLocaleDateString()}`
      });
    } catch (err) {
      logger.error('Failed to dispatch inline invoice email alert', { fee_id: fee.fee_id, error: err.message });
    }
  }

  logger.info('Fee created and invoice dispatched', { fee_id: fee.fee_id, academy_id: academyId, student_id: fee.student_id });
  return fee;
};

export const getStudentFees = async (academy_id, student_id) => {
  const academyId = parseInt(academy_id, 10);
  const studentId = parseInt(student_id, 10);

  const fees = await prisma.fee.findMany({
    where: {
      academy_id: academyId,
      student_id: studentId
    },
    orderBy: {
      due_date: 'asc'
    },
    include: {
      student: {
        select: {
          name: true,
          parent: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }
    }
  });

  return fees;
};

export const getAcademyFees = async (academy_id, filters = {}) => {
  const academyId = parseInt(academy_id, 10);
  const { status, student_id } = filters;

  const where = {
    academy_id: academyId
  };

  if (status) {
    where.status = status;
  }

  if (student_id) {
    where.student_id = parseInt(student_id, 10);
  }

  const fees = await prisma.fee.findMany({
    where,
    orderBy: {
      due_date: 'asc'
    },
    include: {
      student: {
        select: {
          name: true,
          parent: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }
    }
  });

  return fees;
};

export const markFeeAsPaid = async (academy_id, fee_id, amount_paid) => {
  const academyId = parseInt(academy_id, 10);
  const feeId = parseInt(fee_id, 10);

  const fee = await prisma.fee.findFirst({
    where: {
      fee_id: feeId,
      academy_id: academyId
    }
  });

  if (!fee) {
    const error = new Error('Fee not found');
    error.statusCode = 404;
    throw error;
  }

  // Use transactional update to modify fee ledger AND generate an audit Receipt entry cleanly
  const updatedFee = await prisma.$transaction(async (tx) => {
    const targetFee = await tx.fee.update({
      where: { fee_id: feeId },
      data: {
        status: 'PAID',
        paid_amount: parseFloat(amount_paid),
        paid_at: new Date()
      },
      include: {
        student: {
          include: {
            parent: true
          }
        }
      }
    });

    // Automatically generate a Receipt token for accounting tracking
    await tx.receipt.create({
      data: {
        receipt_number: `REC-${Date.now()}-${feeId}`,
        academy_id: academyId,
        student_id: targetFee.student_id,
        amount: parseFloat(amount_paid),
        payment_date: new Date(),
        method: 'SYSTEM_AUTOPAY',
        status: 'COMPLETED',
        remarks: `Auto-generated receipt from updated digital invoice record #${feeId}`
      }
    });

    return targetFee;
  });

  logger.info('Fee marked as paid and tracking receipt issued', { fee_id: feeId, academy_id: academyId });
  return updatedFee;
};

export const checkOverdueFees = async () => {
  const now = new Date();
  
  const overdueFees = await prisma.fee.findMany({
    where: {
      due_date: {
        lt: now
      },
      status: 'PENDING'
    },
    include: {
      student: {
        include: {
          parent: true,
          academy: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });

  const updatedFees = await prisma.$transaction(async (tx) => {
    const updates = await Promise.all(
      overdueFees.map(fee =>
        tx.fee.update({
          where: { fee_id: fee.fee_id },
          data: { status: 'OVERDUE' }
        })
      )
    );
    return updates;
  });

  logger.info('Overdue fees detected and updated', { count: updatedFees.length });
  return updatedFees;
};

export const sendOverdueFeeReminders = async () => {
  const overdueFees = await prisma.fee.findMany({
    where: {
      status: 'OVERDUE'
    },
    include: {
      student: {
        include: {
          parent: true,
          academy: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });

  const emailResults = [];

  for (const fee of overdueFees) {
    if (fee.student.parent && fee.student.parent.email) {
      try {
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #dc2626;">Overdue Fee Reminder</h2>
            <p>Hello <strong>${fee.student.parent.name}</strong>,</p>
            <p>This is a reminder that the following fee for <strong>${fee.student.name}</strong> is overdue:</p>
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #fecaca;">
              <p><strong>Amount Due:</strong> ₹${fee.amount_due}</p>
              <p><strong>Due Date:</strong> ${new Date(fee.due_date).toLocaleDateString()}</p>
              <p><strong>Description:</strong> ${fee.description || 'N/A'}</p>
            </div>
            <p>Please arrange for payment at your earliest convenience.</p>
            <p style="color: #6b7280; font-size: 12px;">This is an automated message from SAMS - ${fee.student.academy.name}.</p>
          </div>
        `;

        await sendMail({
          to: fee.student.parent.email,
          subject: `Overdue Fee Reminder - ${fee.student.name}`,
          html,
          text: `Overdue fee reminder for ${fee.student.name}. Amount: ₹${fee.amount_due}, Due: ${new Date(fee.due_date).toLocaleDateString()}`
        });

        emailResults.push({ fee_id: fee.fee_id, success: true, email: fee.student.parent.email });
      } catch (mailError) {
        logger.error('Failed to send overdue fee reminder', {
          fee_id: fee.fee_id,
          email: fee.student.parent.email,
          error: mailError.message
        });
        emailResults.push({ fee_id: fee.fee_id, success: false, email: fee.student.parent.email, error: mailError.message });
      }
    }
  }

  logger.info('Overdue fee reminders sent', { total: overdueFees.length, successful: emailResults.filter(r => r.success).length });
  return emailResults;
};

export const getFeeStats = async (academy_id) => {
  // If no academy_id is specified, compute multi-tenant Global Analytics for Super Admin (Platform Owner) View
  if (!academy_id) {
    const [totalFees, pendingCount, overdueCount, paidCount, globalDue, globalCollected] = await Promise.all([
      prisma.fee.count(),
      prisma.fee.count({ where: { status: 'PENDING' } }),
      prisma.fee.count({ where: { status: 'OVERDUE' } }),
      prisma.fee.count({ where: { status: 'PAID' } }),
      prisma.fee.aggregate({
        where: { status: { in: ['PENDING', 'OVERDUE'] } },
        _sum: { amount_due: true }
      }),
      prisma.fee.aggregate({
        where: { status: 'PAID' },
        _sum: { paid_amount: true }
      })
    ]);

    const mrrTotal = globalCollected._sum.paid_amount ? parseFloat(globalCollected._sum.paid_amount) : 0;
    
    return {
      is_global_platform_view: true,
      total_fees: totalFees,
      pending_fees: pendingCount,
      overdue_fees: overdueCount,
      paid_fees: paidCount,
      total_due: globalDue._sum.amount_due || 0,
      total_collected: mrrTotal,
      estimated_mrr: mrrTotal,
      estimated_arr: mrrTotal * 12
    };
  }

  const academyId = parseInt(academy_id, 10);

  const [totalFees, pendingFees, overdueFees, paidFees, totalDue, totalCollected] = await Promise.all([
    prisma.fee.count({ where: { academy_id: academyId } }),
    prisma.fee.count({ where: { academy_id: academyId, status: 'PENDING' } }),
    prisma.fee.count({ where: { academy_id: academyId, status: 'OVERDUE' } }),
    prisma.fee.count({ where: { academy_id: academyId, status: 'PAID' } }),
    prisma.fee.aggregate({
      where: { academy_id: academyId, status: { in: ['PENDING', 'OVERDUE'] } },
      _sum: { amount_due: true }
    }),
    prisma.fee.aggregate({
      where: { academy_id: academyId, status: 'PAID' },
      _sum: { paid_amount: true }
    })
  ]);

  return {
    is_global_platform_view: false,
    total_fees: totalFees,
    pending_fees: pendingFees,
    overdue_fees: overdueFees,
    paid_fees: paidFees,
    total_due: totalDue._sum.amount_due || 0,
    total_collected: totalCollected._sum.paid_amount || 0
  };
};