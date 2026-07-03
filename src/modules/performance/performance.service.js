import prisma from '../../config/prisma.js';
import { NOT_DELETED } from '../../utils/softDelete.util.js';
import logger from '../../utils/logger.js';
// 1. Pure module ko ek object ki tarah import karo
import * as mailService from '../../services/mail.service.js';

// 2. Safe extraction: Chahe file me named export ho, default export ho, ya CommonJS module.exports ho, ye sabko handle karega
const sendMail = mailService.sendMail || mailService.default?.sendMail || mailService.default;

export const getAttributes = async (academyId, query = {}) => {
  const { sport_id, status } = query;
  
  console.log('=== getAttributes DEBUG ===');
  console.log('academyId:', academyId, 'type:', typeof academyId);
  console.log('sport_id:', sport_id, 'type:', typeof sport_id);
  console.log('status:', status);
  console.log('query:', query);
  
  const where = {
    academy_id: academyId,
    is_deleted: false
  };

  if (sport_id) {
    where.sport_id = parseInt(sport_id, 10);
  }

  if (status) {
    where.status = status.toUpperCase();
  }

  console.log('where clause:', where);
  console.log('where.sport_id:', where.sport_id, 'type:', typeof where.sport_id);
  console.log('where.academy_id:', where.academy_id, 'type:', typeof where.academy_id);
  console.log('where.status:', where.status);
  console.log('where.is_deleted:', where.is_deleted);

  const attributes = await prisma.performanceAttribute.findMany({
    where,
    include: {
      sport: {
        select: {
          sport_id: true,
          name: true
        }
      },
      requested_by: {
        select: {
          coach_id: true,
          name: true
        }
      }
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  console.log('getAttributes result count:', attributes.length);
  if (attributes.length > 0) {
    console.log('Sample attribute:', attributes[0]);
    console.log('Sample attribute sport_id:', attributes[0].sport_id);
    console.log('Sample attribute academy_id:', attributes[0].academy_id);
    console.log('Sample attribute status:', attributes[0].status);
  } else {
    console.log('No attributes found. Checking database directly...');
    
    // Debug: Check what attributes exist for this academy
    const allAcademyAttrs = await prisma.performanceAttribute.findMany({
      where: { academy_id: academyId },
      select: { attribute_id: true, name: true, sport_id: true, status: true, is_deleted: true }
    });
    console.log('All academy attributes (without filters):', allAcademyAttrs);
    
    // Debug: Check what attributes exist for this sport
    if (sport_id) {
      const allSportAttrs = await prisma.performanceAttribute.findMany({
        where: { sport_id: parseInt(sport_id, 10) },
        select: { attribute_id: true, name: true, academy_id: true, status: true, is_deleted: true }
      });
      console.log('All sport attributes (without filters):', allSportAttrs);
    }
  }

  return attributes;
};

export const createAttribute = async (academyId, userId, userRole, data) => {
  const { sport_id, name } = data;

  console.log('=== createAttribute DEBUG ===');
  console.log('academyId:', academyId, 'type:', typeof academyId);
  console.log('userId:', userId, 'type:', typeof userId);
  console.log('userRole:', userRole);
  console.log('sport_id:', sport_id, 'type:', typeof sport_id);
  console.log('name:', name);

  if (!sport_id || !name) {
    const error = new Error('sport_id and name are required');
    error.statusCode = 400;
    throw error;
  }

  // Check if attribute already exists for this sport
  const existing = await prisma.performanceAttribute.findFirst({
    where: {
      academy_id: academyId,
      sport_id: parseInt(sport_id, 10),
      name: name.trim()
    }
  });

  console.log('existing attribute check:', existing);

  if (existing) {
    const error = new Error('Attribute with this name already exists for this sport');
    error.statusCode = 409;
    throw error;
  }

  const attributeData = {
    academy_id: academyId,
    sport_id: parseInt(sport_id, 10),
    name: name.trim(),
    status: 'APPROVED'
  };

  // If created by coach, set status to PENDING
  if (userRole === 'COACH') {
    attributeData.status = 'PENDING';
    attributeData.requested_by_coach_id = userId;
    console.log('Setting requested_by_coach_id to:', userId, 'type:', typeof userId);
  }

  console.log('attributeData before create:', attributeData);

  const attribute = await prisma.performanceAttribute.create({
    data: attributeData,
    include: {
      sport: {
        select: {
          sport_id: true,
          name: true
        }
      }
    }
  });

  console.log('Created attribute:', attribute);

  logger.info('Performance attribute created', {
    attribute_id: attribute.attribute_id,
    academy_id: academyId,
    sport_id: attribute.sport_id,
    name: attribute.name,
    status: attribute.status,
    created_by: userRole
  });

  return attribute;
};

export const approveAttribute = async (academyId, attributeId) => {
  const attribute = await prisma.performanceAttribute.findFirst({
    where: {
      attribute_id: parseInt(attributeId, 10),
      academy_id: academyId
    }
  });

  if (!attribute) {
    const error = new Error('Performance attribute not found');
    error.statusCode = 404;
    throw error;
  }

  const updated = await prisma.performanceAttribute.update({
    where: { attribute_id: parseInt(attributeId, 10) },
    data: {
      status: 'APPROVED',
      reviewed_at: new Date()
    },
    include: {
      sport: {
        select: {
          sport_id: true,
          name: true
        }
      }
    }
  });

  logger.info('Performance attribute approved', {
    attribute_id: attribute.attribute_id,
    academy_id: academyId
  });

  return updated;
};

export const rejectAttribute = async (academyId, attributeId) => {
  const attribute = await prisma.performanceAttribute.findFirst({
    where: {
      attribute_id: parseInt(attributeId, 10),
      academy_id: academyId
    }
  });

  if (!attribute) {
    const error = new Error('Performance attribute not found');
    error.statusCode = 404;
    throw error;
  }

  const updated = await prisma.performanceAttribute.update({
    where: { attribute_id: parseInt(attributeId, 10) },
    data: {
      status: 'REJECTED',
      reviewed_at: new Date()
    },
    include: {
      sport: {
        select: {
          sport_id: true,
          name: true
        }
      }
    }
  });

  logger.info('Performance attribute rejected', {
    attribute_id: attribute.attribute_id,
    academy_id: academyId
  });

  return updated;
};

export const updateAttribute = async (academyId, attributeId, data) => {
  const { name, sport_id } = data;

  const attribute = await prisma.performanceAttribute.findFirst({
    where: {
      attribute_id: parseInt(attributeId, 10),
      academy_id: academyId
    }
  });

  if (!attribute) {
    const error = new Error('Performance attribute not found');
    error.statusCode = 404;
    throw error;
  }

  // Check if new name conflicts with existing attribute for this sport
  if (name && name.trim() !== attribute.name) {
    const existing = await prisma.performanceAttribute.findFirst({
      where: {
        academy_id: academyId,
        sport_id: sport_id ? parseInt(sport_id, 10) : attribute.sport_id,
        name: name.trim(),
        attribute_id: { not: parseInt(attributeId, 10) }
      }
    });

    if (existing) {
      const error = new Error('Attribute with this name already exists for this sport');
      error.statusCode = 409;
      throw error;
    }
  }

  const updateData = {};
  if (name) updateData.name = name.trim();
  if (sport_id) updateData.sport_id = parseInt(sport_id, 10);

  const updated = await prisma.performanceAttribute.update({
    where: { attribute_id: parseInt(attributeId, 10) },
    data: updateData,
    include: {
      sport: {
        select: {
          sport_id: true,
          name: true
        }
      }
    }
  });

  logger.info('Performance attribute updated', {
    attribute_id: attribute.attribute_id,
    academy_id: academyId
  });

  return updated;
};

export const deleteAttribute = async (academyId, attributeId) => {
  const attribute = await prisma.performanceAttribute.findFirst({
    where: {
      attribute_id: parseInt(attributeId, 10),
      academy_id: academyId
    }
  });

  if (!attribute) {
    const error = new Error('Performance attribute not found');
    error.statusCode = 404;
    throw error;
  }

  // Soft delete
  const deleted = await prisma.performanceAttribute.update({
    where: { attribute_id: parseInt(attributeId, 10) },
    data: {
      is_deleted: true
    }
  });

  logger.info('Performance attribute deleted', {
    attribute_id: attribute.attribute_id,
    academy_id: academyId
  });

  return deleted;
};

// Sync GlobalSport attributes to PerformanceAttribute for an academy
export const syncGlobalSportAttributes = async (academyId, sportId) => {
  console.log('=== syncGlobalSportAttributes DEBUG ===');
  console.log('academyId:', academyId, 'type:', typeof academyId);
  console.log('sportId:', sportId, 'type:', typeof sportId);

  try {
    // Get the sport to find its global_sport_id
    const sport = await prisma.sport.findUnique({
      where: { sport_id: parseInt(sportId, 10) },
      include: { globalSport: true }
    });

    console.log('Found sport:', sport);

    if (!sport || !sport.globalSport) {
      console.log('Sport or GlobalSport not found');
      return { success: false, message: 'Sport or GlobalSport not found' };
    }

    // Parse global attributes
    const globalAttributes = sport.globalSport.attributes 
      ? JSON.parse(sport.globalSport.attributes) 
      : [];

    console.log('Global attributes:', globalAttributes);

    if (globalAttributes.length === 0) {
      return { success: true, message: 'No global attributes to sync' };
    }

    // Create PerformanceAttribute entries for each global attribute
    const createdAttributes = [];
    for (const attrName of globalAttributes) {
      // Check if attribute already exists
      const existing = await prisma.performanceAttribute.findFirst({
        where: {
          academy_id: academyId,
          sport_id: parseInt(sportId, 10),
          name: attrName
        }
      });

      console.log(`Attribute "${attrName}" exists:`, existing ? 'YES' : 'NO');

      if (!existing) {
        const attribute = await prisma.performanceAttribute.create({
          data: {
            academy_id: academyId,
            sport_id: parseInt(sportId, 10),
            name: attrName,
            status: 'APPROVED'
          },
          include: {
            sport: {
              select: {
                sport_id: true,
                name: true
              }
            }
          }
        });
        createdAttributes.push(attribute);
        console.log('Created attribute:', attribute);
      }
    }

    logger.info('Global sport attributes synced', {
      academy_id: academyId,
      sport_id: sportId,
      count: createdAttributes.length
    });

    console.log('Sync complete. Created:', createdAttributes.length);
    return { success: true, created: createdAttributes.length };
  } catch (error) {
    logger.error('Failed to sync global sport attributes', error);
    console.error('Sync error:', error);
    throw error;
  }
};

export const getScores = async (academyId, query = {}) => {
  const { student_id, batch_id } = query;
  
  const where = {
    academy_id: academyId
  };

  if (student_id) {
    where.student_id = parseInt(student_id, 10);
  }

  if (batch_id) {
    where.batch_id = parseInt(batch_id, 10);
  }

  const scores = await prisma.performanceScore.findMany({
    where,
    include: {
      student: {
        select: {
          student_id: true,
          name: true
        }
      },
      attribute: {
        include: {
          sport: {
            select: {
              sport_id: true,
              name: true
            }
          }
        }
      },
      coach: {
        select: {
          coach_id: true,
          name: true
        }
      },
      batch: {
        select: {
          batch_id: true,
          name: true
        }
      }
    },
    orderBy: {
      scored_at: 'desc'
    }
  });

  return scores;
};

export const createScore = async (academyId, coachId, userRole, data) => {
  const { student_id, attribute_id, batch_id, score, notes } = data;

  if (!student_id || !attribute_id || !score) {
    const error = new Error('student_id, attribute_id, and score are required');
    error.statusCode = 400;
    throw error;
  }

  if (score < 1 || score > 10) {
    const error = new Error('Score must be between 1 and 10');
    error.statusCode = 400;
    throw error;
  }

  // Verify attribute exists and is approved
  const attribute = await prisma.performanceAttribute.findFirst({
    where: {
      attribute_id: parseInt(attribute_id, 10),
      academy_id: academyId,
      status: 'APPROVED'
    }
  });

  if (!attribute) {
    const error = new Error('Approved performance attribute not found');
    error.statusCode = 404;
    throw error;
  }

  // Verify student exists
  const student = await prisma.student.findFirst({
    where: {
      student_id: parseInt(student_id, 10),
      academy_id: academyId,
      ...NOT_DELETED
    }
  });

  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  const scoreData = {
    academy_id: academyId,
    student_id: parseInt(student_id, 10),
    attribute_id: parseInt(attribute_id, 10),
    coach_id: parseInt(coachId, 10),
    score: parseInt(score, 10),
    scored_at: new Date()
  };

  if (batch_id) {
    scoreData.batch_id = parseInt(batch_id, 10);
  }

  if (notes) {
    scoreData.notes = notes.trim();
  }

  const newScore = await prisma.performanceScore.upsert({
    where: {
      student_id_attribute_id: {
        student_id: parseInt(student_id, 10),
        attribute_id: parseInt(attribute_id, 10)
      }
    },
    update: {
      score: parseInt(score, 10),
      coach_id: parseInt(coachId, 10),
      batch_id: batch_id ? parseInt(batch_id, 10) : null,
      notes: notes ? notes.trim() : null,
      scored_at: new Date(),
      updated_at: new Date()
    },
    create: scoreData,
    include: {
      student: {
        select: {
          student_id: true,
          name: true
        }
      },
      attribute: {
        include: {
          sport: {
            select: {
              sport_id: true,
              name: true
            }
          }
        }
      },
      coach: {
        select: {
          coach_id: true,
          name: true
        }
      }
    }
  });

  logger.info('Performance score recorded', {
    score_id: newScore.score_id,
    academy_id: academyId,
    student_id: newScore.student_id,
    attribute_id: newScore.attribute_id,
    score: newScore.score,
    coach_id: coachId
  });

  // Generate or update weekly performance report and notify parent
  try {
    await generateWeeklyReportAndNotify(academyId, parseInt(student_id, 10), parseInt(coachId, 10), batch_id ? parseInt(batch_id, 10) : null);
  } catch (error) {
    // Log error but don't fail the score submission
    logger.error('Failed to generate weekly report or notify parent', { error: error.message, student_id, attribute_id });
  }

  return newScore;
};

// Helper function to generate weekly report and notify parent
const generateWeeklyReportAndNotify = async (academyId, studentId, coachId, batchId) => {
  if (!batchId) {
    logger.info('No batch_id provided, skipping weekly report generation');
    return;
  }

  // Calculate week start date (Monday of current week)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const weekStartDate = new Date(now.setDate(diff));
  weekStartDate.setHours(0, 0, 0, 0);

  // Fetch student and parent info
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

  if (!student || !student.parent) {
    logger.info('Student or parent not found, skipping notification');
    return;
  }

  // Fetch all performance scores for this student in the current week
  const scores = await prisma.performanceScore.findMany({
    where: {
      student_id: studentId,
      batch_id: batchId,
      scored_at: {
        gte: weekStartDate
      }
    },
    include: {
      attribute: {
        select: {
          attribute_id: true,
          name: true
        }
      }
    }
  });

  if (scores.length === 0) {
    logger.info('No scores found for current week, skipping report generation');
    return;
  }

  // Check for existing weekly report
  const existingReport = await prisma.weeklyPerformanceReport.findFirst({
    where: {
      student_id: studentId,
      batch_id: batchId,
      week_start_date: weekStartDate
    }
  });

  let report;

  if (existingReport) {
    // Update existing report
    report = await prisma.weeklyPerformanceReport.update({
      where: { report_id: existingReport.report_id },
      data: {
        updated_at: new Date()
      }
    });

    // Delete existing ratings and recreate
    await prisma.performanceRating.deleteMany({
      where: { report_id: report.report_id }
    });

    await prisma.performanceRating.createMany({
      data: scores.map(s => ({
        report_id: report.report_id,
        attribute_id: s.attribute_id,
        score: s.score
      }))
    });

    logger.info('Updated existing weekly performance report', { report_id: report.report_id });
  } else {
    // Create new report
    report = await prisma.weeklyPerformanceReport.create({
      data: {
        student_id: studentId,
        batch_id: batchId,
        coach_id: coachId,
        week_start_date: weekStartDate
      }
    });

    await prisma.performanceRating.createMany({
      data: scores.map(s => ({
        report_id: report.report_id,
        attribute_id: s.attribute_id,
        score: s.score
      }))
    });

    logger.info('Created new weekly performance report', { report_id: report.report_id });
  }

  // Create notification for parent
  await prisma.notification.create({
    data: {
      academy_id: academyId,
      user_id: student.parent.parent_id,
      type: 'PERFORMANCE_REPORT',
      title: 'New Performance Report Available',
      body: `A new performance report is available for ${student.name}. View the detailed assessment in the Parent Portal.`,
      metadata: JSON.stringify({
        student_id: studentId,
        student_name: student.name,
        report_id: report.report_id,
        week_start_date: weekStartDate.toISOString()
      })
    }
  });

  logger.info('Created parent notification for performance report', {
    parent_id: student.parent.parent_id,
    report_id: report.report_id
  });

  // Send email notification (if email service is available)
  try {
    const sendMail = mailService.sendMail || mailService.default?.sendMail || mailService.default;
    if (sendMail && student.parent.email) {
      await sendMail({
        to: student.parent.email,
        subject: `Performance Report Available for ${student.name}`,
        html: `
          <h2>Performance Report Available</h2>
          <p>Dear Parent,</p>
          <p>A new performance report has been generated for <strong>${student.name}</strong>.</p>
          <p><strong>Week Starting:</strong> ${weekStartDate.toLocaleDateString()}</p>
          <p><strong>Number of Attributes Evaluated:</strong> ${scores.length}</p>
          <p>Please log in to the Parent Portal to view the detailed assessment.</p>
          <p>Best regards,<br>Sports Academy Team</p>
        `
      });
      logger.info('Performance report email sent', { parent_email: student.parent.email });
    }
  } catch (emailError) {
    logger.error('Failed to send performance report email', { error: emailError.message });
  }
};

export const getStudentPerformance = async (academyId, studentId, query = {}) => {
  const where = {
    academy_id: academyId,
    student_id: parseInt(studentId, 10)
  };

  const scores = await prisma.performanceScore.findMany({
    where,
    include: {
      attribute: {
        include: {
          sport: {
            select: {
              sport_id: true,
              name: true
            }
          }
        }
      },
      coach: {
        select: {
          coach_id: true,
          name: true
        }
      },
      batch: {
        select: {
          batch_id: true,
          name: true
        }
      }
    },
    orderBy: {
      scored_at: 'desc'
    }
  });

  // Group by attribute for easier display
  const grouped = {};
  scores.forEach(score => {
    const attrId = score.attribute_id;
    if (!grouped[attrId]) {
      grouped[attrId] = {
        attribute: score.attribute,
        scores: []
      };
    }
    grouped[attrId].scores.push(score);
  });

  return {
    student_id: parseInt(studentId, 10),
    attributes: Object.values(grouped)
  };
};

export const getBatchPerformance = async (academyId, batchId, query = {}) => {
  const where = {
    academy_id: academyId,
    batch_id: parseInt(batchId, 10)
  };

  const scores = await prisma.performanceScore.findMany({
    where,
    include: {
      student: {
        select: {
          student_id: true,
          name: true
        }
      },
      attribute: {
        include: {
          sport: {
            select: {
              sport_id: true,
              name: true
            }
          }
        }
      },
      coach: {
        select: {
          coach_id: true,
          name: true
        }
      }
    },
    orderBy: [
      { student: { name: 'asc' } },
      { scored_at: 'desc' }
    ]
  });

  return {
    batch_id: parseInt(batchId, 10),
    scores
  };
};

export const getApprovalQueue = async (academyId) => {
  const pendingAttributes = await prisma.performanceAttribute.findMany({
    where: {
      academy_id: academyId,
      status: 'PENDING'
    },
    include: {
      sport: {
        select: {
          sport_id: true,
          name: true
        }
      },
      requested_by: {
        select: {
          coach_id: true,
          name: true
        }
      }
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  return pendingAttributes;
};

export const submitWeeklyPerformance = async (academyId, coachId, data) => {
  const { student_id, batch_id, ratings } = data;
  const academyIdInt = parseInt(academyId, 10);
  const coachIdInt = parseInt(coachId, 10);
  const studentIdInt = parseInt(student_id, 10);
  const batchIdInt = parseInt(batch_id, 10);

  // Calculate week start date (Monday of current week)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const weekStartDate = new Date(now.setDate(diff));
  weekStartDate.setHours(0, 0, 0, 0);

  // Check for existing weekly report
  const existingReport = await prisma.weeklyPerformanceReport.findFirst({
    where: {
      student_id: studentIdInt,
      batch_id: batchIdInt,
      week_start_date: weekStartDate
    }
  });

  if (existingReport) {
    const error = new Error('Performance report for this week has already been submitted.');
    error.statusCode = 400;
    throw error;
  }

  // Fetch student and parent info
  const student = await prisma.student.findFirst({
    where: {
      student_id: studentIdInt,
      academy_id: academyIdInt,
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

  // Create report and ratings in transaction
  const result = await prisma.$transaction(async (tx) => {
    const report = await tx.weeklyPerformanceReport.create({
      data: {
        student_id: studentIdInt,
        batch_id: batchIdInt,
        coach_id: coachIdInt,
        week_start_date: weekStartDate
      }
    });

    const ratingRecords = await tx.performanceRating.createMany({
      data: ratings.map(r => ({
        report_id: report.report_id,
        attribute_id: parseInt(r.attribute_id, 10),
        score: parseInt(r.score, 10)
      }))
    });

    return { report, ratingRecords };
  });

  // Send email with visual score indicators
  try {
    if (student.parent && student.parent.email) {
      const attributes = await prisma.performanceAttribute.findMany({
        where: {
          attribute_id: { in: ratings.map(r => parseInt(r.attribute_id, 10)) }
        },
        select: { attribute_id: true, name: true }
      });

      const ratingRows = ratings.map(r => {
        const attr = attributes.find(a => a.attribute_id === parseInt(r.attribute_id, 10));
        const score = parseInt(r.score, 10);
        const filledBlocks = '█'.repeat(score);
        const emptyBlocks = '░'.repeat(10 - score);
        return `<div style="margin: 8px 0; font-family: monospace; font-size: 14px;">
          <span style="display: inline-block; width: 150px;">${attr?.name || 'Attribute'}:</span>
          <span style="color: #4CAF50;">[${filledBlocks}${emptyBlocks}]</span>
          <span style="font-weight: bold;">${score}/10</span>
        </div>`;
      }).join('');

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a56db;">Weekly Performance Report</h2>
          <p>Hello <strong>${student.parent.name}</strong>,</p>
          <p>Your child <strong>${student.name}</strong> has received their weekly performance evaluation:</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
            ${ratingRows}
          </div>
          <p style="color: #6b7280; font-size: 12px;">This is an automated message from SAMS.</p>
        </div>
      `;

      // ✉️ Using safe default import variant execution context
      await sendMail({
        to: student.parent.email,
        subject: `Weekly Performance Report - ${student.name}`,
        html,
        text: `Weekly performance report for ${student.name} is now available.`
      });
    }
  } catch (mailError) {
    logger.error('Weekly performance email failed', {
      student_id: studentIdInt,
      parent_email: student.parent?.email,
      error: mailError.message
    });
  }

  return result;
};

export const getSportAttributes = async (academyId, sportId) => {
  const academyIdInt = parseInt(academyId, 10);
  const sportIdInt = parseInt(sportId, 10);

  // First, try to fetch academy-specific approved attributes for this sport
  const academyAttributes = await prisma.performanceAttribute.findMany({
    where: {
      academy_id: academyIdInt,
      sport_id: sportIdInt,
      status: 'APPROVED'
    },
    select: {
      attribute_id: true,
      name: true
    },
    orderBy: {
      name: 'asc'
    }
  });

  // If academy has configured attributes, return them
  if (academyAttributes.length > 0) {
    return academyAttributes.map(attr => ({
      id: attr.attribute_id,
      name: attr.name
    }));
  }

  // Fallback: Fetch global sport attributes from GlobalSport table
  const globalSport = await prisma.globalSport.findFirst({
    where: {
      id: sportIdInt
    },
    select: {
      attributes: true
    }
  });

  if (globalSport && globalSport.attributes) {
    try {
      const parsedAttributes = JSON.parse(globalSport.attributes);
      if (Array.isArray(parsedAttributes) && parsedAttributes.length > 0) {
        return parsedAttributes.map((name, index) => ({
          id: index,
          name: name
        }));
      }
    } catch (parseError) {
      logger.warn('Failed to parse global sport attributes', {
        sport_id: sportIdInt,
        error: parseError.message
      });
    }
  }

  // Final fallback to default attributes
  return [
    { id: 1, name: 'Stamina' },
    { id: 2, name: 'Skill' },
    { id: 3, name: 'Performance' }
  ];
};

export const rateStudent = async (academyId, coachId, userRole, data) => {
  const { student_id, batch_id, sport_id, ratings } = data;
  const academyIdInt = parseInt(academyId, 10);
  const coachIdInt = parseInt(coachId, 10);
  const studentIdInt = parseInt(student_id, 10);
  const batchIdInt = batch_id ? parseInt(batch_id, 10) : null;
  const sportIdInt = parseInt(sport_id, 10);

  if (!student_id || !sport_id || !ratings) {
    const error = new Error('student_id, sport_id, and ratings are required');
    error.statusCode = 400;
    throw error;
  }

  if (!ratings || typeof ratings !== 'object' || Object.keys(ratings).length === 0) {
    const error = new Error('ratings must be a non-empty object');
    error.statusCode = 400;
    throw error;
  }

  // Validate each rating score is between 1 and 10
  for (const [attributeName, score] of Object.entries(ratings)) {
    const scoreNum = parseInt(score, 10);
    if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 10) {
      const error = new Error(`Rating for "${attributeName}" must be an integer between 1 and 10`);
      error.statusCode = 400;
      throw error;
    }
  }

  // Verify student exists
  const student = await prisma.student.findFirst({
    where: {
      student_id: studentIdInt,
      academy_id: academyIdInt,
      ...NOT_DELETED
    }
  });

  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  // Verify sport exists in academy
  const sport = await prisma.sport.findFirst({
    where: {
      sport_id: sportIdInt,
      academy_id: academyIdInt
    }
  });

  if (!sport) {
    const error = new Error('Sport not found in academy');
    error.statusCode = 404;
    throw error;
  }

  // Get approved attributes for this sport
  const attributes = await prisma.performanceAttribute.findMany({
    where: {
      academy_id: academyIdInt,
      sport_id: sportIdInt,
      status: 'APPROVED'
    }
  });

  // If no academy attributes, try to create them from global sport
  let attributeMap = {};
  if (attributes.length === 0) {
    const globalSport = await prisma.globalSport.findFirst({
      where: { id: sportIdInt },
      select: { attributes: true }
    });

    let attributeNames = ['Stamina', 'Skill', 'Performance'];
    if (globalSport && globalSport.attributes) {
      try {
        const parsed = JSON.parse(globalSport.attributes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          attributeNames = parsed;
        }
      } catch (e) {
        logger.warn('Failed to parse global attributes', { error: e.message });
      }
    }

    // Create attributes
    const createdAttributes = await prisma.$transaction(
      attributeNames.map(name =>
        prisma.performanceAttribute.create({
          data: {
            academy_id: academyIdInt,
            sport_id: sportIdInt,
            name: name.trim(),
            status: 'APPROVED'
          }
        })
      )
    );

    attributeMap = createdAttributes.reduce((map, attr) => {
      map[attr.name] = attr.attribute_id;
      return map;
    }, {});
  } else {
    attributeMap = attributes.reduce((map, attr) => {
      map[attr.name] = attr.attribute_id;
      return map;
    }, {});
  }

  // Create or update performance scores
  const results = await prisma.$transaction(
    Object.entries(ratings).map(([attributeName, score]) => {
      const attributeId = attributeMap[attributeName.replace(/_/g, ' ')] || 
                          attributeMap[attributeName];

      if (!attributeId) {
        const error = new Error(`Attribute "${attributeName}" not found for this sport`);
        error.statusCode = 400;
        throw error;
      }

      return prisma.performanceScore.upsert({
        where: {
          student_id_attribute_id: {
            student_id: studentIdInt,
            attribute_id: attributeId
          }
        },
        update: {
          score: parseInt(score, 10),
          coach_id: coachIdInt,
          batch_id: batchIdInt,
          scored_at: new Date()
        },
        create: {
          academy_id: academyIdInt,
          student_id: studentIdInt,
          attribute_id: attributeId,
          coach_id: coachIdInt,
          batch_id: batchIdInt,
          score: parseInt(score, 10),
          scored_at: new Date()
        }
      });
    })
  );

  logger.info('Student performance ratings recorded', {
    academy_id: academyIdInt,
    student_id: studentIdInt,
    sport_id: sportIdInt,
    coach_id: coachIdInt,
    ratings_count: results.length
  });

  return {
    student_id: studentIdInt,
    sport_id: sportIdInt,
    scores: results,
    total_ratings: results.length
  };
};