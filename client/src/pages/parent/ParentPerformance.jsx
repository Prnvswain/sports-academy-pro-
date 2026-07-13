import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Loader from '../../components/Loader';
import { parentGet } from '../../api/client';

export default function ParentPerformance() {
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [studentDashboardData, setStudentDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
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

  const getStrongestSkills = () => {
    if (!studentDashboardData?.history) return [];
    
    const skillScores = {};
    studentDashboardData.history.forEach(assessment => {
      assessment.scores?.forEach(score => {
        const skillName = score.attribute.name;
        if (!skillScores[skillName]) {
          skillScores[skillName] = { total: 0, count: 0 };
        }
        skillScores[skillName].total += score.score;
        skillScores[skillName].count += 1;
      });
    });

    return Object.entries(skillScores)
      .map(([skill, data]) => ({
        skill,
        average: (data.total / data.count).toFixed(1)
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 3);
  };

  const getNeedsImprovement = () => {
    if (!studentDashboardData?.history) return [];
    
    const skillScores = {};
    studentDashboardData.history.forEach(assessment => {
      assessment.scores?.forEach(score => {
        const skillName = score.attribute.name;
        if (!skillScores[skillName]) {
          skillScores[skillName] = { total: 0, count: 0 };
        }
        skillScores[skillName].total += score.score;
        skillScores[skillName].count += 1;
      });
    });

    return Object.entries(skillScores)
      .map(([skill, data]) => ({
        skill,
        average: (data.total / data.count).toFixed(1)
      }))
      .sort((a, b) => a.average - b.average)
      .slice(0, 3);
  };

  const getImprovementIndicator = (current, previous) => {
    if (!previous) return null;
    const diff = current - previous;
    if (diff > 0.5) return { icon: '▲', label: 'Improved', color: 'text-green-600' };
    if (diff < -0.5) return { icon: '▼', label: 'Declined', color: 'text-red-600' };
    return { icon: '▬', label: 'Stable', color: 'text-gray-600' };
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

  const handleAssessmentSelect = (assessment) => {
    setSelectedAssessment(assessment);
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="bg-surface text-foreground min-h-screen space-y-6 p-6">
      <div>
        <h2 className="from-accent bg-gradient-to-r to-emerald-500 bg-clip-text text-3xl font-black tracking-tight text-transparent">
          Performance Dashboard
        </h2>
        <p className="text-muted mt-1 text-sm">
          View your child's athletic progress and achievements
        </p>
      </div>

      {message.text && (
        <div className={`alert-${message.type === 'success' ? 'success' : 'error'} border-current/10 rounded-xl border p-4 text-sm font-semibold`}>
          {message.text}
        </div>
      )}

      {/* Child Selector */}
      {children.length > 1 && (
        <div className="card border-border bg-surface-secondary/30 p-4 rounded-xl border">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
            Select Child
          </label>
          <div className="flex gap-2 flex-wrap">
            {children.map(child => (
              <button
                key={child.student_id}
                type="button"
                onClick={() => setSelectedChild(child)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                  selectedChild?.student_id === child.student_id
                    ? 'bg-accent text-foreground'
                    : 'bg-surface text-muted hover:text-foreground'
                }`}
              >
                {child.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {loadingDashboard ? (
        <div className="flex items-center justify-center py-12">
          <Loader />
        </div>
      ) : selectedChild && studentDashboardData ? (
        <div className="space-y-6">
          {/* Student Header */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-accent/10 border border-border rounded-2xl p-6">
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center text-3xl font-black text-emerald-600 border-2 border-emerald-500/30">
                {selectedChild.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-black text-foreground">{selectedChild.name}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Sport</div>
                    <div className="text-sm font-bold text-foreground">{selectedChild.sport?.name || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Batch</div>
                    <div className="text-sm font-bold text-foreground">{selectedChild.batch?.name || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Coach</div>
                    <div className="text-sm font-bold text-foreground">{selectedChild.coach?.name || 'N/A'}</div>
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
              <div className="text-center">
                <div className="text-4xl font-black text-emerald-600">
                  {studentDashboardData?.analytics?.overallAverage?.toFixed(1) || '0.0'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Overall Rating</div>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="bg-surface border border-border rounded-xl p-4">
              <div className="text-xs text-muted-foreground mb-1">Overall Rating</div>
              <div className="text-2xl font-black text-emerald-600">
                {studentDashboardData?.analytics?.overallAverage?.toFixed(1) || '0.0'}
              </div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <div className="text-xs text-muted-foreground mb-1">Technical Rating</div>
              <div className="text-2xl font-black text-blue-600">
                {studentDashboardData?.analytics?.technicalAverage?.toFixed(1) || '0.0'}
              </div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <div className="text-xs text-muted-foreground mb-1">Physical Rating</div>
              <div className="text-2xl font-black text-purple-600">
                {studentDashboardData?.analytics?.physicalAverage?.toFixed(1) || '0.0'}
              </div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <div className="text-xs text-muted-foreground mb-1">Behaviour Rating</div>
              <div className="text-2xl font-black text-amber-600">
                {studentDashboardData?.analytics?.behaviourAverage?.toFixed(1) || '0.0'}
              </div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <div className="text-xs text-muted-foreground mb-1">Attendance Rate</div>
              <div className="text-2xl font-black text-cyan-600">
                {studentDashboardData?.dashboard?.attendanceRate || '0'}%
              </div>
            </div>
          </div>

          {/* Strongest Skills & Needs Improvement */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="bg-surface border border-border rounded-xl p-4">
              <h4 className="text-sm font-black text-foreground mb-3">Strongest Skills</h4>
              {getStrongestSkills().length > 0 ? (
                <ul className="space-y-2">
                  {getStrongestSkills().map((skill, index) => (
                    <li key={index} className="flex justify-between items-center">
                      <span className="text-sm text-foreground">{skill.skill}</span>
                      <span className="text-sm font-bold text-emerald-600">{skill.average}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No data available</p>
              )}
            </div>

            <div className="bg-surface border border-border rounded-xl p-4">
              <h4 className="text-sm font-black text-foreground mb-3">Needs Improvement</h4>
              {getNeedsImprovement().length > 0 ? (
                <ul className="space-y-2">
                  {getNeedsImprovement().map((skill, index) => (
                    <li key={index} className="flex justify-between items-center">
                      <span className="text-sm text-foreground">{skill.skill}</span>
                      <span className="text-sm font-bold text-orange-600">{skill.average}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No data available</p>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Date Range</label>
                <select
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value)}
                  className="text-sm p-2 rounded-lg bg-surface-secondary border border-border"
                >
                  <option value="all">All Time</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 3 Months</option>
                  <option value="180">Last 6 Months</option>
                </select>
              </div>
            </div>
          </div>

          {/* Attribute Selector */}
          <div className="bg-surface border border-border rounded-xl p-4">
            <h4 className="text-sm font-black text-foreground mb-3">Select Attributes to Display</h4>
            <div className="flex flex-wrap gap-2">
              {selectedAttributes.map(attr => (
                <label key={attr} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked
                    onChange={() => handleAttributeToggle(attr)}
                    className="rounded"
                  />
                  {attr}
                </label>
              ))}
            </div>
          </div>

          {/* Performance Trend Graph */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h4 className="text-sm font-black text-foreground mb-4">Performance Trend</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={prepareGraphData()}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs text-muted-foreground"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis 
                    domain={[0, 10]} 
                    className="text-xs text-muted-foreground"
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--surface)', 
                      border: '1px solid var(--border)',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend className="text-xs" />
                  {/* Overall Average Line */}
                  <Line 
                    type="monotone" 
                    dataKey="Overall" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  {/* Attribute Lines */}
                  {selectedAttributes.map((attr, idx) => (
                    <Line
                      key={attr}
                      type="monotone"
                      dataKey={attr}
                      stroke={['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'][idx % 5]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Assessment Timeline */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h4 className="text-sm font-black text-foreground mb-4">Assessment History</h4>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {getFilteredHistory().map((assessment, index) => {
                const avg = calculateAverageRating(assessment.scores);
                const grade = calculateGrade(parseFloat(avg));
                const prevAssessment = getFilteredHistory()[index + 1];
                const prevAvg = prevAssessment ? calculateAverageRating(prevAssessment.scores) : null;
                const improvement = getImprovementIndicator(parseFloat(avg), parseFloat(prevAvg));
                
                return (
                  <motion.button
                    key={assessment.assessment_id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleAssessmentSelect(assessment)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedAssessment?.assessment_id === assessment.assessment_id
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-border hover:border-emerald-400 bg-surface'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-sm font-black text-emerald-600 dark:text-emerald-400">
                          {grade}
                        </div>
                        <div>
                          <div className="font-bold text-foreground">
                            {new Date(assessment.scored_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
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
                    {improvement && (
                      <div className={`text-xs font-medium mt-2 ${improvement.color}`}>
                        {improvement.icon} {improvement.label}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Assessment Details */}
          {selectedAssessment && (
            <div className="bg-surface border border-border rounded-xl p-6">
              <h4 className="text-sm font-black text-foreground mb-4">Assessment Details</h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {selectedAssessment.scores?.map(score => (
                  <div key={score.attribute.attribute_id} className="bg-surface-secondary/30 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-foreground">
                        {score.attribute.name}
                      </span>
                      <span className="text-lg font-black text-emerald-600">
                        {score.score}/10
                      </span>
                    </div>
                    <div className="w-full bg-surface rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full"
                        style={{ width: `${(score.score / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {selectedAssessment.notes && (
                <div className="mt-4 p-4 bg-surface-secondary/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Coach Notes</div>
                  <p className="text-sm text-foreground">{selectedAssessment.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Personal Best */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h4 className="text-sm font-black text-foreground mb-4">Personal Best Records</h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(getPersonalBests()).map(([attr, best]) => (
                <div key={attr} className="bg-surface-secondary/30 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-foreground">{attr}</span>
                    <span className="text-lg font-black text-emerald-600">{best.score}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(best.date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Coach Remarks History */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h4 className="text-sm font-black text-foreground mb-4">Coach Remarks History</h4>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {studentDashboardData?.history?.filter(a => a.notes).map(assessment => (
                <div key={assessment.assessment_id} className="bg-surface-secondary/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold text-foreground">
                      {new Date(assessment.scored_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {assessment.coach?.name || 'Unknown Coach'}
                    </div>
                  </div>
                  <p className="text-sm text-foreground">{assessment.notes}</p>
                </div>
              ))}
              {studentDashboardData?.history?.filter(a => a.notes).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No coach remarks available</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm font-bold">No performance data available</p>
        </div>
      )}
    </div>
  );
}
