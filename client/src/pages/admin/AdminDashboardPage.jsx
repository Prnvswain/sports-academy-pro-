import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, ShieldAlert } from 'lucide-react';
import Loader from '../../components/Loader';
import { adminGet } from '../../api/client';

function formatCurrency(value) {
  const num = parseFloat(value);
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return '₹0.00';
  }
  return `₹${num.toFixed(2)}`;
}

// Custom Sports & SaaS Premium Icons with Framer Motion integrations
const Icons = {
  Trophy: (props) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.388c0-.597.237-1.17.659-1.591l2.965-2.965a2.25 2.25 0 0 0 0-3.182l-.659-.659c-.422-.421-1.036-.586-1.615-.44a6.974 6.974 0 0 0-3.328 1.956c-.456.455-1.134.618-1.748.423a6.976 6.976 0 0 0-4.041-3.125 1.5 1.5 0 0 0-1.892 1.893 6.976 6.976 0 0 0 3.125 4.04c.195.615.032 1.293-.423 1.749A6.974 6.974 0 0 0 4.14 14.1c-.146.58.02 1.193.44 1.615l.659.659a2.25 2.25 0 0 0 3.182 0l2.965 2.965c.421.42.659.994.659 1.591v3.388Z" />
    </svg>
  ),
  Whistle: (props) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m12 0a6.002 6.002 0 0 0-5.183-5.949V3.75a.75.75 0 1 0-1.5 0v3.051A6.002 6.002 0 0 0 6 11.25v1.5m12 0h-3m-9 0H3m12 0c0 .966-.316 1.857-.847 2.573m-10.306 0A4.502 4.502 0 0 1 6 12.75v-1.5c0-.966.316-1.857.847-2.573M15.75 11.25c0-.966-.316-1.857-.847-2.573" />
    </svg>
  ),
  Players: (props) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
  ),
  Stopwatch: (props) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 3h3m-1.5 0v1.5m6.728 2.772-1.06-1.06" />
    </svg>
  ),
  CheckBadge: (props) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296Z" />
    </svg>
  ),
  RedCard: (props) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3Z" />
    </svg>
  ),
  CalendarCheck: (props) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75" />
    </svg>
  ),
  Star: (props) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.563.563 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.563.563 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
    </svg>
  ),
  TacticsBoard: (props) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
    </svg>
  ),
  Chart: (props) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
    </svg>
  )
};

