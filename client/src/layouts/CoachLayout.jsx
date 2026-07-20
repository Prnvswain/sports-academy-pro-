import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import NotificationBell from '../components/NotificationBell';
import BrandingLogo from '../components/BrandingLogo';
import { clearCoachToken, SIDEBAR_COLLAPSED_KEY, getCoachToken } from '../api/client';
import { CoachBatchesProvider, useCoachBatches } from '../context/CoachBatchesContext';
import { CoachDailyNotes } from '../pages/coach/CoachExtras';
import { NotebookPen } from 'lucide-react';

// Sleek and Premium Sports SaaS Icons
import {
  LayoutDashboard,
  ClipboardList,
  GraduationCap,
  TrendingUp,
  Wallet,
  Megaphone,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu
} from 'lucide-react';

const PRODUCT_NAME = 'Sports Academy Pro';
const PRODUCT_LOGO = 'SP';

const decodeJwtPayload = (token) => {
  if (!token) return null;

  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const normalized = atob(base64);
    const jsonPayload = decodeURIComponent(
      normalized
        .split('')
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

const COACH_NAV_ITEMS = [
  { path: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: 'attendance', label: 'Attendance', icon: ClipboardList },
  { path: 'students', label: 'Students', icon: GraduationCap },
  { path: 'performance', label: 'Performance Tracker', icon: TrendingUp },
  { path: 'fees', label: 'Fees', icon: Wallet },
  { path: 'announcements', label: 'Announcements', icon: Megaphone },
];

function CoachLayoutShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { allStudents } = useCoachBatches();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true',
  );
  const [coachUser, setCoachUser] = useState(null);
  const [showDailyNotes, setShowDailyNotes] = useState(false);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    const token = getCoachToken();
    setCoachUser(decodeJwtPayload(token));
  }, []);

  const handleLogout = () => {
    clearCoachToken();
    navigate('/coach/login');
  };

  const closeMobileSidebar = () => setSidebarOpen(false);

  return (
    // Main App Background with Soft Greenish-White Gradient
    <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-white to-[#f4fce3] text-slate-900 transition-colors duration-300">
      
      {/* Sidebar - Deep Navy/Black Theme */}
      <motion.aside
        initial={{ width: sidebarCollapsed ? '5rem' : '15.5rem' }}
        animate={{ width: sidebarCollapsed ? '5rem' : '15.5rem' }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`bg-[#0f172a] border-r border-slate-800 flex-shrink-0 flex flex-col fixed inset-y-0 left-0 z-50 -translate-x-full lg:relative lg:translate-x-0 shadow-2xl ${sidebarOpen ? '!translate-x-0' : ''}`}
      >
        {/* Sidebar Header / Logo */}
        <div className="flex h-16 items-center justify-between px-4 shrink-0 bg-[#0a0f1d] border-b border-slate-800">
          <BrandingLogo
            to="/coach/dashboard"
            collapsed={sidebarCollapsed}
            onLogoClick={() => !sidebarCollapsed && setSidebarCollapsed(true)}
            className="rounded-lg focus-visible:ring-2 focus-visible:ring-[#84cc16]"
          />
          <motion.button
            type="button"
            className="hidden h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white lg:flex shrink-0 transition-colors"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {sidebarCollapsed ? <ChevronRight size={16} strokeWidth={2.5} /> : <ChevronLeft size={16} strokeWidth={2.5} />}
          </motion.button>
        </div>

        {/* Navigation Links - Clean, minimal list */}
        <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" aria-label="Coach sections">
          {COACH_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={`/coach/${item.path}`}
                end
                title={sidebarCollapsed ? item.label : undefined}
                data-nav={item.path}
                onClick={closeMobileSidebar}
                className={({ isActive }) =>
                  `flex w-full items-center gap-3.5 py-3 text-sm transition-all duration-300 rounded-xl group outline-none font-bold ${
                    sidebarCollapsed ? 'justify-center px-0' : 'px-4'
                  } ${
                    isActive
                      // Active state matches the Lime Green reference exactly
                      ? 'bg-[#a3e635] text-slate-950 shadow-md'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <motion.span
                      className={`flex items-center justify-center ${sidebarCollapsed ? '' : 'min-w-[20px]'}`}
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.2 }}
                      aria-hidden="true"
                    >
                      <Icon size={18} strokeWidth={isActive ? 2.5 : 2.5} />
                    </motion.span>
                    <motion.span
                      initial={{ opacity: 1 }}
                      animate={{ opacity: sidebarCollapsed ? 0 : 1, display: sidebarCollapsed ? 'none' : 'block' }}
                      transition={{ duration: 0.2 }}
                      className="relative z-10 whitespace-nowrap tracking-wide"
                    >
                      {item.label}
                    </motion.span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer / Actions */}
        <div className="p-4 shrink-0 bg-[#0a0f1d] border-t border-slate-800">
          {!sidebarCollapsed && (
            <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-3 px-2 truncate font-bold">
              Coach Profile: <br/><span className="text-white font-black text-sm capitalize">{coachUser?.name || 'Loading...'}</span>
            </div>
          )}
          <motion.button
            type="button"
            className={`w-full flex justify-center items-center gap-2 rounded-xl text-sm py-3 font-bold transition-all ${
              sidebarCollapsed 
              ? 'text-slate-500 hover:bg-slate-800 hover:text-white' 
              : 'border border-slate-700/50 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-600'
            }`}
            onClick={handleLogout}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            title={sidebarCollapsed ? "Sign Out" : undefined}
          >
            <LogOut size={16} strokeWidth={2.5} />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </motion.button>
        </div>
      </motion.aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            type="button"
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden cursor-default outline-none"
            aria-label="Close sidebar"
            onClick={closeMobileSidebar}
          />
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <motion.div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        
        {/* Top Header - Vibrant Lime Green matching the UI reference */}
        <header className="bg-[#84cc16] text-slate-950 sticky top-0 z-30 flex h-16 items-center justify-between px-5 lg:px-8 transition-colors duration-300 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
            <motion.button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/10 lg:hidden text-slate-900 hover:bg-black/20"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Menu size={20} strokeWidth={2.5} />
            </motion.button>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold tracking-widest uppercase opacity-80 mb-0.5">App Portal</span>
              <span className="text-xl font-black tracking-tight uppercase leading-none">Coach Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowDailyNotes(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-black/10 text-slate-900 hover:bg-black/20 transition-colors shadow-sm"
              title="Daily Notes"
            >
              <NotebookPen size={18} strokeWidth={2.5} />
            </motion.button>
            {/* The wrapper handles the icon styling for these components */}
            <div className="flex items-center justify-center bg-black/10 rounded-full h-10 w-10 text-slate-900 hover:bg-black/20 transition-colors">
              <NotificationBell userRole="COACH" />
            </div>
            <div className="flex items-center justify-center bg-black/10 rounded-full h-10 w-10 text-slate-900 hover:bg-black/20 transition-colors">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Route Outlet */}
        <main className="flex-1 min-w-0 p-5 lg:p-8 relative">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="w-full min-w-0 relative z-10"
          >
            <Outlet />
          </motion.div>
        </main>
      </motion.div>

      {/* Daily Notes Modal - Clean White Minimalist Style */}
      <AnimatePresence>
        {showDailyNotes && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowDailyNotes(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <motion.div
                      animate={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                      className="w-12 h-12 rounded-xl bg-[#a3e635] flex items-center justify-center text-slate-900 shadow-sm"
                    >
                      <NotebookPen size={24} strokeWidth={2.5} />
                    </motion.div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Daily Student Notes</h2>
                      <p className="text-sm font-semibold text-slate-500 mt-0.5">Notes are emailed to parents automatically</p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowDailyNotes(false)}
                    className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-500 hover:text-slate-900"
                  >
                    <X size={20} strokeWidth={2.5} />
                  </motion.button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] bg-white text-slate-900">
                <CoachDailyNotes students={allStudents || []} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CoachLayout() {
  return (
    <CoachBatchesProvider>
      <CoachLayoutShell />
    </CoachBatchesProvider>
  );
}