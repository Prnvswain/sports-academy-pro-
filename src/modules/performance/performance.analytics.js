import prisma from '../../config/prisma.js';
import logger from '../../utils/logger.js';

export const getStudentPerformanceAnalytics = async (academy_id, student_id) => {
  const academyId = parseInt(academy_id, 10);
  const studentId = parseInt(student_id, 10);

  logger.info('ANALYTICS: Fetching student performance analytics', { 
    original_academy_id: academy_id, 
    original_student_id: student_id,
    parsed_academyId: academyId, 
    parsed_studentId: studentId 
  });

  // Read from PerformanceScore (single source of truth)
  const scores = await prisma.performanceScore.findMany({
    where: {
      academy_id: academyId,
      student_id: studentId
    },
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
      student: {
        select: {
          student_id: true,
          name: true
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
      scored_at: 'asc'
    }
  });

  logger.info('ANALYTICS: Database query result', {
    query_where: { academy_id: academyId, student_id: studentId },
    scores_count: scores.length,
    sample_scores: scores.slice(0, 2).map(s => ({
      score_id: s.score_id,
      student_id: s.student_id,
      attribute_id: s.attribute_id,
      score: s.score,
      assessment_id: s.assessment_id
    }))
  });

  if (scores.length === 0) {
    logger.warn('ANALYTICS: No scores found for student', { 
      academy_id, 
      student_id, 
      academyId, 
      studentId,
      query_where: { academy_id: academyId, student_id: studentId }
    });
    return {
      overallAverage: 0,
      technicalAverage: 0,
      physicalAverage: 0,
      behaviourAverage: 0,
      totalEvaluations: 0,
      trend: 'stable',
      attributeProgress: [],
      latestAssessment: null,
      improvementPercentage: 0,
      graphData: []
    };
  }

  // Group by assessment_id for timeline view
  const assessments = {};
  scores.forEach(score => {
    const aid = score.assessment_id || `legacy-${score.score_id}`;
    if (!assessments[aid]) {
      assessments[aid] = {
        assessment_id: aid,
        scored_at: score.scored_at,
        coach: score.coach,
        batch: score.batch,
        student: score.student,
        notes: score.notes,
        scores: []
      };
    }
    assessments[aid].scores.push({
      attribute: score.attribute,
      score: score.score
    });
  });

  const assessmentArray = Object.values(assessments).sort((a, b) => new Date(a.scored_at) - new Date(b.scored_at));

  // Calculate overall average
  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
  const overallAverage = (totalScore / scores.length).toFixed(1);

  // Calculate attribute-wise averages
  const attributeScores = {};
  scores.forEach(score => {
    const attrName = score.attribute.name;
    if (!attributeScores[attrName]) {
      attributeScores[attrName] = { scores: [] };
    }
    attributeScores[attrName].scores.push(score.score);
  });

  const attributeProgress = Object.entries(attributeScores).map(([name, data]) => ({
    attribute: name,
    average: (data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length).toFixed(1),
    trend: data.scores.length > 1 ? (data.scores[data.scores.length - 1] > data.scores[0] ? 'up' : 'down') : 'stable'
  }));

  // Calculate trend
  const latestAssessment = assessmentArray[assessmentArray.length - 1];
  const previousAssessment = assessmentArray.length > 1 ? assessmentArray[assessmentArray.length - 2] : null;
  
  let trend = 'stable';
  if (previousAssessment && latestAssessment) {
    const latestAvg = latestAssessment.scores.reduce((sum, s) => sum + s.score, 0) / latestAssessment.scores.length;
    const prevAvg = previousAssessment.scores.reduce((sum, s) => sum + s.score, 0) / previousAssessment.scores.length;
    trend = latestAvg > prevAvg ? 'up' : latestAvg < prevAvg ? 'down' : 'stable';
  }

  // Calculate improvement percentage
  let improvementPercentage = 0;
  if (assessmentArray.length > 1) {
    const firstAvg = assessmentArray[0].scores.reduce((sum, s) => sum + s.score, 0) / assessmentArray[0].scores.length;
    const lastAvg = latestAssessment.scores.reduce((sum, s) => sum + s.score, 0) / latestAssessment.scores.length;
    improvementPercentage = firstAvg > 0 ? (((lastAvg - firstAvg) / firstAvg) * 100).toFixed(1) : 0;
  }

  // Prepare graph data
  const graphData = assessmentArray.map(assessment => {
    const avg = assessment.scores.reduce((sum, s) => sum + s.score, 0) / assessment.scores.length;
    const dataPoint = {
      date: new Date(assessment.scored_at).toLocaleDateString(),
      assessment_id: assessment.assessment_id,
      overall: parseFloat(avg.toFixed(1))
    };
    assessment.scores.forEach(s => {
      dataPoint[s.attribute.name] = s.score;
    });
    return dataPoint;
  });

  // Calculate category averages (simplified - all attributes as technical for now)
  const technicalAverage = overallAverage;
  const physicalAverage = 0;
  const behaviourAverage = 0;

  return {
    overallAverage: parseFloat(overallAverage),
    technicalAverage: parseFloat(technicalAverage),
    physicalAverage: parseFloat(physicalAverage),
    behaviourAverage: parseFloat(behaviourAverage),
    totalEvaluations: assessmentArray.length,
    trend,
    attributeProgress,
    latestAssessment: {
      assessment_id: latestAssessment.assessment_id,
      scored_at: latestAssessment.scored_at,
      overall_score: parseFloat((latestAssessment.scores.reduce((sum, s) => sum + s.score, 0) / latestAssessment.scores.length).toFixed(1)),
      scores: latestAssessment.scores
    },
    improvementPercentage: parseFloat(improvementPercentage),
    graphData
  };
};

export const getBatchPerformanceAnalytics = async (academy_id, batch_id) => {
  const academyId = parseInt(academy_id, 10);
  const batchId = parseInt(batch_id, 10);

  logger.info('ANALYTICS: Fetching batch performance analytics', { academy_id, batch_id, academyId, batchId });

  // Read from PerformanceScore (single source of truth)
  const scores = await prisma.performanceScore.findMany({
    where: {
      academy_id: academyId,
      batch_id: batchId
    },
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
      student: {
        select: {
          student_id: true,
          name: true
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
      scored_at: 'asc'
    }
  });

  logger.info('ANALYTICS: Batch scores query result', {
    academyId,
    batchId,
    scores_count: scores.length,
    sample_scores: scores.slice(0, 2).map(s => ({
      score_id: s.score_id,
      student_id: s.student_id,
      batch_id: s.batch_id,
      attribute_id: s.attribute_id,
      score: s.score,
      assessment_id: s.assessment_id
    }))
  });

  if (scores.length === 0) {
    logger.warn('ANALYTICS: No scores found for batch', { academyId, batchId });
    return {
      averageScore: 0,
      studentsEvaluated: 0,
      improvementRate: 0,
      attributeBreakdown: [],
      weeklyTrend: [],
      topPerformer: null,
      lowestPerformer: null
    };
  }

  // Calculate average score
  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
  const averageScore = (totalScore / scores.length).toFixed(1);

  // Get unique students evaluated
  const uniqueStudents = new Set(scores.map(s => s.student_id));
  const studentsEvaluated = uniqueStudents.size;

  // Calculate improvement rate (compare first and last assessments)
  const studentScores = {};
  scores.forEach(score => {
    if (!studentScores[score.student_id]) {
      studentScores[score.student_id] = {
        student: score.student,
        scores: []
      };
    }
    studentScores[score.student_id].scores.push(score);
  });

  let improvementRate = 0;
  const studentAverages = Object.values(studentScores).map(data => {
    const avg = data.scores.reduce((sum, s) => sum + s.score, 0) / data.scores.length;
    return {
      student: data.student,
      average: avg
    };
  });

  if (studentAverages.length > 1) {
    const sortedAverages = studentAverages.sort((a, b) => a.average - b.average);
    const lowest = sortedAverages[0].average;
    const highest = sortedAverages[sortedAverages.length - 1].average;
    improvementRate = lowest > 0 ? (((highest - lowest) / lowest) * 100).toFixed(1) : 0;
  }

  // Attribute breakdown
  const attributeScores = {};
  scores.forEach(score => {
    const attrName = score.attribute.name;
    if (!attributeScores[attrName]) {
      attributeScores[attrName] = { scores: [] };
    }
    attributeScores[attrName].scores.push(score.score);
  });

  const attributeBreakdown = Object.entries(attributeScores).map(([name, data]) => ({
    attribute: name,
    average: (data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length).toFixed(1),
    count: data.scores.length
  }));

  // Weekly trend (group by week)
  const weeklyScores = {};
  scores.forEach(score => {
    const date = new Date(score.scored_at);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeklyScores[weekKey]) {
      weeklyScores[weekKey] = { scores: [] };
    }
    weeklyScores[weekKey].scores.push(score.score);
  });

  const weeklyTrend = Object.entries(weeklyScores).map(([week, data]) => ({
    week,
    average: (data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length).toFixed(1),
    count: data.scores.length
  })).sort((a, b) => new Date(a.week) - new Date(b.week));

  // Top and lowest performers
  const sortedStudents = studentAverages.sort((a, b) => b.average - a.average);
  const topPerformer = sortedStudents.length > 0 ? {
    student_id: sortedStudents[0].student.student_id,
    name: sortedStudents[0].student.name,
    average: sortedStudents[0].average.toFixed(1)
  } : null;

  const lowestPerformer = sortedStudents.length > 0 ? {
    student_id: sortedStudents[sortedStudents.length - 1].student.student_id,
    name: sortedStudents[sortedStudents.length - 1].student.name,
    average: sortedStudents[sortedStudents.length - 1].average.toFixed(1)
  } : null;

  return {
    averageScore: parseFloat(averageScore),
    studentsEvaluated,
    improvementRate: parseFloat(improvementRate),
    attributeBreakdown,
    weeklyTrend,
    topPerformer,
    lowestPerformer
  };
};

export const getAcademyPerformanceAnalytics = async (academy_id, filters = {}) => {
  const academyId = parseInt(academy_id, 10);
  const { start_date, end_date } = filters;

  logger.info('ANALYTICS: Fetching academy performance analytics', { academy_id, filters });

  // Read from PerformanceScore (single source of truth)
  const where = {
    academy_id: academyId
  };

  if (start_date || end_date) {
    where.scored_at = {};
    if (start_date) {
      where.scored_at.gte = new Date(start_date);
    }
    if (end_date) {
      where.scored_at.lte = new Date(end_date);
    }
  }

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
      student: {
        select: {
          student_id: true,
          name: true
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
      scored_at: 'asc'
    }
  });

  if (scores.length === 0) {
    return {
      totalStudents: 0,
      totalEvaluations: 0,
      averageScore: 0,
      activeBatches: 0,
      topPerformers: [],
      lowestPerformers: [],
      sportWisePerformance: [],
      attributeBreakdown: [],
      weeklyTrend: []
    };
  }

  // Calculate total students
  const uniqueStudents = new Set(scores.map(s => s.student_id));
  const totalStudents = uniqueStudents.size;

  // Calculate total evaluations (grouped by assessment_id)
  const uniqueAssessments = new Set(scores.map(s => s.assessment_id || `legacy-${s.score_id}`));
  const totalEvaluations = uniqueAssessments.size;

  // Calculate average score
  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
  const averageScore = (totalScore / scores.length).toFixed(1);

  // Get active batches
  const uniqueBatches = new Set(scores.map(s => s.batch_id));
  const activeBatches = uniqueBatches.size;

  // Calculate student averages for top/lowest performers
  const studentScores = {};
  scores.forEach(score => {
    if (!studentScores[score.student_id]) {
      studentScores[score.student_id] = {
        student: score.student,
        scores: []
      };
    }
    studentScores[score.student_id].scores.push(score.score);
  });

  const studentAverages = Object.values(studentScores).map(data => ({
    student_id: data.student.student_id,
    name: data.student.name,
    average: (data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length).toFixed(1)
  })).sort((a, b) => b.average - a.average);

  const topPerformers = studentAverages.slice(0, 5);
  const lowestPerformers = studentAverages.slice(-5).reverse();

  // Sport-wise performance
  const sportScores = {};
  scores.forEach(score => {
    const sportName = score.attribute.sport?.name || 'Unknown';
    if (!sportScores[sportName]) {
      sportScores[sportName] = { scores: [] };
    }
    sportScores[sportName].scores.push(score.score);
  });

  const sportWisePerformance = Object.entries(sportScores).map(([sport, data]) => ({
    sport,
    average: (data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length).toFixed(1),
    count: data.scores.length
  }));

  // Attribute breakdown
  const attributeScores = {};
  scores.forEach(score => {
    const attrName = score.attribute.name;
    if (!attributeScores[attrName]) {
      attributeScores[attrName] = { scores: [] };
    }
    attributeScores[attrName].scores.push(score.score);
  });

  const attributeBreakdown = Object.entries(attributeScores).map(([name, data]) => ({
    attribute: name,
    average: (data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length).toFixed(1),
    count: data.scores.length
  }));

  // Weekly trend
  const weeklyScores = {};
  scores.forEach(score => {
    const date = new Date(score.scored_at);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeklyScores[weekKey]) {
      weeklyScores[weekKey] = { scores: [] };
    }
    weeklyScores[weekKey].scores.push(score.score);
  });

  const weeklyTrend = Object.entries(weeklyScores).map(([week, data]) => ({
    week,
    average: (data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length).toFixed(1),
    count: data.scores.length
  })).sort((a, b) => new Date(a.week) - new Date(b.week));

  return {
    totalStudents,
    totalEvaluations,
    averageScore: parseFloat(averageScore),
    activeBatches,
    topPerformers,
    lowestPerformers,
    sportWisePerformance,
    attributeBreakdown,
    weeklyTrend
  };
};
