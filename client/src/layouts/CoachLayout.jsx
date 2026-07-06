import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import { clearCoachToken, SIDEBAR_COLLAPSED_KEY } from '../api/client';
import { CoachBatchesProvider } from '../context/CoachBatchesContext';

const COACH_NAV_ITEMS = [
  { path: 'dashboard', label: 'Dashboard', icon: '📊' },
  { path: 'attendance', label: 'Attendance', icon: '📋' },
  { path: 'performance', label: 'Performance Tracker', icon: '📈' },
  { path: 'notes', label: 'Daily Notes', icon: '📝' },
  { path: 'fees', label: 'Fees', icon: '💳' },
];

const PAGE_TITLES = Object.fromEntries(COACH_NAV_ITEMS.map((item) => [item.path, item.label]));

function CoachLayoutShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true',
  );

  const section = location.pathname.split('/')[2] || 'dashboard';
  const pageTitle = PAGE_TITLES[section] || 'Coach Portal';

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const handleLogout = () => {
    clearCoachToken();
    navigate('/coach/login');
  };

  const closeMobileSidebar = () => setSidebarOpen(false);

  return (
    <div className="bg-surface flex min-h-screen transition-colors duration-200">
      <motion.aside
        initial={{ width: sidebarCollapsed ? '4.5rem' : '16rem' }}
        animate={{ width: sidebarCollapsed ? '4.5rem' : '16rem' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`border-border bg-surface-secondary fixed inset-y-0 left-0 z-50 flex flex-col border-r transition-all duration-300 ease-in-out transition-colors duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="border-border flex items-center justify-between border-b p-4">
          <Link
            to="/coach/dashboard"
            className="text-foreground flex items-center gap-2 font-extrabold no-underline"
          >
            <span className="bg-accent text-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xs">
              SC
            </span>
            <motion.span
              initial={{ opacity: 1 }}
              animate={{ opacity: sidebarCollapsed ? 0 : 1 }}
              transition={{ duration: 0.2 }}
              className={!sidebarCollapsed ? '' : 'hidden'}
            >
              SAMS Coach
            </motion.span>
          </Link>
          <motion.button
            type="button"
            className="btn-ghost hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm lg:inline-flex"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {sidebarCollapsed ? '»' : '«'}
          </motion.button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3" aria-label="Coach sections">
          {COACH_NAV_ITEMS.map((item, index) => (
            <NavLink
              key={item.path}
              to={`/coach/${item.path}`}
              end
              title={sidebarCollapsed ? item.label : undefined}
              data-nav={item.path}
              className={({ isActive }) =>
                `${isActive ? 'sidebar-link-active' : 'sidebar-link'} ${sidebarCollapsed ? 'justify-center px-2' : ''}`
              }
              onClick={closeMobileSidebar}
            >
              <motion.span
                whileHover={{ scale: 1.2 }}
                transition={{ duration: 0.15 }}
                aria-hidden="true"
              >
                {item.icon}
              </motion.span>
              <motion.span
                initial={{ opacity: 1 }}
                animate={{ opacity: sidebarCollapsed ? 0 : 1 }}
                transition={{ duration: 0.2 }}
                className={!sidebarCollapsed ? '' : 'hidden'}
              >
                {item.label}
              </motion.span>
            </NavLink>
          ))}
        </nav>
        <div className="border-border border-t p-3">
          <motion.button
            type="button"
            className="btn-secondary text-muted hover:border-danger hover:text-danger w-full"
            onClick={handleLogout}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Sign Out
          </motion.button>
        </div>
      </motion.aside>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            type="button"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            aria-label="Close sidebar"
            onClick={closeMobileSidebar}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ marginLeft: sidebarCollapsed ? '4.5rem' : '16rem' }}
        animate={{ marginLeft: sidebarCollapsed ? '4.5rem' : '16rem' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`flex min-w-0 flex-1 flex-col lg:ml-[4.5rem] lg:transition-all lg:duration-300 transition-colors duration-200`}
      >
        <header className="border-border bg-surface/95 sticky top-0 z-30 flex h-16 items-center justify-between border-b px-4 backdrop-blur lg:px-8 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <motion.button
              type="button"
              className="btn-ghost lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              ☰
            </motion.button>
            <h1 className="text-lg font-bold">{pageTitle}</h1>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-4 lg:p-8 transition-colors duration-200">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </motion.div>
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
