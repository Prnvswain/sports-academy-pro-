import { useCallback, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { BarChart2, Clock, Trophy, Users, Search, TrendingUp, ChevronLeft, ChevronRight, Star, Activity, Zap, Award, Target, Filter, CheckCircle, XCircle, AlertCircle, Edit, Save, TrendingDown, Brain } from 'lucide-react';
import Loader from '../../components/Loader';
import ModalWrapper from '../../components/ModalWrapper';
import Avatar from '../../components/Avatar';
import { adminGet, adminPatch, adminDelete } from '../../api/client';

// Helper function to get sport icon from database or fallback
const getSportIcon = (sport) => {
  return sport?.icon || '🏅';
};

export default function PerformancePanel() {
  const [sports, setSports] = useState([]);
  const [selectedSport, setSelectedSport] = useState(null);
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentHistory, setStudentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [attributes, setAttributes] = useState([]);
  const [pendingAttributes, setPendingAttributes] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showAttrs, setShowAttrs] = useState(false);
  const [showPendingPanel, setShowPendingPanel] = useState(false);
  const [showAnalyticsPanel, setShowAnalyticsPanel] = useState(false);
  const [showTimelinePanel, setShowTimelinePanel] = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState('academy');
  const [studentAnalytics, setStudentAnalytics] = useState(null);
  const [batchAnalytics, setBatchAnalytics] = useState(null);
  const [academyAnalytics, setAcademyAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // Timeline filtering state
  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [timelineFilters, setTimelineFilters] = useState({
    student_id: '',
    batch_id: '',
    coach_id: '',
    start_date: '',
    end_date: ''
  });
  const [expandedAssessment, setExpandedAssessment] = useState(null);
  const [totalAssessments, setTotalAssessments] = useState(0);
  
  // Student Dashboard state
  const [showStudentDashboard, setShowStudentDashboard] = useState(false);
  const [showBatchPerformanceModal, setShowBatchPerformanceModal] = useState(false);
  const [modalMainTab, setModalMainTab] = useState('overview');
  const [isManualScoringMode, setIsManualScoringMode] = useState(false);
  const [selectedStudentForDashboard, setSelectedStudentForDashboard] = useState(null);
  const [studentDashboardData, setStudentDashboardData] = useState(null);
  const [loadingStudentDashboard, setLoadingStudentDashboard] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState([]);
  const [visibleAttributes, setVisibleAttributes] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [compareAssessments, setCompareAssessments] = useState({ assessment1: null, assessment2: null });
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [dashboardTab, setDashboardTab] = useState('overview');
  const [graphType, setGraphType] = useState('smooth');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Admin Scoring Ledger state
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [scores, setScores] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [autoNavigateNext, setAutoNavigateNext] = useState(false);
  const [isCoachRecordLocked, setIsCoachRecordLocked] = useState(false);
  const [pastDatesStatus, setPastDatesStatus] = useState([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(null);
  const [isExistingAdminRecord, setIsExistingAdminRecord] = useState(false);
  const [existingAssessmentCreator, setExistingAssessmentCreator] = useState('');

  const loadSports = useCallback(async () => {
    try {
      const result = await adminGet('/admin/sports');
      const responseData = result.data;
      let sportsArray = [];
      if (Array.isArray(responseData)) {
        sportsArray = responseData;
      } else if (responseData && Array.isArray(responseData.data)) {
        sportsArray = responseData.data;
      } else if (responseData && Array.isArray(responseData.academy_sports)) {
        sportsArray = responseData.academy_sports;
      } else if (responseData && Array.isArray(responseData.sports)) {
        sportsArray = responseData.sports;
      }
      setSports(sportsArray.filter(s => s.status === 'ACTIVE'));
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setSports([]);
    }
  }, []);

  const loadBatches = useCallback(async (sportId) => {
    if (!sportId) {
      setBatches([]);
      return;
    }
    try {
      setLoadingBatches(true);
      const result = await adminGet(`/admin/batches?sport_id=${sportId}`);
      const responseData = result.data;

      let batchesArray = [];

      if (Array.isArray(responseData)) {
        batchesArray = responseData;
      } else if (responseData?.data && Array.isArray(responseData.data)) {
        batchesArray = responseData.data;
      } else if (responseData?.batches && Array.isArray(responseData.batches)) {
        batchesArray = responseData.batches;
      } else {
        batchesArray = [];
      }

      setBatches(batchesArray);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  }, []);

  const loadAttributes = useCallback(async (sportId) => {
    if (!sportId) {
      setAttributes([]);
      return;
    }
    try {
      const result = await adminGet(`/admin/performance/sport-attributes/${sportId}`);
      const responseData = result.data;
      let attributesArray = [];
      if (Array.isArray(responseData)) {
        attributesArray = responseData;
      } else if (responseData && Array.isArray(responseData.data)) {
        attributesArray = responseData.data;
      } else if (responseData && Array.isArray(responseData.attributes)) {
        attributesArray = responseData.attributes;
      } else {
        attributesArray = [];
      }
      setAttributes(attributesArray);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setAttributes([]);
    }
  }, []);

  const loadStudents = useCallback(async (batchId) => {
    if (!batchId) {
      setStudents([]);
      return;
    }
    try {
      setLoadingStudents(true);
      const result = await adminGet(`/admin/students?batch_id=${batchId}`);
      const responseData = result.data;
      let studentsArray = [];
      if (Array.isArray(responseData)) {
        studentsArray = responseData;
      } else if (responseData && Array.isArray(responseData.data)) {
        studentsArray = responseData.data;
      } else if (responseData && Array.isArray(responseData.students)) {
        studentsArray = responseData.students;
      } else {
        studentsArray = [];
      }
      
      // Client-side filtering to ensure only batch-assigned students are shown
      const filteredStudents = studentsArray.filter(student => {
        const studentBatchId = student.batch_id || student.batch?.batch_id || student.batch?.id;
        return String(studentBatchId) === String(batchId);
      });
      
      setStudents(filteredStudents);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  const loadStudentHistory = async (studentId) => {
    if (!studentId) return;
    try {
      setLoadingHistory(true);
      const result = await adminGet(`/admin/performance/student-history/${studentId}`);
      setStudentHistory(result.data || result.data?.history || []);
    } catch (error) {
      console.error("Error loading performance history:", error);
      setStudentHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadPendingAttributes = useCallback(async () => {
    try {
      setLoadingPending(true);
      const result = await adminGet('/admin/performance/approval-queue');
      const responseData = result.data;
      let pendingArray = [];
      if (Array.isArray(responseData)) {
        pendingArray = responseData;
      } else if (responseData && Array.isArray(responseData.data)) {
        pendingArray = responseData.data;
      } else if (responseData && Array.isArray(responseData.attributes)) {
        pendingArray = responseData.attributes;
      }
      setPendingAttributes(pendingArray.filter(attr => attr.status === 'PENDING'));
    } catch (error) {
      console.error('Failed to load pending attributes:', error);
      setPendingAttributes([]);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  const handleApproveAttribute = async (attributeId) => {
    try {
      await adminPatch(`/admin/performance/approve-attribute/${attributeId}`);
      setMessage({ text: 'Attribute approved successfully', type: 'success' });
      loadPendingAttributes();
      if (selectedSport) {
        loadAttributes(selectedSport.sport_id || selectedSport.id);
      }
    } catch (error) {
      setMessage({ text: error.message || 'Failed to approve attribute', type: 'error' });
    }
  };

  const handleRejectAttribute = async (attributeId) => {
    if (!window.confirm('Are you sure you want to reject this attribute?')) return;
    try {
      await adminDelete(`/admin/performance/attributes/${attributeId}`);
      setMessage({ text: 'Attribute rejected successfully', type: 'success' });
      loadPendingAttributes();
    } catch (error) {
      setMessage({ text: error.message || 'Failed to reject attribute', type: 'error' });
    }
  };

  const loadStudentAnalytics = async (studentId) => {
    if (!studentId) return;
    try {
      setLoadingAnalytics(true);
      const result = await adminGet(`/admin/performance/analytics/student/${studentId}`);
      setStudentAnalytics(result.data || result);
    } catch (error) {
      console.error('Error loading student analytics:', error);
      setMessage({ text: 'Failed to load student analytics', type: 'error' });
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const loadBatchAnalytics = async (batchId) => {
    if (!batchId) return;
    try {
      setLoadingAnalytics(true);
      const result = await adminGet(`/admin/performance/analytics/batch/${batchId}`);
      setBatchAnalytics(result.data || result);
    } catch (error) {
      console.error('Error loading batch analytics:', error);
      setMessage({ text: 'Failed to load batch analytics', type: 'error' });
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const loadAcademyAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const result = await adminGet('/admin/performance/analytics/academy');
      setAcademyAnalytics(result.data || result);
    } catch (error) {
      console.error('Error loading academy analytics:', error);
      setMessage({ text: 'Failed to load academy analytics', type: 'error' });
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleAnalyticsTabChange = (tab) => {
    setAnalyticsTab(tab);
    if (tab === 'academy') {
      loadAcademyAnalytics();
    } else if (tab === 'batch' && selectedBatchId) {
      loadBatchAnalytics(selectedBatchId);
    } else if (tab === 'student' && selectedStudent) {
      loadStudentAnalytics(selectedStudent.student_id || selectedStudent.id);
    }
  };

  const loadAssessmentHistoryWithFilters = async (filters = timelineFilters) => {
    try {
      setLoadingTimeline(true);
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      
      const result = await adminGet(`/admin/performance/assessments/history?${queryParams.toString()}`);
      setAssessmentHistory(result.data?.assessments || []);
      setTotalAssessments(result.data?.total || 0);
    } catch (error) {
      console.error('Error loading assessment history:', error);
      setMessage({ text: 'Failed to load assessment history', type: 'error' });
    } finally {
      setLoadingTimeline(false);
    }
  };

  const loadAssessmentHistory = () => {
    loadAssessmentHistoryWithFilters(timelineFilters);
  };

  const handleTimelineFilterChange = (key, value) => {
    setTimelineFilters(prev => {
      const newFilters = {
        ...prev,
        [key]: value
      };
      // Load with new filters immediately
      loadAssessmentHistoryWithFilters(newFilters);
      return newFilters;
    });
  };

  const handleExpandAssessment = (assessment) => {
    setExpandedAssessment(expandedAssessment?.assessment_id === assessment.assessment_id ? null : assessment);
  };

  // Student Dashboard functions
  const loadStudentDashboard = async (studentId) => {
    if (!studentId) return;
    try {
      setLoadingStudentDashboard(true);
      const [historyResult, analyticsResult] = await Promise.all([
        adminGet(`/admin/performance/assessments?student_id=${studentId}`),
        adminGet(`/admin/performance/analytics/student/${studentId}`)
      ]);
      const historyData = historyResult.data?.assessments || [];
      setStudentDashboardData({
        history: historyData,
        analytics: analyticsResult.data || analyticsResult
      });
      setPastDatesStatus(buildPastDatesStatus(historyData));
      setScores({});
      setRemarks('');
      setIsCoachRecordLocked(false);
      setSelectedAssessmentId(null);
      setIsExistingAdminRecord(false);
      setExistingAssessmentCreator('');
      // Select all attributes by default
      const allAttributes = new Set();
      historyData.forEach(assessment => {
        assessment.scores?.forEach(score => {
          if (score?.attribute?.name) allAttributes.add(score.attribute.name);
        });
      });
      const attributesArray = Array.from(allAttributes);
      setSelectedAttributes(attributesArray);
      setVisibleAttributes(attributesArray);
    } catch (error) {
      setMessage({ text: 'Failed to load student dashboard', type: 'error' });
    } finally {
      setLoadingStudentDashboard(false);
    }
  };

  const getFilteredHistory = useCallback(() => {
    if (!studentDashboardData?.history) return [];

    let filtered = [...studentDashboardData.history];

    // Apply date range filter
    if (dateRangeFilter !== 'all') {
      const now = new Date();
      const days = parseInt(dateRangeFilter);
      const cutoffDate = new Date(now.setDate(now.getDate() - days));

      filtered = filtered.filter(assessment => {
        if (!assessment?.scored_at) return false;
        const assessmentDate = new Date(assessment.scored_at);
        return assessmentDate >= cutoffDate;
      });
    }

    return filtered;
  }, [studentDashboardData, dateRangeFilter]);

  const getStrengthsAndWeaknesses = useCallback(() => {
    if (!studentDashboardData?.history || studentDashboardData.history.length === 0) {
      return { strengths: [], weaknesses: [] };
    }

    const attributeScores = {};

    studentDashboardData.history.forEach(assessment => {
      if (assessment.scores) {
        assessment.scores.forEach(score => {
          const attrName = score.attribute_name || score.attributeName;
          if (attrName) {
            if (!attributeScores[attrName]) {
              attributeScores[attrName] = { total: 0, count: 0 };
            }
            attributeScores[attrName].total += score.score;
            attributeScores[attrName].count += 1;
          }
        });
      }
    });

    const attributes = Object.keys(attributeScores).map(name => ({
      name,
      score: Math.round(attributeScores[name].total / attributeScores[name].count)
    }));

    const sorted = attributes.sort((a, b) => b.score - a.score);
    const strengths = sorted.slice(0, 3);
    const weaknesses = sorted.slice(-3).reverse();

    return { strengths, weaknesses };
  }, [studentDashboardData]);

  const getFilteredStudents = useMemo(() => {
    if (!studentSearchQuery) return students;

    const query = studentSearchQuery.toLowerCase().trim();
    return students.filter(student => {
      const name = (student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim()).toLowerCase();
      const studentId = String(student.student_id || '').toLowerCase();
      const mobile = String(student.mobile || student.phone || '').toLowerCase();

      return name.includes(query) || studentId.includes(query) || mobile.includes(query);
    });
  }, [students, studentSearchQuery]);

  const handleSelectStudentForLayout = (student) => {
    setSelectedStudentForDashboard(student);
    // Data loading is triggered reactively via the useEffect below
  };

  const handleOpenStudentDashboard = (student) => {
    setSelectedStudentForDashboard(student);
    setShowBatchPerformanceModal(true);
    setIsManualScoringMode(false);
    setModalMainTab('overview');
    // loadStudentDashboard fires reactively when selectedStudentForDashboard changes
  };

  const handleCloseStudentDashboard = () => {
    setShowStudentDashboard(false);
    setSelectedStudentForDashboard(null);
    setStudentDashboardData(null);
  };

  // ── Admin Scoring Ledger Helpers ────────────────────────────────────────────

  /** Returns the most-recent previous score for an attribute from history */
  const getPreviousScore = (attrId, attrName) => {
    const history = studentDashboardData?.history;
    if (!history || history.length === 0) return null;
    for (const assessment of history) {
      for (const s of (assessment.scores || [])) {
        const id = s.attribute?.attribute_id || s.attribute_id;
        const name = s.attribute?.name;
        if (String(id) === String(attrId) || name === attrName) {
          return s.score;
        }
      }
    }
    return null;
  };

  /** Returns diff and percent change vs previous score */
  const getImprovementInfo = (attrId, attrName, currentVal) => {
    const prev = getPreviousScore(attrId, attrName);
    if (prev === null || currentVal === 0) return null;
    const diff = currentVal - prev;
    const percent = prev !== 0 ? ((diff / prev) * 100).toFixed(0) : '∞';
    return { diff, percent };
  };

  /** Build past-7-days status array whenever student or history changes */
  const buildPastDatesStatus = (history) => {
    const statuses = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

      const match = (history || []).find(h => h.scored_at?.startsWith(dateStr));
      let status = 'missed';
      if (match) {
        const isAdmin = match.coach?.email?.includes('@sams.local') ||
                        match.coach?.email === 'admin@sportsacademy.com' ||
                        match.coach?.name?.toLowerCase().includes('admin');
        status = isAdmin ? 'admin' : 'coach';
      }
      statuses.push({ date: dateStr, label, status });
    }
    return statuses;
  };

  /** Save admin scores for the selected student on selectedDate */
  const handleSaveScores = async () => {
    if (!selectedStudentForDashboard || submitting) return;
    setSubmitting(true);
    try {
      const studentId = selectedStudentForDashboard.student_id || selectedStudentForDashboard.id;
      const scorePayload = Object.entries(scores)
        .filter(([, val]) => val > 0)
        .map(([attrId, score]) => ({ attribute_id: parseInt(attrId), score }));

      if (scorePayload.length === 0) {
        setMessage({ text: 'Please rate at least one attribute before saving.', type: 'error' });
        setSubmitting(false);
        return;
      }

      await adminPatch(`/admin/performance/manual-score`, {
        student_id: studentId,
        batch_id: selectedBatchId,
        date: selectedDate,
        scores: scorePayload,
        notes: remarks,
      });

      setMessage({ text: 'Scores saved successfully!', type: 'success' });

      // Reload student dashboard data
      if (studentId) {
        await loadStudentDashboard(studentId);
      }

      // Auto-navigate to next student
      if (autoNavigateNext && nextStudent) {
        handleSelectStudentForLayout(nextStudent);
      }
    } catch (err) {
      setMessage({ text: err.message || 'Failed to save scores.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const calculateAverageRating = (scores) => {
    if (!scores || scores.length === 0) return 0;
    const sum = scores.reduce((acc, s) => acc + s.score, 0);
    return (sum / scores.length).toFixed(1);
  };

  const calculateGrade = (average) => {
    if (average >= 9) return 'A+';
    if (average >= 8) return 'A';
    if (average >= 7) return 'B+';
    if (average >= 6) return 'B';
    if (average >= 5) return 'C';
    return 'D';
  };

  const getPersonalBests = () => {
    if (!studentDashboardData?.history) return {};
    
    const personalBests = {};
    
    studentDashboardData.history.forEach(assessment => {
      assessment.scores?.forEach(score => {
        if (!score?.attribute?.name) return;
        const attrName = score.attribute.name;
        if (!personalBests[attrName] || score.score > personalBests[attrName].score) {
          personalBests[attrName] = {
            score: score.score,
            date: assessment.scored_at,
            assessment_id: assessment.assessment_id
          };
        }
      });
    });
    
    return personalBests;
  };

  const getImprovementIndicators = (currentAssessment, previousAssessment) => {
    if (!currentAssessment) return null;
    if (!previousAssessment) return { noPrevious: true };

    const indicators = {};
    const currentScores = {};
    const previousScores = {};

    currentAssessment.scores?.forEach(score => {
      if (score?.attribute?.name) {
        currentScores[score.attribute.name] = score.score;
      }
    });

    previousAssessment.scores?.forEach(score => {
      if (score?.attribute?.name) {
        previousScores[score.attribute.name] = score.score;
      }
    });

    let totalDiff = 0;
    let count = 0;

    Object.keys(currentScores).forEach(attrName => {
      const current = currentScores[attrName];
      const previous = previousScores[attrName] !== undefined ? previousScores[attrName] : null;

      if (previous !== null) {
        const diff = current - previous;
        totalDiff += diff;
        count++;

        indicators[attrName] = {
          current,
          previous,
          diff,
          trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same'
        };
      }
    });

    // Calculate overall trend
    const avgImprovement = count > 0 ? totalDiff / count : 0;
    let overallTrend = 'stable';
    if (avgImprovement > 0.1) overallTrend = 'Improving';
    else if (avgImprovement < -0.1) overallTrend = 'Declining';

    return {
      indicators,
      overallTrend,
      avgImprovement: count > 0 ? avgImprovement : 0
    };
  };

  const getAttributeColor = (attributeName) => {
    const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];
    const index = selectedAttributes.indexOf(attributeName);
    return colors[index % 5];
  };

  const handleExportPDF = () => {
    if (!selectedStudentForDashboard || !studentDashboardData) {
      setMessage({ text: 'No data available to export', type: 'error' });
      return;
    }

    // Create a simple text-based PDF using window.print
    const printContent = `
      <html>
        <head>
          <title>${selectedStudentForDashboard.name}_Performance_Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .student-info { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px; }
            .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 10px; }
            .info-item { }
            .info-label { font-size: 12px; color: #666; font-weight: bold; }
            .info-value { font-size: 14px; font-weight: bold; }
            .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
            .section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
            .rating-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
            .rating-card { padding: 10px; background: #f9f9f9; border-radius: 6px; text-align: center; }
            .rating-value { font-size: 24px; font-weight: bold; color: #10b981; }
            .rating-label { font-size: 12px; color: #666; }
            .assessment-item { padding: 10px; margin: 5px 0; background: #f9f9f9; border-radius: 6px; }
            .parameter-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
            .parameter-item { display: flex; justify-content: space-between; padding: 8px; background: #f5f5f5; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Student Performance Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="student-info">
            <div>
              <h2>${selectedStudentForDashboard.name || 'Unknown'}</h2>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Sport</div>
                  <div class="info-value">${selectedStudentForDashboard?.batch?.sport?.name || selectedStudentForDashboard?.sport?.name || 'N/A'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Batch</div>
                  <div class="info-value">${selectedStudentForDashboard?.batch?.name || 'N/A'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Coach</div>
                  <div class="info-value">${selectedStudentForDashboard?.coach?.name || 'N/A'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Last Assessment</div>
                  <div class="info-value">${studentDashboardData?.history?.[0]?.scored_at ? new Date(studentDashboardData.history[0].scored_at).toLocaleDateString() : 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Overall Ratings</div>
            <div class="rating-grid">
              <div class="rating-card">
                <div class="rating-value">${studentDashboardData?.analytics?.overallAverage?.toFixed(1) || '0.0'}</div>
                <div class="rating-label">Overall</div>
              </div>
              <div class="rating-card">
                <div class="rating-value">${studentDashboardData?.analytics?.technicalAverage?.toFixed(1) || '0.0'}</div>
                <div class="rating-label">Technical</div>
              </div>
              <div class="rating-card">
                <div class="rating-value">${studentDashboardData?.analytics?.physicalAverage?.toFixed(1) || '0.0'}</div>
                <div class="rating-label">Physical</div>
              </div>
              <div class="rating-card">
                <div class="rating-value">${studentDashboardData?.analytics?.behaviourAverage?.toFixed(1) || '0.0'}</div>
                <div class="rating-label">Behaviour</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Current Parameters Assessment</div>
            <div class="parameter-grid">
              ${attributes.map((attr, idx) => `
                <div class="parameter-item">
                  <span>${attr?.name || 'Unknown'}</span>
                  <span>${attr?.name && selectedStudentForDashboard?.ratings ? (selectedStudentForDashboard.ratings[attr.name] || 'N/A') : 'N/A'}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Assessment History</div>
            ${studentDashboardData?.history?.map((assessment, idx) => {
              const avg = calculateAverageRating(assessment.scores);
              const grade = calculateGrade(parseFloat(avg));
              return `
                <div class="assessment-item">
                  <strong>${new Date(assessment.scored_at).toLocaleDateString()}</strong> - 
                  Grade: ${grade} - 
                  Average: ${avg} - 
                  Coach: ${assessment.coach?.name || 'Unknown'}
                </div>
              `;
            }).join('') || '<p>No assessments available</p>'}
          </div>

          <div class="section">
            <div class="section-title">Personal Best Records</div>
            <div class="parameter-grid">
              ${Object.entries(getPersonalBests()).map(([attr, best]) => `
                <div class="parameter-item">
                  <span>${attr}</span>
                  <span>${best.score} (${new Date(best.date).toLocaleDateString()})</span>
                </div>
              `).join('') || '<p>No personal best records available</p>'}
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();

    setMessage({ text: 'PDF report generated successfully', type: 'success' });
  };

  const prepareGraphData = useMemo(() => {
    const filteredHistory = getFilteredHistory();
    if (!filteredHistory) return [];

    const assessments = filteredHistory
      .filter(a => a?.scores && a.scores.length > 0)
      .sort((a, b) => new Date(a.scored_at) - new Date(b.scored_at));

    // Group by date to avoid duplicate X-axis labels
    const groupedByDate = {};
    assessments.forEach(assessment => {
      const dateKey = assessment.scored_at ? new Date(assessment.scored_at).toLocaleDateString() : 'N/A';
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = assessment;
      }
    });

    return Object.values(groupedByDate).map(assessment => {
      const dataPoint = {
        date: assessment.scored_at ? new Date(assessment.scored_at).toLocaleDateString() : 'N/A',
        assessment_id: assessment.assessment_id || 'unknown'
      };

      // Add overall average (always included)
      const avg = calculateAverageRating(assessment.scores);
      dataPoint['Overall'] = parseFloat(avg);

      // Add visible attributes only
      assessment.scores?.forEach(score => {
        if (score?.attribute?.name && visibleAttributes.includes(score.attribute.name)) {
          dataPoint[score.attribute.name] = score.score;
        }
      });

      return dataPoint;
    });
  }, [studentDashboardData, dateRangeFilter, visibleAttributes]);

  const handleAttributeToggle = (attributeName) => {
    setVisibleAttributes(prev =>
      prev.includes(attributeName)
        ? prev.filter(a => a !== attributeName)
        : [...prev, attributeName]
    );
  };

  const handleAssessmentSelect = (assessment) => {
    setSelectedAssessment(assessment);
  };

  const handleCompareSelect = (position, assessment) => {
    setCompareAssessments(prev => ({
      ...prev,
      [position]: assessment
    }));
  };

  const handleApplyFilters = () => {
    loadAssessmentHistory();
  };

  const handleResetFilters = () => {
    setTimelineFilters({
      student_id: '',
      batch_id: '',
      coach_id: '',
      start_date: '',
      end_date: ''
    });
    loadAssessmentHistory();
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await loadSports();
      await loadPendingAttributes();
      setLoading(false);
    };
    initialize();
  }, [loadSports, loadPendingAttributes]);

  useEffect(() => {
    if (selectedSport) {
      const sportId = selectedSport.sport_id || selectedSport.id;
      loadBatches(sportId);
      loadAttributes(sportId);
      setSelectedBatchId(null);
      setStudents([]);
      setSelectedStudent(null);
    }
  }, [selectedSport, loadBatches, loadAttributes]);

  useEffect(() => {
    if (selectedBatchId) {
      loadStudents(selectedBatchId);
      setSelectedStudent(null);
    }
  }, [selectedBatchId, loadStudents]);

  // ── Reactive: load full performance data whenever a student is selected ──
  useEffect(() => {
    if (!selectedStudentForDashboard) return;
    const studentId = selectedStudentForDashboard.student_id || selectedStudentForDashboard.id;
    if (!studentId) return;
    loadStudentDashboard(studentId);
  }, [selectedStudentForDashboard]);

  const handleSportSelect = (sport) => {
    setSelectedSport(sport);
  };

  const handleBackToAllSports = () => {
    setSelectedSport(null);
    setBatches([]);
    setSelectedBatchId(null);
    setStudents([]);
    setAttributes([]);
    setShowAttrs(false);
    setSelectedStudent(null);
  };

  const handleBatchSelect = (batchId) => {
    setSelectedBatchId(batchId);
  };

  const handleStudentClick = (student) => {
    handleSelectStudentForLayout(student);
    setShowBatchPerformanceModal(true);
    setIsManualScoringMode(false);
    setModalMainTab('overview');
  };

  const { currentIndex, prevStudent, nextStudent } = useMemo(() => {
    if (!selectedStudentForDashboard || !getFilteredStudents.length) {
      return { currentIndex: -1, prevStudent: null, nextStudent: null };
    }
    const idx = getFilteredStudents.findIndex(
      s => String(s.student_id || s.id) === String(selectedStudentForDashboard.student_id || selectedStudentForDashboard.id)
    );
    return {
      currentIndex: idx,
      prevStudent: idx > 0 ? getFilteredStudents[idx - 1] : null,
      nextStudent: idx < getFilteredStudents.length - 1 ? getFilteredStudents[idx + 1] : null
    };
  }, [selectedStudentForDashboard, getFilteredStudents]);

  if (loading) {
    return <Loader />;
  }

  const filteredBatches = batches.filter((batch) => {
    if (!selectedSport) return true;

    const targetSportId = String(selectedSport.sport_id || selectedSport.id || '').toLowerCase();
    const targetSportName = String(selectedSport.name || '').toLowerCase();

    const batchSportId = String(batch.sport_id || batch.sportId || batch.sport?._id || batch.sport?.id || '').toLowerCase();
    const batchSportName = String(batch.sport?.name || (typeof batch.sport === 'string' ? batch.sport : '') || '').toLowerCase();

    return (
      (batchSportId && batchSportId === targetSportId) ||
      (batchSportName && batchSportName === targetSportName) ||
      batchSportName.includes(targetSportName) ||
      targetSportName.includes(batchSportName)
    );
  });

  return (
    <motion.div
      className="relative z-10 mx-auto max-w-7xl space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                Performance Tracker
              </h1>
              <p className="text-muted-foreground mt-1">
                Monitor athlete progress, track metrics & analyze performance data
              </p>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3 flex-wrap relative z-10">
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowAnalyticsPanel(!showAnalyticsPanel);
                if (!showAnalyticsPanel) loadAcademyAnalytics();
              }}
              className={`btn-secondary rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                showAnalyticsPanel ? 'bg-primary text-white border-primary' : ''
              }`}
            >
              <BarChart2 className="w-4 h-4" /> Analytics
              {showAnalyticsPanel && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowTimelinePanel(!showTimelinePanel);
                if (!showTimelinePanel) loadAssessmentHistory();
              }}
              className={`btn-secondary rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                showTimelinePanel ? 'bg-primary text-white border-primary' : ''
              }`}
            >
              <Clock className="w-4 h-4" /> History
              {showTimelinePanel && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
            </motion.button>
          </div>
        </motion.div>

        <AnimatePresence>
          {message.text && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`rounded-xl border p-3.5 text-sm font-semibold flex items-center gap-3 ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25'
                  : 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25'
              }`}
            >
              {message.type === 'success'
                ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
                : <XCircle className="w-4 h-4 flex-shrink-0" />
              }
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

      {/* Analytics Panel */}
      <AnimatePresence>
        {showAnalyticsPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-lg"
          >
            {/* Analytics Panel Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <BarChart2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Performance Analytics</h3>
                <p className="text-xs text-muted-foreground">Academy-wide, batch &amp; student insights</p>
              </div>
            </div>
            {/* Analytics Tabs */}
            <div className="flex gap-1.5 mb-6 bg-surface-secondary/50 p-1.5 rounded-xl w-fit overflow-x-auto">
              {[
                { id: 'academy', label: 'Academy', icon: Trophy },
                { id: 'batch', label: 'Batch', icon: Users, disabled: !selectedBatchId },
                { id: 'student', label: 'Student', icon: Star, disabled: !selectedStudent },
              ].map(({ id, label, icon: Icon, disabled }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => !disabled && handleAnalyticsTabChange(id)}
                  disabled={disabled}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    analyticsTab === id
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {loadingAnalytics ? (
              <div className="flex items-center justify-center py-12">
                <Loader />
              </div>
            ) : (
              <>
                {/* Academy Analytics */}
                {analyticsTab === 'academy' && (
                  <div className="space-y-6">
                    <h4 className="text-sm font-black text-foreground">Academy-Wide Performance Overview</h4>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <motion.div
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 shadow-lg"
                      >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -ml-8 -mb-8"></div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">👥</span>
                            <div className="text-xs font-bold text-white/90">Total Students</div>
                          </div>
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.5, type: "spring" }}
                            className="text-3xl font-black text-white"
                          >
                            {academyAnalytics?.totalStudents || 0}
                          </motion.div>
                        </div>
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 shadow-lg"
                      >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -ml-8 -mb-8"></div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">⭐</span>
                            <div className="text-xs font-bold text-white/90">Average Score</div>
                          </div>
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.5, type: "spring", delay: 0.1 }}
                            className="text-3xl font-black text-white"
                          >
                            {academyAnalytics?.averageScore?.toFixed(1) || '0.0'}
                          </motion.div>
                        </div>
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 shadow-lg"
                      >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -ml-8 -mb-8"></div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">📊</span>
                            <div className="text-xs font-bold text-white/90">Total Evaluations</div>
                          </div>
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.5, type: "spring", delay: 0.2 }}
                            className="text-3xl font-black text-white"
                          >
                            {academyAnalytics?.totalEvaluations || 0}
                          </motion.div>
                        </div>
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 shadow-lg"
                      >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -ml-8 -mb-8"></div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">🏆</span>
                            <div className="text-xs font-bold text-white/90">Active Batches</div>
                          </div>
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.5, type: "spring", delay: 0.3 }}
                            className="text-3xl font-black text-white"
                          >
                            {academyAnalytics?.activeBatches || 0}
                          </motion.div>
                        </div>
                      </motion.div>
                    </div>
                    {academyAnalytics?.topPerformers && academyAnalytics.topPerformers.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 rounded-2xl p-5"
                      >
                        <h5 className="text-xs font-bold text-emerald-600 mb-4 flex items-center gap-2">
                          <span className="text-lg">🏅</span> Top Performing Students
                        </h5>
                        <div className="space-y-2">
                          {academyAnalytics.topPerformers.map((student, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.5 + idx * 0.1 }}
                              whileHover={{ scale: 1.01, x: 5 }}
                              className="flex justify-between items-center p-3 bg-white/50 dark:bg-surface/50 rounded-xl hover:bg-white/80 dark:hover:bg-surface/80 transition-all cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                                  {idx + 1}
                                </div>
                                <span className="text-sm font-bold text-foreground">{student.name}</span>
                              </div>
                              <span className="text-sm font-black text-emerald-600 bg-emerald-500/20 px-3 py-1.5 rounded-full">
                                {student.averageScore?.toFixed(1)} avg
                              </span>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Batch Analytics */}
                {analyticsTab === 'batch' && (
                  <div className="space-y-6">
                    <h4 className="text-sm font-black text-foreground">Batch Performance Analytics</h4>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <motion.div
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 shadow-lg"
                      >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">📈</span>
                            <div className="text-xs font-bold text-white/90">Average Score</div>
                          </div>
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.5, type: "spring" }}
                            className="text-3xl font-black text-white"
                          >
                            {batchAnalytics?.averageScore?.toFixed(1) || '0.0'}
                          </motion.div>
                        </div>
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-5 shadow-lg"
                      >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">👤</span>
                            <div className="text-xs font-bold text-white/90">Students Evaluated</div>
                          </div>
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.5, type: "spring", delay: 0.1 }}
                            className="text-3xl font-black text-white"
                          >
                            {batchAnalytics?.studentsEvaluated || 0}
                          </motion.div>
                        </div>
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="relative overflow-hidden bg-gradient-to-br from-cyan-500 to-teal-600 rounded-2xl p-5 shadow-lg"
                      >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">🚀</span>
                            <div className="text-xs font-bold text-white/90">Improvement Rate</div>
                          </div>
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.5, type: "spring", delay: 0.2 }}
                            className="text-3xl font-black text-white"
                          >
                            {batchAnalytics?.improvementRate?.toFixed(1) || '0.0'}%
                          </motion.div>
                        </div>
                      </motion.div>
                    </div>
                    {batchAnalytics?.attributeBreakdown && Array.isArray(batchAnalytics.attributeBreakdown) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-2xl p-5"
                      >
                        <h5 className="text-xs font-bold text-blue-600 mb-4 flex items-center gap-2">
                          <span className="text-lg">📊</span> Attribute Performance Breakdown
                        </h5>
                        <div className="space-y-4">
                          {batchAnalytics.attributeBreakdown.map((item, idx) => (
                            <motion.div
                              key={item.attribute || idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.4 + idx * 0.1 }}
                            >
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-foreground">{item.attribute}</span>
                                <span className="text-sm font-black text-blue-600 bg-blue-500/20 px-3 py-1 rounded-full">
                                  {item.average || 0}
                                </span>
                              </div>
                              <div className="w-full bg-surface-secondary rounded-full h-3 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min((item.average / 10) * 100, 100)}%` }}
                                  transition={{ duration: 1, delay: 0.5 + idx * 0.1 }}
                                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full"
                                />
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Student Analytics */}
                {analyticsTab === 'student' && (
                  <div className="space-y-6">
                    <h4 className="text-sm font-black text-foreground">Student Performance Analytics</h4>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <motion.div
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 shadow-lg"
                      >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">⭐</span>
                            <div className="text-xs font-bold text-white/90">Overall Average</div>
                          </div>
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.5, type: "spring" }}
                            className="text-3xl font-black text-white"
                          >
                            {studentAnalytics?.overallAverage?.toFixed(1) || '0.0'}
                          </motion.div>
                        </div>
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl p-5 shadow-lg"
                      >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">📊</span>
                            <div className="text-xs font-bold text-white/90">Total Evaluations</div>
                          </div>
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.5, type: "spring", delay: 0.1 }}
                            className="text-3xl font-black text-white"
                          >
                            {studentAnalytics?.totalEvaluations || 0}
                          </motion.div>
                        </div>
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-5 shadow-lg"
                      >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">📈</span>
                            <div className="text-xs font-bold text-white/90">Trend</div>
                          </div>
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.5, type: "spring", delay: 0.2 }}
                            className="text-3xl font-black text-white"
                          >
                            {studentAnalytics?.trend === 'improving' ? '📈' : studentAnalytics?.trend === 'declining' ? '📉' : '➡️'}
                          </motion.div>
                        </div>
                      </motion.div>
                    </div>
                    {studentAnalytics?.attributeProgress && Array.isArray(studentAnalytics.attributeProgress) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-5"
                      >
                        <h5 className="text-xs font-bold text-emerald-600 mb-4 flex items-center gap-2">
                          <span className="text-lg">📈</span> Attribute Progress Over Time
                        </h5>
                        <div className="space-y-3">
                          {studentAnalytics.attributeProgress.map((item, idx) => (
                            <motion.div
                              key={item.attribute || idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.4 + idx * 0.1 }}
                              whileHover={{ scale: 1.01 }}
                              className="p-4 bg-white/50 dark:bg-surface/50 rounded-xl hover:bg-white/80 dark:hover:bg-surface/80 transition-all"
                            >
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-foreground">{item.attribute}</span>
                                <span className="text-sm font-black text-emerald-600 bg-emerald-500/20 px-3 py-1 rounded-full">
                                  {item.average} / 10
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className={`font-bold ${item.trend === 'up' ? 'text-emerald-600' : item.trend === 'down' ? 'text-red-600' : 'text-muted-foreground'}`}>
                                  {item.trend === 'up' ? '↑ Improving' : item.trend === 'down' ? '↓ Declining' : '→ Stable'}
                                </span>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {!academyAnalytics && analyticsTab === 'academy' && (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No academy analytics data available</p>
                  </div>
                )}
                {!batchAnalytics && analyticsTab === 'batch' && (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Select a batch to view analytics</p>
                  </div>
                )}
                {!studentAnalytics && analyticsTab === 'student' && (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Select a student to view analytics</p>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      

      {/* Timeline Panel */}
      <AnimatePresence>
        {showTimelinePanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-lg"
          >
            {/* Timeline Panel Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-cyan-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Assessment History</h3>
                <p className="text-xs text-muted-foreground">Filter and review all assessments</p>
              </div>
            </div>
            {/* Timeline Filters */}
            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" /> Filter Assessments
                </h4>
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3, type: "spring" }}
                  className="text-xs font-bold text-emerald-600 bg-emerald-500/20 px-3 py-1.5 rounded-full"
                >
                  {totalAssessments} assessments
                </motion.span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <motion.div whileFocus={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Student ID</label>
                  <input
                    type="text"
                    value={timelineFilters.student_id}
                    onChange={(e) => handleTimelineFilterChange('student_id', e.target.value)}
                    placeholder="Enter student ID"
                    className="w-full text-sm p-2.5 rounded-xl bg-surface border border-border focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  />
                </motion.div>
                <motion.div whileFocus={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Batch ID</label>
                  <input
                    type="text"
                    value={timelineFilters.batch_id}
                    onChange={(e) => handleTimelineFilterChange('batch_id', e.target.value)}
                    placeholder="Enter batch ID"
                    className="w-full text-sm p-2.5 rounded-xl bg-surface border border-border focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  />
                </motion.div>
                <motion.div whileFocus={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Coach ID</label>
                  <input
                    type="text"
                    value={timelineFilters.coach_id}
                    onChange={(e) => handleTimelineFilterChange('coach_id', e.target.value)}
                    placeholder="Enter coach ID"
                    className="w-full text-sm p-2.5 rounded-xl bg-surface border border-border focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  />
                </motion.div>
                <motion.div whileFocus={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={timelineFilters.start_date}
                    onChange={(e) => handleTimelineFilterChange('start_date', e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl bg-surface border border-border focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  />
                </motion.div>
                <motion.div whileFocus={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={timelineFilters.end_date}
                    onChange={(e) => handleTimelineFilterChange('end_date', e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl bg-surface border border-border focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  />
                </motion.div>
              </div>
              <div className="flex gap-2">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleApplyFilters}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg"
                >
                  Apply Filters
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleResetFilters}
                  className="bg-surface hover:bg-surface-secondary text-foreground border border-border px-6 py-2.5 rounded-xl text-xs font-bold transition-all"
                >
                  Reset
                </motion.button>
              </div>
            </div>

            {/* Assessment Timeline */}
            {loadingTimeline ? (
              <div className="flex items-center justify-center py-12">
                <Loader />
              </div>
            ) : assessmentHistory.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="text-6xl mb-4">📋</div>
                <h4 className="text-lg font-bold text-foreground mb-2">No Assessments Found</h4>
                <p className="text-sm text-muted-foreground">Try adjusting your filters to see assessment history</p>
              </motion.div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {assessmentHistory.map((assessment, idx) => (
                  <motion.div
                    key={assessment.assessment_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-surface border border-border rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all"
                  >
                    <motion.div
                      className="p-4 cursor-pointer hover:bg-surface-secondary/50 transition-all"
                      onClick={() => handleExpandAssessment(assessment)}
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <motion.div 
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-sm font-black text-white shadow-lg"
                          >
                            {assessment.student?.name?.charAt(0) || '?'}
                          </motion.div>
                          <div>
                            <div className="text-sm font-bold text-foreground">
                              {assessment.student?.name || 'Unknown Student'}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                              <span>📅</span>
                              {new Date(assessment.scored_at).toLocaleDateString()} at {new Date(assessment.scored_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Coach</div>
                            <div className="text-xs font-bold text-foreground">{assessment.coach?.name || 'Unknown'}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Batch</div>
                            <div className="text-xs font-bold text-foreground">{assessment.batch?.name || 'Unknown'}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Parameters</div>
                            <div className="text-xs font-bold text-emerald-600 bg-emerald-500/20 px-2 py-1 rounded-full">
                              {assessment.scores?.length || 0}
                            </div>
                          </div>
                          <motion.span
                            animate={{ rotate: expandedAssessment === assessment.assessment_id ? 180 : 0 }}
                            className="text-emerald-600 text-lg font-bold"
                          >
                            ▼
                          </motion.span>
                        </div>
                      </div>
                      {assessment.notes && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <p className="text-xs text-muted-foreground italic bg-surface-secondary/30 p-2 rounded-lg">
                            💬 "{assessment.notes}"
                          </p>
                        </div>
                      )}
                    </motion.div>
                    
                    {/* Expanded Assessment Details */}
                    <AnimatePresence>
                      {expandedAssessment === assessment.assessment_id && expandedAssessment && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-border bg-surface-secondary/50 p-4"
                        >
                          <h5 className="text-xs font-bold text-foreground mb-4 flex items-center gap-2">
                            <span className="text-lg">📊</span> Parameter Scores
                          </h5>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {expandedAssessment.scores?.map((score, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-surface border border-border rounded-xl p-4 hover:shadow-md transition-all"
                              >
                                <div className="flex justify-between items-center mb-3">
                                  <span className="text-xs font-bold text-foreground">
                                    {score.attribute?.name || 'Unknown Parameter'}
                                  </span>
                                  <span className="text-sm font-black text-emerald-600 bg-emerald-500/20 px-3 py-1 rounded-full">
                                    {score.score}/10
                                  </span>
                                </div>
                                <div className="w-full bg-surface-secondary rounded-full h-2 overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min((score.score / 10) * 100, 100)}%` }}
                                    transition={{ duration: 0.8, delay: 0.2 }}
                                    className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-2 rounded-full"
                                  />
                                </div>
                              </motion.div>
                            ))}
                          </div>
                          <div className="mt-4 pt-3 border-t border-border/50 flex justify-between items-center">
                            <div className="text-xs text-muted-foreground">
                              Overall Score: <span className="font-bold text-emerald-600 text-lg">{expandedAssessment.overall_score}/10</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Assessment ID: <span className="font-mono text-xs bg-surface-secondary px-2 py-1 rounded">{assessment.assessment_id}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      

      {/* Pending Attributes Approval Panel */}
      {pendingAttributes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50/80 dark:bg-amber-900/10 border border-amber-300 dark:border-amber-700/50 rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Pending Attribute Proposals</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Review and approve custom metrics proposed by coaches</p>
              </div>
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowPendingPanel(!showPendingPanel)}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg"
            >
              {showPendingPanel ? 'Collapse' : `Expand (${pendingAttributes.length})`}
            </motion.button>
          </div>

          <AnimatePresence>
            {showPendingPanel && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                {pendingAttributes.map((attr, idx) => (
                  <motion.div
                    key={attr.id || attr.attribute_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.01 }}
                    className="bg-white/50 dark:bg-surface/50 border border-border rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-all"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-foreground">{attr.name.replace(/\s*\((Fitness|Technique|Mental)\)$/i, '')}</span>
                        <motion.span
                          whileHover={{ scale: 1.05 }}
                          className="text-xs bg-gradient-to-r from-amber-400 to-orange-400 text-white px-3 py-1 rounded-full font-bold shadow-sm"
                        >
                          {attr.sport?.name || 'Global'}
                        </motion.span>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-2 text-left">
                        <span>👤</span> Proposed by: {attr.requested_by?.name || attr.proposed_by || 'Coach'} · 
                        <span>📅</span> {attr.created_at ? new Date(attr.created_at).toLocaleDateString() : new Date().toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleApproveAttribute(attr.id || attr.attribute_id)}
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg"
                      >
                        ✓ Approve
                      </motion.button>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleRejectAttribute(attr.id || attr.attribute_id)}
                        className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg"
                      >
                        ✕ Reject
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {!selectedSport ? (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Active Sports Catalog</h3>
              <p className="text-xs text-muted-foreground">{sports.length} sport{sports.length !== 1 ? 's' : ''} configured</p>
            </div>
          </motion.div>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-gradient-to-br from-surface-secondary to-surface border border-border rounded-2xl p-6"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-surface to-surface-secondary rounded-2xl mb-4 animate-pulse"></div>
                  <div className="h-5 bg-gradient-to-r from-surface to-surface-secondary rounded-lg mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gradient-to-r from-surface to-surface-secondary rounded w-2/3 animate-pulse"></div>
                </motion.div>
              ))}
            </div>
          ) : sports.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-surface-secondary/50 to-surface/50 border border-border rounded-2xl p-16 text-center"
            >
              <div className="text-7xl mb-6 animate-bounce">🏆</div>
              <h4 className="text-xl font-black text-foreground mb-3">No Sports Configured</h4>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">Add sports to start tracking student performance metrics and building comprehensive athlete profiles.</p>
            </motion.div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sports.map((sport, index) => {
                const icon = getSportIcon(sport);
                const gradients = [
                  'from-emerald-500 to-teal-600',
                  'from-blue-500 to-indigo-600',
                  'from-purple-500 to-pink-600',
                  'from-orange-500 to-amber-600',
                  'from-cyan-500 to-blue-600',
                  'from-rose-500 to-red-600',
                  'from-violet-500 to-purple-600',
                  'from-lime-500 to-green-600'
                ];
                const gradient = gradients[index % gradients.length];

                return (
                  <motion.button
                    key={sport.sport_id || sport.id || sport.name || index}
                    type="button"
                    onClick={() => handleSportSelect(sport)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.08 }}
                    whileHover={{ scale: 1.05, y: -8 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative overflow-hidden bg-gradient-to-br from-surface-secondary to-surface border border-border hover:border-transparent p-6 text-left transition-all duration-300 rounded-2xl shadow-lg hover:shadow-2xl"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-20 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity duration-300`}></div>
                    <div className="relative z-10">
                      <motion.div 
                        whileHover={{ rotate: 10, scale: 1.2 }}
                        transition={{ duration: 0.3 }}
                        className="mb-4 inline-block text-4xl"
                      >
                        {icon}
                      </motion.div>
                      <div className="text-foreground text-lg font-black tracking-tight mb-2">
                        {sport.name}
                      </div>
                      <div className="text-muted-foreground text-xs font-medium flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"></span>
                        View performance metrics
                      </div>
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 0, x: -10 }}
                        whileHover={{ opacity: 1, x: 0 }}
                        className="mt-4 flex items-center gap-2 text-xs font-bold text-foreground/70"
                      >
                        Explore →
                      </motion.div>
                    </div>
                    <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r ${gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
          <motion.button
            type="button"
            whileHover={{ x: -4 }}
            onClick={handleBackToAllSports}
            className="text-muted-foreground hover:text-accent flex items-center gap-2 text-sm font-semibold transition-colors"
          >
            <span>←</span> Back to All Sports
          </motion.button>

          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-accent/10 to-cyan-500/10 border border-accent/30 rounded-2xl p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent/20 to-cyan-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <motion.div 
                  whileHover={{ rotate: 10, scale: 1.1 }}
                  className="text-5xl"
                >
                  {getSportIcon(selectedSport)}
                </motion.div>
                <div>
                  <h3 className="text-foreground text-2xl sm:text-3xl font-black tracking-tight">
                    {selectedSport.name}
                  </h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Select a batch to view student performance metrics
                  </p>
                </div>
              </div>
              <div className="relative">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAttrs(!showAttrs)}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-accent border rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 flex items-center gap-2 shadow-lg"
                >
                  <span>⚙️</span> View Configured Attributes
                </motion.button>

                <AnimatePresence>
                  {showAttrs && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-full mt-2 z-50 w-80 bg-surface border border-border shadow-2xl rounded-2xl p-5"
                    >
                      <h4 className="text-foreground text-sm font-bold mb-4 border-b border-border/50 pb-3 flex items-center gap-2">
                        <span className="text-lg">📊</span> Active Evaluation Parameters
                      </h4>
                      {attributes.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {attributes.map((attr, idx) => (
                            <motion.span
                              key={attr?.id || attr?.name || idx}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: idx * 0.05 }}
                              className="bg-gradient-to-r from-accent/10 to-cyan-500/10 border-accent/30 border px-3 py-1.5 rounded-full text-xs font-bold text-foreground"
                            >
                              {attr?.name || 'Unknown'}
                            </motion.span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <div className="text-3xl mb-2">📋</div>
                          <p className="text-muted-foreground text-xs">No attributes configured for this sport.</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                
              </div>
            </div>
          </motion.div>

          {loadingBatches ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-gradient-to-br from-surface-secondary to-surface border border-border rounded-2xl p-6"
                >
                  <div className="h-6 bg-gradient-to-r from-surface to-surface-secondary rounded-lg mb-3 animate-pulse"></div>
                  <div className="h-4 bg-gradient-to-r from-surface to-surface-secondary rounded w-2/3 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gradient-to-r from-surface to-surface-secondary rounded w-1/2 animate-pulse"></div>
                </motion.div>
              ))}
            </div>
          ) : filteredBatches.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-surface-secondary/50 to-surface/50 border border-border rounded-2xl p-16 text-center"
            >
              <div className="text-7xl mb-6 animate-bounce">📚</div>
              <h4 className="text-xl font-black text-foreground mb-3">No Training Batches</h4>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">Create training batches for this sport to start tracking student performance metrics.</p>
            </motion.div>
          ) : (
            <>
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Target className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Select Training Batch</h3>
                    <p className="text-xs text-muted-foreground">{filteredBatches.length} batch{filteredBatches.length !== 1 ? 'es' : ''} available</p>
                  </div>
                </motion.div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredBatches.map((batch, idx) => {
                    const gradients = [
                      'from-emerald-500 to-teal-600',
                      'from-blue-500 to-indigo-600',
                      'from-purple-500 to-pink-600',
                      'from-orange-500 to-amber-600',
                      'from-cyan-500 to-blue-600',
                      'from-rose-500 to-red-600'
                    ];
                    const gradient = gradients[idx % gradients.length];

                    return (
                      <motion.button
                        key={batch.batch_id || batch.id}
                        type="button"
                        onClick={() => handleBatchSelect(batch.batch_id || batch.id)}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: idx * 0.08 }}
                        whileHover={{ scale: 1.03, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`group relative overflow-hidden bg-gradient-to-br from-surface-secondary to-surface border p-6 text-left transition-all duration-300 rounded-2xl shadow-lg hover:shadow-2xl ${
                          selectedBatchId === (batch.batch_id || batch.id) 
                            ? 'border-accent ring-2 ring-accent/50 shadow-accent/20' 
                            : 'border-border hover:border-accent/40'
                        }`}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 rounded-full blur-2xl -mr-12 -mt-12 transition-opacity duration-300`}></div>
                        <div className="relative z-10">
                          <div className="text-foreground text-lg font-black tracking-tight mb-3">{batch.name}</div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs">
                              <span className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"></span>
                              <span className="font-medium">Students:</span> 
                              <span className="font-bold text-foreground">{batch.student_count || batch.students?.length || 0}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground text-xs">
                              <span className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"></span>
                              <span className="font-medium">Timings:</span> 
                              <span className="font-medium text-foreground">{batch.timings || batch.schedule || 'Not specified'}</span>
                            </div>
                          </div>
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0 }}
                            whileHover={{ opacity: 1 }}
                            className="mt-4 flex items-center gap-2 text-xs font-bold text-foreground/60"
                          >
                            Select →
                          </motion.div>
                        </div>
                        <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r ${gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {selectedBatchId && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.3 }} 
                  className="bg-gradient-to-br from-surface-secondary/50 to-surface/30 border border-border rounded-2xl p-6 shadow-lg space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-foreground text-base font-bold">
                          Student Performance Metrics
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {students.length} student{students.length !== 1 ? 's' : ''} · click to open detailed dashboard
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground bg-surface-secondary px-3 py-1.5 rounded-full">
                      {getFilteredStudents.length} shown
                    </span>
                  </div>

                  {/* Search bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search by name, ID or mobile…"
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all"
                    />
                  </div>

                  {loadingStudents ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <motion.div 
                          key={i} 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className="bg-surface border border-border rounded-xl p-4"
                        >
                          <div className="h-5 bg-gradient-to-r from-surface-secondary to-surface rounded-lg mb-3 animate-pulse"></div>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4].map((j) => (
                              <div key={j} className="h-7 bg-gradient-to-r from-surface-secondary to-surface rounded flex-1 animate-pulse"></div>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : students.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-gradient-to-br from-surface/50 to-surface-secondary/50 border border-dashed border-border rounded-2xl py-16 text-center"
                    >
                      <div className="text-7xl mb-6 animate-bounce">👥</div>
                      <h4 className="text-xl font-black text-foreground mb-3">No Students Enrolled</h4>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">Enroll students in this batch to start tracking their performance metrics and building comprehensive athlete profiles.</p>
                    </motion.div>
                  ) : getFilteredStudents.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-gradient-to-br from-surface/50 to-surface-secondary/50 border border-dashed border-border rounded-2xl py-16 text-center"
                    >
                      <div className="text-7xl mb-6 animate-bounce">🔍</div>
                      <h4 className="text-xl font-black text-foreground mb-3">No students found</h4>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">Try adjusting your search or select a different batch.</p>
                    </motion.div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {getFilteredStudents.map((student, idx) => {
                        const isSelected = selectedStudentForDashboard?.student_id === student.student_id;
                        return (
                          <motion.div
                            key={student.student_id || student.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleOpenStudentDashboard(student)}
                            className={`bg-surface border rounded-2xl p-4 cursor-pointer hover:shadow-lg transition-all group ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-500/10 shadow-md shadow-emerald-500/10'
                                : 'border-border hover:border-primary/40'
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <Avatar
                                src={student.profile_photo}
                                name={student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim()}
                                size="xl"
                                className="shadow-md ring-2 ring-border"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-foreground truncate text-sm">
                                  {student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unknown'}
                                </h4>
                                {student.student_id && (
                                  <p className="text-xs text-muted-foreground font-mono">#{student.student_id}</p>
                                )}
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                            </div>
                            <div className="flex gap-1.5 flex-wrap">
                              {student.age && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-medium">
                                  {student.age}y
                                </span>
                              )}
                              {student.gender && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full bg-surface-secondary text-xs text-muted-foreground font-medium">
                                  {student.gender}
                                </span>
                              )}
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenStudentDashboard(student);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-medium ml-auto cursor-pointer"
                              >
                                <TrendingUp className="w-3 h-3" /> View
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      )}

      {/* Student Dashboard Modal */}
      <ModalWrapper
        isOpen={showBatchPerformanceModal}
        onClose={() => {
          setShowBatchPerformanceModal(false);
          setSelectedStudentForDashboard(null);
          setStudentDashboardData(null);
        }}
        modalId="batch-performance"
        contentClassName="bg-white dark:bg-slate-900 border border-border rounded-2xl shadow-2xl max-w-7xl w-full h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Dynamic Sticky Header */}
        {!isManualScoringMode ? (
          /* DEFAULT: Student Performance Metrics Modal Header with Segmented Toggle */
          <div className="px-4 py-3 border-b border-border/60 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-md">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-foreground text-sm truncate">
                    Student Performance Metrics
                  </h3>
                  {selectedStudentForDashboard && (
                    <span className="text-xs font-semibold text-muted-foreground">
                      ({selectedStudentForDashboard.name})
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground font-bold">Batch:</span>
                  <select
                    value={selectedBatchId || ''}
                    onChange={(e) => {
                      const bid = parseInt(e.target.value);
                      setSelectedBatchId(bid);
                      loadStudents(bid);
                      setSelectedStudentForDashboard(null);
                      setStudentDashboardData(null);
                    }}
                    className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-800 border border-border/50 text-foreground outline-none cursor-pointer"
                  >
                    {filteredBatches.map(b => (
                      <option key={b.batch_id || b.id} value={b.batch_id || b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Segmented Main Mode Toggle */}
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 shadow-sm border border-border/50">
              <button
                type="button"
                onClick={() => setModalMainTab('overview')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  modalMainTab === 'overview'
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setModalMainTab('detailed')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  modalMainTab === 'detailed'
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Detailed Analytics
              </button>
            </div>

            {/* Cycle Controls & Admin Scoring Trigger */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => prevStudent && handleSelectStudentForLayout(prevStudent)}
                disabled={!prevStudent}
                className="p-1.5 rounded-lg border border-border bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-muted-foreground select-none">
                {currentIndex + 1} / {getFilteredStudents.length}
              </span>
              <button
                type="button"
                onClick={() => nextStudent && handleSelectStudentForLayout(nextStudent)}
                disabled={!nextStudent}
                className="p-1.5 rounded-lg border border-border bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {modalMainTab === 'detailed' && (
                <motion.button
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsManualScoringMode(true)}
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-xl px-4 py-1.5 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 ml-3"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Admin Scoring Ledger
                </motion.button>
              )}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <button
                onClick={() => {
                  setShowBatchPerformanceModal(false);
                  setSelectedStudentForDashboard(null);
                  setStudentDashboardData(null);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          /* MANUAL SCORING LEDGER MODE HEADER */
          <div className="px-4 py-3 border-b border-border/60 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-md">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-foreground text-sm truncate">
                    Admin Scoring Ledger
                  </h3>
                  {selectedStudentForDashboard && (
                    <span className="text-xs font-semibold text-muted-foreground">
                      ({selectedStudentForDashboard.name})
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground font-bold">Batch:</span>
                  <select
                    value={selectedBatchId || ''}
                    onChange={(e) => {
                      const bid = parseInt(e.target.value);
                      setSelectedBatchId(bid);
                      loadStudents(bid);
                      setSelectedStudentForDashboard(null);
                      setStudentDashboardData(null);
                    }}
                    className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-800 border border-border/50 text-foreground outline-none cursor-pointer"
                  >
                    {filteredBatches.map(b => (
                      <option key={b.batch_id || b.id} value={b.batch_id || b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>

                  <span className="text-muted-foreground text-[10px]">•</span>
                  <span className="text-[10px] text-muted-foreground font-bold">Date:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-800 border border-border/50 text-foreground outline-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Cycle Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => prevStudent && handleSelectStudentForLayout(prevStudent)}
                disabled={!prevStudent}
                className="p-1.5 rounded-lg border border-border bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-muted-foreground select-none">
                {currentIndex + 1} / {getFilteredStudents.length}
              </span>
              <button
                type="button"
                onClick={() => nextStudent && handleSelectStudentForLayout(nextStudent)}
                disabled={!nextStudent}
                className="p-1.5 rounded-lg border border-border bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleSaveScores}
                disabled={submitting || !selectedStudentForDashboard || isCoachRecordLocked}
                className="ml-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-xl px-4 py-1.5 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-3.5 h-3.5" />
                {submitting ? 'Saving...' : 'Save Score'}
              </button>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={() => setIsManualScoringMode(false)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
              >
                <Trophy className="w-3.5 h-3.5 text-emerald-500" />
                Back to Dashboard
              </button>

              <button
                onClick={() => {
                  setShowBatchPerformanceModal(false);
                  setSelectedStudentForDashboard(null);
                  setStudentDashboardData(null);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {!isManualScoringMode ? (
          /* ========================================================================= */
          /* DEFAULT MODE (Overview or Detailed Analytics tab)                        */
          /* ========================================================================= */
          modalMainTab === 'overview' ? (
            /* Overview (Current UI): 2-Column Layout */
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* COLUMN 1: Student List (Left, width md:w-80) */}
              <div className="w-full md:w-80 bg-white dark:bg-slate-900 border-r border-border/60 flex flex-col overflow-hidden shrink-0 h-full">
                <div className="px-3 py-2 border-b border-border/40 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Trainees List</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {getFilteredStudents.length} Active
                  </span>
                </div>

                {/* Roster search box */}
                <div className="p-2 border-b border-border/40">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search athlete..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg bg-surface border border-border focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/15 outline-none transition-all placeholder:text-[10px]"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                  {loadingStudents ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900 rounded-xl animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-800 rounded" />
                          <div className="h-2 w-1/3 bg-slate-200 dark:bg-slate-800 rounded" />
                        </div>
                      </div>
                    ))
                  ) : getFilteredStudents.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-xs font-semibold">
                      No athletes found
                    </div>
                  ) : (
                    getFilteredStudents.map((student, idx) => {
                      const isSelected = selectedStudentForDashboard?.student_id === student.student_id || selectedStudentForDashboard?.id === student.id;
                      const currentRatings = student.ratings || {};
                      const ratingValues = Object.values(currentRatings).filter(val => typeof val === 'number');
                      const avgScore = ratingValues.length > 0 ? (ratingValues.reduce((sum, r) => sum + r, 0) / ratingValues.length).toFixed(1) : null;
                      const grade = avgScore ? calculateGrade(parseFloat(avgScore)) : 'N/A';

                      return (
                        <motion.div
                          key={student.student_id || student.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          whileHover={{ x: 3 }}
                          onClick={() => handleSelectStudentForLayout(student)}
                          className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border ${
                            isSelected
                              ? 'bg-gradient-to-r from-emerald-50/80 to-cyan-50/50 dark:from-emerald-950/40 dark:to-cyan-950/20 border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/20'
                              : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar
                              src={student.profile_photo}
                              name={student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim()}
                              size="md"
                              className={`shadow-sm ring-1 ${isSelected ? 'ring-emerald-500' : 'ring-border'}`}
                            />
                            <div className="min-w-0">
                              <h4 className={`font-semibold text-xs truncate ${isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'}`}>
                                {student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim()}
                              </h4>
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">#{student.student_id}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {avgScore ? (
                              <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                                  {avgScore}
                                </span>
                                <span className="text-[8px] font-bold text-muted-foreground uppercase mt-0.5">{grade}</span>
                              </div>
                            ) : (
                              <span className="text-[9px] font-bold text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                Unrated
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* COLUMN 2: Performance Dashboard & Analytics (Right, flex-1) */}
              <div className="flex-1 bg-white dark:bg-slate-900 flex flex-col overflow-hidden h-full">
                <div className="px-4 py-2 border-b border-border/40 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Coach-Submitted Performance & History</span>
                  {selectedStudentForDashboard && (
                    <button
                      onClick={handleExportPDF}
                      className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <span>📄</span> Export Report
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {selectedStudentForDashboard ? (
                    loadingStudentDashboard ? (
                      <div className="space-y-4">
                        <div className="h-28 bg-slate-50 dark:bg-slate-800 rounded-xl animate-pulse" />
                        <div className="h-40 bg-slate-50 dark:bg-slate-800 rounded-xl animate-pulse" />
                        <div className="h-40 bg-slate-50 dark:bg-slate-800 rounded-xl animate-pulse" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Left sub-column: Averages, Strengths, Radar Chart */}
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl p-3 relative overflow-hidden flex items-center justify-between shadow-sm">
                              <div>
                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Overall Score</span>
                                <div className="flex items-baseline gap-1 mt-1">
                                  <span className="text-2xl font-black text-foreground">
                                    {studentDashboardData?.analytics?.overallAverage?.toFixed(1) || '0.0'}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">/10</span>
                                </div>
                                <span className="text-[9px] font-semibold text-muted-foreground block mt-1">
                                  Grade: <strong className="text-foreground">{calculateGrade(parseFloat(studentDashboardData?.analytics?.overallAverage || 0))}</strong>
                                </span>
                              </div>
                              <div className="w-12 h-12 rounded-full border-2 border-emerald-500/30 flex items-center justify-center text-emerald-600 font-extrabold text-sm shrink-0 bg-white dark:bg-slate-900">
                                {calculateGrade(parseFloat(studentDashboardData?.analytics?.overallAverage || 0))}
                              </div>
                            </div>

                            <div className="bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/10 dark:to-pink-950/10 border border-purple-500/10 rounded-xl p-3 relative overflow-hidden flex items-center justify-between shadow-sm">
                              <div>
                                <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">Attendance</span>
                                <div className="flex items-baseline gap-1 mt-1">
                                  <span className="text-2xl font-black text-foreground">
                                    {selectedStudentForDashboard?.attendance_percentage || '85'}%
                                  </span>
                                </div>
                                <span className="text-[9px] font-semibold text-muted-foreground block mt-1">Attendance rate</span>
                              </div>
                              <div className="w-10 h-10 shrink-0 relative">
                                <svg className="w-full h-full" viewBox="0 0 36 36">
                                  <path className="text-slate-100 dark:text-slate-800" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                  <path className="text-purple-500" strokeDasharray={`${selectedStudentForDashboard?.attendance_percentage || '85'}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                </svg>
                              </div>
                            </div>
                          </div>

                          {/* Strengths and areas to improve */}
                          {(() => {
                            const { strengths, weaknesses } = getStrengthsAndWeaknesses();
                            if (strengths.length === 0) return null;
                            return (
                              <div className="bg-slate-50 dark:bg-slate-900/40 border border-border/60 rounded-xl p-3 shadow-sm space-y-2">
                                <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest border-b border-border/30 pb-1">Strengths & Areas to Improve</h4>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <span className="text-[9px] font-extrabold text-emerald-600 flex items-center gap-0.5">🌟 Strengths</span>
                                    {strengths.map(s => (
                                      <div key={s.name} className="flex justify-between items-center bg-white dark:bg-slate-855 p-1.5 rounded-lg border border-emerald-500/10">
                                        <span className="text-[10px] font-medium text-foreground truncate max-w-[100px]">{s.name}</span>
                                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-1 rounded">{s.score}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[9px] font-extrabold text-amber-600 flex items-center gap-0.5">⚠️ Focus Areas</span>
                                    {weaknesses.length > 0 ? (
                                      weaknesses.map(w => (
                                        <div key={w.name} className="flex justify-between items-center bg-white dark:bg-slate-855 p-1.5 rounded-lg border border-amber-500/10">
                                          <span className="text-[10px] font-medium text-foreground truncate max-w-[100px]">{w.name}</span>
                                          <span className="text-[9px] font-bold text-amber-600 bg-amber-500/10 px-1 rounded">{w.score}</span>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-[9px] text-muted-foreground italic p-1.5">No weaknesses identified.</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Radar Chart */}
                          {attributes.length > 0 && studentDashboardData?.history?.length > 0 && (
                            <div className="bg-slate-50 dark:bg-slate-900/40 border border-border/60 rounded-xl p-3 shadow-sm space-y-2">
                              <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest border-b border-border/30 pb-1">Attribute Radar Map</h4>
                              <div className="h-44 w-full flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                  <RadarChart cx="50%" cy="50%" outerRadius="65%" data={
                                    attributes.map(attr => {
                                      const latestAssessment = studentDashboardData?.history?.[0];
                                      const scoreVal = latestAssessment?.scores?.find(s => s.attribute?.attribute_id === attr.attribute_id || s.attribute?.name === attr.name || s.attribute_id === attr.attribute_id)?.score || 0;
                                      return {
                                        subject: attr.name,
                                        A: scoreVal,
                                        fullMark: 10
                                      };
                                    })
                                  }>
                                    <PolarGrid stroke="currentColor" className="text-border/40" strokeWidth={0.5} />
                                    <PolarAngleAxis dataKey="subject" stroke="currentColor" className="text-muted-foreground" fontSize={8} />
                                    <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="currentColor" className="text-border/20" fontSize={7} />
                                    <Radar name="Athlete" dataKey="A" stroke="#059669" fill="#10b981" fillOpacity={0.35} />
                                  </RadarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right sub-column: Line Chart, Remarks, History logs */}
                        <div className="space-y-4">
                          {/* Line Chart */}
                          {(() => {
                            const trendData = studentDashboardData?.history
                              ? [...studentDashboardData.history]
                                  .reverse()
                                  .map(h => ({
                                    date: new Date(h.scored_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                                    Score: calculateAverageRating(h.scores)
                                  }))
                              : [];

                            return trendData.length > 0 ? (
                              <div className="bg-slate-50 dark:bg-slate-900/40 border border-border/60 rounded-xl p-3 shadow-sm space-y-2">
                                <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest border-b border-border/30 pb-1">Performance Trend</h4>
                                <div className="h-36 w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/25" />
                                      <XAxis dataKey="date" stroke="currentColor" className="text-muted-foreground" fontSize={7} />
                                      <YAxis domain={[0, 10]} stroke="currentColor" className="text-muted-foreground" fontSize={8} />
                                      <Tooltip contentStyle={{ background: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', fontSize: '10px' }} />
                                      <Line type="monotone" dataKey="Score" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 2.5 }} activeDot={{ r: 4 }} />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            ) : null;
                          })()}

                          {/* Recent activity timeline history */}
                          <div className="bg-slate-50 dark:bg-slate-900/40 border border-border/60 rounded-xl p-3 shadow-sm space-y-2">
                            <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest border-b border-border/30 pb-1">Historical Log Entries</h4>
                            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                              {studentDashboardData?.history && studentDashboardData.history.length > 0 ? (
                                studentDashboardData.history.map((h, i) => (
                                  <div key={i} className="text-[10px] bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-border/40 space-y-1">
                                    <div className="flex justify-between items-center">
                                      <span className="font-bold text-foreground">📅 {new Date(h.scored_at).toLocaleDateString()}</span>
                                      <div className="flex items-center gap-1.5">
                                        {h.coach?.email?.includes('@sams.local') || h.coach?.email === 'admin@sportsacademy.com' || h.coach?.name?.toLowerCase().includes('admin') ? (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[9px] font-extrabold uppercase">
                                            🔵 Admin
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[9px] font-extrabold uppercase">
                                            🟢 Coach
                                          </span>
                                        )}
                                        <span className="font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                          {calculateAverageRating(h.scores)} avg
                                        </span>
                                      </div>
                                    </div>
                                    <p className="text-muted-foreground italic">"{h.notes || 'No remarks logged.'}"</p>
                                    <p className="text-[8px] text-slate-400 font-medium">Logged by: {h.coach?.name || 'Assigned Coach'}</p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-[10px] text-muted-foreground italic text-center py-4">No historical records available</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-24 text-muted-foreground">
                      <Trophy className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 animate-pulse mb-3" />
                      <p className="text-xs font-semibold">Select an athlete to view dashboard analytics</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Detailed Analytics: modern re-skin, all data bindings preserved */
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {loadingStudentDashboard ? (
                /* ── Skeleton ───────────────────────────────────────────────── */
                <div className="space-y-4 animate-pulse">
                  <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl">
                    <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                      <div className="grid grid-cols-4 gap-2">
                        {[1,2,3,4].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl" />)}
                      </div>
                    </div>
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 opacity-60 shrink-0" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl" />)}
                  </div>
                  <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl" />)}
                  </div>
                </div>
              ) : !selectedStudentForDashboard ? (
                /* ── Empty state ────────────────────────────────────────────── */
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                  <Trophy className="w-14 h-14 text-slate-300 dark:text-slate-700 mb-4" />
                  <p className="text-sm font-semibold">Select an athlete to view analytics</p>
                </div>
              ) : (
                <div className="space-y-4">

                  {/* ── Student Header Card ────────────────────────────────── */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
                  >
                    <div className="bg-gradient-to-r from-emerald-500/8 to-cyan-500/8 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 p-0.5 shadow-md shadow-emerald-500/20">
                          {selectedStudentForDashboard?.profile_photo ? (
                            <img
                              src={selectedStudentForDashboard.profile_photo}
                              alt={selectedStudentForDashboard?.name || 'Student'}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-600 to-cyan-600">
                              {selectedStudentForDashboard?.name?.charAt(0) || '?'}
                            </div>
                          )}
                        </div>
                        <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-[9px] shadow">⭐</div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-black text-foreground tracking-tight truncate">
                          {selectedStudentForDashboard?.name || 'Unknown'}
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                          {[
                            { label: 'Sport', value: selectedStudentForDashboard?.enrollments?.[0]?.sport?.name || selectedStudentForDashboard?.sport?.name || selectedStudentForDashboard?.batch?.sport?.name || 'N/A', icon: '🏆' },
                            { label: 'Batch', value: selectedStudentForDashboard?.batch?.name || selectedStudentForDashboard?.enrollments?.[0]?.batch?.name || 'N/A', icon: '👥' },
                            { label: 'Coach', value: selectedStudentForDashboard?.enrollments?.[0]?.batch?.coaches?.[0]?.coach?.name || selectedStudentForDashboard?.enrollments?.[0]?.coach?.name || selectedStudentForDashboard?.batch?.coaches?.[0]?.coach?.name || selectedStudentForDashboard?.coach?.name || 'N/A', icon: '👨‍🏫' },
                            { label: 'Last Assessment', value: studentDashboardData?.history?.[0]?.scored_at ? new Date(studentDashboardData.history[0]?.scored_at).toLocaleDateString() : 'N/A', icon: '📅' },
                          ].map((item) => (
                            <div key={item.label} className="bg-white/60 dark:bg-slate-800/60 rounded-xl px-3 py-2 border border-border/50">
                              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <span>{item.icon}</span>{item.label}
                              </div>
                              <div className="text-xs font-bold text-foreground truncate mt-0.5">{item.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Overall score badge */}
                      <div className="bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl px-5 py-3 text-center shadow-lg shadow-emerald-500/25 shrink-0">
                        <div className="text-3xl font-black text-white leading-none">
                          {studentDashboardData?.analytics?.overallAverage?.toFixed(1) || '0.0'}
                        </div>
                        <div className="text-[10px] font-bold text-white/80 mt-0.5">Overall</div>
                      </div>
                    </div>
                  </motion.div>

                  {/* ── Inner Tab Bar ──────────────────────────────────────── */}
                  <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1 border border-border/50">
                    {[
                      { id: 'overview', label: 'Overview', icon: '📊' },
                      { id: 'trends',   label: 'Trends',   icon: '📈' },
                      { id: 'history',  label: 'History',  icon: '📅' },
                      { id: 'comparison', label: 'Compare', icon: '⚖️' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setDashboardTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                          dashboardTab === tab.id
                            ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <span>{tab.icon}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* ════════════════════════════════════════════════════════ */}
                  {/* OVERVIEW TAB                                            */}
                  {/* ════════════════════════════════════════════════════════ */}
                  {dashboardTab === 'overview' && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

                      {/* Rating cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { icon: '⭐', label: 'Overall',   value: studentDashboardData?.analytics?.overallAverage?.toFixed(1)   || '—', color: 'from-emerald-500 to-cyan-500',   glow: 'shadow-emerald-500/20' },
                          { icon: '🎯', label: 'Technical', value: studentDashboardData?.analytics?.technicalAverage?.toFixed(1) || '—', color: 'from-blue-500 to-indigo-500',    glow: 'shadow-blue-500/20' },
                          { icon: '💪', label: 'Physical',  value: studentDashboardData?.analytics?.physicalAverage?.toFixed(1)  || '—', color: 'from-purple-500 to-pink-500',    glow: 'shadow-purple-500/20' },
                          { icon: '🤝', label: 'Behaviour', value: studentDashboardData?.analytics?.behaviourAverage?.toFixed(1) || '—', color: 'from-amber-500 to-orange-500',   glow: 'shadow-amber-500/20' },
                        ].map((stat, idx) => (
                          <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.06 }}
                            whileHover={{ y: -3 }}
                            className={`bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all`}
                          >
                            <div className="text-xl mb-2">{stat.icon}</div>
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{stat.label}</div>
                            <div className={`text-3xl font-black bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`}>{stat.value}</div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Current Parameters */}
                      {attributes.length > 0 && (
                        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                          <h5 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                            <span>📊</span> Current Parameter Assessment
                          </h5>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                            {attributes.map((attr, idx) => (
                              <motion.div
                                key={attr?.id || attr?.name || idx}
                                initial={{ opacity: 0, scale: 0.92 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.04 + idx * 0.03 }}
                                className="bg-slate-50 dark:bg-slate-800/60 border border-border/60 rounded-xl p-3 hover:border-emerald-500/40 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all"
                              >
                                <div className="text-[10px] font-medium text-muted-foreground truncate mb-1.5">{attr?.name || 'Unknown'}</div>
                                <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-500 to-cyan-500">
                                  {attr?.name && selectedStudentForDashboard?.ratings ? (selectedStudentForDashboard.ratings[attr.name] || '—') : '—'}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Radar chart + Personal Bests side by side */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Radar chart */}
                        {attributes.length > 0 && (
                          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                            <h5 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                              <span>🕸️</span> Attribute Radar
                            </h5>
                            <div className="h-52">
                              <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={
                                  attributes.map(attr => {
                                    const latestAssessment = studentDashboardData?.history?.[0];
                                    const scoreVal = latestAssessment?.scores?.find(s =>
                                      s.attribute?.attribute_id === attr.attribute_id || s.attribute?.name === attr.name || s.attribute_id === attr.attribute_id
                                    )?.score || 0;
                                    return { subject: attr.name, A: scoreVal, fullMark: 10 };
                                  })
                                }>
                                  <PolarGrid stroke="currentColor" className="text-border/40" strokeWidth={0.5} />
                                  <PolarAngleAxis dataKey="subject" stroke="currentColor" className="text-muted-foreground" fontSize={9} />
                                  <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="currentColor" className="text-border/20" fontSize={7} />
                                  <Radar name="Score" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.3} strokeWidth={2} />
                                </RadarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}

                        {/* Personal Bests */}
                        {Object.keys(getPersonalBests()).length > 0 && (
                          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                            <h5 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                              <span>🏆</span> Personal Best Records
                            </h5>
                            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                              {Object.entries(getPersonalBests()).map(([attr, best], idx) => (
                                <div key={attr} className="flex items-center justify-between bg-amber-50/60 dark:bg-amber-950/20 border border-amber-500/15 rounded-xl px-3 py-2">
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-foreground truncate">{attr}</div>
                                    <div className="text-[10px] text-muted-foreground">📅 {new Date(best.date).toLocaleDateString()}</div>
                                  </div>
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-sm font-black text-white shadow shrink-0 ml-3">
                                    {best.score}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* ════════════════════════════════════════════════════════ */}
                  {/* TRENDS TAB                                              */}
                  {/* ════════════════════════════════════════════════════════ */}
                  {dashboardTab === 'trends' && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

                      {/* Controls row */}
                      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[160px]">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                            📅 Date Range
                          </label>
                          <select
                            value={dateRangeFilter}
                            onChange={(e) => setDateRangeFilter(e.target.value)}
                            className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-border focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all"
                          >
                            <option value="all">All Time</option>
                            <option value="30">Last 30 Days</option>
                            <option value="90">Last 3 Months</option>
                            <option value="180">Last 6 Months</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                            📈 Graph Style
                          </label>
                          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-border/50">
                            {['smooth', 'straight'].map(g => (
                              <button
                                key={g}
                                type="button"
                                onClick={() => setGraphType(g)}
                                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all capitalize ${graphType === g ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                              >
                                {g}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Attribute filter pills */}
                      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                        <h5 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-3">Filter Attributes</h5>
                        <div className="flex flex-wrap gap-2">
                          {selectedAttributes.filter(attr => attr !== 'Overall').map((attr, idx) => (
                            <label
                              key={attr}
                              className={`flex items-center gap-1.5 text-xs cursor-pointer px-3 py-1.5 rounded-full border transition-all font-semibold ${
                                visibleAttributes.includes(attr)
                                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white border-emerald-500 shadow-sm'
                                  : 'bg-slate-50 dark:bg-slate-800 border-border/60 text-muted-foreground hover:border-emerald-400 hover:text-foreground'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={visibleAttributes.includes(attr)}
                                onChange={() => handleAttributeToggle(attr)}
                                className="sr-only"
                              />
                              {visibleAttributes.includes(attr) ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                              {attr}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Trend chart */}
                      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                        <h5 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                          <span>📈</span> Performance Trend
                        </h5>
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%" minWidth={300}>
                            <LineChart data={prepareGraphData} margin={{ top: 5, right: 20, left: -15, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-border/40" opacity={0.4} />
                              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={{ stroke: 'currentColor', opacity: 0.2 }} axisLine={{ stroke: 'currentColor', opacity: 0.2 }} />
                              <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} tickLine={{ stroke: 'currentColor', opacity: 0.2 }} axisLine={{ stroke: 'currentColor', opacity: 0.2 }} />
                              <Tooltip
                                content={({ active, payload, label }) => {
                                  if (!active || !payload || payload.length === 0) return null;
                                  const data = payload[0].payload;
                                  const entries = [];
                                  if (data.Overall !== undefined) entries.push({ name: 'Overall Average', value: data.Overall.toFixed(1), color: '#10b981' });
                                  visibleAttributes.filter(attr => data[attr] !== undefined).sort((a,b) => a.localeCompare(b)).forEach(attr => {
                                    entries.push({ name: attr, value: data[attr].toFixed(1), color: getAttributeColor(attr) });
                                  });
                                  return (
                                    <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-xs">
                                      <p className="font-bold text-muted-foreground mb-2">{label}</p>
                                      {entries.map((entry, i) => (
                                        <div key={i} className="flex items-center justify-between gap-4 mb-1">
                                          <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full" style={{background: entry.color}} />
                                            <span className="text-foreground">{entry.name}</span>
                                          </div>
                                          <span className="font-bold text-foreground">{entry.value}</span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }}
                              />
                              <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }} iconType="circle" />
                              <defs>
                                <linearGradient id="gradientOverall" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                                  <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                                </linearGradient>
                                <linearGradient id="gradientBlue" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                                  <stop offset="100%" stopColor="#2563eb" stopOpacity={1} />
                                </linearGradient>
                                <linearGradient id="gradientPurple" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={1} />
                                </linearGradient>
                                <linearGradient id="gradientOrange" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                                  <stop offset="100%" stopColor="#d97706" stopOpacity={1} />
                                </linearGradient>
                                <linearGradient id="gradientRed" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                                  <stop offset="100%" stopColor="#dc2626" stopOpacity={1} />
                                </linearGradient>
                                <linearGradient id="gradientCyan" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={1} />
                                  <stop offset="100%" stopColor="#0891b2" stopOpacity={1} />
                                </linearGradient>
                              </defs>
                              <Line type={graphType === 'smooth' ? 'monotone' : 'linear'} dataKey="Overall" stroke="url(#gradientOverall)" strokeWidth={3} dot={{ r: 3.5, fill: '#10b981', strokeWidth: 2, stroke: '#059669' }} activeDot={{ r: 5 }} name="Overall Average" animationDuration={800} />
                              {visibleAttributes.map((attr, idx) => {
                                const gradients = ['url(#gradientBlue)', 'url(#gradientPurple)', 'url(#gradientOrange)', 'url(#gradientRed)', 'url(#gradientCyan)'];
                                const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];
                                const strokeColors = ['#2563eb', '#7c3aed', '#d97706', '#dc2626', '#0891b2'];
                                return (
                                  <Line key={attr} type={graphType === 'smooth' ? 'monotone' : 'linear'} dataKey={attr} stroke={gradients[idx % 5]} strokeWidth={2} dot={{ r: 3, fill: colors[idx % 5], strokeWidth: 2, stroke: strokeColors[idx % 5] }} activeDot={{ r: 4 }} connectNulls={false} name={attr} animationDuration={800} animationBegin={idx * 80} />
                                );
                              })}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ════════════════════════════════════════════════════════ */}
                  {/* HISTORY TAB                                             */}
                  {/* ════════════════════════════════════════════════════════ */}
                  {dashboardTab === 'history' && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

                      {/* Assessment timeline list */}
                      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                        <h5 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                          <span>📅</span> Assessment Timeline
                        </h5>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {getFilteredHistory().length === 0 ? (
                            <p className="text-xs text-muted-foreground italic text-center py-6">No assessments in this date range</p>
                          ) : getFilteredHistory().map((assessment, idx) => {
                            const avg = calculateAverageRating(assessment.scores);
                            const grade = calculateGrade(parseFloat(avg));
                            return (
                              <motion.button
                                key={assessment.assessment_id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                whileHover={{ x: 3 }}
                                onClick={() => handleAssessmentSelect(assessment)}
                                className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                                  selectedAssessment?.assessment_id === assessment.assessment_id
                                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500/60 shadow-sm'
                                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-border/50 hover:border-emerald-400/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-xs font-black text-white shadow-sm shrink-0">
                                    {grade}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-foreground">
                                      {new Date(assessment.scored_at).toLocaleDateString()}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground truncate">
                                      {assessment.coach?.name || 'Coach'} · Avg: {avg}/10
                                    </div>
                                  </div>
                                  <div className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-lg shrink-0">
                                    {avg}
                                  </div>
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Selected assessment detail */}
                      {selectedAssessment && (() => {
                        const historyList = getFilteredHistory();
                        const currentIndex = historyList.findIndex(a => a.assessment_id === selectedAssessment.assessment_id);
                        const previousAssessment = currentIndex < historyList.length - 1 ? historyList[currentIndex + 1] : null;
                        const improvementData = getImprovementIndicators(selectedAssessment, previousAssessment);
                        return (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-card border border-border rounded-2xl p-4 shadow-sm"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <h5 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <span>🔍</span> Assessment Detail · {new Date(selectedAssessment.scored_at).toLocaleDateString()}
                              </h5>
                              <span className="text-[10px] font-bold text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                                by {selectedAssessment.coach?.name || 'Coach'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 mb-4">
                              {selectedAssessment.scores?.map((score, i) => {
                                const improvement = improvementData?.[score.attribute?.name];
                                return (
                                  <div
                                    key={score.score_id || i}
                                    className="bg-slate-50 dark:bg-slate-800/60 border border-border/60 rounded-xl p-3"
                                  >
                                    <div className="text-[10px] text-muted-foreground font-medium truncate mb-1.5">
                                      {score.attribute?.name || 'Attribute'}
                                    </div>
                                    <div className="flex items-baseline justify-between">
                                      <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-500 to-cyan-500">
                                        {score.score}
                                      </span>
                                      {improvement && (
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                                          improvement.change > 0
                                            ? 'bg-emerald-500/10 text-emerald-600'
                                            : improvement.change < 0
                                              ? 'bg-red-500/10 text-red-500'
                                              : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground'
                                        }`}>
                                          {improvement.change > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : improvement.change < 0 ? <TrendingDown className="w-2.5 h-2.5" /> : null}
                                          {improvement.change > 0 ? '+' : ''}{improvement.change?.toFixed(1)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {selectedAssessment.notes && (
                              <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-500/15 rounded-xl p-3">
                                <div className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">💬 Coach Remarks</div>
                                <p className="text-xs text-foreground italic">"{selectedAssessment.notes}"</p>
                              </div>
                            )}
                          </motion.div>
                        );
                      })()}

                      {/* Export button */}
                      <div className="flex justify-end">
                        <motion.button
                          whileHover={{ scale: 1.02, y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleExportPDF()}
                          className="flex items-center gap-2 text-xs font-bold px-4 py-2 bg-card border border-border rounded-xl hover:border-emerald-500/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all text-foreground"
                        >
                          📄 Export PDF Report
                        </motion.button>
                      </div>
                    </motion.div>
                  )}

                  {/* ════════════════════════════════════════════════════════ */}
                  {/* COMPARISON TAB                                          */}
                  {/* ════════════════════════════════════════════════════════ */}
                  {dashboardTab === 'comparison' && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

                      {/* Selectors */}
                      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                        <h5 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                          <span>⚖️</span> Select Two Assessments to Compare
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(['assessment1', 'assessment2'] ).map((pos, pi) => (
                            <div key={pos}>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                                {pi === 0 ? 'Assessment A' : 'Assessment B'}
                              </label>
                              <select
                                value={compareAssessments[pos]?.assessment_id || ''}
                                onChange={(e) => {
                                  const selected = studentDashboardData?.history?.find(a => String(a.assessment_id) === e.target.value);
                                  handleCompareSelect(pos, selected);
                                }}
                                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-border focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all"
                              >
                                <option value="">Select assessment…</option>
                                {studentDashboardData?.history?.map(assessment => (
                                  <option key={assessment.assessment_id} value={assessment.assessment_id}>
                                    {new Date(assessment.scored_at).toLocaleDateString()} — avg {calculateAverageRating(assessment.scores)}/10
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Comparison result */}
                      {compareAssessments.assessment1 && compareAssessments.assessment2 && (() => {
                        const scores1 = {};
                        const scores2 = {};
                        compareAssessments.assessment1.scores?.forEach(s => { scores1[s.attribute?.name] = s.score; });
                        compareAssessments.assessment2.scores?.forEach(s => { scores2[s.attribute?.name] = s.score; });
                        const allAttrs = [...new Set([...Object.keys(scores1), ...Object.keys(scores2)])];
                        return (
                          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
                              <span>Attribute</span>
                              <div className="flex gap-12 pr-1">
                                <span className="text-emerald-600">A</span>
                                <span className="text-blue-600">B</span>
                                <span>Diff</span>
                              </div>
                            </div>
                            {allAttrs.map((attr, i) => {
                              const s1 = scores1[attr] ?? 0;
                              const s2 = scores2[attr] ?? 0;
                              const diff = s1 - s2;
                              return (
                                <div key={attr} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-medium text-foreground truncate max-w-[120px]">{attr}</span>
                                    <div className="flex items-center gap-4 shrink-0">
                                      <span className="font-black text-emerald-600 w-6 text-right">{s1}</span>
                                      <span className="font-black text-blue-600 w-6 text-right">{s2}</span>
                                      <span className={`font-black w-10 text-right ${diff > 0 ? 'text-emerald-500' : diff < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                        {diff > 0 ? `+${diff}` : diff}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex gap-1 h-1.5">
                                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                      <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all" style={{ width: `${(s1 / 10) * 100}%` }} />
                                    </div>
                                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                      <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all" style={{ width: `${(s2 / 10) * 100}%` }} />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {(!compareAssessments.assessment1 || !compareAssessments.assessment2) && (
                        <div className="text-center py-12 text-muted-foreground text-xs font-semibold bg-card border border-border rounded-2xl">
                          Select two assessments above to see a side-by-side comparison
                        </div>
                      )}

                      {/* Export */}
                      <div className="flex justify-end">
                        <motion.button
                          whileHover={{ scale: 1.02, y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleExportPDF()}
                          className="flex items-center gap-2 text-xs font-bold px-4 py-2 bg-card border border-border rounded-xl hover:border-emerald-500/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all text-foreground"
                        >
                          📄 Export PDF Report
                        </motion.button>
                      </div>
                    </motion.div>
                  )}

                </div>
              )}
            </div>
          )
        ) : (
          /* ========================================================================= */
          /* MANUAL SCORING LEDGER MODE (3-Column layout)                              */
          /* ========================================================================= */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* COLUMN 1: Student List (Left, width md:w-72) */}
            <div className="w-full md:w-72 bg-white dark:bg-slate-900 border-r border-border/60 flex flex-col overflow-hidden shrink-0 h-full">
              <div className="px-3 py-2 border-b border-border/40 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Trainees List</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {getFilteredStudents.length} Active
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                {loadingStudents ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900 rounded-xl animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-800 rounded" />
                        <div className="h-2 w-1/3 bg-slate-200 dark:bg-slate-800 rounded" />
                      </div>
                    </div>
                  ))
                ) : getFilteredStudents.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-xs font-semibold">
                    No athletes found
                  </div>
                ) : (
                  getFilteredStudents.map((student, idx) => {
                    const isSelected = selectedStudentForDashboard?.student_id === student.student_id || selectedStudentForDashboard?.id === student.id;
                    const currentRatings = student.ratings || {};
                    const ratingValues = Object.values(currentRatings).filter(val => typeof val === 'number');
                    const avgScore = ratingValues.length > 0 ? (ratingValues.reduce((sum, r) => sum + r, 0) / ratingValues.length).toFixed(1) : null;
                    const grade = avgScore ? calculateGrade(parseFloat(avgScore)) : 'N/A';

                    return (
                      <motion.div
                        key={student.student_id || student.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        whileHover={{ x: 3 }}
                        onClick={() => handleSelectStudentForLayout(student)}
                        className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-gradient-to-r from-emerald-50/80 to-cyan-50/50 dark:from-emerald-950/40 dark:to-cyan-950/20 border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/20'
                            : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar
                            src={student.profile_photo}
                            name={student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim()}
                            size="md"
                            className={`shadow-sm ring-1 ${isSelected ? 'ring-emerald-500' : 'ring-border'}`}
                          />
                          <div className="min-w-0">
                            <h4 className={`font-semibold text-xs truncate ${isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'}`}>
                              {student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim()}
                            </h4>
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">#{student.student_id}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {avgScore ? (
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                                {avgScore}
                              </span>
                              <span className="text-[8px] font-bold text-muted-foreground uppercase mt-0.5">{grade}</span>
                            </div>
                          ) : (
                            <span className="text-[9px] font-bold text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              Unrated
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>

            {/* COLUMN 2: Performance Evaluation (Center, flex-1) */}
            <div className="flex-1 bg-white dark:bg-slate-900/60 flex flex-col overflow-hidden border-r border-border/60 h-full">
              <div className="px-4 py-2 border-b border-border/40 bg-slate-50/50 dark:bg-slate-900 flex justify-between items-center shrink-0">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Metrics Scoring Ledger</span>
                <div className="flex items-center gap-2">
                  {selectedStudentForDashboard && (
                    <>
                      {selectedAssessmentId ? (
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          isExistingAdminRecord 
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                            : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                        }`}>
                          {isExistingAdminRecord ? '📝 Admin Record' : `👤 Coach: ${existingAssessmentCreator}`}
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full animate-pulse">
                          ⚠️ No Record on this Date
                        </span>
                      )}

                      <span className="text-[10px] font-bold text-cyan-600 bg-cyan-500/10 px-2 py-0.5 rounded-full">
                        {Object.values(scores).filter(v => v > 0).length} / {attributes.length} Rated
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {selectedStudentForDashboard ? (
                  <>
                    {/* VALIDATION WARNING BANNER FOR EXISTING COACH RECORD */}
                    {isCoachRecordLocked && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-4 rounded-xl text-center space-y-2 shadow-sm"
                      >
                        <AlertCircle className="w-8 h-8 text-red-500 mx-auto animate-bounce" />
                        <h4 className="text-xs font-extrabold text-red-700 dark:text-red-400 uppercase tracking-wide">
                          Coach has already submitted performance for this date.
                        </h4>
                        <p className="text-[10px] text-red-600/90 dark:text-red-500/80 font-medium">
                          The manual scoring ledger is locked to protect coach submissions. Please pick another date.
                        </p>
                      </motion.div>
                    )}

                    {/* Progress Completeness */}
                    <div className="bg-slate-50 dark:bg-slate-900/40 border border-border/60 rounded-xl p-3 space-y-1.5 shadow-sm">
                      <div className="flex justify-between items-center text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                        <span>Completeness progress</span>
                        <span className="text-emerald-500 font-bold">
                          {attributes.length > 0 ? ((Object.values(scores).filter(v => v > 0).length / attributes.length) * 100).toFixed(0) : 0}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${attributes.length > 0 ? (Object.values(scores).filter(v => v > 0).length / attributes.length) * 100 : 0}%` }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300"
                        />
                      </div>
                    </div>

                    {/* Dynamic Ledger Categories */}
                    {['Physical', 'Technical', 'Behavioural'].map((category) => {
                      const catAttrs = attributes.filter(a => {
                        const name = a.name?.toLowerCase() || '';
                        if (category === 'Physical') {
                          return name.includes('speed') || name.includes('stamina') || name.includes('strength') || name.includes('agility') || name.includes('physical') || name.includes('pace') || name.includes('power') || name.includes('fitness');
                        }
                        if (category === 'Technical') {
                          return name.includes('skill') || name.includes('technique') || name.includes('shot') || name.includes('dribble') || name.includes('pass') || name.includes('accuracy') || name.includes('control') || name.includes('play') || name.includes('tactical');
                        }
                        // Behavioural
                        return !name.includes('speed') && !name.includes('stamina') && !name.includes('strength') && !name.includes('agility') && !name.includes('physical') && !name.includes('pace') && !name.includes('power') && !name.includes('fitness') &&
                               !name.includes('skill') && !name.includes('technique') && !name.includes('shot') && !name.includes('dribble') && !name.includes('pass') && !name.includes('accuracy') && !name.includes('control') && !name.includes('play') && !name.includes('tactical');
                      });
                      if (catAttrs.length === 0) return null;

                      return (
                        <div key={category} className="space-y-2">
                          <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-border/30 pb-1 flex items-center gap-1.5">
                            <span>{category === 'Physical' ? '💪' : category === 'Technical' ? '🎯' : '🧠'}</span>
                            <span>{category} Parameters</span>
                          </h4>
                          <div className="space-y-2">
                            {catAttrs.map(attr => {
                              const val = scores[attr.attribute_id || attr.id] || 0;
                              const isFilled = val > 0;
                              
                              const prevValue = getPreviousScore(attr.attribute_id || attr.id, attr.name);
                              const imp = getImprovementInfo(attr.attribute_id || attr.id, attr.name, val);

                              let IconComponent = Target;
                              if (category === 'Physical') IconComponent = Activity;
                              if (category === 'Behavioural') IconComponent = Users;

                              return (
                                <div
                                  key={attr.attribute_id || attr.id}
                                  className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                                    isFilled 
                                      ? 'bg-slate-50/55 dark:bg-slate-900/30 border-border/80' 
                                      : 'bg-card border-dashed border-border/60 hover:border-emerald-450'
                                  }`}
                                >
                                  <div className="flex items-start gap-2.5">
                                    <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${isFilled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground'}`}>
                                      <IconComponent className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <span className="text-xs font-bold text-foreground block">{attr.name}</span>
                                      <div className="flex gap-2 items-center mt-0.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                        <span>Prev: {prevValue !== null ? `${prevValue}/10` : '—'}</span>
                                        {imp && (
                                          <>
                                            <span>•</span>
                                            <span className={`flex items-center gap-0.5 ${imp.diff > 0 ? 'text-emerald-500' : imp.diff < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                              {imp.diff > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : imp.diff < 0 ? <TrendingDown className="w-2.5 h-2.5" /> : null}
                                              {imp.diff > 0 ? `+${imp.diff.toFixed(1)}` : imp.diff.toFixed(1)} ({imp.percent}%)
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className={`flex items-center gap-1 overflow-x-auto py-1 ${isCoachRecordLocked ? 'pointer-events-none opacity-60' : ''}`}>
                                    {Array.from({ length: 10 }).map((_, i) => {
                                      const num = i + 1;
                                      const isActive = val >= num;
                                      const isSelected = val === num;
                                      return (
                                        <button
                                          key={num}
                                          type="button"
                                          disabled={submitting || isCoachRecordLocked}
                                          onClick={() => setScores(prev => ({ ...prev, [attr.attribute_id || attr.id]: num }))}
                                          className={`w-6 h-6 rounded-full border text-[9px] font-bold flex items-center justify-center transition-all ${
                                            isSelected
                                              ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 border-emerald-500 text-white font-extrabold scale-110 shadow-md shadow-emerald-500/35'
                                              : isActive
                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 font-semibold'
                                                : 'bg-white dark:bg-slate-800 text-muted-foreground border-border hover:border-slate-400'
                                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                          {num}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    <div className="bg-slate-50 dark:bg-slate-900/40 border border-border/60 rounded-xl p-3.5 space-y-2.5 shadow-sm">
                      <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex justify-between items-center border-b border-border/30 pb-1.5">
                        <span>📝 Observations & remarks</span>
                        <span className="text-[9px] font-bold text-slate-405 font-medium">Synced to Parent Inbox</span>
                      </h4>
                      <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        disabled={submitting || isCoachRecordLocked}
                        placeholder={isCoachRecordLocked ? "Coach submitted records are locked." : "Detail athlete progress, coach notes, technical guidelines..."}
                        rows={3}
                        className="w-full text-xs p-3 rounded-lg bg-white dark:bg-slate-800 border border-border/80 focus:ring-1 focus:ring-emerald-500/15 focus:border-emerald-500 outline-none resize-none font-medium disabled:bg-slate-100/50 dark:disabled:bg-slate-850/50"
                      />
                      <div className="flex items-center gap-2 text-[9.5px] font-bold text-muted-foreground">
                        <input
                          type="checkbox"
                          id="autoNav"
                          checked={autoNavigateNext}
                          onChange={(e) => setAutoNavigateNext(e.target.checked)}
                          className="rounded border-border text-emerald-500 focus:ring-emerald-500/20 w-3.5 h-3.5 cursor-pointer"
                        />
                        <label htmlFor="autoNav" className="cursor-pointer select-none">Auto-navigate to next athlete after saving</label>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-24 text-muted-foreground">
                    <Brain className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 animate-pulse mb-3" />
                    <p className="text-xs font-semibold">Select an athlete from the list to begin evaluation</p>
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 3: Dates & Performance History check (Right, width md:w-80) */}
            <div className="w-full md:w-80 bg-white dark:bg-slate-900 border-l border-border/60 flex flex-col overflow-hidden shrink-0 h-full">
              <div className="px-4 py-2 border-b border-border/40 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Assessments Date Check</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                <div className="bg-slate-50 dark:bg-slate-900/40 border border-border/60 p-3 rounded-xl space-y-1.5 shadow-sm">
                  <h5 className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Scoring Guidelines</h5>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    The Admin can log performance ratings only for dates missed by the Coach. Click any date below with a <span className="text-amber-500 font-bold">⚠️ Missed</span> badge to immediately log scores for that day.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <h5 className="text-[10px] font-black uppercase text-muted-foreground tracking-wider border-b border-border/20 pb-1">Past 7 Days History</h5>
                  {selectedStudentForDashboard ? (
                    <div className="space-y-2">
                      {pastDatesStatus.map((dObj) => {
                        const isSelected = selectedDate === dObj.date;
                        return (
                          <button
                            key={dObj.date}
                            type="button"
                            onClick={() => {
                              if (dObj.status !== 'coach') {
                                setSelectedDate(dObj.date);
                              }
                            }}
                            disabled={dObj.status === 'coach'}
                            className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20'
                                : dObj.status === 'coach'
                                  ? 'border-border/30 bg-slate-50/30 dark:bg-slate-900/10 cursor-not-allowed opacity-75'
                                  : 'border-border/60 hover:border-emerald-450 bg-white dark:bg-slate-950 shadow-sm'
                            }`}
                          >
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold block text-foreground">{dObj.label}</span>
                              <span className="text-[9px] text-muted-foreground font-mono">{dObj.date}</span>
                            </div>
                            <div>
                              {dObj.status === 'coach' ? (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[9px] font-extrabold uppercase">
                                  🟢 Coach
                                </span>
                              ) : dObj.status === 'admin' ? (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-400 text-[9px] font-extrabold uppercase">
                                  🔵 Admin
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-455 text-[9px] font-extrabold uppercase animate-pulse">
                                  ⚠️ Missed
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground italic text-center py-4">Select an athlete to view dates status.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </ModalWrapper>
      </div>

      {/* Student Side Drawer / History Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
            {/* Background click overlay */}
            <div className="absolute inset-0" onClick={() => setSelectedStudent(null)} />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg h-full bg-surface border-l border-border shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between shrink-0">
                <div>
                  <h4 className="text-xl font-black text-foreground">
                    {selectedStudent.name || `${selectedStudent.firstName || ''} ${selectedStudent.lastName || ''}`}
                  </h4>
                  <p className="text-xs text-muted-foreground">Student Performance History & Logs</p>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="p-2 hover:bg-surface-secondary text-muted-foreground rounded-full text-lg transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {/* Current Status Overview */}
                <div className="bg-surface-secondary border border-border rounded-xl p-4">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Current Parameters Assessment</h5>
                  <div className="grid grid-cols-2 gap-3">
                    {attributes.map((attr, idx) => (
                      <div key={attr?.id || attr?.name || idx} className="flex justify-between items-center p-2 bg-surface rounded-lg border border-border/50">
                        <span className="text-xs font-medium text-muted-foreground">{attr?.name || 'Unknown'}</span>
                        <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded">
                          {attr?.name ? (selectedStudent.ratings?.[attr.name] || selectedStudent.performance_metrics?.[attr.name] || 'N/A') : 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Coach Tracking Timeline History */}
                <div className="space-y-4">
                  <h5 className="text-sm font-black text-foreground mb-2">📊 Metrics Scoring Ledger · Coach Assessments</h5>

                  {loadingHistory ? (
                    <div className="flex items-center justify-center py-6"><Loader /></div>
                  ) : studentHistory.length > 0 ? (
                    <div className="relative border-l border-border/70 ml-2 space-y-6 pl-4 py-2">
                      {studentHistory.map((historyItem, idx) => (
                        <div key={idx} className="relative">
                          {/* Timeline Bullet Point */}
                          <span className="absolute -left-[21px] top-1 flex h-3 w-3 items-center justify-center rounded-full bg-accent ring-4 ring-surface" />

                          <div className="bg-surface-secondary/70 p-3.5 rounded-xl border border-border/50 space-y-2">
                           <div className="flex justify-between items-center text-xs text-muted-foreground">
                              <span className="font-bold text-foreground">📅 {historyItem.date}</span>
                              <span>👤 {historyItem.coach?.name || (typeof historyItem.coach === 'string' ? historyItem.coach : 'Assigned Coach')}</span>
                            </div>

                            {/* Remarks */}
                            <p className="text-xs text-foreground italic bg-surface p-2 rounded border border-border/30">
                              "{historyItem.remarks || 'No notes provided by coach.'}"
                            </p>

                            {/* Snapshot of that log's metrics */}
                            <div className="flex flex-wrap gap-2 pt-1">
                              {Object.entries(historyItem.metrics || {}).map(([key, val]) => (
                                <span key={key} className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-medium">
                                  {key}: <strong>{val}</strong>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground bg-surface-secondary/40 p-4 rounded-xl text-center border border-dashed border-border">
                      No historical logs captured by the coaches for this student yet.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}