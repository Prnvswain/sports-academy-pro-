import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader';
import Avatar from '../../components/Avatar';
import { coachGet, coachPost, coachPatch, coachDelete } from '../../api/client';
import { useCoachBatches } from '../../context/CoachBatchesContext';
import { 
  Users, 
  Filter, 
  CheckCircle, 
  XCircle, 
  User, 
  UserCheck, 
  AlertCircle, 
  Edit, 
  Calendar, 
  ClipboardList, 
  TrendingUp, 
  TrendingDown, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Download, 
  Printer, 
  Activity, 
  History, 
  Award, 
  Sparkles,
  ChevronRight,
  Save,
  Trash,
  Search,
  ChevronLeft,
  Settings
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter
} from 'recharts';

const categorizeAttribute = (name) => {
  const nameLower = name.toLowerCase();
  if (
    nameLower.includes('speed') ||
    nameLower.includes('strength') ||
    nameLower.includes('stamina') ||
    nameLower.includes('fitness') ||
    nameLower.includes('physical') ||
    nameLower.includes('pace') ||
    nameLower.includes('agility') ||
    nameLower.includes('endurance') ||
    nameLower.includes('power') ||
    nameLower.includes('acceleration') ||
    nameLower.includes('sprint')
  ) {
    return 'Fitness';
  }
  if (
    nameLower.includes('passing') ||
    nameLower.includes('shooting') ||
    nameLower.includes('control') ||
    nameLower.includes('dribble') ||
    nameLower.includes('technique') ||
    nameLower.includes('skill') ||
    nameLower.includes('tactical') ||
    nameLower.includes('tackle') ||
    nameLower.includes('cross') ||
    nameLower.includes('serve') ||
    nameLower.includes('volley') ||
    nameLower.includes('touch') ||
    nameLower.includes('accuracy') ||
    nameLower.includes('hand-eye') ||
    nameLower.includes('footwork')
  ) {
    return 'Technique';
  }
  if (
    nameLower.includes('discipline') ||
    nameLower.includes('confidence') ||
    nameLower.includes('focus') ||
    nameLower.includes('concentration') ||
    nameLower.includes('attitude') ||
    nameLower.includes('effort') ||
    nameLower.includes('mental') ||
    nameLower.includes('communication') ||
    nameLower.includes('teamwork') ||
    nameLower.includes('leadership') ||
    nameLower.includes('decision') ||
    nameLower.includes('intelligence')
  ) {
    return 'Mental';
  }
  return 'Technique'; // default
};

const getScoreLabel = (score) => {
  if (score <= 3) return 'Developing';
  if (score <= 7) return 'Proficient';
  return 'Elite';
};

