import { useCallback, useEffect, useState, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, ShieldAlert, DollarSign, Wallet, Users, Clock, ArrowUpRight } from 'lucide-react';
import Loader from '../../components/Loader';
import { adminGet } from '../../api/client';

function formatCurrency(value) {
  const num = parseFloat(value);
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return '₹0.00';
  }
  return `₹${num.toFixed(2)}`;
}

export default function AnalyticsPanel() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [academy, setAcademy] = useState(null);
  const [logoError, setLogoError] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedAcademyName, setImpersonatedAcademyName] = useState('');

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

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await adminGet('/admin/analytics');
      const data = result?.data || {};
      setMetrics({
        total_collection: data.total_collection ?? 0,
        pending_fees: data.pending_fees ?? 0,
        students_with_pending_fees: data.students_with_pending_fees ?? 0,
        todays_collection: data.todays_collection ?? 0,
        recent_payments: data.recent_payments || [],
        monthly_collection_chart: data.monthly_collection_chart || [],
      });
    } catch (err) {
      setError(err.message || 'Failed to communicate with analytics backend.');
      setMetrics({
        total_collection: 0,
        pending_fees: 0,
        students_with_pending_fees: 0,
        todays_collection: 0,
        recent_payments: [],
        monthly_collection_chart: [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

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
      <div className="flex min-h-[60vh] items-center justify-center bg-transparent p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-border max-w-md text-center p-6 rounded-2xl shadow-md"
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950">
            <ShieldAlert className="h-6 w-6 text-red-500" />
          </div>
          <h3 className="mb-1 text-lg font-black text-foreground">Error</h3>
          <p className="mb-5 text-xs font-semibold text-muted-foreground">{error}</p>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" className="w-full bg-red-500 text-white font-bold py-2.5 rounded-xl text-sm" onClick={loadAnalytics}>
            Retry Connection
          </motion.button>
        </motion.div>
      </div>
    );
  }

  const safeMetrics = metrics || {};
  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
  const itemVariants = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 28 } } };

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
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          {academy?.logo_url && !logoError ? (
            <img key={academy.logo_url} src={`${academy.logo_url}?t=${Date.now()}`} alt="Logo" className="h-11 w-11 rounded-xl border border-border object-cover" onError={() => setLogoError(true)} />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md"><DollarSign className="h-5 w-5" /></div>
          )}
          <div>
            <h2 className="text-xl font-black text-foreground tracking-tight">{academy?.name || 'Academy'} Analytics</h2>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Academy Management Portal</p>
          </div>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={loadAnalytics} className="bg-surface border border-border text-foreground hover:bg-surface-secondary px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 self-start sm:self-center">
          <svg className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Sync Data
        </motion.button>
      </motion.div>

      {/* Metrics Cards */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Collection */}
        <motion.div
          variants={itemVariants}
          onClick={() => navigate('/admin/accounts')}
          whileHover={{ y: -3, scale: 1.01 }}
          className="bg-card border border-emerald-250 dark:border-emerald-900/40 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden transition-all shadow-sm cursor-pointer"
        >
          <div className="flex items-start justify-between w-full">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 block">Total Collection</span>
              <span className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 block">{formatCurrency(safeMetrics.total_collection)}</span>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 shadow-inner">
              <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </motion.div>

        {/* Pending Fees */}
        <motion.div
          variants={itemVariants}
          onClick={() => navigate('/admin/accounts')}
          whileHover={{ y: -3, scale: 1.01 }}
          className="bg-card border border-rose-250 dark:border-rose-900/40 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden transition-all shadow-sm cursor-pointer"
        >
          <div className="flex items-start justify-between w-full">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 block">Pending Fees</span>
              <span className="text-2xl font-black tracking-tight text-rose-605 dark:text-rose-400 block">{formatCurrency(safeMetrics.pending_fees)}</span>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 shadow-inner">
              <Wallet className="h-5 w-5 text-rose-600 dark:text-rose-450" />
            </div>
          </div>
        </motion.div>

        {/* Students with Pending Fees */}
        <motion.div
          variants={itemVariants}
          onClick={() => navigate('/admin/students')}
          whileHover={{ y: -3, scale: 1.01 }}
          className="bg-card border border-amber-250 dark:border-amber-900/40 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden transition-all shadow-sm cursor-pointer"
        >
          <div className="flex items-start justify-between w-full">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 block">Students with Pending Fees</span>
              <span className="text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400 block">{safeMetrics.students_with_pending_fees}</span>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 shadow-inner">
              <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </motion.div>

        {/* Today's Collection */}
        <motion.div
          variants={itemVariants}
          onClick={() => navigate('/admin/accounts')}
          whileHover={{ y: -3, scale: 1.01 }}
          className="bg-card border border-blue-250 dark:border-blue-900/40 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden transition-all shadow-sm cursor-pointer"
        >
          <div className="flex items-start justify-between w-full">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 block">Today's Collection</span>
              <span className="text-2xl font-black tracking-tight text-blue-600 dark:text-blue-400 block">{formatCurrency(safeMetrics.todays_collection)}</span>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 shadow-inner">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </motion.div>

      </motion.div>

      {/* Charts and Lists Grid */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Monthly Collection Chart */}
        <div className="card p-6 bg-gradient-to-br from-card to-card/50 border border-border rounded-2xl shadow-sm flex flex-col justify-between h-full">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Monthly Collection Trend</h3>
            <div className="flex items-end justify-between gap-4 h-48 pt-4 border-b border-slate-100 dark:border-slate-800 pb-2">
              {safeMetrics.monthly_collection_chart?.map((item, index) => {
                const maxAmount = Math.max(...safeMetrics.monthly_collection_chart.map(c => c.amount), 1);
                const heightPercent = Math.min(100, Math.round((item.amount / maxAmount) * 100));
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <div className="text-[9px] font-black text-slate-700 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      ₹{item.amount.toFixed(0)}
                    </div>
                    <div 
                      style={{ height: `${Math.max(4, heightPercent)}%` }} 
                      className="w-full bg-primary/20 group-hover:bg-primary rounded-t-lg transition-all duration-500 shadow-sm"
                    />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.month}</span>
                  </div>
                );
              })}
              {(!safeMetrics.monthly_collection_chart || safeMetrics.monthly_collection_chart.length === 0) && (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground font-medium">
                  No monthly records cataloged yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="card p-6 bg-gradient-to-br from-card to-card/50 border border-border rounded-2xl shadow-sm h-full flex flex-col">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5">
            Recent Payments <ArrowUpRight className="w-4 h-4 text-emerald-555" />
          </h3>
          <div className="space-y-3 overflow-y-auto max-h-48 pr-1 flex-1">
            {safeMetrics.recent_payments?.map((payment, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                <div>
                  <span className="text-sm font-extrabold text-foreground block">{payment.student?.name || 'Student'}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{payment.method} • {new Date(payment.payment_date).toLocaleDateString()}</span>
                </div>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  + {formatCurrency(payment.amount)}
                </span>
              </div>
            ))}
            {(!safeMetrics.recent_payments || safeMetrics.recent_payments.length === 0) && (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground font-medium py-12">
                No payments recorded in this cycle
              </div>
            )}
          </div>
        </div>

      </motion.div>
    </div>
  );
}