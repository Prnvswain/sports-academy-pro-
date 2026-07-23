import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import NotificationBell from '../components/NotificationBell';
import BroadcastModal from '../components/BroadcastModal';
import BrandingLogo from '../components/BrandingLogo';
import { clearAdminToken, SIDEBAR_COLLAPSED_KEY, adminGet, getAdminToken } from '../api/client';

// Sleek and Premium Sports SaaS Icons
import {
  LayoutDashboard,
  Trophy,
  Users,
  Dumbbell,
  CalendarDays,
  GraduationCap,
  Wallet,
  TrendingUp,
  MessageSquare,
  FileText,
  Megaphone,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Home,
  CreditCard,
  Bell,
  Package
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

export const ADMIN_NAV_ITEMS = [
  { path: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: 'sports', label: 'Sports', icon: Trophy },
  { path: 'coaches', label: 'Coaches', icon: Users },
  { path: 'batches', label: 'Training Batches', icon: Dumbbell },
  { path: 'plans', label: 'Duration Plans', icon: CalendarDays },
  { path: 'students', label: 'Students', icon: GraduationCap },
  { path: 'accounts', label: 'Accounts', icon: Wallet },
  { path: 'subscription', label: 'Subscription', icon: CreditCard },
  { path: 'performance', label: 'Performance Tracker', icon: TrendingUp },
  { path: 'enquiries', label: 'Enquiries Desk', icon: MessageSquare },
  { path: 'reports', label: 'Reports', icon: FileText },
  { path: 'announcements', label: 'Announcements', icon: Megaphone },
  { path: 'notifications', label: 'Notifications', icon: Bell },
  { path: 'inventory', label: 'Inventory', icon: Package },
  { path: 'settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true',
  );
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [batches, setBatches] = useState([]);
  const [academy, setAcademy] = useState(null);
  const [adminUser, setAdminUser] = useState(null);

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

  useEffect(() => {
    const fetchAcademy = async () => {
      try {
        const response = await adminGet('/admin/academy');
        setAcademy(response.data);
      } catch (error) {
        console.error('Failed to fetch academy details:', error);
      }
    };
    fetchAcademy();

    // Listen for academy settings updates to refresh logo
    const handleSettingsUpdate = () => {
      fetchAcademy();
    };

    window.addEventListener('academySettingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('academySettingsUpdated', handleSettingsUpdate);
  }, []);

  useEffect(() => {
    const token = getAdminToken();
    setAdminUser(decodeJwtPayload(token));
  }, []);

  const handleLogout = () => {
    clearAdminToken();
    navigate('/');
  };

  const closeMobileSidebar = () => setSidebarOpen(false);

  return (
    // Main App Background with Soft Greenish-White Gradient (Based on Reference)
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
            to="/admin/dashboard"
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
        <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" aria-label="Admin sections">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={`/admin/${item.path}`}
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
        <div className="p-4 shrink-0 bg-[#0a0f1d] border-t border-slate-800 space-y-2">
          {!sidebarCollapsed && (
            <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-2 px-2 truncate font-bold">
              Admin Profile: <br/><span className="text-white font-black text-sm capitalize">{adminUser?.name || 'Loading...'}</span>
            </div>
          )}
          <motion.button
            type="button"
            className={`w-full flex justify-center items-center rounded-xl text-sm py-2.5 font-bold transition-all ${
              sidebarCollapsed 
              ? 'bg-transparent text-slate-500 hover:bg-slate-800 hover:text-white' 
              : 'border border-slate-700/50 bg-slate-800/30 text-slate-400 hover:bg-slate-800 hover:text-white hover:border-slate-600'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            title={sidebarCollapsed ? "Back to Home" : undefined}
          >
            <Link to="/" className="text-inherit no-underline flex items-center justify-center gap-2 w-full">
              <Home size={16} strokeWidth={2.5} />
              {!sidebarCollapsed && <span>Back to Home</span>}
            </Link>
          </motion.button>
          
          <motion.button
            type="button"
            className={`w-full flex justify-center items-center gap-2 rounded-xl text-sm py-2.5 font-bold transition-all ${
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
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/10 lg:hidden text-slate-900 hover:bg-black/20 transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Menu size={20} strokeWidth={2.5} />
            </motion.button>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold tracking-widest uppercase opacity-80 mb-0.5">Admin Portal</span>
              <span className="text-xl font-black tracking-tight uppercase leading-none">
                {academy?.name || 'Academy HQ'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setBroadcastModalOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-black/10 text-slate-900 hover:bg-black/20 transition-colors shadow-sm"
              title="Send Broadcast"
            >
              <Megaphone size={18} strokeWidth={2.5} />
            </motion.button>
            
            {/* The wrapper handles the icon styling for these components to match the sporty header */}
            <div className="flex items-center justify-center bg-black/10 rounded-full h-10 w-10 text-slate-900 hover:bg-black/20 transition-colors">
              <NotificationBell userRole="ACADEMY_ADMIN" />
            </div>
            
            <div className="h-5 w-px bg-slate-900/20 mx-1 hidden sm:block"></div>
            
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

      <BroadcastModal
        isOpen={broadcastModalOpen}
        onClose={() => setBroadcastModalOpen(false)}
        batches={batches}
      />
    </div>
  );
}