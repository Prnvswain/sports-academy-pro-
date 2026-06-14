import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { adminGet } from '../api/client';

// Theme Palette Constants
const THEME = {
  background: '#0B0F19',
  card: '#151B26',
  border: '#222C3A',
  textMuted: '#6B7A90',
  textPrimary: '#E2E8F0',
  emerald: '#10B981',
  neon: '#3B82F6',
  glow: 'rgba(16, 185, 129, 0.15)',
  glowNeon: 'rgba(59, 130, 246, 0.15)'
};

// Navigation Items
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'students', label: 'Students', icon: '👥' },
  { id: 'coaches', label: 'Coaches', icon: '🏆' },
  { id: 'sports', label: 'Sports', icon: '⚽' },
  { id: 'batches', label: 'Batches', icon: '📅' },
  { id: 'performance', label: 'Performance', icon: '📈' },
  { id: 'accounts', label: 'Accounts', icon: '💰' },
  { id: 'settings', label: 'Settings', icon: '⚙️' }
];

// Quick Actions
const QUICK_ACTIONS = [
  { id: 'add-student', label: 'Add Student', icon: '➕', color: THEME.emerald },
  { id: 'log-payment', label: 'Log Payment', icon: '💳', color: THEME.neon },
  { id: 'add-attribute', label: 'Add Attribute', icon: '📝', color: '#8B5CF6' },
  { id: 'schedule-batch', label: 'Schedule Batch', icon: '📅', color: '#F59E0B' }
];

