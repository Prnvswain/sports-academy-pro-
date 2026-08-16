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

export const autoDeactivateExpiredStudents = async (academyId = null) => {
  const now = new Date();
  const nowTime = now.getTime();
  
  const studentsWhere = {
    is_deleted: false,
    status: 'ACTIVE',
  };
  if (academyId) {
    studentsWhere.academy_id = academyId;
  }
  
  const activeStudents = await prisma.student.findMany({
    where: studentsWhere,
    include: {
      parent: true,
      sport: true,
      batch: {
        include: {
          coaches: {
            include: {
              coach: true
            }
          }
        }
      },
      enrollments: {
        where: { is_active: true },
        include: {
          duration_plan: true,
          sport: true,
          batch: true,
          coach: true
        }
      }
    }
  });

  logger.info(`Running SAMS plan expiry check for ${activeStudents.length} active students`);

  for (const student of activeStudents) {
    const enrollments = student.enrollments || [];
    if (enrollments.length === 0) continue;
    
    for (const enrollment of enrollments) {
      const planEndDate = enrollment.plan_end_date;
      if (!planEndDate) continue;

      const expiryTime = new Date(planEndDate).getTime();
      const diffTime = expiryTime - nowTime;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // CASE A: Plan Expiring Soon (10 days or less remaining, in the future)
      if (diffDays > 0 && diffDays <= 10) {
        const reminderSentTag = `RENEWAL_10_DAY_${enrollment.enrollment_id}_${planEndDate.toISOString()}`;
        
        // Check duplicate notification
        const existingNotify = await prisma.notification.findFirst({
          where: {
            metadata: {
              contains: reminderSentTag
            }
          }
        });

        if (!existingNotify) {
          logger.info(`Sending SAMS 10-day expiry reminder for student ${student.name}`);
          
          const sportName = enrollment.sport?.name || student.sport?.name || 'General';
          const batchName = enrollment.batch?.name || student.batch?.name || 'General';
          const planName = enrollment.duration_plan?.name || 'Current Plan';
          const formattedExpiry = new Date(planEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          
          // Notify Parent
          if (student.parent_id) {
            await prisma.notification.create({
              data: {
                academy_id: student.academy_id,
                user_id: student.parent_id,
                type: 'DUE_FEE',
                title: 'Plan Expiring Soon',
                body: `Your child's current plan will expire in ${diffDays} days. Please renew the plan to continue training without interruption. Details: Student: ${student.name}, Sport: ${sportName}, Batch: ${batchName}, Plan: ${planName}, Expiry Date: ${formattedExpiry}.`,
                metadata: JSON.stringify({ tag: reminderSentTag, type: 'parent_reminder' })
              }
            });

            // Send Email to Parent
            if (student.parent?.email) {
              try {
                const html = `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                    <h2 style="color: #d97706; border-bottom: 2px solid #d97706; padding-bottom: 10px;">Plan Expiry Reminder</h2>
                    <p>Hello <strong>${student.parent.name}</strong>,</p>
                    <p>Your child's current plan will expire in ${diffDays} days. Please renew the plan to continue training without interruption.</p>
                    <div style="background: #fffbeb; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #fef3c7;">
                      <p><strong>Student Name:</strong> ${student.name}</p>
                      <p><strong>Sport:</strong> ${sportName}</p>
                      <p><strong>Batch:</strong> ${batchName}</p>
                      <p><strong>Current Plan:</strong> ${planName}</p>
                      <p><strong>Expiry Date:</strong> ${formattedExpiry}</p>
                    </div>
                    <p style="color: #9ca3af; font-size: 11px; margin-top: 20px;">Powered by SAMS SaaS Infrastructure Platform</p>
                  </div>
                `;
                await sendMail({
                  to: student.parent.email,
                  subject: `Plan Expiry Reminder: ${student.name} - ${diffDays} days remaining`,
                  html,
                  text: `Your child's current plan will expire in ${diffDays} days. Please renew the plan to continue training without interruption.`
                });
              } catch (emailErr) {
                logger.error('Failed to dispatch plan expiry email to parent', { email: student.parent.email, error: emailErr.message });
              }
            }
          }

          // Notify Admin
          const adminUser = await prisma.user.findFirst({
            where: { academy_id: student.academy_id, role: 'ACADEMY_ADMIN', is_deleted: false }
          });
          
          await prisma.notification.create({
            data: {
              academy_id: student.academy_id,
              user_id: adminUser?.user_id || null,
              type: 'GENERAL',
              title: `Renewal Required: ${student.name}`,
              body: `Student "${student.name}"'s plan for "${sportName}" is expiring on ${formattedExpiry}.`,
              metadata: JSON.stringify({ tag: reminderSentTag, type: 'admin_reminder' })
            }
          });
        }
      }

      // CASE B: Plan Expired (nowTime >= expiryTime)
      if (nowTime >= expiryTime) {
        const graceEnd = expiryTime + 2 * 24 * 60 * 60 * 1000;
        
        // If grace period has ended: deactivation required
        if (nowTime >= graceEnd) {
          if (student.auto_deactivate_on_due) {
            logger.info(`SAMS Grace period ended. Auto-deactivating student ${student.name}`);
            
            const sportName = enrollment.sport?.name || student.sport?.name || 'General';
            const batchName = enrollment.batch?.name || student.batch?.name || 'General';
            const planName = enrollment.duration_plan?.name || 'Current Plan';
            const formattedExpiry = new Date(planEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            
            await prisma.$transaction([
              prisma.student.update({
                where: { student_id: student.student_id },
                data: {
                  status: 'INACTIVE',
                  auto_deactivated: true
                }
              }),
              prisma.studentEnrollment.update({
                where: { enrollment_id: enrollment.enrollment_id },
                data: { is_active: false }
              })
            ]);

            const deactivationTag = `DEACTIVATION_${enrollment.enrollment_id}_${planEndDate.toISOString()}`;
            
            // Notify Parent
            if (student.parent_id) {
              await prisma.notification.create({
                data: {
                  academy_id: student.academy_id,
                  user_id: student.parent_id,
                  type: 'OVERDUE_FEE',
                  title: 'Plan Expired — Student Deactivated',
                  body: `Your child's plan has expired and the grace period has ended. The student has been temporarily deactivated. Please contact the academy / renew the plan to reactivate training. Student: ${student.name}, Sport: ${sportName}.`,
                  metadata: JSON.stringify({ tag: deactivationTag, type: 'parent_deactivation' })
                }
              });

              if (student.parent?.email) {
                try {
                  const html = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                      <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">Student Account Deactivated</h2>
                      <p>Hello <strong>${student.parent.name}</strong>,</p>
                      <p>Your child's plan has expired and the grace period has ended. The student has been temporarily deactivated.</p>
                      <p>Please contact the academy or renew the plan to reactivate training.</p>
                      <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #fecaca;">
                        <p><strong>Student Name:</strong> ${student.name}</p>
                        <p><strong>Sport:</strong> ${sportName}</p>
                        <p><strong>Batch:</strong> ${batchName}</p>
                        <p><strong>Current Plan:</strong> ${planName}</p>
                        <p><strong>Expiry Date:</strong> ${formattedExpiry}</p>
                      </div>
                      <p style="color: #9ca3af; font-size: 11px; margin-top: 20px;">Powered by SAMS SaaS Infrastructure Platform</p>
                    </div>
                  `;
                  await sendMail({
                    to: student.parent.email,
                    subject: `Student Deactivated: ${student.name} - Plan Expired`,
                    html,
                    text: `Your child's plan has expired and the grace period has ended. The student has been temporarily deactivated. Please contact the academy / renew the plan to reactivate training.`
                  });
                } catch (emailErr) {
                  logger.error('Failed to dispatch plan deactivation email to parent', { email: student.parent.email, error: emailErr.message });
                }
              }
            }

            // Notify Coach
            const coachId = enrollment.coach_id || student.batch?.coaches?.[0]?.coach_id || null;
            if (coachId) {
              await prisma.notification.create({
                data: {
                  academy_id: student.academy_id,
                  coach_id: coachId,
                  type: 'GENERAL',
                  title: `Student Deactivated: ${student.name}`,
                  body: `Your assigned student "${student.name}" has been automatically deactivated because their plan for "${sportName}" expired and the 2-day grace period ended without renewal.`,
                  metadata: JSON.stringify({ tag: deactivationTag, type: 'coach_deactivation' })
                }
              });
            }

            // Notify Admin
            const adminUser = await prisma.user.findFirst({
              where: { academy_id: student.academy_id, role: 'ACADEMY_ADMIN', is_deleted: false }
            });
            await prisma.notification.create({
              data: {
                academy_id: student.academy_id,
                user_id: adminUser?.user_id || null,
                type: 'OVERDUE_FEE',
                title: `Student Deactivated: ${student.name}`,
                body: `Student "${student.name}" has been automatically deactivated because the plan expired and the 2-day grace period ended without renewal.`,
                metadata: JSON.stringify({ tag: deactivationTag, type: 'admin_deactivation' })
              }
            });
          }
        }
      }
    }
  }

  return [];
};

