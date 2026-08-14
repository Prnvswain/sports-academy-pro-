import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import NotificationBell from '../components/NotificationBell';
import BrandingLogo from '../components/BrandingLogo';
import GlobalBackground from '../components/GlobalBackground';
import Avatar from '../components/Avatar';
import AcademyCalendarModal from '../components/AcademyCalendarModal';
import { clearCoachToken, SIDEBAR_COLLAPSED_KEY, getCoachToken, coachGet, isImpersonating, endImpersonation } from '../api/client';
import { CoachBatchesProvider, useCoachBatches } from '../context/CoachBatchesContext';
import { useTheme } from '../context/ThemeContext';
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
  Package,
  CalendarDays,
  ChevronDown
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
  {
    path: 'inventory',
    label: 'Inventory',
    icon: Package,
    submenu: [
      { path: 'inventory/equipment', label: 'Equipment' },
      { path: 'inventory/sports-kits', label: 'Sports Kits' }
    ]
  },
];

function CoachLayoutShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { allStudents } = useCoachBatches();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true',
  );
  const [expandedMenus, setExpandedMenus] = useState({});
  const [coachUser, setCoachUser] = useState(null);
  const [showDailyNotes, setShowDailyNotes] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Auto-expand inventory menu if on any inventory route
  useEffect(() => {
    if (location.pathname.startsWith('/coach/inventory')) {
      setExpandedMenus(prev => ({ ...prev, inventory: true }));
    }
  }, [location.pathname]);

  const toggleMenu = (menuKey) => {
    setExpandedMenus(prev => ({ ...prev, [menuKey]: !prev[menuKey] }));
  };

  // Track screen width for layout modes
  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isDrawerMode = screenWidth < 1024;
  const collapsedForNav = sidebarCollapsed && !isDrawerMode;

  // Disable body scrolling when mobile drawer is open
  useEffect(() => {
    if (sidebarOpen && isDrawerMode) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen, isDrawerMode]);

  // Close sidebar drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { updateThemeColors, isDark } = useTheme();

  useEffect(() => {
    const token = getCoachToken();
    setCoachUser(decodeJwtPayload(token));
  }, []);

  useEffect(() => {
    document.body.classList.add('coach-portal-root');
    return () => {
      document.body.classList.remove('coach-portal-root');
    };
  }, []);

  // Load theme colors from backend dynamically
  useEffect(() => {
    const loadThemeColors = async () => {
      try {
        const response = await coachGet('/super-admin/theme');
        const themeData = response?.data || response;
        if (themeData) {
          updateThemeColors(themeData);
        }
      } catch (error) {
        console.error('Failed to load theme colors:', error);
      }
    };
    loadThemeColors();
  }, [updateThemeColors]);

  const handleLogout = () => {
    clearCoachToken();
    navigate('/coach/login');
  };

  const closeMobileSidebar = () => setSidebarOpen(false);

  const impersonating = isImpersonating();

  const handleReturnToAdmin = () => {
    endImpersonation();
    window.location.href = '/admin/coaches';
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {impersonating && (
        <div className="bg-[#fbbf24] dark:bg-amber-600 text-slate-950 dark:text-white px-4 py-2 flex items-center justify-between text-xs font-bold shrink-0 border-b border-amber-300 dark:border-amber-700 shadow-sm z-50">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
            <span>Viewing as Coach (Admin Session)</span>
          </div>
          <button
            type="button"
            onClick={handleReturnToAdmin}
            className="bg-slate-950 dark:bg-white text-white dark:text-slate-950 px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Return to Admin Portal
          </button>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 relative z-0">

        {/* Universal Fixed Background */}
        <GlobalBackground overrideColor={isDark ? undefined : 'linear-gradient(135deg, #EF4444 0%, #F87171 50%, #FFFFFF 100%)'} />

        {/* Sidebar Layout */}
        <motion.aside
          initial={{ width: collapsedForNav ? '5rem' : '15.5rem' }}
          animate={{ width: collapsedForNav ? '5rem' : '15.5rem' }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          whileHover={{ scale: 1.0005 }}
          className={`bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-800/50 flex-shrink-0 flex flex-col fixed inset-y-0 left-0 z-50 -translate-x-full lg:relative lg:translate-x-0 shadow-2xl shadow-black/20 transition-all duration-300 ${sidebarOpen ? '!translate-x-0' : ''
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
              collapsed={collapsedForNav}
              onLogoClick={() => !collapsedForNav && setSidebarCollapsed(true)}
              className="rounded-lg focus-visible:ring-2 focus-visible:ring-[#ef4444] transition-transform duration-250 hover:scale-105"
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
              const hasSubmenu = item.submenu && item.submenu.length > 0;
              const isExpanded = expandedMenus[item.path];
              const menuKey = item.path;

              if (hasSubmenu) {
                return (
                  <div key={item.path} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleMenu(menuKey)}
                      title={collapsedForNav ? item.label : undefined}
                      className={`flex w-full items-center gap-3.5 py-3 text-sm transition-all duration-300 rounded-2xl group outline-none font-bold ${collapsedForNav ? 'justify-center px-0' : 'px-4'
                        } ${location.pathname.startsWith(`/coach/${item.path}`)
                          ? 'bg-slate-800/80 text-white'
                          : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                        }`}
                    >
                      <motion.span
                        className={`flex items-center justify-center ${collapsedForNav ? '' : 'min-w-[20px]'}`}
                        whileHover={{ scale: 1.15, rotate: 5 }}
                        transition={{ duration: 0.25, type: 'spring', stiffness: 300 }}
                        aria-hidden="true"
                      >
                        <Icon size={18} strokeWidth={2} />
                      </motion.span>
                      <motion.span
                        initial={{ opacity: 1 }}
                        animate={{ opacity: collapsedForNav ? 0 : 1, display: collapsedForNav ? 'none' : 'block' }}
                        transition={{ duration: 0.2 }}
                        className="relative z-10 whitespace-nowrap tracking-wide flex-1 text-left"
                      >
                        {item.label}
                      </motion.span>
                      {!collapsedForNav && (
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown size={14} strokeWidth={2.5} />
                        </motion.div>
                      )}
                    </button>
                    <AnimatePresence>
                      {isExpanded && !collapsedForNav && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="pl-12 space-y-1"
                        >
                          {item.submenu.map((subItem) => (
                            <NavLink
                              key={subItem.path}
                              to={`/coach/${subItem.path}`}
                              onClick={closeMobileSidebar}
                              className={({ isActive }) =>
                                `flex items-center gap-2 py-2 text-xs font-bold transition-all duration-200 rounded-xl outline-none ${isActive
                                  ? 'bg-[#ef4444] text-white shadow-md shadow-red-500/20'
                                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                                }`
                              }
                            >
                              {subItem.label}
                            </NavLink>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.path}
                  to={`/coach/${item.path}`}
                  end
                  title={collapsedForNav ? item.label : undefined}
                  data-nav={item.path}
                  onClick={closeMobileSidebar}
                  className={({ isActive }) =>
                    `flex w-full items-center gap-3.5 py-3 text-sm transition-all duration-300 rounded-2xl group outline-none font-bold ${collapsedForNav ? 'justify-center px-0' : 'px-4'
                    } ${isActive
                      ? 'bg-[#ef4444] text-white shadow-lg shadow-red-500/30 scale-105'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-white hover:shadow-lg hover:shadow-black/20 hover:scale-105'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <motion.span
                        className={`flex items-center justify-center ${collapsedForNav ? '' : 'min-w-[20px]'}`}
                        whileHover={{ scale: 1.15, rotate: 5 }}
                        transition={{ duration: 0.25, type: 'spring', stiffness: 300 }}
                        aria-hidden="true"
                      >
                        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                      </motion.span>
                      <motion.span
                        initial={{ opacity: 1 }}
                        animate={{ opacity: collapsedForNav ? 0 : 1, display: collapsedForNav ? 'none' : 'block' }}
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
            {!collapsedForNav && (
              <div className="flex items-center gap-3 mb-2 px-2">
                <Avatar src={coachUser?.photo_url || coachUser?.profile_photo} name={coachUser?.name} size="sm" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold leading-none">Coach Profile</span>
                  <span className="text-white font-black text-sm capitalize truncate mt-1">{coachUser?.name || 'Loading...'}</span>
                </div>
              </div>
            )}
            <motion.button
              type="button"
              className={`w-full flex justify-center items-center rounded-2xl text-sm py-2.5 font-bold transition-all duration-300 ${collapsedForNav
                ? 'bg-transparent text-slate-400 hover:bg-slate-800/80 hover:text-white hover:shadow-lg hover:shadow-black/20'
                : 'border border-slate-700/50 bg-slate-800/30 text-slate-300 hover:bg-slate-800/80 hover:text-white hover:border-slate-600 hover:shadow-lg hover:shadow-black/20'
                }`}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.98 }}
              title={collapsedForNav ? 'Back to Home' : undefined}
            >
              <Link to="/" className="text-inherit no-underline flex items-center justify-center gap-2 w-full">
                <Home size={16} strokeWidth={2.5} />
                {!collapsedForNav && <span>Back to Home</span>}
              </Link>
            </motion.button>

            <motion.button
              type="button"
              className={`w-full flex justify-center items-center gap-2 rounded-2xl text-sm py-2.5 font-bold transition-all duration-300 ${collapsedForNav
                ? 'text-slate-400 hover:bg-slate-800/80 hover:text-white hover:shadow-lg hover:shadow-black/20'
                : 'border border-slate-700/50 bg-slate-800/50 text-slate-300 hover:bg-slate-800/80 hover:text-white hover:border-slate-600 hover:shadow-lg hover:shadow-black/20'
                }`}
              onClick={handleLogout}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.98 }}
              title={collapsedForNav ? 'Sign Out' : undefined}
            >
              <LogOut size={16} strokeWidth={2.5} />
              {!collapsedForNav && <span>Sign Out</span>}
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
          className={`flex min-w-0 flex-1 flex-col ${sidebarOpen && isDrawerMode ? 'overflow-hidden' : 'overflow-y-auto'}`}
        >

          {/* Top Header - Styled to match Admin Portal styling */}
          <motion.header
            whileHover={{ y: -1, scale: 1.002 }}
            transition={{ duration: 0.3 }}
            className="bg-[var(--theme-navbar,#84cc16)]/95 dark:bg-slate-900/95 backdrop-blur-xl text-slate-950 dark:text-slate-100 border-b border-black/5 dark:border-slate-800/50 sticky top-0 z-30 flex h-16 items-center justify-between px-5 lg:px-8 transition-colors duration-300 flex-shrink-0 shadow-xl shadow-black/20"
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-4"
            >
              <motion.button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/10 dark:bg-slate-800 lg:hidden text-slate-900 dark:text-slate-100 hover:bg-black/20 dark:hover:bg-slate-700 transition-all duration-250 hover:shadow-lg hover:shadow-black/20"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                whileHover={{ scale: 1.1, y: -1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Menu size={20} strokeWidth={2.5} />
              </motion.button>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold tracking-widest uppercase opacity-80 dark:text-slate-400 mb-0.5">
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
                onClick={() => setCalendarModalOpen(true)}
                className="relative flex h-10 w-10 items-center justify-center rounded-full bg-black/10 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-black/20 dark:hover:bg-slate-700 transition-all duration-250 shadow-lg shadow-black/20"
                title="Academy Calendar"
              >
                <CalendarDays size={18} strokeWidth={2.5} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowDailyNotes(true)}
                className="relative flex h-10 w-10 items-center justify-center rounded-full bg-black/10 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-black/20 dark:hover:bg-slate-700 transition-all duration-250 shadow-lg shadow-black/20"
                title="Daily Notes"
              >
                <NotebookPen size={18} strokeWidth={2.5} />
              </motion.button>

              <motion.div
                whileHover={{ scale: 1.1, y: -2 }}
                transition={{ duration: 0.25 }}
                className="flex items-center justify-center bg-black/10 dark:bg-slate-800 rounded-full h-10 w-10 text-slate-900 dark:text-slate-100 hover:bg-black/20 dark:hover:bg-slate-700 transition-all duration-250 shadow-lg shadow-black/20"
              >
                <NotificationBell userRole="COACH" />
              </motion.div>

              <div className="h-5 w-px bg-slate-950/20 dark:bg-slate-800 mx-1 hidden sm:block"></div>

              <motion.div
                whileHover={{ scale: 1.1, y: -2 }}
                transition={{ duration: 0.25 }}
                className="flex items-center justify-center bg-black/10 dark:bg-slate-800 rounded-full h-10 w-10 text-slate-900 dark:text-slate-100 hover:bg-black/20 dark:hover:bg-slate-700 transition-all duration-250 shadow-lg shadow-black/20"
              >
                <ThemeToggle />
              </motion.div>
            </div>
          </motion.header>

          {/* Route Content wrapped in premium glassmorphic container layout */}
          <main className="flex-1 min-w-0 p-3 md:p-6 lg:p-8 relative">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="w-full min-w-0 relative z-10 rounded-2xl shadow-xl shadow-black/5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-4 md:p-6 lg:p-8"
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

        <AcademyCalendarModal
          isOpen={calendarModalOpen}
          onClose={() => setCalendarModalOpen(false)}
          role="COACH"
        />
      </div>
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