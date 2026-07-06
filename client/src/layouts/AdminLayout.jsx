import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import BroadcastModal from '../components/BroadcastModal';
import { clearAdminToken, SIDEBAR_COLLAPSED_KEY, adminGet } from '../api/client';

export const ADMIN_NAV_ITEMS = [
  { path: 'dashboard', label: 'Dashboard', icon: '📊' },
  { path: 'sports', label: 'Sports', icon: '⚽' },
  { path: 'coaches', label: 'Coaches', icon: '👥' },
  { path: 'batches', label: 'Training Batches', icon: '🏋️‍♂️' },
  { path: 'plans', label: 'Duration Plans', icon: '📅' },
  { path: 'students', label: 'Students', icon: '🎓' },
  { path: 'accounts', label: 'Accounts', icon: '💳' },
  { path: 'performance', label: 'Performance Tracker', icon: '📈' },
  { path: 'enquiries', label: 'Enquiries Desk', icon: '✉️' },
  { path: 'reports', label: 'Reports', icon: '📄' },
];

const PAGE_TITLES = Object.fromEntries(ADMIN_NAV_ITEMS.map((item) => [item.path, item.label]));

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true',
  );
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [batches, setBatches] = useState([]);

  const section = location.pathname.split('/')[2] || 'dashboard';
  const pageTitle = PAGE_TITLES[section] || 'Academy Workspace';

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const response = await adminGet('/admin/batches');
        setBatches(response.data?.data || response.data || []);
      } catch (error) {
        console.error('Failed to fetch batches:', error);
      }
    };
    fetchBatches();
  }, []);

  const handleLogout = () => {
    clearAdminToken();
    navigate('/');
  };

  const closeMobileSidebar = () => setSidebarOpen(false);

  return (
    <div className="bg-background text-foreground flex h-screen w-screen overflow-hidden transition-colors duration-300">
      {/* Sidebar */}
      <motion.aside
        initial={{ width: sidebarCollapsed ? '5rem' : '17rem' }}
        animate={{ width: sidebarCollapsed ? '5rem' : '17rem' }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className={`bg-card/80 backdrop-blur-2xl border-r border-border/50 flex-shrink-0 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300 ease-in-out fixed inset-y-0 left-0 z-20 -translate-x-full lg:relative lg:translate-x-0 ${sidebarOpen ? '!translate-x-0' : ''}`}
      >
        {/* Sidebar Header / Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border/50 px-4">
          <Link
            to="/admin/dashboard"
            className="flex items-center gap-3 no-underline outline-none rounded-lg focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <span className="bg-primary/10 text-primary border border-primary/20 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black tracking-tighter shadow-sm transition-transform hover:scale-105">
              SA
            </span>
            <motion.span
              initial={{ opacity: 1 }}
              animate={{ opacity: sidebarCollapsed ? 0 : 1, display: sidebarCollapsed ? 'none' : 'block' }}
              transition={{ duration: 0.2 }}
              className="font-bold tracking-wide text-foreground whitespace-nowrap"
            >
              SAMS Admin
            </motion.span>
          </Link>
          <motion.button
            type="button"
            className="btn-ghost sidebar-toggle-button hidden h-8 w-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground hover:bg-surface-secondary hover:text-foreground lg:inline-flex"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {sidebarCollapsed ? '»' : '«'}
          </motion.button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar" aria-label="Admin sections">
          {ADMIN_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={`/admin/${item.path}`}
              end
              title={sidebarCollapsed ? item.label : undefined}
              data-nav={item.path}
              className={({ isActive }) =>
                `${isActive ? 'sidebar-link-active bg-primary/5 text-primary border-primary/20' : 'sidebar-link text-muted-foreground hover:text-foreground'} ${sidebarCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-xl group relative overflow-hidden`
              }
              onClick={closeMobileSidebar}
            >
              <motion.span
                className="relative z-10 text-[1.1rem]"
                whileHover={{ scale: 1.15 }}
                transition={{ duration: 0.2 }}
                aria-hidden="true"
              >
                {item.icon}
              </motion.span>
              <motion.span
                initial={{ opacity: 1 }}
                animate={{ opacity: sidebarCollapsed ? 0 : 1, display: sidebarCollapsed ? 'none' : 'block' }}
                transition={{ duration: 0.2 }}
                className="relative z-10 font-medium whitespace-nowrap"
              >
                {item.label}
              </motion.span>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer / Actions */}
        <div className="border-t border-border/50 p-4 space-y-3 bg-surface-secondary/30 backdrop-blur-sm">
          <motion.button
            type="button"
            className="btn-secondary w-full justify-center rounded-xl text-sm font-semibold shadow-sm transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link to="/" className="text-foreground/90 no-underline flex items-center justify-center gap-2 w-full">
              {!sidebarCollapsed && 'Back to Home'}
              {sidebarCollapsed && '🏠'}
            </Link>
          </motion.button>
          <motion.button
            type="button"
            className="btn-danger w-full justify-center rounded-xl text-sm font-semibold shadow-sm"
            onClick={handleLogout}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            title={sidebarCollapsed ? "Sign Out" : undefined}
          >
            {sidebarCollapsed ? '🚪' : 'Sign Out'}
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
            className="fixed inset-0 z-10 bg-background/80 backdrop-blur-sm lg:hidden cursor-default outline-none"
            aria-label="Close sidebar"
            onClick={closeMobileSidebar}
          />
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <motion.div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-background/50">
        
        {/* Top Header */}
        <header className="bg-background/80 backdrop-blur-xl border-b border-border/40 sticky top-0 z-30 flex h-16 items-center justify-between px-5 lg:px-8 transition-colors duration-300 flex-shrink-0 shadow-[0_4px_24px_rgba(0,0,0,0.01)]">
          <div className="flex items-center gap-4">
            <motion.button
              type="button"
              className="btn-ghost sidebar-toggle-button flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 lg:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </motion.button>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground/90">
              {pageTitle}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              type="button"
              className="btn-ghost flex h-10 w-10 items-center justify-center rounded-full border border-transparent bg-surface-secondary/50 text-[1.1rem] shadow-sm transition-all hover:bg-surface-secondary hover:border-border/50 hover:shadow-md"
              onClick={() => setBroadcastModalOpen(true)}
              aria-label="Send broadcast"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              📢
            </motion.button>
            <div className="h-6 w-px bg-border/60 mx-1 hidden sm:block"></div>
            <ThemeToggle />
          </div>
        </header>

       {/* Route Outlet */}
        <main className="flex-1 min-w-0 p-5 lg:p-8 transition-colors duration-300 overflow-x-hidden relative">
          {/* Optional Ambient Background Glow */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden flex justify-center z-0">
             <div className="w-full max-w-5xl h-full bg-[radial-gradient(ellipse_at_top,rgba(var(--color-accent-primary),0.03)_0%,transparent_70%)]"></div>
          </div>
          
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full min-w-0 relative z-10"
          >
            <Outlet />
          </motion.div>
        </main>
      </motion.div>

      <BroadcastModal
        isOpen={broadcastModalOpen}
        onClose={() => setBroadcastModalOpen(false)}
        batches={batches}
      />
    </div>
  );
}