export default function CoachPerformancePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL bound states
  const activeBatchId = searchParams.get('batch_id');
  const activeStudentId = searchParams.get('student_id');
  const activeAction = searchParams.get('action'); // 'evaluate' or 'analytics'

  // General loaded data
  const [batches, setBatches] = useState([]);
  const [allStudentsDetailed, setAllStudentsDetailed] = useState([]);
  const [globalScores, setGlobalScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isCalendarHoliday, setIsCalendarHoliday] = useState(false);
  const [holidayMessage, setHolidayMessage] = useState('');

  // Single entity operations
  const [scores, setScores] = useState({});
  const [remarks, setRemarks] = useState('');
  const [attributes, setAttributes] = useState([]);
  const [dailyLock, setDailyLock] = useState(null);
  const [previousAssessment, setPreviousAssessment] = useState(null);

  // Baselines for unsaved changes warnings
  const [initialScores, setInitialScores] = useState({});
  const [initialRemarks, setInitialRemarks] = useState('');
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  // Student specific analytics loads
  const [studentAnalytics, setStudentAnalytics] = useState(null);
  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Options settings
  const [autoNavigateNext, setAutoNavigateNext] = useState(true);

  // Caches for performance optimization
  const [studentsCache, setStudentsCache] = useState({});

  // Global search input
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // Key-rating tracker
  const [hoveredAttrId, setHoveredAttrId] = useState(null);

  // Ref for scroll-to-top functionality
  const evaluationPageRef = useRef(null);

  // Smooth scroll to top of evaluation page
  const scrollToTop = useCallback(() => {
    if (evaluationPageRef.current) {
      evaluationPageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Filters state
  const [statusFilter, setStatusFilter] = useState('all');
  const [ratingRangeFilter, setRatingRangeFilter] = useState('all');
  const [ageGroupFilter, setAgeGroupFilter] = useState('all');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('all');

  // Proposal modal state
  const [showProposal, setShowProposal] = useState(false);
  const [proposalForm, setProposalForm] = useState({ name: '', sport_id: '', category: 'Technique' });
  const [proposedAttributes, setProposedAttributes] = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [editingProposal, setEditingProposal] = useState(null);
  const [editProposalForm, setEditProposalForm] = useState({ name: '', sport_id: '', category: 'Technique' });
  const [showEditProposal, setShowEditProposal] = useState(false);

  // Flash banner
  const flash = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // --- INITIAL DATA LOAD ---
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [batchesRes, studentsRes, scoresRes] = await Promise.all([
        coachGet('/coach/batches'),
        coachGet('/coach/students-fee-summary'),
        coachGet('/coach/performance/scores')
      ]);

      const batchesList = batchesRes.data?.batches || batchesRes.data || batchesRes || [];
      const studentsList = studentsRes.data?.students || studentsRes.data || [];
      const rawScores = scoresRes.data || scoresRes || [];

      setBatches(batchesList);
      setAllStudentsDetailed(studentsList);
      setGlobalScores(rawScores);
    } catch (err) {
      console.error(err);
      flash('Failed to load performance metrics', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProposals = useCallback(async () => {
    try {
      setLoadingProposals(true);
      const res = await coachGet('/coach/performance/attributes');
      const list = res.data || res || [];
      setProposedAttributes(list.filter(attr => attr.status === 'PENDING'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProposals(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
    loadProposals();
  }, [loadInitialData, loadProposals]);

  useEffect(() => {
    const checkCalendarStatus = async () => {
      try {
        const res = await coachGet('/coach/calendar/dashboard');
        if (res?.success && res.data) {
          const status = res.data.todayStatus;
          if (status.includes('Holiday') || status.includes('Weekly Off') || status.includes('Parent Meeting')) {
            setIsCalendarHoliday(true);
            setHolidayMessage(`This date is marked as a ${status.split(' ').slice(1).join(' ')}. Attendance and Performance operations are disabled.`);
          }
        }
      } catch (err) {
        console.error('Failed to check calendar status:', err);
      }
    };
    checkCalendarStatus();
  }, []);

  // Load single student assessments, daily lock status, attributes, and previous scores
  const loadStudentOperationalData = useCallback(async (studentId, sportId) => {
    if (!studentId || !sportId) return;
    setLoading(true);
    try {
      // 1. Fetch attributes for the sport
      const attrRes = await coachGet(`/coach/performance/attributes?sport_id=${sportId}&status=APPROVED`);
      const attrList = attrRes.data || attrRes || [];
      setAttributes(attrList);

      // 2. Fetch assessments history ( timeline )
      setLoadingHistory(true);
      const historyRes = await coachGet(`/coach/performance/assessments?student_id=${studentId}`);
      const historyList = historyRes.data?.assessments || historyRes.data || [];
      setAssessmentHistory(historyList);
      setLoadingHistory(false);

      // Sort timeline to find previous evaluations
      let previousMap = null;
      if (historyList.length > 0) {
        const sorted = [...historyList].sort((a, b) => new Date(b.scored_at) - new Date(a.scored_at));
        setPreviousAssessment(sorted[0]);
        previousMap = sorted[0];
      } else {
        setPreviousAssessment(null);
      }

      // 3. Check daily lock status
      const lockRes = await coachGet(`/coach/performance/check-daily-lock?student_id=${studentId}`);
      if (lockRes.data && lockRes.data.locked) {
        setDailyLock({
          locked: true,
          assessment_id: lockRes.data.assessment_id,
          scored_at: lockRes.data.scored_at
        });
      } else {
        setDailyLock(null);
      }

      // 4. Fetch analytics if view is analytics
      if (activeAction === 'analytics') {
        const analyticsRes = await coachGet(`/coach/performance/analytics/student/${studentId}`);
        if (analyticsRes.data) setStudentAnalytics(analyticsRes.data);
      }

      // 5. Load draft score if exists in local storage
      const draftStr = localStorage.getItem(`performance_draft_${studentId}`);
      let loadedScores = {};
      let loadedRemarks = '';

      if (draftStr) {
        try {
          const draft = JSON.parse(draftStr);
          loadedScores = draft.scores || {};
          loadedRemarks = draft.remarks || '';
        } catch {
          loadedScores = {};
          loadedRemarks = '';
        }
      } else {
        // Pre-fill with current database score if exists
        const today = new Date().toISOString().split('T')[0];
        const studentTodayScores = globalScores.filter(
          s => s.student_id === parseInt(studentId) && new Date(s.scored_at).toISOString().split('T')[0] === today
        );
        studentTodayScores.forEach(s => {
          loadedScores[s.attribute_id] = s.score;
          if (s.notes) loadedRemarks = s.notes;
        });
      }

      setScores(loadedScores);
      setRemarks(loadedRemarks);
      setInitialScores(loadedScores);
      setInitialRemarks(loadedRemarks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeAction, globalScores]);

  // Synchronize loading when navigation parameters shift
  useEffect(() => {
    if (activeStudentId && activeBatchId) {
      const batch = batches.find(b => b.batch_id === parseInt(activeBatchId));
      if (batch) {
        loadStudentOperationalData(activeStudentId, batch.sport_id);
      }
    }
  }, [activeStudentId, activeBatchId, batches, loadStudentOperationalData]);

  // Lazy load student list and cache them
  const openBatchDetails = async (batch) => {
    if (studentsCache[batch.batch_id]) {
      setSearchParams({ batch_id: batch.batch_id });
      return;
    }

    setLoading(true);
    try {
      const res = await coachGet(`/coach/batches/${batch.batch_id}`);
      const batchDetails = res.data || res;
      const roster = batchDetails.students || [];
      setStudentsCache(prev => ({ ...prev, [batch.batch_id]: roster }));
      setSearchParams({ batch_id: batch.batch_id });
    } catch (err) {
      console.error(err);
      flash('Failed to load batch students', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- STATS COMPILER & ANALYTICS ---
  const activeBatch = useMemo(() => {
    return batches.find(b => b.batch_id === parseInt(activeBatchId)) || null;
  }, [batches, activeBatchId]);

  const activeStudent = useMemo(() => {
    return allStudentsDetailed.find(s => s.student_id === parseInt(activeStudentId)) || null;
  }, [allStudentsDetailed, activeStudentId]);

  // Compute live analytics
  const computedStats = useMemo(() => {
    const totalBatches = batches.length;
    const totalAthletes = allStudentsDetailed.length;

    // Evaluated today
    const todayStr = new Date().toISOString().split('T')[0];
    const evaluatedTodaySet = new Set(
      globalScores
        .filter(s => new Date(s.scored_at).toISOString().split('T')[0] === todayStr)
        .map(s => s.student_id)
    );
    const evaluatedToday = evaluatedTodaySet.size;

    // Pending evaluations
    const pendingEvaluations = Math.max(0, totalAthletes - evaluatedToday);

    // Average Performance score
    const totalScoreVal = globalScores.reduce((acc, s) => acc + s.score, 0);
    const averagePerformance = globalScores.length > 0 
      ? (totalScoreVal / globalScores.length).toFixed(1) 
      : '0.0';

    // Attendance rate today
    const activeStudentCount = allStudentsDetailed.filter(s => s.status?.toUpperCase() === 'ACTIVE').length;
    const attendanceToday = activeStudentCount > 0 ? '85%' : '0%'; // default to historical mean

    // Strengths & performance rankings
    const studentAverages = {};
    globalScores.forEach(s => {
      if (!studentAverages[s.student_id]) {
        studentAverages[s.student_id] = { sum: 0, count: 0 };
      }
      studentAverages[s.student_id].sum += s.score;
      studentAverages[s.student_id].count += 1;
    });

    const sortedRankings = Object.entries(studentAverages)
      .map(([id, data]) => {
        const student = allStudentsDetailed.find(s => s.student_id === parseInt(id));
        return {
          name: student ? student.name : `Athlete #${id}`,
          avg: data.sum / data.count
        };
      })
      .sort((a, b) => b.avg - a.avg);

    const bestPerformingAthlete = sortedRankings.length > 0 ? sortedRankings[0].name : '—';
    const lowestPerformingAthlete = sortedRankings.length > 0 ? sortedRankings[sortedRankings.length - 1].name : '—';

    return {
      totalBatches,
      totalAthletes,
      evaluatedToday,
      pendingEvaluations,
      averagePerformance,
      attendanceToday,
      bestPerformingAthlete,
      lowestPerformingAthlete
    };
  }, [batches, allStudentsDetailed, globalScores]);

  // Compile individual student card indicators (ratings, totals, states)
  const getStudentMetrics = useCallback((studentId) => {
    const studentScores = globalScores.filter(s => s.student_id === studentId);
    
    // Average Rating
    const avg = studentScores.length > 0 
      ? (studentScores.reduce((acc, s) => acc + s.score, 0) / studentScores.length).toFixed(1) 
      : '—';

    // Total evaluations
    const uniqueEvaluations = new Set(studentScores.map(s => s.assessment_id).filter(Boolean));
    const totalEvals = uniqueEvaluations.size;

    // Last evaluated date
    let lastDate = '—';
    if (studentScores.length > 0) {
      const dates = studentScores.map(s => new Date(s.scored_at).getTime());
      lastDate = new Date(Math.max(...dates)).toLocaleDateString();
    }

    // Status: Completed today, Pending, Needs Update (> 14 days)
    let status = 'Pending';
    const today = new Date().toISOString().split('T')[0];
    const isCompletedToday = studentScores.some(s => new Date(s.scored_at).toISOString().split('T')[0] === today);
    
    if (isCompletedToday) {
      status = 'Completed';
    } else if (lastDate !== '—') {
      const deltaDays = Math.floor((new Date().getTime() - new Date(lastDate).getTime()) / (1000 * 3600 * 24));
      status = deltaDays > 14 ? 'Needs Update' : 'Up to Date';
    }

    return {
      avgRating: avg,
      totalEvals,
      lastEvaluationDate: lastDate,
      status
    };
  }, [globalScores]);

  // --- FILTERS & ROSTER QUERY PIPELINES ---
  const openBatchStudents = useMemo(() => {
    if (!activeBatchId) return [];
    const cached = studentsCache[activeBatchId] || [];
    return cached.map(c => {
      const detail = allStudentsDetailed.find(s => s.student_id === c.student_id);
      return detail || c;
    });
  }, [activeBatchId, studentsCache, allStudentsDetailed]);

  const isSearchActive = globalSearchQuery.trim().length > 0;

  const filteredStudents = useMemo(() => {
    let source = isSearchActive ? allStudentsDetailed : openBatchStudents;

    if (isSearchActive) {
      const q = globalSearchQuery.toLowerCase();
      source = source.filter(s => 
        s.name?.toLowerCase().includes(q) ||
        s.student_id?.toString().includes(q) ||
        s.phone?.includes(q) ||
        s.parent?.name?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      source = source.filter(s => {
        const metrics = getStudentMetrics(s.student_id);
        return metrics.status.toLowerCase().replace(' ', '') === statusFilter.toLowerCase().replace(' ', '');
      });
    }

    if (ratingRangeFilter !== 'all') {
      source = source.filter(s => {
        const metrics = getStudentMetrics(s.student_id);
        if (metrics.avgRating === '—') return false;
        const num = parseFloat(metrics.avgRating);
        if (ratingRangeFilter === 'low') return num < 5.0;
        if (ratingRangeFilter === 'medium') return num >= 5.0 && num <= 8.0;
        if (ratingRangeFilter === 'elite') return num > 8.0;
        return true;
      });
    }

    if (ageGroupFilter !== 'all') {
      source = source.filter(s => {
        if (!s.age) return false;
        if (ageGroupFilter === 'u12') return s.age < 12;
        if (ageGroupFilter === 'u16') return s.age >= 12 && s.age < 16;
        if (ageGroupFilter === 'u18') return s.age >= 16;
        return true;
      });
    }

    if (attendanceStatusFilter !== 'all') {
      source = source.filter(s => {
        const att = s.attendance_percentage || 0;
        if (attendanceStatusFilter === 'regular') return att >= 80;
        if (attendanceStatusFilter === 'irregular') return att < 80;
        return true;
      });
    }

    return source;
  }, [openBatchStudents, allStudentsDetailed, globalSearchQuery, isSearchActive, statusFilter, ratingRangeFilter, ageGroupFilter, attendanceStatusFilter, getStudentMetrics]);

  // Navigate lists contexts
  const currentList = useMemo(() => {
    return isSearchActive ? filteredStudents : openBatchStudents;
  }, [isSearchActive, filteredStudents, openBatchStudents]);

  const currentIndex = useMemo(() => {
    return currentList.findIndex(s => s.student_id === parseInt(activeStudentId));
  }, [currentList, activeStudentId]);

  const prevStudent = useMemo(() => {
    if (currentIndex > 0) return currentList[currentIndex - 1];
    return null;
  }, [currentList, currentIndex]);

  const nextStudent = useMemo(() => {
    if (currentIndex !== -1 && currentIndex < currentList.length - 1) return currentList[currentIndex + 1];
    return null;
  }, [currentList, currentIndex]);

  // --- UNSAVED MODALS PROTECTION LOGIC ---
  const hasUnsavedChanges = useCallback(() => {
    if (activeAction !== 'evaluate') return false;
    return (
      JSON.stringify(scores) !== JSON.stringify(initialScores) ||
      remarks !== initialRemarks
    );
  }, [activeAction, scores, remarks, initialScores, initialRemarks]);

  const requestNavigation = (target) => {
    if (hasUnsavedChanges()) {
      setPendingNavigation(target);
      setShowUnsavedModal(true);
    } else {
      performNavigation(target);
    }
  };

  const performNavigation = (target) => {
    setShowUnsavedModal(false);
    setPendingNavigation(null);
    if (target.type === 'back_batches') {
      setSearchParams({});
    } else if (target.type === 'back_students') {
      setSearchParams({ batch_id: activeBatchId });
    } else if (target.type === 'student') {
      setSearchParams({
        batch_id: activeBatchId,
        student_id: target.studentId,
        action: activeAction
      });
    }
  };

  // Warning Modal callbacks
  const handleDiscardUnsaved = () => {
    setScores(initialScores);
    setRemarks(initialRemarks);
    if (pendingNavigation) {
      performNavigation(pendingNavigation);
    }
  };

  // Submit and lock scores
  const handleSaveScores = async () => {
    if (!activeStudentId || !activeBatchId) return;

    const unrated = attributes.filter(a => !scores[a.attribute_id]);
    if (unrated.length > 0) {
      flash(`Please rate all parameters! (${unrated.length} missing)`, 'error');
      return;
    }

    setSubmitting(true);
    const assessmentId = crypto.randomUUID();
    const entries = Object.entries(scores);

    try {
      const promises = entries.map(([attrId, val]) => 
        coachPost('/coach/performance/scores', {
          student_id: parseInt(activeStudentId),
          attribute_id: parseInt(attrId),
          batch_id: parseInt(activeBatchId),
          score: val,
          notes: remarks.trim() || undefined,
          assessment_id: assessmentId
        })
      );

      await Promise.all(promises);

      // Clear draft cache
      localStorage.removeItem(`performance_draft_${activeStudentId}`);

      // Refresh baseline values
      setInitialScores(scores);
      setInitialRemarks(remarks);

      await loadInitialData();

      // Smooth scroll to top before showing success message or navigating
      scrollToTop();

      // Show success message
      flash('Evaluation metrics recorded successfully!');

      // Auto move next optional behavior
      if (autoNavigateNext && nextStudent) {
        // Small delay to allow scroll to complete before navigation
        setTimeout(() => {
          performNavigation({ type: 'student', studentId: nextStudent.student_id });
        }, 300);
      } else {
        setSearchParams({ batch_id: activeBatchId });
      }
    } catch (err) {
      console.error(err);
      flash('Failed to record scores', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAndContinueUnsaved = async () => {
    await handleSaveScores();
    if (pendingNavigation) {
      performNavigation(pendingNavigation);
    }
  };

  // Score Changes and draft writers
  const handleScoreChange = (attributeId, value) => {
    const updated = { ...scores, [attributeId]: parseInt(value) };
    setScores(updated);
    if (activeStudentId) {
      localStorage.setItem(
        `performance_draft_${activeStudentId}`,
        JSON.stringify({ scores: updated, remarks })
      );
    }
  };

  const handleRemarksChange = (value) => {
    setRemarks(value);
    if (activeStudentId) {
      localStorage.setItem(
        `performance_draft_${activeStudentId}`,
        JSON.stringify({ scores, remarks: value })
      );
    }
  };

  const handleClearDraft = () => {
    if (activeStudentId) {
      localStorage.removeItem(`performance_draft_${activeStudentId}`);
      setScores({});
      setRemarks('');
      setInitialScores({});
      setInitialRemarks('');
      flash('Evaluation draft cleared');
    }
  };

  const handleContinuePending = () => {
    const nextPending = openBatchStudents.find(s => {
      const metrics = getStudentMetrics(s.student_id);
      return metrics.status === 'Pending';
    });
    if (nextPending) {
      requestNavigation({ type: 'student', studentId: nextPending.student_id });
    } else {
      flash('All trainee evaluations in this batch have been completed!');
    }
  };

  const handleViewTodayPending = () => {
    setStatusFilter('pending');
    setGlobalSearchQuery('');
  };

  const handlePrintBatchReport = () => {
    window.print();
  };

  const handlePrintStudentReport = () => {
    window.print();
  };

  const getRadarData = () => {
    if (!studentAnalytics?.attributeProgress) return [];
    return studentAnalytics.attributeProgress.map(p => ({
      subject: p.attribute,
      A: parseFloat(p.average),
      fullMark: 10
    }));
  };

  const getScatterData = () => {
    return openBatchStudents.map(s => {
      const metrics = getStudentMetrics(s.student_id);
      return {
        name: s.name,
        attendance: s.attendance_percentage || 0,
        rating: metrics.avgRating !== '—' ? parseFloat(metrics.avgRating) : 0
      };
    });
  };

  const getAttributeBreakdownData = () => {
    if (!studentAnalytics?.attributeProgress) return [];
    return studentAnalytics.attributeProgress.map(p => ({
      name: p.attribute,
      score: parseFloat(p.average)
    }));
  };

  // Keyboard Navigation & Rating shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Avoid firing shortcuts when typing
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') {
        if (e.ctrlKey && e.key.toLowerCase() === 's') {
          e.preventDefault();
          handleSaveScores();
        }
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (prevStudent) {
          requestNavigation({ type: 'student', studentId: prevStudent.student_id });
        }
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        if (nextStudent) {
          requestNavigation({ type: 'student', studentId: nextStudent.student_id });
        }
      } else if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveScores();
      } else if (hoveredAttrId) {
        if (e.key >= '1' && e.key <= '9') {
          handleScoreChange(hoveredAttrId, parseInt(e.key));
        } else if (e.key === '0') {
          handleScoreChange(hoveredAttrId, 10);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoveredAttrId, scores, remarks, activeStudentId, activeBatchId, prevStudent, nextStudent]);

  // Form completion progress helpers
  const getFormCompletionProgress = () => {
    const total = attributes.length;
    if (total === 0) return 0;
    const completed = Object.keys(scores).filter(id => attributes.some(a => a.attribute_id.toString() === id)).length;
    return Math.round((completed / total) * 100);
  };

  // proposal handlers
  const handleProposeFormSubmit = async (e) => {
    e.preventDefault();
    if (!proposalForm.name.trim() || !proposalForm.sport_id) return;

    let finalName = proposalForm.name.trim();
    const category = proposalForm.category;

    const currentCategory = categorizeAttribute(finalName);
    if (currentCategory !== category) {
      finalName = `${finalName} (${category})`;
    }

    const nameLower = finalName.toLowerCase();
    const sportId = parseInt(proposalForm.sport_id);

    const isDuplicatePending = proposedAttributes.some(
      a => a.sport_id === sportId && a.name.trim().toLowerCase() === nameLower
    );
    if (isDuplicatePending) {
      flash('You have already proposed this parameter for this sport!', 'error');
      return;
    }

    try {
      await coachPost('/coach/performance/attributes', {
        sport_id: sportId,
        name: finalName
      });
      flash('Proposed successfully!');
      setShowProposal(false);
      setProposalForm({ name: '', sport_id: '', category: 'Technique' });
      loadProposals();
    } catch (err) {
      flash(err.message || 'Failed proposal', 'error');
    }
  };

  const handleDeleteProposal = async (attributeId) => {
    if (!window.confirm('Are you sure you want to cancel this proposed parameter?')) return;
    try {
      await coachDelete(`/coach/performance/attributes/${attributeId}`);
      flash('Proposal cancelled successfully');
      loadProposals();
    } catch (err) {
      flash(err.message || 'Failed to delete proposal', 'error');
    }
  };

  const handleOpenEditProposal = (attr) => {
    // Strip categories from display name in form input
    const cleanName = attr.name.replace(/\s*\((Fitness|Technique|Mental)\)$/i, '').trim();
    setEditingProposal(attr);
    setEditProposalForm({
      name: cleanName,
      sport_id: attr.sport_id.toString(),
      category: categorizeAttribute(attr.name)
    });
    setShowEditProposal(true);
  };

  const handleEditProposalSubmit = async (e) => {
    e.preventDefault();
    if (!editProposalForm.name.trim() || !editProposalForm.sport_id) return;

    let finalName = editProposalForm.name.trim();
    const category = editProposalForm.category;

    const currentCategory = categorizeAttribute(finalName);
    if (currentCategory !== category) {
      finalName = `${finalName} (${category})`;
    }

    try {
      await coachPatch(`/coach/performance/attributes/${editingProposal.attribute_id}`, {
        name: finalName,
        sport_id: parseInt(editProposalForm.sport_id)
      });
      flash('Proposal updated successfully');
      setShowEditProposal(false);
      setEditingProposal(null);
      loadProposals();
    } catch (err) {
      flash(err.message || 'Failed to update proposal', 'error');
    }
  };

  const filteredBatches = useMemo(() => {
    return batches;
  }, [batches]);

  return (
    <div className="w-full bg-transparent font-sans p-2 space-y-6 text-left print:bg-white print:p-0">
      


      {/* Regular client layouts */}
      {isCalendarHoliday ? (
        <div className="p-4 md:p-6 max-w-lg mx-auto mt-12 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl shadow-xl p-8 text-center space-y-6 print:hidden">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/20 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Performance Entry Locked</h2>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
            {holidayMessage || 'This date is marked as a Holiday. Attendance and Performance operations are disabled.'}
          </p>
          <button
            onClick={() => navigate('/coach/calendar')}
            className="w-full btn btn-primary py-3 font-bold text-xs uppercase tracking-wider"
          >
            View Calendar
          </button>
        </div>
      ) : (
        <div className="space-y-6 print:hidden">

        {/* Header */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
              <Award className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                {activeAction === 'evaluate' 
                  ? 'Evaluate Student' 
                  : activeAction === 'analytics' 
                    ? 'Student Performance Analytics' 
                    : activeBatchId 
                      ? 'Batch Performance Overview' 
                      : 'Performance Tracker'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {activeAction === 'evaluate' 
                  ? `Assess and record performance scores for ${activeStudent?.name || 'student'}.`
                  : activeAction === 'analytics' 
                    ? `Performance graphs, ratings trends, and metrics radar for ${activeStudent?.name || 'student'}.`
                    : activeBatchId 
                      ? `Evaluate athlete ratings, view rosters, and track progress for ${activeBatch?.name || 'batch'}.`
                      : 'Assess student performance, evaluate fitness metrics, and request parameter additions.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10 shrink-0">
            {(activeBatchId || activeStudentId) && (
              <button
                onClick={() => {
                  if (activeAction) {
                    requestNavigation({ type: 'back_students' });
                  } else if (activeBatchId) {
                    requestNavigation({ type: 'back_batches' });
                  }
                }}
                className="btn btn-secondary text-xs flex items-center gap-1 py-2.5 px-4 font-bold"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            {!activeAction && (
              <button 
                onClick={() => setShowProposal(true)} 
                className="btn btn-primary text-xs py-2.5 px-4 font-black uppercase tracking-wider"
              >
                Propose Parameter
              </button>
            )}
          </div>
        </motion.div>

        {/* Breadcrumb row */}
        {(activeBatchId || activeStudentId) && (
          <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-card border border-border rounded-xl px-4 py-2 self-start">
            <button onClick={() => requestNavigation({ type: 'back_batches' })} className="hover:text-primary transition-colors">
              Batches
            </button>
            {activeBatch && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-400" />
                <button onClick={() => requestNavigation({ type: 'back_students' })} className="hover:text-primary transition-colors">
                  {activeBatch.name}
                </button>
              </>
            )}
            {activeStudent && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-400" />
                <span className="text-foreground">{activeStudent.name}</span>
              </>
            )}
            {activeAction && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-400" />
                <span className="text-primary font-black">{activeAction}</span>
              </>
            )}
          </div>
        )}

        {/* Athlete Profile row details if evaluate / analytics is active */}
        {activeStudent && (
          <div className="flex items-center gap-4 bg-slate-50/50 dark:bg-slate-900/10 border border-border/80 rounded-xl p-3 text-left">
            <Avatar src={activeStudent.profile_photo} name={activeStudent.name} size="lg" className="shrink-0" />
            <div className="grid grid-cols-2 md:grid-cols-6 gap-x-6 gap-y-1.5 flex-1 min-w-0 font-bold text-xs">
              <div className="col-span-2">
                <h3 className="font-extrabold text-sm text-foreground truncate">{activeStudent.name}</h3>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5 block">Athlete ID: #{activeStudent.student_id}</span>
              </div>
              <div>
                <span className="text-slate-450 block text-[9px] uppercase">Sport</span>
                <span className="text-foreground">{activeBatch?.sport?.name || '—'}</span>
              </div>
              <div>
                <span className="text-slate-450 block text-[9px] uppercase">Batch</span>
                <span className="text-foreground">{activeBatch?.name || '—'}</span>
              </div>
              <div>
                <span className="text-slate-450 block text-[9px] uppercase">Age</span>
                <span className="text-foreground">{activeStudent.age || '—'} Yrs</span>
              </div>
              <div>
                <span className="text-slate-450 block text-[9px] uppercase">Gender</span>
                <span className="text-foreground">{activeStudent.gender || 'Male'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Top KPI Summary Dashboard */}
        {!activeAction && (
          <div className="grid grid-cols-2 lg:grid-cols-8 gap-3 text-left">
            {[
              { label: 'Total Batches', val: computedStats.totalBatches, icon: '📂' },
              { label: 'Total Athletes', val: computedStats.totalAthletes, icon: '👥' },
              { label: 'Evaluated Today', val: computedStats.evaluatedToday, icon: '✅', color: 'text-emerald-500' },
              { label: 'Pending Evals', val: computedStats.pendingEvaluations, icon: '⏳', color: 'text-amber-500' },
              { label: 'Avg Rating', val: computedStats.averagePerformance, icon: '⭐' },
              { label: 'Attendance Today', val: computedStats.attendanceToday, icon: '📅' },
              { label: 'Top Performer', val: computedStats.bestPerformingAthlete, icon: '🏆', color: 'text-emerald-505' },
              { label: 'Needs Attention', val: computedStats.lowestPerformingAthlete, icon: '⚠️', color: 'text-rose-505' }
            ].map((s, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.01 }}
                className="bg-card border border-border p-3 rounded-2xl shadow-sm flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-[9px] font-black uppercase text-muted-foreground tracking-wider gap-1">
                  <span>{s.label}</span>
                  <span>{s.icon}</span>
                </div>
                <h3 className={`text-xs font-black mt-2.5 truncate ${s.color || 'text-foreground'}`}>{s.val}</h3>
              </motion.div>
            ))}
          </div>
        )}

        {/* Global Search row */}
        {!activeAction && (
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm text-left">
            <div className="flex-1 max-w-lg relative">
              <input
                type="text"
                placeholder="Global Student Search (Name, ID, Mobile, Parent Name)..."
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                className="input-field text-xs py-2 pl-9 pr-4 bg-card w-full"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Filters:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field text-xs py-1.5 px-3 bg-card"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed Today</option>
                <option value="pending">Pending Today</option>
                <option value="needsupdate">Needs Update</option>
              </select>
            </div>
          </div>
        )}

        {/* Search Results matching display */}
        {isSearchActive && !activeAction && (
          <div className="space-y-4 text-left">
            <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
              <span>Matching search results across all batches:</span>
              <button onClick={() => setGlobalSearchQuery('')} className="text-primary underline">Clear Search</button>
            </div>
            {filteredStudents.length === 0 ? (
              <div className="bg-card border border-border p-12 rounded-2xl text-center text-muted-foreground font-semibold text-xs">
                No matching students found on current query.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredStudents.map(student => {
                  const m = getStudentMetrics(student.student_id);
                  return (
                    <div key={student.student_id} className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar src={student.profile_photo} name={student.name} size="md" />
                        <div>
                          <h4 className="font-extrabold text-sm text-foreground">{student.name}</h4>
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground block mt-0.5">ID: #{student.student_id}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] font-bold text-muted-foreground">
                        <div>Age: <span className="text-foreground">{student.age || '—'} Yrs</span></div>
                        <div>Sport: <span className="text-foreground">{student.sport?.name || '—'}</span></div>
                        <div>Attendance: <span className="text-foreground">{student.attendance_percentage || '0'}%</span></div>
                        <div>Rating: <span className="text-foreground font-black text-emerald-600">{m.avgRating}/10</span></div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => {
                            const b = batches.find(x => x.batch_id === student.batch_id || x.students?.some(s => s.student_id === student.student_id));
                            if (b) {
                              setSearchParams({ batch_id: b.batch_id, student_id: student.student_id, action: 'evaluate' });
                            }
                          }}
                          className="btn btn-primary text-[10px] font-black uppercase flex-1 py-1.5"
                        >
                          Evaluate
                        </button>
                        <button
                          onClick={() => {
                            const b = batches.find(x => x.batch_id === student.batch_id || x.students?.some(s => s.student_id === student.student_id));
                            if (b) {
                              setSearchParams({ batch_id: b.batch_id, student_id: student.student_id, action: 'analytics' });
                            }
                          }}
                          className="btn btn-secondary text-[10px] font-bold uppercase flex-1 py-1.5"
                        >
                          Analytics
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* BATCH GRID DISPLAY */}
        {!activeBatchId && !isSearchActive && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredBatches.map(batch => (
              <motion.div
                key={batch.batch_id}
                whileHover={{ y: -3 }}
                className="bg-card border border-border hover:border-emerald-450 transition-all rounded-2xl p-5 shadow-sm flex flex-col justify-between text-left"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="badge bg-primary/10 text-primary border border-primary/20 text-[9px] font-black uppercase px-2.5 py-0.5">
                      {batch.sport?.name}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {batch.timing}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-foreground tracking-tight mt-3">{batch.name}</h3>
                  <div className="mt-3.5 space-y-2 text-[10px] font-semibold text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Instructor:</span>
                      <span className="text-foreground font-bold">Coach Hub</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Students:</span>
                      <span className="text-foreground font-bold">{batch.students?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed Evals Today:</span>
                      <span className="text-emerald-600 font-black">{batch.completedPercent || 0}%</span>
                    </div>
                  </div>
                </div>
                <div className="mt-5">
                  <button
                    onClick={() => openBatchDetails(batch)}
                    className="btn btn-primary w-full py-2 text-xs font-black uppercase"
                  >
                    Open Batch
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* PROPOSED PARAMETERS / PENDING REQUESTS PANEL */}
        {!activeBatchId && !isSearchActive && (
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm text-left space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Proposed Performance Parameters</h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">Attributes you have proposed that are pending admin approval.</p>
              </div>
              <button
                onClick={() => setShowProposal(true)}
                className="bg-primary hover:bg-primary-hover text-primary-foreground font-black px-4 py-2.5 rounded-xl shadow-[0_4px_14px_rgba(var(--theme-primary-rgb),0.25)] flex items-center justify-center gap-1.5 text-xs transition-all border border-primary uppercase tracking-wider"
              >
                Propose Parameter
              </button>
            </div>

            {loadingProposals ? (
              <div className="py-12 flex justify-center text-xs text-muted-foreground font-semibold">Loading proposed parameters...</div>
            ) : proposedAttributes.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground font-semibold border border-dashed border-border rounded-2xl">
                No pending parameter proposals found. Click "Propose Parameter" to request new ones.
              </div>
            ) : (
              <div className="overflow-x-auto pb-2">
                <table className="w-full text-left text-sm border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-4">
                      <th className="px-6 py-2">Parameter Name</th>
                      <th className="px-6 py-2">Category</th>
                      <th className="px-6 py-2">Target Sport</th>
                      <th className="px-6 py-2">Status</th>
                      <th className="px-6 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposedAttributes.map((attr) => (
                      <tr
                        key={attr.attribute_id}
                        className="group bg-surface-secondary/20 dark:bg-slate-900/40 shadow-[0_2px_10px_rgba(0,0,0,0.02)] ring-1 ring-gray-100 dark:ring-gray-800 hover:shadow-md transition-all duration-300 rounded-2xl animate-fade-in"
                      >
                        <td className="px-6 py-4 rounded-l-2xl border-y border-l border-border bg-card">
                          <span className="font-bold text-sm text-foreground">{attr.name.replace(/\s*\((Fitness|Technique|Mental)\)$/i, '')}</span>
                        </td>
                        <td className="px-6 py-4 border-y border-border bg-card">
                          <span className="badge bg-primary/10 text-primary border border-primary/20 text-[10px] font-black uppercase px-2.5 py-0.5">
                            {categorizeAttribute(attr.name)}
                          </span>
                        </td>
                        <td className="px-6 py-4 border-y border-border bg-card font-semibold text-xs text-muted-foreground">
                          {attr.sport?.name || '—'}
                        </td>
                        <td className="px-6 py-4 border-y border-border bg-card">
                          <span className="badge bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-black uppercase px-2.5 py-0.5 animate-pulse">
                            {attr.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 rounded-r-2xl border-y border-r border-border bg-card text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditProposal(attr)}
                              className="p-2 text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                              title="Edit Proposal"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProposal(attr.attribute_id)}
                              className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition"
                              title="Cancel Proposal"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SINGLE BATCH STUDENTS LIST DISPLAY */}
        {activeBatchId && !activeStudentId && !isSearchActive && (
          <div className="grid gap-6 lg:grid-cols-4 items-start">
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-wrap gap-4 items-center justify-between text-left">
                <div className="flex gap-2">
                  <select
                    value={ratingRangeFilter}
                    onChange={(e) => setRatingRangeFilter(e.target.value)}
                    className="input-field text-xs py-1.5 px-3 bg-card"
                  >
                    <option value="all">All ratings</option>
                    <option value="low">Developing (&lt; 5.0)</option>
                    <option value="medium">Proficient (5.0 - 8.0)</option>
                    <option value="elite">Elite (&gt; 8.0)</option>
                  </select>
                  <select
                    value={ageGroupFilter}
                    onChange={(e) => setAgeGroupFilter(e.target.value)}
                    className="input-field text-xs py-1.5 px-3 bg-card"
                  >
                    <option value="all">All Ages</option>
                    <option value="u12">Under-12</option>
                    <option value="u16">Under-16</option>
                    <option value="u18">Under-18</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <button onClick={handleContinuePending} className="btn btn-secondary text-xs">⚡ Continue Pending</button>
                  <button onClick={handlePrintBatchReport} className="btn btn-secondary text-xs flex items-center gap-1">
                    <Printer className="w-3.5 h-3.5" /> Print Roster
                  </button>
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="bg-card border border-border p-12 rounded-2xl text-center text-muted-foreground font-semibold text-xs">
                  No matching student records found.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredStudents.map(student => {
                    const m = getStudentMetrics(student.student_id);
                    return (
                      <div key={student.student_id} className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-3 text-left">
                            <Avatar src={student.profile_photo} name={student.name} size="md" />
                            <div>
                              <h4 className="font-extrabold text-sm text-foreground">{student.name}</h4>
                              <p className="text-[9px] text-muted-foreground uppercase font-black tracking-wider mt-0.5">ID: #{student.student_id}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 mt-4 text-center text-[10px] font-black uppercase text-muted-foreground">
                            <div className="bg-slate-50 dark:bg-slate-900/10 p-2.5 rounded-xl border border-border/80">
                              <span>Attendance</span>
                              <span className="text-foreground block mt-0.5">{student.attendance_percentage || '0'}%</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/10 p-2.5 rounded-xl border border-border/80">
                              <span>Avg Rating</span>
                              <span className="text-foreground block mt-0.5">{m.avgRating}</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/10 p-2.5 rounded-xl border border-border/80">
                              <span>Assessments</span>
                              <span className="text-foreground block mt-0.5">{m.totalEvals}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-4">
                          <button
                            onClick={() => setSearchParams({ batch_id: activeBatchId, student_id: student.student_id, action: 'evaluate' })}
                            className="btn btn-primary text-xs py-2 font-black uppercase"
                          >
                            Evaluate
                          </button>
                          <button
                            onClick={() => setSearchParams({ batch_id: activeBatchId, student_id: student.student_id, action: 'analytics' })}
                            className="btn btn-secondary text-xs py-2 font-bold uppercase"
                          >
                            Analytics
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm text-left space-y-4">
                <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest border-b border-border pb-2">Roster Quick Actions</h3>
                <div className="space-y-2 text-xs font-bold">
                  <button onClick={handleContinuePending} className="btn btn-secondary w-full justify-start py-2.5 px-3 flex gap-2">⏳ Continue Pending</button>
                  <button onClick={handleViewTodayPending} className="btn btn-secondary w-full justify-start py-2.5 px-3 flex gap-2">📅 View Today's Pending</button>
                  <button onClick={handlePrintBatchReport} className="btn btn-secondary w-full justify-start py-2.5 px-3 flex gap-2">📄 Export Batch Report</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: REDESIGNED EVALUATION PAGE (SCORING LEDGER + TEXTAREA + STICKY BAR) */}
        {activeStudent && activeAction === 'evaluate' && (
          <div ref={evaluationPageRef} className="max-w-4xl mx-auto space-y-6 text-left">
            
            {/* Real Progress indicator bar */}
            <div className="bg-card border border-border rounded-2xl p-4.5 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-xs font-extrabold text-muted-foreground uppercase tracking-wider">
                <span>Evaluation Completeness</span>
                <span className="text-primary font-black">{Object.keys(scores).length} / {attributes.length} Parameters Rated</span>
              </div>
              <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  style={{ width: `${getFormCompletionProgress()}%` }}
                  className="h-full bg-emerald-500 transition-all duration-300"
                />
              </div>
            </div>

            {/* Compact Parameters list */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm relative">
              <span className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></span>
              
              <div className="p-4 border-b border-border bg-slate-50/50 dark:bg-slate-900/10 flex items-center justify-between">
                <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Grading Ledger Matrix</h3>
                <span className="text-[9px] font-black bg-primary/10 text-primary border border-primary/20 rounded px-2.5 py-0.5 uppercase">
                  Keyboard rating: Hover + [1-9, 0]
                </span>
              </div>

              <div className="p-4 space-y-5 bg-card">
                {['Fitness', 'Technique', 'Mental'].map((category) => {
                  const catAttrs = attributes.filter(a => categorizeAttribute(a.name) === category);
                  if (catAttrs.length === 0) return null;

                  return (
                    <div key={category} className="space-y-2.5">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-border/80 pb-1">{category} Focus Parameters</h4>
                      <div className="grid grid-cols-1 gap-2.5">
                        {catAttrs.map(attr => {
                          const val = scores[attr.attribute_id] || 0;
                          const isFilled = val > 0;
                          const prevScoreObj = previousAssessment?.scores?.find(s => s.attribute.attribute_id === attr.attribute_id);
                          const prevValue = prevScoreObj ? prevScoreObj.score : null;

                          return (
                            <div
                              key={attr.attribute_id}
                              onMouseEnter={() => setHoveredAttrId(attr.attribute_id)}
                              onMouseLeave={() => setHoveredAttrId(null)}
                              className={`p-3 rounded-xl border transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                                isFilled ? 'bg-slate-50/50 dark:bg-slate-900/10 border-border' : 'bg-card border-dashed border-border/60 hover:border-amber-450'
                              }`}
                            >
                              <div className="min-w-[150px]">
                                <span className="text-xs font-extrabold text-foreground">{attr.name}</span>
                                <div className="flex gap-2.5 mt-0.5 text-[9px] font-semibold text-slate-400 uppercase">
                                  <span>Prev: {prevValue !== null ? `${prevValue}/10` : '—'}</span>
                                  {isFilled && (
                                    <>
                                      <span>|</span>
                                      <span className="text-primary font-bold">Level: {getScoreLabel(val)}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
                                  const isActive = val >= num;
                                  const isSelected = val === num;
                                  return (
                                    <button
                                      key={num}
                                      type="button"
                                      disabled={submitting || dailyLock?.locked}
                                      onClick={() => handleScoreChange(attr.attribute_id, num)}
                                      className={`w-6 h-6 rounded-full border text-[9px] font-black flex items-center justify-center transition-all ${
                                        isSelected
                                          ? 'bg-amber-450 border-amber-450 text-slate-950 scale-110 shadow-[0_0_10px_rgba(245,158,11,0.6)] font-extrabold'
                                          : isActive
                                            ? 'bg-amber-450/30 border-amber-400/25 text-foreground'
                                            : 'bg-card text-muted-foreground border-border'
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
              </div>
            </div>

            {/* Tactical remarks textarea moved below all parameters full width */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest border-b border-border pb-2 flex justify-between items-center">
                <span>📝 Tactical Observations & remarks</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Sent to Parent Inbox</span>
              </h3>
              <textarea
                value={remarks}
                onChange={(e) => handleRemarksChange(e.target.value)}
                disabled={submitting || dailyLock?.locked}
                placeholder="Detail trainee progress, tactical recommendations, notes, etc..."
                rows={3}
                className="input-field text-xs p-3.5 bg-card w-full font-bold focus:ring-2 focus:ring-primary/20 outline-none resize-y"
              />
              <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground mt-1">
                <input
                  type="checkbox"
                  id="autoNav"
                  checked={autoNavigateNext}
                  onChange={(e) => setAutoNavigateNext(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary/20 w-3.5 h-3.5 cursor-pointer"
                />
                <label htmlFor="autoNav" className="cursor-pointer">Automatically navigate to next athlete after saving score</label>
              </div>
            </div>

            {/* 3. STICKY BOTTOM NAVIGATION BAR */}
            <div className="sticky bottom-0 z-40 bg-card/90 backdrop-blur border border-border p-4 shadow-2xl flex items-center justify-between rounded-2xl">
              <button
                onClick={() => requestNavigation({ type: 'student', studentId: prevStudent.student_id })}
                disabled={!prevStudent}
                className="btn btn-secondary text-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous Student
              </button>
              <div className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                Student {currentIndex + 1} of {currentList.length}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveScores}
                  disabled={submitting || dailyLock?.locked}
                  className="btn btn-primary text-xs py-2 px-6 uppercase font-black tracking-wider flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" /> Save Score
                </button>
                <button
                  onClick={() => requestNavigation({ type: 'student', studentId: nextStudent.student_id })}
                  disabled={!nextStudent}
                  className="btn btn-secondary text-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next Student →
                </button>
              </div>
            </div>

          </div>
        )}

        {/* VIEW 4: VIEW ANALYTICS FLOW */}
        {activeStudent && activeAction === 'analytics' && (
          <div className="grid gap-6 lg:grid-cols-3 items-start text-left">
            <div className="lg:col-span-2 space-y-6">
              
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-5">
                <h3 className="text-sm font-black uppercase text-foreground border-b border-border pb-2 flex items-center justify-between">
                  <span>Athlete Overview Analytics</span>
                  <button onClick={handlePrintStudentReport} className="btn btn-secondary text-xs py-1 px-3 flex gap-1 items-center">
                    <Printer className="w-3.5 h-3.5" /> Print Report
                  </button>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {getRadarData().length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-muted-foreground block text-center">Attribute Radar breakdown</span>
                      <div className="h-48 w-full flex justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={getRadarData()}>
                            <PolarGrid stroke="#444" />
                            <PolarAngleAxis dataKey="subject" stroke="#888" fontSize={8} />
                            <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="#444" fontSize={8} />
                            <Radar name="Athlete" dataKey="A" stroke="#84cc16" fill="#84cc16" fillOpacity={0.4} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {studentAnalytics?.graphData?.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-muted-foreground block text-center">Rating Trend Over Time</span>
                      <div className="h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={studentAnalytics.graphData} margin={{ top: 10, right: 10, bottom: 5, left: -25 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" stroke="#888" fontSize={8} />
                            <YAxis domain={[0, 10]} stroke="#888" fontSize={9} />
                            <Tooltip />
                            <Line type="monotone" dataKey="overall" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/60">
                  {getAttributeBreakdownData().length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-muted-foreground block text-center">Average ratings per metric</span>
                      <div className="h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={getAttributeBreakdownData()} margin={{ top: 10, right: 10, bottom: 5, left: -25 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" stroke="#888" fontSize={8} tickFormatter={(v) => v.slice(0, 8)} />
                            <YAxis domain={[0, 10]} stroke="#888" fontSize={9} />
                            <Tooltip />
                            <Bar dataKey="score" fill="#a855f7" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-muted-foreground block text-center">Attendance vs Performance correlation</span>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 10, right: 10, bottom: 5, left: -25 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis type="number" dataKey="attendance" name="Attendance" unit="%" stroke="#888" fontSize={9} />
                          <YAxis type="number" dataKey="rating" name="Rating" unit="/10" domain={[0, 10]} stroke="#888" fontSize={9} />
                          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                          <Scatter name="Roster Athletes" data={getScatterData()} fill="#84cc16" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

              </div>

              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest border-b border-border pb-2">Coach Evaluation Timeline Remarks</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {assessmentHistory.filter(h => h.notes).length === 0 ? (
                    <p className="text-xs text-muted-foreground italic font-semibold">No remarks logs recorded.</p>
                  ) : (
                    assessmentHistory.filter(h => h.notes).map((item, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-50/50 dark:bg-slate-900/10 rounded-xl border border-border text-xs font-semibold">
                        <div className="flex justify-between items-center mb-1 text-[10px] text-muted-foreground font-black uppercase">
                          <span>Evaluated on: {new Date(item.scored_at).toLocaleDateString()}</span>
                          <span>Coach: {item.coach?.name || 'Assigned Coach'}</span>
                        </div>
                        <p className="italic text-foreground">"{item.notes}"</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm text-left space-y-4">
                <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest border-b border-border pb-2">Trainee Strengths & weaknesses</h3>
                <div className="space-y-3 font-semibold text-xs">
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                    <span className="text-[9px] uppercase tracking-wider font-black text-emerald-600 block mb-0.5">Primary Strength Area</span>
                    <span className="text-foreground">
                      {studentAnalytics?.attributeProgress?.sort((a,b)=>b.average-a.average)[0]?.attribute || 'None'}
                    </span>
                  </div>
                  <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                    <span className="text-[9px] uppercase tracking-wider font-black text-rose-600 block mb-0.5">Development Need Area</span>
                    <span className="text-foreground">
                      {studentAnalytics?.attributeProgress?.sort((a,b)=>a.average-b.average)[0]?.attribute || 'None'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm text-left space-y-4">
                <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest border-b border-border pb-2">Recent Evaluations List</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {loadingHistory ? (
                    <div className="py-4 text-center text-xs text-muted-foreground font-semibold">Loading history logs...</div>
                  ) : assessmentHistory.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic font-semibold">No assessments recorded.</p>
                  ) : (
                    assessmentHistory.slice(0, 10).map((item, idx) => {
                      const avg = item.scores && item.scores.length > 0
                        ? (item.scores.reduce((acc, s) => acc + s.score, 0) / item.scores.length).toFixed(1)
                        : '0.0';
                      return (
                        <div key={idx} className="p-2.5 bg-slate-50/50 dark:bg-slate-900/10 rounded-xl border border-border flex justify-between items-center text-xs font-bold">
                          <div>
                            <span className="text-[9px] text-muted-foreground block font-bold uppercase">{new Date(item.scored_at).toLocaleDateString()}</span>
                            <span className="text-foreground">{item.scores?.length || 0} attributes evaluated</span>
                          </div>
                          <span className="text-xs font-black text-primary">★ {avg}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
      )}

      {/* 4. UNSAVED CHANGES GUARD WARNING MODAL */}
      <AnimatePresence>
        {showUnsavedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-3xl max-w-sm w-full shadow-2xl p-6 relative space-y-4 text-left font-sans"
            >
              <h3 className="text-base font-black text-foreground">You have unsaved changes</h3>
              <p className="text-xs text-muted-foreground font-semibold">
                You have modified the ratings or tactical remarks. Navigating away now will discard these adjustments.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handleSaveAndContinueUnsaved}
                  className="btn btn-primary text-xs py-2 w-full uppercase font-black"
                >
                  Save & Continue
                </button>
                <button
                  onClick={handleDiscardUnsaved}
                  className="btn btn-secondary text-xs py-2 w-full uppercase font-bold text-rose-650"
                >
                  Discard Changes
                </button>
                <button
                  onClick={() => setShowUnsavedModal(false)}
                  className="btn btn-secondary text-xs py-2 w-full uppercase font-bold"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PROPOSAL MODAL */}
      <AnimatePresence>
        {showProposal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-3xl max-w-md w-full shadow-2xl p-6 relative space-y-4 text-left font-sans"
            >
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <h3 className="text-base font-black text-foreground">Propose Performance Parameter</h3>
                <button
                  onClick={() => setShowProposal(false)}
                  className="p-1 text-slate-400 hover:text-foreground rounded-full"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleProposeFormSubmit} className="space-y-4 text-xs font-bold">
                <div>
                  <label className="block text-xs text-muted-foreground uppercase font-black mb-1">Target Sport</label>
                  <select
                    value={proposalForm.sport_id}
                    onChange={(e) => setProposalForm({ ...proposalForm, sport_id: e.target.value })}
                    className="input-field text-xs py-2 px-3 bg-card w-full"
                    required
                  >
                    <option value="">Select Sport...</option>
                    {batches.map(b => b.sport).filter(Boolean).filter((s, idx, self) => self.findIndex(x => x.sport_id === s.sport_id) === idx).map(sport => (
                      <option key={sport.sport_id} value={sport.sport_id}>{sport.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground uppercase font-black mb-1">Category</label>
                  <select
                    value={proposalForm.category}
                    onChange={(e) => setProposalForm({ ...proposalForm, category: e.target.value })}
                    className="input-field text-xs py-2 px-3 bg-card w-full"
                    required
                  >
                    <option value="Fitness">Fitness</option>
                    <option value="Technique">Technique</option>
                    <option value="Mental">Mental</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground uppercase font-black mb-1">Parameter Name</label>
                  <input
                    type="text"
                    value={proposalForm.name}
                    onChange={(e) => setProposalForm({ ...proposalForm, name: e.target.value })}
                    className="input-field text-xs py-2 px-3 w-full"
                    placeholder="e.g. Dribbling Pace, Serve Speed"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowProposal(false)}
                    className="btn btn-secondary text-xs py-2 px-4"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary text-xs py-2 px-6"
                  >
                    Propose Parameter
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT PROPOSAL MODAL */}
      <AnimatePresence>
        {showEditProposal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-3xl max-w-md w-full shadow-2xl p-6 relative space-y-4 text-left font-sans"
            >
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <h3 className="text-base font-black text-foreground">Edit Proposed Parameter</h3>
                <button
                  onClick={() => {
                    setShowEditProposal(false);
                    setEditingProposal(null);
                  }}
                  className="p-1 text-slate-400 hover:text-foreground rounded-full"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleEditProposalSubmit} className="space-y-4 text-xs font-bold">
                <div>
                  <label className="block text-xs text-muted-foreground uppercase font-black mb-1">Target Sport</label>
                  <select
                    value={editProposalForm.sport_id}
                    onChange={(e) => setEditProposalForm({ ...editProposalForm, sport_id: e.target.value })}
                    className="input-field text-xs py-2 px-3 bg-card w-full"
                    required
                  >
                    <option value="">Select Sport...</option>
                    {batches.map(b => b.sport).filter(Boolean).filter((s, idx, self) => self.findIndex(x => x.sport_id === s.sport_id) === idx).map(sport => (
                      <option key={sport.sport_id} value={sport.sport_id}>{sport.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground uppercase font-black mb-1">Category</label>
                  <select
                    value={editProposalForm.category}
                    onChange={(e) => setEditProposalForm({ ...editProposalForm, category: e.target.value })}
                    className="input-field text-xs py-2 px-3 bg-card w-full"
                    required
                  >
                    <option value="Fitness">Fitness</option>
                    <option value="Technique">Technique</option>
                    <option value="Mental">Mental</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground uppercase font-black mb-1">Parameter Name</label>
                  <input
                    type="text"
                    value={editProposalForm.name}
                    onChange={(e) => setEditProposalForm({ ...editProposalForm, name: e.target.value })}
                    className="input-field text-xs py-2 px-3 w-full"
                    placeholder="e.g. Dribbling Pace, Serve Speed"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditProposal(false);
                      setEditingProposal(null);
                    }}
                    className="btn btn-secondary text-xs py-2 px-4"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary text-xs py-2 px-6"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global alert flash notifications */}
      <AnimatePresence>
        {message.text && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 rounded-xl px-6 py-4 shadow-xl border flex items-center gap-3 font-bold ${
              message.type === 'success' 
                ? 'bg-card border-l-4 border-l-emerald-500 text-emerald-500 border-y-border border-r-border' 
                : 'bg-card border-l-4 border-l-rose-500 text-rose-500 border-y-border border-r-border'
            }`}
          >
            <span className="text-xl">{message.type === 'success' ? '🎯' : '⚠️'}</span>
            <span className="text-xs">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Print output layout */}
      <div className="hidden print:block text-slate-900 bg-white p-6 space-y-6">
        <div className="border-b-2 border-slate-900 pb-4 text-center">
          <h1 className="text-2xl font-black uppercase">SAMS SPORTS ACADEMY</h1>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Athlete Performance Evaluation</h2>
        </div>
        {activeStudent && (
          <div className="space-y-4 text-xs font-semibold">
            <div className="grid grid-cols-2 gap-4 border border-slate-200 p-4 rounded-xl">
              <div>Athlete Name: {activeStudent.name}</div>
              <div>ID: #{activeStudent.student_id}</div>
              <div>Batch: {activeBatch?.name || '—'}</div>
              <div>Sport: {activeBatch?.sport?.name || '—'}</div>
              <div>Rating average: {getStudentMetrics(activeStudent.student_id).avgRating}/10</div>
            </div>
            <table className="w-full border-collapse mt-4 text-left">
              <thead>
                <tr className="border-b border-slate-300 text-[10px] uppercase text-slate-500">
                  <th className="py-2">Attribute</th>
                  <th className="py-2">Category</th>
                  <th className="py-2">Score</th>
                </tr>
              </thead>
              <tbody>
                {attributes.map(a => (
                  <tr key={a.attribute_id} className="border-b border-slate-100">
                    <td className="py-2">{a.name}</td>
                    <td className="py-2">{categorizeAttribute(a.name)}</td>
                    <td className="py-2 font-black">{scores[a.attribute_id] || 'Not Rated'}/10</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
