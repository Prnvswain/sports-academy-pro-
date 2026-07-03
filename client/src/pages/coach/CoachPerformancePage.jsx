import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Loader from '../../components/Loader';
import { coachGet, coachPost } from '../../api/client';

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
      if (Array.isArray(responseData)) {
        setBatches(responseData);
      } else if (responseData && Array.isArray(responseData.data)) {
        setBatches(responseData.data);
      } else if (responseData && Array.isArray(responseData.batches)) {
        setBatches(responseData.batches);
      } else {
        setBatches([]);
      }
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setBatches([]);
    }
  }, []);

  const loadStudents = useCallback(async (batchId) => {
    if (!batchId) {
      setStudents([]);
      return;
    }
    try {
      const result = await coachGet(`/coach/batches/${batchId}`);
      const responseData = result.data;
      if (responseData && Array.isArray(responseData.students)) {
        setStudents(responseData.students);
      } else {
        setStudents([]);
      }
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setStudents([]);
    }
  }, []);

  const loadAttributes = useCallback(async (sportId) => {
    console.log('=== loadAttributes DEBUG ===');
    console.log('sportId received:', sportId, 'type:', typeof sportId);
    
    if (!sportId) {
      console.log('No sportId provided, setting attributes to empty');
      setAttributes([]);
      return;
    }
    try {
      const url = `/coach/performance/attributes?sport_id=${sportId}&status=APPROVED`;
      console.log('API URL:', url);
      
      const result = await coachGet(url);
      console.log('API result:', result);
      console.log('result.data:', result.data);
      
      const responseData = result.data;
      if (Array.isArray(responseData)) {
        console.log('Setting attributes from responseData array, count:', responseData.length);
        setAttributes(responseData);
      } else if (responseData && Array.isArray(responseData.data)) {
        console.log('Setting attributes from responseData.data array, count:', responseData.data.length);
        setAttributes(responseData.data);
      } else {
        console.log('No array found in response, setting attributes to empty');
        setAttributes([]);
      }
    } catch (error) {
      console.error('loadAttributes error:', error);
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
      // Fallback reset for a fresh evaluation log entry context
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
  console.log("Selected Batch:", batch);
  console.log("batch.sport_id:", batch.sport_id);
  console.log("batch.sport:", batch.sport);

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
          remarks: remarks.trim() || undefined // Attached coach evaluation remarks payload cleanly
        }),
      );

      await Promise.all(promises);
      setMessage({ text: 'Performance evaluations safely synced to Admin portal.', type: 'success' });
      setRemarks('');
      loadStudentPerformance(selectedStudent.student_id);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
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
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="bg-surface text-foreground min-h-screen space-y-6 p-6 w-full overflow-x-hidden">
      <div>
        <h2 className="from-accent bg-gradient-to-r to-emerald-500 bg-clip-text text-3xl font-black tracking-tight text-transparent">
          Coach Assessment Hub
        </h2>
        <p className="text-muted mt-1 text-sm">Evaluate active batch training logs and parameter metrics.</p>
      </div>

      {message.text && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className={`alert-${message.type === 'success' ? 'success' : 'error'} border-current/10 rounded-xl border p-4 text-sm font-semibold`}
        >
          {message.text}
        </motion.div>
      )}

      {/* Batch Selection */}
      <div className="card border-border bg-surface-secondary/50 p-6 rounded-xl border shadow-xs">
        <h3 className="text-lg font-black tracking-tight mb-4">Assigned Training Batches</h3>
        {batches.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {batches.map((batch) => (
              <button
                key={batch.batch_id}
                type="button"
                onClick={() => handleBatchSelect(batch)}
                className={`group rounded-xl border p-5 text-left transition-all duration-200 ${
                  selectedBatch?.batch_id === batch.batch_id
                    ? 'border-accent bg-accent/5 ring-2 ring-accent/20'
                    : 'border-border bg-surface hover:border-accent/40'
                }`}
              >
                <div className="font-black text-base tracking-tight group-hover:text-accent transition-colors">{batch.name}</div>
                <div className="text-muted mt-1.5 text-xs font-medium flex items-center gap-1.5">
                  <span>⚽ {batch.sport?.name || '—'}</span>
                  <span>•</span>
                  <span>👥 {batch.students?.length ?? 0} Trainees</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-muted text-sm border border-dashed border-border p-4 rounded-xl text-center font-medium">No training batches currently assigned.</p>
        )}
      </div>

      {selectedBatch && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Student Selection */}
          <div className="card border-border bg-surface-secondary/50 p-6 rounded-xl border shadow-xs">
            <h3 className="text-lg font-black tracking-tight mb-4">Select Athlete Profile</h3>
            {students.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {students.map((student) => (
                  <button
                    key={student.student_id}
                    type="button"
                    onClick={() => handleStudentSelect(student)}
                    className={`rounded-xl border p-4 text-left transition-all duration-200 ${
                      selectedStudent?.student_id === student.student_id
                        ? 'border-accent bg-accent/5 ring-2 ring-accent/20'
                        : 'border-border bg-surface hover:border-accent/40'
                    }`}
                  >
                    <div className="font-bold text-sm tracking-tight">👤 {student.name}</div>
                    <div className="text-muted mt-1 text-xs">{student.sport?.name || selectedBatch.sport?.name}</div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm border border-dashed border-border p-4 rounded-xl text-center font-medium">No student profiles registered in this batch.</p>
            )}
          </div>

          {selectedStudent && attributes.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-3 items-start">
              {/* Performance Evaluation Matrix Column */}
              <div className="card border-border bg-surface-secondary/30 p-6 rounded-xl border shadow-xs lg:col-span-2 space-y-4">
                <h3 className="text-lg font-black tracking-tight border-b border-border pb-3">
                  Metrics Scoring Ledger · <span className="text-accent">{selectedStudent.name}</span>
                </h3>
                <div className="space-y-4">
                  {attributes.map((attr) => (
                    <div
                      key={attr.attribute_id}
                      className="bg-surface border-border rounded-xl border p-4 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <label className="text-sm font-black tracking-tight text-foreground">{attr.name}</label>
                          <div className="text-muted mt-0.5 text-[11px] font-medium">
                            Category: {attr.sport?.name || 'Core Parameter'}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-md">
                          Score: {scores[attr.attribute_id] || '-'} / 10
                        </span>
                      </div>

                      {/* Interactive 1-10 Gauge Grid */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                          <button
                            key={value}
                            type="button"
                            disabled={submitting}
                            onClick={() => handleScoreChange(attr.attribute_id, value)}
                            className={`h-8 w-8 text-xs font-bold rounded-lg transition-all duration-200 ${
                              scores[attr.attribute_id] === value
                                ? 'bg-accent text-foreground scale-105 shadow-md shadow-accent/20'
                                : 'bg-surface-secondary border-border/60 hover:border-accent border text-muted hover:text-foreground'
                            }`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Remarks/Notes Feedback Panel Column */}
              <div className="space-y-6">
                <div className="card border-border bg-surface-secondary/30 p-6 rounded-xl border shadow-xs space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-wider text-muted">Qualitative Feedback</h3>
                  <div className="space-y-2">
                    <label htmlFor="coachRemarks" className="text-xs font-semibold text-foreground">
                      Session Evaluation Notes
                    </label>
                    <textarea
                      id="coachRemarks"
                      rows={4}
                      className="w-full text-xs p-3 rounded-xl bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-hidden resize-none transition-all"
                      placeholder="Specify stamina observations, tactical execution notes, or disciplinary flags..."
                      value={remarks}
                      disabled={submitting}
                      onChange={(e) => setRemarks(e.target.value)}
                    />
                  </div>

                  {/* Submission Core Controls */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSubmitScores}
                      disabled={submitting}
                      className="w-full bg-accent hover:bg-opacity-90 text-foreground disabled:opacity-50 rounded-xl py-3 text-xs font-black tracking-tight transition-all flex items-center justify-center gap-2"
                    >
                      {submitting ? 'Transmitting Module...' : '📡 Transmit Report to Admin Portal'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadReport}
                      disabled={submitting}
                      className="w-full border border-border bg-surface hover:bg-surface-secondary text-foreground rounded-xl py-3 text-xs font-bold transition-all"
                    >
                      📥 Download CSV Summary
                    </button>
                  </div>
                </div>

                {/* Propose New Attribute Field */}
                <div className="card border-border bg-surface-secondary/30 p-5 rounded-xl border shadow-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-muted">Propose Custom Metric</h4>
                    <button
                      type="button"
                      onClick={() => setShowNewProposal(!showNewProposal)}
                      className="text-accent text-xs font-bold hover:underline"
                    >
                      {showNewProposal ? 'Collapse' : 'Expand Form'}
                    </button>
                  </div>

                  <AnimatePresence>
                    {showNewProposal && (
                      <motion.form 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }} 
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 pt-3" 
                        onSubmit={handleProposeAttribute}
                      >
                        <div>
                          <label className="text-[11px] font-semibold block mb-1 text-muted" htmlFor="newAttrSport">Sport Scope</label>
                          <select
                            id="newAttrSport"
                            className="w-full p-2.5 rounded-lg bg-surface border border-border text-xs outline-hidden focus:border-accent"
                            value={newAttributeForm.sport_id}
                            onChange={(e) => setNewAttributeForm({ ...newAttributeForm, sport_id: e.target.value })}
                            required
                          >
                            <option value="">Choose Mapping Scope</option>
                            {selectedBatch.sport && (
                              <option value={selectedBatch.sport_id}>{selectedBatch.sport?.name}</option>
                            )}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold block mb-1 text-muted" htmlFor="newAttrName">Parameter Name</label>
                          <input
                            id="newAttrName"
                            type="text"
                            className="w-full p-2.5 rounded-lg bg-surface border border-border text-xs outline-hidden focus:border-accent"
                            placeholder="e.g., Tactical Awareness, Reflex Velocity"
                            value={newAttributeForm.name}
                            onChange={(e) => setNewAttributeForm({ ...newAttributeForm, name: e.target.value })}
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-surface border border-accent text-accent hover:bg-accent/5 rounded-lg py-2 text-xs font-bold transition-all"
                        >
                          Submit For Review
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>

                {/* Weekly Performance Report */}
                <div className="card border-border bg-surface-secondary/30 p-5 rounded-xl border shadow-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-muted">📅 Weekly Performance Report</h4>
                    <button
                      type="button"
                      onClick={() => setShowWeeklyReport(!showWeeklyReport)}
                      className="text-accent text-xs font-bold hover:underline"
                    >
                      {showWeeklyReport ? 'Collapse' : 'Expand Form'}
                    </button>
                  </div>

                  <AnimatePresence>
                    {showWeeklyReport && (
                      <motion.form 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }} 
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 pt-3" 
                        onSubmit={handleSubmitWeeklyReport}
                      >
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold block mb-1 text-muted" htmlFor="weekStart">Week Start</label>
                            <input
                              id="weekStart"
                              type="date"
                              className="w-full p-2.5 rounded-lg bg-surface border border-border text-xs outline-hidden focus:border-accent"
                              value={weeklyReportData.week_start}
                              onChange={(e) => setWeeklyReportData({ ...weeklyReportData, week_start: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold block mb-1 text-muted" htmlFor="weekEnd">Week End</label>
                            <input
                              id="weekEnd"
                              type="date"
                              className="w-full p-2.5 rounded-lg bg-surface border border-border text-xs outline-hidden focus:border-accent"
                              value={weeklyReportData.week_end}
                              onChange={(e) => setWeeklyReportData({ ...weeklyReportData, week_end: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold block mb-1 text-muted" htmlFor="weeklySummary">Weekly Summary</label>
                          <textarea
                            id="weeklySummary"
                            rows={3}
                            className="w-full p-2.5 rounded-lg bg-surface border border-border text-xs outline-hidden focus:border-accent resize-none"
                            placeholder="Provide a summary of the week's training progress, notable achievements, and areas for improvement..."
                            value={weeklyReportData.summary}
                            onChange={(e) => setWeeklyReportData({ ...weeklyReportData, summary: e.target.value })}
                            required
                          />
                        </div>
                        <div className="bg-surface/50 p-3 rounded-lg border border-border/50">
                          <p className="text-[10px] text-muted mb-1">Current scores will be included in the report:</p>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(scores).map(([attrId, score]) => {
                              const attr = attributes.find(a => a.attribute_id === parseInt(attrId));
                              return attr ? (
                                <span key={attrId} className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded">
                                  {attr.name}: {score}
                                </span>
                              ) : null;
                            })}
                            {Object.keys(scores).length === 0 && (
                              <span className="text-[10px] text-muted italic">No scores recorded yet</span>
                            )}
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="w-full bg-accent hover:bg-accent/90 text-foreground disabled:opacity-50 rounded-lg py-2 text-xs font-bold transition-all"
                        >
                          {submitting ? 'Submitting Report...' : '📤 Submit Weekly Report'}
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}

          {selectedStudent && attributes.length === 0 && (
            <div className="card border-border bg-surface-secondary p-6 rounded-xl border text-center">
              <p className="text-muted text-sm font-medium">
                No active tracking attributes registered for this sport segment. Use the form above to suggest criteria vectors.
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}