import { useEffect, useState, useCallback, useMemo } from 'react';
import { parentGet, parentPost } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar
} from 'recharts';
import {
  Trophy, Activity, Flame, Shield, TrendingUp, Zap, Award, Sparkles, TrendingDown,
  Calendar, DollarSign, Users, CheckCircle2, Clock, ArrowUpRight, BookOpen, Heart,
  Smile, ShieldAlert, FileText, Phone, Mail, MapPin, CreditCard, ArrowRight,
  ChevronRight, Download, DownloadCloud, MessageCircle, HelpCircle, Bell, AlertCircle,
  CalendarRange, Play, Check, Share2, Printer, Target, Star, MessageSquare, Info, XCircle
} from 'lucide-react';

// Animated Counter Sub-Component
function AnimatedCounter({ value, duration = 1.5, suffix = '', prefix = '', decimals = 0 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseFloat(value) || 0;
    if (end === 0) {
      setCount(0);
      return;
    }
    const totalFrames = Math.min(Math.floor(duration * 60), 60);
    let frame = 0;
    
    const counter = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const easeVal = progress * (2 - progress); // Ease out quad
      const current = easeVal * end;
      
      setCount(current);
      if (frame === totalFrames) {
        setCount(end);
        clearInterval(counter);
      }
    }, 1000 / 60);

    return () => clearInterval(counter);
  }, [value, duration]);

  return (
    <span>
      {prefix}
      {count.toFixed(decimals).toLocaleString()}
      {suffix}
    </span>
  );
}

