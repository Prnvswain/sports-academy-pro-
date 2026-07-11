import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Search, Check, ChevronDown } from 'lucide-react';
import Loader from '../../components/Loader';
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
  
  // Performance metrics filters
  const [performanceViewMode, setPerformanceViewMode] = useState('average'); // 'average' or 'assessment'
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(null);
  const [selectedAgeCategory, setSelectedAgeCategory] = useState('all');
  const [availableAssessments, setAvailableAssessments] = useState([]);
  const [availableAgeCategories, setAvailableAgeCategories] = useState([]);
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const [loadingAgeCategories, setLoadingAgeCategories] = useState(false);
  const [assessmentSearchQuery, setAssessmentSearchQuery] = useState('');
  const [ageCategorySearchQuery, setAgeCategorySearchQuery] = useState('');
  const [showAssessmentDropdown, setShowAssessmentDropdown] = useState(false);
  const [showAgeCategoryDropdown, setShowAgeCategoryDropdown] = useState(false);
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
  const [selectedStudentForDashboard, setSelectedStudentForDashboard] = useState(null);
  const [studentDashboardData, setStudentDashboardData] = useState(null);
  const [loadingStudentDashboard, setLoadingStudentDashboard] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [compareAssessments, setCompareAssessments] = useState({ assessment1: null, assessment2: null });
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [dashboardTab, setDashboardTab] = useState('overview');

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
      
      // Load students from batch endpoint (basic info only, no performance metrics)
      const result = await adminGet(`/admin/batches/${batchId}/students`);
      const studentsData = result.data?.students || result.data || [];
      
      setStudents(studentsData);
    } catch (error) {
      console.error('Error loading students:', error);
      setMessage({ text: error.message, type: 'error' });
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  const loadAssessments = useCallback(async (batchId) => {
    if (!batchId) {
      setAvailableAssessments([]);
      return;
    }
    try {
      setLoadingAssessments(true);
      const result = await adminGet(`/admin/performance/assessments/history?batch_id=${batchId}&limit=100`);
      const assessments = result.data?.assessments || [];
      
      // Group assessments by assessment_id and calculate metadata
      const groupedAssessments = {};
      assessments.forEach(score => {
        if (!groupedAssessments[score.assessment_id]) {
          groupedAssessments[score.assessment_id] = {
            assessment_id: score.assessment_id,
            scored_at: score.scored_at,
            coach: score.coach,
            student_ids: new Set(),
            attribute_ids: new Set(),
          };
        }
        groupedAssessments[score.assessment_id].student_ids.add(score.student_id);
        groupedAssessments[score.assessment_id].attribute_ids.add(score.attribute_id);
      });

      // Convert to array and sort by date (latest first)
      const assessmentList = Object.values(groupedAssessments).map(assessment => ({
        ...assessment,
        student_ids: Array.from(assessment.student_ids),
        attribute_ids: Array.from(assessment.attribute_ids),
        total_students: assessment.student_ids.size,
        total_attributes: assessment.attribute_ids.size,
      })).sort((a, b) => new Date(b.scored_at) - new Date(a.scored_at));

      setAvailableAssessments(assessmentList);
    } catch (error) {
      console.error('Error loading assessments:', error);
      setAvailableAssessments([]);
    } finally {
      setLoadingAssessments(false);
    }
  }, []);

  const loadAgeCategories = useCallback(async (batchId) => {
    if (!batchId) {
      setAvailableAgeCategories([]);
      return;
    }
    try {
      setLoadingAgeCategories(true);
      // Get students in the batch to determine age categories
      const result = await adminGet(`/admin/students?batch_id=${batchId}`);
      const responseData = result.data;
      let studentsArray = [];
      if (Array.isArray(responseData)) {
        studentsArray = responseData;
      } else if (responseData && Array.isArray(responseData.data)) {
        studentsArray = responseData.data;
      } else if (responseData && Array.isArray(responseData.students)) {
        studentsArray = responseData.students;
      }

      // Extract unique age categories from students
      const ageCategories = new Set();
      studentsArray.forEach(student => {
        if (student.category) {
          ageCategories.add(student.category);
        }
      });

      // Sort age categories naturally
      const sortedCategories = Array.from(ageCategories).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        return numA - numB;
      });

      setAvailableAgeCategories(sortedCategories);
    } catch (error) {
      console.error('Error loading age categories:', error);
      setAvailableAgeCategories([]);
    } finally {
      setLoadingAgeCategories(false);
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
      setStudentHistory([
        { date: '2026-06-25', coach: 'Coach Ravindra', metrics: { Stamina: 8, Skill: 7 }, remarks: 'Great improvement in footwork this week.' },
        { date: '2026-06-18', coach: 'Coach Ravindra', metrics: { Stamina: 7, Skill: 6 }, remarks: 'Focusing on physical conditioning.' }
      ]);
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

  const loadAssessmentHistory = async () => {
    try {
      setLoadingTimeline(true);
      const queryParams = new URLSearchParams();
      
      Object.entries(timelineFilters).forEach(([key, value]) => {
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

  const handleTimelineFilterChange = (key, value) => {
    setTimelineFilters(prev => ({
      ...prev,
      [key]: value
    }));
    loadAssessmentHistory();
  };

  const handleExpandAssessment = (assessmentId) => {
    setExpandedAssessment(expandedAssessment === assessmentId ? null : assessmentId);
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
      
      setStudentDashboardData({
        history: historyResult.data?.assessments || [],
        analytics: analyticsResult.data || analyticsResult
      });
      
      // Select all attributes by default
      const allAttributes = new Set();
      historyResult.data?.assessments?.forEach(assessment => {
        assessment.scores?.forEach(score => {
          allAttributes.add(score.attribute.name);
        });
      });
      setSelectedAttributes(Array.from(allAttributes));
    } catch (error) {
      console.error('Error loading student dashboard:', error);
      setMessage({ text: 'Failed to load student dashboard', type: 'error' });
    } finally {
      setLoadingStudentDashboard(false);
    }
  };

  const getFilteredHistory = () => {
    if (!studentDashboardData?.history) return [];
    
    let filtered = [...studentDashboardData.history];
    
    // Apply date range filter
    if (dateRangeFilter !== 'all') {
      const now = new Date();
      const days = parseInt(dateRangeFilter);
      const cutoffDate = new Date(now.setDate(now.getDate() - days));
      
      filtered = filtered.filter(assessment => {
        const assessmentDate = new Date(assessment.scored_at);
        return assessmentDate >= cutoffDate;
      });
    }
    
    return filtered;
  };

  const handleOpenStudentDashboard = (student) => {
    setSelectedStudentForDashboard(student);
    setShowStudentDashboard(true);
    loadStudentDashboard(student.student_id || student.id);
  };

  const handleCloseStudentDashboard = () => {
    setShowStudentDashboard(false);
    setSelectedStudentForDashboard(null);
    setStudentDashboardData(null);
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
    if (!currentAssessment || !previousAssessment) return {};
    
    const indicators = {};
    const currentScores = {};
    const previousScores = {};
    
    currentAssessment.scores?.forEach(score => {
      currentScores[score.attribute.name] = score.score;
    });
    
    previousAssessment.scores?.forEach(score => {
      previousScores[score.attribute.name] = score.score;
    });
    
    Object.keys(currentScores).forEach(attrName => {
      const current = currentScores[attrName];
      const previous = previousScores[attrName];
      const diff = current - previous;
      
      indicators[attrName] = {
        current,
        previous,
        diff,
        trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same'
      };
    });
    
    return indicators;
  };

  const prepareGraphData = () => {
    const filteredHistory = getFilteredHistory();
    if (!filteredHistory || selectedAttributes.length === 0) return [];
    
    const assessments = filteredHistory
      .filter(a => a.scores && a.scores.length > 0)
      .sort((a, b) => new Date(a.scored_at) - new Date(b.scored_at));
    
    return assessments.map(assessment => {
      const dataPoint = {
        date: new Date(assessment.scored_at).toLocaleDateString(),
        assessment_id: assessment.assessment_id
      };
      
      // Add overall average
      const avg = calculateAverageRating(assessment.scores);
      dataPoint['Overall'] = parseFloat(avg);
      
      // Add selected attributes
      assessment.scores.forEach(score => {
        if (selectedAttributes.includes(score.attribute.name)) {
          dataPoint[score.attribute.name] = score.score;
        }
      });
      
      return dataPoint;
    });
  };

  const handleAttributeToggle = (attributeName) => {
    setSelectedAttributes(prev => 
      prev.includes(attributeName) 
        ? prev.filter(a => a !== attributeName)
        : [...prev, attributeName]
    );
  };

  const handleDashboardAssessmentSelect = (assessment) => {
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
      loadAssessments(selectedBatchId);
      loadAgeCategories(selectedBatchId);
      setSelectedStudent(null);
      // Reset filters when batch changes
      setPerformanceViewMode('average');
      setSelectedAssessmentId(null);
      setSelectedAgeCategory('all');
    } else {
      setAvailableAssessments([]);
      setAvailableAgeCategories([]);
    }
  }, [selectedBatchId, loadStudents, loadAssessments, loadAgeCategories]);

  // Reload students when filters change
  useEffect(() => {
    if (selectedBatchId) {
      loadStudents(selectedBatchId);
    }
  }, [performanceViewMode, selectedAssessmentId, selectedAgeCategory, selectedBatchId, loadStudents]);

  const handleAssessmentSelect = (assessmentId) => {
    console.log('=== handleAssessmentSelect DEBUG ===');
    console.log('Assessment ID clicked:', assessmentId);
    console.log('Current performanceViewMode before:', performanceViewMode);
    console.log('Current selectedAssessmentId before:', selectedAssessmentId);
    
    if (assessmentId === 'average') {
      console.log('Setting to AVERAGE mode');
      setPerformanceViewMode('average');
      setSelectedAssessmentId(null);
    } else {
      console.log('Setting to ASSESSMENT mode with ID:', assessmentId);
      setPerformanceViewMode('assessment');
      setSelectedAssessmentId(assessmentId);
    }
    
    setShowAssessmentDropdown(false);
    setAssessmentSearchQuery('');
    
    console.log('New performanceViewMode after:', assessmentId === 'average' ? 'average' : 'assessment');
    console.log('New selectedAssessmentId after:', assessmentId === 'average' ? null : assessmentId);
    
    // Trigger reload with new mode
    if (selectedBatchId) {
      console.log('Triggering loadStudents for batch:', selectedBatchId);
      loadStudents(selectedBatchId);
    }
    console.log('=== END handleAssessmentSelect DEBUG ===');
  };

  const handleAgeCategorySelect = (category) => {
    setSelectedAgeCategory(category);
    setShowAgeCategoryDropdown(false);
    setAgeCategorySearchQuery('');
  };

  const getSelectedAssessmentDisplay = () => {
    if (performanceViewMode === 'average') {
      return { title: 'Average Performance', subtitle: 'All assessments combined' };
    }
    const assessment = availableAssessments.find(a => a.assessment_id === selectedAssessmentId);
    if (assessment) {
      const date = new Date(assessment.scored_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      return { 
        title: 'Assessment', 
        subtitle: date,
        coach: assessment.coach?.name,
        students: assessment.total_students,
        attributes: assessment.total_attributes
      };
    }
    return { title: 'Average Performance', subtitle: 'All assessments combined' };
  };

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
    setSelectedStudent(student);
    loadStudentHistory(student.student_id || student.id);
  };

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
      className="bg-surface text-foreground min-h-screen w-full relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="space-y-6 p-6">
        {/* Modern Gradient Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl p-6 sm:p-8 shadow-xl"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMMDQgMEgwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-white text-3xl sm:text-4xl font-black tracking-tight drop-shadow-lg">
                  Performance Tracker
                </h2>
                <p className="text-white/90 mt-2 text-sm sm:text-base font-medium">
                  Monitor athlete progress, track metrics, and analyze performance data
                </p>
              </div>
              <div className="flex gap-2 sm:gap-3">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowAnalyticsPanel(!showAnalyticsPanel);
                    if (!showAnalyticsPanel) {
                      loadAcademyAnalytics();
                    }
                  }}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border-2 border-white/30 text-white rounded-xl px-4 sm:px-6 py-2.5 text-sm font-bold transition-all duration-200 flex items-center gap-2 shadow-lg"
                >
                  <span className="text-lg">📊</span> Analytics
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowTimelinePanel(!showTimelinePanel);
                    if (!showTimelinePanel) {
                      loadAssessmentHistory();
                    }
                  }}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border-2 border-white/30 text-white rounded-xl px-4 sm:px-6 py-2.5 text-sm font-bold transition-all duration-200 flex items-center gap-2 shadow-lg"
                >
                  <span className="text-lg">📅</span> History
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {message.text && (
          <div className={`border-current/10 rounded-xl border p-4 text-sm font-semibold ${
            message.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-red-500/10 text-red-600 border-red-500/30'
          }`}>
            {message.text}
          </div>
        )}

      {/* Analytics Panel */}
      <AnimatePresence>
        {showAnalyticsPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-surface-secondary/30 border border-border rounded-xl p-6"
          >
            {/* Analytics Tabs */}
            <div className="flex gap-2 mb-6 border-b border-border pb-4 overflow-x-auto">
              <button
                type="button"
                onClick={() => handleAnalyticsTabChange('academy')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${analyticsTab === 'academy'
                    ? 'bg-accent text-foreground'
                    : 'bg-surface text-muted hover:text-foreground'
                  }`}
              >
                Academy Overview
              </button>
              <button
                type="button"
                onClick={() => handleAnalyticsTabChange('batch')}
                disabled={!selectedBatchId}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${analyticsTab === 'batch'
                    ? 'bg-accent text-foreground'
                    : 'bg-surface text-muted hover:text-foreground disabled:opacity-50'
                  }`}
              >
                Batch Analytics
              </button>
              <button
                type="button"
                onClick={() => handleAnalyticsTabChange('student')}
                disabled={!selectedStudent}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${analyticsTab === 'student'
                    ? 'bg-accent text-foreground'
                    : 'bg-surface text-muted hover:text-foreground disabled:opacity-50'
                  }`}
              >
                Student Analytics
              </button>
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
                    {batchAnalytics?.attributeBreakdown && (
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
                          {Object.entries(batchAnalytics.attributeBreakdown).map(([attr, score], idx) => (
                            <motion.div
                              key={attr}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.4 + idx * 0.1 }}
                            >
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-foreground">{attr}</span>
                                <span className="text-sm font-black text-blue-600 bg-blue-500/20 px-3 py-1 rounded-full">
                                  {score?.toFixed(1) || 0}
                                </span>
                              </div>
                              <div className="w-full bg-surface-secondary rounded-full h-3 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min((score / 10) * 100, 100)}%` }}
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
                    {studentAnalytics?.attributeProgress && (
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
                          {Object.entries(studentAnalytics.attributeProgress).map(([attr, progress], idx) => (
                            <motion.div
                              key={attr}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.4 + idx * 0.1 }}
                              whileHover={{ scale: 1.01 }}
                              className="p-4 bg-white/50 dark:bg-surface/50 rounded-xl hover:bg-white/80 dark:hover:bg-surface/80 transition-all"
                            >
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-foreground">{attr}</span>
                                <span className="text-sm font-black text-emerald-600 bg-emerald-500/20 px-3 py-1 rounded-full">
                                  {progress.current?.toFixed(1)} / 10
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>Previous: <span className="font-bold text-foreground">{progress.previous?.toFixed(1) || 'N/A'}</span></span>
                                <span>•</span>
                                <span className={`font-bold ${progress.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {progress.change >= 0 ? '+' : ''}{progress.change?.toFixed(1) || 0}
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
            className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 rounded-2xl p-6"
          >
            {/* Timeline Filters */}
            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-foreground flex items-center gap-2">
                  <span className="text-lg">🔍</span> Filter Assessments
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
                <motion.div
                  whileFocus={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Student ID</label>
                  <input
                    type="text"
                    value={timelineFilters.student_id}
                    onChange={(e) => handleTimelineFilterChange('student_id', e.target.value)}
                    placeholder="Enter student ID"
                    className="w-full text-sm p-2.5 rounded-xl bg-surface border border-border focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  />
                </motion.div>
                <motion.div
                  whileFocus={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Batch ID</label>
                  <input
                    type="text"
                    value={timelineFilters.batch_id}
                    onChange={(e) => handleTimelineFilterChange('batch_id', e.target.value)}
                    placeholder="Enter batch ID"
                    className="w-full text-sm p-2.5 rounded-xl bg-surface border border-border focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  />
                </motion.div>
                <motion.div
                  whileFocus={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Coach ID</label>
                  <input
                    type="text"
                    value={timelineFilters.coach_id}
                    onChange={(e) => handleTimelineFilterChange('coach_id', e.target.value)}
                    placeholder="Enter coach ID"
                    className="w-full text-sm p-2.5 rounded-xl bg-surface border border-border focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  />
                </motion.div>
                <motion.div
                  whileFocus={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={timelineFilters.start_date}
                    onChange={(e) => handleTimelineFilterChange('start_date', e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl bg-surface border border-border focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  />
                </motion.div>
                <motion.div
                  whileFocus={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
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
                      onClick={() => handleExpandAssessment(assessment.assessment_id)}
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
                                    {score.attribute?.name || 'Unknown'}
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

      {/* Student Dashboard Modal */}
      <AnimatePresence>
        {showStudentDashboard && selectedStudentForDashboard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm"
            onClick={handleCloseStudentDashboard}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface border border-border rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">Student Performance Dashboard</h2>
                  <p className="text-sm text-muted-foreground mt-1">{selectedStudentForDashboard.name}</p>
                </div>
                <button
                  onClick={handleCloseStudentDashboard}
                  className="p-2 rounded-lg hover:bg-surface-secondary transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {loadingStudentDashboard ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Student Header */}
                    <div className="bg-gradient-to-r from-emerald-500/10 to-accent/10 border border-border rounded-2xl p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500/20 flex items-center justify-center text-2xl sm:text-3xl font-black text-emerald-600 border-2 border-emerald-500/30 shrink-0">
                          {selectedStudentForDashboard.name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 w-full">
                          <h3 className="text-xl sm:text-2xl font-black text-foreground">{selectedStudentForDashboard.name}</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-4">
                            <div>
                              <div className="text-xs text-muted-foreground">Sport</div>
                              <div className="text-sm font-bold text-foreground">{selectedStudentForDashboard.sport?.name || 'N/A'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Batch</div>
                              <div className="text-sm font-bold text-foreground">{selectedStudentForDashboard.batch?.name || 'N/A'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Coach</div>
                              <div className="text-sm font-bold text-foreground">{selectedStudentForDashboard.coach?.name || 'N/A'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Last Assessment</div>
                              <div className="text-sm font-bold text-foreground">
                                {studentDashboardData?.history?.[0]?.scored_at 
                                  ? new Date(studentDashboardData.history[0].scored_at).toLocaleDateString() 
                                  : 'N/A'}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-center shrink-0">
                          <div className="text-3xl sm:text-4xl font-black text-emerald-600">
                            {studentDashboardData?.analytics?.overallAverage?.toFixed(1) || '0.0'}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">Overall Rating</div>
                        </div>
                      </div>
                    </div>

                    {/* Dashboard Tabs */}
                    <div className="flex gap-2 border-b border-border pb-4 overflow-x-auto">
                      {['overview', 'trends', 'history', 'comparison'].map((tab) => (
                        <motion.button
                          key={tab}
                          type="button"
                          onClick={() => setDashboardTab(tab)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap relative overflow-hidden ${
                            dashboardTab === tab
                              ? 'bg-gradient-to-r from-accent to-cyan-500 text-white shadow-lg'
                              : 'bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-secondary'
                          }`}
                        >
                          {dashboardTab === tab && (
                            <motion.div
                              layoutId="activeTab"
                              className="absolute inset-0 bg-gradient-to-r from-accent to-cyan-500"
                              initial={false}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          )}
                          <span className="relative z-10 capitalize flex items-center gap-2">
                            {tab === 'overview' && '📊'}
                            {tab === 'trends' && '📈'}
                            {tab === 'history' && '📅'}
                            {tab === 'comparison' && '⚖️'}
                            {tab}
                          </span>
                        </motion.button>
                      ))}
                    </div>

                    {/* Overview Tab */}
                    {dashboardTab === 'overview' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        {/* Summary Cards */}
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <motion.div
                            whileHover={{ scale: 1.03, y: -4 }}
                            className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 shadow-lg"
                          >
                            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                            <div className="relative z-10">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl">⭐</span>
                                <div className="text-xs font-bold text-white/90">Overall Rating</div>
                              </div>
                              <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.5, type: "spring" }}
                                className="text-3xl font-black text-white"
                              >
                                {studentDashboardData?.analytics?.overallAverage?.toFixed(1) || '0.0'}
                              </motion.div>
                            </div>
                          </motion.div>
                          <motion.div
                            whileHover={{ scale: 1.03, y: -4 }}
                            className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 shadow-lg"
                          >
                            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                            <div className="relative z-10">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl">🎯</span>
                                <div className="text-xs font-bold text-white/90">Technical Rating</div>
                              </div>
                              <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.5, type: "spring", delay: 0.1 }}
                                className="text-3xl font-black text-white"
                              >
                                {studentDashboardData?.analytics?.technicalAverage?.toFixed(1) || '0.0'}
                              </motion.div>
                            </div>
                          </motion.div>
                          <motion.div
                            whileHover={{ scale: 1.03, y: -4 }}
                            className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-5 shadow-lg"
                          >
                            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                            <div className="relative z-10">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl">💪</span>
                                <div className="text-xs font-bold text-white/90">Physical Rating</div>
                              </div>
                              <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.5, type: "spring", delay: 0.2 }}
                                className="text-3xl font-black text-white"
                              >
                                {studentDashboardData?.analytics?.physicalAverage?.toFixed(1) || '0.0'}
                              </motion.div>
                            </div>
                          </motion.div>
                          <motion.div
                            whileHover={{ scale: 1.03, y: -4 }}
                            className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-5 shadow-lg"
                          >
                            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                            <div className="relative z-10">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl">🤝</span>
                                <div className="text-xs font-bold text-white/90">Behaviour Rating</div>
                              </div>
                              <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.5, type: "spring", delay: 0.3 }}
                                className="text-3xl font-black text-white"
                              >
                                {studentDashboardData?.analytics?.behaviourAverage?.toFixed(1) || '0.0'}
                              </motion.div>
                            </div>
                          </motion.div>
                        </div>

                        {/* Personal Best */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 rounded-2xl p-5"
                        >
                          <h4 className="text-sm font-black text-emerald-600 mb-4 flex items-center gap-2">
                            <span className="text-lg">🏆</span> Personal Best Records
                          </h4>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {Object.entries(getPersonalBests()).map(([attr, best], idx) => (
                              <motion.div
                                key={attr}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.4 + idx * 0.05 }}
                                whileHover={{ scale: 1.02 }}
                                className="bg-white/50 dark:bg-surface/50 rounded-xl p-4 hover:bg-white/80 dark:hover:bg-surface/80 transition-all"
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm font-bold text-foreground">{attr}</span>
                                  <motion.span 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.5 + idx * 0.05, type: "spring" }}
                                    className="text-2xl font-black text-emerald-600"
                                  >
                                    {best.score}
                                  </motion.span>
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <span>📅</span>
                                  {new Date(best.date).toLocaleDateString()}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      </motion.div>
                    )}

                    {/* Trends Tab */}
                    {dashboardTab === 'trends' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        {/* Filter Bar */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-2xl p-5"
                        >
                          <div className="flex flex-wrap gap-4 items-center">
                            <div>
                              <label className="text-xs font-bold text-blue-600 block mb-2 flex items-center gap-1">
                                <span>📅</span> Date Range
                              </label>
                              <motion.select
                                whileFocus={{ scale: 1.02 }}
                                value={dateRangeFilter}
                                onChange={(e) => setDateRangeFilter(e.target.value)}
                                className="text-sm p-2.5 rounded-xl bg-surface border border-border focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                              >
                                <option value="all">All Time</option>
                                <option value="30">Last 30 Days</option>
                                <option value="90">Last 3 Months</option>
                                <option value="180">Last 6 Months</option>
                              </motion.select>
                            </div>
                          </div>
                        </motion.div>

                        {/* Attribute Selector */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.1 }}
                          className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-5"
                        >
                          <h4 className="text-sm font-black text-purple-600 mb-4 flex items-center gap-2">
                            <span className="text-lg">📊</span> Select Attributes to Display
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedAttributes.map((attr, idx) => (
                              <motion.label
                                key={attr}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 + idx * 0.05 }}
                                whileHover={{ scale: 1.05 }}
                                className="flex items-center gap-2 text-sm cursor-pointer bg-white/50 dark:bg-surface/50 px-3 py-1.5 rounded-full border border-purple-500/30 hover:border-purple-500 transition-all"
                              >
                                <input
                                  type="checkbox"
                                  checked
                                  onChange={() => handleAttributeToggle(attr)}
                                  className="rounded accent-purple-500"
                                />
                                <span className="font-medium text-foreground">{attr}</span>
                              </motion.label>
                            ))}
                          </div>
                        </motion.div>

                        {/* Performance Trend Graph */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2 }}
                          className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-2xl p-5"
                        >
                          <h4 className="text-sm font-black text-cyan-600 mb-4 flex items-center gap-2">
                            <span className="text-lg">📈</span> Performance Trend
                          </h4>
                          <div className="h-64 sm:h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%" minWidth={300}>
                              <LineChart data={prepareGraphData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-border/50" opacity={0.3} />
                                <XAxis 
                                  dataKey="date" 
                                  className="text-xs text-muted-foreground"
                                  tick={{ fontSize: 11 }}
                                  tickLine={{ stroke: 'currentColor', opacity: 0.2 }}
                                  axisLine={{ stroke: 'currentColor', opacity: 0.2 }}
                                />
                                <YAxis 
                                  domain={[0, 10]} 
                                  className="text-xs text-muted-foreground"
                                  tick={{ fontSize: 11 }}
                                  tickLine={{ stroke: 'currentColor', opacity: 0.2 }}
                                  axisLine={{ stroke: 'currentColor', opacity: 0.2 }}
                                />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: 'hsl(var(--surface))', 
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '12px',
                                    color: 'hsl(var(--foreground))',
                                    fontSize: '12px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                  }}
                                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                                  cursor={{ stroke: 'hsl(var(--accent))', strokeWidth: 2 }}
                                />
                                <Legend 
                                  className="text-xs"
                                  wrapperStyle={{ paddingTop: '10px' }}
                                  iconType="circle"
                                />
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
                                {/* Overall Average Line */}
                                <Line 
                                  type="monotone" 
                                  dataKey="Overall" 
                                  stroke="url(#gradientOverall)" 
                                  strokeWidth={3}
                                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#059669' }}
                                  activeDot={{ r: 6, fill: '#10b981', stroke: '#059669', strokeWidth: 3 }}
                                  name="Overall Average"
                                  animationDuration={1000}
                                  animationBegin={0}
                                />
                                {/* Attribute Lines */}
                                {selectedAttributes.map((attr, idx) => {
                                  const gradients = ['url(#gradientBlue)', 'url(#gradientPurple)', 'url(#gradientOrange)', 'url(#gradientRed)', 'url(#gradientCyan)'];
                                  const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];
                                  const strokeColors = ['#2563eb', '#7c3aed', '#d97706', '#dc2626', '#0891b2'];
                                  return (
                                    <Line
                                      key={attr}
                                      type="monotone"
                                      dataKey={attr}
                                      stroke={gradients[idx % 5]}
                                      strokeWidth={2}
                                      dot={{ r: 3, fill: colors[idx % 5], strokeWidth: 2, stroke: strokeColors[idx % 5] }}
                                      activeDot={{ r: 5, fill: colors[idx % 5], stroke: strokeColors[idx % 5], strokeWidth: 2 }}
                                      connectNulls={false}
                                      name={attr}
                                      animationDuration={1000}
                                      animationBegin={idx * 100}
                                    />
                                  );
                                })}
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}

                    {/* History Tab */}
                    {dashboardTab === 'history' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        {/* Assessment Timeline */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-5"
                        >
                          <h4 className="text-sm font-black text-emerald-600 mb-4 flex items-center gap-2">
                            <span className="text-lg">📅</span> Assessment Timeline
                          </h4>
                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {getFilteredHistory().map((assessment, idx) => {
                              const avg = calculateAverageRating(assessment.scores);
                              const grade = calculateGrade(parseFloat(avg));
                              return (
                                <motion.button
                                  key={assessment.assessment_id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                  whileHover={{ scale: 1.01 }}
                                  whileTap={{ scale: 0.99 }}
                                  onClick={() => handleDashboardAssessmentSelect(assessment)}
                                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                                    selectedAssessment?.assessment_id === assessment.assessment_id
                                      ? 'border-emerald-500 bg-emerald-500/20 shadow-lg'
                                      : 'border-border hover:border-emerald-400 bg-white/50 dark:bg-surface/50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                      <motion.div 
                                        whileHover={{ scale: 1.1, rotate: 5 }}
                                        className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-sm font-black text-white shadow-md"
                                      >
                                        {grade}
                                      </motion.div>
                                      <div>
                                        <div className="font-bold text-foreground">
                                          {new Date(assessment.scored_at).toLocaleDateString()}
                                        </div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                          <span>👨‍🏫</span>
                                          {assessment.coach?.name || 'Unknown Coach'}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-lg font-black text-foreground">{avg}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {assessment.scores?.length || 0} metrics
                                      </div>
                                    </div>
                                  </div>
                                </motion.button>
                              );
                            })}
                          </div>
                        </motion.div>

                        {/* Assessment Details */}
                        {selectedAssessment && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-2xl p-5"
                          >
                            <h4 className="text-sm font-black text-blue-600 mb-4 flex items-center gap-2">
                              <span className="text-lg">📊</span> Assessment Details
                            </h4>
                            
                            {/* Improvement Indicators */}
                            {studentDashboardData?.history?.length > 1 && (
                              <div className="mb-6 p-4 bg-white/50 dark:bg-surface/50 rounded-xl">
                                <h5 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
                                  <span>📈</span> Improvement Indicators (vs Previous Assessment)
                                </h5>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                  {(() => {
                                    const currentIndex = studentDashboardData.history.findIndex(
                                      a => a.assessment_id === selectedAssessment.assessment_id
                                    );
                                    const previousAssessment = currentIndex > 0 
                                      ? studentDashboardData.history[currentIndex + 1]
                                      : null;
                                    
                                    if (!previousAssessment) return null;
                                    
                                    const indicators = getImprovementIndicators(selectedAssessment, previousAssessment);
                                    
                                    return Object.entries(indicators).map(([attr, data], idx) => (
                                      <motion.div
                                        key={attr}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="flex items-center justify-between p-3 bg-surface rounded-xl"
                                      >
                                        <span className="text-sm font-bold text-foreground">{attr}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-bold text-foreground">{data.current}</span>
                                          {data.trend === 'up' && (
                                            <span className="text-xs font-bold text-emerald-600 bg-emerald-500/20 px-2 py-1 rounded-full">▲ +{data.diff}</span>
                                          )}
                                          {data.trend === 'down' && (
                                            <span className="text-xs font-bold text-red-600 bg-red-500/20 px-2 py-1 rounded-full">▼ {data.diff}</span>
                                          )}
                                          {data.trend === 'same' && (
                                            <span className="text-xs font-bold text-muted-foreground bg-surface-secondary px-2 py-1 rounded-full">━ 0</span>
                                          )}
                                        </div>
                                      </motion.div>
                                    ));
                                  })()}
                                </div>
                              </div>
                            )}
                            
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                              {selectedAssessment.scores?.map((score, idx) => (
                                <motion.div
                                  key={score.attribute.attribute_id}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: idx * 0.05 }}
                                  className="bg-white/50 dark:bg-surface/50 rounded-xl p-4"
                                >
                                  <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-bold text-foreground">
                                      {score.attribute.name}
                                    </span>
                                    <span className="text-lg font-black text-emerald-600 bg-emerald-500/20 px-3 py-1 rounded-full">
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
                            {selectedAssessment.notes && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 p-4 bg-white/50 dark:bg-surface/50 rounded-xl"
                              >
                                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                  <span>💬</span> Coach Notes
                                </div>
                                <p className="text-sm text-foreground">{selectedAssessment.notes}</p>
                              </motion.div>
                            )}
                          </motion.div>
                        )}

                        {/* Coach Remarks History */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-5"
                        >
                          <h4 className="text-sm font-black text-purple-600 mb-4 flex items-center gap-2">
                            <span className="text-lg">💬</span> Coach Remarks History
                          </h4>
                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {studentDashboardData?.history?.filter(a => a.notes).map((assessment, idx) => (
                              <motion.div
                                key={assessment.assessment_id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-white/50 dark:bg-surface/50 rounded-xl p-4"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-xs font-bold text-foreground">
                                    {new Date(assessment.scored_at).toLocaleDateString()}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {assessment.coach?.name || 'Unknown Coach'}
                                  </div>
                                </div>
                                <p className="text-sm text-foreground">{assessment.notes}</p>
                              </motion.div>
                            ))}
                            {studentDashboardData?.history?.filter(a => a.notes).length === 0 && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-8"
                              >
                                <div className="text-4xl mb-2">📝</div>
                                <p className="text-sm text-muted-foreground">No coach remarks available</p>
                              </motion.div>
                            )}
                          </div>
                        </motion.div>
                      </motion.div>
                    )}

                    {/* Comparison Tab */}
                    {dashboardTab === 'comparison' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        {/* Assessment Comparison */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-2xl p-5"
                        >
                          <h4 className="text-sm font-black text-orange-600 mb-4 flex items-center gap-2">
                            <span className="text-lg">⚖️</span> Assessment Comparison
                          </h4>
                          <div className="grid gap-4 sm:grid-cols-2 mb-6">
                            <div>
                              <label className="text-xs font-bold text-orange-600 block mb-2 flex items-center gap-1">
                                <span>📅</span> Select First Assessment
                              </label>
                              <motion.select
                                whileFocus={{ scale: 1.02 }}
                                value={compareAssessments.assessment1?.assessment_id || ''}
                                onChange={(e) => {
                                  const assessment = studentDashboardData?.history?.find(
                                    a => a.assessment_id === e.target.value
                                  );
                                  handleCompareSelect('assessment1', assessment);
                                }}
                                className="w-full text-sm p-2.5 rounded-xl bg-surface border border-border focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                              >
                                <option value="">-- Select --</option>
                                {studentDashboardData?.history?.map(assessment => (
                                  <option key={assessment.assessment_id} value={assessment.assessment_id}>
                                    {new Date(assessment.scored_at).toLocaleDateString()} - {calculateAverageRating(assessment.scores)}
                                  </option>
                                ))}
                              </motion.select>
                            </div>
                            <div>
                              <label className="text-xs font-bold text-orange-600 block mb-2 flex items-center gap-1">
                                <span>📅</span> Select Second Assessment
                              </label>
                              <motion.select
                                whileFocus={{ scale: 1.02 }}
                                value={compareAssessments.assessment2?.assessment_id || ''}
                                onChange={(e) => {
                                  const assessment = studentDashboardData?.history?.find(
                                    a => a.assessment_id === e.target.value
                                  );
                                  handleCompareSelect('assessment2', assessment);
                                }}
                                className="w-full text-sm p-2.5 rounded-xl bg-surface border border-border focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                              >
                                <option value="">-- Select --</option>
                                {studentDashboardData?.history?.map(assessment => (
                                  <option key={assessment.assessment_id} value={assessment.assessment_id}>
                                    {new Date(assessment.scored_at).toLocaleDateString()} - {calculateAverageRating(assessment.scores)}
                                  </option>
                                ))}
                              </motion.select>
                            </div>
                          </div>

                          {compareAssessments.assessment1 && compareAssessments.assessment2 && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="space-y-3"
                            >
                              <h5 className="text-xs font-bold text-foreground flex items-center gap-2">
                                <span>📊</span> Comparison Results
                              </h5>
                              {(() => {
                                const scores1 = {};
                                const scores2 = {};
                                
                                compareAssessments.assessment1.scores?.forEach(score => {
                                  scores1[score.attribute.name] = score.score;
                                });
                                
                                compareAssessments.assessment2.scores?.forEach(score => {
                                  scores2[score.attribute.name] = score.score;
                                });
                                
                                const allAttributes = new Set([
                                  ...Object.keys(scores1),
                                  ...Object.keys(scores2)
                                ]);
                                
                                return Array.from(allAttributes).map((attr, idx) => {
                                  const s1 = scores1[attr] || 0;
                                  const s2 = scores2[attr] || 0;
                                  const diff = s2 - s1;
                                  
                                  return (
                                    <motion.div
                                      key={attr}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: idx * 0.05 }}
                                      whileHover={{ scale: 1.01 }}
                                      className="flex items-center justify-between p-4 bg-white/50 dark:bg-surface/50 rounded-xl"
                                    >
                                      <span className="text-sm font-bold text-foreground">{attr}</span>
                                      <div className="flex items-center gap-4">
                                        <span className="text-sm font-bold text-muted-foreground bg-surface-secondary px-3 py-1 rounded-lg">{s1}</span>
                                        <motion.span 
                                          animate={{ x: [0, 5, 0] }}
                                          transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                                          className="text-orange-500 font-bold"
                                        >
                                          →
                                        </motion.span>
                                        <span className="text-sm font-bold text-foreground bg-surface-secondary px-3 py-1 rounded-lg">{s2}</span>
                                        <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                                          diff > 0 ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30' :
                                          diff < 0 ? 'bg-red-500/20 text-red-600 border border-red-500/30' :
                                          'bg-surface-secondary text-muted-foreground border border-border'
                                        }`}>
                                          {diff > 0 ? `+${diff}` : diff}
                                        </span>
                                      </div>
                                    </motion.div>
                                  );
                                });
                              })()}
                            </motion.div>
                          )}
                        </motion.div>
                      </motion.div>
                    )}

                    {/* Export Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-3 text-sm font-bold transition-colors">
                        📄 Export PDF
                      </button>
                      <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-3 text-sm font-bold transition-colors">
                        📊 Export Excel
                      </button>
                      <button className="flex-1 bg-surface border border-border hover:bg-surface-secondary text-foreground rounded-xl py-3 text-sm font-bold transition-colors">
                        🖨️ Print
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending Attributes Approval Panel */}
      {pendingAttributes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚠️</span>
              <div>
                <h3 className="text-sm font-black text-foreground">Pending Attribute Proposals</h3>
                <p className="text-xs text-muted-foreground mt-1">Review and approve custom metrics proposed by coaches</p>
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
                        <span className="text-sm font-bold text-foreground">{attr.name}</span>
                        <motion.span
                          whileHover={{ scale: 1.05 }}
                          className="text-xs bg-gradient-to-r from-amber-400 to-orange-400 text-white px-3 py-1 rounded-full font-bold shadow-sm"
                        >
                          {attr.sport?.name || 'Global'}
                        </motion.span>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>👤</span> Proposed by: {attr.proposed_by || 'Coach'} · 
                        <span>📅</span> {attr.created_at || new Date().toLocaleDateString()}
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
          <motion.h3 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-lg font-black tracking-tight text-foreground flex items-center gap-2"
          >
            <span className="text-2xl">🏆</span> Active Sports Catalog
          </motion.h3>
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
                              key={attr.id || attr.name}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: idx * 0.05 }}
                              className="bg-gradient-to-r from-accent/10 to-cyan-500/10 border-accent/30 border px-3 py-1.5 rounded-full text-xs font-bold text-foreground"
                            >
                              {attr.name}
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
                <motion.h3 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-lg font-black tracking-tight text-foreground flex items-center gap-2"
                >
                  <span className="text-2xl">🎯</span> Select Training Batch
                </motion.h3>
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
                  className="bg-gradient-to-br from-surface-secondary/50 to-surface/30 border border-border rounded-2xl p-4 shadow-lg space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">👥</span>
                      <div>
                        <h3 className="text-foreground text-base font-black tracking-tight">
                          Students
                        </h3>
                        <span className="text-[11px] text-muted-foreground font-normal block mt-0.5">Click on a student to view detailed performance</span>
                      </div>
                    </div>
                  </div>

                  {loadingStudents ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <motion.div 
                          key={i} 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className="bg-surface border border-border rounded-xl p-4"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-surface-secondary to-surface animate-pulse"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-gradient-to-r from-surface-secondary to-surface rounded-lg mb-2 animate-pulse"></div>
                              <div className="h-3 bg-gradient-to-r from-surface-secondary to-surface rounded w-2/3 animate-pulse"></div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-3 bg-gradient-to-r from-surface-secondary to-surface rounded animate-pulse"></div>
                            <div className="h-3 bg-gradient-to-r from-surface-secondary to-surface rounded animate-pulse"></div>
                            <div className="h-3 bg-gradient-to-r from-surface-secondary to-surface rounded animate-pulse"></div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : students.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-gradient-to-br from-surface/50 to-surface-secondary/50 border border-dashed border-border rounded-xl py-12 text-center"
                    >
                      <div className="text-6xl mb-4 animate-bounce">👥</div>
                      <h4 className="text-lg font-black text-foreground mb-2">No Students Enrolled</h4>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">Enroll students in this batch to start tracking their performance.</p>
                    </motion.div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {students.map((student, idx) => (
                        <motion.div
                          key={student.student_id || student.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          whileHover={{ scale: 1.02, y: -4 }}
                          className="bg-surface border border-border rounded-xl p-4 cursor-pointer hover:border-accent/50 hover:shadow-lg transition-all group"
                          onClick={() => handleOpenStudentDashboard(student)}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <motion.div 
                              whileHover={{ scale: 1.1, rotate: 5 }}
                              className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-lg font-bold shadow-md flex-shrink-0"
                            >
                              {student.profile_photo ? (
                                <img 
                                  src={student.profile_photo} 
                                  alt={student.name}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                student.name?.charAt(0) || '?'
                              )}
                            </motion.div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-foreground truncate group-hover:text-accent transition-colors">
                                {student.name || `${student.first_name || ''} ${student.last_name || ''}`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {student.age ? `${student.age} yrs` : ''}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                              <span className="truncate">{student.category || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                              <span className="truncate">{selectedSport?.name || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                              <span className="truncate">{selectedBatchId ? batches.find(b => b.batch_id === parseInt(selectedBatchId))?.name || 'N/A' : 'N/A'}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      )}

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
                    {attributes.map((attr) => (
                      <div key={attr.id || attr.name} className="flex justify-between items-center p-2 bg-surface rounded-lg border border-border/50">
                        <span className="text-xs font-medium text-muted-foreground">{attr.name}</span>
                        <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded">
                          {selectedStudent.ratings?.[attr.name] || selectedStudent.performance_metrics?.[attr.name] || 'N/A'}
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
                              <span>👤 {historyItem.coach || 'Assigned Coach'}</span>
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
      </div>
    </motion.div>
  );
}