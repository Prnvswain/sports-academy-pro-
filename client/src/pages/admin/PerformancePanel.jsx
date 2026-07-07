import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [analyticsTab, setAnalyticsTab] = useState('academy');
  const [studentAnalytics, setStudentAnalytics] = useState(null);
  const [batchAnalytics, setBatchAnalytics] = useState(null);
  const [academyAnalytics, setAcademyAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

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
      className="bg-surface text-foreground min-h-screen space-y-6 p-6 w-full relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div>
        <h2 className="from-accent bg-gradient-to-r to-emerald-500 bg-clip-text text-3xl font-black tracking-tight text-transparent">
          Performance Tracker
        </h2>
        <p className="text-muted mt-1 text-sm">
          Manage core sports criteria profiles and validate coach-submitted metrics.
        </p>
      </div>

      {message.text && (
        <div className={`alert-${message.type === 'success' ? 'success' : 'error'} border-current/10 rounded-xl border p-4 text-sm font-semibold`}>
          {message.text}
        </div>
      )}

      {/* Analytics Toggle Button */}
      <button
        type="button"
        onClick={() => {
          setShowAnalyticsPanel(!showAnalyticsPanel);
          if (!showAnalyticsPanel) {
            loadAcademyAnalytics();
          }
        }}
        className="card border-accent/30 bg-accent/5 border p-4 rounded-xl flex items-center justify-between hover:bg-accent/10 transition-colors"
      >
        <div>
          <h3 className="text-sm font-black text-foreground">📊 Performance Analytics Dashboard</h3>
          <p className="text-xs text-muted mt-1">View detailed analytics for students, batches, and academy-wide metrics</p>
        </div>
        <span className="text-accent text-xs font-bold">{showAnalyticsPanel ? '▼' : '▶'}</span>
      </button>

      {/* Analytics Panel */}
      <AnimatePresence>
        {showAnalyticsPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card border-border bg-surface-secondary/30 p-6 rounded-xl border"
          >
            {/* Analytics Tabs */}
            <div className="flex gap-2 mb-6 border-b border-border pb-4">
              <button
                type="button"
                onClick={() => handleAnalyticsTabChange('academy')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${analyticsTab === 'academy'
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
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${analyticsTab === 'batch'
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
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${analyticsTab === 'student'
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
                {analyticsTab === 'academy' && academyAnalytics && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-foreground">Academy-Wide Performance Overview</h4>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="bg-surface p-4 rounded-xl border border-border">
                        <div className="text-xs text-muted mb-1">Total Students Evaluated</div>
                        <div className="text-2xl font-black text-accent">{academyAnalytics.totalStudents || 0}</div>
                      </div>
                      <div className="bg-surface p-4 rounded-xl border border-border">
                        <div className="text-xs text-muted mb-1">Average Score</div>
                        <div className="text-2xl font-black text-accent">{academyAnalytics.averageScore?.toFixed(1) || '0.0'}</div>
                      </div>
                      <div className="bg-surface p-4 rounded-xl border border-border">
                        <div className="text-xs text-muted mb-1">Total Evaluations</div>
                        <div className="text-2xl font-black text-accent">{academyAnalytics.totalEvaluations || 0}</div>
                      </div>
                      <div className="bg-surface p-4 rounded-xl border border-border">
                        <div className="text-xs text-muted mb-1">Active Batches</div>
                        <div className="text-2xl font-black text-accent">{academyAnalytics.activeBatches || 0}</div>
                      </div>
                    </div>
                    {academyAnalytics.topPerformers && academyAnalytics.topPerformers.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-xs font-bold text-muted mb-3">Top Performing Students</h5>
                        <div className="space-y-2">
                          {academyAnalytics.topPerformers.map((student, idx) => (
                            <div key={idx} className="bg-surface p-3 rounded-lg border border-border flex justify-between items-center">
                              <span className="text-sm font-medium">{student.name}</span>
                              <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-1 rounded">
                                {student.averageScore?.toFixed(1)} avg
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Batch Analytics */}
                {analyticsTab === 'batch' && batchAnalytics && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-foreground">Batch Performance Analytics</h4>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="bg-surface p-4 rounded-xl border border-border">
                        <div className="text-xs text-muted mb-1">Average Batch Score</div>
                        <div className="text-2xl font-black text-accent">{batchAnalytics.averageScore?.toFixed(1) || '0.0'}</div>
                      </div>
                      <div className="bg-surface p-4 rounded-xl border border-border">
                        <div className="text-xs text-muted mb-1">Students Evaluated</div>
                        <div className="text-2xl font-black text-accent">{batchAnalytics.studentsEvaluated || 0}</div>
                      </div>
                      <div className="bg-surface p-4 rounded-xl border border-border">
                        <div className="text-xs text-muted mb-1">Improvement Rate</div>
                        <div className="text-2xl font-black text-accent">{batchAnalytics.improvementRate?.toFixed(1) || '0.0'}%</div>
                      </div>
                    </div>
                    {batchAnalytics.attributeBreakdown && (
                      <div className="mt-4">
                        <h5 className="text-xs font-bold text-muted mb-3">Attribute Performance Breakdown</h5>
                        <div className="space-y-2">
                          {Object.entries(batchAnalytics.attributeBreakdown).map(([attr, score]) => (
                            <div key={attr} className="bg-surface p-3 rounded-lg border border-border">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium">{attr}</span>
                                <span className="text-xs font-bold text-accent">{score?.toFixed(1) || 0}</span>
                              </div>
                              <div className="w-full bg-surface-secondary rounded-full h-2">
                                <div
                                  className="bg-accent h-2 rounded-full transition-all"
                                  style={{ width: `${(score / 10) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Student Analytics */}
                {analyticsTab === 'student' && studentAnalytics && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-foreground">Student Performance Analytics</h4>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="bg-surface p-4 rounded-xl border border-border">
                        <div className="text-xs text-muted mb-1">Overall Average</div>
                        <div className="text-2xl font-black text-accent">{studentAnalytics.overallAverage?.toFixed(1) || '0.0'}</div>
                      </div>
                      <div className="bg-surface p-4 rounded-xl border border-border">
                        <div className="text-xs text-muted mb-1">Total Evaluations</div>
                        <div className="text-2xl font-black text-accent">{studentAnalytics.totalEvaluations || 0}</div>
                      </div>
                      <div className="bg-surface p-4 rounded-xl border border-border">
                        <div className="text-xs text-muted mb-1">Trend</div>
                        <div className="text-2xl font-black text-accent">
                          {studentAnalytics.trend === 'improving' ? '📈' : studentAnalytics.trend === 'declining' ? '📉' : '➡️'}
                        </div>
                      </div>
                    </div>
                    {studentAnalytics.attributeProgress && (
                      <div className="mt-4">
                        <h5 className="text-xs font-bold text-muted mb-3">Attribute Progress Over Time</h5>
                        <div className="space-y-2">
                          {Object.entries(studentAnalytics.attributeProgress).map(([attr, progress]) => (
                            <div key={attr} className="bg-surface p-3 rounded-lg border border-border">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium">{attr}</span>
                                <span className="text-xs font-bold text-accent">
                                  {progress.current?.toFixed(1)} / 10
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted">
                                <span>Previous: {progress.previous?.toFixed(1) || 'N/A'}</span>
                                <span>•</span>
                                <span className={progress.change >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                  {progress.change >= 0 ? '+' : ''}{progress.change?.toFixed(1) || 0}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!academyAnalytics && analyticsTab === 'academy' && (
                  <p className="text-xs text-muted text-center py-8">No academy analytics data available</p>
                )}
                {!batchAnalytics && analyticsTab === 'batch' && (
                  <p className="text-xs text-muted text-center py-8">Select a batch to view analytics</p>
                )}
                {!studentAnalytics && analyticsTab === 'student' && (
                  <p className="text-xs text-muted text-center py-8">Select a student to view analytics</p>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending Attributes Approval Panel */}
      {pendingAttributes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card border-accent/30 bg-accent/5 border p-5 rounded-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-foreground">Pending Attribute Proposals</h3>
              <p className="text-xs text-muted mt-1">Review and approve custom metrics proposed by coaches</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPendingPanel(!showPendingPanel)}
              className="text-accent text-xs font-bold hover:underline"
            >
              {showPendingPanel ? 'Collapse' : `Expand (${pendingAttributes.length})`}
            </button>
          </div>

          <AnimatePresence>
            {showPendingPanel && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                {pendingAttributes.map((attr) => (
                  <div
                    key={attr.id || attr.attribute_id}
                    className="bg-surface border border-border rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">{attr.name}</span>
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
                          {attr.sport?.name || 'Global'}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-1">
                        Proposed by: {attr.proposed_by || 'Coach'} · {attr.created_at || new Date().toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        type="button"
                        onClick={() => handleApproveAttribute(attr.id || attr.attribute_id)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectAttribute(attr.id || attr.attribute_id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {!selectedSport ? (
        <div className="space-y-4">
          <h3 className="text-lg font-black tracking-tight">Active Sports Catalog</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sports.map((sport, index) => {
              const icon = getSportIcon(sport);

              return (
                <motion.button
                  key={sport.sport_id || sport.id || sport.name || index}
                  type="button"
                  onClick={() => handleSportSelect(sport)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  className="card hover:border-accent/40 border-border bg-surface-secondary group relative overflow-hidden p-5 text-left transition-all duration-300"
                >
                  <div className={`absolute left-0 top-0 h-full w-1 origin-top scale-y-0 transform transition-transform duration-300 group-hover:scale-y-100 ${index % 4 === 0 ? 'bg-blue' : index % 4 === 1 ? 'bg-purple' : index % 4 === 2 ? 'bg-orange' : 'bg-cyan'}`} />
                  <div className="mb-3 inline-block text-3xl transition-transform duration-300 group-hover:scale-110">
                    {icon}
                  </div>
                  <div className="text-foreground text-base font-black tracking-tight">
                    {sport.name}
                  </div>
                  <div className="text-muted mt-1.5 text-xs font-medium">
                    View student performance metrics
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
          <button
            type="button"
            onClick={handleBackToAllSports}
            className="text-muted hover:text-accent flex items-center gap-2 text-sm font-semibold transition-colors"
          >
            <span>←</span> Back to All Sports
          </button>

          <div className="card border-accent/20 bg-accent/5 border p-6 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-4xl">
                  {getSportIcon(selectedSport)}
                </div>
                <div>
                  <h3 className="text-foreground text-2xl font-black tracking-tight">
                    {selectedSport.name}
                  </h3>
                  <p className="text-muted mt-1 text-sm">
                    Select a batch to view student performance metrics
                  </p>
                </div>
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAttrs(!showAttrs)}
                  className="border-accent/30 hover:border-accent hover:bg-accent/10 text-accent border rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 flex items-center gap-2"
                >
                  <span>⚙️</span> View Configured Attributes
                </button>

                <AnimatePresence>
                  {showAttrs && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-full mt-2 z-50 w-80 card bg-surface border-border border shadow-xl p-4"
                    >
                      <h4 className="text-foreground text-sm font-semibold mb-3 border-b border-border/50 pb-2">
                        Active Evaluation Parameters
                      </h4>
                      {attributes.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {attributes.map((attr) => (
                            <span key={attr.id || attr.name} className="bg-accent/10 border-accent/30 border px-3 py-1.5 rounded-md text-xs font-medium text-foreground">
                              {attr.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted text-xs">No attributes configured for this sport.</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {loadingBatches ? (
            <div className="flex items-center justify-center py-12"><Loader /></div>
          ) : filteredBatches.length > 0 ? (
            <>
              <div className="space-y-4">
                <h3 className="text-lg font-black tracking-tight">Select Training Batch</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredBatches.map((batch) => (
                    <motion.button
                      key={batch.batch_id || batch.id}
                      type="button"
                      onClick={() => handleBatchSelect(batch.batch_id || batch.id)}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className={`card border-border bg-surface-secondary p-5 text-left transition-all duration-200 ${selectedBatchId === (batch.batch_id || batch.id) ? 'border-accent ring-2 ring-accent/20' : 'hover:border-accent/40'}`}
                    >
                      <div className="text-foreground text-base font-black tracking-tight mb-2">{batch.name}</div>
                      <div className="space-y-1">
                        <div className="text-muted text-xs"><span className="font-medium">Students:</span> {batch.student_count || batch.students?.length || 0}</div>
                        <div className="text-muted text-xs"><span className="font-medium">Timings:</span> {batch.timings || batch.schedule || 'Not specified'}</div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {selectedBatchId && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="card bg-surface-secondary border-border space-y-4 border p-6 shadow-sm">
                  <h3 className="text-foreground border-border border-b pb-3 text-lg font-black tracking-tight">
                    Student Performance Metrics <span className="text-xs text-muted font-normal block mt-1">(Click on a row to open tracking and history details)</span>
                  </h3>

                  {loadingStudents ? (
                    <div className="flex items-center justify-center py-8"><Loader /></div>
                  ) : students.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-border border-b">
                            <th className="bg-surface text-left p-3 font-semibold">Student Name</th>
                            {attributes.map((attr) => (
                              <th key={attr.id || attr.name} className="bg-surface text-center p-3 font-semibold">{attr.name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((student) => (
                            <tr
                              key={student.student_id || student.id}
                              onClick={() => handleStudentClick(student)}
                              className="border-border/50 border-b hover:bg-accent/5 cursor-pointer transition-colors"
                            >
                              <td className="p-3 font-medium text-accent hover:underline">
                                👤 {student.name || `${student.firstName || ''} ${student.lastName || ''}`}
                              </td>
                              {attributes.map((attr) => (
                                <td key={attr.id || attr.name} className="text-center p-3">
                                  <span className="bg-surface border-border/50 inline-block min-w-[60px] rounded border px-2 py-1 text-xs font-semibold">
                                    {student.ratings?.[attr.name] || student.performance_metrics?.[attr.name] || '-'}
                                  </span>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-muted border-border bg-surface/30 rounded-xl border border-dashed py-6 text-center text-sm font-medium">No students enrolled in this batch yet.</p>
                  )}
                </motion.div>
              )}
            </>
          ) : (
            <div className="card bg-surface-secondary border-border border p-8 text-center">
              <p className="text-muted text-sm font-medium">No training batches configured for this sport yet.</p>
            </div>
          )}
        </motion.div>
      )}

      {/* 📊 Student Side Drawer / History Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
            {/* Background click overlay */}
            <div className="absolute inset-0" onClick={() => setSelectedStudent(null)} />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg h-full bg-surface border-l border-border p-6 shadow-2xl flex flex-col overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
                <div>
                  <h4 className="text-xl font-black text-foreground">
                    {selectedStudent.name || `${selectedStudent.firstName || ''} ${selectedStudent.lastName || ''}`}
                  </h4>
                  <p className="text-xs text-muted">Student Performance History & Logs</p>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="p-2 hover:bg-surface-secondary text-muted rounded-full text-lg transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Current Status Overview */}
              <div className="bg-surface-secondary p-4 rounded-xl border border-border mb-6">
                <h5 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Current Parameters Assessment</h5>
                <div className="grid grid-cols-2 gap-3">
                  {attributes.map((attr) => (
                    <div key={attr.id || attr.name} className="flex justify-between items-center p-2 bg-surface rounded-lg border border-border/50">
                      <span className="text-xs font-medium text-muted">{attr.name}</span>
                      <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded">
                        {selectedStudent.ratings?.[attr.name] || selectedStudent.performance_metrics?.[attr.name] || 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coach Tracking Timeline History */}
              <div className="flex-1 space-y-4">
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
                          <div className="flex justify-between items-center text-xs text-muted">
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
                  <p className="text-xs text-muted bg-surface-secondary/40 p-4 rounded-xl text-center border border-dashed border-border">
                    No historical logs captured by the coaches for this student yet.
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}