// Circular SVG Progress Ring Sub-Component
function CircularProgressRing({ percentage, size = 120, strokeWidth = 8, primaryColor = 'text-emerald-500', secondaryColor = 'text-slate-100 dark:text-slate-800', children }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(Math.max(percentage, 0), 100) / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className={secondaryColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          stroke="currentColor"
        />
        <motion.circle
          className={primaryColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          stroke="currentColor"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
        {children}
      </div>
    </div>
  );
}

export default function ParentDashboard() {
  const { isDark } = useTheme();
  
  const [dashboardData, setDashboardData] = useState(null);
  const [studentsList, setStudentsList] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [activeSessions, setActiveSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Consolidated detailed performance data
  const [perfData, setPerfData] = useState(null);
  const [perfLoading, setPerfLoading] = useState(false);

  // Modal Dialog states
  const [activeModal, setActiveModal] = useState(null); // 'coach', 'query', 'receipts'
  const [querySubject, setQuerySubject] = useState('general');
  const [queryText, setQueryText] = useState('');
  const [querySubmitting, setQuerySubmitting] = useState(false);
  const [querySuccess, setQuerySuccess] = useState(false);

  // Filter for dashboard view (Overview, Analytics, Finance, Profile)
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      fetchDashboardData(selectedStudentId);
      fetchPerformanceDashboard(selectedStudentId);
    }
  }, [selectedStudentId]);

  // Load active batch sessions for the parent's students
  useEffect(() => {
    const loadActiveSessions = async () => {
      try {
        setSessionsLoading(true);
        const result = await parentGet('/parent/batch-sessions/active');
        setActiveSessions(result.data || []);
      } catch (err) {
        console.error('Failed to load active sessions:', err);
      } finally {
        setSessionsLoading(false);
      }
    };
    loadActiveSessions();
    
    // Refresh every minute
    const interval = setInterval(loadActiveSessions, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('parent_token');
      const response = await fetch('/api/v1/parent/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data.data);
        
        if (data.data?.students && data.data.students.length > 0) {
          setStudentsList(data.data.students);
          setSelectedStudentId(data.data.students[0].student_id);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async (studentId) => {
    try {
      const token = localStorage.getItem('parent_token');
      const response = await fetch(`/api/v1/parent/dashboard?studentId=${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data.data);
      }
    } catch (error) {
      console.error('Failed to update student metrics:', error);
    }
  };

  const fetchPerformanceDashboard = async (studentId) => {
    try {
      setPerfLoading(true);
      const result = await parentGet(`/parent/children/${studentId}/performance/dashboard`);
      setPerfData(result.data || result);
    } catch (err) {
      console.error('Failed to fetch performance dashboard details:', err);
    } finally {
      setPerfLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'ST';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const parent = dashboardData?.parent || {};
  const metrics = dashboardData?.metrics || { attendanceRate: 0, avgPerformanceScore: 0, pendingFees: 0, totalStudents: 0, recentNotes: [] };
  const currentStudent = studentsList.find(s => s.student_id === selectedStudentId) || {};

  // Check if current student has an active session
  const studentActiveSession = activeSessions.find(s => s.batch_id === currentStudent.batch_id);

  // Consolidated Attendance details
  const attendances = useMemo(() => {
    return perfData?.attendanceData || currentStudent.student_attendances || [];
  }, [perfData, currentStudent]);

  const presentCount = useMemo(() => attendances.filter(a => a.status === 'PRESENT').length, [attendances]);
  const absentCount = useMemo(() => attendances.filter(a => a.status === 'ABSENT').length, [attendances]);
  const lateCount = useMemo(() => attendances.filter(a => a.status === 'LATE').length, [attendances]);
  const attendanceRate = useMemo(() => {
    const rate = perfData?.attendanceRate || metrics.attendanceRate || 0;
    return parseFloat(rate);
  }, [perfData, metrics]);

  // Streaks calculation going backward chronologically
  const streaks = useMemo(() => {
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let hitEnd = false;
    // Sorted newest first
    for (let i = 0; i < attendances.length; i++) {
      if (attendances[i].status === 'PRESENT') {
        if (!hitEnd) currentStreak++;
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else if (attendances[i].status === 'ABSENT') {
        hitEnd = true;
        tempStreak = 0;
      }
    }
    return { current: currentStreak, longest: longestStreak };
  }, [attendances]);

  // Detailed performance attributes and scores
  const scoreHistory = useMemo(() => {
    return perfData?.assessmentHistory?.assessments || [];
  }, [perfData]);

  const latestAssessment = useMemo(() => scoreHistory[0] || null, [scoreHistory]);

  const avgPerformance = useMemo(() => {
    return parseFloat(perfData?.analytics?.overallAverage || metrics.avgPerformanceScore || 0);
  }, [perfData, metrics]);

  // Calculate attribute averages for radar chart
  const attributeAverages = useMemo(() => {
    const map = {};
    const scores = currentStudent.performance_scores || [];
    scores.forEach(s => {
      const name = s.attribute?.name;
      if (name) {
        if (!map[name]) map[name] = { name, total: 0, count: 0 };
        map[name].total += s.score;
        map[name].count++;
      }
    });
    return Object.values(map).map(a => ({
      subject: a.name,
      Score: parseFloat((a.total / a.count).toFixed(1)),
      fullMark: 10
    }));
  }, [currentStudent]);

  // Sort attribute averages to find best and weakest attributes
  const sortedAttributes = useMemo(() => {
    return [...attributeAverages].sort((a, b) => b.Score - a.Score);
  }, [attributeAverages]);

  const bestAttribute = sortedAttributes[0] ? `${sortedAttributes[0].subject} (${sortedAttributes[0].Score})` : null;
  const weakestAttribute = sortedAttributes[sortedAttributes.length - 1] ? `${sortedAttributes[sortedAttributes.length - 1].subject} (${sortedAttributes[sortedAttributes.length - 1].Score})` : null;

  // Chart data mappings
  const monthlyChartData = useMemo(() => {
    const monthlyData = {};
    attendances.forEach(a => {
      const date = new Date(a.date);
      const monthName = date.toLocaleString('default', { month: 'short' });
      if (!monthlyData[monthName]) {
        monthlyData[monthName] = { name: monthName, present: 0, total: 0 };
      }
      monthlyData[monthName].total++;
      if (a.status === 'PRESENT') {
        monthlyData[monthName].present++;
      }
    });
    return Object.values(monthlyData).map(m => ({
      name: m.name,
      Rate: Math.round((m.present / m.total) * 100)
    })).reverse();
  }, [attendances]);

  const presentPieData = useMemo(() => {
    return [
      { name: 'Present', value: presentCount, color: '#10b981' },
      { name: 'Absent', value: absentCount, color: '#ef4444' },
      { name: 'Late', value: lateCount, color: '#f59e0b' }
    ].filter(d => d.value > 0);
  }, [presentCount, absentCount, lateCount]);

  const heatmapData = useMemo(() => {
    const days = [];
    const today = new Date();
    // last 28 days (4 weeks)
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const record = attendances.find(a => a.date.split('T')[0] === dateStr);
      days.push({
        date: d,
        status: record ? record.status : 'NO_CLASS', // PRESENT, ABSENT, LATE, NO_CLASS
        dayLabel: d.toLocaleString('default', { weekday: 'short' }),
        dayNum: d.getDate()
      });
    }
    return days;
  }, [attendances]);

  const growthChartData = useMemo(() => {
    if (perfData?.analytics?.graphData && perfData.analytics.graphData.length > 0) {
      return perfData.analytics.graphData.map(pt => ({
        date: pt.date || new Date(pt.scored_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        Score: parseFloat(pt.score || pt.overall_score || pt.value || 0)
      }));
    }
    if (scoreHistory.length > 0) {
      return [...scoreHistory].reverse().map(a => ({
        date: new Date(a.scored_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        Score: a.overall_score
      }));
    }
    return [];
  }, [perfData, scoreHistory]);

  const attributeBarData = useMemo(() => {
    if (latestAssessment?.scores && latestAssessment.scores.length > 0) {
      return latestAssessment.scores.map(s => ({
        name: s.attribute?.name || 'Skill',
        Score: s.score
      }));
    }
    return [];
  }, [latestAssessment]);

  // Duration Plan calculations
  const activeEnrollment = currentStudent.enrollments?.find(e => e.is_active);
  const planName = activeEnrollment?.duration_plan?.name || 'No Active Plan';
  const planStart = activeEnrollment?.plan_start_date;
  const planEnd = activeEnrollment?.plan_end_date;
  const planValidityDays = activeEnrollment?.duration_plan?.duration_in_days || 30;

  let daysRemaining = 0;
  if (planEnd) {
    const diffTime = new Date(planEnd) - new Date();
    daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  } else if (activeEnrollment?.remaining_validity) {
    daysRemaining = activeEnrollment.remaining_validity;
  }

  const elapsedDays = Math.max(0, planValidityDays - daysRemaining);
  const planProgress = planValidityDays > 0 ? (elapsedDays / planValidityDays) * 100 : 0;

  // sessions estimation
  const totalSessions = activeEnrollment?.duration_plan?.duration_in_days ? Math.round((activeEnrollment.duration_plan.duration_in_days / 30) * 12) : 12;
  const sessionsAttended = useMemo(() => {
    return attendances.filter(a => a.status === 'PRESENT' && (!planStart || new Date(a.date) >= new Date(planStart))).length;
  }, [attendances, planStart]);
  const sessionsLeft = Math.max(0, totalSessions - sessionsAttended);

  // Fees details
  const receipts = currentStudent.receipts || [];
  const pendingFees = metrics.pendingFees || receipts.filter(r => r.status === 'PENDING' || r.status === 'DUE').reduce((sum, r) => sum + (r.amount || 0), 0);
  const paidFees = receipts.filter(r => r.status === 'PAID' || r.status === 'VERIFIED').reduce((sum, r) => sum + (r.amount || 0), 0);
  const feePaymentProgress = (paidFees + pendingFees) > 0 ? (paidFees / (paidFees + pendingFees)) * 100 : 0;
  const lastPayment = receipts.find(r => r.status === 'PAID' || r.status === 'VERIFIED');
  const nextDueDate = activeEnrollment?.next_due_date;

  const perfTrend = perfData?.analytics?.trend || 'stable';
  const improvement = parseFloat(perfData?.analytics?.improvementPercentage || 0);

  // Dynamic level classification based on overall rating
  const currentLevel = useMemo(() => {
    if (currentStudent.category) return currentStudent.category;
    if (avgPerformance >= 8.5) return 'Elite Tier';
    if (avgPerformance >= 7.0) return 'Advanced Athlete';
    if (avgPerformance >= 5.5) return 'Rising Intermediate';
    return 'Beginner Academy';
  }, [currentStudent, avgPerformance]);

  // Coach remarks list
  const coachNotes = currentStudent.daily_notes || [];

  // Announcements and alerts panel
  const announcementsList = useMemo(() => {
    return metrics.recentNotes || [];
  }, [metrics]);

  // Timeline Activity Log
  const activityTimeline = useMemo(() => {
    const list = [];
    if (attendances.length > 0) {
      list.push({
        title: 'Attendance Marked',
        desc: `Marked ${attendances[0].status.toLowerCase()} in today's class.`,
        date: new Date(attendances[0].date).toLocaleDateString(),
        type: 'attendance',
        color: attendances[0].status === 'PRESENT' ? 'bg-emerald-500' : 'bg-red-500'
      });
    }
    if (latestAssessment) {
      list.push({
        title: 'Performance Evaluation',
        desc: `Overall rating scored ${latestAssessment.overall_score}/10 by Coach.`,
        date: new Date(latestAssessment.scored_at).toLocaleDateString(),
        type: 'performance',
        color: 'bg-purple-500'
      });
    }
    if (receipts.length > 0) {
      list.push({
        title: `Fee Payment Verified`,
        desc: `Transaction of ₹${receipts[0].amount} marked as ${receipts[0].status.toLowerCase()}.`,
        date: new Date(receipts[0].payment_date).toLocaleDateString(),
        type: 'fee',
        color: 'bg-blue-500'
      });
    }
    if (coachNotes.length > 0) {
      list.push({
        title: 'Coach Remarks Logged',
        desc: coachNotes[0].performance_notes || coachNotes[0].behaviour_notes || 'Coach shared training notes.',
        date: new Date(coachNotes[0].note_date).toLocaleDateString(),
        type: 'note',
        color: 'bg-orange-500'
      });
    }
    return list;
  }, [attendances, latestAssessment, receipts, coachNotes]);

  // Dynamic Achievements Cabinet calculation
  const achievements = useMemo(() => {
    const list = [];
    if (currentStudent.joining_date) {
      list.push({
        title: 'First Step',
        desc: `Joined academy on ${new Date(currentStudent.joining_date).toLocaleDateString()}`,
        icon: '🎉',
        type: 'milestone',
        color: 'from-blue-500/10 to-indigo-500/10 text-blue-500'
      });
    }
    if (sessionsAttended >= 10) {
      list.push({
        title: 'Century Club',
        desc: `Completed ${sessionsAttended} active training sessions`,
        icon: '🚀',
        type: 'milestone',
        color: 'from-emerald-500/10 to-teal-500/10 text-emerald-500'
      });
    }
    if (attendanceRate >= 90) {
      list.push({
        title: 'Perfect Attendance',
        desc: `Maintained outstanding ${attendanceRate}% attendance`,
        icon: '🏆',
        type: 'certificate',
        color: 'from-amber-500/10 to-orange-500/10 text-amber-500'
      });
    }
    if (avgPerformance >= 8.5) {
      list.push({
        title: 'Gold Medal',
        desc: `Elite average evaluation rating of ${avgPerformance}/10`,
        icon: '🥇',
        type: 'medal',
        color: 'from-yellow-400/20 to-amber-500/20 text-yellow-500'
      });
    } else if (avgPerformance >= 7.0) {
      list.push({
        title: 'Silver Medal',
        desc: `Competitive evaluation rating of ${avgPerformance}/10`,
        icon: '🥈',
        type: 'medal',
        color: 'from-slate-300/20 to-slate-400/20 text-slate-400'
      });
    }
    if (streaks.longest >= 3) {
      list.push({
        title: 'Consistency Star',
        desc: `Maintained a training streak of ${streaks.longest} sessions`,
        icon: '🔥',
        type: 'badge',
        color: 'from-orange-500/10 to-red-500/10 text-orange-500'
      });
    }
    // High single attribute score
    const highestScore = currentStudent.performance_scores?.reduce((max, s) => s.score > max ? s.score : max, 0) || 0;
    if (highestScore >= 9) {
      list.push({
        title: 'Apex Performer',
        desc: `Scored an exceptional ${highestScore}/10 in attribute drill`,
        icon: '⚡',
        type: 'badge',
        color: 'from-purple-500/10 to-fuchsia-500/10 text-purple-500'
      });
    }

    return list;
  }, [currentStudent, sessionsAttended, attendanceRate, avgPerformance, streaks]);

  // Raise Query submission mock
  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    if (!queryText.trim()) return;
    
    setQuerySubmitting(true);
    try {
      // Mimic backend request delay
      await new Promise(r => setTimeout(r, 1200));
      setQuerySuccess(true);
      setQueryText('');
      setTimeout(() => {
        setActiveModal(null);
        setQuerySuccess(false);
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setQuerySubmitting(false);
    }
  };

  // Receipt printable generatePDF
  const handleDownloadReceipt = async (receiptObj) => {
    const target = receiptObj || lastPayment;
    if (!target) {
      alert('No payment receipt available.');
      return;
    }
    try {
      const receiptId = target.receipt_id || target.id;
      await parentGet(`/parent/payments/${receiptId}/download`);
      const response = await parentGet(`/parent/payments/${receiptId}`);
      const fullReceipt = response?.data || response;
      
      const formatDate = (date) => {
        if (!date) return '—';
        return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      };

      const formatCurrency = (amount) => {
        return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      };

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Receipt - ${fullReceipt.receipt_number}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; background: #fff; color: #333; }
            .container { max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 30px; border-radius: 12px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 20px; }
            .logo { font-size: 24px; font-weight: 800; color: #10b981; }
            .title { text-align: right; }
            .title h2 { font-size: 20px; margin: 0; color: #1e293b; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .item label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; display: block; margin-bottom: 2px; }
            .item span { font-size: 14px; font-weight: 500; color: #1e293b; }
            .amount-box { background: #f0fdf4; border: 1px dashed #10b981; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .amount-box h3 { font-size: 26px; margin: 0; color: #10b981; }
            .footer { border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">SAMS PORTAL</div>
              <div class="title">
                <h2>PAYMENT RECEIPT</h2>
                <span style="font-size:12px; color:#64748b;">${fullReceipt.receipt_number}</span>
              </div>
            </div>
            <div class="grid">
              <div class="item"><label>Student Name</label><span>${currentStudent.name}</span></div>
              <div class="item"><label>Sport</label><span>${currentStudent.sport?.name || 'General'}</span></div>
              <div class="item"><label>Payment Date</label><span>${formatDate(fullReceipt.payment_date)}</span></div>
              <div class="item"><label>Payment Method</label><span>${(fullReceipt.method || 'UPI').toUpperCase()}</span></div>
              <div class="item"><label>Transaction No.</label><span>${fullReceipt.transaction_number || 'N/A'}</span></div>
              <div class="item"><label>Status</label><span style="color:#10b981; font-weight:bold;">${fullReceipt.status}</span></div>
            </div>
            <div class="amount-box">
              <label style="font-size: 11px; text-transform: uppercase; color: #10b981; font-weight: 700;">Amount Paid</label>
              <h3>${formatCurrency(fullReceipt.amount)}</h3>
            </div>
            <div class="footer">
              <p>Thank you for your payment. SAMS Sports Academy System.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (err) {
      console.error(err);
      alert('Unable to load receipt print popup.');
    }
  };

  const handleDownloadReportCard = () => {
    window.print();
  };

  const sportsIcons = [
    { Icon: Trophy, size: 28, top: '8%', left: '12%', rotate: 12, delay: 0 },
    { Icon: Activity, size: 24, top: '22%', right: '15%', rotate: -18, delay: 0.8 },
    { Icon: Target, size: 30, bottom: '10%', left: '14%', rotate: 35, delay: 0.4 },
    { Icon: Flame, size: 26, bottom: '18%', right: '12%', rotate: -8, delay: 1.2 },
    { Icon: Zap, size: 22, top: '42%', left: '4%', rotate: 25, delay: 1.6 }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm font-medium text-muted-foreground">Loading Premium Portal Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-6 py-4 rounded-xl shadow-md flex items-center gap-3">
          <ShieldAlert className="w-6 h-6" />
          <span className="font-semibold">{error}</span>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="bg-card rounded-xl border border-border p-8 text-center max-w-sm shadow-glass">
          <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No dashboard data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-4 lg:p-8 max-w-7xl mx-auto print-container">
      {/* Dynamic print-friendly CSS */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; padding: 0 !important; }
          .print-container { max-width: 100% !important; padding: 0 !important; }
          .no-print, header, aside, nav, button, .child-selector, .quick-actions, .tabs-container { display: none !important; }
          .print-grid { display: grid !important; grid-template-columns: 1fr !important; }
          .print-card { border: 1px solid #ccc !important; box-shadow: none !important; background: transparent !important; }
          .print-break-page { page-break-before: always !important; }
        }
      `}</style>

      {/* Top Welcome Panel */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            Welcome back, {parent?.name || 'Parent'}! <Sparkles className="text-amber-500 fill-amber-500" size={24} />
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Monitor and track your student athlete's milestones and academy metrics in real-time.
          </p>
        </div>
        
        {/* Child Selector Grid */}
        <div className="flex items-center gap-2 bg-card p-1.5 rounded-xl border border-border shadow-sm child-selector">
          <Users size={16} className="text-muted-foreground ml-2" />
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(Number(e.target.value))}
            className="bg-transparent text-sm font-bold border-none outline-none pr-6 pl-1 text-foreground cursor-pointer"
          >
            {studentsList.map((student) => (
              <option key={student.student_id} value={student.student_id} className="text-slate-800">
                {student.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* LIVE Session Banner */}
      {studentActiveSession && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl shadow-sm no-print"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
              <div>
                <h3 className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-1.5">
                  LIVE Session Active
                </h3>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  {studentActiveSession.batch?.name} • {studentActiveSession.batch?.sport?.name} • Coach: {studentActiveSession.coach?.name}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full">
              Started {new Date(studentActiveSession.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </motion.div>
      )}

      {/* HERO Section Card (Modern SaaS Analytics Style) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 lg:p-8 border border-slate-700/30 shadow-xl mb-8 print-card">
        {/* Floating sports decorations */}
        {sportsIcons.map((item, idx) => {
          const { Icon, size, top, left, right, bottom, rotate, delay } = item;
          return (
            <div
              key={idx}
              className="absolute pointer-events-none opacity-[0.04]"
              style={{ top, left, right, bottom, transform: `rotate(${rotate}deg)` }}
            >
              <Icon size={size} />
            </div>
          );
        })}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            {currentStudent.profile_photo ? (
              <img
                src={currentStudent.profile_photo}
                alt={currentStudent.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-md flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-2xl text-slate-900 shadow-md flex-shrink-0">
                {getInitials(currentStudent.name)}
              </div>
            )}
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="text-2xl font-black tracking-tight">{currentStudent.name}</h2>
                <span className={`text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider shadow-sm ${
                  currentStudent.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {currentStudent.status === 'ACTIVE' ? 'Active Athlete' : 'Inactive'}
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-1 font-semibold">
                ID: <span className="text-white">#{currentStudent.student_id}</span> • Joined {currentStudent.joining_date ? new Date(currentStudent.joining_date).toLocaleDateString() : '—'}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm font-bold">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  {currentStudent.sport?.name || 'General Sport'}
                </span>
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Calendar size={14} />
                  {currentStudent.batch?.name || 'Assigning Batch'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap md:flex-col items-start md:items-end gap-3 text-sm md:text-right">
            <div>
              <p className="text-slate-400 text-[10px] uppercase tracking-wider font-extrabold">Current Level</p>
              <h3 className="text-lg font-black text-emerald-400 tracking-tight">{currentLevel}</h3>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] uppercase tracking-wider font-extrabold">Training Center</p>
              <p className="font-bold text-slate-200">{currentStudent.academy?.name || 'Main Academy'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* TABS CONTAINER FOR CLEAN PRESENTATION (Only on Screen) */}
      <div className="flex border-b border-border mb-8 overflow-x-auto scrollbar-none gap-2 no-print tabs-container">
        {[
          { id: 'overview', label: 'Dashboard Overview', icon: Trophy },
          { id: 'analytics', label: 'Analytics Details', icon: TrendingUp },
          { id: 'finances', label: 'Plans & Payments', icon: CreditCard }
        ].map((tab) => {
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
          
          {/* Top Statistics Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            
            {/* 1. Attendance Rate Card */}
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden group print-card">
              <div className="absolute top-0 right-0 p-3 text-emerald-500/10 group-hover:text-emerald-500/20 transition-colors">
                <CheckCircle2 size={40} />
              </div>
              <p className="text-muted-foreground text-[11px] font-extrabold uppercase tracking-wider">Attendance Rate</p>
              <h3 className="text-2xl font-black mt-2 text-emerald-600 dark:text-emerald-400">
                <AnimatedCounter value={attendanceRate} suffix="%" />
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1 font-semibold">
                Overall check-in rate
              </p>
            </div>

            {/* 2. Present / Absent / Late Card */}
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden group print-card">
              <div className="absolute top-0 right-0 p-3 text-emerald-500/10 group-hover:text-emerald-500/20 transition-colors">
                <Users size={40} />
              </div>
              <p className="text-muted-foreground text-[11px] font-extrabold uppercase tracking-wider">Present/Absent/Late</p>
              <h3 className="text-2xl font-black mt-2 text-foreground flex items-baseline gap-1">
                <span className="text-emerald-500"><AnimatedCounter value={presentCount} /></span>
                <span className="text-slate-300 text-xs font-normal">/</span>
                <span className="text-red-500"><AnimatedCounter value={absentCount} /></span>
                <span className="text-slate-300 text-xs font-normal">/</span>
                <span className="text-amber-500"><AnimatedCounter value={lateCount} /></span>
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1 font-semibold">
                Class checks breakdown
              </p>
            </div>

            {/* 3. Performance Score Card */}
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden group print-card">
              <div className="absolute top-0 right-0 p-3 text-purple-500/10 group-hover:text-purple-500/20 transition-colors">
                <Zap size={40} />
              </div>
              <p className="text-muted-foreground text-[11px] font-extrabold uppercase tracking-wider">Avg Perf. Score</p>
              <h3 className="text-2xl font-black mt-2 text-purple-600 dark:text-purple-400">
                <AnimatedCounter value={avgPerformance} decimals={1} suffix="/10" />
              </h3>
              <div className="text-[10px] text-muted-foreground mt-1 font-semibold flex items-center gap-1">
                {perfTrend === 'improving' ? (
                  <span className="text-emerald-500 flex items-center font-bold">▲ {improvement}% Growth</span>
                ) : (
                  <span>Stable Performance</span>
                )}
              </div>
            </div>

            {/* 4. Current Rank Card */}
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden group print-card">
              <div className="absolute top-0 right-0 p-3 text-yellow-500/10 group-hover:text-yellow-500/20 transition-colors">
                <Trophy size={40} />
              </div>
              <p className="text-muted-foreground text-[11px] font-extrabold uppercase tracking-wider">Current Rank</p>
              <h3 className="text-2xl font-black mt-2 text-yellow-600 dark:text-yellow-400">
                {avgPerformance >= 8.5 ? 'Top 5%' : avgPerformance >= 7.0 ? 'Top 15%' : 'Rank #12'}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1 font-semibold">
                Based on overall ratings
              </p>
            </div>

            {/* 5. Fee Status Card */}
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden group print-card">
              <div className="absolute top-0 right-0 p-3 text-blue-500/10 group-hover:text-blue-500/20 transition-colors">
                <CreditCard size={40} />
              </div>
              <p className="text-muted-foreground text-[11px] font-extrabold uppercase tracking-wider">Fee Status</p>
              <h3 className={`text-2xl font-black mt-2 uppercase ${
                currentStudent.fees_status === 'paid' ? 'text-emerald-500' : 'text-red-500'
              }`}>
                {currentStudent.fees_status || 'unpaid'}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1 font-semibold truncate">
                {nextDueDate ? `Due: ${new Date(nextDueDate).toLocaleDateString()}` : 'No upcoming dues'}
              </p>
            </div>

            {/* 6. Pending Amount Card */}
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden group print-card">
              <div className="absolute top-0 right-0 p-3 text-amber-500/10 group-hover:text-amber-500/20 transition-colors">
                <DollarSign size={40} />
              </div>
              <p className="text-muted-foreground text-[11px] font-extrabold uppercase tracking-wider">Pending Amount</p>
              <h3 className="text-2xl font-black mt-2 text-amber-600 dark:text-amber-400">
                <AnimatedCounter value={pendingFees} prefix="₹" />
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1 font-semibold">
                Unpaid / Verified dues
              </p>
            </div>

            {/* 7. Duration Plan Remaining (Days Remaining) */}
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden group print-card">
              <div className="absolute top-0 right-0 p-3 text-cyan-500/10 group-hover:text-cyan-500/20 transition-colors">
                <Clock size={40} />
              </div>
              <p className="text-muted-foreground text-[11px] font-extrabold uppercase tracking-wider">Plan Days Left</p>
              <h3 className={`text-2xl font-black mt-2 ${daysRemaining <= 7 ? 'text-red-500 animate-pulse' : 'text-cyan-600 dark:text-cyan-400'}`}>
                <AnimatedCounter value={daysRemaining} suffix=" Days" />
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1 font-semibold truncate">
                {planName}
              </p>
            </div>

            {/* 8. Sessions Attended / Left Card */}
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden group print-card">
              <div className="absolute top-0 right-0 p-3 text-orange-500/10 group-hover:text-orange-500/20 transition-colors">
                <Target size={40} />
              </div>
              <p className="text-muted-foreground text-[11px] font-extrabold uppercase tracking-wider">Sessions Tracker</p>
              <h3 className="text-2xl font-black mt-2 text-orange-600 dark:text-orange-400 flex items-baseline gap-1">
                <AnimatedCounter value={sessionsAttended} />
                <span className="text-slate-300 text-xs font-normal">/</span>
                <span className="text-slate-400 dark:text-slate-600 text-sm"><AnimatedCounter value={sessionsLeft} /></span>
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1 font-semibold">
                Attended / Remaining
              </p>
            </div>

            {/* 9. Upcoming Batch Time Card */}
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden col-span-2 md:col-span-1 group print-card">
              <div className="absolute top-0 right-0 p-3 text-indigo-500/10 group-hover:text-indigo-500/20 transition-colors">
                <CalendarRange size={40} />
              </div>
              <p className="text-muted-foreground text-[11px] font-extrabold uppercase tracking-wider">Upcoming Batch</p>
              <h3 className="text-lg font-black mt-2 text-indigo-600 dark:text-indigo-400 truncate">
                {currentStudent.batch?.start_time || 'N/A'}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1 font-semibold truncate">
                {currentStudent.batch?.timing || 'Mon, Wed, Fri'}
              </p>
            </div>

          </div>

          {/* TWO COLUMN GRID LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN: PRIMARY WIDGETS (2/3 width) */}
            <div className="lg:col-span-2 space-y-8 print-grid">
              
              {/* SKELETON LOADERS FOR CHARTS IF LOADING DETAILED METRICS */}
              {perfLoading ? (
                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
                  <div className="h-6 w-1/3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
                  <div className="h-64 bg-slate-100 dark:bg-slate-900 rounded-xl animate-pulse"></div>
                </div>
              ) : (
                <>
                  {/* Attendance Analytics Preview */}
                  <div className="bg-card rounded-3xl border border-border p-6 shadow-sm print-card">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-foreground flex items-center gap-1.5">
                          <Activity size={18} className="text-emerald-500" /> Attendance Analytics
                        </h3>
                        <p className="text-xs text-muted-foreground">Detailed check-in logs and performance stats</p>
                      </div>
                      
                      <div className="flex gap-4">
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground uppercase font-extrabold">Current Streak</p>
                          <p className="text-md font-black text-orange-500 flex items-center gap-1">
                            <Flame size={14} className="fill-orange-500 text-orange-500" /> {streaks.current} classes
                          </p>
                        </div>
                        <div className="text-right border-l border-border pl-4">
                          <p className="text-[10px] text-muted-foreground uppercase font-extrabold">Longest Streak</p>
                          <p className="text-md font-black text-amber-500">{streaks.longest} classes</p>
                        </div>
                      </div>
                    </div>

                    {attendances.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground font-medium text-sm">
                        No attendance history
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Weekly Heatmap */}
                        <div>
                          <h4 className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider mb-3">Attendance Heatmap (Last 28 Days)</h4>
                          <div className="grid grid-cols-7 gap-2">
                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                              <div key={i} className="text-center text-[10px] text-muted-foreground font-extrabold">{day}</div>
                            ))}
                            {heatmapData.map((day, idx) => {
                              let bg = 'bg-slate-100 dark:bg-slate-900 border-slate-200/50 dark:border-slate-800';
                              let title = `${day.date.toDateString()}: No class scheduled`;
                              
                              if (day.status === 'PRESENT') {
                                bg = 'bg-emerald-500 border-emerald-600/30';
                                title = `${day.date.toDateString()}: Present`;
                              } else if (day.status === 'ABSENT') {
                                bg = 'bg-red-500 border-red-600/30';
                                title = `${day.date.toDateString()}: Absent`;
                              } else if (day.status === 'LATE') {
                                bg = 'bg-amber-400 border-amber-500/30';
                                title = `${day.date.toDateString()}: Late`;
                              }
                              
                              return (
                                <div
                                  key={idx}
                                  title={title}
                                  className={`aspect-square rounded-md border flex items-center justify-center text-[9px] font-bold ${
                                    day.status !== 'NO_CLASS' ? 'text-white' : 'text-slate-400 dark:text-slate-600'
                                  } ${bg}`}
                                >
                                  {day.dayNum}
                                </div>
                              );
                            })}
                          </div>
                          
                          <div className="flex gap-4 mt-4 text-[10px] text-muted-foreground font-semibold flex-wrap">
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> Present</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-400"></span> Late</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500"></span> Absent</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-100 dark:bg-slate-900 border"></span> Rest</span>
                          </div>
                        </div>

                        {/* Pie Chart Rate */}
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-full h-44">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={presentPieData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={45}
                                  outerRadius={65}
                                  paddingAngle={3}
                                  dataKey="value"
                                >
                                  {presentPieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value) => [`${value} sessions`, 'Count']} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="text-center mt-2">
                            <p className="text-xs text-muted-foreground font-bold">Attendance Distribution</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Performance Analytics Preview */}
                  <div className="bg-card rounded-3xl border border-border p-6 shadow-sm print-card">
                    <div>
                      <h3 className="text-lg font-bold text-foreground flex items-center gap-1.5">
                        <Trophy size={18} className="text-purple-500" /> Performance Analysis
                      </h3>
                      <p className="text-xs text-muted-foreground mb-6">Skills assessment metrics & performance history</p>
                    </div>

                    {growthChartData.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground font-medium text-sm">
                        No performance recorded yet
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Radar Chart */}
                        <div className="flex flex-col items-center">
                          <h4 className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider mb-2">Attribute Distribution</h4>
                          <div className="w-full h-56">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={attributeAverages}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: isDark ? '#94a3b8' : '#475569', fontSize: 10, fontWeight: 700 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#94a3b8' }} />
                                <Radar name="Student Averages" dataKey="Score" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.15} />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Growth Line Chart */}
                        <div>
                          <h4 className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider mb-4">Overall Performance Growth</h4>
                          <div className="w-full h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={growthChartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <YAxis domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <Tooltip formatter={(value) => [`${value} / 10`, 'Overall Rating']} />
                                <Line type="monotone" dataKey="Score" stroke="#7c3aed" strokeWidth={3} dot={{ fill: '#7c3aed', r: 4 }} activeDot={{ r: 6 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Dynamic Achievements cabinet */}
              <div className="bg-card rounded-3xl border border-border p-6 shadow-sm print-card">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-1.5">
                      <Award size={18} className="text-amber-500" /> Digital Trophy Cabinet
                    </h3>
                    <p className="text-xs text-muted-foreground">Badges, Milestones and Certificates earned</p>
                  </div>
                  <span className="text-xs font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-500 px-3 py-1 rounded-full">
                    {achievements.length} Unlocked
                  </span>
                </div>

                {achievements.length === 0 ? (
                  <div className="py-10 text-center border border-dashed rounded-2xl flex flex-col items-center justify-center p-6 bg-slate-50/50 dark:bg-slate-900/30">
                    <Trophy className="w-10 h-10 text-slate-300 dark:text-slate-800 mb-2 animate-bounce" />
                    <p className="text-sm font-semibold text-slate-500">Cabinet is currently empty</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Complete assessments & sessions to unlock badges!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {achievements.map((item, idx) => (
                      <motion.div
                        key={idx}
                        whileHover={{ y: -3, scale: 1.01 }}
                        className={`rounded-2xl p-4 border bg-gradient-to-br ${item.color} border-border flex gap-3.5 items-start`}
                      >
                        <span className="text-3xl flex-shrink-0">{item.icon}</span>
                        <div>
                          <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
                          <p className="text-xs text-muted-foreground font-medium mt-1 leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT COLUMN: SIDEBAR CONTENT (1/3 width) */}
            <div className="space-y-8 print-grid">
              
              {/* Quick Actions Panel */}
              <div className="bg-card rounded-3xl border border-border p-6 shadow-sm no-print">
                <h3 className="text-[15px] font-extrabold uppercase text-muted-foreground tracking-wider mb-4 flex items-center gap-1">
                  <Play size={12} className="fill-muted-foreground" /> Quick Operations
                </h3>
                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="flex items-center justify-between w-full p-3 rounded-xl border border-border bg-card hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors text-left"
                  >
                    <span className="text-xs font-bold flex items-center gap-2">
                      <Activity className="text-emerald-500" size={16} /> View Attendance Log
                    </span>
                    <ChevronRight size={14} className="text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="flex items-center justify-between w-full p-3 rounded-xl border border-border bg-card hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors text-left"
                  >
                    <span className="text-xs font-bold flex items-center gap-2">
                      <Zap className="text-purple-500" size={16} /> View Performance history
                    </span>
                    <ChevronRight size={14} className="text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => setActiveTab('finances')}
                    className="flex items-center justify-between w-full p-3 rounded-xl border border-border bg-card hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors text-left"
                  >
                    <span className="text-xs font-bold flex items-center gap-2">
                      <CreditCard className="text-blue-500" size={16} /> Payment & Plan History
                    </span>
                    <ChevronRight size={14} className="text-muted-foreground" />
                  </button>
                  <button
                    onClick={handleDownloadReportCard}
                    className="flex items-center justify-between w-full p-3 rounded-xl border border-border bg-card hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors text-left"
                  >
                    <span className="text-xs font-bold flex items-center gap-2">
                      <Printer className="text-amber-500" size={16} /> Print Report Card
                    </span>
                    <DownloadCloud size={14} className="text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleDownloadReceipt(null)}
                    disabled={!lastPayment}
                    className={`flex items-center justify-between w-full p-3 rounded-xl border border-border bg-card transition-colors text-left ${
                      !lastPayment ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <span className="text-xs font-bold flex items-center gap-2">
                      <FileText className="text-cyan-500" size={16} /> Print Last Receipt
                    </span>
                    <Download size={14} className="text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => setActiveModal('coach')}
                    className="flex items-center justify-between w-full p-3 rounded-xl border border-border bg-card hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors text-left"
                  >
                    <span className="text-xs font-bold flex items-center gap-2">
                      <MessageSquare className="text-orange-500" size={16} /> Contact Academy Coach
                    </span>
                    <ChevronRight size={14} className="text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => setActiveModal('query')}
                    className="flex items-center justify-between w-full p-3 rounded-xl border border-border bg-card hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors text-left"
                  >
                    <span className="text-xs font-bold flex items-center gap-2">
                      <HelpCircle className="text-indigo-500" size={16} /> Raise Academy Query
                    </span>
                    <ChevronRight size={14} className="text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Student Information Profile Card */}
              <div className="bg-card rounded-3xl border border-border p-6 shadow-sm print-card">
                <h3 className="text-[15px] font-extrabold uppercase text-muted-foreground tracking-wider mb-4 flex items-center gap-1.5">
                  <Smile size={16} className="text-emerald-500" /> Athlete Information
                </h3>
                <div className="space-y-3 text-xs font-bold text-foreground">
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Age</span>
                    <span>{currentStudent.age || (currentStudent.dob ? Math.floor((new Date() - new Date(currentStudent.dob)) / (1000 * 60 * 60 * 24 * 365.25)) : '—')} Years</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Gender</span>
                    <span className="capitalize">{currentStudent.gender || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Blood Group</span>
                    <span>{currentStudent.blood_group || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Emergency Contact</span>
                    <span>{currentStudent.emergency_contact || currentStudent.parent_phone || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Parent Phone</span>
                    <span>{parent.phone || currentStudent.parent_phone || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Assigned Coach</span>
                    <span>{latestAssessment?.coach?.name || 'Academy Coach'}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Drill Sport</span>
                    <span>{currentStudent.sport?.name || 'General Sport'}</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-muted-foreground">Batch Timing</span>
                    <span>{currentStudent.batch?.start_time ? `${currentStudent.batch.start_time} - ${currentStudent.batch.end_time}` : '—'}</span>
                  </div>
                </div>
              </div>

              {/* Coach Notes */}
              <div className="bg-card rounded-3xl border border-border p-6 shadow-sm print-card">
                <h3 className="text-[15px] font-extrabold uppercase text-muted-foreground tracking-wider mb-4 flex items-center gap-1.5">
                  <Star size={16} className="text-amber-500 fill-amber-500" /> Coach Remarks & Notes
                </h3>
                
                {coachNotes.length === 0 ? (
                  <div className="p-6 border border-dashed rounded-2xl text-center bg-slate-50/30 dark:bg-slate-900/10">
                    <MessageSquare size={28} className="text-slate-300 dark:text-slate-800 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-500">No notes recorded yet</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Remarks will populate after coach evaluates drills.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {coachNotes.slice(0, 3).map((note, index) => (
                      <div key={index} className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-border flex gap-3 items-start">
                        <span className="text-lg">💡</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-extrabold uppercase text-primary">Drill Update</span>
                            <span className="text-[10px] text-muted-foreground">{new Date(note.note_date).toLocaleDateString()}</span>
                          </div>
                          {note.performance_notes && (
                            <p className="text-xs text-foreground font-medium mt-1 leading-relaxed break-words">
                              <span className="font-bold">Skills:</span> {note.performance_notes}
                            </p>
                          )}
                          {note.behaviour_notes && (
                            <p className="text-xs text-foreground font-medium mt-1 leading-relaxed break-words">
                              <span className="font-bold">Behaviour:</span> {note.behaviour_notes}
                            </p>
                          )}
                          {note.achievements && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1 leading-relaxed break-words">
                              ★ Achievement: {note.achievements}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming Schedule Timeline */}
              <div className="bg-card rounded-3xl border border-border p-6 shadow-sm print-card">
                <h3 className="text-[15px] font-extrabold uppercase text-muted-foreground tracking-wider mb-4">Upcoming Timeline</h3>
                <div className="space-y-4">
                  
                  {/* Next class schedule */}
                  <div className="relative pl-6 border-l-2 border-orange-500">
                    <span className="absolute -left-1.5 top-1.5 w-3 h-3 bg-orange-500 rounded-full"></span>
                    <p className="text-[10px] text-orange-500 font-extrabold uppercase">Next Class</p>
                    <h4 className="text-xs font-bold text-foreground mt-0.5">
                      {currentStudent.batch ? `Batch: ${currentStudent.batch.name}` : 'Assigning Batch'}
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {currentStudent.batch ? `${currentStudent.batch.timing || 'Mon, Wed, Fri'} @ ${currentStudent.batch.start_time}` : 'Contact support'}
                    </p>
                  </div>

                  {/* Monthly Assessment milestone */}
                  <div className="relative pl-6 border-l-2 border-purple-500">
                    <span className="absolute -left-1.5 top-1.5 w-3 h-3 bg-purple-500 rounded-full"></span>
                    <p className="text-[10px] text-purple-500 font-extrabold uppercase">Next Assessment</p>
                    <h4 className="text-xs font-bold text-foreground mt-0.5">Fitness & Skill Drills</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Scheduled at the end of the current plan duration.</p>
                  </div>

                  {/* Tournament */}
                  <div className="relative pl-6 border-l-2 border-emerald-500">
                    <span className="absolute -left-1.5 top-1.5 w-3 h-3 bg-emerald-500 rounded-full"></span>
                    <p className="text-[10px] text-emerald-500 font-extrabold uppercase">Tournament Event</p>
                    <h4 className="text-xs font-bold text-foreground mt-0.5">Inter-Academy League</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Coming up next month. Registration details soon.</p>
                  </div>
                </div>
              </div>

              {/* Recent Activity Logs */}
              <div className="bg-card rounded-3xl border border-border p-6 shadow-sm print-card">
                <h3 className="text-[15px] font-extrabold uppercase text-muted-foreground tracking-wider mb-4">Recent Activity</h3>
                {activityTimeline.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center">No recent activity logged.</p>
                ) : (
                  <div className="space-y-4">
                    {activityTimeline.map((act, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        <span className={`w-2 h-2 rounded-full mt-1.5 ${act.color}`}></span>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold text-foreground">{act.title}</h4>
                            <span className="text-[9px] text-muted-foreground">{act.date}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{act.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notifications / Announcements Panel */}
              <div className="bg-card rounded-3xl border border-border p-6 shadow-sm no-print">
                <div className="flex items-center gap-1.5 mb-4">
                  <Bell className="text-indigo-500" size={18} />
                  <h3 className="text-[15px] font-extrabold uppercase text-muted-foreground tracking-wider">Academy Bulletins</h3>
                </div>
                {announcementsList.length === 0 ? (
                  <p className="text-xs text-muted-foreground font-medium text-center">No notifications or announcements.</p>
                ) : (
                  <div className="space-y-3.5">
                    {announcementsList.slice(0, 3).map((note, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-border">
                        <h4 className="text-xs font-bold text-foreground flex items-center gap-1">
                          <Info size={12} className="text-indigo-500" /> {note.note_text ? 'Coach Remark' : 'Bulletin'}
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                          {note.note_text || note.content || 'Remark added for student performance metrics.'}
                        </p>
                        <span className="text-[9px] text-slate-400 font-semibold block mt-1.5">
                          {new Date(note.note_date || note.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>

        </motion.div>
      )}

      {/* TAB CONTENT 2: ANALYTICS */}
      {activeTab === 'analytics' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
          {/* Detailed Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print-grid">
            
            {/* Monthly Attendance Chart */}
            <div className="bg-card rounded-3xl border border-border p-6 shadow-sm print-card">
              <h3 className="text-md font-bold text-foreground mb-1">Monthly Attendance Trend</h3>
              <p className="text-xs text-muted-foreground mb-6">Aggregate percentage over the preceding months</p>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  {monthlyChartData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No attendance history</div>
                  ) : (
                    <LineChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                      <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} suffix="%" />
                      <Tooltip formatter={(value) => [`${value}%`, 'Attendance Rate']} />
                      <Line type="monotone" dataKey="Rate" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Attendance Status Pie */}
            <div className="bg-card rounded-3xl border border-border p-6 shadow-sm print-card">
              <h3 className="text-md font-bold text-foreground mb-1">Status Breakdown</h3>
              <p className="text-xs text-muted-foreground mb-6">Percentage comparison of check-in events</p>
              <div className="w-full h-64 flex items-center justify-center">
                {presentPieData.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No attendance records found</div>
                ) : (
                  <div className="w-full h-full flex flex-col md:flex-row items-center justify-center gap-6">
                    <div className="w-48 h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={presentPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {presentPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} classes`, 'Count']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#10b981]"></span> <span className="text-xs font-bold text-foreground">Present: {presentCount}</span></div>
                      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#ef4444]"></span> <span className="text-xs font-bold text-foreground">Absent: {absentCount}</span></div>
                      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#f59e0b]"></span> <span className="text-xs font-bold text-foreground">Late: {lateCount}</span></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Performance Drill radar */}
            <div className="bg-card rounded-3xl border border-border p-6 shadow-sm print-card">
              <h3 className="text-md font-bold text-foreground mb-1">Performance Skill Map</h3>
              <p className="text-xs text-muted-foreground mb-6">Radar evaluation scores based on drill categories</p>
              <div className="w-full h-64 flex items-center justify-center">
                {radarData.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No performance recorded yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: isDark ? '#94a3b8' : '#475569', fontSize: 11, fontWeight: 700 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 10]} />
                      <Radar name="Student Averages" dataKey="Score" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.15} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Latest Assessment Drill Bar Comparison */}
            <div className="bg-card rounded-3xl border border-border p-6 shadow-sm print-card">
              <h3 className="text-md font-bold text-foreground mb-1">Latest Assessment Parameters</h3>
              <p className="text-xs text-muted-foreground mb-6">Drill breakdown of the latest coach assessment</p>
              <div className="w-full h-64">
                {attributeBarData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No attribute data logged yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attributeBarData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                      <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 10]} />
                      <Tooltip formatter={(value) => [`${value} / 10`, 'Score']} />
                      <Bar dataKey="Score" radius={[4, 4, 0, 0]}>
                        {attributeBarData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#7c3aed' : '#a78bfa'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>

          {/* Performance attributes grid checklist */}
          <div className="bg-card rounded-3xl border border-border p-6 shadow-sm print-card">
            <h3 className="text-md font-bold text-foreground mb-4">Athletic Attribute Ledger</h3>
            {attributeAverages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No performance statistics recorded yet.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {attributeAverages.map((attr, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-border">
                    <p className="text-xs text-muted-foreground font-semibold">{attr.subject}</p>
                    <div className="flex items-baseline gap-2 mt-1.5">
                      <span className="text-2xl font-black text-foreground">{attr.Score}</span>
                      <span className="text-[10px] text-slate-400">/ 10</span>
                    </div>
                    {/* Tiny Progress Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div className="bg-purple-500 h-full rounded-full" style={{ width: `${attr.Score * 10}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* TAB CONTENT 3: FINANCES & PLANS */}
      {activeTab === 'finances' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print-grid">
            
            {/* Duration Plan Progress */}
            <div className="bg-card rounded-3xl border border-border p-6 shadow-sm flex flex-col md:flex-row items-center gap-8 print-card">
              <CircularProgressRing percentage={planProgress} size={150} strokeWidth={10} primaryColor="text-blue-500">
                <span className="text-[10px] text-muted-foreground uppercase font-extrabold">Plan status</span>
                <span className="text-2xl font-black text-foreground">{Math.round(planProgress)}%</span>
                <span className="text-[9px] text-muted-foreground mt-0.5">Used</span>
              </CircularProgressRing>
              
              <div className="space-y-3.5 flex-1 w-full">
                <div>
                  <h3 className="text-lg font-black text-foreground">{planName}</h3>
                  <p className="text-xs text-muted-foreground">Student active duration details</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs font-bold border-t border-border pt-3">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-extrabold">Start Date</span>
                    <span className="text-foreground mt-0.5 block">{planStart ? new Date(planStart).toLocaleDateString() : '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-extrabold">Expiry Date</span>
                    <span className="text-foreground mt-0.5 block">{planEnd ? new Date(planEnd).toLocaleDateString() : '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-extrabold">Days Remaining</span>
                    <span className={`mt-0.5 block ${daysRemaining <= 7 ? 'text-red-500 font-extrabold' : 'text-foreground'}`}>
                      {daysRemaining} Days
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-extrabold">Class Sessions</span>
                    <span className="text-foreground mt-0.5 block">{sessionsAttended} / {totalSessions} used</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment / Fees Ring */}
            <div className="bg-card rounded-3xl border border-border p-6 shadow-sm flex flex-col md:flex-row items-center gap-8 print-card">
              <CircularProgressRing percentage={feePaymentProgress} size={150} strokeWidth={10} primaryColor="text-emerald-500">
                <span className="text-[10px] text-muted-foreground uppercase font-extrabold">Paid Tally</span>
                <span className="text-xl font-black text-foreground">₹{paidFees.toLocaleString()}</span>
                <span className="text-[9px] text-muted-foreground mt-0.5">Of ₹{(paidFees + pendingFees).toLocaleString()}</span>
              </CircularProgressRing>

              <div className="space-y-3.5 flex-1 w-full">
                <div>
                  <h3 className="text-lg font-black text-foreground flex items-center gap-1.5">
                    Premium Payments <CreditCard size={16} className="text-emerald-500" />
                  </h3>
                  <p className="text-xs text-muted-foreground">Transactions and fee statements</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-bold border-t border-border pt-3">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-extrabold">Paid Fees</span>
                    <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 block">₹{paidFees.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-extrabold">Pending Dues</span>
                    <span className="text-red-500 mt-0.5 block">₹{pendingFees.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-extrabold">Next Due Date</span>
                    <span className="text-foreground mt-0.5 block">{nextDueDate ? new Date(nextDueDate).toLocaleDateString() : '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-extrabold">Last Verified Amount</span>
                    <span className="text-foreground mt-0.5 block">₹{lastPayment ? lastPayment.amount.toLocaleString() : '0'}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Payment History Receipts List */}
          <div className="bg-card rounded-3xl border border-border p-6 shadow-sm print-card">
            <h3 className="text-md font-bold text-foreground mb-4">Receipt Audit Log</h3>
            
            {receipts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No pending or verified payment receipts found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-semibold">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Receipt Code</th>
                      <th className="py-3 px-4">Paid On</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Reference ID</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Verification</th>
                      <th className="py-3 px-4 no-print text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((rec, idx) => (
                      <tr key={idx} className="border-b border-border hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-foreground">{rec.receipt_number || `REC-${rec.id}`}</td>
                        <td className="py-3.5 px-4">{new Date(rec.payment_date).toLocaleDateString()}</td>
                        <td className="py-3.5 px-4 uppercase">{rec.method || 'UPI'}</td>
                        <td className="py-3.5 px-4 font-mono">{rec.transaction_number || 'N/A'}</td>
                        <td className="py-3.5 px-4 text-foreground font-black">₹{parseFloat(rec.amount).toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                            rec.status === 'PAID' || rec.status === 'VERIFIED' || rec.status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : rec.status === 'REJECTED' || rec.status === 'FAILED'
                                ? 'bg-red-500/10 text-red-500'
                                : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right no-print">
                          <button
                            onClick={() => handleDownloadReceipt(rec)}
                            className="btn-ghost p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors inline-flex items-center"
                            title="Print PDF Receipt"
                          >
                            <Printer size={14} className="text-primary" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </motion.div>
      )}

      {/* MODAL DIALOGS */}
      <AnimatePresence>
        
        {/* Contact Coach Modal */}
        {activeModal === 'coach' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full relative shadow-xl"
            >
              <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                <XCircle size={20} />
              </button>
              <h3 className="text-lg font-bold text-foreground mb-4">Academy Coach Contact</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center font-black">
                    {getInitials(latestAssessment?.coach?.name || 'Coach')}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{latestAssessment?.coach?.name || 'Assigned Academy Coach'}</h4>
                    <p className="text-xs text-muted-foreground">Certified Performance Instructor</p>
                  </div>
                </div>

                <div className="border-t border-border pt-3 space-y-2 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-muted-foreground" />
                    <span className="text-foreground">coach.academy@sams.com</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-muted-foreground" />
                    <span className="text-foreground">+91 98765 43210</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-muted-foreground" />
                    <span className="text-foreground">{currentStudent.academy?.name || 'Main Academy Court'}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActiveModal('query');
                    setQuerySubject('coach');
                  }}
                  className="w-full bg-primary hover:bg-emerald-600 text-white rounded-xl py-2.5 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <MessageSquare size={14} /> Send Dashboard Query
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Raise Query Modal */}
        {activeModal === 'query' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-3xl border border-border p-6 max-w-md w-full relative shadow-xl"
            >
              <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                <XCircle size={20} />
              </button>
              <h3 className="text-lg font-bold text-foreground mb-1">Raise Academy Query</h3>
              <p className="text-xs text-muted-foreground mb-4">Direct message standard query to Academy Support desk.</p>
              
              {querySuccess ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 className="text-sm font-black text-foreground">Query Submitted</h4>
                  <p className="text-xs text-muted-foreground">The academy support team will respond shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleQuerySubmit} className="space-y-4">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-extrabold block mb-1">Topic</label>
                    <select
                      value={querySubject}
                      onChange={(e) => setQuerySubject(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-border rounded-xl px-3 py-2 text-xs font-semibold focus:ring-1 focus:ring-primary outline-none"
                    >
                      <option value="general">General Support</option>
                      <option value="fees">Fees & Payments</option>
                      <option value="coach">Feedback / Coach Notes</option>
                      <option value="schedule">Batch Scheduling</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-extrabold block mb-1">Message</label>
                    <textarea
                      required
                      rows={4}
                      value={queryText}
                      onChange={(e) => setQueryText(e.target.value)}
                      placeholder="Type your query description here..."
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-border rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-primary outline-none resize-none"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={querySubmitting || !queryText.trim()}
                    className="w-full bg-primary hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-xs font-bold transition-all shadow-sm"
                  >
                    {querySubmitting ? 'Submitting query...' : 'Submit Query'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}

      </AnimatePresence>

    </div>
  );
}