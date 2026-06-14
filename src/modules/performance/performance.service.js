import prisma from '../../config/prisma.js';
import { NOT_DELETED } from '../../utils/softDelete.util.js';
import logger from '../../utils/logger.js';

export const getAttributes = async (academyId, query = {}) => {
  const { sport_id, status } = query;
  
  const where = {
    academy_id: academyId,
    ...NOT_DELETED
  };

  if (sport_id) {
    where.sport_id = parseInt(sport_id);
  }

  if (status) {
    where.status = status.toUpperCase();
  }

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

  return attributes;
};

export const createAttribute = async (academyId, userId, userRole, data) => {
  const { sport_id, name } = data;

  if (!sport_id || !name) {
    const error = new Error('sport_id and name are required');
    error.statusCode = 400;
    throw error;
  }

  // Check if attribute already exists for this sport
  const existing = await prisma.performanceAttribute.findFirst({
    where: {
      academy_id: academyId,
      sport_id: parseInt(sport_id),
      name: name.trim(),
      ...NOT_DELETED
    }
  });

  if (existing) {
    const error = new Error('Attribute with this name already exists for this sport');
    error.statusCode = 409;
    throw error;
  }

  const attributeData = {
    academy_id: academyId,
    sport_id: parseInt(sport_id),
    name: name.trim(),
    status: 'APPROVED'
  };

  // If created by coach, set status to PENDING
  if (userRole === 'COACH') {
    attributeData.status = 'PENDING';
    attributeData.requested_by_coach_id = userId;
  }

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
      attribute_id: parseInt(attributeId),
      academy_id: academyId,
      ...NOT_DELETED
    }
  });

  if (!attribute) {
    const error = new Error('Performance attribute not found');
    error.statusCode = 404;
    throw error;
  }

  const updated = await prisma.performanceAttribute.update({
    where: { attribute_id: parseInt(attributeId) },
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
      attribute_id: parseInt(attributeId),
      academy_id: academyId,
      ...NOT_DELETED
    }
  });

  if (!attribute) {
    const error = new Error('Performance attribute not found');
    error.statusCode = 404;
    throw error;
  }

  const updated = await prisma.performanceAttribute.update({
    where: { attribute_id: parseInt(attributeId) },
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

export const getScores = async (academyId, query = {}) => {
  const { student_id, batch_id, sport_id } = query;
  
  const where = {
    academy_id: academyId
  };

  if (student_id) {
    where.student_id = parseInt(student_id);
  }

  if (batch_id) {
    where.batch_id = parseInt(batch_id);
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
      attribute_id: parseInt(attribute_id),
      academy_id: academyId,
      status: 'APPROVED',
      ...NOT_DELETED
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
      student_id: parseInt(student_id),
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
    student_id: parseInt(student_id),
    attribute_id: parseInt(attribute_id),
    coach_id: parseInt(coachId),
    score: parseInt(score),
    scored_at: new Date()
  };

  if (batch_id) {
    scoreData.batch_id = parseInt(batch_id);
  }

  if (notes) {
    scoreData.notes = notes.trim();
  }

  const newScore = await prisma.performanceScore.create({
    data: scoreData,
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

  return newScore;
};

export const getStudentPerformance = async (academyId, studentId, query = {}) => {
  const { sport_id } = query;
  
  const where = {
    academy_id: academyId,
    student_id: parseInt(studentId)
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
    student_id: parseInt(studentId),
    attributes: Object.values(grouped)
  };
};

export const getBatchPerformance = async (academyId, batchId, query = {}) => {
  const where = {
    academy_id: academyId,
    batch_id: parseInt(batchId)
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
    batch_id: parseInt(batchId),
    scores
  };
};

export const getApprovalQueue = async (academyId) => {
  const pendingAttributes = await prisma.performanceAttribute.findMany({
    where: {
      academy_id: academyId,
      status: 'PENDING',
      ...NOT_DELETED
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
