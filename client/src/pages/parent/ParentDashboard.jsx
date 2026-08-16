import { useEffect, useState, useCallback, useMemo } from 'react';
import { parentGet, parentPost } from '../../api/client';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useActiveStudent } from '../../context/ActiveStudentContext';
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
import Loader from '../../components/Loader';

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
function CircularProgressRing({ percentage, size = 120, strokeWidth = 8, primaryColor = 'text-primary', secondaryColor = 'text-slate-100 dark:text-slate-800', children }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(Math.max(percentage, 0), 100) / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
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
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { activeStudent, loading: studentLoading } = useActiveStudent();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeSessions, setActiveSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const [calendarStats, setCalendarStats] = useState(null);
  const [calendarLoading, setCalendarLoading] = useState(false);

  useEffect(() => {
    const loadCalendarStats = async () => {
      try {
        setCalendarLoading(true);
        let url = '/parent/calendar/dashboard';
        if (activeStudent?.student_id) {
          url += `?student_id=${activeStudent.student_id}`;
        }
        const result = await parentGet(url);
        if (result?.success) {
          setCalendarStats(result.data);
        }
      } catch (err) {
        console.error('Failed to load calendar dashboard stats:', err);
      } finally {
        setCalendarLoading(false);
      }
    };
    loadCalendarStats();
  }, [activeStudent]);

  // Consolidated detailed performance data
  const [perfData, setPerfData] = useState(null);
  const [perfLoading, setPerfLoading] = useState(false);

  // Modal Dialog states
  const [activeModal, setActiveModal] = useState(null); // 'coach', 'query'
  const [querySubject, setQuerySubject] = useState('general');
  const [queryText, setQueryText] = useState('');
  const [querySubmitting, setQuerySubmitting] = useState(false);
  const [querySuccess, setQuerySuccess] = useState(false);

  // Filter for dashboard view (overview, analytics, finances)
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    console.log('[ParentDashboard] activeStudent changed:', activeStudent);
    if (activeStudent) {
      console.log('[ParentDashboard] Fetching data for student:', activeStudent.student_id);
      fetchDashboardData(activeStudent.student_id);
      fetchPerformanceDashboard(activeStudent.student_id);
    } else {
      console.log('[ParentDashboard] No active student, setting loading to false');
      setLoading(false);
    }
  }, [activeStudent]);

  // Keyboard accessibility listeners (ESC to close modals)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const fetchDashboardData = async (studentId) => {
    console.log('[ParentDashboard] fetchDashboardData called for studentId:', studentId);
    try {
      const token = localStorage.getItem('parent_token');
      const response = await fetch(`/api/v1/parent/dashboard?studentId=${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[ParentDashboard] Dashboard data received:', data.data);
        setDashboardData(data.data);
      } else {
        console.error('[ParentDashboard] Dashboard API failed:', response.status);
      }
    } catch (error) {
      console.error('[ParentDashboard] Failed to update student metrics:', error);
    } finally {
      console.log('[ParentDashboard] Setting loading to false');
      setLoading(false);
    }
  };

  const fetchPerformanceDashboard = async (studentId) => {
    console.log('[ParentDashboard] fetchPerformanceDashboard called for studentId:', studentId);
    try {
      setPerfLoading(true);
      const result = await parentGet(`/parent/children/${studentId}/performance/dashboard`);
      console.log('[ParentDashboard] Performance data received:', result.data || result);
      setPerfData(result.data || result);
    } catch (err) {
      console.error('[ParentDashboard] Failed to fetch performance dashboard details:', err);
    } finally {
      console.log('[ParentDashboard] Setting perfLoading to false');
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
  const currentStudent = activeStudent || {};

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
      } else {
        hitEnd = true;
        tempStreak = 0;
      }
    }
    return { current: currentStreak, longest: longestStreak };
  }, [attendances]);

  // Achievements
  const achievements = useMemo(() => {
    const cabinet = [];
    if (attendanceRate >= 80) cabinet.push({ title: 'Constant Presence', desc: 'Maintained above 80% check-in rate', icon: '🔥', color: 'from-orange-500/10 to-amber-500/10 text-orange-600' });
    if (streaks.longest >= 5) cabinet.push({ title: 'Streak Master', desc: 'Checked in 5 classes consecutively', icon: '⚡', color: 'from-blue-500/10 to-cyan-500/10 text-blue-600' });
    if (parseFloat(metrics.avgPerformanceScore) >= 8.5) cabinet.push({ title: 'Elite Performer', desc: 'Rated 8.5+ average rating in drills', icon: '🏆', color: 'from-yellow-500/10 to-amber-500/10 text-yellow-600 font-extrabold' });
    return cabinet;
  }, [attendanceRate, streaks, metrics]);

  // Dynamic calendars heatmap for last 28 days
  const heatmapData = useMemo(() => {
    const list = [];
    const now = new Date();
    // 28 days backward
    for (let i = 27; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const att = attendances.find(a => {
        const check = new Date(a.date);
        return check.getDate() === d.getDate() && 
               check.getMonth() === d.getMonth() && 
               check.getFullYear() === d.getFullYear();
      });
      list.push({
        date: d,
        dayNum: d.getDate(),
        status: att ? att.status : 'NO_CLASS'
      });
    }
    return list;
  }, [attendances]);

  const prepareGraphData = () => {
    return heatmapData.filter(d => d.status !== 'NO_CLASS');
  };

  // Growth Chart for Performance History
  const growthChartData = useMemo(() => {
    if (!perfData?.historyData) return [];
    return [...perfData.historyData]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-6) // Last 6 evaluations
      .map(h => ({
        date: new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        Score: parseFloat(h.score.toFixed(1))
      }));
  }, [perfData]);

  // Skill parameters bar comparison
  const attributeBarData = useMemo(() => {
    if (!perfData?.latestAssessment?.scores) return [];
    return perfData.latestAssessment.scores.map(s => ({
      name: s.attribute?.name || 'Drill',
      Score: s.score
    }));
  }, [perfData]);

  // Attribute list averages
  const attributeAverages = useMemo(() => {
    if (!perfData?.attributeAverages) return [];
    return Object.entries(perfData.attributeAverages).map(([subj, score]) => ({
      subject: subj,
      Score: parseFloat(score.toFixed(1))
    }));
  }, [perfData]);

  // Radar chart formatting
  const radarData = useMemo(() => {
    return attributeAverages.map(a => ({
      subject: a.subject,
      Score: a.Score,
      fullMark: 10
    }));
  }, [attributeAverages]);

  // Interactive Coach notes remarks
  const coachNotes = useMemo(() => {
    return perfData?.coachNotes || currentStudent.performance_evaluations || [];
  }, [perfData, currentStudent]);

  // Latest evaluation rating
  const latestAssessment = useMemo(() => {
    return perfData?.latestAssessment || null;
  }, [perfData]);

  const avgPerformance = useMemo(() => {
    return parseFloat(perfData?.overallAverage || metrics.avgPerformanceScore || 0);
  }, [perfData, metrics]);

  // Financial status variables
  const pendingFees = useMemo(() => parseFloat(currentStudent.pending_fees || metrics.pendingFees || 0), [currentStudent, metrics]);
  const paidFees = useMemo(() => parseFloat(currentStudent.total_fees_paid || 0), [currentStudent]);
  const feePaymentProgress = useMemo(() => {
    const total = paidFees + pendingFees;
    if (total === 0) return 0;
    return (paidFees / total) * 100;
  }, [paidFees, pendingFees]);

  const planName = currentStudent.plan?.name || 'No Plan Active';
  const planStart = currentStudent.plan_start_date;
  const planEnd = currentStudent.plan_expiry_date;
  
  const planStatus = useMemo(() => {
    if (!currentStudent || !currentStudent.enrollments || currentStudent.enrollments.length === 0) {
      return { label: 'No Plan', color: 'bg-slate-500/10 text-slate-700 border-slate-500/20', description: 'No active plan assigned.' };
    }
    
    if (currentStudent.status === 'INACTIVE' && currentStudent.auto_deactivated) {
      return {
        label: 'Plan Expired — Deactivated',
        color: 'bg-rose-500/10 text-rose-600 border border-rose-500/20',
        description: 'Your child\'s plan has expired and the grace period has ended. The student has been temporarily deactivated.'
      };
    }
    
    const activeEnrollment = currentStudent.enrollments.find(e => e.is_active) || currentStudent.enrollments[0];
    if (!activeEnrollment || !activeEnrollment.plan_end_date) {
      return { label: 'Plan Active', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', description: 'Plan is active.' };
    }

    const expiryTime = new Date(activeEnrollment.plan_end_date).getTime();
    const nowTime = new Date().getTime();
    const diffTime = expiryTime - nowTime;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0 && diffDays <= 10) {
      return {
        label: 'Plan Expiring Soon',
        color: 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20',
        description: `Your child's current plan will expire in ${diffDays} days. Please renew to continue training.`
      };
    } else if (diffDays <= 0) {
      const graceEnd = expiryTime + 2 * 24 * 60 * 60 * 1000;
      if (nowTime < graceEnd) {
        const graceDays = Math.ceil((graceEnd - nowTime) / (1000 * 60 * 60 * 24));
        return {
          label: 'Plan Expired — Grace Period',
          color: 'bg-orange-500/10 text-orange-600 border border-orange-500/20 animate-pulse',
          description: `Plan expired. Grace period remaining: ${graceDays} day(s) before automatic deactivation.`
        };
      } else {
        return {
          label: 'Plan Expired — Deactivated',
          color: 'bg-rose-500/10 text-rose-600 border border-rose-500/20',
          description: 'Your child\'s plan has expired and the grace period has ended. The student has been temporarily deactivated.'
        };
      }
    }

    return { label: 'Plan Active', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', description: 'Plan is active.' };
  }, [currentStudent]);

  const daysRemaining = useMemo(() => {
    if (!planEnd) return 0;
    const diff = new Date(planEnd) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [planEnd]);

  const planProgress = useMemo(() => {
    if (!planStart || !planEnd) return 0;
    const total = new Date(planEnd) - new Date(planStart);
    const passed = new Date() - new Date(planStart);
    return Math.min(100, Math.max(0, (passed / total) * 100));
  }, [planStart, planEnd]);

  // Session tallies
  const totalSessions = currentStudent.plan?.total_sessions || 0;
  const sessionsAttended = presentCount + lateCount;
  const sessionsLeft = Math.max(0, totalSessions - sessionsAttended);

  // Bulletins announcements list
  const announcementsList = useMemo(() => {
    return dashboardData?.announcements || [];
  }, [dashboardData]);

  // Chronological activities list
  const activityTimeline = useMemo(() => {
    const list = [];
    
    // Checked in logs
    attendances.slice(0, 5).forEach(att => {
      list.push({
        title: `Attendance Checked`,
        desc: `Checked-in as ${att.status} for drill classes.`,
        date: new Date(att.date).toLocaleDateString(),
        timestamp: new Date(att.date).getTime(),
        color: att.status === 'PRESENT' ? 'bg-primary' : att.status === 'LATE' ? 'bg-amber-500' : 'bg-rose-500'
      });
    });

    // Payments logs
    const receipts = dashboardData?.payments || [];
    receipts.slice(0, 3).forEach(rec => {
      list.push({
        title: `Payment submitted`,
        desc: `Fee payout ₹${parseFloat(rec.amount).toLocaleString()} status: ${rec.status}`,
        date: new Date(rec.payment_date).toLocaleDateString(),
        timestamp: new Date(rec.payment_date).getTime(),
        color: rec.status === 'PAID' || rec.status === 'VERIFIED' || rec.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-amber-500'
      });
    });

    // Sort newest first
    return list.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [attendances, dashboardData]);

  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    if (!queryText.trim() || !activeStudent) return;
    
    try {
      setQuerySubmitting(true);
      await parentPost('/parent/queries', {
        subject: querySubject,
        message: queryText,
        student_id: activeStudent.student_id
      });
      setQuerySuccess(true);
      setQueryText('');
      setTimeout(() => {
        setActiveModal(null);
        setQuerySuccess(false);
      }, 1800);
    } catch (err) {
      console.error(err);
    } finally {
      setQuerySubmitting(false);
    }
  };

  const handleDownloadReceipt = async (receiptObj) => {
    const target = receiptObj || (dashboardData?.payments?.length ? dashboardData.payments[0] : null);
    if (!target) {
      alert('No payment receipt available.');
      return;
    }
    try {
      const receiptId = target.receipt_id || target.id || target.payment_id;
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
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid var(--theme-primary, #10b981); padding-bottom: 20px; margin-bottom: 20px; }
            .logo { font-size: 24px; font-weight: 800; color: var(--theme-primary, #10b981); }
            .title { text-align: right; }
            .title h2 { font-size: 20px; margin: 0; color: #1e293b; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .item label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; display: block; margin-bottom: 2px; }
            .item span { font-size: 14px; font-weight: 500; color: #1e293b; }
            .amount-box { background: #f0fdf4; border: 1px dashed var(--theme-primary, #10b981); padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .amount-box h3 { font-size: 26px; margin: 0; color: var(--theme-primary, #10b981); }
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
      alert('Unable to load receipt print layout.');
    }
  };

  const handleDownloadReportCard = () => {
    window.print();
  };

  if (studentLoading) return <Loader />;
  if (loading) return <Loader />;
  if (!activeStudent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold">No Active Student</h3>
        <p className="text-xs">Please ensure you have at least one child registered.</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold">Failed to load Dashboard</h3>
        <p className="text-xs">{error}</p>
      </div>
    );
  }

  const nextDueDate = currentStudent.next_due_date || (dashboardData?.payments?.length && dashboardData.payments[0].due_date) || null;

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto font-sans relative text-left">
      
      {/* Top Welcome Panel */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border/50 no-print"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            Welcome back, {parent?.name || 'Parent'}! <Sparkles className="text-amber-500 fill-amber-500" size={24} />
          </h1>
          <p className="text-xs font-bold text-muted-foreground mt-0.5 uppercase tracking-wider">
            Track metrics and athlete developmental logs in real-time
          </p>
        </div>
      </motion.div>

      {/* Renewal Status Banner */}
      {planStatus && planStatus.label !== 'Plan Active' && (
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 border rounded-2xl shadow-sm no-print ${planStatus.color}`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <h3 className="font-extrabold text-sm flex items-center gap-1.5">
                  {planStatus.label}
                </h3>
                <p className="text-xs font-bold mt-0.5 opacity-90">
                  {planStatus.description}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/parent/fees')}
              className="text-[10px] font-black uppercase tracking-wider bg-foreground text-background px-3 py-1.5 rounded-full shrink-0 hover:opacity-90 transition-opacity"
            >
              Renew Plan / Pay Fees
            </button>
          </div>
        </motion.div>
      )}

      {/* Live class indicator session banner */}
      {studentActiveSession && (
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl shadow-sm no-print"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
              <div>
                <h3 className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-1.5">
                  LIVE Session Active
                </h3>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  {studentActiveSession.batch?.name} • {studentActiveSession.batch?.sport?.name} • Instructor: {studentActiveSession.coach?.name}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full shrink-0">
              Started {new Date(studentActiveSession.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </motion.div>
      )}

      {/* Tabs list */}
      <div className="flex border-b border-border gap-2 no-print overflow-x-auto scrollbar-none tabs-container">
        {[
          { id: 'overview', label: 'Dashboard Overview', icon: Trophy },
          { id: 'analytics', label: 'Detailed Analytics', icon: TrendingUp },
          { id: 'finances', label: 'Plans & Finances', icon: CreditCard }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              
              {/* 1. Attendance Rate */}
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Attendance Rate</p>
                <h3 className="text-2xl font-black text-primary mt-2">
                  <AnimatedCounter value={attendanceRate} suffix="%" />
                </h3>
                <p className="text-[9px] text-muted-foreground font-semibold mt-1 uppercase">Class presence tally</p>
              </div>

              {/* 2. Present/Absent/Late */}
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Checked-in Stats</p>
                <h3 className="text-2xl font-black mt-2 text-foreground flex items-baseline gap-1">
                  <span className="text-primary"><AnimatedCounter value={presentCount} /></span>
                  <span className="text-slate-300 text-xs font-normal">/</span>
                  <span className="text-rose-500"><AnimatedCounter value={absentCount} /></span>
                  <span className="text-slate-300 text-xs font-normal">/</span>
                  <span className="text-amber-500"><AnimatedCounter value={lateCount} /></span>
                </h3>
                <p className="text-[9px] text-muted-foreground font-semibold mt-1 uppercase">Present / Absent / Late</p>
              </div>

              {/* 3. Avg Rating */}
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Avg Perf. Score</p>
                <h3 className="text-2xl font-black text-purple-500 mt-2">
                  <AnimatedCounter value={avgPerformance} decimals={1} suffix="/10" />
                </h3>
                <p className="text-[9px] text-muted-foreground font-semibold mt-1 uppercase">Evaluations summary</p>
              </div>

              {/* 4. Plan Days remaining */}
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Plan Days Left</p>
                <h3 className={`text-2xl font-black mt-2 ${daysRemaining <= 7 ? 'text-rose-500 animate-pulse' : 'text-cyan-500'}`}>
                  <AnimatedCounter value={daysRemaining} suffix=" Days" />
                </h3>
                <p className="text-[9px] text-muted-foreground font-semibold mt-1 uppercase truncate">{planName}</p>
              </div>

              {/* 5. Pending dues */}
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden col-span-2 sm:col-span-1 group">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Pending Amount</p>
                <h3 className={`text-2xl font-black mt-2 ${pendingFees > 0 ? 'text-rose-500 animate-pulse' : 'text-primary'}`}>
                  <AnimatedCounter value={pendingFees} prefix="₹" />
                </h3>
                <p className="text-[9px] text-muted-foreground font-semibold mt-1 uppercase truncate">
                  {nextDueDate ? `Due: ${new Date(nextDueDate).toLocaleDateString()}` : 'No dues pending'}
                </p>
              </div>
            </div>

            {/* Split layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column (2/3 width) */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Attendance Mini Calendar View */}
                {perfLoading ? (
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm animate-pulse h-56" />
                ) : (
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-extrabold text-foreground">Attendance History</h3>
                        <p className="text-[10px] text-muted-foreground">Presence tracking logs for class checks</p>
                      </div>
                      <div className="flex gap-4 text-xs font-bold">
                        <div className="text-right">
                          <p className="text-[9px] text-muted-foreground uppercase">Current Streak</p>
                          <p className="text-sm font-black text-orange-500 flex items-center gap-1">
                            <Flame size={12} className="fill-orange-500 text-orange-500" /> {streaks.current} classes
                          </p>
                        </div>
                        <div className="text-right border-l border-border pl-4">
                          <p className="text-[9px] text-muted-foreground uppercase">Longest Streak</p>
                          <p className="text-sm font-black text-yellow-500">{streaks.longest} classes</p>
                        </div>
                      </div>
                    </div>

                    {attendances.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-6 text-center">No attendance logged yet.</p>
                    ) : (
                      <div className="grid grid-cols-7 gap-2">
                        {heatmapData.map((day, idx) => {
                          let bg = 'bg-muted/10 border-border/50';
                          if (day.status === 'PRESENT') bg = 'bg-primary/20 border-primary/30 text-primary';
                          else if (day.status === 'LATE') bg = 'bg-amber-500/20 border-amber-500/30 text-amber-500';
                          else if (day.status === 'ABSENT') bg = 'bg-rose-500/20 border-rose-500/30 text-rose-500';
                          
                          return (
                            <div
                              key={idx}
                              title={`${day.date.toLocaleDateString()}: ${day.status}`}
                              className={`aspect-square border rounded-lg flex items-center justify-center text-[10px] font-black ${bg}`}
                            >
                              {day.dayNum}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Cabinet Badges */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground">Digital Badge Cabinet</h3>
                      <p className="text-[10px] text-muted-foreground">Milestones unlocked by student athlete</p>
                    </div>
                  </div>
                  {achievements.length === 0 ? (
                    <div className="py-6 text-center border border-dashed border-border rounded-xl">
                      <p className="text-xs text-muted-foreground font-semibold">Trophy cabinet is currently empty</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {achievements.map((item, idx) => (
                        <div key={idx} className={`p-3.5 border border-border rounded-xl bg-gradient-to-br ${item.color} flex gap-3 items-center`}>
                          <span className="text-2xl shrink-0">{item.icon}</span>
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-foreground truncate">{item.title}</h5>
                            <p className="text-[9px] text-muted-foreground leading-relaxed mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column (1/3 width) */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* Working Calendar Dashboard Card */}
                {calendarStats && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-5 shadow-lg border border-slate-800 space-y-4 relative overflow-hidden text-left"
                  >
                    <div className="absolute right-[-20px] top-[-20px] opacity-10 text-white pointer-events-none">
                      <Calendar size={120} />
                    </div>

                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Academy Events Calendar</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xl font-black">{calendarStats.todayStatus}</span>
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-slate-800 pt-3 text-xs">
                      {calendarStats.nextHoliday && (
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="font-bold">📅 Upcoming Holiday:</span>
                          <span className="font-black text-white">{calendarStats.nextHoliday.title}</span>
                        </div>
                      )}
                      {calendarStats.nextTournament && (
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="font-bold">🏆 Next Tournament:</span>
                          <span className="font-black text-purple-400 truncate max-w-[120px]">{calendarStats.nextTournament.title}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => navigate('/parent/calendar')}
                      className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Calendar size={13} />
                      Open Academy Calendar
                    </button>
                  </motion.div>
                )}

                {/* Quick actions panel */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3.5">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/40">Quick Operations</h4>
                  <div className="grid grid-cols-1 gap-2 text-xs font-bold">
                    <button
                      onClick={() => setActiveTab('analytics')}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/80 hover:bg-muted text-left transition-colors"
                    >
                      <span className="flex items-center gap-2"><Activity size={14} className="text-primary" /> Attendance logs</span>
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => setActiveTab('analytics')}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/80 hover:bg-muted text-left transition-colors"
                    >
                      <span className="flex items-center gap-2"><Zap size={14} className="text-purple-500" /> Performance drills</span>
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => setActiveTab('finances')}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/80 hover:bg-muted text-left transition-colors"
                    >
                      <span className="flex items-center gap-2"><CreditCard size={14} className="text-blue-500" /> Fees ledger</span>
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => setActiveModal('coach')}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/80 hover:bg-muted text-left transition-colors"
                    >
                      <span className="flex items-center gap-2"><MessageSquare size={14} className="text-orange-500" /> Contact Coach</span>
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => setActiveModal('query')}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/80 hover:bg-muted text-left transition-colors"
                    >
                      <span className="flex items-center gap-2"><HelpCircle size={14} className="text-indigo-500" /> Raise query</span>
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {/* Athlete Details Card */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3.5">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/40">Athlete Details</h4>
                  <div className="space-y-2.5 text-xs font-semibold">
                    <div className="flex justify-between border-b border-border/40 pb-2">
                      <span className="text-muted-foreground">Sport Discipline</span>
                      <span>{currentStudent.sport?.name || 'General Sport'}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/40 pb-2">
                      <span className="text-muted-foreground">Current Batch</span>
                      <span>{currentStudent.batch?.name || 'Assigning Batch'}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/40 pb-2">
                      <span className="text-muted-foreground">Timing / Days</span>
                      <span className="truncate max-w-[120px]">{currentStudent.batch?.timing || 'Mon, Wed, Fri'}</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span className="text-muted-foreground">Class Hours</span>
                      <span>{currentStudent.batch?.start_time ? `${currentStudent.batch.start_time} - ${currentStudent.batch.end_time}` : '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Recent Activities timeline */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/40">Recent Activity Timeline</h4>
                  {activityTimeline.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No recent activities</p>
                  ) : (
                    <div className="space-y-4 text-xs font-semibold">
                      {activityTimeline.map((act, index) => (
                        <div key={index} className="flex gap-3 items-start">
                          <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${act.color}`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                              <span className="font-bold truncate text-foreground">{act.title}</span>
                              <span>{act.date}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{act.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </motion.div>
        )}

        {/* TAB CONTENT: ANALYTICS */}
        {activeTab === 'analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Monthly Attendance */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">Monthly Attendance Trend</h3>
                  <p className="text-[10px] text-muted-foreground">Aggregate percentage history</p>
                </div>
                <div className="h-64 text-xs">
                  {prepareGraphData().length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">No checks recorded</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={heatmapData.slice(-14)} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--theme-border, #e2e8f0)" />
                        <XAxis dataKey="dayNum" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="dayNum" stroke="var(--theme-primary, #10b981)" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Attribute radar chart */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">Skill radar parameter comparison</h3>
                  <p className="text-[10px] text-muted-foreground">Averages mapped across assessment categories</p>
                </div>
                <div className="h-64 flex items-center justify-center text-xs">
                  {radarData.length === 0 ? (
                    <p className="text-muted-foreground">No ratings calculated yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                        <PolarGrid stroke="var(--theme-border, #e2e8f0)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 10]} />
                        <Radar name="Averages" dataKey="Score" stroke="var(--theme-primary, #10b981)" fill="var(--theme-primary, #10b981)" fillOpacity={0.15} />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB CONTENT: FINANCES */}
        {activeTab === 'finances' && (
          <motion.div
            key="finances"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Plan progress ring */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center gap-6">
                <CircularProgressRing percentage={planProgress} size={130} strokeWidth={9} primaryColor="text-blue-500">
                  <span className="text-[10px] text-muted-foreground uppercase font-black">Plan Used</span>
                  <span className="text-2xl font-black text-foreground">{Math.round(planProgress)}%</span>
                </CircularProgressRing>
                
                <div className="space-y-2 text-xs font-semibold text-foreground">
                  <h4 className="text-sm font-black">{planName}</h4>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
                    <div>
                      <span className="text-muted-foreground block text-[9px] uppercase">Start Date</span>
                      <span className="block mt-0.5">{planStart ? new Date(planStart).toLocaleDateString() : '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[9px] uppercase">Expiry Date</span>
                      <span className="block mt-0.5">{planEnd ? new Date(planEnd).toLocaleDateString() : '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment details ledger */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-border/40 pb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Payment History</h4>
                  <button onClick={() => navigate('/parent/fees')} className="text-xs font-black uppercase text-primary hover:underline">Log payment</button>
                </div>

                <div className="space-y-2.5 text-xs font-semibold">
                  {dashboardData?.payments?.slice(0, 3).map((sub, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-muted/30 border border-border/50 rounded-xl">
                      <div className="min-w-0">
                        <p className="font-bold truncate text-foreground">{sub.transaction_number || 'N/A'}</p>
                        <p className="text-[9px] text-muted-foreground font-semibold mt-0.5">{new Date(sub.payment_date || sub.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-3">
                        <span className="font-black text-foreground">₹{parseFloat(sub.amount).toLocaleString('en-IN')}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          sub.status === 'APPROVED' || sub.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                        }`}>{sub.status}</span>
                      </div>
                    </div>
                  ))}
                  {(!dashboardData?.payments || dashboardData.payments.length === 0) && (
                    <p className="text-xs text-muted-foreground text-center py-4">No verified receipts found.</p>
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALS */}
      <AnimatePresence>
        {activeModal === 'coach' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-5 max-w-sm w-full relative shadow-2xl flex flex-col gap-4 text-xs font-semibold text-foreground"
            >
              <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                <XCircle size={18} />
              </button>
              <h3 className="text-sm font-black text-foreground">Coaching Staff Contact Details</h3>
              
              <div className="space-y-3 pt-2 border-t border-border/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-black">
                    CH
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-foreground">{latestAssessment?.coach?.name || 'Academy Coach'}</h4>
                    <p className="text-[9px] text-muted-foreground font-semibold">Certified Sports Instructor</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 text-xs font-semibold text-foreground">
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-primary" />
                    <span>coach.academy@sams.com</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-primary" />
                    <span>+91 98765 43210</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-primary" />
                    <span className="truncate max-w-[200px]">{currentStudent.academy?.name || 'Main Court'}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Raise query modal */}
        {activeModal === 'query' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-5 max-w-sm w-full relative shadow-2xl flex flex-col gap-4 text-xs font-semibold text-foreground"
            >
              <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                <XCircle size={18} />
              </button>
              <h3 className="text-sm font-black text-foreground">Raise Support Query</h3>
              <p className="text-[10px] text-muted-foreground">Send a direct message description to Academy Admin Desk.</p>
              
              {querySuccess ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
                    <CheckCircle2 size={24} />
                  </div>
                  <p className="font-bold text-foreground">Query Submitted Successfully!</p>
                </div>
              ) : (
                <form onSubmit={handleQuerySubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Query Topic</label>
                    <select
                      value={querySubject}
                      onChange={(e) => setQuerySubject(e.target.value)}
                      className="w-full input-field py-2 px-3 text-xs"
                    >
                      <option value="general">General Support</option>
                      <option value="fees">Fees & Payments</option>
                      <option value="coach">Feedback / Remarks</option>
                      <option value="schedule">Batch Scheduling</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Query Description</label>
                    <textarea
                      required
                      rows={3}
                      value={queryText}
                      onChange={(e) => setQueryText(e.target.value)}
                      placeholder="Write message details..."
                      className="w-full input-field py-2 px-3 text-xs resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={querySubmitting}
                    className="w-full btn btn-primary py-2.5 text-xs font-bold shadow-sm"
                  >
                    Submit query
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