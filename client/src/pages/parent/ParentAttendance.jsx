import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parentGet } from '../../api/client';
import Loader from '../../components/Loader';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import {
  Calendar, CheckCircle, XCircle, Clock, TrendingUp, Award, Flame,
  ChevronLeft, ChevronRight, Info, MapPin, Timer, Shield, Star,
  CalendarDays, User, Trophy, Target, Zap, Activity, ArrowRight, X
} from 'lucide-react';

// Animated Counter Component
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
      const easeVal = progress * (2 - progress);
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

// Circular Progress Ring Component
function CircularProgressRing({ percentage, size = 100, strokeWidth = 8, primaryColor = 'text-emerald-500', secondaryColor = 'text-slate-100 dark:text-slate-800', children }) {
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
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-1">
        {children}
      </div>
    </div>
  );
}

export default function ParentAttendance() {
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState([]);
  const [studentData, setStudentData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const response = await parentGet('/parent/dashboard');
      // Extract attendance data from dashboard response
      const students = response.data?.students || [];
      const selectedStudent = students[0] || null;
      
      if (selectedStudent) {
        setAttendanceData(selectedStudent.student_attendances || []);
        setStudentData({
          name: selectedStudent.name,
          profile_photo: selectedStudent.profile_photo,
          sport: selectedStudent.sport,
          batch: selectedStudent.batch,
          coach: selectedStudent.batch?.coach || null,
          next_class: selectedStudent.next_class || selectedStudent.upcoming_class || null
        });
      }
    } catch (error) {
      console.error('Failed to fetch attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate attendance statistics
  const attendanceStats = useMemo(() => {
    const total = attendanceData.length;
    const present = attendanceData.filter(a => a.status === 'PRESENT').length;
    const absent = attendanceData.filter(a => a.status === 'ABSENT').length;
    const late = attendanceData.filter(a => a.status === 'LATE').length;
    const holiday = attendanceData.filter(a => a.status === 'HOLIDAY').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const sortedAttendance = [...attendanceData].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    for (let i = 0; i < sortedAttendance.length; i++) {
      if (sortedAttendance[i].status === 'PRESENT') {
        tempStreak++;
        if (i === 0) currentStreak = tempStreak;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    return { total, present, absent, late, holiday, percentage, currentStreak, longestStreak };
  }, [attendanceData]);

  // Monthly analytics data
  const monthlyAnalytics = useMemo(() => {
    const monthlyData = {};
    attendanceData.forEach(a => {
      const date = new Date(a.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'short' });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { name: monthName, present: 0, absent: 0, late: 0, total: 0 };
      }
      monthlyData[monthKey].total++;
      if (a.status === 'PRESENT') monthlyData[monthKey].present++;
      else if (a.status === 'ABSENT') monthlyData[monthKey].absent++;
      else if (a.status === 'LATE') monthlyData[monthKey].late++;
    });

    return Object.values(monthlyData).map(m => ({
      ...m,
      rate: Math.round((m.present / m.total) * 100)
    })).slice(-6); // Last 6 months
  }, [attendanceData]);

  // Pie chart data
  const pieData = [
    { name: 'Present', value: attendanceStats.present, color: '#10b981' },
    { name: 'Absent', value: attendanceStats.absent, color: '#ef4444' },
    { name: 'Late', value: attendanceStats.late, color: '#f59e0b' }
  ].filter(d => d.value > 0);

  // Weekly attendance data
  const weeklyData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map(day => {
      const dayAttendance = attendanceData.filter(a => {
        const date = new Date(a.date);
        return date.toLocaleString('default', { weekday: 'short' }) === day;
      });
      const present = dayAttendance.filter(a => a.status === 'PRESENT').length;
      return {
        day,
        present,
        total: dayAttendance.length,
        rate: dayAttendance.length > 0 ? Math.round((present / dayAttendance.length) * 100) : 0
      };
    });
  }, [attendanceData]);

  // Attendance insights
  const attendanceInsights = useMemo(() => {
    if (monthlyAnalytics.length === 0) return [];

    const bestMonth = monthlyAnalytics.reduce((best, curr) => curr.rate > best.rate ? curr : best, { rate: 0, name: '—' });
    const lowestMonth = monthlyAnalytics.reduce((low, curr) => curr.rate < low.rate ? curr : low, { rate: 100, name: '—' });
    const avgRate = Math.round(monthlyAnalytics.reduce((sum, m) => sum + m.rate, 0) / monthlyAnalytics.length);

    const currentMonthLabel = new Date().toLocaleString('default', { month: 'short' });
    const currentMonthData = monthlyAnalytics.find(m => m.name === currentMonthLabel);
    const missedThisMonth = currentMonthData?.absent || 0;
    const lateThisMonth = currentMonthData?.late || 0;

    return [
      { label: 'Best Month', value: bestMonth.name !== '—' ? `${bestMonth.name} (${bestMonth.rate}%)` : '—', icon: Trophy, color: 'text-emerald-500' },
      { label: 'Lowest Month', value: lowestMonth.name !== '—' ? `${lowestMonth.name} (${lowestMonth.rate}%)` : '—', icon: TrendingUp, color: 'text-red-500' },
      { label: 'Average Monthly', value: `${avgRate}%`, icon: Activity, color: 'text-blue-500' },
      { label: 'Missed This Month', value: missedThisMonth, icon: XCircle, color: 'text-red-500' },
      { label: 'Late This Month', value: lateThisMonth, icon: Clock, color: 'text-amber-500' }
    ];
  }, [monthlyAnalytics]);

  // Calendar generation
  const calendarDays = useMemo(() => {
    const year = currentYear;
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < startDay; i++) {
      days.push({ type: 'empty' });
    }

    // Days of the month
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const attendance = attendanceData.find(a => a.date?.startsWith(dateStr));
      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
      const isFuture = new Date(year, month, day) > new Date();

      days.push({
        type: 'day',
        day,
        date: dateStr,
        attendance,
        isToday,
        isFuture,
        status: attendance?.status || (isFuture ? 'FUTURE' : 'NO_CLASS')
      });
    }

    return days;
  }, [currentMonth, currentYear, attendanceData]);

  const handleDateClick = (day) => {
    if (day.type === 'day' && day.attendance && !day.isFuture) {
      setSelectedAttendance(day.attendance);
      setShowDetailModal(true);
    }
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentYear, currentMonth.getMonth() + direction, 1);
    setCurrentMonth(newDate);
    setCurrentYear(newDate.getFullYear());
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  const getStatusColor = (status) => {
    switch (status) {
      case 'PRESENT': return 'bg-emerald-500';
      case 'ABSENT': return 'bg-red-500';
      case 'LATE': return 'bg-amber-500';
      case 'HOLIDAY': return 'bg-blue-500';
      case 'FUTURE': return 'bg-slate-200 dark:bg-slate-700';
      default: return 'bg-slate-300 dark:bg-slate-600';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PRESENT': return { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30', label: 'Present' };
      case 'ABSENT': return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Absent' };
      case 'LATE': return { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30', label: 'Late' };
      case 'HOLIDAY': return { icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'Holiday' };
      default: return { icon: Info, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800', label: 'No Class' };
    }
  };

  if (loading) {
    return <Loader message="Loading attendance data..." />;
  }

  if (!studentData || attendanceData.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[60vh] p-8"
      >
        <div className="w-24 h-24 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
          <Calendar className="w-12 h-12 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">No Attendance Records</h3>
        <p className="text-slate-500 dark:text-slate-400 text-center max-w-md">
          Attendance records will appear here after your student's classes begin.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 w-full overflow-x-hidden relative px-4 sm:px-6 max-w-7xl mx-auto"
    >
      {/* Subtle Sports-Themed Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#84cc16]/3 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#22c55e]/3 rounded-full blur-3xl" />
      </div>

      {/* Dashboard Header */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-black/5 border border-slate-100 dark:border-slate-700/50 p-5 overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#84cc16]/5 to-[#65a30d]/5 rounded-full blur-2xl" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            {studentData.profile_photo ? (
              <img
                src={studentData.profile_photo}
                alt={studentData.name}
                className="w-16 h-16 rounded-xl object-cover border-2 border-[#84cc16] shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#84cc16] to-[#65a30d] flex items-center justify-center text-white font-black text-xl shadow-md">
                {studentData.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
            )}
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 leading-tight">{studentData.name}</h2>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>{studentData.sport?.name || 'General Sport'}</span>
                <span>•</span>
                <span>{studentData.batch?.name || 'No Batch'}</span>
                <span>•</span>
                <span>Coach: {studentData.coach?.name || '—'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400">Status Score:</span>
            <span className="text-md font-black text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              {attendanceStats.percentage}% Rate
            </span>
          </div>
        </div>
      </motion.div>

      {/* TOP SECTION: SPLIT LAYOUT (Calendar on Left, Summary on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Calendar (lg:col-span-7) scaled down ~20-25% */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-2xl shadow-md shadow-black/5 border border-slate-100 dark:border-slate-700/50 p-4 flex flex-col"
        >
          {/* Calendar Controller Header */}
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-700/50">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#84cc16]" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Attendance Log</h3>
            </div>
            
            <div className="flex items-center gap-1.5">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigateMonth(-1)}
                className="p-1 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </motion.button>
              <span className="text-xs font-black text-slate-900 dark:text-slate-100 min-w-[90px] text-center uppercase tracking-tight">
                {monthNames[currentMonth.getMonth()].slice(0, 3)} {currentYear}
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigateMonth(1)}
                className="p-1 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </div>

          {/* Calendar Weekdays Grid */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <div key={idx} className="text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days Matrix */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.005 }}
                onClick={() => handleDateClick(day)}
                className={`
                  aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all relative
                  ${day.type === 'empty' ? 'invisible' : 'bg-slate-50/50 dark:bg-slate-900/10 border border-slate-100/50 dark:border-slate-800/30'}
                  ${day.isToday ? 'ring-2 ring-[#84cc16] ring-offset-1 dark:ring-offset-slate-800 bg-white dark:bg-slate-800' : ''}
                  ${day.attendance && !day.isFuture ? 'hover:scale-105 hover:shadow-sm hover:bg-slate-100 dark:hover:bg-slate-900/60' : ''}
                  ${day.isFuture ? 'opacity-40 cursor-not-allowed' : ''}
                `}
              >
                {day.type === 'day' && (
                  <>
                    <span className={`text-[11px] font-black ${day.isToday ? 'text-[#84cc16]' : 'text-slate-800 dark:text-slate-200'}`}>
                      {day.day}
                    </span>
                    {day.attendance && !day.isFuture && (
                      <div className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${getStatusColor(day.status)}`} />
                    )}
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* RIGHT COLUMN: SUMMARY PANEL (lg:col-span-5) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-5 space-y-4"
        >
          {/* Card 1: Attendance Percentage Progress Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md shadow-black/5 border border-slate-100 dark:border-slate-700/50 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Attendance Rate</p>
              <h4 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">Consistency Metric</h4>
              <p className="text-xs text-slate-500 mt-0.5">Percentage of classes attended</p>
            </div>
            
            <CircularProgressRing 
              percentage={attendanceStats.percentage} 
              size={80} 
              strokeWidth={7}
              primaryColor="text-[#84cc16]"
              secondaryColor="text-slate-100 dark:text-slate-700"
            >
              <div className="text-center">
                <span className="text-lg font-black text-slate-950 dark:text-white leading-none">
                  <AnimatedCounter value={attendanceStats.percentage} decimals={0} />%
                </span>
              </div>
            </CircularProgressRing>
          </div>

          {/* Card 2: Attendance Status Breakdown */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md shadow-black/5 border border-slate-100 dark:border-slate-700/50 p-4">
            <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-3">Status Breakdown</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-emerald-500/10 border border-emerald-500/10 rounded-xl p-2">
                <span className="text-lg font-black text-emerald-500 block">
                  <AnimatedCounter value={attendanceStats.present} />
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 block mt-0.5">Present</span>
              </div>
              <div className="bg-red-500/10 border border-red-500/10 rounded-xl p-2">
                <span className="text-lg font-black text-red-500 block">
                  <AnimatedCounter value={attendanceStats.absent} />
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-wide text-red-600 dark:text-red-400 block mt-0.5">Absent</span>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/10 rounded-xl p-2">
                <span className="text-lg font-black text-amber-500 block">
                  <AnimatedCounter value={attendanceStats.late} />
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-wide text-amber-600 dark:text-amber-400 block mt-0.5">Late</span>
              </div>
            </div>
          </div>

          {/* Card 3: Streaks widget */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md shadow-black/5 border border-slate-100 dark:border-slate-700/50 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                <Flame className="w-5 h-5 fill-orange-500/10" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Current Streak</p>
                <h4 className="text-md font-black text-slate-900 dark:text-slate-100 mt-0.5">
                  <AnimatedCounter value={attendanceStats.currentStreak} /> Classes
                </h4>
              </div>
            </div>
            
            <div className="text-right border-l border-slate-100 dark:border-slate-700/50 pl-4">
              <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Longest Streak</p>
              <h4 className="text-md font-black text-amber-500 mt-0.5">
                <AnimatedCounter value={attendanceStats.longestStreak} /> Classes
              </h4>
            </div>
          </div>

          {/* Card 4: Monthly Insights (Compact list) */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md shadow-black/5 border border-slate-100 dark:border-slate-700/50 p-4">
            <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2.5">Monthly Insights</p>
            <div className="space-y-2">
              {attendanceInsights.slice(0, 3).map((insight, idx) => {
                const Icon = insight.icon;
                return (
                  <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100/50 dark:border-slate-700/30 last:border-0">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2 font-semibold">
                      <Icon className={`w-3.5 h-3.5 ${insight.color}`} /> {insight.label}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{insight.value}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </motion.div>

      </div>

      {/* BELOW THE SPLIT LAYOUT (Scroll Down Elements) */}
      
      {/* 1. Monthly Attendance Analytics (Charts) */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4"
      >
        {/* Monthly Trend Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md shadow-black/5 border border-slate-100 dark:border-slate-700/50 p-5">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mb-4 uppercase tracking-wider">Attendance trend line</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              {monthlyAnalytics.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No monthly trend data available.</div>
              ) : (
                <LineChart data={monthlyAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} suffix="%" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: 11 }}
                    itemStyle={{ color: '#f1f5f9' }}
                  />
                  <Line type="monotone" dataKey="rate" stroke="#84cc16" strokeWidth={3} dot={{ fill: '#84cc16', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie distribution & Weekly breakdown block */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md shadow-black/5 border border-slate-100 dark:border-slate-700/50 p-5">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mb-4 uppercase tracking-wider">Status Distribution</h3>
          <div className="h-56 flex items-center justify-center">
            {pieData.length === 0 ? (
              <div className="text-xs text-muted-foreground">No breakdown metrics recorded.</div>
            ) : (
              <div className="w-full h-full flex items-center justify-between gap-4">
                <div className="w-40 h-40 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} classes`, 'Count']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="space-y-2 flex-shrink-0 text-xs font-semibold pr-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
                    <span>Present ({attendanceStats.present})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></span>
                    <span>Absent ({attendanceStats.absent})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
                    <span>Late ({attendanceStats.late})</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Weekly Attendance Bar Chart (takes full width below) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md shadow-black/5 border border-slate-100 dark:border-slate-700/50 p-5 md:col-span-2">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mb-4 uppercase tracking-wider">Weekly Attendance Pattern</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: 11 }}
                  itemStyle={{ color: '#f1f5f9' }}
                />
                <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} name="Classes Attended" />
                <Bar dataKey="total" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Classes Slotted" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* 2. Recent Attendance Timeline */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-md shadow-black/5 border border-slate-100 dark:border-slate-700/50 p-5"
      >
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mb-4 uppercase tracking-wider">Recent Attendance</h3>
        <div className="space-y-3">
          {[...attendanceData].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5).map((attendance, index) => {
            const badge = getStatusBadge(attendance.status);
            const Icon = badge.icon;
            return (
              <motion.div
                key={index}
                whileHover={{ scale: 1.005 }}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors border border-slate-100/50 dark:border-slate-800/30"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${badge.bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${badge.color}`} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {new Date(attendance.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {attendance.check_in_time ? `Check-in: ${attendance.check_in_time}` : 'No check-in time recorded'}
                    </div>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${badge.bg} ${badge.color}`}>
                  {badge.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* 3. Upcoming Classes */}
      {studentData.next_class && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-2xl border border-blue-500/20 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-extrabold text-blue-600 dark:text-blue-400 text-sm uppercase tracking-wider">Next Class Scheduled</h3>
                <div className="text-xs text-blue-700/80 dark:text-blue-400/80 mt-1 font-semibold">
                  {studentData.next_class.date ? new Date(studentData.next_class.date).toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' }) : 'TBD'}
                  {studentData.next_class.time && ` @ ${studentData.next_class.time}`}
                </div>
                <div className="text-[10px] text-blue-600/60 dark:text-blue-400/60 mt-1 font-semibold">
                  {studentData.next_class.coach?.name || 'Coach TBD'} • {studentData.next_class.batch?.name || 'Batch TBD'}
                </div>
              </div>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/30 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* 4. Attendance Milestones */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="space-y-4"
      >
        {attendanceStats.longestStreak >= 3 && (
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl border border-amber-500/20 p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Award className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-extrabold text-amber-600 dark:text-amber-400 text-sm uppercase tracking-wider">Consistency Champion!</h3>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/80 font-medium mt-1">
                  Your student athlete has maintained a training streak of {attendanceStats.longestStreak} classes. Outstanding commitment!
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {attendanceStats.percentage >= 100 && (
            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl border border-emerald-500/20 p-4 text-center">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
              <div className="font-bold text-emerald-600 dark:text-emerald-400 text-xs uppercase tracking-tight">Perfect Attendance</div>
              <div className="text-[10px] text-emerald-600/60 dark:text-emerald-400/60 mt-1 font-semibold">100% check-ins</div>
            </div>
          )}
          {attendanceStats.currentStreak >= 5 && (
            <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-2xl border border-orange-500/20 p-4 text-center">
              <Flame className="w-8 h-8 mx-auto mb-2 text-orange-500" />
              <div className="font-bold text-orange-600 dark:text-orange-400 text-xs uppercase tracking-tight">5-Day Active Streak</div>
              <div className="text-[10px] text-orange-600/60 dark:text-orange-400/60 mt-1 font-semibold">Training consistently</div>
            </div>
          )}
          {attendanceStats.longestStreak >= 10 && (
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl border border-purple-500/20 p-4 text-center">
              <Star className="w-8 h-8 mx-auto mb-2 text-purple-500" />
              <div className="font-bold text-purple-600 dark:text-purple-400 text-xs uppercase tracking-tight">Double Digits</div>
              <div className="text-[10px] text-purple-600/60 dark:text-purple-400/60 mt-1 font-semibold">Legendary!</div>
            </div>
          )}
          {attendanceStats.percentage >= 90 && (
            <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-2xl border border-blue-500/20 p-4 text-center">
              <Target className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <div className="font-bold text-blue-600 dark:text-blue-400 text-xs uppercase tracking-tight">Prime Athlete</div>
              <div className="text-[10px] text-blue-600/60 dark:text-blue-400/60 mt-1 font-semibold">Great attendance</div>
            </div>
          )}
        </div>
      </motion.div>

      {/* 5. Attendance Legend (Now cleanly placed at the bottom) */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-4 shadow-sm"
      >
        <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2.5">Attendance Calendar Legend</p>
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          {[
            { status: 'PRESENT', color: 'bg-emerald-500', label: 'Present check-in indicator' },
            { status: 'ABSENT', color: 'bg-red-500', label: 'Absent class status' },
            { status: 'LATE', color: 'bg-amber-500', label: 'Late check-in event' },
            { status: 'HOLIDAY', color: 'bg-blue-500', label: 'Academy general holiday' },
            { status: 'NO_CLASS', color: 'bg-slate-300 dark:bg-slate-600', label: 'Rest day / No class scheduled' }
          ].map(item => (
            <div key={item.status} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${item.color}`} />
              <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Attendance Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedAttendance && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full relative shadow-xl text-foreground"
            >
              <button 
                onClick={() => setShowDetailModal(false)} 
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <XCircle size={20} />
              </button>
              <h3 className="text-lg font-bold text-foreground mb-4">Attendance Details</h3>

              <div className="space-y-3.5 text-xs font-semibold">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Date</span>
                  <span>{new Date(selectedAttendance.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${getStatusBadge(selectedAttendance.status).bg} ${getStatusBadge(selectedAttendance.status).color}`}>
                    {getStatusBadge(selectedAttendance.status).label}
                  </span>
                </div>
                {selectedAttendance.check_in_time && (
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Check-in Time</span>
                    <span>{selectedAttendance.check_in_time}</span>
                  </div>
                )}
                {selectedAttendance.check_out_time && (
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Check-out Time</span>
                    <span>{selectedAttendance.check_out_time}</span>
                  </div>
                )}
                {selectedAttendance.remarks && (
                  <div className="border-b border-border pb-2 flex flex-col gap-1 text-left">
                    <span className="text-muted-foreground">Coach Remarks</span>
                    <span className="font-medium text-slate-700 dark:text-slate-350 break-words leading-relaxed">{selectedAttendance.remarks}</span>
                  </div>
                )}
                {selectedAttendance.gps_verified !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GPS Location Verified</span>
                    <span className={selectedAttendance.gps_verified ? 'text-emerald-500 font-bold' : 'text-red-500 font-bold'}>
                      {selectedAttendance.gps_verified ? 'Verified ✓' : 'Unverified'}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
