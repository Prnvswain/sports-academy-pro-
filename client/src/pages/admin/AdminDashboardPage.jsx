import { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut,
  ShieldAlert,
  DollarSign,
  Wallet,
  Users,
  Clock,
  ArrowUpRight,
  Trophy,
  Activity,
  Award,
  Package,
  Calendar,
  ChevronRight,
  TrendingUp,
  PlusCircle,
  Sparkles,
  RefreshCw,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle,
  FileText,
  Bookmark,
  Plus,
  Sliders,
  ChevronDown,
  LayoutDashboard
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import Loader from '../../components/Loader';
import { adminGet } from '../../api/client';

function formatCurrency(value) {
  const num = parseFloat(value);
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return '₹0.00';
  }
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Color palettes for chart categories
const SPORT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e'];
const GENDER_COLORS = ['#3b82f6', '#ec4899', '#94a3b8'];
const STATUS_COLORS = ['#10b981', '#f43f5e'];
const ATTENDANCE_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

export default function AnalyticsPanel() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [academy, setAcademy] = useState(null);
  const [logoError, setLogoError] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedAcademyName, setImpersonatedAcademyName] = useState('');
  
  // Tab states
  const [activeTab, setActiveTab] = useState('overview');

  // Aggregated data states
  const [rawMetrics, setRawMetrics] = useState({});
  const [students, setStudents] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [batches, setBatches] = useState([]);
  const [sports, setSports] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [inventoryDashboard, setInventoryDashboard] = useState({});
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryAssignments, setInventoryAssignments] = useState([]);
  const [coachLocationLogs, setCoachLocationLogs] = useState([]);
  const [batchSessions, setBatchSessions] = useState([]);

  useEffect(() => {
    const impersonationToken = localStorage.getItem('impersonation_token');
    const academyName = localStorage.getItem('impersonated_academy_name');
    setIsImpersonating(!!impersonationToken);
    setImpersonatedAcademyName(academyName || '');
  }, []);

  const handleExitImpersonation = () => {
    const originalToken = localStorage.getItem('original_super_admin_token');
    localStorage.removeItem('impersonation_token');
    localStorage.removeItem('original_super_admin_token');
    localStorage.removeItem('impersonated_academy_id');
    localStorage.removeItem('impersonated_academy_name');
    
    if (originalToken) {
      localStorage.setItem('super_admin_token', originalToken);
      window.location.href = '/super-admin/dashboard';
    } else {
      window.location.href = '/super-admin/login';
    }
  };

  const safeFetch = async (promise, defaultValue) => {
    try {
      const res = await promise;
      if (res && res.success && res.data !== undefined) {
        return res.data;
      }
      return res ?? defaultValue;
    } catch (e) {
      console.warn('Dashboard background fetch warning:', e);
      return defaultValue;
    }
  };

  const loadAllData = useCallback(async (isSync = false) => {
    if (isSync) setSyncing(true);
    else setLoading(true);
    setError('');

    try {
      const [
        analyticsData,
        studentsData,
        coachesData,
        batchesData,
        sportsData,
        attendanceData,
        assessmentsData,
        invDbData,
        invItemsData,
        invAssignmentsData,
        coachLogsData,
        sessionsData,
        academyRes
      ] = await Promise.all([
        safeFetch(adminGet('/admin/analytics'), {}),
        safeFetch(adminGet('/admin/students'), []),
        safeFetch(adminGet('/admin/coaches'), []),
        safeFetch(adminGet('/admin/batches'), []),
        safeFetch(adminGet('/admin/sports'), []),
        safeFetch(adminGet('/admin/attendance'), []),
        safeFetch(adminGet('/admin/performance/assessments'), {}),
        safeFetch(adminGet('/admin/inventory/dashboard'), {}),
        safeFetch(adminGet('/admin/inventory'), []),
        safeFetch(adminGet('/admin/inventory/assignments'), []),
        safeFetch(adminGet('/admin/gps/coach-location-logs'), []),
        safeFetch(adminGet('/admin/batch-sessions'), []),
        safeFetch(adminGet('/admin/academy'), null)
      ]);

      setRawMetrics(analyticsData);
      setStudents(studentsData);
      setCoaches(coachesData);
      setBatches(batchesData);
      
      // Sport catalog is sometimes nested or simple array
      const parsedSports = sportsData?.data || sportsData?.available_sports || sportsData || [];
      setSports(parsedSports);

      setAttendance(attendanceData);
      
      // Performance assessments nested under data.assessments
      const parsedAssessments = assessmentsData?.assessments || [];
      setAssessments(parsedAssessments);

      setInventoryDashboard(invDbData);
      setInventoryItems(invItemsData);
      setInventoryAssignments(invAssignmentsData);
      setCoachLocationLogs(coachLogsData);
      setBatchSessions(sessionsData);
      
      if (academyRes) {
        setAcademy(academyRes);
        setLogoError(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to sync academy analytics logs.');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Dynamic Client-side Calculations and Memoization
  const computedMetrics = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // --- STUDENT METRICS ---
    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.status === 'ACTIVE' && !s.is_deleted);
    const activeStudentsCount = activeStudents.length;
    const inactiveStudentsCount = totalStudents - activeStudentsCount;

    // Overdue students (Active, pending fee > 0, next_due_date < today)
    let overdueStudentsCount = 0;
    const overdueList = [];
    const dueTodayList = [];
    const dueThisWeekList = [];
    const expiringPlansList = [];

    const weekLimit = new Date();
    weekLimit.setDate(today.getDate() + 7);

    students.forEach(s => {
      if (s.status === 'ACTIVE' && !s.is_deleted) {
        // Compute current balance
        const totalFeeDue = s.enrollments?.reduce((sum, e) => sum + parseFloat(e.final_fee || 0), 0) || 0;
        const totalPaid = s.receipts?.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0) || 0;
        const balance = Math.max(0, totalFeeDue - totalPaid);

        // Find active enrollment next_due_date and plan expiry
        const activeEnrollment = s.enrollments?.find(e => e.is_active);
        if (activeEnrollment) {
          const nextDue = activeEnrollment.next_due_date ? new Date(activeEnrollment.next_due_date) : null;
          const planEnd = activeEnrollment.plan_end_date ? new Date(activeEnrollment.plan_end_date) : null;

          if (balance > 0 && nextDue) {
            const nextDueStr = nextDue.toISOString().split('T')[0];
            if (nextDue < today && nextDueStr !== todayStr) {
              overdueStudentsCount++;
              overdueList.push({ ...s, balance, next_due_date: activeEnrollment.next_due_date });
            } else if (nextDueStr === todayStr) {
              dueTodayList.push({ ...s, balance, next_due_date: activeEnrollment.next_due_date });
            } else if (nextDue <= weekLimit) {
              dueThisWeekList.push({ ...s, balance, next_due_date: activeEnrollment.next_due_date });
            }
          }

          if (planEnd && planEnd >= today && planEnd <= weekLimit) {
            expiringPlansList.push({ ...s, plan_end_date: activeEnrollment.plan_end_date, plan_name: activeEnrollment.duration_plan?.name || 'Standard Plan' });
          }
        }
      }
    });

    // Sports admissions last 30 days
    const past30DaysDate = new Date();
    past30DaysDate.setDate(today.getDate() - 30);
    const newAdmissionsLast30 = students.filter(s => {
      const joinDate = s.joining_date || s.created_at;
      return joinDate && new Date(joinDate) >= past30DaysDate;
    }).length;

    // Student Grouping by Sport
    const sportsGroupingMap = {};
    activeStudents.forEach(s => {
      const sportName = s.sport?.name || 'Other Sport';
      sportsGroupingMap[sportName] = (sportsGroupingMap[sportName] || 0) + 1;
    });
    const studentsBySportData = Object.keys(sportsGroupingMap).map(name => ({
      name,
      value: sportsGroupingMap[name]
    })).sort((a, b) => b.value - a.value);

    // Student Grouping by Batch
    const batchGroupingMap = {};
    activeStudents.forEach(s => {
      const batchName = s.batch?.name || 'No Batch';
      batchGroupingMap[batchName] = (batchGroupingMap[batchName] || 0) + 1;
    });
    const studentsByBatchData = Object.keys(batchGroupingMap).map(name => ({
      name,
      value: batchGroupingMap[name]
    })).sort((a, b) => b.value - a.value);

    // Gender Distribution
    const genderGroupingMap = {};
    activeStudents.forEach(s => {
      const g = s.gender ? s.gender.trim().toUpperCase() : 'NOT SPECIFIED';
      const cleanG = g === 'M' || g === 'MALE' ? 'Male' : (g === 'F' || g === 'FEMALE' ? 'Female' : 'Not Specified');
      genderGroupingMap[cleanG] = (genderGroupingMap[cleanG] || 0) + 1;
    });
    const genderDistributionData = Object.keys(genderGroupingMap).map(name => ({
      name,
      value: genderGroupingMap[name]
    }));

    // --- ATTENDANCE METRICS ---
    // Calculate today's attendance stats
    const todayAttendanceLogs = attendance.filter(a => {
      if (!a.date) return false;
      const logDate = new Date(a.date).toISOString().split('T')[0];
      return logDate === todayStr;
    });
    const todayMarked = todayAttendanceLogs.length;
    const todayPresent = todayAttendanceLogs.filter(a => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'HALF_DAY').length;
    const todayAttendancePercent = todayMarked > 0 ? Math.round((todayPresent / todayMarked) * 100) : 0;

    // Present vs Absent overall (doughnut chart)
    let totalPresentCount = 0;
    let totalAbsentCount = 0;
    attendance.forEach(a => {
      if (a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'HALF_DAY') totalPresentCount++;
      else totalAbsentCount++;
    });

    // Daily Attendance Trend (Last 30 Days)
    const dates30 = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      dates30.push(d.toISOString().split('T')[0]);
    }
    const dailyAttendanceTrend = dates30.map(dateStr => {
      const dayLogs = attendance.filter(a => new Date(a.date).toISOString().split('T')[0] === dateStr);
      const total = dayLogs.length;
      const present = dayLogs.filter(a => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'HALF_DAY').length;
      return {
        date: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
        marked: total
      };
    });

    // Weekly Attendance (group last 30 days into Mon-Sun averages)
    const weekdaySum = Array(7).fill(0);
    const weekdayCount = Array(7).fill(0);
    dailyAttendanceTrend.forEach(d => {
      const parsedDate = new Date(d.date + ', ' + today.getFullYear());
      const dayIndex = parsedDate.getDay(); // 0 is Sunday, 1 is Monday
      // Map to Mon=0, Tue=1, ..., Sun=6
      const mappedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
      if (d.marked > 0) {
        weekdaySum[mappedIndex] += d.percentage;
        weekdayCount[mappedIndex] += 1;
      }
    });
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weeklyAttendanceData = weekdays.map((day, idx) => ({
      day,
      percentage: weekdayCount[idx] > 0 ? Math.round(weekdaySum[idx] / weekdayCount[idx]) : 0
    }));

    // Monthly Attendance (Group all history by month)
    const monthlyAttendanceMap = {};
    attendance.forEach(a => {
      if (!a.date) return;
      const mKey = new Date(a.date).toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!monthlyAttendanceMap[mKey]) monthlyAttendanceMap[mKey] = { present: 0, total: 0 };
      monthlyAttendanceMap[mKey].total += 1;
      if (a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'HALF_DAY') {
        monthlyAttendanceMap[mKey].present += 1;
      }
    });
    const monthlyAttendanceData = Object.keys(monthlyAttendanceMap).map(month => ({
      month,
      percentage: Math.round((monthlyAttendanceMap[month].present / monthlyAttendanceMap[month].total) * 100)
    })).slice(-6);

    // Batch-wise Attendance
    const batchAttMap = {};
    attendance.forEach(a => {
      const bId = a.batch_id;
      const bName = a.batch?.name || `Batch #${bId}`;
      if (!batchAttMap[bName]) batchAttMap[bName] = { present: 0, total: 0 };
      batchAttMap[bName].total += 1;
      if (a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'HALF_DAY') batchAttMap[bName].present += 1;
    });
    const batchWiseAttendance = Object.keys(batchAttMap).map(name => ({
      name,
      percentage: Math.round((batchAttMap[name].present / batchAttMap[name].total) * 100)
    })).sort((a, b) => b.percentage - a.percentage);

    // Coach-wise Attendance
    const coachAttMap = {};
    attendance.forEach(a => {
      const cId = a.marked_by_coach_id || a.coach_id;
      if (!cId) return;
      const cName = a.coach?.name || `Coach #${cId}`;
      if (!coachAttMap[cName]) coachAttMap[cName] = { present: 0, total: 0 };
      coachAttMap[cName].total += 1;
      if (a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'HALF_DAY') coachAttMap[cName].present += 1;
    });
    const coachWiseAttendance = Object.keys(coachAttMap).map(name => ({
      name,
      percentage: Math.round((coachAttMap[name].present / coachAttMap[name].total) * 100)
    })).sort((a, b) => b.percentage - a.percentage);

    // --- FINANCIAL METRICS ---
    const collectionThisMonth = rawMetrics.monthly_collection_chart?.slice(-1)[0]?.amount || 0;
    
    // Sparkline history arrays
    const collectionSparkline = dates30.slice(-7).map(dateStr => {
      // Find payments on this day
      const dayPayments = rawMetrics.recent_payments?.filter(p => new Date(p.payment_date).toISOString().split('T')[0] === dateStr) || [];
      return { value: dayPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0) };
    });
    
    const admissionsSparkline = dates30.slice(-7).map(dateStr => {
      const count = students.filter(s => {
        const j = s.joining_date || s.created_at;
        return j && new Date(j).toISOString().split('T')[0] === dateStr;
      }).length;
      return { value: count };
    });

    const attendanceSparkline = dailyAttendanceTrend.slice(-7).map(d => ({ value: d.percentage }));

    // --- PERFORMANCE METRICS ---
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const performanceAddedThisMonth = assessments.filter(a => a.scored_at && new Date(a.scored_at) >= thisMonthStart).length;

    // Students Missing Performance Records
    const studentsWithPerf = new Set(assessments.map(a => a.student?.student_id));
    const studentsMissingPerformance = activeStudents.filter(s => !studentsWithPerf.has(s.student_id));

    // Sport-wise Performance Entries
    const sportPerfMap = {};
    assessments.forEach(a => {
      // Find student sport
      const stud = students.find(s => s.student_id === a.student?.student_id);
      const sportName = stud?.sport?.name || a.scores?.[0]?.attribute?.sport?.name || 'General';
      sportPerfMap[sportName] = (sportPerfMap[sportName] || 0) + (a.scores?.length || 0);
    });
    const sportWisePerformance = Object.keys(sportPerfMap).map(name => ({
      name,
      entries: sportPerfMap[name]
    }));

    // Top Performing Students (By average overall assessment score)
    const studentPerfScores = {};
    assessments.forEach(a => {
      const sId = a.student?.student_id;
      if (!sId) return;
      const stud = students.find(s => s.student_id === sId);
      if (!stud) return;
      if (!studentPerfScores[sId]) studentPerfScores[sId] = { name: stud.name, scores: [] };
      studentPerfScores[sId].scores.push(a.overall_score || 0);
    });
    const topPerformingStudents = Object.keys(studentPerfScores).map(id => {
      const item = studentPerfScores[id];
      const avg = item.scores.reduce((s, val) => s + val, 0) / item.scores.length;
      return {
        id,
        name: item.name,
        avgScore: parseFloat(avg.toFixed(1)),
        evaluations: item.scores.length
      };
    }).sort((a, b) => b.avgScore - a.avgScore).slice(0, 5);

    // --- COACH METRICS ---
    // Missing Coach Attendance today
    const clockedInCoachesToday = coachLocationLogs.filter(log => {
      if (!log.date) return false;
      const logDate = new Date(log.date).toISOString().split('T')[0];
      return logDate === todayStr;
    });
    const isWeekday = today.getDay() !== 0 && today.getDay() !== 6;
    const coachAttendanceMissing = isWeekday && clockedInCoachesToday.length === 0;

    const checkedInCoachesList = clockedInCoachesToday
      .filter(l => l.is_clocked_in)
      .map(l => l.coach?.name || `Coach #${l.coach_id}`);

    // Coach Student Counts
    const coachStudentCountMap = {};
    coaches.forEach(c => {
      // Find batches this coach is assigned to
      const assignedBatchIds = c.batch_assignments?.map(ba => ba.batch_id) || [];
      // Count active students in those batches
      const sCount = activeStudents.filter(s => assignedBatchIds.includes(s.batch_id)).length;
      coachStudentCountMap[c.name] = sCount;
    });
    const coachStudentCountData = Object.keys(coachStudentCountMap).map(name => ({
      name,
      students: coachStudentCountMap[name]
    })).sort((a, b) => b.students - a.students);

    // Active Sessions Today
    const activeSessionsToday = batchSessions.filter(s => {
      if (!s.session_date) return false;
      return new Date(s.session_date).toISOString().split('T')[0] === todayStr;
    });

    // --- INVENTORY METRICS ---
    const inventoryTotalItems = inventoryDashboard.totalItems || inventoryItems.length;
    const lowStockAlerts = inventoryDashboard.lowStockAlerts || inventoryItems.filter(i => i.available_qty <= i.min_stock_alert && i.available_qty > 0).length;
    const outOfStockCount = inventoryItems.filter(i => i.available_qty === 0).length;

    return {
      totalStudents,
      activeStudentsCount,
      inactiveStudentsCount,
      newAdmissionsLast30,
      overdueStudentsCount,
      overdueList,
      dueTodayList,
      dueThisWeekList,
      expiringPlansList,
      studentsBySportData,
      studentsByBatchData,
      genderDistributionData,
      
      todayAttendancePercent,
      todayMarked,
      totalPresentCount,
      totalAbsentCount,
      dailyAttendanceTrend,
      weeklyAttendanceData,
      monthlyAttendanceData,
      batchWiseAttendance,
      coachWiseAttendance,
      
      collectionThisMonth,
      collectionSparkline,
      admissionsSparkline,
      attendanceSparkline,

      performanceAddedThisMonth,
      studentsMissingPerformance,
      sportWisePerformance,
      topPerformingStudents,

      coachAttendanceMissing,
      checkedInCoachesCount: clockedInCoachesToday.length,
      checkedInCoachesList,
      coachStudentCountData,
      activeSessionsTodayCount: activeSessionsToday.length,
      activeSessionsToday,

      inventoryTotalItems,
      lowStockAlerts,
      outOfStockCount,
    };
  }, [students, coaches, batches, sports, attendance, assessments, inventoryDashboard, inventoryItems, coachLocationLogs, batchSessions, rawMetrics]);

  // Unified Chronological Activity Timeline
  const timelineEvents = useMemo(() => {
    const events = [];

    // 1. New Student Registrations
    students.forEach(s => {
      const ts = s.created_at || s.joining_date;
      if (ts) {
        events.push({
          id: `student-add-${s.student_id}`,
          type: 'student_add',
          title: 'New Student Admitted',
          description: `${s.name} joined the academy under ${s.sport?.name || 'sport'}.`,
          timestamp: new Date(ts),
          color: 'bg-blue-500/10 text-blue-505 dark:bg-blue-500/20 dark:text-blue-400',
          icon: UserCheck
        });
      }
      if (s.status === 'INACTIVE' && s.updated_at) {
        events.push({
          id: `student-deact-${s.student_id}`,
          type: 'deactivate',
          title: 'Student Plan Deactivated',
          description: `${s.name} was deactivated or paused.`,
          timestamp: new Date(s.updated_at),
          color: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-450',
          icon: UserX
        });
      }
    });

    // 2. Fee Collections
    const paymentsList = rawMetrics.recent_payments || [];
    paymentsList.forEach(p => {
      if (p.payment_date) {
        events.push({
          id: `fee-collect-${p.payment_id}`,
          type: 'fee_collect',
          title: 'Fee Receipt Settled',
          description: `${formatCurrency(p.amount)} received from ${p.student?.name || 'Student'} via ${p.method || 'cash'}.`,
          timestamp: new Date(p.payment_date),
          color: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
          icon: DollarSign
        });
      }
    });

    // 3. Attendance Completed
    batchSessions.forEach(bs => {
      if (bs.session_date) {
        events.push({
          id: `attendance-complete-${bs.session_id}`,
          type: 'attendance',
          title: 'Attendance Sheet Completed',
          description: `Attendance finalized for batch ${bs.batch?.name || ''} by ${bs.coach?.name || 'Coach'}.`,
          timestamp: new Date(bs.session_date),
          color: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
          icon: Activity
        });
      }
    });

    // 4. Performance Updated
    assessments.forEach(a => {
      if (a.scored_at) {
        events.push({
          id: `performance-update-${a.assessment_id}`,
          type: 'performance',
          title: 'Performance Sheet Logged',
          description: `Performance score ${a.overall_score}/5 recorded for ${a.student?.name || 'Student'}.`,
          timestamp: new Date(a.scored_at),
          color: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
          icon: Award
        });
      }
    });

    // 5. Inventory Issued
    inventoryAssignments.forEach(ia => {
      if (ia.assigned_date) {
        events.push({
          id: `inventory-issue-${ia.assignment_id}`,
          type: 'inventory',
          title: 'Equipment Issued',
          description: `Issued ${ia.assigned_qty} ${ia.item?.name || 'items'} to coach ${ia.coach?.name || 'Coach'}.`,
          timestamp: new Date(ia.assigned_date),
          color: 'bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400',
          icon: Package
        });
      }
    });

    // Sort by newest first
    return events.sort((a, b) => b.timestamp - a.timestamp).slice(0, 15);
  }, [students, rawMetrics.recent_payments, batchSessions, assessments, inventoryAssignments]);

  if (loading) {
    return (
      <div className="w-full bg-transparent font-sans p-2 space-y-6">
        {/* Loading Header */}
        <div className="bg-card border border-border rounded-2xl p-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-40 bg-muted rounded animate-pulse" />
              <div className="h-3 w-28 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="h-9 w-28 bg-muted rounded-xl animate-pulse" />
        </div>

        {/* Loading KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array(10).fill(0).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-4 space-y-3 shadow-sm">
              <div className="flex justify-between">
                <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                <div className="h-6 w-6 bg-muted rounded-lg animate-pulse" />
              </div>
              <div className="h-7 w-20 bg-muted rounded animate-pulse" />
              <div className="h-2 w-full bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Loading Tabs Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 h-[400px] animate-pulse" />
          <div className="bg-card border border-border rounded-2xl p-6 h-[400px] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-transparent font-sans p-2 space-y-6">
      
      {/* Impersonation Banner */}
      {isImpersonating && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
            <div>
              <p className="text-amber-400 font-bold text-sm">Viewing Academy as Super Admin</p>
              <p className="text-amber-400/70 text-xs">Academy: {impersonatedAcademyName}</p>
            </div>
          </div>
          <button
            onClick={handleExitImpersonation}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Exit Academy
          </button>
        </motion.div>
      )}
      
      {/* Top Bar Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm"
      >
        <div className="flex items-center gap-3">
          {academy?.logo_url && !logoError ? (
            <img 
              key={academy.logo_url} 
              src={`${academy.logo_url}?t=${Date.now()}`} 
              alt="Logo" 
              className="h-11 w-11 rounded-xl border border-border object-cover" 
              onError={() => setLogoError(true)} 
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
              <Trophy className="h-5 w-5" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-black text-foreground tracking-tight">{academy?.name || 'Academy'} Analytics</h2>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Comprehensive Academy Operations Panel</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <motion.button 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }} 
            type="button" 
            onClick={() => loadAllData(true)} 
            disabled={syncing}
            className="bg-surface border border-border text-foreground hover:bg-surface-secondary px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Data'}
          </motion.button>
        </div>
      </motion.div>

      {/* KPI Cards: Responsive Grid */}
      <motion.div 
        initial="hidden" 
        animate="show" 
        variants={{ show: { transition: { staggerChildren: 0.03 } } }}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
      >
        {/* Total Students */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
          whileHover={{ y: -3, scale: 1.01 }}
          onClick={() => navigate('/admin/students')}
          className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden transition-all shadow-sm cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Total Students</span>
            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-505 dark:text-blue-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black tracking-tight text-foreground">{computedMetrics.totalStudents}</h3>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground font-bold">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-500">+{computedMetrics.newAdmissionsLast30}</span> last 30 days
            </div>
          </div>
          {/* Sparkline */}
          <div className="h-6 w-full mt-2 -mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={computedMetrics.admissionsSparkline}>
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Active Students */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
          whileHover={{ y: -3, scale: 1.01 }}
          onClick={() => navigate('/admin/students')}
          className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden transition-all shadow-sm cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Active Students</span>
            <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black tracking-tight text-foreground">{computedMetrics.activeStudentsCount}</h3>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground font-bold">
              <span>Ratio: </span>
              <span className="text-emerald-500">{computedMetrics.totalStudents > 0 ? Math.round((computedMetrics.activeStudentsCount / computedMetrics.totalStudents) * 100) : 0}% active</span>
            </div>
          </div>
        </motion.div>

        {/* Inactive Students */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
          whileHover={{ y: -3, scale: 1.01 }}
          onClick={() => navigate('/admin/students')}
          className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden transition-all shadow-sm cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Inactive Students</span>
            <div className="p-1.5 bg-rose-500/10 rounded-lg text-rose-600 dark:text-rose-400">
              <UserX className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black tracking-tight text-foreground">{computedMetrics.inactiveStudentsCount}</h3>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground font-bold">
              <span>Ratio: </span>
              <span className="text-rose-500">{computedMetrics.totalStudents > 0 ? Math.round((computedMetrics.inactiveStudentsCount / computedMetrics.totalStudents) * 100) : 0}% inactive</span>
            </div>
          </div>
        </motion.div>

        {/* Coaches */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
          whileHover={{ y: -3, scale: 1.01 }}
          onClick={() => navigate('/admin/coaches')}
          className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden transition-all shadow-sm cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Coaches</span>
            <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-600 dark:text-purple-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black tracking-tight text-foreground">{coaches.length}</h3>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground font-bold">
              <span className="text-purple-500">{computedMetrics.checkedInCoachesCount} checked in today</span>
            </div>
          </div>
        </motion.div>

        {/* Active Batches */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
          whileHover={{ y: -3, scale: 1.01 }}
          onClick={() => navigate('/admin/batches')}
          className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden transition-all shadow-sm cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Active Batches</span>
            <div className="p-1.5 bg-cyan-500/10 rounded-lg text-cyan-600 dark:text-cyan-400">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black tracking-tight text-foreground">{computedMetrics.activeSessionsTodayCount} / {batches.length}</h3>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground font-bold">
              <span className="text-cyan-500">{computedMetrics.activeSessionsTodayCount} sessions scheduled today</span>
            </div>
          </div>
        </motion.div>

        {/* Sports */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
          whileHover={{ y: -3, scale: 1.01 }}
          onClick={() => navigate('/admin/sports')}
          className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden transition-all shadow-sm cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Sports Catalog</span>
            <div className="p-1.5 bg-yellow-500/10 rounded-lg text-yellow-600 dark:text-yellow-400">
              <Trophy className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black tracking-tight text-foreground">{sports.length}</h3>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground font-bold">
              <span>Managed Programs</span>
            </div>
          </div>
        </motion.div>

        {/* Today's Attendance % */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
          whileHover={{ y: -3, scale: 1.01 }}
          onClick={() => navigate('/admin/reports')}
          className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden transition-all shadow-sm cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Today's Attendance</span>
            <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black tracking-tight text-foreground">{computedMetrics.todayAttendancePercent}%</h3>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground font-bold">
              <span>{computedMetrics.todayMarked} marked today</span>
            </div>
          </div>
          {/* Sparkline */}
          <div className="h-6 w-full mt-2 -mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={computedMetrics.attendanceSparkline}>
                <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Today's Collection */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
          whileHover={{ y: -3, scale: 1.01 }}
          onClick={() => navigate('/admin/accounts')}
          className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden transition-all shadow-sm cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Today's Collection</span>
            <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 truncate">
              {formatCurrency(rawMetrics.todays_collection ?? 0)}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground font-bold">
              <span>Month sum: {formatCurrency(computedMetrics.collectionThisMonth)}</span>
            </div>
          </div>
          {/* Sparkline */}
          <div className="h-6 w-full mt-2 -mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={computedMetrics.collectionSparkline}>
                <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Pending Fees */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
          whileHover={{ y: -3, scale: 1.01 }}
          onClick={() => navigate('/admin/accounts')}
          className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden transition-all shadow-sm cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Pending Fees</span>
            <div className="p-1.5 bg-rose-500/10 rounded-lg text-rose-600 dark:text-rose-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-black tracking-tight text-rose-600 dark:text-rose-455 truncate">
              {formatCurrency(rawMetrics.pending_fees ?? 0)}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground font-bold">
              <span className="text-rose-500">{rawMetrics.students_with_pending_fees} students have dues</span>
            </div>
          </div>
        </motion.div>

        {/* Overdue Students */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
          whileHover={{ y: -3, scale: 1.01 }}
          onClick={() => navigate('/admin/students')}
          className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden transition-all shadow-sm cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Overdue Students</span>
            <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-455">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">
              {computedMetrics.overdueStudentsCount}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground font-bold">
              <span className="text-amber-600 dark:text-amber-400">Past renewal deadline</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Main Panel Content & Sidebar Section */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Left Side: Charts and Layout Tabs */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* Alerts Panel (Conditionally Shown) */}
          {(computedMetrics.overdueStudentsCount > 0 || 
            computedMetrics.expiringPlansList.length > 0 || 
            computedMetrics.lowStockAlerts > 0 || 
            computedMetrics.coachAttendanceMissing) && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border rounded-2xl p-4 space-y-3 shadow-sm"
            >
              <h3 className="text-xs font-black uppercase tracking-wider text-rose-500 flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4" /> Urgent Notifications
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {computedMetrics.overdueStudentsCount > 0 && (
                  <div 
                    onClick={() => navigate('/admin/accounts')}
                    className="flex items-center gap-3 p-3 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 rounded-xl cursor-pointer transition-all"
                  >
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                    <div>
                      <p className="text-xs font-black text-foreground">{computedMetrics.overdueStudentsCount} Students Overdue</p>
                      <p className="text-[10px] text-muted-foreground font-bold">Fee plans expired and unpaid. Send reminders.</p>
                    </div>
                  </div>
                )}
                
                {computedMetrics.expiringPlansList.length > 0 && (
                  <div 
                    onClick={() => navigate('/admin/students')}
                    className="flex items-center gap-3 p-3 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 rounded-xl cursor-pointer transition-all"
                  >
                    <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-xs font-black text-foreground">{computedMetrics.expiringPlansList.length} Plans Expiring Soon</p>
                      <p className="text-[10px] text-muted-foreground font-bold">Renewal deadline within next 7 days.</p>
                    </div>
                  </div>
                )}

                {computedMetrics.lowStockAlerts > 0 && (
                  <div 
                    onClick={() => navigate('/admin/inventory')}
                    className="flex items-center gap-3 p-3 bg-yellow-500/5 hover:bg-yellow-500/10 border border-yellow-500/10 rounded-xl cursor-pointer transition-all"
                  >
                    <Package className="w-5 h-5 text-yellow-500 shrink-0" />
                    <div>
                      <p className="text-xs font-black text-foreground">{computedMetrics.lowStockAlerts} Low Stock Items</p>
                      <p className="text-[10px] text-muted-foreground font-bold">Some items are below alert thresholds.</p>
                    </div>
                  </div>
                )}

                {computedMetrics.coachAttendanceMissing && (
                  <div 
                    onClick={() => navigate('/admin/coaches')}
                    className="flex items-center gap-3 p-3 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 rounded-xl cursor-pointer transition-all"
                  >
                    <ShieldAlert className="w-5 h-5 text-indigo-500 shrink-0" />
                    <div>
                      <p className="text-xs font-black text-foreground">Coach Attendance Missing</p>
                      <p className="text-[10px] text-muted-foreground font-bold">No coaches checked in today. Confirm status.</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Sub-Layout Tabs Control */}
          <div className="bg-card border border-border rounded-2xl p-1.5 flex gap-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'attendance', label: 'Attendance', icon: Activity },
              { id: 'students', label: 'Students', icon: Users },
              { id: 'fees', label: 'Fees & Accounts', icon: Wallet },
              { id: 'performance', label: 'Performance', icon: Award },
              { id: 'coaches', label: 'Coaches & Inventory', icon: Package }
            ].map(tab => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Dynamic Tab Panels */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Daily Attendance Trend */}
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4">Daily Attendance Trend (30 Days)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={computedMetrics.dailyAttendanceTrend}>
                          <defs>
                            <linearGradient id="attendanceGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} domain={[0, 100]} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                            labelStyle={{ fontWeight: 'bold' }}
                          />
                          <Area type="monotone" dataKey="percentage" stroke="#3b82f6" fillOpacity={1} fill="url(#attendanceGrad)" strokeWidth={2} name="Present %" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Monthly Collection Trend */}
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4 font-black">Monthly Collection Trend</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={rawMetrics.monthly_collection_chart || []}>
                          <defs>
                            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                            labelStyle={{ fontWeight: 'bold' }}
                          />
                          <Area type="monotone" dataKey="amount" stroke="#10b981" fillOpacity={1} fill="url(#revenueGrad)" strokeWidth={2} name="Collections" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Students by Sport */}
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4">Students by Sport</h3>
                    <div className="h-64 flex items-center justify-center">
                      {computedMetrics.studentsBySportData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={computedMetrics.studentsBySportData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {computedMetrics.studentsBySportData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={SPORT_COLORS[index % SPORT_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-xs font-bold text-muted-foreground">No active registrations mapped yet</p>
                      )}
                    </div>
                  </div>

                  {/* Quick summary stats */}
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4">Admissions Overview</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-border">
                          <span className="text-xs font-bold text-muted-foreground">Active Roster</span>
                          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{computedMetrics.activeStudentsCount} / {computedMetrics.totalStudents}</span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-border">
                          <span className="text-xs font-bold text-muted-foreground">Admissions (Last 30 Days)</span>
                          <span className="text-sm font-black text-blue-500">{computedMetrics.newAdmissionsLast30}</span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-border">
                          <span className="text-xs font-bold text-muted-foreground">Checked-in Coaches</span>
                          <span className="text-sm font-black text-purple-500">{computedMetrics.checkedInCoachesCount} / {coaches.length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-muted-foreground">Pending Fees Volume</span>
                          <span className="text-sm font-black text-rose-500">{formatCurrency(rawMetrics.pending_fees ?? 0)}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate('/admin/reports')}
                      className="mt-6 w-full text-center text-xs font-black bg-muted text-foreground py-2.5 rounded-xl hover:bg-muted-secondary transition-colors"
                    >
                      Export Full Performance Report
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: ATTENDANCE */}
              {activeTab === 'attendance' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Weekly Attendance */}
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                      <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4 font-black">Weekly Attendance (Average)</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={computedMetrics.weeklyAttendanceData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} domain={[0, 100]} />
                            <Tooltip />
                            <Bar dataKey="percentage" fill="#6366f1" radius={[4, 4, 0, 0]} name="Present %" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Monthly Attendance */}
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                      <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4">Monthly Attendance Trend</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={computedMetrics.monthlyAttendanceData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} domain={[0, 100]} />
                            <Tooltip />
                            <Bar dataKey="percentage" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Present %" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Present vs Absent overall */}
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4">Overall Attendance Status</h3>
                      <div className="h-44 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Present/LATE', value: computedMetrics.totalPresentCount },
                                { name: 'Absent/Leave', value: computedMetrics.totalAbsentCount }
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={65}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              <Cell fill="#10b981" />
                              <Cell fill="#ef4444" />
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-around text-center text-xs">
                        <div>
                          <p className="font-black text-emerald-600 dark:text-emerald-400">{computedMetrics.totalPresentCount}</p>
                          <p className="text-[10px] text-muted-foreground font-bold">Present / Late</p>
                        </div>
                        <div>
                          <p className="font-black text-rose-500">{computedMetrics.totalAbsentCount}</p>
                          <p className="text-[10px] text-muted-foreground font-bold">Absent / Leave</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Batch-wise Attendance */}
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                      <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4">Batch-wise Average Attendance</h3>
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {computedMetrics.batchWiseAttendance.map((batch, index) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-muted/30 border border-border rounded-xl">
                            <span className="text-xs font-bold text-foreground">{batch.name}</span>
                            <div className="flex items-center gap-3">
                              <div className="w-24 bg-muted rounded-full h-1.5">
                                <div style={{ width: `${batch.percentage}%` }} className="bg-indigo-500 h-1.5 rounded-full" />
                              </div>
                              <span className="text-xs font-black text-foreground">{batch.percentage}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Coach-wise Attendance */}
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                      <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4">Coach-wise Attendance Finalization</h3>
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {computedMetrics.coachWiseAttendance.map((coach, index) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-muted/30 border border-border rounded-xl">
                            <span className="text-xs font-bold text-foreground">{coach.name}</span>
                            <div className="flex items-center gap-3">
                              <div className="w-24 bg-muted rounded-full h-1.5">
                                <div style={{ width: `${coach.percentage}%` }} className="bg-purple-500 h-1.5 rounded-full" />
                              </div>
                              <span className="text-xs font-black text-foreground">{coach.percentage}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: STUDENTS */}
              {activeTab === 'students' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Gender Distribution */}
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                      <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4">Gender Distribution</h3>
                      <div className="h-64 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={computedMetrics.genderDistributionData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={75}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {computedMetrics.genderDistributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Active vs Deactivated */}
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                      <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4">Status Distribution</h3>
                      <div className="h-64 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Active', value: computedMetrics.activeStudentsCount },
                                { name: 'Deactivated', value: computedMetrics.inactiveStudentsCount }
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={75}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              <Cell fill="#10b981" />
                              <Cell fill="#ef4444" />
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Plan Expiring Soon (7 Days) */}
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 font-black">Plans Expiring (7 Days)</h3>
                      <div className="space-y-3 overflow-y-auto max-h-60 pr-1 flex-1">
                        {computedMetrics.expiringPlansList.map((student, index) => (
                          <div key={index} className="flex justify-between items-center p-2.5 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
                            <div>
                              <p className="text-xs font-black text-foreground">{student.name}</p>
                              <p className="text-[9px] font-bold text-muted-foreground uppercase">{student.plan_name}</p>
                            </div>
                            <span className="text-[10px] font-black bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 py-1 px-2 rounded-lg shrink-0">
                              {new Date(student.plan_end_date).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                        {computedMetrics.expiringPlansList.length === 0 && (
                          <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-bold">
                            No expiring plans detected
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => navigate('/admin/students')}
                        className="mt-4 w-full text-center text-[10px] font-black uppercase bg-muted py-2 rounded-lg hover:bg-muted-secondary transition-colors"
                      >
                        Manage Students Plan Renewal
                      </button>
                    </div>
                  </div>

                  {/* Students by Batch */}
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4 font-black">Students by Batch Enrollment</h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={computedMetrics.studentsByBatchData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Students" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: FEES */}
              {activeTab === 'fees' && (
                <div className="space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Collection Dues Lists */}
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 font-black">Dues Today</h3>
                      <div className="space-y-3 overflow-y-auto max-h-60 pr-1 flex-1 font-sans">
                        {computedMetrics.dueTodayList.map((student, index) => (
                          <div key={index} className="flex justify-between items-center p-2.5 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                            <div>
                              <p className="text-xs font-black text-foreground">{student.name}</p>
                              <p className="text-[9px] font-bold text-muted-foreground uppercase">Due: {new Date(student.next_due_date).toLocaleDateString()}</p>
                            </div>
                            <span className="text-xs font-black text-rose-500">{formatCurrency(student.balance)}</span>
                          </div>
                        ))}
                        {computedMetrics.dueTodayList.length === 0 && (
                          <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-bold py-12">
                            No student payments due today
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 font-black font-black">Due This Week</h3>
                      <div className="space-y-3 overflow-y-auto max-h-60 pr-1 flex-1">
                        {computedMetrics.dueThisWeekList.map((student, index) => (
                          <div key={index} className="flex justify-between items-center p-2.5 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
                            <div>
                              <p className="text-xs font-black text-foreground">{student.name}</p>
                              <p className="text-[9px] font-bold text-muted-foreground uppercase">Due: {new Date(student.next_due_date).toLocaleDateString()}</p>
                            </div>
                            <span className="text-xs font-black text-yellow-600 dark:text-yellow-400">{formatCurrency(student.balance)}</span>
                          </div>
                        ))}
                        {computedMetrics.dueThisWeekList.length === 0 && (
                          <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-bold py-12">
                            No payments due this week
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 font-black">Overdue Students List</h3>
                      <div className="space-y-3 overflow-y-auto max-h-60 pr-1 flex-1">
                        {computedMetrics.overdueList.map((student, index) => (
                          <div key={index} className="flex justify-between items-center p-2.5 bg-red-500/5 border border-red-500/10 rounded-xl">
                            <div>
                              <p className="text-xs font-black text-foreground">{student.name}</p>
                              <p className="text-[9px] font-bold text-rose-500 uppercase">Expired: {new Date(student.next_due_date).toLocaleDateString()}</p>
                            </div>
                            <span className="text-xs font-black text-rose-500">{formatCurrency(student.balance)}</span>
                          </div>
                        ))}
                        {computedMetrics.overdueList.length === 0 && (
                          <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-bold py-12">
                            No overdue student collections
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recent Payments Detailed Feed */}
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4">Receipt Settlement History</h3>
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {rawMetrics.recent_payments?.map((payment, index) => (
                        <div 
                          key={index} 
                          onClick={() => navigate('/admin/accounts')}
                          className="flex items-center justify-between p-3 bg-muted/20 border border-border rounded-xl hover:bg-muted/40 transition-colors cursor-pointer"
                        >
                          <div>
                            <span className="text-xs font-black text-foreground block">{payment.student?.name || 'Student'}</span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              Method: {payment.method} • Date: {new Date(payment.payment_date).toLocaleDateString()}
                            </span>
                          </div>
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            + {formatCurrency(payment.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 5: PERFORMANCE */}
              {activeTab === 'performance' && (
                <div className="space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Overall performance counts */}
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-center text-center">
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Evaluations Added This Month</span>
                      <h3 className="text-4xl font-black text-primary mt-2">{computedMetrics.performanceAddedThisMonth}</h3>
                      <p className="text-[10px] text-muted-foreground mt-1 font-bold">New ratings logged in this billing cycle</p>
                    </div>

                    {/* Students missing evaluations */}
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 font-black">Missing Evaluations ({computedMetrics.studentsMissingPerformance.length})</h3>
                      <div className="space-y-2 overflow-y-auto max-h-48 pr-1 flex-1">
                        {computedMetrics.studentsMissingPerformance.map((student, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-muted/40 rounded-lg">
                            <span className="text-xs font-bold text-foreground">{student.name}</span>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">{student.sport?.name || 'sport'}</span>
                          </div>
                        ))}
                        {computedMetrics.studentsMissingPerformance.length === 0 && (
                          <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-bold">
                            All active students are evaluated
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Top Performing Students */}
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 font-black">Top Evaluated Students</h3>
                      <div className="space-y-2 overflow-y-auto max-h-48 pr-1 flex-1">
                        {computedMetrics.topPerformingStudents.map((student, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                            <span className="text-xs font-bold text-foreground">{student.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold text-muted-foreground">{student.evaluations} evaluations</span>
                              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{student.avgScore} / 5</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Sport-wise Entries */}
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                      <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4">Sport-wise Evaluation Entries</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={computedMetrics.sportWisePerformance}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
                            <Tooltip />
                            <Bar dataKey="entries" fill="#eab308" radius={[4, 4, 0, 0]} name="Evaluated Parameters" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Recent Performance Timeline */}
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4 font-black">Recent Performance Logs</h3>
                      <div className="space-y-3 overflow-y-auto max-h-60 pr-1 flex-1">
                        {assessments.slice(0, 5).map((item, index) => (
                          <div key={index} className="p-3 bg-muted/30 border border-border rounded-xl">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-xs font-black text-foreground">{item.student?.name}</h4>
                                <p className="text-[9px] text-muted-foreground font-bold">Evaluated by: {item.coach?.name || 'Coach'}</p>
                              </div>
                              <span className="text-xs font-black text-amber-500">{item.overall_score} / 5</span>
                            </div>
                            {item.notes && <p className="text-[10px] text-muted-foreground font-bold mt-1 max-w-md italic">"{item.notes}"</p>}
                          </div>
                        ))}
                        {assessments.length === 0 && (
                          <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-bold">
                            No evaluations logged recently
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 6: COACHES & INVENTORY */}
              {activeTab === 'coaches' && (
                <div className="space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Coach Student Counts */}
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                      <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4">Coach Assigned Student Count</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={computedMetrics.coachStudentCountData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
                            <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} width={80} />
                            <Tooltip />
                            <Bar dataKey="students" fill="#ec4899" radius={[0, 4, 4, 0]} name="Assigned Students" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Active Sessions Feed */}
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                      <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4">Active Sessions Today</h3>
                      <div className="space-y-3 overflow-y-auto max-h-60 pr-1">
                        {computedMetrics.activeSessionsToday.map((session, index) => (
                          <div key={index} className="p-3 bg-muted/40 rounded-xl border border-border">
                            <div className="flex justify-between">
                              <span className="text-xs font-black text-foreground">{session.batch?.name}</span>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase">{session.status}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-1 font-bold">
                              <span>Coach: {session.coach?.name || 'Unassigned'}</span>
                              <span>{session.start_time ? new Date(session.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                            </div>
                          </div>
                        ))}
                        {computedMetrics.activeSessionsToday.length === 0 && (
                          <div className="h-44 flex items-center justify-center text-xs text-muted-foreground font-bold">
                            No batch sessions scheduled for today
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Inventory Section */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Inventory Summaries */}
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4 font-black">Inventory Stock Summaries</h3>
                        <div className="space-y-4 font-sans">
                          <div className="flex justify-between items-center pb-2 border-b border-border">
                            <span className="text-xs font-bold text-muted-foreground">Total Unique Items</span>
                            <span className="text-sm font-black text-foreground">{computedMetrics.inventoryTotalItems}</span>
                          </div>
                          <div className="flex justify-between items-center pb-2 border-b border-border">
                            <span className="text-xs font-bold text-muted-foreground">Low Stock Alerts</span>
                            <span className="text-sm font-black text-yellow-600 dark:text-yellow-400">{computedMetrics.lowStockAlerts}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-muted-foreground">Out of Stock Items</span>
                            <span className="text-sm font-black text-rose-500">{computedMetrics.outOfStockCount}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => navigate('/admin/inventory')}
                        className="mt-6 w-full text-center text-xs font-black bg-muted py-2.5 rounded-xl hover:bg-muted-secondary transition-colors"
                      >
                        Manage Store Inventory
                      </button>
                    </div>

                    {/* Low stock list */}
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                      <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 font-black font-black">Low/Out of Stock Alert</h3>
                      <div className="space-y-2.5 overflow-y-auto max-h-48 pr-1 font-sans">
                        {inventoryItems.filter(i => i.available_qty <= i.min_stock_alert).map((item, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-muted/40 rounded-lg">
                            <div>
                              <p className="text-xs font-bold text-foreground">{item.name}</p>
                              <p className="text-[8px] font-bold text-muted-foreground uppercase">Min Alert: {item.min_stock_alert}</p>
                            </div>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${item.available_qty === 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'}`}>
                              Stock: {item.available_qty}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recently Issued Timeline */}
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 font-black">Recently Issued Equipments</h3>
                      <div className="space-y-2.5 overflow-y-auto max-h-48 pr-1 flex-1 font-sans">
                        {inventoryAssignments.slice(0, 5).map((assignment, index) => (
                          <div key={index} className="p-2 bg-cyan-500/5 border border-cyan-500/10 rounded-lg text-xs">
                            <div className="flex justify-between">
                              <span className="font-bold text-foreground">{assignment.item?.name}</span>
                              <span className="text-muted-foreground font-bold">Qty: {assignment.assigned_qty}</span>
                            </div>
                            <div className="flex justify-between text-[9px] text-muted-foreground font-bold mt-0.5">
                              <span>To: {assignment.coach?.name}</span>
                              <span>{assignment.assigned_date ? new Date(assignment.assigned_date).toLocaleDateString() : ''}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </motion.div>
          </AnimatePresence>

        </div>

        {/* Right Side: Quick Action and Recent Timeline */}
        <div className="space-y-6">
          
          {/* Quick Action Panel */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.05 }}
            className="bg-card border border-border rounded-2xl p-5 shadow-sm"
          >
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4">Quick Actions Desk</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Add Student', icon: PlusCircle, path: '/admin/students', color: 'text-blue-500 bg-blue-500/10' },
                { label: 'Collect Fee', icon: DollarSign, path: '/admin/accounts', color: 'text-emerald-500 bg-emerald-500/10' },
                { label: 'Mark Attendance', icon: Activity, path: '/admin/batches', color: 'text-purple-500 bg-purple-500/10' },
                { label: 'Create Batch', icon: Plus, path: '/admin/batches', color: 'text-cyan-500 bg-cyan-500/10' },
                { label: 'Add Coach', icon: Sliders, path: '/admin/coaches', color: 'text-yellow-650 bg-yellow-500/10' },
                { label: 'View Reports', icon: FileText, path: '/admin/reports', color: 'text-indigo-500 bg-indigo-500/10' }
              ].map((btn, idx) => {
                const BtnIcon = btn.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => navigate(btn.path)}
                    className="flex flex-col items-center justify-center p-3 bg-muted/30 border border-border hover:border-primary/30 hover:bg-muted/50 rounded-2xl gap-2 transition-all group"
                  >
                    <div className={`p-2 rounded-xl transition-transform group-hover:scale-110 ${btn.color}`}>
                      <BtnIcon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black text-center text-foreground">{btn.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Unified Activity Feed Timeline */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col h-[520px]"
          >
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4">Recent Academy Activity</h3>
            <div className="space-y-4 overflow-y-auto pr-1 flex-1 font-sans">
              {timelineEvents.map((event, index) => {
                const EventIcon = event.icon;
                return (
                  <div key={event.id || index} className="flex gap-3 items-start relative group">
                    {/* Line connector */}
                    {index < timelineEvents.length - 1 && (
                      <div className="absolute left-[15px] top-6 bottom-[-20px] w-0.5 bg-border group-hover:bg-muted-foreground/30 transition-colors" />
                    )}
                    
                    <div className={`p-1.5 rounded-xl shrink-0 ${event.color}`}>
                      <EventIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-1">
                        <h4 className="text-xs font-black text-foreground truncate">{event.title}</h4>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase shrink-0">
                          {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-semibold leading-relaxed">
                        {event.description}
                      </p>
                      <p className="text-[8px] font-bold text-muted-foreground/50 uppercase tracking-wider">
                        {new Date(event.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              {timelineEvents.length === 0 && (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-bold py-24">
                  No registered activities recorded
                </div>
              )}
            </div>
          </motion.div>

        </div>

      </div>

    </div>
  );
}