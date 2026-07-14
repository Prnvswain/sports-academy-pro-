import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Loader from '../../components/Loader';
import { parentGet } from '../../api/client';
import { Activity, Target, Brain, CalendarCheck, TrendingUp, Trophy, Medal, MessageSquare, Flame, Zap } from 'lucide-react';

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
        if (!skillScores[skillName]) skillScores[skillName] = { total: 0, count: 0 };
        skillScores[skillName].total += score.score;
        skillScores[skillName].count += 1;
      });
    });
    return Object.entries(skillScores)
      .map(([skill, data]) => ({ skill, average: (data.total / data.count).toFixed(1) }))
      .sort((a, b) => b.average - a.average).slice(0, 3);
  };

  const getNeedsImprovement = () => {
    if (!studentDashboardData?.history) return [];
    const skillScores = {};
    studentDashboardData.history.forEach(assessment => {
      assessment.scores?.forEach(score => {
        const skillName = score.attribute.name;
        if (!skillScores[skillName]) skillScores[skillName] = { total: 0, count: 0 };
        skillScores[skillName].total += score.score;
        skillScores[skillName].count += 1;
      });
    });
    return Object.entries(skillScores)
      .map(([skill, data]) => ({ skill, average: (data.total / data.count).toFixed(1) }))
      .sort((a, b) => a.average - b.average).slice(0, 3);
  };

  const getImprovementIndicator = (current, previous) => {
    if (!previous) return null;
    const diff = current - previous;
    if (diff > 0.5) return { icon: '↑', label: 'Improved', color: 'text-emerald-600', bg: 'bg-emerald-100' };
    if (diff < -0.5) return { icon: '↓', label: 'Declined', color: 'text-red-600', bg: 'bg-red-100' };
    return { icon: '−', label: 'Stable', color: 'text-slate-500', bg: 'bg-slate-100' };
  };

  const getFilteredHistory = () => {
    if (!studentDashboardData?.history) return [];
    let filtered = [...studentDashboardData.history];
    if (dateRangeFilter !== 'all') {
      const now = new Date();
      const days = parseInt(dateRangeFilter);
      const cutoffDate = new Date(now.setDate(now.getDate() - days));
      filtered = filtered.filter(assessment => new Date(assessment.scored_at) >= cutoffDate);
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
        date: new Date(assessment.scored_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        assessment_id: assessment.assessment_id
      };
      const avg = calculateAverageRating(assessment.scores);
      dataPoint['Overall'] = parseFloat(avg);
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
      prev.includes(attributeName) ? prev.filter(a => a !== attributeName) : [...prev, attributeName]
    );
  };

  const handleAssessmentSelect = (assessment) => {
    setSelectedAssessment(assessment);
  };

  if (loading) return <Loader />;

  return (
    // Vibrant very light gray background to let colors pop
    <div className="min-h-screen bg-[#F4F7F6] p-4 lg:p-6 text-slate-800 font-sans">
      <div className="max-w-[1400px] mx-auto">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-[24px] font-black text-slate-900 tracking-tight flex items-center gap-2">
              Performance Analytics <Zap className="text-amber-400 fill-amber-400" size={20}/>
            </h2>
            <p className="text-[13px] text-slate-500 font-medium mt-0.5">Track your athlete's progress and daily metrics.</p>
          </div>

          {children.length > 1 && (
            <div className="bg-white rounded-full p-1.5 shadow-sm border border-slate-200 flex items-center gap-1">
              {children.map(child => (
                <button
                  key={child.student_id}
                  type="button"
                  onClick={() => setSelectedChild(child)}
                  className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all duration-300 ${
                    selectedChild?.student_id === child.student_id
                      ? 'bg-gradient-to-r from-lime-400 to-emerald-400 text-slate-900 shadow-md'
                      : 'bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {child.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {message.text && (
          <div className="mb-4 p-3 rounded-xl text-xs font-bold bg-white border border-red-100 text-red-500 shadow-sm">
            {message.text}
          </div>
        )}

        {loadingDashboard ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
          </div>
        ) : selectedChild && studentDashboardData ? (
          
          <div className="flex flex-col xl:flex-row gap-6">
            
            {/* LEFT COLUMN - Main Analytics */}
            <div className="flex-1 space-y-6">
              
              {/* Core Metrics Grid - FULLY COLORFUL */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'Overall', val: studentDashboardData?.analytics?.overallAverage?.toFixed(1) || '0.0', icon: <Trophy size={20} className="text-lime-700" />, bg: 'bg-gradient-to-br from-lime-200 to-green-100', border: 'border-lime-200', text: 'text-green-900' },
                  { label: 'Technical', val: studentDashboardData?.analytics?.technicalAverage?.toFixed(1) || '0.0', icon: <Target size={20} className="text-sky-700" />, bg: 'bg-gradient-to-br from-sky-100 to-blue-50', border: 'border-sky-200', text: 'text-sky-900' },
                  { label: 'Physical', val: studentDashboardData?.analytics?.physicalAverage?.toFixed(1) || '0.0', icon: <Flame size={20} className="text-orange-600" />, bg: 'bg-gradient-to-br from-orange-100 to-amber-50', border: 'border-orange-200', text: 'text-orange-900' },
                  { label: 'Behaviour', val: studentDashboardData?.analytics?.behaviourAverage?.toFixed(1) || '0.0', icon: <Brain size={20} className="text-rose-600" />, bg: 'bg-gradient-to-br from-rose-100 to-pink-50', border: 'border-rose-200', text: 'text-rose-900' },
                  { label: 'Attendance', val: `${studentDashboardData?.dashboard?.attendanceRate || 0}%`, icon: <CalendarCheck size={20} className="text-violet-700" />, bg: 'bg-gradient-to-br from-violet-100 to-purple-50', border: 'border-violet-200', text: 'text-violet-900' },
                ].map((stat, idx) => (
                  <div key={idx} className={`${stat.bg} ${stat.border} border rounded-[20px] p-4 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className={`text-[26px] font-black ${stat.text} leading-none`}>{stat.val}</div>
                      <div className="bg-white/50 backdrop-blur-md w-9 h-9 rounded-full flex items-center justify-center shadow-sm">
                        {stat.icon}
                      </div>
                    </div>
                    <div className={`text-[11px] font-bold ${stat.text} opacity-80 uppercase tracking-wide`}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Main Chart - Clean White but with Vibrant Buttons */}
              <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 relative overflow-hidden">
                {/* Decorative blob */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-lime-100/50 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <h3 className="text-[16px] font-bold text-slate-800">Growth Trajectory</h3>
                  
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full sm:w-auto">
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {availableAttributes.map(attr => (
                        <label key={attr} className={`cursor-pointer px-3 py-1.5 rounded-full text-[11px] font-bold transition-all select-none border ${
                          selectedAttributes.includes(attr) 
                            ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-white border-transparent shadow-md' 
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}>
                          <input type="checkbox" className="hidden" checked={selectedAttributes.includes(attr)} onChange={() => handleAttributeToggle(attr)} />
                          {attr}
                        </label>
                      ))}
                    </div>

                    <select
                      value={dateRangeFilter}
                      onChange={(e) => setDateRangeFilter(e.target.value)}
                      className="text-[12px] font-bold py-1.5 px-3 rounded-full bg-slate-100 border-none outline-none focus:ring-2 focus:ring-emerald-400 text-slate-700 cursor-pointer shadow-inner"
                    >
                      <option value="all">All Time</option>
                      <option value="30">Last 30 Days</option>
                      <option value="90">Last 3 Months</option>
                    </select>
                  </div>
                </div>

                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={prepareGraphData()} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dy={10} />
                      <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '12px', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                      <Line type="monotone" dataKey="Overall" stroke="#10b981" strokeWidth={4} dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} />
                      {selectedAttributes.map((attr, idx) => (
                        <Line key={attr} type="monotone" dataKey={attr} stroke={['#3b82f6', '#8b5cf6', '#f97316', '#ec4899', '#06b6d4'][idx % 5]} strokeWidth={2} dot={{ r: 0 }} activeDot={{ r: 5 }} connectNulls={false} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Insights Grid - Colorful Cards */}
              <div className="grid md:grid-cols-3 gap-4">
                {/* Strongest Skills (Mint Green) */}
                <div className="bg-gradient-to-b from-emerald-50 to-white rounded-[24px] p-5 shadow-sm border border-emerald-100">
                  <h4 className="text-[13px] font-black text-emerald-900 mb-4 flex items-center gap-2">
                    <TrendingUp size={18} className="text-emerald-500" /> Strongest Skills
                  </h4>
                  <div className="space-y-3">
                    {getStrongestSkills().map((skill, index) => (
                      <div key={index} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-emerald-50 shadow-sm">
                        <span className="text-[12px] font-bold text-slate-700">{skill.skill}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-black text-emerald-600">{skill.average}</span>
                        </div>
                      </div>
                    ))}
                    {getStrongestSkills().length === 0 && <p className="text-xs text-slate-400 text-center">No data available</p>}
                  </div>
                </div>

                {/* Needs Focus (Soft Peach/Orange) */}
                <div className="bg-gradient-to-b from-orange-50 to-white rounded-[24px] p-5 shadow-sm border border-orange-100">
                  <h4 className="text-[13px] font-black text-orange-900 mb-4 flex items-center gap-2">
                    <Activity size={18} className="text-orange-500" /> Needs Focus
                  </h4>
                  <div className="space-y-3">
                    {getNeedsImprovement().map((skill, index) => (
                      <div key={index} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-orange-50 shadow-sm">
                        <span className="text-[12px] font-bold text-slate-700">{skill.skill}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-black text-orange-600">{skill.average}</span>
                        </div>
                      </div>
                    ))}
                    {getNeedsImprovement().length === 0 && <p className="text-xs text-slate-400 text-center">No data available</p>}
                  </div>
                </div>

                {/* Personal Bests (Soft Lavender/Indigo) */}
                <div className="bg-gradient-to-b from-indigo-50 to-white rounded-[24px] p-5 shadow-sm border border-indigo-100">
                  <h4 className="text-[13px] font-black text-indigo-900 mb-4 flex items-center gap-2">
                    <Medal size={18} className="text-indigo-500" /> Personal Bests
                  </h4>
                  <div className="space-y-2.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                    {Object.entries(getPersonalBests()).map(([attr, best]) => (
                      <div key={attr} className="flex justify-between items-center bg-white rounded-xl p-2.5 border border-indigo-50 shadow-sm">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-indigo-700 uppercase">{attr}</span>
                          <span className="text-[9px] font-semibold text-slate-400">{new Date(best.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                        </div>
                        <span className="text-[15px] font-black text-slate-800">{best.score}</span>
                      </div>
                    ))}
                    {Object.keys(getPersonalBests()).length === 0 && <p className="text-xs text-slate-400 text-center">No records found</p>}
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN - Profile, History & Insights */}
            <div className="w-full xl:w-[360px] shrink-0 space-y-6">
              
              {/* Profile Card - Vibrant Gradient Backdrop */}
              <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
                {/* Colorful Abstract Background */}
                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400"></div>
                
                <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-4xl font-black text-slate-800 mb-3 border-4 border-white shadow-lg relative z-10 mt-10">
                  {selectedChild.name?.charAt(0) || '?'}
                </div>
                <h3 className="text-[20px] font-black text-slate-900 mt-2">{selectedChild.name}</h3>
                
                <div className="flex gap-2 justify-center mt-3 w-full">
                  <span className="text-[11px] font-bold bg-sky-50 text-sky-700 px-3 py-1.5 rounded-lg border border-sky-100 flex-1">{selectedChild.sport?.name || 'N/A'}</span>
                  <span className="text-[11px] font-bold bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-100 flex-1">{selectedChild.batch?.name || 'N/A'}</span>
                </div>

                <div className="w-full mt-5 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                  <div className="text-left">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Current Rating</p>
                    <p className="text-[24px] font-black text-slate-900 leading-none">{studentDashboardData?.analytics?.overallAverage?.toFixed(1) || '0.0'}</p>
                  </div>
                  <Trophy size={32} className="text-lime-500 opacity-20" />
                </div>
              </div>

              {/* Assessment History - Soft Blue Theme */}
              <div className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100 flex flex-col h-[320px]">
                <h4 className="text-[14px] font-black text-slate-900 mb-4 flex items-center gap-2">
                  <CalendarCheck size={18} className="text-blue-500" /> Assessment History
                </h4>
                <div className="space-y-2.5 overflow-y-auto custom-scrollbar pr-2 flex-1">
                  {getFilteredHistory().length > 0 ? getFilteredHistory().map((assessment, index) => {
                    const avg = calculateAverageRating(assessment.scores);
                    const prevAssessment = getFilteredHistory()[index + 1];
                    const prevAvg = prevAssessment ? calculateAverageRating(prevAssessment.scores) : null;
                    const improvement = getImprovementIndicator(parseFloat(avg), parseFloat(prevAvg));
                    const isSelected = selectedAssessment?.assessment_id === assessment.assessment_id;
                    
                    return (
                      <button
                        key={assessment.assessment_id}
                        onClick={() => handleAssessmentSelect(assessment)}
                        className={`w-full flex items-center justify-between p-3 rounded-[16px] transition-all border ${
                          isSelected 
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 border-transparent shadow-md text-white' 
                            : 'bg-slate-50 border-slate-100 hover:border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3 text-left">
                          <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center text-[12px] font-black ${isSelected ? 'bg-white/20 text-white' : 'bg-white text-slate-600 shadow-sm border border-slate-100'}`}>
                            {calculateGrade(parseFloat(avg))}
                          </div>
                          <div>
                            <div className={`text-[12px] font-bold ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                              {new Date(assessment.scored_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                            </div>
                            <div className={`text-[9px] font-bold uppercase mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                              By {assessment.coach?.name?.split(' ')[0] || 'Coach'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <div className={`text-[16px] font-black ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            {avg}
                          </div>
                          {improvement && !isSelected && (
                            <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md mt-0.5 flex items-center gap-0.5 ${improvement.bg} ${improvement.color}`}>
                              {improvement.icon} {improvement.label}
                            </div>
                          )}
                          {improvement && isSelected && (
                            <div className={`text-[9px] font-bold mt-0.5 flex items-center gap-0.5 text-white/90`}>
                              {improvement.icon} {improvement.label}
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  }) : (
                    <p className="text-[12px] font-medium text-center text-slate-400 py-4">No history available.</p>
                  )}
                </div>
              </div>

              {/* Session Insights - Colorful Details */}
              <div className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100 flex flex-col h-[340px]">
                <h4 className="text-[14px] font-black text-slate-900 mb-4 flex items-center gap-2">
                  <Target size={18} className="text-rose-500" /> Session Details
                </h4>
                {selectedAssessment ? (
                  <div className="overflow-y-auto custom-scrollbar pr-2 flex-1 space-y-4">
                    
                    {/* Progress Bars */}
                    <div className="grid gap-3">
                      {selectedAssessment.scores?.map((score, i) => {
                        // Cycle colors for progress bars
                        const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-purple-500', 'bg-rose-500'];
                        const barColor = colors[i % colors.length];
                        
                        return (
                          <div key={score.attribute.attribute_id}>
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-[11px] font-bold text-slate-700">{score.attribute.name}</span>
                              <span className="text-[12px] font-black text-slate-900">{score.score} <span className="text-[9px] text-slate-400">/10</span></span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(score.score / 10) * 100}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className={`h-full rounded-full ${barColor}`}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Coach's Note */}
                    {selectedAssessment.notes && (
                      <div className="p-3.5 bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-100 rounded-[16px] shadow-sm">
                        <div className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                          <MessageSquare size={12} /> Coach's Remark
                        </div>
                        <p className="text-[12px] font-semibold text-slate-800 leading-relaxed">
                          "{selectedAssessment.notes}"
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-[16px] p-6 text-center bg-slate-50">
                    <Target size={32} className="mb-3 text-slate-300" />
                    <p className="text-[12px] font-bold text-slate-500">Select a session from History<br/>to view detailed metrics.</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        ) : (
          <div className="text-center py-24 bg-white rounded-[24px] border border-slate-100 shadow-sm mt-6">
            <Trophy size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-[15px] font-bold text-slate-400">No performance data available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}