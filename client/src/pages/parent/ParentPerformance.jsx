import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Loader from '../../components/Loader';
import { parentGet } from '../../api/client';
import { useActiveStudent } from '../../context/ActiveStudentContext';
import { Activity, Target, CalendarCheck, TrendingUp, Trophy, Flame, Heart, Clock, AlertCircle } from 'lucide-react';

export default function ParentPerformance() {
  const navigate = useNavigate();
  const { activeStudent, loading: studentLoading, students, switchStudent } = useActiveStudent();
  const [studentDashboardData, setStudentDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [availableAttributes, setAvailableAttributes] = useState([]);
  const [selectedAttributes, setSelectedAttributes] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  const loadStudentDashboard = async (childId) => {
    if (!childId) return;
    try {
      setLoadingDashboard(true);
      const [historyResult, analyticsResult, dashboardResult] = await Promise.all([
        parentGet(`/parent/children/${childId}/performance/history`),
        parentGet(`/parent/children/${childId}/performance/analytics`),
        parentGet(`/parent/children/${childId}/performance/dashboard`)
      ]);
      
      setStudentDashboardData({
        history: historyResult.data?.assessments || [],
        analytics: analyticsResult.data || analyticsResult,
        dashboard: dashboardResult.data || null
      });
      
      const allAttributes = new Set();
      historyResult.data?.assessments?.forEach(assessment => {
        assessment.scores?.forEach(score => {
          allAttributes.add(score.attribute.name);
        });
      });
      
      const attributesArray = Array.from(allAttributes);
      setAvailableAttributes(attributesArray);
      setSelectedAttributes(attributesArray);
    } catch (error) {
      console.error('Error loading student dashboard:', error);
      setMessage({ text: 'Failed to load student dashboard', type: 'error' });
    } finally {
      setLoadingDashboard(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('[ParentPerformance] activeStudent changed:', activeStudent);
    if (activeStudent) {
      console.log('[ParentPerformance] Loading dashboard for student:', activeStudent.student_id);
      loadStudentDashboard(activeStudent.student_id);
      setSelectedAssessment(null);
    } else if (!studentLoading) {
      setLoading(false);
    }
  }, [activeStudent, studentLoading]);

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
    const bests = {};
    studentDashboardData.history.forEach(assessment => {
      assessment.scores?.forEach(score => {
        const attrName = score.attribute.name;
        if (!bests[attrName] || score.score > bests[attrName]) {
          bests[attrName] = score.score;
        }
      });
    });
    return bests;
  };

  const handleAttributeToggle = (attribute) => {
    setSelectedAttributes(prev => {
      if (prev.includes(attribute)) {
        return prev.filter(a => a !== attribute);
      } else {
        return [...prev, attribute];
      }
    });
  };

  const prepareGraphData = () => {
    if (!studentDashboardData?.history) return [];
    
    // Sort chronologically (oldest first)
    const sortedAssessments = [...studentDashboardData.history].sort(
      (a, b) => new Date(a.assessment_date) - new Date(b.assessment_date)
    );

    // Apply date range filter
    const now = new Date();
    const filteredAssessments = sortedAssessments.filter(assessment => {
      if (dateRangeFilter === 'all') return true;
      const date = new Date(assessment.assessment_date);
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= parseInt(dateRangeFilter);
    });

    return filteredAssessments.map(assessment => {
      const dataPoint = {
        date: new Date(assessment.assessment_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        Overall: parseFloat(calculateAverageRating(assessment.scores))
      };
      
      assessment.scores?.forEach(score => {
        dataPoint[score.attribute.name] = score.score;
      });
      
      return dataPoint;
    });
  };

  if (loading) return <Loader />;

  const overallAvg = studentDashboardData?.analytics?.overallAverage || 0;
  const technicalAvg = studentDashboardData?.analytics?.technicalAverage || 0;
  const physicalAvg = studentDashboardData?.analytics?.physicalAverage || 0;
  const behaviourAvg = studentDashboardData?.analytics?.behaviourAverage || 0;
  const attendanceRate = studentDashboardData?.dashboard?.attendanceRate || 0;

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto font-sans text-left">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
            <Trophy className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Performance
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your child's training progress and performance
            </p>
          </div>
        </div>

        {/* Child Selection */}
        {students && students.length > 1 && (
          <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-1 border border-slate-200 dark:border-slate-700/50 shadow-sm relative z-10">
            {students.map(child => (
              <button
                key={child.student_id}
                onClick={() => switchStudent(child)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                  activeStudent?.student_id === child.student_id
                    ? 'bg-white dark:bg-slate-700 text-primary shadow-md shadow-black/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-slate-700/30'
                }`}
              >
                {child.name}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {message.text && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {message.text}
        </div>
      )}

      {loadingDashboard ? (
        <div className="py-20 flex justify-center">
          <Loader />
        </div>
      ) : activeStudent && studentDashboardData ? (
        <div className="space-y-6">
          {/* Student Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-5 shadow-sm"
          >
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-primary/20 shrink-0">
                {activeStudent.profile_photo ? (
                  <img src={activeStudent.profile_photo} alt={activeStudent.name} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  activeStudent.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'ST'
                )}
              </div>

              {/* Student Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-extrabold text-foreground">{activeStudent.name}</h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {activeStudent.sport?.name && (
                        <span className="font-medium">{activeStudent.sport.name}</span>
                      )}
                      {activeStudent.batch?.name && (
                        <>
                          <span>•</span>
                          <span className="font-medium">{activeStudent.batch.name}</span>
                        </>
                      )}
                    </div>
                    {activeStudent.coach?.name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Coach: <span className="font-semibold text-foreground">{activeStudent.coach.name}</span>
                      </p>
                    )}
                  </div>

                  {/* Status Badge */}
                  {activeStudent.status && (
                    <div className="shrink-0">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        activeStudent.status === 'ACTIVE' 
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        {activeStudent.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
          {/* Performance Overview KPI Cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Overall Performance', value: overallAvg.toFixed(1), max: '/10', icon: Trophy, color: 'text-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20', bgGradient: 'from-yellow-500 to-yellow-600' },
              { label: 'Technical Score', value: technicalAvg.toFixed(1), max: '/10', icon: Target, color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20', bgGradient: 'from-blue-500 to-blue-600' },
              { label: 'Physical Score', value: physicalAvg.toFixed(1), max: '/10', icon: Flame, color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-900/20', bgGradient: 'from-orange-500 to-orange-600' },
              { label: 'Behaviour Score', value: behaviourAvg.toFixed(1), max: '/10', icon: Heart, color: 'text-rose-500', bgColor: 'bg-rose-50 dark:bg-rose-900/20', bgGradient: 'from-rose-500 to-rose-600' },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                  className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-2xl font-black text-foreground tracking-tight">
                      {stat.value}
                      {stat.max && <span className="text-[10px] text-muted-foreground font-semibold ml-0.5">{stat.max}</span>}
                    </p>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm shrink-0 ${stat.bgColor}`}>
                      <Icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Performance Trend Chart */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-border/50">
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Performance Trend</h3>
                <p className="text-[10px] text-muted-foreground">Historical assessment rating progression</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 self-end sm:self-center">
                <div className="flex flex-wrap gap-1">
                  {availableAttributes.map(attr => (
                    <label
                      key={attr}
                      className={`cursor-pointer px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all select-none ${
                        selectedAttributes.includes(attr)
                          ? 'bg-primary/10 text-primary border-primary/20'
                          : 'bg-muted/40 text-muted-foreground border-border/80 hover:bg-muted'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={selectedAttributes.includes(attr)}
                        onChange={() => handleAttributeToggle(attr)}
                      />
                      {attr}
                    </label>
                  ))}
                </div>

                <select
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value)}
                  className="input-field py-1.5 px-3 text-[10px] w-28 bg-muted/40 font-bold"
                >
                  <option value="all">All Records</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 3 Months</option>
                </select>
              </div>
            </div>

            <div className="h-[280px] w-full text-xs">
              {prepareGraphData().length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <TrendingUp className="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-semibold text-muted-foreground">No performance assessments yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Your performance history will appear here after your coach records an assessment.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={prepareGraphData()} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--theme-border, #e2e8f0)" />
                    <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                    <YAxis domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                    <Line type="monotone" dataKey="Overall" stroke="var(--theme-primary, #10b981)" strokeWidth={3.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    {selectedAttributes.map((attr, idx) => (
                      <Line key={attr} type="monotone" dataKey={attr} stroke={['#3b82f6', '#8b5cf6', '#f97316', '#ec4899', '#06b6d4'][idx % 5]} strokeWidth={2} dot={{ r: 0 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* Performance Attributes Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Attributes */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4"
            >
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Performance Attributes</h3>
                <p className="text-[10px] text-muted-foreground">Latest assessment scores</p>
              </div>

              <div className="space-y-3">
                {studentDashboardData?.history?.[0]?.scores?.map((score, index) => (
                  <div key={score.score_id || index} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-foreground">{score.attribute?.name || 'Attribute'}</span>
                      <span className="font-bold text-foreground">{score.score} <span className="text-muted-foreground font-normal">/10</span></span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500"
                        style={{ width: `${(score.score / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                {(!studentDashboardData?.history?.[0]?.scores || studentDashboardData.history[0].scores.length === 0) && (
                  <div className="text-center py-6">
                    <Target className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No attribute scores recorded yet</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Latest Assessment Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4"
            >
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Latest Assessment</h3>
                <p className="text-[10px] text-muted-foreground">Most recent evaluation details</p>
              </div>

              {studentDashboardData?.history?.[0] ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-muted/30 border border-border/50 rounded-lg">
                      <p className="text-[9px] text-muted-foreground uppercase font-bold">Date</p>
                      <p className="font-semibold text-foreground mt-0.5">
                        {new Date(studentDashboardData.history[0].assessment_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="p-3 bg-muted/30 border border-border/50 rounded-lg">
                      <p className="text-[9px] text-muted-foreground uppercase font-bold">Coach</p>
                      <p className="font-semibold text-foreground mt-0.5">
                        {studentDashboardData.history[0].coach?.name || 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-muted/30 border border-border/50 rounded-lg">
                      <p className="text-[9px] text-muted-foreground uppercase font-bold">Sport</p>
                      <p className="font-semibold text-foreground mt-0.5">
                        {activeStudent?.sport?.name || 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-muted/30 border border-border/50 rounded-lg">
                      <p className="text-[9px] text-muted-foreground uppercase font-bold">Batch</p>
                      <p className="font-semibold text-foreground mt-0.5">
                        {activeStudent?.batch?.name || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {studentDashboardData.history[0].remarks && (
                    <div className="p-3 bg-muted/20 border border-border/60 rounded-xl">
                      <p className="text-[9px] text-muted-foreground uppercase font-bold mb-1">Remarks</p>
                      <p className="text-xs text-muted-foreground font-medium italic leading-relaxed">
                        "{studentDashboardData.history[0].remarks}"
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <CalendarCheck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No assessment recorded yet</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Performance History Section */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Performance History</h3>
                <p className="text-[10px] text-muted-foreground">Previous assessment records</p>
              </div>
              {studentDashboardData?.history && studentDashboardData.history.length > 1 && (
                <button
                  onClick={() => setSelectedAssessment(selectedAssessment ? null : studentDashboardData.history[0])}
                  className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  {selectedAssessment ? 'Hide History' : 'View All History'}
                </button>
              )}
            </div>

            {(!studentDashboardData?.history || studentDashboardData.history.length === 0) ? (
              <div className="text-center py-8">
                <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No assessment records found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Show only latest assessment by default */}
                {!selectedAssessment && studentDashboardData.history[0] && (
                  <div className="p-4 border border-border rounded-xl space-y-3">
                    <div className="flex items-center justify-between gap-4 text-xs font-semibold">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                        <div>
                          <h4 className="font-bold text-foreground">Latest Assessment</h4>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(studentDashboardData.history[0].assessment_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-muted-foreground">Rating: </span>
                        <span className="font-black text-foreground">{calculateAverageRating(studentDashboardData.history[0].scores)} / 10</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show full history when expanded */}
                {selectedAssessment && (
                  <div className="space-y-3">
                    {studentDashboardData.history.slice(1).map((assessment, idx) => {
                      const avg = calculateAverageRating(assessment.scores);
                      const grade = calculateGrade(avg);
                      
                      return (
                        <div
                          key={assessment.assessment_id}
                          className="p-4 border border-border rounded-xl space-y-3 hover:bg-muted/10 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-4 text-xs font-semibold">
                            <div className="flex items-center gap-2.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground shrink-0" />
                              <div>
                                <h4 className="font-bold text-foreground">Assessment</h4>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {new Date(assessment.assessment_date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[10px] text-muted-foreground">Rating: </span>
                              <span className="font-black text-foreground">{avg} / 10</span>
                              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded ml-1.5">{grade}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {assessment.scores?.map(score => (
                              <div key={score.score_id} className="p-2.5 bg-muted/30 border border-border/50 rounded-lg text-center">
                                <p className="text-[9px] text-muted-foreground uppercase truncate font-bold">{score.attribute.name}</p>
                                <p className="text-sm font-black text-foreground mt-0.5">{score.score} <span className="text-[9px] text-muted-foreground">/10</span></p>
                              </div>
                            ))}
                          </div>
                          
                          {(assessment.remarks || assessment.behavior_notes) && (
                            <div className="p-3 bg-card border border-border rounded-xl text-xs leading-relaxed space-y-1 text-muted-foreground font-medium italic">
                              {assessment.remarks && <p>"{assessment.remarks}"</p>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </motion.div>

        </div>
      ) : (
        <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center text-muted-foreground">
          <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm font-bold">No developmental records</p>
          <p className="text-xs mt-0.5">Please contact the academy coaching staff to trigger performance assessments.</p>
        </div>
      )}
    </div>
  );
}