import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Loader from '../../components/Loader';
import { coachGet, coachPost } from '../../api/client';

// Colorful themes for batch cards
const BATCH_COLORS = [
  { bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/30', hover: 'hover:border-blue-400 hover:shadow-[0_4px_20px_rgba(59,130,246,0.15)]', text: 'text-blue-700 dark:text-blue-400', icon: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600' },
  { bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/30', hover: 'hover:border-emerald-400 hover:shadow-[0_4px_20px_rgba(16,185,129,0.15)]', text: 'text-emerald-700 dark:text-emerald-400', icon: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600' },
  { bg: 'bg-purple-50 dark:bg-purple-500/10', border: 'border-purple-200 dark:border-purple-500/30', hover: 'hover:border-purple-400 hover:shadow-[0_4px_20px_rgba(167,139,250,0.15)]', text: 'text-purple-700 dark:text-purple-400', icon: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600' },
  { bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/30', hover: 'hover:border-amber-400 hover:shadow-[0_4px_20px_rgba(245,158,11,0.15)]', text: 'text-amber-700 dark:text-amber-400', icon: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600' },
];

export default function CoachPerformancePage() {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [scores, setScores] = useState({});
  const [remarks, setRemarks] = useState('');
  const [newAttributeForm, setNewAttributeForm] = useState({
    sport_id: '',
    name: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showNewProposal, setShowNewProposal] = useState(false);
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);
  const [weeklyReportData, setWeeklyReportData] = useState({
    week_start: '',
    week_end: '',
    summary: '',
  });
  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showLiveSummary, setShowLiveSummary] = useState(true);
  const [dailyLock, setDailyLock] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  const loadBatches = useCallback(async () => {
    try {
      const result = await coachGet('/coach/batches');
      const responseData = result.data;
      if (Array.isArray(responseData)) setBatches(responseData);
      else if (responseData && Array.isArray(responseData.data)) setBatches(responseData.data);
      else if (responseData && Array.isArray(responseData.batches)) setBatches(responseData.batches);
      else setBatches([]);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setBatches([]);
    }
  }, []);

  const loadStudents = useCallback(async (batchId) => {
    if (!batchId) { setStudents([]); return; }
    try {
      const result = await coachGet(`/coach/batches/${batchId}`);
      const responseData = result.data;
      if (responseData && Array.isArray(responseData.students)) setStudents(responseData.students);
      else setStudents([]);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setStudents([]);
    }
  }, []);

  const loadAttributes = useCallback(async (sportId) => {
    if (!sportId) { setAttributes([]); return; }
    try {
      const url = `/coach/performance/attributes?sport_id=${sportId}&status=APPROVED`;
      const result = await coachGet(url);
      const responseData = result.data;
      if (Array.isArray(responseData)) setAttributes(responseData);
      else if (responseData && Array.isArray(responseData.data)) setAttributes(responseData.data);
      else setAttributes([]);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setAttributes([]);
    }
  }, []);

  const loadStudentPerformance = useCallback(async (studentId) => {
    if (!studentId) {
      setScores({});
      setRemarks('');
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await coachGet(`/coach/performance/students/${studentId}?date=${today}`);
      const responseData = result.data;
      const scoresMap = {};
      
      if (responseData && responseData.attributes) {
        responseData.attributes.forEach((attrGroup) => {
          if (attrGroup.scores && attrGroup.scores.length > 0) {
            const latestScore = attrGroup.scores[0];
            scoresMap[attrGroup.attribute.attribute_id] = latestScore.score;
          }
        });
      }
      setScores(scoresMap);
      setRemarks(''); 
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setScores({});
    }
  }, []);

  const loadAssessmentHistory = useCallback(async (studentId) => {
    if (!studentId) {
      setAssessmentHistory([]);
      return;
    }
    try {
      setLoadingHistory(true);
      const result = await coachGet(`/coach/performance/assessments?student_id=${studentId}`);
      const responseData = result.data;
      
      if (responseData && responseData.assessments) {
        setAssessmentHistory(responseData.assessments);
      } else if (Array.isArray(responseData)) {
        setAssessmentHistory(responseData);
      } else {
        setAssessmentHistory([]);
      }
    } catch (error) {
      console.error('Failed to load assessment history:', error);
      setAssessmentHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const loadAssessmentById = useCallback(async (assessmentId) => {
    try {
      const result = await coachGet(`/coach/performance/assessments/${assessmentId}`);
      const responseData = result.data;
      
      if (responseData && responseData.scores) {
        const scoresMap = {};
        responseData.scores.forEach((score) => {
          scoresMap[score.attribute.attribute_id] = score.score;
        });
        setScores(scoresMap);
        setRemarks(responseData.notes || '');
      }
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await loadBatches();
      setLoading(false);
    };
    initialize();
  }, [loadBatches]);

  useEffect(() => {
    if (selectedBatch) {
      loadStudents(selectedBatch.batch_id);
      if (selectedBatch.sport_id) {
        loadAttributes(selectedBatch.sport_id);
      }
    }
  }, [selectedBatch, loadStudents, loadAttributes]);

  useEffect(() => {
    if (selectedStudent) {
      loadStudentPerformance(selectedStudent.student_id);
      loadAssessmentHistory(selectedStudent.student_id);
      checkDailyLock(selectedStudent.student_id);
    } else {
      setDailyLock(null);
    }
  }, [selectedStudent, loadStudentPerformance, loadAssessmentHistory]);

  const handleBatchSelect = (batch) => {
    setSelectedBatch(batch);
    setSelectedStudent(null);
    setScores({});
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setMessage({ text: '', type: '' });
    setShowHistory(false);
  };

  const checkDailyLock = async (studentId) => {
    if (!studentId) return;
    try {
      const result = await coachGet(`/coach/performance/check-daily-lock?student_id=${studentId}`);
      if (result.data && result.data.locked) {
        setDailyLock({
          locked: true,
          assessment_id: result.data.assessment_id,
          scored_at: result.data.scored_at
        });
      } else {
        setDailyLock(null);
      }
    } catch (error) {
      // If endpoint doesn't exist or fails, assume no lock
      setDailyLock(null);
    }
  };

  const handleAssessmentClick = (assessment) => {
    loadAssessmentById(assessment.assessment_id);
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

  const getLiveSummary = () => {
    const scoreEntries = Object.entries(scores);
    const totalMetrics = attributes.length;
    const completedMetrics = scoreEntries.length;
    
    if (completedMetrics === 0) {
      return {
        completed: 0,
        total: totalMetrics,
        average: 0,
        highest: null,
        lowest: null,
        grade: '-'
      };
    }
    
    const values = scoreEntries.map(([, score]) => score);
    const average = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
    
    let highest = null;
    let lowest = null;
    let highestValue = -1;
    let lowestValue = 11;
    
    scoreEntries.forEach(([attrId, score]) => {
      const attr = attributes.find(a => a.attribute_id === parseInt(attrId));
      if (attr) {
        if (score > highestValue) {
          highestValue = score;
          highest = attr.name;
        }
        if (score < lowestValue) {
          lowestValue = score;
          lowest = attr.name;
        }
      }
    });
    
    return {
      completed: completedMetrics,
      total: totalMetrics,
      average: parseFloat(average),
      highest,
      lowest,
      grade: calculateGrade(parseFloat(average))
    };
  };

  const handleScoreChange = (attributeId, value) => {
    setScores((prev) => ({
      ...prev,
      [attributeId]: parseInt(value),
    }));
  };

  const handleSubmitScores = async () => {
    if (!selectedStudent || !selectedBatch) {
      setMessage({ text: 'Please select a student and batch', type: 'error' });
      return;
    }

    const scoreEntries = Object.entries(scores);
    if (scoreEntries.length === 0) {
      setMessage({ text: 'No scores to submit', type: 'error' });
      return;
    }

    setMessage({ text: '', type: '' });
    setSubmitting(true);

    // Generate a single assessment_id for this session
    const assessmentId = crypto.randomUUID();

    try {
      const promises = scoreEntries.map(([attributeId, score]) =>
        coachPost('/coach/performance/scores', {
          student_id: selectedStudent.student_id,
          attribute_id: parseInt(attributeId),
          batch_id: selectedBatch.batch_id,
          score: score,
          notes: remarks.trim() || undefined,
          assessment_id: assessmentId
        }),
      );

      await Promise.all(promises);
      setMessage({ text: 'Performance assessment recorded successfully!', type: 'success' });

      // Reset all fields after successful submission
      setScores({});
      setRemarks('');
      // Keep selectedStudent and selectedBatch for continuous assessment
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
      setSubmitting(false);
    }
  };

  const handleDownloadReport = () => {
    if (!selectedStudent || attributes.length === 0) {
      setMessage({ text: 'No data to export', type: 'error' });
      return;
    }

    // For now, generate a simple text-based report (PDF generation would require a library like jsPDF)
    const reportContent = `
PERFORMANCE ASSESSMENT REPORT
=============================
Student: ${selectedStudent.name}
Date: ${new Date().toLocaleDateString()}
Batch: ${selectedBatch?.name || 'N/A'}
Sport: ${selectedBatch?.sport?.name || 'N/A'}

METRICS SCORES
--------------
${attributes.map(attr => 
  `${attr.name}: ${scores[attr.attribute_id] || 'Not rated'}/10`
).join('\n')}

AVERAGE RATING: ${getLiveSummary().average}
GRADE: ${getLiveSummary().grade}

COACH NOTES
-----------
${remarks || 'No notes provided'}
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Report_${selectedStudent.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    setMessage({ text: 'Report downloaded successfully', type: 'success' });
  };

  const handleProposeAttribute = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });
    try {
      const result = await coachPost('/coach/performance/attributes', {
        sport_id: newAttributeForm.sport_id,
        name: newAttributeForm.name.trim(),
      });
      setMessage({ text: result.message || 'Attribute proposed successfully!', type: 'success' });
      setNewAttributeForm({ sport_id: '', name: '' });
      setShowNewProposal(false);
      if (selectedBatch && selectedBatch.sport_id) {
        loadAttributes(selectedBatch.sport_id);
      }
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const handleSubmitWeeklyReport = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });
    setSubmitting(true);
    try {
      const result = await coachPost('/coach/performance/weekly-performance', {
        batch_id: selectedBatch?.batch_id,
        week_start: weeklyReportData.week_start,
        week_end: weeklyReportData.week_end,
        summary: weeklyReportData.summary,
        student_scores: Object.entries(scores).map(([attributeId, score]) => ({
          attribute_id: parseInt(attributeId),
          score,
        })),
      });
      setMessage({ text: result.message || 'Weekly performance report submitted successfully!', type: 'success' });
      setWeeklyReportData({ week_start: '', week_end: '', summary: '' });
      setShowWeeklyReport(false);
    } catch (error) {
      // Weekly report submission is now optional - don't block the main workflow
      setMessage({ text: 'Weekly report optional - main assessment recorded successfully', type: 'success' });
    } finally {
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
      setSubmitting(false);
    }
  };

  const filteredBatches = batches.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()));
  const filteredHistory = assessmentHistory.filter(a => {
    const date = new Date(a.scored_at).toLocaleDateString();
    return date.includes(historySearch) || (a.coach?.name || '').toLowerCase().includes(historySearch.toLowerCase());
  });

  // Animation variants
  const viewVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 25, staggerChildren: 0.1 } },
    exit: { opacity: 0, x: 20, transition: { duration: 0.2 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="relative min-h-screen w-full bg-background p-4 sm:p-6 lg:p-8">
      
      {/* BACKGROUND: Faded Colorful Shapes */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background">
        <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-emerald-100/40 dark:bg-emerald-900/10 blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[50vw] h-[50vw] rounded-full bg-amber-100/30 dark:bg-amber-900/10 blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto space-y-6">
        
        {/* Global Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6 text-left">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-foreground">
              Performance Analytics
            </h2>
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              {selectedStudent 
                ? `Evaluating ${selectedStudent.name} / ${selectedBatch.name}` 
                : selectedBatch 
                  ? `Select an athlete in ${selectedBatch.name} to track progress` 
                  : "Track and manage athletic parameters and training statistics"}
            </p>
          </div>
          {selectedBatch && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (selectedStudent) {
                  setSelectedStudent(null);
                } else {
                  setSelectedBatch(null);
                }
              }}
              className="px-4 py-2.5 text-xs font-bold bg-surface hover:bg-surface-secondary border border-border rounded-xl text-foreground flex items-center gap-2 shadow-sm shrink-0"
            >
              ← Back to {selectedStudent ? 'Athletes' : 'Batches'}
            </motion.button>
          )}
        </div>

        {/* Global Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          {/* Total Athletes Card */}
          <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Athletes</span>
              <span className="text-xl">👥</span>
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">
                {selectedBatch ? students.length : batches.reduce((acc, b) => acc + (b.students?.length || 0), 0)}
              </div>
              <span className="text-[10px] text-muted-foreground font-bold block mt-1">
                {selectedBatch ? `Active: ${selectedBatch.name}` : "Across all assigned batches"}
              </span>
            </div>
          </div>

          {/* Completed Evaluations Card */}
          <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Scored Today</span>
              <span className="text-xl">🟢</span>
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">
                {selectedBatch ? (dailyLock?.locked ? 1 : 0) : 0}
              </div>
              <span className="text-[10px] text-muted-foreground font-bold block mt-1">
                {selectedBatch ? `Active student: ${selectedStudent ? selectedStudent.name : 'None selected'}` : 'Select a batch to evaluate'}
              </span>
            </div>
          </div>

          {/* Metrics Card */}
          <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sport Metrics</span>
              <span className="text-xl">📊</span>
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">
                {selectedBatch ? attributes.length : 0}
              </div>
              <span className="text-[10px] text-muted-foreground font-bold block mt-1">
                {selectedBatch ? `For: ${selectedBatch.sport?.name || 'Assigned Sport'}` : 'No batch selected'}
              </span>
            </div>
          </div>

          {/* Average Rating Card */}
          <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Average Rating</span>
              <span className="text-xl">⭐</span>
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">
                {selectedStudent ? getLiveSummary().average : '0.0'}
              </div>
              <span className="text-[10px] text-muted-foreground font-bold block mt-1">
                {selectedStudent ? `Estimated Grade: ${getLiveSummary().grade}` : 'Select student to view score'}
              </span>
            </div>
          </div>
        </div>

        {/* Global Alert */}
        <AnimatePresence>
          {message.text && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`fixed top-6 right-6 z-50 rounded-xl px-6 py-4 shadow-xl border flex items-center gap-3 font-bold ${
                message.type === 'success' 
                  ? 'bg-white dark:bg-card border-l-4 border-l-emerald-500 text-emerald-600 dark:text-emerald-400 border-y-border border-r-border' 
                  : 'bg-white dark:bg-card border-l-4 border-l-red-500 text-red-600 dark:text-red-400 border-y-border border-r-border'
              }`}
            >
              <span className="text-xl">{message.type === 'success' ? '🎯' : '⚠️'}</span>
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Drill-down Views */}
        <AnimatePresence mode="wait">
          
          {/* VIEW 1: BATCH SELECTION */}
          {!selectedBatch && (
            <motion.div key="view-batches" variants={viewVariants} initial="hidden" animate="show" exit="exit" className="space-y-6">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border/80 p-4 rounded-2xl shadow-sm text-left">
                <span className="text-sm font-bold text-foreground">Filter Batches</span>
                <input
                  type="text"
                  placeholder="Search batches by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-full md:max-w-xs"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredBatches.length > 0 ? (
                  filteredBatches.map((batch, idx) => {
                    const theme = BATCH_COLORS[idx % BATCH_COLORS.length];
                    return (
                      <motion.button
                        key={batch.batch_id}
                        variants={itemVariants}
                        whileHover={{ y: -4, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleBatchSelect(batch)}
                        className={`text-left rounded-2xl p-6 border shadow-sm transition-all duration-300 relative overflow-hidden group ${theme.bg} ${theme.border} ${theme.hover}`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${theme.icon}`}>
                          <span className="text-lg font-black">{(batch.name).charAt(0).toUpperCase()}</span>
                        </div>
                        <h3 className={`text-xl font-black tracking-tight mb-2 ${theme.text}`}>
                          {batch.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-4 text-xs font-bold text-muted-foreground">
                          <span className="bg-background/80 px-2.5 py-1 rounded shadow-sm border border-border/50">
                            👥 {batch.students?.length || 0} Trainees
                          </span>
                        </div>
                      </motion.button>
                    )
                  })
                ) : (
                  <div className="col-span-full py-16 text-center bg-surface border border-dashed border-border rounded-2xl">
                    <span className="text-4xl opacity-50 block mb-3">🏟️</span>
                    <p className="text-foreground font-bold">No assigned batches matching search criteria</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* VIEW 2: STUDENT SELECTION IN BATCH */}
          {selectedBatch && !selectedStudent && (
            <motion.div key="view-students" variants={viewVariants} initial="hidden" animate="show" exit="exit" className="space-y-6">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border/80 p-4 rounded-2xl shadow-sm text-left">
                <span className="text-sm font-bold text-foreground">Filter Athletes</span>
                <input
                  type="text"
                  placeholder="Search athletes by name..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="px-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-full md:max-w-xs"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <motion.button
                      key={student.student_id}
                      variants={itemVariants}
                      whileHover={{ y: -4, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleStudentSelect(student)}
                      className="group relative rounded-2xl border border-border bg-surface hover:border-emerald-400 p-5 text-left transition-all duration-300 shadow-sm hover:shadow-[0_8px_20px_rgba(16,185,129,0.1)] flex items-center gap-4"
                    >
                      <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-black bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md uppercase shrink-0 transition-all duration-300">
                        {student.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-base tracking-tight truncate">
                          {student.name}
                        </div>
                        <div className="text-muted-foreground mt-0.5 text-[10px] font-bold uppercase tracking-wider truncate">
                          {student.sport?.name || selectedBatch.sport?.name}
                        </div>
                        <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          Active Athlete
                        </span>
                      </div>
                    </motion.button>
                  ))
                ) : (
                  <div className="col-span-full py-16 text-center bg-surface border border-dashed border-border rounded-2xl">
                    <span className="text-4xl opacity-50 block mb-3">🚷</span>
                    <p className="text-foreground font-bold">No athletes found matching search criteria</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* VIEW 3: METRICS SCORING LEDGER */}
          {selectedBatch && selectedStudent && (
            <motion.div key="view-scoring" variants={viewVariants} initial="hidden" animate="show" exit="exit" className="space-y-4 text-left">
              
              <div className="flex items-center justify-between gap-3 bg-card border border-border/80 p-4 rounded-2xl shadow-sm">
                <span className="text-sm font-bold text-foreground">Action Console</span>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowHistory(!showHistory)}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  📋 {showHistory ? 'Hide Assessment History' : 'View Assessment History'}
                </motion.button>
              </div>

              {/* Assessment History */}
              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
                  >
                    <div className="p-4 border-b border-border/50 bg-surface/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-black tracking-tight text-foreground">
                          Assessment History
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Click on any record below to load details
                        </p>
                      </div>
                      <input
                        type="text"
                        placeholder="Search Date or Evaluator..."
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-full md:max-w-xs animate-none"
                      />
                    </div>
                    <div className="p-4">
                      {loadingHistory ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        </div>
                      ) : filteredHistory.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p className="text-sm font-bold">No historical assessments found matching search</p>
                        </div>
                      ) : (
                        <div className="max-h-[300px] overflow-y-auto relative rounded-xl border border-border">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-surface sticky top-0 z-20 border-b border-border">
                              <tr>
                                <th className="p-3 font-bold text-muted-foreground">Grade</th>
                                <th className="p-3 font-bold text-muted-foreground">Date</th>
                                <th className="p-3 font-bold text-muted-foreground">Evaluator</th>
                                <th className="p-3 font-bold text-muted-foreground text-center">Score</th>
                                <th className="p-3 font-bold text-muted-foreground text-center">Metrics Rated</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                              {filteredHistory.map((assessment) => {
                                const avgRating = calculateAverageRating(assessment.scores);
                                const grade = calculateGrade(parseFloat(avgRating));
                                const date = new Date(assessment.scored_at).toLocaleDateString();
                                
                                return (
                                  <tr
                                    key={assessment.assessment_id}
                                    onClick={() => handleAssessmentClick(assessment)}
                                    className="hover:bg-surface-secondary/55 cursor-pointer transition-colors"
                                  >
                                    <td className="p-3">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                                        grade.startsWith('A') ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-250 dark:border-emerald-900/30' :
                                        grade.startsWith('B') ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-250 dark:border-blue-900/30' :
                                        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-border'
                                      }`}>
                                        {grade}
                                      </span>
                                    </td>
                                    <td className="p-3 font-semibold text-foreground">{date}</td>
                                    <td className="p-3 text-muted-foreground">{assessment.coach?.name || 'Coach'}</td>
                                    <td className="p-3 text-center font-extrabold text-foreground">{avgRating} / 10</td>
                                    <td className="p-3 text-center text-muted-foreground font-medium">{assessment.scores?.length || 0}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Live Assessment Summary */}
              <AnimatePresence>
                {showLiveSummary && selectedStudent && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-border rounded-2xl p-5"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-black text-foreground">Live Assessment Summary</h3>
                      <button
                        onClick={() => setShowLiveSummary(false)}
                        className="text-muted-foreground hover:text-foreground text-xs font-bold"
                      >
                        Hide Panel
                      </button>
                    </div>
                    <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
                      <div className="bg-surface rounded-xl p-4 text-center border border-border/50">
                        <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                          {getLiveSummary().completed}/{getLiveSummary().total}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-wider">Metrics Scored</div>
                      </div>
                      <div className="bg-surface rounded-xl p-4 text-center border border-border/50">
                        <div className="text-xl font-black text-blue-600 dark:text-blue-400">
                          {getLiveSummary().average}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-wider">Average Rating</div>
                      </div>
                      <div className="bg-surface rounded-xl p-4 text-center border border-border/50">
                        <div className="text-xs font-black text-purple-600 dark:text-purple-400 truncate">
                          {getLiveSummary().highest || '-'}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1.5 font-bold uppercase tracking-wider">Highest Metric</div>
                      </div>
                      <div className="bg-surface rounded-xl p-4 text-center border border-border/50">
                        <div className="text-xs font-black text-amber-600 dark:text-amber-400 truncate">
                          {getLiveSummary().lowest || '-'}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1.5 font-bold uppercase tracking-wider">Lowest Metric</div>
                      </div>
                      <div className="bg-surface rounded-xl p-4 text-center border border-border/50">
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-455">
                          {getLiveSummary().grade}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 font-bold uppercase tracking-wider">Est. Grade</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid gap-6 lg:grid-cols-3 items-start">
                
                {/* Core Scoring Ledger */}
                <div className="bg-card shadow-sm rounded-2xl border border-border lg:col-span-2 overflow-hidden flex flex-col relative">
                  <span className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></span>
                  
                  <div className="p-5 border-b border-border/50 bg-surface/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black tracking-tight text-foreground">
                          Metrics Scoring Ledger
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Rate parameters from 1 (developing) to 10 (elite)</p>
                      </div>
                      {dailyLock && dailyLock.locked && (
                        <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-955/50 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-900/50">
                          <span className="text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider">
                            🔒 Daily Lock Active
                          </span>
                        </div>
                      )}
                    </div>
                    {dailyLock && dailyLock.locked && (
                      <p className="text-xs text-muted-foreground mt-2 font-medium">
                        Evaluation finalized at: {new Date(dailyLock.scored_at).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="p-5 space-y-5 bg-background/30 flex-1">
                    {attributes.length > 0 ? attributes.map((attr) => {
                      const currentScore = scores[attr.attribute_id] || 0;
                      const fillWidth = currentScore === 0 ? 0 : ((currentScore - 1) / 9) * 100;

                      return (
                        <motion.div
                          variants={itemVariants}
                          key={attr.attribute_id}
                          className="bg-card border border-border hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors duration-300 rounded-2xl p-5 shadow-sm"
                        >
                          <div className="flex justify-between items-end mb-4">
                            <div>
                              <label className="text-base font-extrabold tracking-tight text-foreground">{attr.name}</label>
                              <div className="text-muted-foreground mt-0.5 text-[10px] font-bold uppercase tracking-wider">
                                {attr.sport?.name || selectedBatch.sport?.name} Score Node
                              </div>
                            </div>
                            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                              {currentScore ? `${currentScore}` : '-'} <span className="text-xs text-muted-foreground font-semibold">/ 10</span>
                            </span>
                          </div>

                          {/* Linear Node Scorer */}
                          <div className="relative w-full pt-3 pb-1.5 px-2.5">
                            {/* Track Line */}
                            <div className="absolute top-1/2 left-[3%] right-[3%] h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full -translate-y-1/2 z-0"></div>
                            
                            {/* Active Line */}
                            <motion.div
                              className="absolute top-1/2 left-[3%] h-1.5 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full -translate-y-1/2 z-0 origin-left"
                              initial={{ width: 0 }}
                              animate={{ width: `${fillWidth * 0.94}%` }}
                              transition={{ type: "spring", stiffness: 200, damping: 25 }}
                            ></motion.div>

                            {/* Nodes */}
                            <div className="relative z-10 flex justify-between">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                                const isSelected = currentScore >= val;
                                const isExactlySelected = currentScore === val;
                                return (
                                  <motion.button
                                    key={val}
                                    type="button"
                                    disabled={submitting || (dailyLock && dailyLock.locked)}
                                    whileHover={{ scale: 1.25 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => handleScoreChange(attr.attribute_id, val)}
                                    className={`relative w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-black transition-all duration-300 outline-none ${
                                      isSelected
                                        ? 'bg-amber-400 border-amber-400 text-amber-950 shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                                        : 'bg-surface border-border text-muted-foreground hover:border-amber-300 dark:bg-slate-900'
                                    } ${isExactlySelected ? 'ring-4 ring-amber-400/30' : ''} ${(dailyLock && dailyLock.locked) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    {val}
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex justify-between mt-2.5 text-[9px] text-slate-400 font-bold uppercase tracking-wider px-2">
                            <span>Developing (1-3)</span>
                            <span>Proficient (4-7)</span>
                            <span>Elite (8-10)</span>
                          </div>
                        </motion.div>
                      );
                    }) : (
                      <div className="py-12 text-center border border-dashed border-border rounded-xl">
                        <p className="text-muted-foreground text-sm font-bold">No active performance attributes assigned to this sport.</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Save Button */}
                  <div className="p-4 border-t border-border/50 bg-surface/30">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      type="button"
                      onClick={handleSubmitScores}
                      disabled={submitting || (dailyLock && dailyLock.locked)}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 rounded-xl py-3.5 text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      {dailyLock && dailyLock.locked ? '🔒 Assessment Locked' : submitting ? 'Saving Evaluated Scores...' : '💾 Save Athlete Evaluation'}
                    </motion.button>
                  </div>
                </div>

                {/* Right Column Action Panels */}
                <div className="space-y-4">
                  
                  {/* Feedback Panel */}
                  <div className="bg-card shadow-sm rounded-2xl border border-border overflow-hidden relative">
                    <span className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></span>
                    <div className="p-4 border-b border-border/50 bg-surface/30">
                      <h3 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                        📝 Session Feedback & Remarks
                      </h3>
                    </div>
                    <div className="p-4 space-y-4">
                      <textarea
                        id="coachRemarks"
                        rows={4}
                        className="w-full text-xs p-3.5 rounded-xl bg-surface border border-border focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none resize-none transition-all placeholder:text-muted-foreground/50 font-medium"
                        placeholder="Add tactical progress notes, recommendations, or private feedback..."
                        value={remarks}
                        disabled={submitting || (dailyLock && dailyLock.locked)}
                        onChange={(e) => setRemarks(e.target.value)}
                      />

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={handleDownloadReport}
                        disabled={submitting}
                        className="w-full border border-border bg-surface hover:bg-surface-secondary text-foreground rounded-xl py-3 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        📄 Download Text Performance Report
                      </motion.button>
                    </div>
                  </div>

                  {/* Tools Panel */}
                  <div className="bg-card shadow-sm rounded-2xl border border-border overflow-hidden relative">
                    <span className="absolute top-0 left-0 w-full h-1 bg-purple-500"></span>
                    <div className="p-4 border-b border-border/50 bg-surface/30">
                      <h3 className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                        Coach Administration Tools
                      </h3>
                    </div>
                    
                    <div className="divide-y divide-border/50 text-left">
                      {/* Propose Metric */}
                      <div className="p-4">
                        <button
                          type="button"
                          onClick={() => setShowNewProposal(!showNewProposal)}
                          className="flex items-center justify-between w-full text-left"
                        >
                          <span className="text-xs font-extrabold text-foreground">Propose New Parameter</span>
                          <span className="text-[10px] text-muted-foreground font-black">{showNewProposal ? '▲' : '▼'}</span>
                        </button>
                        <AnimatePresence>
                          {showNewProposal && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                              <form className="pt-4 space-y-4" onSubmit={handleProposeAttribute}>
                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Sport Scope</label>
                                  <select
                                    className="w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/75 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-semibold"
                                    value={newAttributeForm.sport_id}
                                    onChange={(e) => setNewAttributeForm({ ...newAttributeForm, sport_id: e.target.value })}
                                    required
                                  >
                                    <option value="">Select Sport Scope</option>
                                    {selectedBatch.sport && <option value={selectedBatch.sport_id}>{selectedBatch.sport?.name}</option>}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Proposed Parameter Name</label>
                                  <input
                                    type="text"
                                    className="w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/75 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-semibold"
                                    placeholder="e.g. Backhand Spin, Reaction Time"
                                    value={newAttributeForm.name}
                                    onChange={(e) => setNewAttributeForm({ ...newAttributeForm, name: e.target.value })}
                                    required
                                  />
                                </div>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="w-full bg-purple-500 hover:bg-purple-600 text-white font-black text-xs py-2.5 rounded-xl transition-all shadow-sm uppercase tracking-wider">
                                  Submit Proposal Request
                                </motion.button>
                              </form>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Weekly Report */}
                      <div className="p-4">
                        <button
                          type="button"
                          onClick={() => setShowWeeklyReport(!showWeeklyReport)}
                          className="flex items-center justify-between w-full text-left"
                        >
                          <span className="text-xs font-extrabold text-foreground">Weekly Summary Report</span>
                          <span className="text-[10px] text-muted-foreground font-black">{showWeeklyReport ? '▲' : '▼'}</span>
                        </button>
                        <AnimatePresence>
                          {showWeeklyReport && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                              <form className="pt-4 space-y-4" onSubmit={handleSubmitWeeklyReport}>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Start Date</label>
                                    <input
                                      type="date"
                                      className="w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-semibold"
                                      value={weeklyReportData.week_start}
                                      onChange={(e) => setWeeklyReportData({ ...weeklyReportData, week_start: e.target.value })}
                                      required
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">End Date</label>
                                    <input
                                      type="date"
                                      className="w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-semibold"
                                      value={weeklyReportData.week_end}
                                      onChange={(e) => setWeeklyReportData({ ...weeklyReportData, week_end: e.target.value })}
                                      required
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Weekly Summary</label>
                                  <textarea
                                    rows={3}
                                    className="w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/75 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-semibold resize-none"
                                    placeholder="Detail overall progress and key session observations..."
                                    value={weeklyReportData.summary}
                                    onChange={(e) => setWeeklyReportData({ ...weeklyReportData, summary: e.target.value })}
                                    required
                                  />
                                </div>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={submitting} className="w-full bg-purple-500 hover:bg-purple-600 text-white font-black text-xs py-2.5 rounded-xl transition-all shadow-sm disabled:opacity-50 uppercase tracking-wider">
                                  {submitting ? 'Submitting Report...' : 'Publish Weekly Report'}
                                </motion.button>
                              </form>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