export const getExpiryRemindersForAdmin = async (academyId) => {
  const academy_id = parseInt(academyId, 10);
  const now = new Date();
  const nowTime = now.getTime();

  const students = await prisma.student.findMany({
    where: {
      academy_id,
      is_deleted: false
    },
    include: {
      parent: true,
      sport: true,
      batch: {
        include: {
          coaches: {
            include: { coach: true }
          }
        }
      },
      enrollments: {
        include: {
          duration_plan: true,
          sport: true,
          batch: true,
          coach: true
        },
        orderBy: { created_at: 'desc' }
      }
    }
  });

  const reminders = await prisma.notification.findMany({
    where: {
      academy_id,
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

  const result = [];

  students.forEach(student => {
    // Determine category
    let expiryStatus = null;
    let daysRemaining = null;
    let activeEnrollment = student.enrollments.find(e => e.is_active) || student.enrollments[0] || null;

    if (student.status === 'INACTIVE' && student.auto_deactivated) {
      expiryStatus = 'RECENTLY_DEACTIVATED';
      daysRemaining = 0;
    } else if (student.status === 'ACTIVE' && activeEnrollment && activeEnrollment.plan_end_date) {
      const planEndDate = activeEnrollment.plan_end_date;
      const expiryTime = new Date(planEndDate).getTime();
      const diffTime = expiryTime - nowTime;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0 && diffDays <= 10) {
        expiryStatus = 'EXPIRING_SOON';
        daysRemaining = diffDays;
      } else if (diffDays <= 0) {
        const graceEnd = expiryTime + 2 * 24 * 60 * 60 * 1000;
        if (nowTime < graceEnd) {
          const graceDays = Math.ceil((graceEnd - nowTime) / (1000 * 60 * 60 * 24));
          expiryStatus = graceDays === 1 ? 'DEACTIVATION_PENDING' : 'GRACE_PERIOD';
          daysRemaining = graceDays;
        }
      }
    }

    if (expiryStatus) {
      result.push({
        student_id: student.student_id,
        photo: student.photo,
        name: student.name,
        sport: activeEnrollment?.sport?.name || student.sport?.name || 'N/A',
        batch: activeEnrollment?.batch?.name || student.batch?.name || 'N/A',
        coach: activeEnrollment?.coach?.name || student.batch?.coaches?.[0]?.coach?.name || 'N/A',
        parent: student.parent?.name || 'N/A',
        current_plan: activeEnrollment?.duration_plan?.name || 'N/A',
        expiry_date: activeEnrollment?.plan_end_date || null,
        days_remaining: daysRemaining,
        status: student.status,
        expiry_status: expiryStatus,
        last_reminder_sent_at: reminderMap[student.student_id] || null
      });
    }
  });

  return result;
};

export const getExpiryRemindersForCoach = async (coachId, academyId) => {
  const coach_id = parseInt(coachId, 10);
  const academy_id = parseInt(academyId, 10);
  const now = new Date();
  const nowTime = now.getTime();

  const coachBatches = await prisma.batch.findMany({
    where: {
      academy_id,
      coaches: { some: { coach_id } }
    },
    select: { batch_id: true }
  });
  const batchIds = coachBatches.map(b => b.batch_id);

  if (batchIds.length === 0) return [];

  const students = await prisma.student.findMany({
    where: {
      academy_id,
      is_deleted: false,
      enrollments: {
        some: { batch_id: { in: batchIds } }
      }
    },
    include: {
      parent: true,
      sport: true,
      batch: {
        include: {
          coaches: {
            include: { coach: true }
          }
        }
      },
      enrollments: {
        include: {
          duration_plan: true,
          sport: true,
          batch: true,
          coach: true
        },
        orderBy: { created_at: 'desc' }
      }
    }
  });

  const reminders = await prisma.notification.findMany({
    where: {
      academy_id,
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

  const result = [];

  students.forEach(student => {
    let expiryStatus = null;
    let daysRemaining = null;
    let activeEnrollment = student.enrollments.find(e => e.is_active) || student.enrollments[0] || null;

    if (student.status === 'INACTIVE' && student.auto_deactivated) {
      expiryStatus = 'RECENTLY_DEACTIVATED';
      daysRemaining = 0;
    } else if (student.status === 'ACTIVE' && activeEnrollment && activeEnrollment.plan_end_date) {
      const planEndDate = activeEnrollment.plan_end_date;
      const expiryTime = new Date(planEndDate).getTime();
      const diffTime = expiryTime - nowTime;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0 && diffDays <= 10) {
        expiryStatus = 'EXPIRING_SOON';
        daysRemaining = diffDays;
      } else if (diffDays <= 0) {
        const graceEnd = expiryTime + 2 * 24 * 60 * 60 * 1000;
        if (nowTime < graceEnd) {
          const graceDays = Math.ceil((graceEnd - nowTime) / (1000 * 60 * 60 * 24));
          expiryStatus = graceDays === 1 ? 'DEACTIVATION_PENDING' : 'GRACE_PERIOD';
          daysRemaining = graceDays;
        }
      }
    }

    if (expiryStatus) {
      result.push({
        student_id: student.student_id,
        photo: student.photo,
        name: student.name,
        sport: activeEnrollment?.sport?.name || student.sport?.name || 'N/A',
        batch: activeEnrollment?.batch?.name || student.batch?.name || 'N/A',
        coach: activeEnrollment?.coach?.name || student.batch?.coaches?.[0]?.coach?.name || 'N/A',
        parent: student.parent?.name || 'N/A',
        current_plan: activeEnrollment?.duration_plan?.name || 'N/A',
        expiry_date: activeEnrollment?.plan_end_date || null,
        days_remaining: daysRemaining,
        status: student.status,
        expiry_status: expiryStatus,
        last_reminder_sent_at: reminderMap[student.student_id] || null
      });
    }
  });

  return result;
};

export const sendManualRenewalReminder = async (academyId, studentId, actorRole, coachId = null) => {
  const academy_id = parseInt(academyId, 10);
  const student_id = parseInt(studentId, 10);
  const now = new Date();

  // Find student and active enrollments
  const student = await prisma.student.findFirst({
    where: { student_id, academy_id, is_deleted: false },
    include: {
      parent: true,
      sport: true,
      batch: {
        include: {
          coaches: {
            include: { coach: true }
          }
        }
      },
      enrollments: {
        where: { is_active: true },
        include: { duration_plan: true, sport: true, batch: true, coach: true }
      }
    }
  });

  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  // Coach-specific verification
  if (actorRole === 'COACH' && coachId) {
    const coach_id = parseInt(coachId, 10);
    const coachBatches = await prisma.batch.findMany({
      where: { academy_id, coaches: { some: { coach_id } } },
      select: { batch_id: true }
    });
    const batchIds = coachBatches.map(b => b.batch_id);
    const isEnrolled = student.enrollments.some(e => batchIds.includes(e.batch_id));
    if (!isEnrolled) {
      const error = new Error('Forbidden: Student not assigned to this coach');
      error.statusCode = 403;
      throw error;
    }
  }

  // Check 24 hour cooldown based on notification metadata tag
  const lastReminders = await prisma.notification.findMany({
    where: {
      academy_id,
      metadata: { contains: `"type":"MANUAL_REMINDER"` }
    },
    orderBy: { created_at: 'desc' }
  });

  const latestForStudent = lastReminders.find(r => {
    try {
      const meta = JSON.parse(r.metadata);
      return meta.student_id === student_id;
    } catch (e) {
      return false;
    }
  });

  if (latestForStudent) {
    const timeSince = now.getTime() - new Date(latestForStudent.created_at).getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    if (timeSince < oneDay) {
      const hoursRemaining = Math.ceil((oneDay - timeSince) / (1000 * 60 * 60));
      const error = new Error(`Renewal reminder already sent recently. Please wait ${hoursRemaining} hours before sending another.`);
      error.statusCode = 400;
      throw error;
    }
  }

  const enrollment = student.enrollments[0] || null;
  const sportName = enrollment?.sport?.name || student.sport?.name || 'General';
  const batchName = enrollment?.batch?.name || student.batch?.name || 'General';
  const planName = enrollment?.duration_plan?.name || 'Current Plan';
  const formattedExpiry = enrollment?.plan_end_date 
    ? new Date(enrollment.plan_end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A';

  // Dispatch Notifications
  const metadata = { type: 'MANUAL_REMINDER', student_id, sent_by: actorRole };

  // 1. Notify Parent
  if (student.parent_id) {
    await prisma.notification.create({
      data: {
        academy_id,
        user_id: student.parent_id,
        type: 'DUE_FEE',
        title: 'Plan Renewal Reminder',
        body: `Dear Parent, please renew your child's (${student.name}) SAMS training plan. Sport: ${sportName}, Batch: ${batchName}, Plan: ${planName}, Expiry: ${formattedExpiry}.`,
        metadata: JSON.stringify(metadata)
      }
    });

    // Send Parent Email
    if (student.parent?.email) {
      try {
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">Renewal Reminder Issued</h2>
            <p>Hello <strong>${student.parent.name}</strong>,</p>
            <p>This is a renewal reminder to ensure continuous training sessions for <strong>${student.name}</strong>:</p>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e2e8f0;">
              <p><strong>Student Name:</strong> ${student.name}</p>
              <p><strong>Sport:</strong> ${sportName}</p>
              <p><strong>Batch:</strong> ${batchName}</p>
              <p><strong>Duration Plan:</strong> ${planName}</p>
              <p><strong>Expiry Date:</strong> ${formattedExpiry}</p>
            </div>
            <p>Please log in to the parent portal to complete the renewal process.</p>
            <p style="color: #9ca3af; font-size: 11px; margin-top: 20px;">Powered by SAMS SaaS Infrastructure Platform</p>
          </div>
        `;
        await sendMail({
          to: student.parent.email,
          subject: `Renewal Reminder for ${student.name} - Plan Expiry`,
          html,
          text: `Renewal reminder for ${student.name}. Plan: ${planName}, Expiry: ${formattedExpiry}`
        });
      } catch (emailErr) {
        logger.error('Failed to dispatch manual reminder email', { email: student.parent.email, error: emailErr.message });
      }
    }
  }

  // 2. Notify Assigned Coach (if sent by Admin)
  if (actorRole === 'ADMIN') {
    const coachIdAssigned = enrollment?.coach_id || student.batch?.coaches?.[0]?.coach_id || null;
    if (coachIdAssigned) {
      await prisma.notification.create({
        data: {
          academy_id,
          coach_id: coachIdAssigned,
          type: 'GENERAL',
          title: `Renewal Reminder Sent: ${student.name}`,
          body: `An automatic renewal reminder has been sent to student "${student.name}"'s parent for batch "${batchName}".`,
          metadata: JSON.stringify(metadata)
        }
      });
    }
  }

  // Record Audit Log
  await prisma.auditLog.create({
    data: {
      academy_id,
      actor_type: actorRole,
      actor_id: coachId ? parseInt(coachId, 10) : null,
      action: 'SEND_RENEWAL_REMINDER',
      entity_type: 'Student',
      entity_id: student_id,
      metadata: JSON.stringify({ student_name: student.name, sent_by: actorRole })
    }
  });

  return { success: true, message: 'Renewal reminder dispatched successfully.' };
};