export default function AdminDashboard() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [kpiData, setKpiData] = useState({
    totalStudents: 0,
    totalRevenue: 0,
    avgAttendance: 0,
    totalBatches: 0
  });
  const [enquiries, setEnquiries] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [studentsRes, enquiriesRes, activitiesRes] = await Promise.all([
        adminGet('/admin/students'),
        adminGet('/admin/enquiries'),
        adminGet('/admin/audit-logs')
      ]);

      const students = studentsRes.data || [];
      const activeStudents = students.filter(s => !s.is_deleted).length;
      
      setKpiData({
        totalStudents: activeStudents,
        totalRevenue: 125000, // Placeholder - should come from actual revenue endpoint
        avgAttendance: 78.5, // Placeholder - should come from actual attendance endpoint
        totalBatches: 24 // Placeholder - should come from actual batches endpoint
      });

      setEnquiries(enquiriesRes.data || []);
      setActivities(activitiesRes.data || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut'
      }
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen flex"
      style={{ backgroundColor: THEME.background }}
    >
      {/* Column 1: Navigation Sidebar */}
      <motion.div
        variants={itemVariants}
        className="w-64 flex-shrink-0 border-r"
        style={{ backgroundColor: THEME.card, borderColor: THEME.border }}
      >
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-wider" style={{ color: THEME.textPrimary }}>
            SAS COMMAND
          </h1>
          <p className="text-xs tracking-widest mt-1" style={{ color: THEME.textMuted }}>
            ADMIN CENTER
          </p>
        </div>

        <nav className="mt-8 px-4">
          {NAV_ITEMS.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveNav(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${
                activeNav === item.id ? 'shadow-lg' : ''
              }`}
              style={{
                backgroundColor: activeNav === item.id ? THEME.glow : 'transparent',
                color: activeNav === item.id ? THEME.emerald : THEME.textMuted,
                border: activeNav === item.id ? `1px solid ${THEME.emerald}` : '1px solid transparent'
              }}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium tracking-wide">{item.label}</span>
              {activeNav === item.id && (
                <motion.div
                  layoutId="activeIndicator"
                  className="ml-auto w-2 h-2 rounded-full"
                  style={{ backgroundColor: THEME.emerald, boxShadow: `0 0 10px ${THEME.emerald}` }}
                />
              )}
            </motion.button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 w-64 p-4 border-t" style={{ borderColor: THEME.border }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: THEME.glow }}>
              <span className="text-lg">👤</span>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: THEME.textPrimary }}>Admin User</p>
              <p className="text-xs" style={{ color: THEME.textMuted }}>Super Admin</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Column 2: Main Workspace */}
      <motion.div
        variants={itemVariants}
        className="flex-1 overflow-y-auto"
        style={{ backgroundColor: THEME.background }}
      >
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: THEME.textPrimary }}>
              Command Center
            </h2>
            <p className="mt-2" style={{ color: THEME.textMuted }}>
              Real-time academy operations overview
            </p>
          </div>

          {/* KPI Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Active Roster */}
            <motion.div
              whileHover={{ y: -4 }}
              className="relative p-6 rounded-xl border"
              style={{ backgroundColor: THEME.card, borderColor: THEME.border }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium tracking-wider" style={{ color: THEME.textMuted }}>
                    ACTIVE ROSTER
                  </p>
                  <p className="text-4xl font-bold mt-2 tracking-tight" style={{ color: THEME.textPrimary }}>
                    {kpiData.totalStudents}
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: THEME.glow, color: THEME.emerald }}>
                  +12.5%
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-2xl">👥</span>
                <span className="text-sm" style={{ color: THEME.textMuted }}>Total enrolled students</span>
              </div>
            </motion.div>

            {/* Corporate Revenue Ledger */}
            <motion.div
              whileHover={{ y: -4 }}
              className="relative p-6 rounded-xl border"
              style={{ backgroundColor: THEME.card, borderColor: THEME.border }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium tracking-wider" style={{ color: THEME.textMuted }}>
                    REVENUE LEDGER
                  </p>
                  <p className="text-4xl font-bold mt-2 tracking-tight" style={{ color: THEME.textPrimary }}>
                    ${(kpiData.totalRevenue / 1000).toFixed(1)}K
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: THEME.glow, color: THEME.emerald }}>
                  +8.3%
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-2xl">💰</span>
                <span className="text-sm" style={{ color: THEME.textMuted }}>Monthly revenue</span>
              </div>
            </motion.div>

            {/* Average Attendance Index */}
            <motion.div
              whileHover={{ y: -4 }}
              className="relative p-6 rounded-xl border"
              style={{ backgroundColor: THEME.card, borderColor: THEME.border }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium tracking-wider" style={{ color: THEME.textMuted }}>
                    ATTENDANCE INDEX
                  </p>
                  <p className="text-4xl font-bold mt-2 tracking-tight" style={{ color: THEME.textPrimary }}>
                    {kpiData.avgAttendance}%
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: THEME.glowNeon, color: THEME.neon }}>
                  +2.1%
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-2xl">📊</span>
                <span className="text-sm" style={{ color: THEME.textMuted }}>Average attendance rate</span>
              </div>
            </motion.div>

            {/* Operational Batches */}
            <motion.div
              whileHover={{ y: -4 }}
              className="relative p-6 rounded-xl border"
              style={{ backgroundColor: THEME.card, borderColor: THEME.border }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium tracking-wider" style={{ color: THEME.textMuted }}>
                    OPERATIONAL BATCHES
                  </p>
                  <p className="text-4xl font-bold mt-2 tracking-tight" style={{ color: THEME.textPrimary }}>
                    {kpiData.totalBatches}
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: THEME.glow, color: THEME.emerald }}>
                  +3
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-2xl">📅</span>
                <span className="text-sm" style={{ color: THEME.textMuted }}>Active training batches</span>
              </div>
            </motion.div>
          </div>

          {/* Recent Enquiries Desk & Quick Actions Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Enquiries Desk */}
            <motion.div
              variants={itemVariants}
              className="p-6 rounded-xl border"
              style={{ backgroundColor: THEME.card, borderColor: THEME.border }}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold tracking-wide" style={{ color: THEME.textPrimary }}>
                  Recent Enquiries
                </h3>
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: THEME.glow, color: THEME.emerald }}>
                  {enquiries.length} New
                </span>
              </div>

              {loading ? (
                <div className="text-center py-8" style={{ color: THEME.textMuted }}>
                  Loading enquiries...
                </div>
              ) : enquiries.length === 0 ? (
                <div className="text-center py-8" style={{ color: THEME.textMuted }}>
                  No recent enquiries
                </div>
              ) : (
                <div className="space-y-3">
                  {enquiries.slice(0, 5).map((enquiry) => (
                    <motion.div
                      key={enquiry.enquiry_id}
                      whileHover={{ x: 4 }}
                      className="p-4 rounded-lg border cursor-pointer transition-all"
                      style={{ backgroundColor: THEME.background, borderColor: THEME.border }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium" style={{ color: THEME.textPrimary }}>
                            {enquiry.name || 'Unknown'}
                          </p>
                          <p className="text-sm mt-1" style={{ color: THEME.textMuted }}>
                            {enquiry.email || 'No email'}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full" style={{ 
                          backgroundColor: enquiry.status === 'PENDING' ? '#F59E0B20' : THEME.glow,
                          color: enquiry.status === 'PENDING' ? '#F59E0B' : THEME.emerald
                        }}>
                          {enquiry.status || 'PENDING'}
                        </span>
                      </div>
                      <p className="text-xs mt-2" style={{ color: THEME.textMuted }}>
                        {enquiry.message || 'No message'}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Quick Actions Command Container */}
            <motion.div
              variants={itemVariants}
              className="p-6 rounded-xl border"
              style={{ backgroundColor: THEME.card, borderColor: THEME.border }}
            >
              <h3 className="text-lg font-bold tracking-wide mb-6" style={{ color: THEME.textPrimary }}>
                Quick Actions
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {QUICK_ACTIONS.map((action) => (
                  <motion.button
                    key={action.id}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-4 rounded-lg border text-left transition-all"
                    style={{ 
                      backgroundColor: `${action.color}15`,
                      borderColor: action.color,
                      color: action.color
                    }}
                  >
                    <span className="text-2xl mb-2 block">{action.icon}</span>
                    <span className="font-medium text-sm">{action.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Column 3: Right Context Drawer */}
      <motion.div
        variants={itemVariants}
        className="w-80 flex-shrink-0 border-l overflow-y-auto"
        style={{ backgroundColor: THEME.card, borderColor: THEME.border }}
      >
        <div className="p-6">
          <h3 className="text-lg font-bold tracking-wide mb-6" style={{ color: THEME.textPrimary }}>
            Activity Stream
          </h3>

          {loading ? (
            <div className="text-center py-8" style={{ color: THEME.textMuted }}>
              Loading activities...
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8" style={{ color: THEME.textMuted }}>
              No recent activity
            </div>
          ) : (
            <div className="space-y-4">
              {activities.slice(0, 10).map((activity, index) => (
                <motion.div
                  key={activity.audit_id || index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-lg border"
                  style={{ backgroundColor: THEME.background, borderColor: THEME.border }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: THEME.glow }}>
                      <span className="text-sm">
                        {activity.action_type === 'CREATE' ? '➕' : 
                         activity.action_type === 'UPDATE' ? '✏️' : 
                         activity.action_type === 'DELETE' ? '🗑️' : '📝'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: THEME.textPrimary }}>
                        {activity.action || 'System Action'}
                      </p>
                      <p className="text-xs mt-1" style={{ color: THEME.textMuted }}>
                        {activity.description || 'No description'}
                      </p>
                      <p className="text-xs mt-2" style={{ color: THEME.textMuted }}>
                        {activity.created_at ? new Date(activity.created_at).toLocaleString() : 'Just now'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* System Status */}
        <div className="p-6 border-t" style={{ borderColor: THEME.border }}>
          <h4 className="text-sm font-bold tracking-wide mb-4" style={{ color: THEME.textPrimary }}>
            System Status
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm" style={{ color: THEME.textMuted }}>Database</span>
              <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: THEME.glow, color: THEME.emerald }}>
                Online
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm" style={{ color: THEME.textMuted }}>API Server</span>
              <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: THEME.glow, color: THEME.emerald }}>
                Running
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm" style={{ color: THEME.textMuted }}>SMTP</span>
              <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: THEME.glow, color: THEME.emerald }}>
                Connected
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
