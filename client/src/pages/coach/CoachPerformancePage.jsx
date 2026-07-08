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
    }
  }, [selectedStudent, loadStudentPerformance]);

  const handleBatchSelect = (batch) => {
    setSelectedBatch(batch);
    setSelectedStudent(null);
    setScores({});
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setMessage({ text: '', type: '' });
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
    
    try {
      const promises = scoreEntries.map(([attributeId, score]) =>
        coachPost('/coach/performance/scores', {
          student_id: selectedStudent.student_id,
          attribute_id: parseInt(attributeId),
          batch_id: selectedBatch.batch_id,
          score: score,
          remarks: remarks.trim() || undefined 
        }),
      );

      await Promise.all(promises);
      setMessage({ text: 'Performance evaluations safely synced to Admin portal.', type: 'success' });
      setRemarks('');
      loadStudentPerformance(selectedStudent.student_id);
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

    const csvContent = [
      ['Attribute', 'Score', 'Sport'].join(','),
      ...attributes.map((attr) =>
        [
          `"${attr.name.replace(/"/g, '""')}"`, 
          scores[attr.attribute_id] || 'N/A', 
          `"${(attr.sport?.name || 'Unknown').replace(/"/g, '""')}"`
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Report_${selectedStudent.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
      setMessage({ text: error.message || 'Failed to submit weekly report', type: 'error' });
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
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                    {selectedStudent.name} <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded text-sm font-bold border border-emerald-200 dark:border-emerald-500/30">Evaluation</span>
                  </h2>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-3 items-start">
                
                {/* Core Scoring Ledger */}
                <div className="bg-card shadow-sm rounded-2xl border border-border lg:col-span-2 overflow-hidden flex flex-col relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                  
                  <div className="p-6 border-b border-border/50 bg-surface/30">
                    <h3 className="text-xl font-black tracking-tight text-foreground">
                      Metrics Scoring Ledger
                    </h3>
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
                                    disabled={submitting}
                                    whileHover={{ scale: 1.3 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => handleScoreChange(attr.attribute_id, val)}
                                    className={`relative w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-black transition-all duration-300 outline-none ${
                                      isSelected 
                                        ? 'bg-amber-400 border-amber-400 text-amber-950 shadow-[0_0_12px_rgba(251,191,36,0.6)]' 
                                        : 'bg-surface border-border text-muted-foreground hover:border-amber-300'
                                    } ${isExactlySelected ? 'ring-4 ring-amber-400/30' : ''}`}
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
                </div>

                {/* Right Column: Action Panels */}
                <div className="space-y-6">
                  
                  {/* Feedback & Submit Panel */}
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
                          disabled={submitting}
                          onChange={(e) => setRemarks(e.target.value)}
                        />
                      </div>

                      <div className="space-y-3 pt-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="button"
                          onClick={handleSubmitScores}
                          disabled={submitting}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 rounded-xl py-3.5 text-sm font-black tracking-wide transition-all shadow-sm shadow-emerald-500/20 flex items-center justify-center gap-2"
                        >
                          {submitting ? 'Saving...' : '💾 Save Evaluation'}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="button"
                          onClick={handleDownloadReport}
                          disabled={submitting}
                          className="w-full border border-border bg-surface hover:bg-surface-secondary text-foreground rounded-xl py-3.5 text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                        >
                          📥 Download CSV Report
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
// import { useCallback, useEffect, useState } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import Loader from '../../components/Loader';
// import { coachGet, coachPost } from '../../api/client';

// export default function CoachPerformancePage() {
//   const [batches, setBatches] = useState([]);
//   const [selectedBatch, setSelectedBatch] = useState(null);
//   const [students, setStudents] = useState([]);
//   const [selectedStudent, setSelectedStudent] = useState(null);
//   const [attributes, setAttributes] = useState([]);
//   const [scores, setScores] = useState({});
//   const [remarks, setRemarks] = useState('');
//   const [newAttributeForm, setNewAttributeForm] = useState({
//     sport_id: '',
//     name: '',
//   });
//   const [loading, setLoading] = useState(true);
//   const [submitting, setSubmitting] = useState(false);
//   const [message, setMessage] = useState({ text: '', type: '' });
//   const [showNewProposal, setShowNewProposal] = useState(false);
//   const [showWeeklyReport, setShowWeeklyReport] = useState(false);
//   const [weeklyReportData, setWeeklyReportData] = useState({
//     week_start: '',
//     week_end: '',
//     summary: '',
//   });

//   const loadBatches = useCallback(async () => {
//     try {
//       const result = await coachGet('/coach/batches');
//       const responseData = result.data;
//       if (Array.isArray(responseData)) {
//         setBatches(responseData);
//       } else if (responseData && Array.isArray(responseData.data)) {
//         setBatches(responseData.data);
//       } else if (responseData && Array.isArray(responseData.batches)) {
//         setBatches(responseData.batches);
//       } else {
//         setBatches([]);
//       }
//     } catch (error) {
//       setMessage({ text: error.message, type: 'error' });
//       setBatches([]);
//     }
//   }, []);

//   const loadStudents = useCallback(async (batchId) => {
//     if (!batchId) {
//       setStudents([]);
//       return;
//     }
//     try {
//       const result = await coachGet(`/coach/batches/${batchId}`);
//       const responseData = result.data;
//       if (responseData && Array.isArray(responseData.students)) {
//         setStudents(responseData.students);
//       } else {
//         setStudents([]);
//       }
//     } catch (error) {
//       setMessage({ text: error.message, type: 'error' });
//       setStudents([]);
//     }
//   }, []);

//   const loadAttributes = useCallback(async (sportId) => {
//     if (!sportId) {
//       setAttributes([]);
//       return;
//     }
//     try {
//       const url = `/coach/performance/attributes?sport_id=${sportId}&status=APPROVED`;
//       const result = await coachGet(url);
//       const responseData = result.data;
//       if (Array.isArray(responseData)) {
//         setAttributes(responseData);
//       } else if (responseData && Array.isArray(responseData.data)) {
//         setAttributes(responseData.data);
//       } else {
//         setAttributes([]);
//       }
//     } catch (error) {
//       setMessage({ text: error.message, type: 'error' });
//       setAttributes([]);
//     }
//   }, []);

//   const loadStudentPerformance = useCallback(async (studentId) => {
//     if (!studentId) {
//       setScores({});
//       setRemarks('');
//       return;
//     }
//     try {
//       const result = await coachGet(`/coach/performance/students/${studentId}`);
//       const responseData = result.data;
//       const scoresMap = {};
      
//       if (responseData && responseData.attributes) {
//         responseData.attributes.forEach((attrGroup) => {
//           if (attrGroup.scores && attrGroup.scores.length > 0) {
//             const latestScore = attrGroup.scores[0];
//             scoresMap[attrGroup.attribute.attribute_id] = latestScore.score;
//           }
//         });
//       }
//       setScores(scoresMap);
//       setRemarks(''); 
//     } catch (error) {
//       setMessage({ text: error.message, type: 'error' });
//       setScores({});
//     }
//   }, []);

//   useEffect(() => {
//     const initialize = async () => {
//       setLoading(true);
//       await loadBatches();
//       setLoading(false);
//     };
//     initialize();
//   }, [loadBatches]);

//   useEffect(() => {
//     if (selectedBatch) {
//       loadStudents(selectedBatch.batch_id);
//       if (selectedBatch.sport_id) {
//         loadAttributes(selectedBatch.sport_id);
//       }
//     }
//   }, [selectedBatch, loadStudents, loadAttributes]);

//   useEffect(() => {
//     if (selectedStudent) {
//       loadStudentPerformance(selectedStudent.student_id);
//     }
//   }, [selectedStudent, loadStudentPerformance]);

//   const handleBatchSelect = (batch) => {
//     setSelectedBatch(batch);
//     setSelectedStudent(null);
//     setScores({});
//   };

//   const handleStudentSelect = (student) => {
//     setSelectedStudent(student);
//     setMessage({ text: '', type: '' });
//   };

//   const handleScoreChange = (attributeId, value) => {
//     setScores((prev) => ({
//       ...prev,
//       [attributeId]: parseInt(value),
//     }));
//   };

//   const handleSubmitScores = async () => {
//     if (!selectedStudent || !selectedBatch) {
//       setMessage({ text: 'Please select a student and batch', type: 'error' });
//       return;
//     }

//     const scoreEntries = Object.entries(scores);
//     if (scoreEntries.length === 0) {
//       setMessage({ text: 'No scores to submit', type: 'error' });
//       return;
//     }

//     setMessage({ text: '', type: '' });
//     setSubmitting(true);
    
//     try {
//       const promises = scoreEntries.map(([attributeId, score]) =>
//         coachPost('/coach/performance/scores', {
//           student_id: selectedStudent.student_id,
//           attribute_id: parseInt(attributeId),
//           batch_id: selectedBatch.batch_id,
//           score: score,
//           remarks: remarks.trim() || undefined 
//         }),
//       );

//       await Promise.all(promises);
//       setMessage({ text: 'Performance evaluations safely synced to Admin portal.', type: 'success' });
//       setRemarks('');
//       loadStudentPerformance(selectedStudent.student_id);
//     } catch (error) {
//       setMessage({ text: error.message, type: 'error' });
//     } finally {
//       setTimeout(() => setMessage({ text: '', type: '' }), 4000);
//       setSubmitting(false);
//     }
//   };

//   const handleDownloadReport = () => {
//     if (!selectedStudent || attributes.length === 0) {
//       setMessage({ text: 'No data to export', type: 'error' });
//       return;
//     }

//     const csvContent = [
//       ['Attribute', 'Score', 'Sport'].join(','),
//       ...attributes.map((attr) =>
//         [
//           `"${attr.name.replace(/"/g, '""')}"`, 
//           scores[attr.attribute_id] || 'N/A', 
//           `"${(attr.sport?.name || 'Unknown').replace(/"/g, '""')}"`
//         ].join(','),
//       ),
//     ].join('\n');

//     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//     const url = window.URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = `Report_${selectedStudent.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
//     a.click();
//     window.URL.revokeObjectURL(url);
//   };

//   const handleProposeAttribute = async (event) => {
//     event.preventDefault();
//     setMessage({ text: '', type: '' });
//     try {
//       const result = await coachPost('/coach/performance/attributes', {
//         sport_id: newAttributeForm.sport_id,
//         name: newAttributeForm.name.trim(),
//       });
//       setMessage({ text: result.message || 'Attribute proposed successfully!', type: 'success' });
//       setNewAttributeForm({ sport_id: '', name: '' });
//       setShowNewProposal(false);
//       if (selectedBatch && selectedBatch.sport_id) {
//         loadAttributes(selectedBatch.sport_id);
//       }
//     } catch (error) {
//       setMessage({ text: error.message, type: 'error' });
//     }
//     setTimeout(() => setMessage({ text: '', type: '' }), 4000);
//   };

//   const handleSubmitWeeklyReport = async (event) => {
//     event.preventDefault();
//     setMessage({ text: '', type: '' });
//     setSubmitting(true);
//     try {
//       const result = await coachPost('/coach/performance/weekly-performance', {
//         batch_id: selectedBatch?.batch_id,
//         week_start: weeklyReportData.week_start,
//         week_end: weeklyReportData.week_end,
//         summary: weeklyReportData.summary,
//         student_scores: Object.entries(scores).map(([attributeId, score]) => ({
//           attribute_id: parseInt(attributeId),
//           score,
//         })),
//       });
//       setMessage({ text: result.message || 'Weekly performance report submitted successfully!', type: 'success' });
//       setWeeklyReportData({ week_start: '', week_end: '', summary: '' });
//       setShowWeeklyReport(false);
//     } catch (error) {
//       setMessage({ text: error.message || 'Failed to submit weekly report', type: 'error' });
//     } finally {
//       setTimeout(() => setMessage({ text: '', type: '' }), 4000);
//       setSubmitting(false);
//     }
//   };

//   // Animation variants
//   const containerVariants = {
//     hidden: { opacity: 0 },
//     show: {
//       opacity: 1,
//       transition: { staggerChildren: 0.1 }
//     }
//   };

//   const itemVariants = {
//     hidden: { opacity: 0, y: 15, scale: 0.98 },
//     show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
//   };

//   if (loading) {
//     return <Loader />;
//   }

//   return (
//     <div className="relative min-h-full w-full">
//       {/* Vibrant Sports Theme Background */}
//       <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-[0.04] dark:opacity-[0.03]">
//         <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
//           <defs>
//             <pattern id="sports-icons" width="200" height="200" patternUnits="userSpaceOnUse" patternTransform="rotate(-15)">
//               {/* Football */}
//               <g transform="translate(20, 20) scale(1.2)"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M12 7l-3 4h6z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M12 7V2m-3 9l-4 3m10-3l4 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></g>
//               {/* Basketball */}
//               <g transform="translate(120, 40) scale(1.2)"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M12 2v20M2 12h20M4.93 4.93c3.9 3.9 3.9 10.24 0 14.14M19.07 4.93c-3.9 3.9-3.9 10.24 0 14.14" fill="none" stroke="currentColor" strokeWidth="1.5" /></g>
//               {/* Whistle */}
//               <g transform="translate(40, 120) scale(1.2)"><path d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m12 0a6.002 6.002 0 0 0-5.183-5.949V3.75a.75.75 0 1 0-1.5 0v3.051A6.002 6.002 0 0 0 6 11.25v1.5m12 0h-3m-9 0H3m12 0c0 .966-.316 1.857-.847 2.573m-10.306 0A4.502 4.502 0 0 1 6 12.75v-1.5c0-.966.316-1.857.847-2.573" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></g>
//               {/* Target/Performance */}
//               <g transform="translate(140, 140) scale(1.2)"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="2" fill="currentColor"/></g>
//             </pattern>
//           </defs>
//           <rect width="100%" height="100%" fill="url(#sports-icons)" />
//         </svg>
//       </div>

//       <motion.div 
//         className="relative z-10 bg-transparent min-h-screen space-y-8 p-6 w-full overflow-x-hidden"
//         initial={{ opacity: 0 }}
//         animate={{ opacity: 1 }}
//         transition={{ duration: 0.4 }}
//       >
//         {/* Header Section */}
//         <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/50 pb-6 relative">
//           <div className="absolute top-0 left-0 w-48 h-48 bg-primary/20 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
//           <div>
//             <h2 className="from-primary bg-gradient-to-r to-cyan-500 bg-clip-text text-4xl font-black tracking-tight text-transparent flex items-center gap-3">
//               Coach Assessment Hub
//               <span className="flex h-3 w-3 relative ml-2">
//                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
//                 <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
//               </span>
//             </h2>
//             <p className="text-muted-foreground mt-2 text-sm font-medium">Evaluate active batch training logs and parameter metrics.</p>
//           </div>
//         </div>

//         {/* Global Alert Notification */}
//         <AnimatePresence>
//           {message.text && (
//             <motion.div 
//               initial={{ opacity: 0, y: -20, scale: 0.95 }} 
//               animate={{ opacity: 1, y: 0, scale: 1 }} 
//               exit={{ opacity: 0, y: -20, scale: 0.95 }}
//               className={`fixed top-6 right-6 z-50 rounded-2xl px-6 py-4 shadow-2xl backdrop-blur-xl border flex items-center gap-3 font-semibold ${
//                 message.type === 'success' 
//                   ? 'bg-success/15 border-success/30 text-success shadow-success/20' 
//                   : 'bg-danger/15 border-danger/30 text-danger shadow-danger/20'
//               }`}
//             >
//               <span className="text-xl">{message.type === 'success' ? '🎯' : '⚠️'}</span>
//               {message.text}
//             </motion.div>
//           )}
//         </AnimatePresence>

//         {/* Batch Selection */}
//         <div className="card border-border/50 bg-surface/60 backdrop-blur-md p-6 rounded-2xl border shadow-lg relative overflow-hidden">
//           <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue/10 rounded-full blur-3xl"></div>
//           <h3 className="text-xl font-black tracking-tight mb-5 text-foreground flex items-center gap-2">
//             <span className="text-blue">1.</span> Assigned Training Batches
//           </h3>
//           {batches.length > 0 ? (
//             <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
//               {batches.map((batch) => (
//                 <motion.button
//                   variants={itemVariants}
//                   key={batch.batch_id}
//                   type="button"
//                   whileHover={{ y: -4, scale: 1.02 }}
//                   whileTap={{ scale: 0.98 }}
//                   onClick={() => handleBatchSelect(batch)}
//                   className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 ${
//                     selectedBatch?.batch_id === batch.batch_id
//                       ? 'border-blue bg-gradient-to-br from-blue/10 to-blue/5 ring-1 ring-blue/50 shadow-[0_8px_20px_rgba(59,130,246,0.15)]'
//                       : 'border-border/60 bg-surface hover:border-blue/40 shadow-sm'
//                   }`}
//                 >
//                   {selectedBatch?.batch_id === batch.batch_id && (
//                     <div className="absolute top-0 right-0 w-16 h-16 bg-blue/20 blur-xl rounded-full"></div>
//                   )}
//                   <div className={`font-black text-lg tracking-tight transition-colors ${selectedBatch?.batch_id === batch.batch_id ? 'text-blue' : 'text-foreground group-hover:text-blue'}`}>
//                     {batch.name}
//                   </div>
//                   <div className="text-muted-foreground mt-2 text-xs font-semibold flex items-center gap-2 bg-background/50 w-fit px-2.5 py-1 rounded-md border border-border/30">
//                     <span>⚽ {batch.sport?.name || '—'}</span>
//                     <span className="opacity-40">•</span>
//                     <span>👥 {batch.students?.length ?? 0} Trainees</span>
//                   </div>
//                 </motion.button>
//               ))}
//             </motion.div>
//           ) : (
//             <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-surface-secondary/20 rounded-xl border border-dashed border-border/50">
//               <span className="text-4xl mb-3 opacity-50">🏟️</span>
//               <p className="text-muted-foreground text-sm font-medium">No training batches currently assigned.</p>
//             </div>
//           )}
//         </div>

//         {selectedBatch && (
//           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-8">
            
//             {/* Student Selection */}
//             <div className="card border-border/50 bg-surface/60 backdrop-blur-md p-6 rounded-2xl border shadow-lg relative overflow-hidden">
//               <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl"></div>
//               <h3 className="text-xl font-black tracking-tight mb-5 text-foreground flex items-center gap-2">
//                 <span className="text-cyan-500">2.</span> Select Athlete Profile
//               </h3>
//               {students.length > 0 ? (
//                 <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
//                   {students.map((student) => (
//                     <motion.button
//                       variants={itemVariants}
//                       key={student.student_id}
//                       type="button"
//                       whileHover={{ y: -4, scale: 1.02 }}
//                       whileTap={{ scale: 0.98 }}
//                       onClick={() => handleStudentSelect(student)}
//                       className={`group relative rounded-2xl border p-4 text-left transition-all duration-300 flex items-center gap-4 ${
//                         selectedStudent?.student_id === student.student_id
//                           ? 'border-cyan-500 bg-gradient-to-r from-cyan-500/10 to-transparent ring-1 ring-cyan-500/50 shadow-[0_8px_20px_rgba(34,211,238,0.15)]'
//                           : 'border-border/60 bg-surface hover:border-cyan-500/40 shadow-sm'
//                       }`}
//                     >
//                       <div className={`flex items-center justify-center w-10 h-10 rounded-full text-lg shadow-inner transition-colors ${selectedStudent?.student_id === student.student_id ? 'bg-cyan-500 text-white shadow-cyan-500/40' : 'bg-surface-secondary text-muted-foreground group-hover:bg-cyan-500/20 group-hover:text-cyan-500'}`}>
//                         👤
//                       </div>
//                       <div>
//                         <div className={`font-bold text-sm tracking-tight transition-colors ${selectedStudent?.student_id === student.student_id ? 'text-cyan-500' : 'text-foreground'}`}>
//                           {student.name}
//                         </div>
//                         <div className="text-muted-foreground mt-0.5 text-[10px] font-bold uppercase tracking-wider">
//                           {student.sport?.name || selectedBatch.sport?.name}
//                         </div>
//                       </div>
//                     </motion.button>
//                   ))}
//                 </motion.div>
//               ) : (
//                 <div className="flex flex-col items-center justify-center py-8 px-4 text-center bg-surface-secondary/20 rounded-xl border border-dashed border-border/50">
//                   <span className="text-3xl mb-3 opacity-50">🚷</span>
//                   <p className="text-muted-foreground text-sm font-medium">No student profiles registered in this batch.</p>
//                 </div>
//               )}
//             </div>

//             {selectedStudent && attributes.length > 0 && (
//               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="grid gap-6 lg:grid-cols-3 items-start">
                
//                 {/* Performance Evaluation Matrix Column */}
//                 <div className="card border-border/50 bg-surface/60 backdrop-blur-md p-0 rounded-2xl border shadow-xl lg:col-span-2 overflow-hidden">
//                   <div className="p-6 border-b border-border/50 bg-gradient-to-r from-surface to-surface-secondary/50">
//                     <h3 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
//                       <span className="text-primary">3.</span> Metrics Scoring Ledger
//                     </h3>
//                     <p className="text-sm font-semibold text-muted-foreground mt-1">
//                       Evaluating: <span className="text-primary px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">{selectedStudent.name}</span>
//                     </p>
//                   </div>
                  
//                   <div className="p-6 space-y-4 bg-background/30">
//                     {attributes.map((attr) => (
//                       <motion.div
//                         initial={{ opacity: 0, x: -20 }}
//                         animate={{ opacity: 1, x: 0 }}
//                         key={attr.attribute_id}
//                         className="bg-surface border-border/60 hover:border-primary/30 transition-colors duration-300 rounded-2xl border p-5 shadow-sm relative overflow-hidden group"
//                       >
//                         <div className="absolute top-0 left-0 w-1 h-full bg-primary/0 group-hover:bg-primary/50 transition-colors"></div>
//                         <div className="flex justify-between items-start mb-3">
//                           <div>
//                             <label className="text-base font-black tracking-tight text-foreground">{attr.name}</label>
//                             <div className="text-muted-foreground mt-1 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
//                               <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
//                               Category: {attr.sport?.name || 'Core Parameter'}
//                             </div>
//                           </div>
//                           <span className={`text-sm font-black px-3 py-1 rounded-lg border transition-all ${scores[attr.attribute_id] ? 'bg-amber-400/10 text-amber-500 border-amber-400/30 shadow-[0_0_10px_rgba(251,191,36,0.2)]' : 'bg-surface-secondary text-muted-foreground border-border/50'}`}>
//                             {scores[attr.attribute_id] ? `${scores[attr.attribute_id]} / 10` : 'Not Scored'}
//                           </span>
//                         </div>

//                         {/* Interactive Star Rating System */}
//                         <div className="flex gap-1.5 pt-2 flex-wrap">
//                           {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => {
//                             const isSelected = scores[attr.attribute_id] >= value;
//                             return (
//                               <motion.button
//                                 key={value}
//                                 type="button"
//                                 disabled={submitting}
//                                 whileHover={{ scale: 1.2 }}
//                                 whileTap={{ scale: 0.9 }}
//                                 onClick={() => handleScoreChange(attr.attribute_id, value)}
//                                 className={`text-2xl sm:text-3xl transition-all duration-300 outline-none focus-visible:ring-2 rounded-full ${
//                                   isSelected
//                                     ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] scale-110'
//                                     : 'text-surface-secondary hover:text-amber-200 drop-shadow-sm'
//                                 }`}
//                                 title={`${value}/10`}
//                               >
//                                 ★
//                               </motion.button>
//                             );
//                           })}
//                         </div>
//                       </motion.div>
//                     ))}
//                   </div>
//                 </div>

//                 {/* Right Side: Action Panels */}
//                 <div className="space-y-6">
                  
//                   {/* Remarks/Notes Feedback Panel Column */}
//                   <div className="card border-primary/30 bg-gradient-to-b from-surface to-primary/5 p-0 rounded-2xl border shadow-lg overflow-hidden border-t-4 border-t-primary">
//                     <div className="p-5 border-b border-primary/10">
//                       <h3 className="text-sm font-black uppercase tracking-wider text-primary flex items-center gap-2">
//                         📝 Qualitative Feedback
//                       </h3>
//                     </div>
//                     <div className="p-5 space-y-4">
//                       <div className="space-y-2">
//                         <label htmlFor="coachRemarks" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
//                           Session Evaluation Notes
//                         </label>
//                         <textarea
//                           id="coachRemarks"
//                           rows={4}
//                           className="w-full text-sm p-4 rounded-xl bg-background/50 border border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none transition-all shadow-inner placeholder:text-muted-foreground/50"
//                           placeholder="Specify stamina observations, tactical execution notes..."
//                           value={remarks}
//                           disabled={submitting}
//                           onChange={(e) => setRemarks(e.target.value)}
//                         />
//                       </div>

//                       {/* Submission Core Controls */}
//                       <div className="space-y-3 pt-2">
//                         <motion.button
//                           whileHover={{ scale: 1.02 }}
//                           whileTap={{ scale: 0.98 }}
//                           type="button"
//                           onClick={handleSubmitScores}
//                           disabled={submitting}
//                           className="w-full bg-gradient-to-r from-primary to-accent-hover text-primary-foreground disabled:opacity-50 rounded-xl py-3.5 text-sm font-black tracking-wide transition-all shadow-[0_4px_20px_rgba(var(--color-accent-primary),0.3)] hover:shadow-[0_6px_25px_rgba(var(--color-accent-primary),0.4)] flex items-center justify-center gap-2"
//                         >
//                           {submitting ? 'Transmitting Module...' : '📡 Transmit Report to Server'}
//                         </motion.button>
//                         <motion.button
//                           whileHover={{ scale: 1.02 }}
//                           whileTap={{ scale: 0.98 }}
//                           type="button"
//                           onClick={handleDownloadReport}
//                           disabled={submitting}
//                           className="w-full border border-border/60 bg-surface/80 hover:bg-surface text-foreground rounded-xl py-3.5 text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2"
//                         >
//                           📥 Download CSV Summary
//                         </motion.button>
//                       </div>
//                     </div>
//                   </div>

//                   {/* Propose New Attribute Field */}
//                   <div className="card border-purple/30 bg-gradient-to-b from-surface to-purple/5 p-0 rounded-2xl border shadow-lg overflow-hidden border-t-4 border-t-purple">
//                     <div className="p-5 border-b border-purple/10 flex items-center justify-between">
//                       <h4 className="text-[11px] font-black uppercase tracking-wider text-purple flex items-center gap-2">
//                         💡 Propose Metric
//                       </h4>
//                       <button
//                         type="button"
//                         onClick={() => setShowNewProposal(!showNewProposal)}
//                         className="text-purple/80 text-[10px] font-bold uppercase hover:text-purple bg-purple/10 px-2 py-1 rounded-md transition-colors"
//                       >
//                         {showNewProposal ? 'Collapse' : 'Expand Form'}
//                       </button>
//                     </div>

//                     <AnimatePresence>
//                       {showNewProposal && (
//                         <motion.div
//                           initial={{ opacity: 0, height: 0 }} 
//                           animate={{ opacity: 1, height: 'auto' }} 
//                           exit={{ opacity: 0, height: 0 }}
//                           className="overflow-hidden"
//                         >
//                           <form className="p-5 space-y-4" onSubmit={handleProposeAttribute}>
//                             <div>
//                               <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5" htmlFor="newAttrSport">Sport Scope</label>
//                               <select
//                                 id="newAttrSport"
//                                 className="input-field bg-background/50 border-purple/20 focus:border-purple focus:ring-purple/20"
//                                 value={newAttributeForm.sport_id}
//                                 onChange={(e) => setNewAttributeForm({ ...newAttributeForm, sport_id: e.target.value })}
//                                 required
//                               >
//                                 <option value="">Choose Mapping Scope</option>
//                                 {selectedBatch.sport && (
//                                   <option value={selectedBatch.sport_id}>{selectedBatch.sport?.name}</option>
//                                 )}
//                               </select>
//                             </div>
//                             <div>
//                               <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5" htmlFor="newAttrName">Parameter Name</label>
//                               <input
//                                 id="newAttrName"
//                                 type="text"
//                                 className="input-field bg-background/50 border-purple/20 focus:border-purple focus:ring-purple/20"
//                                 placeholder="e.g., Tactical Awareness"
//                                 value={newAttributeForm.name}
//                                 onChange={(e) => setNewAttributeForm({ ...newAttributeForm, name: e.target.value })}
//                                 required
//                               />
//                             </div>
//                             <motion.button
//                               whileHover={{ scale: 1.02 }}
//                               whileTap={{ scale: 0.98 }}
//                               type="submit"
//                               className="w-full bg-purple hover:bg-purple/90 text-white rounded-xl py-2.5 text-xs font-bold transition-all shadow-[0_4px_15px_rgba(167,139,250,0.3)]"
//                             >
//                               Submit For Review
//                             </motion.button>
//                           </form>
//                         </motion.div>
//                       )}
//                     </AnimatePresence>
//                   </div>

//                   {/* Weekly Performance Report */}
//                   <div className="card border-amber-500/30 bg-gradient-to-b from-surface to-amber-500/5 p-0 rounded-2xl border shadow-lg overflow-hidden border-t-4 border-t-amber-500">
//                     <div className="p-5 border-b border-amber-500/10 flex items-center justify-between">
//                       <h4 className="text-[11px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-2">
//                         📅 Weekly Report
//                       </h4>
//                       <button
//                         type="button"
//                         onClick={() => setShowWeeklyReport(!showWeeklyReport)}
//                         className="text-amber-500/80 text-[10px] font-bold uppercase hover:text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md transition-colors"
//                       >
//                         {showWeeklyReport ? 'Collapse' : 'Expand Form'}
//                       </button>
//                     </div>

//                     <AnimatePresence>
//                       {showWeeklyReport && (
//                         <motion.div
//                           initial={{ opacity: 0, height: 0 }} 
//                           animate={{ opacity: 1, height: 'auto' }} 
//                           exit={{ opacity: 0, height: 0 }}
//                           className="overflow-hidden"
//                         >
//                           <form className="p-5 space-y-4" onSubmit={handleSubmitWeeklyReport}>
//                             <div className="grid grid-cols-2 gap-3">
//                               <div>
//                                 <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5" htmlFor="weekStart">Week Start</label>
//                                 <input
//                                   id="weekStart"
//                                   type="date"
//                                   className="input-field bg-background/50 border-amber-500/20 focus:border-amber-500 focus:ring-amber-500/20 px-2"
//                                   value={weeklyReportData.week_start}
//                                   onChange={(e) => setWeeklyReportData({ ...weeklyReportData, week_start: e.target.value })}
//                                   required
//                                 />
//                               </div>
//                               <div>
//                                 <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5" htmlFor="weekEnd">Week End</label>
//                                 <input
//                                   id="weekEnd"
//                                   type="date"
//                                   className="input-field bg-background/50 border-amber-500/20 focus:border-amber-500 focus:ring-amber-500/20 px-2"
//                                   value={weeklyReportData.week_end}
//                                   onChange={(e) => setWeeklyReportData({ ...weeklyReportData, week_end: e.target.value })}
//                                   required
//                                 />
//                               </div>
//                             </div>
//                             <div>
//                               <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5" htmlFor="weeklySummary">Weekly Summary</label>
//                               <textarea
//                                 id="weeklySummary"
//                                 rows={3}
//                                 className="input-field bg-background/50 border-amber-500/20 focus:border-amber-500 focus:ring-amber-500/20 resize-none placeholder:text-muted-foreground/50 text-sm"
//                                 placeholder="Training progress, notable achievements..."
//                                 value={weeklyReportData.summary}
//                                 onChange={(e) => setWeeklyReportData({ ...weeklyReportData, summary: e.target.value })}
//                                 required
//                               />
//                             </div>
//                             <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/20 shadow-inner">
//                               <p className="text-[10px] font-bold uppercase text-amber-600/80 mb-2">Including Current Scores:</p>
//                               <div className="flex flex-wrap gap-1.5">
//                                 {Object.entries(scores).map(([attrId, score]) => {
//                                   const attr = attributes.find(a => a.attribute_id === parseInt(attrId));
//                                   return attr ? (
//                                     <span key={attrId} className="text-[10px] font-bold bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded shadow-sm">
//                                       {attr.name}: {score}
//                                     </span>
//                                   ) : null;
//                                 })}
//                                 {Object.keys(scores).length === 0 && (
//                                   <span className="text-[10px] text-muted-foreground/60 italic font-semibold">No scores recorded yet</span>
//                                 )}
//                               </div>
//                             </div>
//                             <motion.button
//                               whileHover={{ scale: 1.02 }}
//                               whileTap={{ scale: 0.98 }}
//                               type="submit"
//                               disabled={submitting}
//                               className="w-full bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 rounded-xl py-3 text-xs font-bold transition-all shadow-[0_4px_15px_rgba(245,158,11,0.3)]"
//                             >
//                               {submitting ? 'Submitting Report...' : '📤 Submit Weekly Report'}
//                             </motion.button>
//                           </form>
//                         </motion.div>
//                       )}
//                     </AnimatePresence>
//                   </div>
//                 </div>
//               </motion.div>
//             )}

//             {selectedStudent && attributes.length === 0 && (
//               <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card border-border/50 bg-surface/60 backdrop-blur-md p-10 rounded-2xl border text-center shadow-lg">
//                 <div className="w-16 h-16 bg-surface-secondary rounded-full flex items-center justify-center mx-auto mb-4 border border-border shadow-inner text-2xl">📝</div>
//                 <h4 className="text-lg font-bold text-foreground mb-2">No Tracking Attributes</h4>
//                 <p className="text-muted-foreground text-sm font-medium max-w-md mx-auto">
//                   No active tracking attributes are registered for this sport segment yet. Use the "Propose Metric" tool to suggest new criteria vectors.
//                 </p>
//               </motion.div>
//             )}
//           </motion.div>
//         )}
//       </motion.div>
//     </div>
//   );
// }