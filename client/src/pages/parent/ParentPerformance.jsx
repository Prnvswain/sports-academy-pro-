import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import Loader from '../../components/Loader';
import { parentGet } from '../../api/client';
import { Activity, Target, Brain, CalendarCheck, TrendingUp, Trophy, Medal, MessageSquare, Flame, Zap, Award, User, Clock, ChevronDown, BookOpen, AlertCircle } from 'lucide-react';

export default function ParentPerformance() {
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [studentDashboardData, setStudentDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [availableAttributes, setAvailableAttributes] = useState([]);
  const [selectedAttributes, setSelectedAttributes] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  const loadChildren = useCallback(async () => {
    try {
      const result = await parentGet('/parent/children');
      setChildren(result.data || []);
      if (result.data && result.data.length > 0) {
        setSelectedChild(result.data[0]);
      }
    } catch (error) {
      setMessage({ text: error.message || 'Failed to load children', type: 'error' });
    }
  }, []);

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
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await loadChildren();
      setLoading(false);
    };
    initialize();
  }, [loadChildren]);

  useEffect(() => {
    if (selectedChild) {
      loadStudentDashboard(selectedChild.student_id);
      setSelectedAssessment(null);
    }
  }, [selectedChild]);

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

  const getStrongestSkills = () => {
    if (!studentDashboardData?.analytics?.attributeAverages) return [];
    return Object.entries(studentDashboardData.analytics.attributeAverages)
      .map(([skill, average]) => ({ skill, average }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 3);
  };

  const getWeakestSkills = () => {
    if (!studentDashboardData?.analytics?.attributeAverages) return [];
    return Object.entries(studentDashboardData.analytics.attributeAverages)
      .map(([skill, average]) => ({ skill, average }))
      .sort((a, b) => a.average - b.average)
      .slice(0, 3);
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

  const prepareRadarData = () => {
    if (!studentDashboardData?.analytics?.attributeAverages) return [];
    return Object.entries(studentDashboardData.analytics.attributeAverages).map(([attr, avg]) => ({
      subject: attr,
      Score: parseFloat(avg.toFixed(1)),
      fullMark: 10
    }));
  };

  if (loading) return <Loader />;

  const overallAvg = studentDashboardData?.analytics?.overallAverage || 0;
  const technicalAvg = studentDashboardData?.analytics?.technicalAverage || 0;
  const physicalAvg = studentDashboardData?.analytics?.physicalAverage || 0;
  const behaviourAvg = studentDashboardData?.analytics?.behaviourAverage || 0;
  const attendanceRate = studentDashboardData?.dashboard?.attendanceRate || 0;

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto font-sans p-4 lg:p-8">
      {/* Top Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Performance Reports
          </h1>
          <p className="text-xs font-bold text-muted-foreground mt-0.5 uppercase tracking-wider">
            Track developmental milestones, ratings, and coach remarks
          </p>
        </div>

        {/* Child Selection buttons */}
        {children.length > 1 && (
          <div className="bg-muted/40 p-1.5 rounded-xl border border-border shadow-inner flex items-center gap-1 self-start sm:self-center">
            {children.map(child => (
              <button
                key={child.student_id}
                onClick={() => setSelectedChild(child)}
                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  selectedChild?.student_id === child.student_id
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
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
      ) : selectedChild && studentDashboardData ? (
        <div className="space-y-6">
          {/* Metrics summary row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              { label: 'Overall Average', val: overallAvg.toFixed(1), max: '/10', icon: Trophy, color: 'text-yellow-500 bg-yellow-500/10' },
              { label: 'Technical Score', val: technicalAvg.toFixed(1), max: '/10', icon: Target, color: 'text-blue-500 bg-blue-500/10' },
              { label: 'Physical Score', val: physicalAvg.toFixed(1), max: '/10', icon: Flame, color: 'text-orange-500 bg-orange-500/10' },
              { label: 'Behaviour Score', val: behaviourAvg.toFixed(1), max: '/10', icon: Brain, color: 'text-rose-500 bg-rose-500/10' },
              { label: 'Attendance Rate', val: `${attendanceRate}%`, max: '', icon: CalendarCheck, color: 'text-emerald-500 bg-emerald-500/10' },
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-2xl font-black text-foreground tracking-tight">
                      {stat.val}
                      {stat.max && <span className="text-[10px] text-muted-foreground font-semibold ml-0.5">{stat.max}</span>}
                    </p>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${stat.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Core Analytics: Chart and Radar Map */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Growth Chart (2/3 width) */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-border/50">
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">Growth Trajectory</h3>
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
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground font-semibold">No performance data recorded</div>
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

            {/* Skill comparison radar map (1/3 width) */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-1 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4"
            >
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Skill Radar Map</h3>
                <p className="text-[10px] text-muted-foreground">Parameter distribution values</p>
              </div>

              <div className="h-[280px] w-full flex items-center justify-center text-xs">
                {prepareRadarData().length === 0 ? (
                  <div className="text-xs text-muted-foreground font-semibold">No ratings computed yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={prepareRadarData()}>
                      <PolarGrid stroke="var(--theme-border, #e2e8f0)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 10]} />
                      <Radar name="Averages" dataKey="Score" stroke="var(--theme-primary, #10b981)" fill="var(--theme-primary, #10b981)" fillOpacity={0.15} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </motion.div>
          </div>

          {/* Achievements & Strength/Weakness grids */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Strongest Attributes */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                <TrendingUp size={16} /> Key Strengths
              </h4>
              <div className="space-y-2.5">
                {getStrongestSkills().map((skill, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-xs font-semibold">
                    <span className="text-foreground">{skill.skill}</span>
                    <span className="text-emerald-500 font-extrabold text-sm">{skill.average.toFixed(1)} <span className="text-[9px] text-muted-foreground">/10</span></span>
                  </div>
                ))}
                {getStrongestSkills().length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No parameters evaluated yet.</p>
                )}
              </div>
            </div>

            {/* Needs Focus Attributes */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                <Target size={16} /> Improvement Areas
              </h4>
              <div className="space-y-2.5">
                {getWeakestSkills().map((skill, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-xs font-semibold">
                    <span className="text-foreground">{skill.skill}</span>
                    <span className="text-rose-500 font-extrabold text-sm">{skill.average.toFixed(1)} <span className="text-[9px] text-muted-foreground">/10</span></span>
                  </div>
                ))}
                {getWeakestSkills().length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No parameters evaluated yet.</p>
                )}
              </div>
            </div>

            {/* Trophy Cabinet preview */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-yellow-500 flex items-center gap-1.5">
                <Award size={16} /> Trophy Milestones
              </h4>
              <div className="space-y-2.5 text-xs font-semibold text-foreground">
                <div className="p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-xl flex gap-3 items-center">
                  <span className="text-2xl shrink-0">🔥</span>
                  <div>
                    <h5 className="font-bold">Consistent Athlete</h5>
                    <p className="text-[10px] text-muted-foreground">Attendance check-in rate above 80%</p>
                  </div>
                </div>
                <div className="p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-xl flex gap-3 items-center">
                  <span className="text-2xl shrink-0">⚡</span>
                  <div>
                    <h5 className="font-bold">Iron Endurance</h5>
                    <p className="text-[10px] text-muted-foreground">Physical stamina attribute rating above 8.0</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Coach Comments & Timeline Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Timeline Feed of Assessments */}
            <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary" /> Evaluation Timeline
              </h3>
              
              {(!studentDashboardData.history || studentDashboardData.history.length === 0) ? (
                <p className="text-xs text-muted-foreground text-center py-8">No assessment records found.</p>
              ) : (
                <div className="space-y-4">
                  {studentDashboardData.history.map((assessment, idx) => {
                    const avg = calculateAverageRating(assessment.scores);
                    const grade = calculateGrade(avg);
                    const isSelected = selectedAssessment?.assessment_id === assessment.assessment_id;
                    
                    return (
                      <div
                        key={assessment.assessment_id}
                        onClick={() => setSelectedAssessment(isSelected ? null : assessment)}
                        className={`p-4 border rounded-xl cursor-pointer hover:bg-muted/10 transition-colors space-y-3 ${
                          isSelected ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 text-xs font-semibold">
                          <div className="flex items-center gap-2.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                            <div>
                              <h4 className="font-bold text-foreground">Drill Skill Evaluation</h4>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Evaluator: {assessment.coach?.name || 'Academy Instructor'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-muted-foreground">Rating: </span>
                            <span className="font-black text-foreground">{avg} / 10</span>
                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded ml-1.5">{grade}</span>
                          </div>
                        </div>

                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="pt-3 border-t border-border/40 space-y-3 text-xs"
                          >
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
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Coach remarks card */}
            <div className="lg:col-span-1 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-primary" /> Coach Remarks Feed
              </h3>
              
              <div className="space-y-3.5">
                {studentDashboardData.history?.filter(a => a.remarks).slice(0, 3).map((assessment, idx) => (
                  <div key={idx} className="p-3.5 bg-muted/20 border border-border/60 rounded-xl relative overflow-hidden text-xs">
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold mb-2">
                      <span className="font-bold flex items-center gap-1"><User size={10} /> {assessment.coach?.name || 'Coach'}</span>
                      <span>{new Date(assessment.assessment_date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-muted-foreground font-medium italic leading-relaxed">
                      "{assessment.remarks}"
                    </p>
                  </div>
                ))}
                {studentDashboardData.history?.filter(a => a.remarks).length === 0 && (
                  <div className="text-center py-6 text-muted-foreground text-xs">No coach remarks logged yet.</div>
                )}
              </div>
            </div>

          </div>

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