export default function AnalyticsPanel() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [academy, setAcademy] = useState(null);
  const [logoError, setLogoError] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedAcademyName, setImpersonatedAcademyName] = useState('');

  useEffect(() => {
    // Check if user is impersonating
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
        paused_student_count: data.paused_student_count ?? 0,
        inactive_student_count: data.inactive_student_count ?? 0,
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
        total_revenue: 0, active_coach_count: 0, active_student_count: 0, paused_student_count: 0,
        inactive_student_count: 0, total_batches: 0, attendance_percent: 0,
        payment_summary: { paid_students: 0, unpaid_students: 0 }, pending_dues: 0,
        performance_scores_count: 0, daily_notes_count: 0, monthly_revenue: 0, monthly_attendance: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Load active batch sessions
  useEffect(() => {
    const loadActiveSessions = async () => {
      try {
        setSessionsLoading(true);
        const result = await adminGet('/admin/batch-sessions');
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

  useEffect(() => {
    const fetchAcademy = async () => {
      try {
        const response = await adminGet('/admin/academy');
        const academyData = response?.data || response;
        setAcademy(academyData || null);
        setLogoError(false);
      } catch (error) {
        console.error('Failed to fetch academy details:', error);
      }
    };
    fetchAcademy();

    const handleSettingsUpdate = () => { fetchAcademy(); };
    window.addEventListener('academySettingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('academySettingsUpdated', handleSettingsUpdate);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-transparent">
        <Loader message="Loading academy analytics…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-transparent p-3">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-red-50 max-w-md text-center p-6 rounded-[16px] shadow-[0_8px_20px_rgba(220,38,38,0.08)]"
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF5F5] ring-4 ring-red-50">
            <Icons.RedCard className="h-5 w-5 text-[#DC2626]" />
          </div>
          <h3 className="mb-1 text-lg font-black text-slate-900 tracking-tight">Foul Play! (Error)</h3>
          <p className="mb-5 text-xs font-semibold text-slate-500">{error}</p>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" className="w-full bg-gradient-to-b from-[#EF4444] to-[#DC2626] text-white font-bold py-2.5 rounded-xl text-sm shadow-[0_4px_12px_rgba(220,38,38,0.2)]" onClick={loadAnalytics}>
            Retry Connection
          </motion.button>
        </motion.div>
      </div>
    );
  }

  const safeMetrics = metrics || {};
  const summary = safeMetrics.payment_summary || { paid_students: 0, unpaid_students: 0 };
  const totalStudents = (summary.paid_students || 0) + (summary.unpaid_students || 0);
  const paidPercentage = totalStudents > 0 ? ((summary.paid_students / totalStudents) * 100).toFixed(1) : 0;
  const unpaidPercentage = totalStudents > 0 ? ((summary.unpaid_students / totalStudents) * 100).toFixed(1) : 0;

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
  const itemVariants = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 450, damping: 30 } } };

  // Refined Premium StatCard (Compact, Perfect Colors, Crisp Shadows)
  const StatCard = ({ title, value, icon: Icon, cardBg, iconBgClass, iconTextClass, onClick, extraContent }) => {
    const isClickable = !!onClick;
    return (
      <motion.div
        variants={itemVariants}
        onClick={onClick}
        whileHover={isClickable ? { y: -2, scale: 1.01 } : { y: -1 }}
        style={{ backgroundColor: cardBg }}
        className={`rounded-[16px] p-3.5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 ease-out border border-black/[0.03] shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] ${isClickable ? 'cursor-pointer' : ''}`}
      >
        <div className="flex items-start justify-between w-full">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500/80 block">{title}</span>
            <span className="text-xl font-black tracking-tighter text-slate-800 block">{value}</span>
          </div>
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconBgClass} border border-white/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]`}>
            <Icon className={`h-5 w-5 ${iconTextClass}`} />
          </div>
        </div>
        {extraContent && <div className="w-full mt-3">{extraContent}</div>}
      </motion.div>
    );
  };

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
      
      {/* Top Bar Header (Perfectly Compact, Professional Gradient) */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="bg-white rounded-[16px] p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-[0_4px_16px_rgba(0,0,0,0.03)] border border-black/[0.04] relative overflow-hidden"
      >
        {/* Subtle right-aligned sports gradient texture */}
        <div className="absolute right-0 top-0 bottom-0 w-72 bg-gradient-to-l from-[#84D400]/[0.08] to-transparent pointer-events-none" />
        <div className="absolute -right-6 -top-6 opacity-[0.03] pointer-events-none rotate-12">
            <Icons.Trophy className="w-40 h-40 text-black" />
        </div>
        
        <div className="flex items-center gap-3 z-10">
          {academy?.logo_url && !logoError ? (
            <img key={academy.logo_url} src={`${academy.logo_url}?t=${Date.now()}`} alt="Logo" className="h-10 w-10 rounded-xl border border-slate-100 object-cover shadow-sm" onError={() => setLogoError(true)} />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#84D400] to-[#58B000] text-white shadow-md shadow-[#84D400]/20"><Icons.Trophy className="h-5 w-5" /></div>
          )}
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#58B000] to-[#10B981]">{academy?.name || 'Academy'}</span> 👋
            </h2>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Track your academy progress</p>
          </div>
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.02 }} 
          whileTap={{ scale: 0.98 }} 
          type="button" 
          onClick={loadAnalytics} 
          className="z-10 bg-gradient-to-b from-[#84D400] to-[#6FB000] border border-[#58B000]/20 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-[0_4px_12px_rgba(132,212,0,0.25)] flex items-center gap-2 self-start sm:self-center"
        >
          <svg className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Sync Runtime
        </motion.button>
      </motion.div>

      {/* Visual Distributions Panel (Compact & Refined) */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        <div className="bg-white rounded-[16px] p-3.5 shadow-[0_4px_16px_rgba(0,0,0,0.03)] border border-black/[0.04] flex flex-col justify-center">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fee Allocation Mix</h3>
            <span className="bg-slate-50 border border-slate-100/60 px-2 py-0.5 text-[10px] font-bold rounded-md text-slate-600">Total: {totalStudents}</span>
          </div>
          <div className="relative flex h-3.5 w-full overflow-hidden rounded-full bg-slate-100/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
            <motion.div initial={{ width: 0 }} animate={{ width: `${paidPercentage}%` }} transition={{ duration: 1 }} className="h-full bg-gradient-to-r from-[#10B981] to-[#34D399]" />
            <motion.div initial={{ width: 0 }} animate={{ width: `${unpaidPercentage}%` }} transition={{ duration: 1, delay: 0.1 }} className="h-full bg-gradient-to-r from-[#EF4444] to-[#F87171]" />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] font-bold tracking-tight">
            <span className="text-[#059669] flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></div>Paid ({paidPercentage}%)</span>
            <span className="text-[#DC2626] flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#EF4444]"></div>Unpaid ({unpaidPercentage}%)</span>
          </div>
        </div>

        <div className="bg-white rounded-[16px] p-3.5 shadow-[0_4px_16px_rgba(0,0,0,0.03)] border border-black/[0.04] flex flex-col justify-center">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Academy Attendance Pulse</h3>
            <span className="bg-[#84D400]/10 text-[#58B000] px-2 py-0.5 text-[10px] font-bold rounded-md">30-Day Cycle</span>
          </div>
          <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-slate-100/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
            <motion.div initial={{ width: 0 }} animate={{ width: `${safeMetrics.attendance_percent ?? 0}%` }} transition={{ type: "spring", stiffness: 200 }} className="h-full bg-gradient-to-r from-[#84D400] to-[#58B000]" />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] font-bold text-slate-400 tracking-tight">
            <span>0%</span>
            <span className="text-[#58B000] font-black">{safeMetrics.attendance_percent ?? 0}% Live Attendance</span>
            <span>Optimal</span>
          </div>
        </div>
      </motion.div>

      {/* Grid Layout Cards (Precise Tints, Compact Sizes Preserved exactly) */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
        
        <StatCard 
          title="Total Revenue" value={formatCurrency(safeMetrics.total_revenue)} icon={Icons.Chart} 
          cardBg="#F4FDF4" iconBgClass="bg-[#DCFCE7]" iconTextClass="text-[#16A34A]"
          onClick={() => navigate('/admin/accounts')}
          extraContent={
            <div className="h-1 w-full bg-white/60 rounded-full overflow-hidden"><div className="h-full bg-[#16A34A] w-full" /></div>
          }
        />

        <StatCard 
          title="Active Coaches" value={safeMetrics.active_coach_count ?? 0} icon={Icons.Whistle} 
          cardBg="#F5FAFF" iconBgClass="bg-[#DBEAFE]" iconTextClass="text-[#2563EB]"
          onClick={() => navigate('/admin/coaches')}
        />

        <StatCard 
          title="Active Students" value={safeMetrics.active_student_count ?? 0} icon={Icons.Players} 
          cardBg="#F9F5FF" iconBgClass="bg-[#F3E8FF]" iconTextClass="text-[#9333EA]"
          onClick={() => navigate('/admin/students')}
        />

        <StatCard 
          title="Paused Students" value={safeMetrics.paused_student_count ?? 0} icon={Icons.Stopwatch} 
          cardBg="#F8FAFC" iconBgClass="bg-[#E2E8F0]" iconTextClass="text-[#475569]"
          onClick={() => navigate('/admin/students')}
        />

        <StatCard 
          title="Inactive Students" value={safeMetrics.inactive_student_count ?? 0} icon={Icons.RedCard} 
          cardBg="#FFF5F5" iconBgClass="bg-[#FEE2E2]" iconTextClass="text-[#DC2626]"
          onClick={() => navigate('/admin/students')}
        />

        <StatCard 
          title="Total Batches" value={safeMetrics.total_batches ?? 0} icon={Icons.Stopwatch} 
          cardBg="#F0FDFA" iconBgClass="bg-[#CCFBF1]" iconTextClass="text-[#0D9488]"
          onClick={() => navigate('/admin/batches')}
        />

        <StatCard 
          title="Live Sessions" value={activeSessions.filter(s => s.status === 'LIVE').length ?? 0} icon={Icons.Whistle} 
          borderClass="border-red-200 dark:border-red-900/40" bgClass="bg-red-50 dark:bg-red-500/10" textClass="text-red-600 dark:text-red-400"
          onClick={() => navigate('/admin/batches')}
          extraContent={activeSessions.filter(s => s.status === 'LIVE').length > 0 && <span className="text-[9px] font-black text-red-500 uppercase tracking-wider animate-pulse block">Active Now</span>}
        />

        <StatCard 
          title="Paid Accounts" value={summary.paid_students ?? 0} icon={Icons.CheckBadge} 
          cardBg="#F5F7FF" iconBgClass="bg-[#E0E7FF]" iconTextClass="text-[#4F46E5]"
          onClick={() => navigate('/admin/students?status=paid')}
        />

        <StatCard 
          title="Unpaid Accounts" value={summary.unpaid_students ?? 0} icon={Icons.RedCard} 
          cardBg="#FFF5F5" iconBgClass="bg-[#FEE2E2]" iconTextClass="text-[#DC2626]"
          onClick={() => navigate('/admin/students?status=unpaid')}
          extraContent={summary.unpaid_students > 0 && <span className="text-[9px] font-black text-[#DC2626] uppercase tracking-wider animate-pulse block">Review Pipeline</span>}
        />

        <StatCard 
          title="Pending Dues" value={formatCurrency(safeMetrics.pending_dues ?? 0)} icon={Icons.RedCard} 
          cardBg="#FFF9F2" iconBgClass="bg-[#FFEDD5]" iconTextClass="text-[#EA580C]"
        />

        <StatCard 
          title="Evaluations Log" value={safeMetrics.performance_scores_count ?? 0} icon={Icons.Star} 
          cardBg="#F5F7FF" iconBgClass="bg-[#E0E7FF]" iconTextClass="text-[#4F46E5]"
        />

        <StatCard 
          title="Daily Notes" value={safeMetrics.daily_notes_count ?? 0} icon={Icons.TacticsBoard} 
          cardBg="#F8FAFC" iconBgClass="bg-[#E2E8F0]" iconTextClass="text-[#475569]"
        />

        <StatCard 
          title="Monthly Revenue" value={formatCurrency(safeMetrics.monthly_revenue ?? 0)} icon={Icons.Chart} 
          cardBg="#F4FDF4" iconBgClass="bg-[#DCFCE7]" iconTextClass="text-[#16A34A]"
          onClick={() => navigate('/admin/accounts')}
        />

        <StatCard 
          title="Monthly Attendance" value={safeMetrics.monthly_attendance ?? 0} icon={Icons.CalendarCheck} 
          cardBg="#F2FCF5" iconBgClass="bg-[#D1FAE5]" iconTextClass="text-[#059669]"
        />
      </motion.div>
    </div>
  );
}