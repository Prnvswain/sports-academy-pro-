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
  CalendarDays, User, Trophy, Target, Zap, Activity, ArrowRight, X, AlertCircle
} from 'lucide-react';

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

function CircularProgressRing({ percentage, size = 100, strokeWidth = 8, primaryColor = 'text-emerald-500', secondaryColor = 'text-slate-100 dark:text-slate-800', children }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(Math.max(percentage, 0), 100) / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0 animate-fade-in" style={{ width: size, height: size }}>
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
  
  // Calendar Month states
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const response = await parentGet('/parent/dashboard');
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

  const attendanceStats = useMemo(() => {
    const total = attendanceData.length;
    const present = attendanceData.filter(a => a.status === 'PRESENT').length;
    const absent = attendanceData.filter(a => a.status === 'ABSENT').length;
    const late = attendanceData.filter(a => a.status === 'LATE').length;
    const holiday = attendanceData.filter(a => a.status === 'HOLIDAY').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

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
    })).slice(-6);
  }, [attendanceData]);

  const pieData = [
    { name: 'Present', value: attendanceStats.present, color: 'var(--theme-primary, #10b981)' },
    { name: 'Absent', value: attendanceStats.absent, color: '#ef4444' },
    { name: 'Late', value: attendanceStats.late, color: '#f59e0b' }
  ].filter(d => d.value > 0);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const startOfCurrent = new Date(currentYear, currentMonth, 1);
    const endOfCurrent = new Date(currentYear, currentMonth + 1, 0);
    const totalDays = endOfCurrent.getDate();
    
    // Day of the week startOfCurrent falls on (0 = Sunday, 1 = Monday, etc.)
    const startOffset = startOfCurrent.getDay();
    const days = [];

    // Empty offset placeholders
    for (let i = 0; i < startOffset; i++) {
      days.push({ dayNum: null, date: null });
    }

    // Days list
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(currentYear, currentMonth, i);
      const attendance = attendanceData.find(a => {
        const checkDate = new Date(a.date);
        return checkDate.getDate() === i && 
               checkDate.getMonth() === currentMonth && 
               checkDate.getFullYear() === currentYear;
      });

      days.push({
        dayNum: i,
        date: date,
        attendance: attendance || null
      });
    }

    return days;
  }, [currentMonth, currentYear, attendanceData]);

  const handlePrevMonth = () => {
    setCurrentMonth(prev => {
      if (prev === 0) {
        setCurrentYear(y => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      if (prev === 11) {
        setCurrentYear(y => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const handleDayClick = (day) => {
    if (day.attendance) {
      setSelectedAttendance(day.attendance);
      setShowDetailModal(true);
    }
  };

  const formatMonthName = () => {
    const tempDate = new Date(currentYear, currentMonth, 1);
    return tempDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto font-sans p-4 lg:p-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Attendance Logs
          </h1>
          <p className="text-xs font-bold text-muted-foreground mt-0.5 uppercase tracking-wider">
            Monitor daily checked-in drills and class streaks
          </p>
        </div>
      </motion.div>

      {!studentData ? (
        <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center text-muted-foreground">
          <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2 animate-bounce" />
          <p className="text-sm font-bold">No registered student found</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Summary Cards and Ring */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Attendance Percentage Ring */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center gap-6 justify-center"
            >
              <CircularProgressRing percentage={attendanceStats.percentage} size={110} strokeWidth={9} primaryColor="text-primary">
                <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wide">Rate</span>
                <span className="text-xl font-black text-foreground">{attendanceStats.percentage}%</span>
              </CircularProgressRing>
              
              <div className="space-y-1">
                <h4 className="text-sm font-black text-foreground">Attendance Rate</h4>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Enrolled session metrics</p>
                <div className="flex gap-2 items-center text-xs font-bold text-orange-500 mt-2">
                  <Flame size={14} className="fill-orange-500 text-orange-500" />
                  <span>{attendanceStats.currentStreak} streak</span>
                </div>
              </div>
            </motion.div>

            {/* Total check-ins list cards */}
            {[
              { label: 'Total Present', val: attendanceStats.present, icon: CheckCircle, color: 'text-primary bg-primary/10' },
              { label: 'Total Late', val: attendanceStats.late, icon: Timer, color: 'text-amber-500 bg-amber-500/10' },
              { label: 'Total Absent', val: attendanceStats.absent, icon: XCircle, color: 'text-rose-500 bg-rose-500/10' },
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-black text-foreground tracking-tight mt-1">{stat.val}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Calendar & Chart grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Calendar grid (2/3 width) */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border/40">
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">{formatMonthName()}</h3>
                  <p className="text-[10px] text-muted-foreground">Select checked-in days for details</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handlePrevMonth}
                    className="p-2 bg-muted/40 hover:bg-muted border border-border rounded-xl text-foreground transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-2 bg-muted/40 hover:bg-muted border border-border rounded-xl text-foreground transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Grid Calendar cells */}
              <div className="grid grid-cols-7 gap-2.5">
                {/* Weekdays */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-[10px] font-black uppercase text-muted-foreground tracking-wider py-1">
                    {day}
                  </div>
                ))}

                {/* Day Blocks */}
                {calendarDays.map((day, idx) => {
                  if (day.dayNum === null) {
                    return <div key={`empty-${idx}`} className="aspect-square opacity-0 pointer-events-none" />;
                  }

                  const attendance = day.attendance;
                  let bgClass = 'bg-muted/10 border-border/60 hover:bg-muted/30';
                  let textClass = 'text-foreground';
                  let hasClick = false;

                  if (attendance) {
                    hasClick = true;
                    if (attendance.status === 'PRESENT') {
                      bgClass = 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/25';
                    } else if (attendance.status === 'LATE') {
                      bgClass = 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/25';
                    } else if (attendance.status === 'ABSENT') {
                      bgClass = 'bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/25';
                    } else if (attendance.status === 'HOLIDAY') {
                      bgClass = 'bg-blue-500/10 border-blue-500/20 text-blue-500 hover:bg-blue-500/25';
                    }
                  }

                  return (
                    <button
                      key={`day-${day.dayNum}`}
                      onClick={() => hasClick && handleDayClick(day)}
                      disabled={!hasClick}
                      className={`aspect-square border rounded-xl flex flex-col justify-between p-1.5 text-xs font-bold transition-all relative select-none ${bgClass} ${
                        hasClick ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default'
                      }`}
                    >
                      <span>{day.dayNum}</span>
                      {attendance && (
                        <span className="w-1.5 h-1.5 rounded-full bg-current absolute bottom-1.5 right-1.5" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legends list */}
              <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground font-black uppercase pt-3 border-t border-border/40">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-primary/20 border border-primary/30 inline-block"></span> Present</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500/20 border border-amber-500/30 inline-block"></span> Late</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-500/20 border border-rose-500/30 inline-block"></span> Absent</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-blue-500/20 border border-blue-500/30 inline-block"></span> Holiday</span>
              </div>
            </motion.div>

            {/* Monthly Trend Analytics (1/3 width) */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-1 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4"
            >
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Monthly Trends</h3>
                <p className="text-[10px] text-muted-foreground">Class presence history</p>
              </div>

              <div className="h-[280px] w-full text-xs">
                {monthlyAnalytics.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground font-semibold">No history data found</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyAnalytics} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--theme-border, #e2e8f0)" />
                      <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} suffix="%" />
                      <Tooltip formatter={(val) => [`${val}%`, 'Rate']} />
                      <Bar dataKey="rate" fill="var(--theme-primary, #10b981)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL popup */}
      <AnimatePresence>
        {showDetailModal && selectedAttendance && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-5 max-w-sm w-full relative shadow-xl space-y-4 text-xs font-semibold text-foreground"
            >
              <button
                onClick={() => setShowDetailModal(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4.5 h-4.5" />
              </button>
              
              <h3 className="text-sm font-black text-foreground">Class Attendance Detail</h3>
              
              <div className="space-y-2.5 pt-2 border-t border-border/40">
                <div className="flex justify-between border-b border-border/40 pb-2">
                  <span className="text-muted-foreground">Class Date</span>
                  <span className="font-bold">{new Date(selectedAttendance.date).toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-2">
                  <span className="text-muted-foreground">Check-in Status</span>
                  <span className={`font-black uppercase ${
                    selectedAttendance.status === 'PRESENT' ? 'text-primary' : 
                    selectedAttendance.status === 'LATE' ? 'text-amber-500' : 'text-rose-500'
                  }`}>
                    {selectedAttendance.status}
                  </span>
                </div>
                {selectedAttendance.check_in_time && (
                  <div className="flex justify-between border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">Check-in Time</span>
                    <span className="font-bold">{new Date(selectedAttendance.check_in_time).toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'})}</span>
                  </div>
                )}
                <div className="flex justify-between pb-1">
                  <span className="text-muted-foreground">Assigned Coach</span>
                  <span className="font-bold">{studentData.coach?.name || 'Academy Coach'}</span>
                </div>
              </div>

              {selectedAttendance.remarks && (
                <div className="p-3 bg-muted/30 border border-border/60 rounded-xl italic text-muted-foreground text-center">
                  "{selectedAttendance.remarks}"
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
