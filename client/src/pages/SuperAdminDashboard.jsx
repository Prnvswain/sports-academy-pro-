import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  superAdminGet, 
  clearSuperAdminToken 
} from '../api/client';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  Building, Users, Trophy, DollarSign, Calendar, AlertTriangle, 
  TrendingUp, RefreshCw, ShieldAlert, Sparkles, Loader2, Cpu, Activity
} from 'lucide-react';

const COLORS = ['#8B5CF6', '#06B6D4', '#EC4899', '#F59E0B', '#3B82F6', '#10B981'];

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const response = await superAdminGet('/super-admin/stats');
      if (response?.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
      if (err.status === 401) {
        clearSuperAdminToken();
        navigate('/super-admin-login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] py-20 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
        <p className="text-muted-foreground text-sm font-bold tracking-wide animate-pulse">Generating Premium Insights...</p>
      </div>
    );
  }

  // Dashboard metric card configurations with premium gradients mapping
  const metricCards = [
    { label: 'Total Academies', value: stats?.total_academies || 0, icon: Building, color: 'text-white premium-gradient-purple' },
    { label: 'Active Academies', value: stats?.active_academies || 0, icon: ShieldAlert, color: 'text-white premium-gradient-emerald' },
    { label: 'Suspended Academies', value: stats?.inactive_academies || 0, icon: AlertTriangle, color: 'text-white bg-rose-500' },
    { label: 'Total Students', value: stats?.total_students || 0, icon: Users, color: 'text-white premium-gradient-cyan' },
    { label: 'Total Coaches', value: stats?.total_coaches || 0, icon: Trophy, color: 'text-white premium-gradient-orange' },
    { label: 'Total SaaS Revenue', value: `₹${stats?.platform_revenue || 0}`, icon: DollarSign, color: 'text-white premium-gradient-purple' },
    { label: 'Active Trial Users', value: stats?.active_trials || 0, icon: Sparkles, color: 'text-white premium-gradient-cyan' },
    { label: 'Expired Plan Users', value: stats?.expired_plans || 0, icon: ShieldAlert, color: 'text-white bg-rose-500' },
    { label: 'Upcoming Renewals', value: stats?.upcoming_renewals || 0, icon: Calendar, color: 'text-white premium-gradient-orange' },
    { label: 'Monthly Revenue', value: `₹${stats?.monthly_revenue || 0}`, icon: DollarSign, color: 'text-white premium-gradient-emerald' },
    { label: 'New Sign-ups (30d)', value: stats?.new_registrations || 0, icon: TrendingUp, color: 'text-white premium-gradient-purple' },
    { label: 'System Health Status', value: '100% OK', icon: Activity, color: 'text-white premium-gradient-emerald' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full overflow-x-hidden">
      
      {/* Welcome Banner */}
      <div className="super-glass p-6 rounded-2xl border border-white/10 dark:border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <span className="premium-gradient-purple text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full tracking-widest shadow-lg shadow-purple-500/20">
            SaaS Control Panel
          </span>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight mt-2">Platform Command Center</h1>
          <p className="text-muted-foreground text-xs font-semibold">Enterprise overview metrics, payment collections, and subscription configurations control.</p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchDashboardData();
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white dark:bg-white dark:text-slate-950 rounded-xl hover:opacity-90 font-bold text-xs shadow-lg shadow-black/10 transition-all"
        >
          <RefreshCw className="h-4 w-4 animate-spin-slow" />
          Refresh Stats
        </button>
      </div>

      {/* SaaS Metric Widgets Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {metricCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
              className="super-glass p-4 rounded-2xl border border-white/10 dark:border-white/5 flex flex-col justify-between hover:scale-[1.03] hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300"
            >
              <div className="flex justify-between items-start gap-2">
                <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider leading-none">
                  {card.label}
                </span>
                <div className={`p-2 rounded-xl shrink-0 shadow-md ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-xl font-extrabold text-foreground block tracking-tight">
                  {card.value}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Revenue Trend Line Chart */}
        <div className="lg:col-span-2 super-glass p-6 rounded-2xl border border-white/10 dark:border-white/5 space-y-4 shadow-xl">
          <div>
            <h3 className="font-extrabold text-foreground text-sm">Monthly Revenue Trend</h3>
            <p className="text-muted-foreground text-[11px] font-semibold">Recurring subscription collections for the past 6 months.</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.revenue_trend || []}>
                <defs>
                  <linearGradient id="revenueGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={4} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plan Distribution Pie Chart */}
        <div className="super-glass p-6 rounded-2xl border border-white/10 dark:border-white/5 space-y-4 shadow-xl">
          <div>
            <h3 className="font-extrabold text-foreground text-sm">Plan Distribution</h3>
            <p className="text-muted-foreground text-[11px] font-semibold">Distribution of academies across plans.</p>
          </div>
          <div className="h-56 w-full flex justify-center items-center">
            {stats?.plan_distribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.plan_distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stats.plan_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground font-semibold">No active plans distributed yet</p>
            )}
          </div>
          {/* Custom Legends */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center text-[11px]">
            {stats?.plan_distribution?.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-muted-foreground font-bold">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Subscription Tier Distribution */}
        <div className="super-glass p-6 rounded-2xl border border-white/10 dark:border-white/5 space-y-4 shadow-xl">
          <div>
            <h3 className="font-extrabold text-foreground text-sm">Tier Distribution</h3>
            <p className="text-muted-foreground text-[11px] font-semibold">Distribution across standard Free, Pro, and Plus tiers.</p>
          </div>
          <div className="h-56 w-full flex justify-center items-center">
            {stats?.subscription_distribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.subscription_distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {stats.subscription_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground font-semibold">No tier distribution data yet</p>
            )}
          </div>
          {/* Custom Legends */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center text-[11px]">
            {stats?.subscription_distribution?.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[(idx + 2) % COLORS.length] }} />
                <span className="text-muted-foreground font-bold">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Academy Growth Over Time Area Chart */}
        <div className="lg:col-span-2 super-glass p-6 rounded-2xl border border-white/10 dark:border-white/5 space-y-4 shadow-xl">
          <div>
            <h3 className="font-extrabold text-foreground text-sm">Academy Registration Growth</h3>
            <p className="text-muted-foreground text-[11px] font-semibold">Cumulative registered academies growth curves.</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.academy_growth || []}>
                <defs>
                  <linearGradient id="areaGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}
                />
                <Area type="monotone" dataKey="academies" stroke="#06b6d4" fill="url(#areaGlow)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Lists Section: Recent Registrations, Payments, Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Registrations */}
        <div className="super-glass p-5 rounded-2xl border border-white/10 dark:border-white/5 space-y-4 lg:col-span-1 shadow-xl">
          <div>
            <h3 className="font-extrabold text-foreground text-sm">Recent Academy Sign-ups</h3>
            <p className="text-muted-foreground text-[11px] font-semibold">Latest registrations onboarded onto the platform.</p>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {(!stats?.recent_registrations || stats.recent_registrations.length === 0) ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No signups registered yet.</p>
            ) : (
              stats.recent_registrations.map((academy, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white/5 border border-black/5 dark:border-white/5 p-3 rounded-xl gap-2 shadow-inner hover:scale-[1.01] transition-transform">
                  <div className="min-w-0">
                    <p className="font-extrabold text-foreground text-xs truncate">{academy.name}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold truncate">{academy.owner_name} ({academy.email})</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 font-bold">
                    {new Date(academy.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="super-glass p-5 rounded-2xl border border-white/10 dark:border-white/5 space-y-4 lg:col-span-1 shadow-xl">
          <div>
            <h3 className="font-extrabold text-foreground text-sm">Recent Platform Payments</h3>
            <p className="text-muted-foreground text-[11px] font-semibold">Recent billing ledger checkouts.</p>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {(!stats?.recent_payments || stats.recent_payments.length === 0) ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No payment log requests submitted yet.</p>
            ) : (
              stats.recent_payments.map((tx, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white/5 border border-black/5 dark:border-white/5 p-3 rounded-xl gap-2 text-xs hover:scale-[1.01] transition-transform shadow-inner">
                  <div className="min-w-0">
                    <p className="font-extrabold text-foreground truncate text-xs">{tx.academy_name}</p>
                    <p className="text-[9px] text-muted-foreground font-semibold truncate">UTR: {tx.transaction_id || 'N/A'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-extrabold text-purple-500 dark:text-purple-400 text-xs">₹{tx.amount}</p>
                    <span className={`text-[9px] font-extrabold uppercase ${
                      tx.status === 'COMPLETED' ? 'text-emerald-500' :
                      tx.status === 'PENDING' ? 'text-amber-500' :
                      'text-red-500'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Activity / Audit Logs */}
        <div className="super-glass p-5 rounded-2xl border border-white/10 dark:border-white/5 space-y-4 lg:col-span-1 shadow-xl">
          <div>
            <h3 className="font-extrabold text-foreground text-sm">System Audit Activity</h3>
            <p className="text-muted-foreground text-[11px] font-semibold">Logs of platform administrative modifications.</p>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {(!stats?.recent_activity || stats.recent_activity.length === 0) ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No platform operations logs recorded yet.</p>
            ) : (
              stats.recent_activity.map((log, idx) => (
                <div key={idx} className="bg-white/5 border border-black/5 dark:border-white/5 p-3 rounded-xl space-y-1 text-xs hover:scale-[1.01] transition-transform shadow-inner">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-purple-500 dark:text-purple-450">{log.action}</span>
                    <span className="text-muted-foreground font-bold">{new Date(log.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-muted-foreground font-semibold text-[10px] leading-relaxed">
                    Actor: {log.actor_type} (ID: {log.actor_id})
                  </p>
                  {log.ip_address && (
                    <p className="text-[9px] text-muted-foreground/60 font-medium">IP: {log.ip_address}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
