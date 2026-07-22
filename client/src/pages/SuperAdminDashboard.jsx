import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  superAdminGet, 
  clearSuperAdminToken 
} from '../api/client';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { 
  Building, Users, Trophy, DollarSign, Calendar, AlertTriangle, 
  TrendingUp, RefreshCw, Layers, ShieldAlert, Sparkles, Loader2 
} from 'lucide-react';

const COLORS = ['#84cc16', '#06b6d4', '#ec4899', '#f59e0b', '#3b82f6'];

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
        <Loader2 className="h-10 w-10 animate-spin text-lime-400" />
        <p className="text-slate-400 text-sm font-semibold">Generating SaaS insights...</p>
      </div>
    );
  }

  // Dashboard metric card configurations
  const metricCards = [
    { label: 'Total Academies', value: stats?.total_academies || 0, icon: Building, color: 'text-blue-400 bg-blue-500/10 border-blue-500/15' },
    { label: 'Active Academies', value: stats?.active_academies || 0, icon: ShieldAlert, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/15' },
    { label: 'Suspended Academies', value: stats?.inactive_academies || 0, icon: AlertTriangle, color: 'text-red-400 bg-red-500/10 border-red-500/15' },
    { label: 'Total Students', value: stats?.total_students || 0, icon: Users, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/15' },
    { label: 'Total Coaches', value: stats?.total_coaches || 0, icon: Trophy, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/15' },
    { label: 'Total SaaS Revenue', value: `₹${stats?.platform_revenue || 0}`, icon: DollarSign, color: 'text-lime-400 bg-lime-500/10 border-lime-500/15' },
    { label: 'Active Trial Users', value: stats?.active_trials || 0, icon: Sparkles, color: 'text-purple-400 bg-purple-500/10 border-purple-500/15' },
    { label: 'Expired Plan Users', value: stats?.expired_plans || 0, icon: ShieldAlert, color: 'text-rose-450 bg-rose-500/10 border-rose-500/15' },
    { label: 'Upcoming Renewals', value: stats?.upcoming_renewals || 0, icon: Calendar, color: 'text-amber-400 bg-amber-500/10 border-amber-500/15' },
    { label: 'Monthly Revenue', value: `₹${stats?.monthly_revenue || 0}`, icon: DollarSign, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/15' },
    { label: 'New Sign-ups (30d)', value: stats?.new_registrations || 0, icon: TrendingUp, color: 'text-teal-400 bg-teal-500/10 border-teal-500/15' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto w-full overflow-x-hidden">
      
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Platform Command Center</h1>
          <p className="text-slate-400 mt-1 text-sm">Enterprise overview metrics, payment collections, and subscription configurations control.</p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchDashboardData();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 rounded-xl hover:bg-slate-700 border border-slate-700/60 font-semibold transition-all hover:text-white"
        >
          <RefreshCw className="h-4 w-4" />
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
              className={`p-4 bg-slate-900/50 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-slate-750 hover:bg-slate-900/70 transition-all ${
                idx === 5 ? 'col-span-2 md:col-span-1 lg:col-span-1 xl:col-span-2 bg-gradient-to-r from-emerald-950/20 via-slate-900 to-lime-950/20' : ''
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider leading-none">
                  {card.label}
                </span>
                <div className={`p-2 rounded-lg border ${card.color} shrink-0`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-xl font-extrabold text-white block tracking-tight">
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
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 p-6 rounded-2xl backdrop-blur-md space-y-4">
          <div>
            <h3 className="font-extrabold text-white text-base">Monthly Revenue Trend</h3>
            <p className="text-slate-400 text-xs mt-0.5">Recurring subscription collections for the past 6 months.</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.revenue_trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#84cc16" strokeWidth={3} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plan Distribution Pie Chart */}
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl backdrop-blur-md space-y-4">
          <div>
            <h3 className="font-extrabold text-white text-base">Plan Distribution</h3>
            <p className="text-slate-400 text-xs mt-0.5">Distribution of academies across plans.</p>
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
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500">No active plans distributed yet</p>
            )}
          </div>
          {/* Custom Legends */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center text-xs">
            {stats?.plan_distribution?.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-slate-400 font-semibold">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Subscription Tier Distribution */}
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl backdrop-blur-md space-y-4">
          <div>
            <h3 className="font-extrabold text-white text-base">Tier Distribution</h3>
            <p className="text-slate-400 text-xs mt-0.5">Distribution across standard Free, Pro, and Plus tiers.</p>
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
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500">No tier distribution data yet</p>
            )}
          </div>
          {/* Custom Legends */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center text-xs">
            {stats?.subscription_distribution?.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[(idx + 2) % COLORS.length] }} />
                <span className="text-slate-400 font-semibold">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Academy Growth Over Time Area Chart */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 p-6 rounded-2xl backdrop-blur-md space-y-4">
          <div>
            <h3 className="font-extrabold text-white text-base">Academy Registration Growth</h3>
            <p className="text-slate-400 text-xs mt-0.5">Cumulative registered academies growth curves.</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.academy_growth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                />
                <Area type="monotone" dataKey="academies" stroke="#06b6d4" fill="rgba(6,182,212,0.1)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Lists Section: Recent Registrations, Payments, Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Registrations */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl backdrop-blur-md space-y-4 lg:col-span-1">
          <div>
            <h3 className="font-extrabold text-white text-sm">Recent Academy Sign-ups</h3>
            <p className="text-slate-450 text-[11px] mt-0.5">Latest registrations onboarded onto the platform.</p>
          </div>
          <div className="space-y-3">
            {(!stats?.recent_registrations || stats.recent_registrations.length === 0) ? (
              <p className="text-xs text-slate-500 py-4 text-center">No signups registered yet.</p>
            ) : (
              stats.recent_registrations.map((academy, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-950/40 border border-slate-850 p-3 rounded-xl gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-white text-xs truncate">{academy.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{academy.owner_name} ({academy.email})</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 font-semibold">
                    {new Date(academy.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl backdrop-blur-md space-y-4 lg:col-span-1">
          <div>
            <h3 className="font-extrabold text-white text-sm">Recent Platform Payments</h3>
            <p className="text-slate-450 text-[11px] mt-0.5">Recent billing ledger checkouts.</p>
          </div>
          <div className="space-y-3">
            {(!stats?.recent_payments || stats.recent_payments.length === 0) ? (
              <p className="text-xs text-slate-500 py-4 text-center">No payment log requests submitted yet.</p>
            ) : (
              stats.recent_payments.map((tx, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-950/40 border border-slate-850 p-3 rounded-xl gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate text-xs">{tx.academy_name}</p>
                    <p className="text-[9px] text-slate-500 truncate">UTR: {tx.transaction_id || 'N/A'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-extrabold text-lime-400 text-xs">₹{tx.amount}</p>
                    <span className={`text-[9px] font-bold uppercase ${
                      tx.status === 'COMPLETED' ? 'text-emerald-400' :
                      tx.status === 'PENDING' ? 'text-amber-400' :
                      'text-red-400'
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
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl backdrop-blur-md space-y-4 lg:col-span-1">
          <div>
            <h3 className="font-extrabold text-white text-sm">System Audit Activity</h3>
            <p className="text-slate-450 text-[11px] mt-0.5">Logs of administrative changes recorded.</p>
          </div>
          <div className="space-y-3 max-h-[280px] overflow-y-auto [&::-webkit-scrollbar]:hidden">
            {(!stats?.recent_activity || stats.recent_activity.length === 0) ? (
              <p className="text-xs text-slate-500 py-4 text-center">No platform operations logs recorded yet.</p>
            ) : (
              stats.recent_activity.map((log, idx) => (
                <div key={idx} className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400">
                    <span className="text-lime-400">{log.action}</span>
                    <span>{new Date(log.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Actor: {log.actor_type} (ID: {log.actor_id})
                  </p>
                  {log.ip_address && (
                    <p className="text-[9px] text-slate-550">IP: {log.ip_address}</p>
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
