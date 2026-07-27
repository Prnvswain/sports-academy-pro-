import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import BrandingLogo from '../components/BrandingLogo';
import { clearSuperAdminToken, SIDEBAR_COLLAPSED_KEY, superAdminGet } from '../api/client';

import { 
  LayoutDashboard, 
  Bell, 
  Building2, 
  Calendar, 
  CreditCard, 
  Sliders, 
  Settings, 
  Megaphone,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Home
} from 'lucide-react';

const PRODUCT_NAME = 'Sports Academy Pro';
const PRODUCT_LOGO = 'SP';

export const SUPER_ADMIN_NAV_ITEMS = [
  { path: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: 'notifications', label: 'Notifications', icon: Bell },
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
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await superAdminGet('/super-admin/notifications/unread-count');
        if (response?.success) {
          setUnreadCount(response.data.count);
        }
      } catch (err) {
        console.error('Failed to fetch unread count:', err);
      }
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    clearSuperAdminToken();
    navigate('/super-admin-login');
  };

  const closeMobileSidebar = () => setSidebarOpen(false);

  const pageTitle = PAGE_TITLES[location.pathname.split('/').pop()] || 'Dashboard';

  return (
    // Main App Background remains dynamic according to theme variables
    <div className="bg-background text-foreground flex h-screen w-screen overflow-hidden transition-colors duration-300">
      
      {/* Sidebar - Dark Gradient (Slate to Emerald) */}
      <motion.aside
        initial={{ width: sidebarCollapsed ? '5rem' : '15.5rem' }}
        animate={{ width: sidebarCollapsed ? '5rem' : '15.5rem' }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        whileHover={{ scale: 1.0005 }}
        className={`bg-gradient-to-b from-slate-950/95 via-slate-900/95 to-emerald-950/60 backdrop-blur-xl border-r border-emerald-900/50 flex-shrink-0 flex flex-col fixed inset-y-0 left-0 z-50 -translate-x-full lg:relative lg:translate-x-0 shadow-2xl shadow-black/20 ${sidebarOpen ? '!translate-x-0' : ''}`}
      >
        {/* Sidebar Header / Logo */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.25 }}
          className="flex h-16 items-center justify-between border-b border-emerald-900/50 px-4 shrink-0 shadow-lg shadow-black/10"
        >
          <BrandingLogo
            to="/super-admin/dashboard"
            collapsed={sidebarCollapsed}
            onLogoClick={() => !sidebarCollapsed && setSidebarCollapsed(true)}
            className="rounded-lg focus-visible:ring-2 focus-visible:ring-lime-500 transition-transform duration-250 hover:scale-105"
          />
          <motion.button
            type="button"
            className="hidden h-7 w-7 items-center justify-center rounded-md text-emerald-500/70 hover:bg-white/10 hover:text-lime-400 lg:flex shrink-0 transition-all duration-250 hover:shadow-lg hover:shadow-black/20"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            whileHover={{ scale: 1.1, y: -1 }}
            whileTap={{ scale: 0.95 }}
          >
            {sidebarCollapsed ? <ChevronRight size={16} strokeWidth={2.5} /> : <ChevronLeft size={16} strokeWidth={2.5} />}
          </motion.button>
        </motion.div>

        {/* Navigation Links - Scrollbar Hidden but fully scrollable */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" aria-label="Super Admin sections">
          {SUPER_ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={`/super-admin/${item.path}`}
                end
                title={sidebarCollapsed ? item.label : undefined}
                data-nav={item.path}
                onClick={closeMobileSidebar}
                className={({ isActive }) =>
                  `flex w-full items-center gap-3.5 py-3 text-sm transition-all duration-300 rounded-2xl group outline-none font-bold ${
                    sidebarCollapsed ? 'justify-center px-0' : 'px-3.5'
                  } ${
                    isActive
                      // Premium Dark Contrast: Lime Green Background with Dark Text + Glow
                      ? 'bg-lime-400 text-slate-950 shadow-lg shadow-lime-500/30 scale-105'
                      : 'text-slate-400 hover:bg-white/5 hover:text-lime-300 hover:shadow-lg hover:shadow-black/20 hover:scale-105'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <motion.span
                      className={`flex items-center justify-center relative ${sidebarCollapsed ? '' : 'min-w-[20px]'}`}
                      whileHover={{ scale: 1.15, rotate: isActive ? 0 : 5 }}
                      transition={{ duration: 0.25, type: 'spring', stiffness: 300 }}
                      aria-hidden="true"
                    >
                      <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                      {sidebarCollapsed && item.path === 'notifications' && unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center font-bold">
                          {unreadCount}
                        </span>
                      )}
                    </motion.span>
                    <motion.span
                      initial={{ opacity: 1 }}
                      animate={{ opacity: sidebarCollapsed ? 0 : 1, display: sidebarCollapsed ? 'none' : 'block' }}
                      transition={{ duration: 0.2 }}
                      className="relative z-10 whitespace-nowrap tracking-wide flex items-center justify-between w-full"
                    >
                      <span>{item.label}</span>
                      {!sidebarCollapsed && item.path === 'notifications' && unreadCount > 0 && (
                        <span className="bg-red-500 text-white rounded-full text-[10px] px-2 py-0.5 font-bold">
                          {unreadCount}
                        </span>
                      )}
                    </motion.span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer / Actions */}
        <motion.div 
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.25 }}
          className="border-t border-emerald-900/50 p-4 space-y-2 shrink-0 shadow-lg shadow-black/10"
        >
          <motion.button
            type="button"
            className="w-full flex justify-center items-center rounded-2xl text-sm py-2 font-semibold transition-all duration-300 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white hover:shadow-lg hover:shadow-black/20"
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.98 }}
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
              ? 'text-slate-500 hover:bg-red-500/20 hover:text-red-400 hover:shadow-lg hover:shadow-black/20'
              : 'bg-white/5 text-slate-300 hover:bg-red-500 hover:text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:shadow-lg hover:shadow-black/20'
            }`}
            onClick={handleLogout}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.98 }}
            title={sidebarCollapsed ? "Sign Out" : undefined}
          >
            <LogOut size={16} strokeWidth={2.5} />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </motion.button>
        </motion.div>
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
            className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden cursor-default outline-none"
            aria-label="Close sidebar"
            onClick={closeMobileSidebar}
          />
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <motion.div 
        whileHover={{ scale: 1.002 }}
        transition={{ duration: 0.3 }}
        className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-background/50"
      >
        
        {/* Top Header */}
        <motion.header 
          whileHover={{ y: -1, scale: 1.002 }}
          transition={{ duration: 0.3 }}
          className="bg-background/95 backdrop-blur-xl border-b border-border/50 sticky top-0 z-30 flex h-16 items-center justify-between px-5 lg:px-8 transition-colors duration-300 flex-shrink-0 shadow-xl shadow-black/20"
        >
          <motion.div 
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-4"
          >
            <motion.button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 lg:hidden text-muted-foreground hover:text-foreground transition-all duration-250 hover:shadow-lg hover:shadow-black/20"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              whileHover={{ scale: 1.1, y: -1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Menu size={20} strokeWidth={2.5} />
            </motion.button>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight text-foreground/90 uppercase">
                {pageTitle}
              </span>
            </div>
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.1, y: -2 }}
            transition={{ duration: 0.25 }}
            className="flex items-center justify-center bg-border/20 rounded-full h-10 w-10 hover:bg-border/30 transition-all duration-250 shadow-lg shadow-black/20"
          >
            <ThemeToggle />
          </motion.div>
        </motion.header>

        {/* Route Outlet */}
        <main className="flex-1 min-w-0 p-5 lg:p-8 transition-colors duration-300 overflow-x-hidden relative">
          {/* Ambient Background Glow */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden flex justify-center z-0">
             <div className="w-full max-w-5xl h-full bg-[radial-gradient(ellipse_at_top,rgba(var(--color-accent-primary),0.03)_0%,transparent_70%)]"></div>
          </div>
          
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-full min-w-0 relative z-10 rounded-2xl shadow-xl shadow-black/5 bg-background/50 backdrop-blur-sm p-6 lg:p-8"
          >
            <Outlet />
          </motion.div>
        </main>
      </motion.div>
    </div>
  );
}