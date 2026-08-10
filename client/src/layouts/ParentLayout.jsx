import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import NotificationBell from '../components/NotificationBell';
import BrandingLogo from '../components/BrandingLogo';
import GlobalBackground from '../components/GlobalBackground';
import StudentSwitcher from '../components/StudentSwitcher';
import AcademyCalendarModal from '../components/AcademyCalendarModal';
import { SIDEBAR_COLLAPSED_KEY, parentGet } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { useActiveStudent } from '../context/ActiveStudentContext';

// Energetic sports icons
import {
  Target,
  CalendarDays,
  Trophy,
  Ticket,
  Megaphone,
  Dumbbell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Activity,
  Package
} from 'lucide-react';

const PRODUCT_NAME = 'Sports Academy Pro';
const PRODUCT_LOGO = 'SP';

const PARENT_NAV_ITEMS = [
  { path: 'dashboard', label: 'Dashboard', icon: Target },
  { path: 'attendance', label: 'Attendance', icon: CalendarDays },
  { path: 'performance', label: 'Performance', icon: Trophy },
  { path: 'fees', label: 'Fees', icon: Ticket },
  { path: 'sports-kits', label: 'Sports Kits', icon: Package },
  { path: 'announcements', label: 'Announcements', icon: Megaphone },
  { path: 'settings', label: 'Settings', icon: Dumbbell },
];

function ParentLayoutShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearActiveStudent } = useActiveStudent();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true',
  );
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

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

  useEffect(() => {
    console.log('[ParentLayout] Initializing...');
    const token = localStorage.getItem('parent_token');
    const userData = localStorage.getItem('parent_user');

    if (!token || !userData) {
      console.log('[ParentLayout] No token or user data, redirecting to login');
      navigate('/parent/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      console.log('[ParentLayout] User loaded from localStorage:', parsedUser);
    } catch (error) {
      console.error('[ParentLayout] Failed to parse user data:', error);
      localStorage.removeItem('parent_user');
      navigate('/parent/login');
      return;
    }

    console.log('[ParentLayout] Setting loading to false');
    setLoading(false);
  }, [navigate]);

  // Load theme colors from backend
  const { updateThemeColors, isDark } = useTheme();
  useEffect(() => {
    const loadThemeColors = async () => {
      try {
        const response = await parentGet('/super-admin/theme');
        const themeData = response?.data || response;
        if (themeData) {
          updateThemeColors(themeData);
        }
      } catch (error) {
        // If 403 Forbidden (Parent accessing Super Admin endpoint), gracefully use default theme
        if (error.response?.status === 403) {
          console.log('Theme endpoint not accessible for Parent role, using default theme');
        } else {
          console.error('Failed to load theme colors:', error);
        }
      }
    };
    loadThemeColors();
  }, [updateThemeColors]);

  const handleLogout = () => {
    clearActiveStudent();
    localStorage.removeItem('parent_token');
    localStorage.removeItem('parent_user');
    navigate('/parent/login');
  };

  const closeMobileSidebar = () => setSidebarOpen(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center flex flex-col items-center">
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="text-[#b2f04d] mb-3"
          >
            {/* Loading Spinner */}
            <svg className="animate-spin h-8 w-8 text-[var(--theme-primary,#b2f04d)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </motion.div>
          <p className="text-slate-500 text-xs font-bold tracking-widest uppercase">Connecting SAMS...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-red-500 text-sm font-bold">Session expired. Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 relative z-0 antialiased font-sans">

      {/* Universal Fixed Background (Fully Stationary, No scrolling/clipping/repeating bugs) */}
      <GlobalBackground overrideColor={isDark ? undefined : 'linear-gradient(135deg, #2563EB 0%, #60A5FA 50%, #FFFFFF 100%)'} />

      {/* Sidebar - Dark theme */}
      <motion.aside
        initial={{ width: collapsedForNav ? '5rem' : '15.5rem' }}
        animate={{ width: collapsedForNav ? '5rem' : '15.5rem' }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        whileHover={{ scale: 1.0005 }}
        className={`bg-[#0b1121]/95 backdrop-blur-xl border-r border-slate-800/50 flex-shrink-0 flex flex-col fixed inset-y-0 left-0 z-50 -translate-x-full lg:relative lg:translate-x-0 shadow-2xl shadow-black/20 ${sidebarOpen ? '!translate-x-0' : ''}`}
      >
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.25 }}
          className="flex h-16 items-center justify-between px-4 shrink-0 border-b border-slate-800/50 shadow-lg shadow-black/10"
        >
          <Link
            to="/parent/dashboard"
            className="flex items-center gap-3 no-underline outline-none transition-transform duration-250 hover:scale-105"
            onClick={() => !collapsedForNav && setSidebarCollapsed(true)}
          >
            <span className="bg-[#2563eb] text-white flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black tracking-tighter shadow-lg shadow-blue-500/30">
              {PRODUCT_LOGO}
            </span>
            <motion.span
              initial={{ opacity: 1 }}
              animate={{ opacity: collapsedForNav ? 0 : 1, display: collapsedForNav ? 'none' : 'block' }}
              transition={{ duration: 0.2 }}
              className="font-black tracking-widest text-white text-[13px] whitespace-nowrap uppercase"
            >
              Sports <span className="text-[#2563eb]">Pro</span>
            </motion.span>
          </Link>

          <motion.button
            type="button"
            className="hidden h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-800/80 hover:text-[#2563eb] lg:flex shrink-0 transition-all duration-250 hover:shadow-lg hover:shadow-black/20"
            onClick={() => setSidebarCollapsed((c) => !c)}
            whileHover={{ scale: 1.1, y: -1 }}
            whileTap={{ scale: 0.95 }}
          >
            {sidebarCollapsed ? <ChevronRight size={16} strokeWidth={2.5} /> : <ChevronLeft size={16} strokeWidth={2.5} />}
          </motion.button>
        </motion.div>

        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-2 custom-scrollbar">
          {PARENT_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={`/parent/${item.path}`}
                end
                title={collapsedForNav ? item.label : undefined}
                onClick={closeMobileSidebar}
                className={({ isActive }) =>
                  `flex w-full items-center gap-3.5 py-3 text-sm transition-all duration-300 rounded-2xl group outline-none font-bold ${collapsedForNav ? 'justify-center px-0' : 'px-4'
                  } ${isActive
                    ? 'bg-[#2563eb] text-white shadow-lg shadow-blue-500/30 scale-105'
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-white hover:shadow-lg hover:shadow-black/20 hover:scale-105'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <motion.span
                      whileHover={{ scale: 1.15, rotate: 5 }}
                      transition={{ duration: 0.25, type: 'spring', stiffness: 300 }}
                      className={`flex items-center justify-center ${collapsedForNav ? '' : 'min-w-[20px]'}`}
                    >
                      <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                    </motion.span>
                    <motion.span
                      initial={{ opacity: 1 }}
                      animate={{ opacity: collapsedForNav ? 0 : 1, display: collapsedForNav ? 'none' : 'block' }}
                      transition={{ duration: 0.2 }}
                      className="whitespace-nowrap tracking-wide"
                    >
                      {item.label}
                    </motion.span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <motion.div
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.25 }}
          className="p-4 border-t border-slate-800/50 shrink-0 bg-[#080d1a]/80 backdrop-blur-md shadow-lg shadow-black/10"
        >
          {!collapsedForNav && (
            <div className="text-xs text-slate-400 mb-3 px-1 truncate font-medium">
              Parent: <br /><span className="text-white font-extrabold text-[15px] block mt-0.5">{user?.name || 'Loading...'}</span>
            </div>
          )}
          <motion.button
            type="button"
            className={`w-full flex justify-center items-center gap-2 rounded-2xl text-sm py-2.5 font-bold transition-all duration-300 ${collapsedForNav
                ? 'text-slate-500 hover:bg-red-500/10 hover:text-red-400 hover:shadow-lg hover:shadow-black/20'
                : 'bg-white/5 text-slate-300 border border-slate-700/50 hover:bg-red-500 hover:border-red-500 hover:text-white hover:shadow-lg hover:shadow-black/20'
              }`}
            onClick={handleLogout}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.98 }}
            title={collapsedForNav ? "Sign Out" : undefined}
          >
            <LogOut size={16} strokeWidth={2.5} />
            {!collapsedForNav && <span>Sign Out</span>}
          </motion.button>
        </motion.div>
      </motion.aside>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            type="button"
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden cursor-default outline-none"
            onClick={closeMobileSidebar}
          />
        )}
      </AnimatePresence>

      <motion.div
        whileHover={{ scale: 1.002 }}
        transition={{ duration: 0.3 }}
        className={`flex min-w-0 flex-1 flex-col relative ${sidebarOpen && isDrawerMode ? 'overflow-hidden' : 'overflow-y-auto'}`}
      >

        {/* Top Header - Dark Navy to match sidebar */}
        {/* <header className="bg-[#0b1121] border-b border-slate-800/60 sticky top-0 z-30 flex h-16 items-center justify-between px-4 lg:px-8 shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 lg:hidden text-slate-400 hover:bg-slate-800 hover:text-[#b2f04d] bg-transparent transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} strokeWidth={2.5} />
            </button>
            
            <div className="flex flex-col justify-center">
              <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase leading-none mb-1">
                Parent Portal
              </span>
              <span className="text-lg font-black tracking-tight text-white uppercase leading-none">
                {user?.name || 'Loading...'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <NotificationBell userRole="PARENT" />
            <ThemeToggle />
          </div>
        </header> */}
        {/* Yahan bg-[#84cc16] lagaya gaya hai, aur text ko dark (slate-900) kiya gaya hai taaki clear dikhe */}
        <motion.header
          whileHover={{ y: -1, scale: 1.002 }}
          transition={{ duration: 0.3 }}
          className="bg-[var(--theme-navbar,#84cc16)]/95 backdrop-blur-xl border-b border-lime-600/30 sticky top-0 z-30 flex h-16 items-center justify-between px-4 lg:px-8 shrink-0 shadow-xl shadow-black/20"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-4"
          >
            <motion.button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-lime-700/30 lg:hidden text-slate-800 hover:bg-black/10 bg-transparent transition-all duration-250 hover:shadow-lg hover:shadow-black/20"
              onClick={() => setSidebarOpen(true)}
              whileHover={{ scale: 1.1, y: -1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Menu size={20} strokeWidth={2.5} />
            </motion.button>

            <div className="flex flex-col justify-center">
              <span className="text-[10px] font-bold tracking-widest text-slate-800/80 uppercase leading-none mb-1">
                Parent Portal
              </span>
              {/* Name text slate-900 (dark) kar diya gaya hai */}
              <span className="text-lg font-black tracking-tight text-slate-900 uppercase leading-none">
                {user?.name || 'Loading...'}
              </span>
            </div>
          </motion.div>

          <div className="flex items-center gap-4">
            <StudentSwitcher />
            <motion.button
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCalendarModalOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-black/10 text-slate-900 hover:bg-black/20 transition-all duration-250 shadow-lg shadow-black/20"
              title="Academy Calendar"
            >
              <CalendarDays size={18} strokeWidth={2.5} />
            </motion.button>

            <motion.div
              whileHover={{ scale: 1.1, y: -2 }}
              transition={{ duration: 0.25 }}
              className="flex items-center justify-center bg-black/10 rounded-full h-10 w-10 text-slate-900 hover:bg-black/20 transition-all duration-250 shadow-lg shadow-black/20"
            >
              <NotificationBell userRole="PARENT" />
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.1, y: -2 }}
              transition={{ duration: 0.25 }}
              className="flex items-center justify-center bg-black/10 rounded-full h-10 w-10 text-slate-900 hover:bg-black/20 transition-all duration-250 shadow-lg shadow-black/20"
            >
              <ThemeToggle />
            </motion.div>
          </div>
        </motion.header>

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

      <AcademyCalendarModal
        isOpen={calendarModalOpen}
        onClose={() => setCalendarModalOpen(false)}
        role="PARENT"
      />
    </div>
  );
}

export default function ParentLayout() {
  return <ParentLayoutShell />;
}