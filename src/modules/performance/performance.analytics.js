import prisma from '../../config/prisma.js';

export const getStudentPerformanceAnalytics = async (academy_id, student_id) => {
  const academyId = parseInt(academy_id, 10);
  const studentId = parseInt(student_id, 10);

  const weeklyReports = await prisma.weeklyPerformanceReport.findMany({
    where: {
      student_id: studentId,
      academy_id: academyId
    },
    include: {
      ratings: {
        include: {
          attribute: {
            select: {
              attribute_id: true,
              name: true
            }
          }
        }
      }
    },
    orderBy: {
      week_start_date: 'asc'
    }
  });

  const analytics = weeklyReports.map(report => {
    const attributeScores = {};

    report.ratings.forEach(rating => {
      const attributeName = rating.attribute.name;
      if (!attributeScores[attributeName]) {
        attributeScores[attributeName] = {
          name: attributeName,
          scores: []
        };
      }
      attributeScores[attributeName].scores.push(rating.score);
    });

    const attributes = Object.values(attributeScores).map(attr => ({
      name: attr.name,
      score: attr.scores.reduce((sum, score) => sum + score, 0) / attr.scores.length
    }));

    return {
      week: report.week_start_date.toISOString().split('T')[0],
      week_start_date: report.week_start_date,
      attributes
    };
  });

  return analytics;
};

export const getBatchPerformanceAnalytics = async (academy_id, batch_id) => {
  const academyId = parseInt(academy_id, 10);
  const batchId = parseInt(batch_id, 10);

  const weeklyReports = await prisma.weeklyPerformanceReport.findMany({
    where: {
      batch_id: batchId,
      academy_id: academyId
    },
    include: {
      ratings: {
        include: {
          attribute: {
            select: {
              attribute_id: true,
              name: true
            }
          }
        }
      },
      student: {
        select: {
          student_id: true,
          name: true
        }
      }
    },
    orderBy: {
      week_start_date: 'asc'
    }
  });

  const analytics = weeklyReports.map(report => {
    const attributeScores = {};

    report.ratings.forEach(rating => {
      const attributeName = rating.attribute.name;
      if (!attributeScores[attributeName]) {
        attributeScores[attributeName] = {
          name: attributeName,
          scores: []
        };
      }
      attributeScores[attributeName].scores.push(rating.score);
    });

    const attributes = Object.values(attributeScores).map(attr => ({
      name: attr.name,
      score: attr.scores.reduce((sum, score) => sum + score, 0) / attr.scores.length
    }));

    return {
      week: report.week_start_date.toISOString().split('T')[0],
      week_start_date: report.week_start_date,
      student_id: report.student_id,
      student_name: report.student.name,
      attributes
    };
  });

  return analytics;
};

export const getAcademyPerformanceAnalytics = async (academy_id, filters = {}) => {
  const academyId = parseInt(academy_id, 10);
  const { start_date, end_date } = filters;

  const where = {
    academy_id: academyId
  };

  if (start_date) {
    where.week_start_date = {
      ...where.week_start_date,
      gte: new Date(start_date)
    };
  }

  if (end_date) {
    where.week_start_date = {
      ...where.week_start_date,
      lte: new Date(end_date)
    };
  }

  const weeklyReports = await prisma.weeklyPerformanceReport.findMany({
    where,
    include: {
      ratings: {
        include: {
          attribute: {
            select: {
              attribute_id: true,
              name: true
            }
          }
        }
      },
      student: {
        select: {
          student_id: true,
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
      week_start_date: 'asc'
    }
  });

  const analytics = weeklyReports.map(report => {
    const attributeScores = {};

    report.ratings.forEach(rating => {
      const attributeName = rating.attribute.name;
      if (!attributeScores[attributeName]) {
        attributeScores[attributeName] = {
          name: attributeName,
          scores: []
        };
      }
      attributeScores[attributeName].scores.push(rating.score);
    });

    const attributes = Object.values(attributeScores).map(attr => ({
      name: attr.name,
      score: attr.scores.reduce((sum, score) => sum + score, 0) / attr.scores.length
    }));

    return {
      week: report.week_start_date.toISOString().split('T')[0],
      week_start_date: report.week_start_date,
      student_id: report.student_id,
      student_name: report.student.name,
      batch_id: report.batch_id,
      batch_name: report.batch.name,
      attributes
    };
  });

  return analytics;
};
