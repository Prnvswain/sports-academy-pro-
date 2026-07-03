import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Loader from '../../components/Loader';
import { adminGet } from '../../api/client';

function formatCurrency(value) {
  const num = parseFloat(value);
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return '$0.00';
  }
  return `$${num.toFixed(2)}`;
}

// Custom Sports & SaaS Premium Icons with Framer Motion integrations
const Icons = {
  Trophy: (props) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.388c0-.597.237-1.17.659-1.591l2.965-2.965a2.25 2.25 0 0 0 0-3.182l-.659-.659c-.422-.421-1.036-.586-1.615-.44a6.974 6.974 0 0 0-3.328 1.956c-.456.455-1.134.618-1.748.423a6.976 6.976 0 0 0-4.041-3.125 1.5 1.5 0 0 0-1.892 1.893 6.976 6.976 0 0 0 3.125 4.04c.195.615.032 1.293-.423 1.749A6.974 6.974 0 0 0 4.14 14.1c-.146.58.02 1.193.44 1.615l.659.659a2.25 2.25 0 0 0 3.182 0l2.965 2.965c.421.42.659.994.659 1.591v3.388Z" />
    </svg>
  ),
  Whistle: (props) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m12 0a6.002 6.002 0 0 0-5.183-5.949V3.75a.75.75 0 1 0-1.5 0v3.051A6.002 6.002 0 0 0 6 11.25v1.5m12 0h-3m-9 0H3m12 0c0 .966-.316 1.857-.847 2.573m-10.306 0A4.502 4.502 0 0 1 6 12.75v-1.5c0-.966.316-1.857.847-2.573M15.75 11.25c0-.966-.316-1.857-.847-2.573" />
    </svg>
  ),
  Players: (props) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
  ),
  Stopwatch: (props) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 3h3m-1.5 0v1.5m6.728 2.772-1.06-1.06" />
    </svg>
  ),
  CheckBadge: (props) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296Z" />
    </svg>
  ),
  RedCard: (props) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3Z" />
    </svg>
  ),
  CalendarCheck: (props) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75" />
    </svg>
  ),
  Star: (props) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.563.563 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.563.563 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
    </svg>
  ),
  TacticsBoard: (props) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
    </svg>
  ),
  Chart: (props) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
    </svg>
  )
};

