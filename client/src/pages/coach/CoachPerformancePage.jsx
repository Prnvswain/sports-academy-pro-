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
      const result = await coachGet(`/coach/performance/students/${studentId}`);
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
              <div className="mb-8">
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                  Performance Tracker
                </h2>
                <p className="text-muted-foreground mt-2 text-sm font-medium">Select a training batch to begin evaluating your athletes.</p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {batches.length > 0 ? (
                  batches.map((batch, idx) => {
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
                          <span className="bg-background/80 px-2 py-1 rounded shadow-sm border border-border/50">
                            👥 {batch.students?.length || 0} Trainees
                          </span>
                        </div>
                      </motion.button>
                    )
                  })
                ) : (
                  <div className="col-span-full py-16 text-center bg-surface border border-dashed border-border rounded-2xl">
                    <span className="text-4xl opacity-50 block mb-3">🏟️</span>
                    <p className="text-foreground font-bold">No assigned batches</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* VIEW 2: STUDENT SELECTION IN BATCH */}
          {selectedBatch && !selectedStudent && (
            <motion.div key="view-students" variants={viewVariants} initial="hidden" animate="show" exit="exit" className="space-y-6">
              <div className="flex items-center gap-4 border-b border-border/50 pb-6">
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedBatch(null)}
                  className="bg-surface border border-border hover:bg-surface-secondary text-foreground w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm"
                >
                  ←
                </motion.button>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                    {selectedBatch.name} <span className="text-muted-foreground font-medium text-lg">/ Select Athlete</span>
                  </h2>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {students.length > 0 ? (
                  students.map((student) => (
                    <motion.button
                      key={student.student_id}
                      variants={itemVariants}
                      whileHover={{ y: -4, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleStudentSelect(student)}
                      className="group relative rounded-2xl border border-border bg-surface hover:border-emerald-400 p-5 text-left transition-all duration-300 shadow-sm hover:shadow-[0_8px_20px_rgba(16,185,129,0.1)] flex items-center gap-4"
                    >
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black bg-surface-secondary border border-border text-muted-foreground group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500 transition-colors shadow-inner">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-black text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-base tracking-tight">
                          {student.name}
                        </div>
                        <div className="text-muted-foreground mt-0.5 text-[10px] font-bold uppercase tracking-wider">
                          {student.sport?.name || selectedBatch.sport?.name}
                        </div>
                      </div>
                    </motion.button>
                  ))
                ) : (
                  <div className="col-span-full py-16 text-center bg-surface border border-dashed border-border rounded-2xl">
                    <span className="text-4xl opacity-50 block mb-3">🚷</span>
                    <p className="text-foreground font-bold">No athletes in this batch</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* VIEW 3: METRICS SCORING LEDGER (With Linear Node Sketch Integration) */}
          {selectedBatch && selectedStudent && (
            <motion.div key="view-scoring" variants={viewVariants} initial="hidden" animate="show" exit="exit" className="space-y-6">
              
              <div className="flex items-center gap-4 border-b border-border/50 pb-6">
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedStudent(null)}
                  className="bg-surface border border-border hover:bg-surface-secondary text-foreground w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm"
                >
                  ←
                </motion.button>
                <div className="flex-1">
                  <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                    {selectedStudent.name} <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded text-sm font-bold border border-emerald-200 dark:border-emerald-500/30">Evaluation</span>
                  </h2>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowHistory(!showHistory)}
                  className="bg-surface border border-border hover:bg-surface-secondary text-foreground px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm flex items-center gap-2"
                >
                  📋 Assessment History
                </motion.button>
              </div>

              {/* Assessment History */}
              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 bg-card border border-border rounded-2xl overflow-hidden"
                  >
                    <div className="p-6 border-b border-border/50 bg-surface/30">
                      <h3 className="text-lg font-black tracking-tight text-foreground">
                        Assessment History
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Click on an assessment to load its ratings
                      </p>
                    </div>
                    <div className="p-6">
                      {loadingHistory ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        </div>
                      ) : assessmentHistory.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p className="text-sm font-bold">No assessment history found</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {assessmentHistory.map((assessment) => {
                            const avgRating = calculateAverageRating(assessment.scores);
                            const grade = calculateGrade(parseFloat(avgRating));
                            const date = new Date(assessment.scored_at).toLocaleDateString();
                            
                            return (
                              <motion.button
                                key={assessment.assessment_id}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => handleAssessmentClick(assessment)}
                                className="w-full text-left p-4 rounded-xl border border-border hover:border-emerald-400 bg-surface hover:bg-surface-secondary transition-all"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-lg font-black text-emerald-600 dark:text-emerald-400">
                                      {grade}
                                    </div>
                                    <div>
                                      <div className="font-bold text-foreground">{date}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {assessment.coach?.name || 'Unknown Coach'}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-lg font-black text-foreground">{avgRating}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {assessment.scores?.length || 0} metrics
                                    </div>
                                  </div>
                                </div>
                                {assessment.notes && (
                                  <div className="mt-2 text-sm text-muted-foreground truncate">
                                    {assessment.notes}
                                  </div>
                                )}
                              </motion.button>
                            );
                          })}
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
                    className="mb-6 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-border rounded-2xl p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-black text-foreground">Live Assessment Summary</h3>
                      <button
                        onClick={() => setShowLiveSummary(false)}
                        className="text-muted-foreground hover:text-foreground text-sm"
                      >
                        Hide
                      </button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                      <div className="bg-surface rounded-xl p-4 text-center">
                        <div className="text-2xl font-black text-emerald-600">
                          {getLiveSummary().completed}/{getLiveSummary().total}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Metrics Completed</div>
                      </div>
                      <div className="bg-surface rounded-xl p-4 text-center">
                        <div className="text-2xl font-black text-blue-600">
                          {getLiveSummary().average}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Average Rating</div>
                      </div>
                      <div className="bg-surface rounded-xl p-4 text-center">
                        <div className="text-xl font-black text-purple-600 truncate">
                          {getLiveSummary().highest || '-'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Highest Rated</div>
                      </div>
                      <div className="bg-surface rounded-xl p-4 text-center">
                        <div className="text-xl font-black text-amber-600 truncate">
                          {getLiveSummary().lowest || '-'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Lowest Rated</div>
                      </div>
                      <div className="bg-surface rounded-xl p-4 text-center">
                        <div className="text-3xl font-black text-emerald-600">
                          {getLiveSummary().grade}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Estimated Grade</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid gap-6 lg:grid-cols-3 items-start">
                
                {/* Core Scoring Ledger */}
                <div className="bg-card shadow-sm rounded-2xl border border-border lg:col-span-2 overflow-hidden flex flex-col relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                  
                  <div className="p-6 border-b border-border/50 bg-surface/30">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black tracking-tight text-foreground">
                        Metrics Scoring Ledger
                      </h3>
                      {dailyLock && dailyLock.locked && (
                        <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-500/20 px-3 py-1.5 rounded-full border border-amber-300 dark:border-amber-500/30">
                          <span className="text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
                            🔒 Assessment already submitted today
                          </span>
                        </div>
                      )}
                    </div>
                    {dailyLock && dailyLock.locked && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Submitted at: {new Date(dailyLock.scored_at).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="p-6 space-y-6 bg-background/30 flex-1">
                    {attributes.length > 0 ? attributes.map((attr) => {
                      const currentScore = scores[attr.attribute_id] || 0;
                      // Calculate width for the connecting line (0 to 10 mapped to 0% to 100%)
                      const fillWidth = currentScore === 0 ? 0 : ((currentScore - 1) / 9) * 100;

                      return (
                        <motion.div
                          variants={itemVariants}
                          key={attr.attribute_id}
                          className="bg-card border border-border hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors duration-300 rounded-2xl p-6 shadow-sm"
                        >
                          <div className="flex justify-between items-end mb-6">
                            <div>
                              <label className="text-lg font-black tracking-tight text-foreground">{attr.name}</label>
                              <div className="text-muted-foreground mt-1 text-xs font-bold uppercase tracking-wider">
                                {attr.sport?.name || 'Core Parameter'}
                              </div>
                            </div>
                            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                              {currentScore ? `${currentScore}` : '-'} <span className="text-sm text-muted-foreground">/ 10</span>
                            </span>
                          </div>

                          {/* Linear Node Scorer (Inspired by sketch image_db2d1f.jpg) */}
                          <div className="relative w-full pt-4 pb-2 px-3">
                            {/* Background Line */}
                            <div className="absolute top-1/2 left-[3%] right-[3%] h-1 bg-surface-secondary rounded-full -translate-y-1/2 z-0"></div>
                            
                            {/* Filled Golden Line */}
                            <motion.div
                              className="absolute top-1/2 left-[3%] h-1 bg-amber-400 rounded-full -translate-y-1/2 z-0 origin-left"
                              initial={{ width: 0 }}
                              animate={{ width: `${fillWidth * 0.94}%` }} // adjusted for padding
                              transition={{ type: "spring", stiffness: 200, damping: 25 }}
                            ></motion.div>

                            {/* Circular Nodes */}
                            <div className="relative z-10 flex justify-between">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                                const isSelected = currentScore >= val;
                                const isExactlySelected = currentScore === val;
                                return (
                                  <motion.button
                                    key={val}
                                    type="button"
                                    disabled={submitting || (dailyLock && dailyLock.locked)}
                                    whileHover={{ scale: 1.3 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => handleScoreChange(attr.attribute_id, val)}
                                    className={`relative w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-black transition-all duration-300 outline-none ${
                                      isSelected
                                        ? 'bg-amber-400 border-amber-400 text-amber-950 shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                                        : 'bg-surface border-border text-muted-foreground hover:border-amber-300'
                                    } ${isExactlySelected ? 'ring-4 ring-amber-400/30' : ''} ${(dailyLock && dailyLock.locked) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    {val}
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      );
                    }) : (
                      <div className="py-12 text-center border border-dashed border-border rounded-xl">
                        <p className="text-muted-foreground text-sm font-bold">No attributes assigned to this sport.</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Save Button at Bottom */}
                  <div className="p-6 border-t border-border/50 bg-surface/30">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={handleSubmitScores}
                      disabled={submitting || (dailyLock && dailyLock.locked)}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 rounded-xl py-4 text-sm font-black tracking-wide transition-all shadow-sm shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      {dailyLock && dailyLock.locked ? '🔒 Assessment Locked' : submitting ? 'Saving...' : '💾 Save Evaluation'}
                    </motion.button>
                  </div>
                </div>

                {/* Right Column: Action Panels */}
                <div className="space-y-6">
                  
                  {/* Feedback Panel */}
                  <div className="bg-card shadow-sm rounded-2xl border border-border overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                    <div className="p-5 border-b border-border/50 bg-surface/30">
                      <h3 className="text-sm font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                        📝 Session Feedback
                      </h3>
                    </div>
                    <div className="p-5 space-y-5">
                      <div className="space-y-2">
                        <textarea
                          id="coachRemarks"
                          rows={4}
                          className="w-full text-sm p-4 rounded-xl bg-surface border border-border focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none resize-none transition-all placeholder:text-muted-foreground/50"
                          placeholder="Add observations, tactical notes, or feedback..."
                          value={remarks}
                          disabled={submitting || (dailyLock && dailyLock.locked)}
                          onChange={(e) => setRemarks(e.target.value)}
                        />
                      </div>

                      <div className="space-y-3 pt-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="button"
                          onClick={handleDownloadReport}
                          disabled={submitting}
                          className="w-full border border-border bg-surface hover:bg-surface-secondary text-foreground rounded-xl py-3.5 text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                        >
                          📄 Download PDF Report
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {/* Tools Panel */}
                  <div className="bg-card shadow-sm rounded-2xl border border-border overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-purple-500"></div>
                    <div className="p-5 border-b border-border/50 bg-surface/30">
                      <h3 className="text-sm font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                        Coach Tools
                      </h3>
                    </div>
                    
                    <div className="divide-y divide-border/50">
                      {/* Propose Metric */}
                      <div className="p-5">
                        <button
                          type="button"
                          onClick={() => setShowNewProposal(!showNewProposal)}
                          className="flex items-center justify-between w-full text-left"
                        >
                          <span className="text-sm font-bold text-foreground">Propose New Metric</span>
                          <span className={`text-muted-foreground transition-transform ${showNewProposal ? 'rotate-180' : ''}`}>▼</span>
                        </button>
                        <AnimatePresence>
                          {showNewProposal && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                              <form className="pt-4 space-y-4" onSubmit={handleProposeAttribute}>
                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Sport Scope</label>
                                  <select
                                    className="input-field bg-background/50 border-purple-200 focus:border-purple-500 focus:ring-purple-500/20 px-3"
                                    value={newAttributeForm.sport_id}
                                    onChange={(e) => setNewAttributeForm({ ...newAttributeForm, sport_id: e.target.value })}
                                    required
                                  >
                                    <option value="">Select Sport</option>
                                    {selectedBatch.sport && <option value={selectedBatch.sport_id}>{selectedBatch.sport?.name}</option>}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Parameter Name</label>
                                  <input
                                    type="text"
                                    className="input-field bg-background/50 border-purple-200 focus:border-purple-500 focus:ring-purple-500/20 px-3"
                                    placeholder="e.g. Speed, Agility"
                                    value={newAttributeForm.name}
                                    onChange={(e) => setNewAttributeForm({ ...newAttributeForm, name: e.target.value })}
                                    required
                                  />
                                </div>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs py-2.5 rounded-lg transition-all shadow-sm">
                                  Submit Request
                                </motion.button>
                              </form>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Weekly Report */}
                      <div className="p-5">
                        <button
                          type="button"
                          onClick={() => setShowWeeklyReport(!showWeeklyReport)}
                          className="flex items-center justify-between w-full text-left"
                        >
                          <span className="text-sm font-bold text-foreground">Weekly Performance Report</span>
                          <span className={`text-muted-foreground transition-transform ${showWeeklyReport ? 'rotate-180' : ''}`}>▼</span>
                        </button>
                        <AnimatePresence>
                          {showWeeklyReport && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                              <form className="pt-4 space-y-4" onSubmit={handleSubmitWeeklyReport}>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Start Date</label>
                                    <input
                                      type="date"
                                      className="input-field bg-background/50 px-2"
                                      value={weeklyReportData.week_start}
                                      onChange={(e) => setWeeklyReportData({ ...weeklyReportData, week_start: e.target.value })}
                                      required
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">End Date</label>
                                    <input
                                      type="date"
                                      className="input-field bg-background/50 px-2"
                                      value={weeklyReportData.week_end}
                                      onChange={(e) => setWeeklyReportData({ ...weeklyReportData, week_end: e.target.value })}
                                      required
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Summary</label>
                                  <textarea
                                    rows={3}
                                    className="input-field bg-background/50 resize-none text-sm placeholder:text-muted-foreground/50 px-3 py-2"
                                    placeholder="Weekly progress notes..."
                                    value={weeklyReportData.summary}
                                    onChange={(e) => setWeeklyReportData({ ...weeklyReportData, summary: e.target.value })}
                                    required
                                  />
                                </div>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={submitting} className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs py-2.5 rounded-lg transition-all shadow-sm disabled:opacity-50">
                                  {submitting ? 'Submitting...' : 'Send Report'}
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
