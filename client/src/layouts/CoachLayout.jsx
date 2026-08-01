import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import NotificationBell from '../components/NotificationBell';
import BrandingLogo from '../components/BrandingLogo';
import GlobalBackground from '../components/GlobalBackground';
import { clearCoachToken, SIDEBAR_COLLAPSED_KEY, getCoachToken } from '../api/client';
import { CoachBatchesProvider, useCoachBatches } from '../context/CoachBatchesContext';
import { CoachDailyNotes } from '../pages/coach/CoachExtras';
import { NotebookPen, X } from 'lucide-react';

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
  Menu,
  Home,
  Package
} from 'lucide-react';

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
  { path: 'inventory', label: 'Inventory', icon: Package },
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
    /* Main App Background supporting Light and Dark Mode */
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 relative z-0">
      
      {/* Universal Fixed Background */}
      <GlobalBackground />

      {/* Sidebar Layout */}
      <motion.aside
        initial={{ width: sidebarCollapsed ? '5rem' : '15.5rem' }}
        animate={{ width: sidebarCollapsed ? '5rem' : '15.5rem' }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        whileHover={{ scale: 1.0005 }}
        className={`bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-800/50 flex-shrink-0 flex flex-col fixed inset-y-0 left-0 z-50 -translate-x-full lg:relative lg:translate-x-0 shadow-2xl shadow-black/20 transition-all duration-300 ${
          sidebarOpen ? '!translate-x-0' : ''
        }`}
      >
        {/* Sidebar Header / Logo */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.25 }}
          className="flex h-16 items-center justify-between px-4 shrink-0 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50 shadow-lg shadow-black/10"
        >
          <BrandingLogo
            to="/coach/dashboard"
            collapsed={sidebarCollapsed}
            onLogoClick={() => !sidebarCollapsed && setSidebarCollapsed(true)}
            className="rounded-lg focus-visible:ring-2 focus-visible:ring-[var(--theme-primary,#84cc16)] transition-transform duration-250 hover:scale-105"
          />
          <motion.button
            type="button"
            className="hidden h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800/80 hover:text-white lg:flex shrink-0 transition-all duration-250 hover:shadow-lg hover:shadow-black/20"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            whileHover={{ scale: 1.1, y: -1 }}
            whileTap={{ scale: 0.95 }}
          >
            {sidebarCollapsed ? <ChevronRight size={16} strokeWidth={2.5} /> : <ChevronLeft size={16} strokeWidth={2.5} />}
          </motion.button>
        </motion.div>

        {/* Navigation Links */}
        <nav
          className="flex-1 overflow-y-auto px-3 py-6 space-y-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          aria-label="Coach sections"
        >
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
                  `flex w-full items-center gap-3.5 py-3 text-sm transition-all duration-300 rounded-2xl group outline-none font-bold ${
                    sidebarCollapsed ? 'justify-center px-0' : 'px-4'
                  } ${
                    isActive
                      ? 'bg-[var(--theme-primary,#84cc16)] text-slate-950 shadow-lg shadow-lime-500/30 scale-105'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-white hover:shadow-lg hover:shadow-black/20 hover:scale-105'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <motion.span
                      className={`flex items-center justify-center ${sidebarCollapsed ? '' : 'min-w-[20px]'}`}
                      whileHover={{ scale: 1.15, rotate: 5 }}
                      transition={{ duration: 0.25, type: 'spring', stiffness: 300 }}
                      aria-hidden="true"
                    >
                      <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
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

        {/* Sidebar Footer / Profile & Sign Out */}
        <motion.div 
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.25 }}
          className="p-4 shrink-0 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-800/50 shadow-lg shadow-black/10 space-y-2"
        >
          {!sidebarCollapsed && (
            <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-2 px-2 truncate font-bold">
              Coach Profile: <br />
              <span className="text-white font-black text-sm capitalize">{coachUser?.name || 'Loading...'}</span>
            </div>
          )}
          <motion.button
            type="button"
            className={`w-full flex justify-center items-center rounded-2xl text-sm py-2.5 font-bold transition-all duration-300 ${
              sidebarCollapsed
                ? 'bg-transparent text-slate-400 hover:bg-slate-800/80 hover:text-white hover:shadow-lg hover:shadow-black/20'
                : 'border border-slate-700/50 bg-slate-800/30 text-slate-300 hover:bg-slate-800/80 hover:text-white hover:border-slate-600 hover:shadow-lg hover:shadow-black/20'
            }`}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.98 }}
            title={sidebarCollapsed ? 'Back to Home' : undefined}
          >
            <Link to="/" className="text-inherit no-underline flex items-center justify-center gap-2 w-full">
              <Home size={16} strokeWidth={2.5} />
              {!sidebarCollapsed && <span>Back to Home</span>}
            </Link>
          </motion.button>

          <motion.button
            type="button"
            className={`w-full flex justify-center items-center gap-2 rounded-2xl text-sm py-2.5 font-bold transition-all duration-300 ${
              sidebarCollapsed
                ? 'text-slate-400 hover:bg-slate-800/80 hover:text-white hover:shadow-lg hover:shadow-black/20'
                : 'border border-slate-700/50 bg-slate-800/50 text-slate-300 hover:bg-slate-800/80 hover:text-white hover:border-slate-600 hover:shadow-lg hover:shadow-black/20'
            }`}
            onClick={handleLogout}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.98 }}
            title={sidebarCollapsed ? 'Sign Out' : undefined}
          >
            <LogOut size={16} strokeWidth={2.5} />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </motion.button>
        </motion.div>
      </motion.aside>

      {/* Mobile Drawer Overlay */}
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
      <motion.div 
        whileHover={{ scale: 1.002 }}
        transition={{ duration: 0.3 }}
        className="flex min-w-0 flex-1 flex-col overflow-y-auto"
      >
        
        {/* Top Header - Vibrant Lime Green (Color untouched, styling aligned) */}
        <motion.header 
          whileHover={{ y: -1, scale: 1.002 }}
          transition={{ duration: 0.3 }}
          className="bg-[#84cc16] text-slate-950 sticky top-0 z-30 flex h-16 items-center justify-between px-5 lg:px-8 flex-shrink-0 shadow-xl shadow-black/20"
        >
          <motion.div 
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-4"
          >
            <motion.button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/10 lg:hidden text-slate-900 hover:bg-black/20 transition-all duration-250 hover:shadow-lg hover:shadow-black/20"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              whileHover={{ scale: 1.1, y: -1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Menu size={20} strokeWidth={2.5} />
            </motion.button>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold tracking-widest uppercase opacity-80 mb-0.5">
                App Portal
              </span>
              <span className="text-xl font-black tracking-tight uppercase leading-none">
                Coach Portal
              </span>
            </div>
          </motion.div>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowDailyNotes(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-black/10 text-slate-900 hover:bg-black/20 transition-all duration-250 shadow-lg shadow-black/20"
              title="Daily Notes"
            >
              <NotebookPen size={18} strokeWidth={2.5} />
            </motion.button>

            <motion.div 
              whileHover={{ scale: 1.1, y: -2 }}
              transition={{ duration: 0.25 }}
              className="flex items-center justify-center bg-black/10 rounded-full h-10 w-10 text-slate-900 hover:bg-black/20 transition-all duration-250 shadow-lg shadow-black/20"
            >
              <NotificationBell userRole="COACH" />
            </motion.div>

            <div className="h-5 w-px bg-slate-950/20 mx-1 hidden sm:block"></div>

            <motion.div 
              whileHover={{ scale: 1.1, y: -2 }}
              transition={{ duration: 0.25 }}
              className="flex items-center justify-center bg-black/10 rounded-full h-10 w-10 text-slate-900 hover:bg-black/20 transition-all duration-250 shadow-lg shadow-black/20"
            >
              <ThemeToggle />
            </motion.div>
          </div>
        </motion.header>

        {/* Route Content wrapped in premium glassmorphic container layout */}
        <main className="flex-1 min-w-0 p-5 lg:p-8 relative">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="w-full min-w-0 relative z-10 rounded-2xl shadow-xl shadow-black/5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-6 lg:p-8 border border-slate-200/50 dark:border-slate-800/50"
          >
            <Outlet />
          </motion.div>
        </main>
      </motion.div>

      {/* Daily Notes Modal - Premium White Minimalist Style */}
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
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <motion.div
                      animate={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                      className="w-12 h-12 rounded-xl bg-[#84cc16] flex items-center justify-center text-slate-950 shadow-sm"
                    >
                      <NotebookPen size={24} strokeWidth={2.5} />
                    </motion.div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white">Daily Student Notes</h2>
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Notes are emailed to parents automatically</p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowDailyNotes(false)}
                    className="p-2 rounded-full bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors text-slate-550 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  >
                    <X size={20} strokeWidth={2.5} />
                  </motion.button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
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