export default function AnalyticsPanel() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await adminGet('/admin/analytics');
      const data = result?.data || {};
      setMetrics({
        total_revenue: data.total_revenue ?? 0,
        active_coach_count: data.active_coach_count ?? 0,
        active_student_count: data.active_student_count ?? 0,
        total_batches: data.total_batches ?? 0,
        attendance_percent: data.attendance_percent ?? 0,
        payment_summary: {
          paid_students: data.payment_summary?.paid_students ?? 0,
          unpaid_students: data.payment_summary?.unpaid_students ?? 0,
        },
        pending_dues: data.pending_dues ?? 0,
        performance_scores_count: data.performance_scores_count ?? 0,
        daily_notes_count: data.daily_notes_count ?? 0,
        monthly_revenue: data.monthly_revenue ?? 0,
        monthly_attendance: data.monthly_attendance ?? 0,
      });
    } catch (err) {
      setError(err.message || 'Failed to communicate with analytics backend runtime engine.');
      setMetrics({
        total_revenue: 0,
        active_coach_count: 0,
        active_student_count: 0,
        total_batches: 0,
        attendance_percent: 0,
        payment_summary: {
          paid_students: 0,
          unpaid_students: 0,
        },
        pending_dues: 0,
        performance_scores_count: 0,
        daily_notes_count: 0,
        monthly_revenue: 0,
        monthly_attendance: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f7f6] dark:bg-[#0a0f0d]">
        <Loader message="Loading academy analytics…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7f6] p-6 dark:bg-[#0a0f0d]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", bounce: 0.4 }}
          className="max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-red-100 dark:bg-gray-900 dark:ring-red-900/30"
        >
          <motion.div 
            animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20"
          >
            <Icons.RedCard className="h-8 w-8 text-red-500 dark:text-red-400" />
          </motion.div>
          <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">Foul Play! (Error)</h3>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button" 
            className="inline-flex w-full justify-center rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-bold tracking-wide text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 focus:outline-none transition-colors duration-200"
            onClick={loadAnalytics}
          >
            Retry Connection
          </motion.button>
        </motion.div>
      </div>
    );
  }

  const safeMetrics = metrics || {};
  const summary = safeMetrics.payment_summary || { paid_students: 0, unpaid_students: 0 };
  
  // Data for visual graphs (calculated from existing safe data ONLY)
  const totalStudents = (summary.paid_students || 0) + (summary.unpaid_students || 0);
  const paidPercentage = totalStudents > 0 ? ((summary.paid_students / totalStudents) * 100).toFixed(1) : 0;
  const unpaidPercentage = totalStudents > 0 ? ((summary.unpaid_students / totalStudents) * 100).toFixed(1) : 0;

  // Animations
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: 'spring', stiffness: 400, damping: 25 } 
    }
  };

  // Reusable Animated Card Component
  const StatCard = ({ title, value, icon: Icon, colorClass, bgLight, bgDark, textClass, onClick, extraContent }) => {
    const isClickable = !!onClick;
    return (
      <motion.div
        variants={itemVariants}
        onClick={onClick}
        whileHover={isClickable ? { y: -6, scale: 1.02, transition: { type: 'spring', stiffness: 300 } } : { y: -4 }}
        className={`group relative overflow-hidden rounded-3xl bg-white p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] ring-1 ring-gray-100 transition-all duration-300 dark:bg-[#111814] dark:ring-gray-800/60 ${isClickable ? 'cursor-pointer hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] hover:ring-emerald-500/20' : ''} flex flex-col justify-between h-full`}
      >
        <div className={`absolute -right-8 -top-8 h-36 w-36 rounded-full blur-3xl opacity-20 transition-all duration-500 ${bgLight} dark:${bgDark} group-hover:scale-150 group-hover:opacity-40`} />
        
        <div className="relative z-10 flex items-start justify-between mb-4">
          <div className="flex flex-col gap-1">
            <span className="text-[0.68rem] font-bold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500">
              {title}
            </span>
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className={`text-3xl font-black tracking-tight ${textClass}`}
            >
              {value}
            </motion.span>
          </div>
          
          <motion.div 
            whileHover={{ rotate: 15, scale: 1.15 }}
            className={`flex h-14 w-14 items-center justify-center rounded-2xl ${bgLight} dark:${bgDark} ${colorClass} transition-colors duration-300 shadow-inner`}
          >
            <Icon className="h-7 w-7" />
          </motion.div>
        </div>

        {extraContent && (
          <div className="relative z-10 w-full mt-auto pt-2">
            {extraContent}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    // Changed max-w-7xl to max-w-[1600px] and px-4 sm:px-6 xl:px-12 for better wide screen utilization
    <div className="min-h-screen w-full overflow-x-hidden bg-[#f4f7f6] px-4 py-8 font-sans sm:px-6 xl:px-12 dark:bg-[#0a0f0d]">
      <div className="mx-auto max-w-[1600px] space-y-8">
        
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between bg-white dark:bg-[#111814] p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] ring-1 ring-gray-100 dark:ring-gray-800/60"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/30">
              <Icons.Trophy className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                Academy <span className="text-emerald-600 dark:text-emerald-400">Dashboard</span>
              </h2>
              <p className="mt-1 text-sm font-semibold text-gray-400 dark:text-gray-500">
                Live operational analytics and sports metrics.
              </p>
            </div>
          </div>

          <motion.button
            type="button"
            onClick={loadAnalytics}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 sm:w-auto"
          >
            <motion.div
              animate={loading ? { rotate: 360 } : {}}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            >
              <svg className="h-4 w-4 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </motion.div>
            Sync Data
          </motion.button>
        </motion.div>

        {/* Real-time Visually Generated Graphs (Using existing Data) */}
        <AnimatePresence>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 gap-6 lg:grid-cols-2"
          >
            {/* Payment Distribution Graph Component */}
            <div className="rounded-3xl bg-white dark:bg-[#111814] p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] ring-1 ring-gray-100 dark:ring-gray-800/60 flex flex-col justify-center">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Student Fee Distribution</h3>
                <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-bold text-gray-600 dark:text-gray-300">Total: {totalStudents}</span>
              </div>
              
              <div className="relative h-6 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 flex">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${paidPercentage}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="h-full bg-teal-500 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2)]"
                />
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${unpaidPercentage}%` }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                  className="h-full bg-rose-500 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2)]"
                />
              </div>
              <div className="mt-4 flex justify-between text-xs font-bold">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-teal-500" />
                  <span className="text-teal-700 dark:text-teal-400">Paid ({paidPercentage}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500" />
                  <span className="text-rose-700 dark:text-rose-400">Unpaid ({unpaidPercentage}%)</span>
                </div>
              </div>
            </div>

            {/* Attendance Performance Graph Component */}
            <div className="rounded-3xl bg-white dark:bg-[#111814] p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] ring-1 ring-gray-100 dark:ring-gray-800/60 flex flex-col justify-center">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Academy Attendance Pulse</h3>
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">30 Days</span>
              </div>
              
              <div className="relative h-6 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${safeMetrics.attendance_percent ?? 0}%` }}
                  transition={{ duration: 1.5, type: "spring", bounce: 0.2 }}
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2)] rounded-full"
                />
              </div>
              <div className="mt-4 flex justify-between text-xs font-bold text-gray-500">
                <span>0%</span>
                <span className="text-emerald-600 dark:text-emerald-400 text-sm">{safeMetrics.attendance_percent ?? 0}% Active</span>
                <span>100%</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dashboard Grid - Expanded for larger screens (2xl:grid-cols-5 or 4) */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 auto-rows-fr"
        >
          <StatCard 
            title="Total Revenue" 
            value={formatCurrency(safeMetrics.total_revenue)} 
            icon={Icons.Chart} 
            colorClass="text-emerald-600 dark:text-emerald-400"
            bgLight="bg-emerald-50" bgDark="bg-emerald-500/10"
            textClass="text-emerald-600 dark:text-emerald-400"
            onClick={() => navigate('/admin/accounts')}
            extraContent={
              <div className="h-1 w-full rounded-full bg-emerald-100 dark:bg-emerald-900/30 overflow-hidden mt-2">
                <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1, delay: 0.5 }} className="h-full bg-emerald-500" />
              </div>
            }
          />
          
          <StatCard 
            title="Active Coaches" 
            value={safeMetrics.active_coach_count ?? 0} 
            icon={Icons.Whistle} 
            colorClass="text-indigo-600 dark:text-indigo-400"
            bgLight="bg-indigo-50" bgDark="bg-indigo-500/10"
            textClass="text-gray-900 dark:text-white"
            onClick={() => navigate('/admin/coaches')}
          />

          <StatCard 
            title="Active Students" 
            value={safeMetrics.active_student_count ?? 0} 
            icon={Icons.Players} 
            colorClass="text-blue-600 dark:text-blue-400"
            bgLight="bg-blue-50" bgDark="bg-blue-500/10"
            textClass="text-gray-900 dark:text-white"
            onClick={() => navigate('/admin/students')}
          />

          <StatCard 
            title="Total Batches" 
            value={safeMetrics.total_batches ?? 0} 
            icon={Icons.Stopwatch} 
            colorClass="text-cyan-600 dark:text-cyan-400"
            bgLight="bg-cyan-50" bgDark="bg-cyan-500/10"
            textClass="text-gray-900 dark:text-white"
            onClick={() => navigate('/admin/batches')}
          />

          <StatCard 
            title="Paid Students" 
            value={summary.paid_students ?? 0} 
            icon={Icons.CheckBadge} 
            colorClass="text-teal-600 dark:text-teal-400"
            bgLight="bg-teal-50" bgDark="bg-teal-500/10"
            textClass="text-teal-600 dark:text-teal-400"
            onClick={() => navigate('/admin/students?status=paid')}
          />

          <StatCard 
            title="Unpaid Students" 
            value={summary.unpaid_students ?? 0} 
            icon={Icons.RedCard} 
            colorClass="text-rose-600 dark:text-rose-400"
            bgLight="bg-rose-50" bgDark="bg-rose-500/10"
            textClass="text-rose-600 dark:text-rose-400"
            onClick={() => navigate('/admin/students?status=unpaid')}
            extraContent={
               summary.unpaid_students > 0 && (
                <motion.span 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, repeat: Infinity, repeatType: "reverse", duration: 1.5 }}
                  className="text-[0.65rem] font-bold text-rose-500 uppercase tracking-widest"
                >
                  Action Required
                </motion.span>
              )
            }
          />

          <StatCard 
            title="Pending Dues" 
            value={formatCurrency(safeMetrics.pending_dues ?? 0)} 
            icon={Icons.RedCard} 
            colorClass="text-orange-600 dark:text-orange-400"
            bgLight="bg-orange-50" bgDark="bg-orange-500/10"
            textClass="text-orange-600 dark:text-orange-400"
          />

          <StatCard 
            title="Performance Scores" 
            value={safeMetrics.performance_scores_count ?? 0} 
            icon={Icons.Star} 
            colorClass="text-fuchsia-600 dark:text-fuchsia-400"
            bgLight="bg-fuchsia-50" bgDark="bg-fuchsia-500/10"
            textClass="text-fuchsia-600 dark:text-fuchsia-400"
          />

          <StatCard 
            title="Daily Notes" 
            value={safeMetrics.daily_notes_count ?? 0} 
            icon={Icons.TacticsBoard} 
            colorClass="text-sky-600 dark:text-sky-400"
            bgLight="bg-sky-50" bgDark="bg-sky-500/10"
            textClass="text-sky-600 dark:text-sky-400"
          />

          <StatCard 
            title="This Month Revenue" 
            value={formatCurrency(safeMetrics.monthly_revenue ?? 0)} 
            icon={Icons.Chart} 
            colorClass="text-emerald-500 dark:text-emerald-400"
            bgLight="bg-emerald-50" bgDark="bg-emerald-500/10"
            textClass="text-emerald-600 dark:text-emerald-400"
            onClick={() => navigate('/admin/accounts')}
          />

          <StatCard 
            title="This M. Attendance" 
            value={safeMetrics.monthly_attendance ?? 0} 
            icon={Icons.CalendarCheck} 
            colorClass="text-emerald-500 dark:text-emerald-400"
            bgLight="bg-emerald-50" bgDark="bg-emerald-500/10"
            textClass="text-gray-900 dark:text-white"
          />
        </motion.div>

        {/* Animated Workspace Info Panel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, type: 'spring' }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 p-8 shadow-xl shadow-emerald-900/20"
        >
          {/* Decorative Background Elements */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
            className="absolute -right-20 -top-40 text-white/5"
          >
            <Icons.TacticsBoard className="h-96 w-96" />
          </motion.div>
          <div className="absolute left-0 top-0 h-full w-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 10 }}
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/10 shadow-inner"
            >
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
            </motion.div>
            <div>
              <h3 className="text-xl font-black text-white tracking-wide">Workspace Overview</h3>
              <p className="mt-2 max-w-4xl text-sm font-medium leading-relaxed text-emerald-50">
                Revenue sums reflect completed payments across your academy boundary. Coach and student
                metrics display live operational records, excluding soft-deleted archives, giving you real-time oversight.
              </p>
            </div>
          </div>
        </motion.div>
        
      </div>
    </div>
  );
}