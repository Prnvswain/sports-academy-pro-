import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import { clearSuperAdminToken, SIDEBAR_COLLAPSED_KEY } from '../api/client';

import { LayoutDashboard, Bell, Building2, Calendar, CreditCard, Sliders, Settings, Megaphone } from 'lucide-react';

const PRODUCT_NAME = 'Sports Academy Pro';
const PRODUCT_LOGO = 'SP';

export const SUPER_ADMIN_NAV_ITEMS = [
  { path: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: 'notifications', label: 'Notification', icon: Bell },
  { path: 'academies', label: 'Academies', icon: Building2 },
  { path: 'plans', label: 'Plans', icon: Calendar },
  { path: 'payments', label: 'Payments', icon: CreditCard },
  { path: 'controller', label: 'Controller', icon: Sliders },
  { path: 'announcements', label: 'Announcements', icon: Megaphone },
  { path: 'settings', label: 'Settings', icon: Settings },
];

const PAGE_TITLES = Object.fromEntries(SUPER_ADMIN_NAV_ITEMS.map((item) => [item.path, item.label]));

export default function SuperAdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true',
  );

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed);
  }, [sidebarCollapsed]);

  const handleLogout = () => {
    clearSuperAdminToken();
    navigate('/super-admin-login');
  };

  const closeMobileSidebar = () => setSidebarOpen(false);

  const pageTitle = PAGE_TITLES[location.pathname.split('/').pop()] || 'Dashboard';

  return (
    <div className="bg-slate-50 flex h-screen w-screen overflow-hidden">
      <motion.aside
        initial={{ width: sidebarCollapsed ? '4.5rem' : '16rem' }}
        animate={{ width: sidebarCollapsed ? '4.5rem' : '16rem' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`bg-slate-50/90 backdrop-blur-md border-r border-slate-200/80 flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out overflow-x-hidden fixed inset-y-0 left-0 z-20 -translate-x-full lg:relative lg:translate-x-0 ${sidebarOpen ? '!translate-x-0' : ''}`}
      >
        <div className="border-b border-slate-200/60 flex items-center justify-between p-4 bg-white/50">
          <Link
            to="/super-admin/dashboard"
            className="text-slate-800 flex items-center gap-2 font-extrabold no-underline hover:text-emerald-600 transition-colors"
            onClick={() => setSidebarCollapsed((c) => !c)}
          >
            <span className="bg-emerald-500 text-white flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xs shadow-sm cursor-pointer">
              {PRODUCT_LOGO}
            </span>
            <motion.span
              initial={{ opacity: 1 }}
              animate={{ opacity: sidebarCollapsed ? 0 : 1 }}
              transition={{ duration: 0.2 }}
              className={!sidebarCollapsed ? '' : 'hidden'}
            >
              {PRODUCT_NAME}
            </motion.span>
          </Link>
          <motion.button
            type="button"
            className="text-slate-500 hover:text-slate-700 hover:bg-slate-100/70 rounded-md p-1 sidebar-toggle-button hidden lg:inline-flex transition-all"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {sidebarCollapsed ? '»' : '«'}
          </motion.button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Super Admin sections">
          {SUPER_ADMIN_NAV_ITEMS.map((item, index) => (
            <NavLink
              key={item.path}
              to={`/super-admin/${item.path}`}
              end
              title={sidebarCollapsed ? item.label : undefined}
              data-nav={item.path}
              className={({ isActive }) => {
                const IconComponent = item.icon;
                return `
                  relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                  ${isActive 
                    ? 'bg-emerald-50 text-emerald-600 font-semibold' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
                  }
                  ${sidebarCollapsed ? 'justify-center px-2' : ''}
                `;
              }}
              onClick={closeMobileSidebar}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 w-1 h-5 bg-emerald-500 rounded-r-md" />
                  )}
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.15 }}
                  >
                    <item.icon className="w-5 h-5" />
                  </motion.div>
                  <motion.span
                    initial={{ opacity: 1 }}
                    animate={{ opacity: sidebarCollapsed ? 0 : 1 }}
                    transition={{ duration: 0.2 }}
                    className={!sidebarCollapsed ? '' : 'hidden'}
                  >
                    {item.label}
                  </motion.span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200/60 p-3 bg-white/50">
          <motion.div
            className="mb-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link
              to="/"
              className="block w-full text-center px-4 py-2 text-sm font-medium text-slate-600 bg-white/70 border border-slate-200/60 rounded-lg hover:bg-slate-100/70 hover:border-slate-300 transition-all no-underline hover:text-slate-900"
            >
              Back to Home
            </Link>
          </motion.div>
          <motion.button
            type="button"
            className="w-full px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-all shadow-sm"
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
            className="fixed inset-0 z-10 bg-slate-900/10 backdrop-blur-sm lg:hidden"
            aria-label="Close sidebar"
            onClick={closeMobileSidebar}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-slate-50"
      >
        <header className="bg-white/70 backdrop-blur-md sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/60 px-4 lg:px-8 flex-shrink-0">
          <div className="flex items-center gap-3">
            <motion.button
              type="button"
              className="text-slate-500 hover:text-slate-700 hover:bg-slate-100/70 rounded-md p-2 sidebar-toggle-button lg:hidden transition-all"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              ☰
            </motion.button>
            <h1 className="text-lg font-bold text-slate-800">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 min-w-0 p-4 lg:p-8 overflow-x-hidden">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full min-w-0"
          >
            <Outlet />
          </motion.div>
        </main>
      </motion.div>
    </div>
  );
}
