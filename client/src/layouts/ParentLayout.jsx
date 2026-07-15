import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import NotificationBell from '../components/NotificationBell';
import BrandingLogo from '../components/BrandingLogo';
import { SIDEBAR_COLLAPSED_KEY } from '../api/client';

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
  Activity
} from 'lucide-react';

const PRODUCT_NAME = 'Sports Academy Pro';
const PRODUCT_LOGO = 'SP';

const PARENT_NAV_ITEMS = [
  { path: 'dashboard', label: 'Dashboard', icon: Target },
  { path: 'attendance', label: 'Attendance', icon: CalendarDays },
  { path: 'performance', label: 'Performance', icon: Trophy },
  { path: 'fees', label: 'Fees', icon: Ticket },
  { path: 'announcements', label: 'Announcements', icon: Megaphone },
  { path: 'settings', label: 'Settings', icon: Dumbbell },
];

function ParentLayoutShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [studentChildren, setStudentChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true',
  );

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    const token = localStorage.getItem('parent_token');
    const userData = localStorage.getItem('parent_user');

    if (!token || !userData) {
      navigate('/parent/login');
      return;
    }

    try {
      setUser(JSON.parse(userData));
    } catch (error) {
      localStorage.removeItem('parent_user');
      navigate('/parent/login');
      return;
    }

    fetchChildren();
  }, [navigate]);

  const fetchChildren = async () => {
    try {
      const token = localStorage.getItem('parent_token');
      const response = await fetch('/api/v1/parent/children', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStudentChildren(data.data || []);
        if (data.data?.length > 0) {
          setSelectedChild(data.data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch children:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('parent_token');
    localStorage.removeItem('parent_user');
    navigate('/parent/login');
  };

  const closeMobileSidebar = () => setSidebarOpen(false);

  // Light Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center flex flex-col items-center">
          <motion.div 
            animate={{ scale: [1, 1.15, 1] }} 
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="text-lime-500 mb-3"
          >
            <Activity size={36} strokeWidth={2.5} />
          </motion.div>
          <p className="text-xs text-slate-500 font-bold tracking-[0.2em] uppercase">Loading Portal...</p>
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
    // Main App Background: Light Mode (bg-slate-50) and Dark Text (text-slate-900)
    <div className="bg-slate-50 text-slate-900 flex h-screen w-screen overflow-hidden antialiased font-sans">
      
      {/* Sidebar - Dark Gradient with a mix of Deep Emerald/Green (Kept exactly as requested) */}
      <motion.aside
        initial={{ width: sidebarCollapsed ? '5rem' : '15.5rem' }}
        animate={{ width: sidebarCollapsed ? '5rem' : '15.5rem' }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950/60 border-r border-emerald-900/30 flex-shrink-0 flex flex-col fixed inset-y-0 left-0 z-50 -translate-x-full lg:relative lg:translate-x-0 shadow-2xl ${sidebarOpen ? '!translate-x-0' : ''}`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-4 shrink-0 border-b border-emerald-900/40">
          <BrandingLogo
            to="/parent/dashboard"
            collapsed={sidebarCollapsed}
            onLogoClick={() => !sidebarCollapsed && setSidebarCollapsed(true)}
            className="rounded-lg focus-visible:ring-2 focus-visible:ring-lime-500"
          />
          
          <button
            type="button"
            className="hidden h-7 w-7 items-center justify-center rounded-md text-emerald-500/70 hover:bg-white/10 hover:text-lime-400 lg:flex shrink-0 transition-colors"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? 'Expand' : 'Collapse'}
          >
            {sidebarCollapsed ? <ChevronRight size={16} strokeWidth={2.5} /> : <ChevronLeft size={16} strokeWidth={2.5} />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1.5 custom-scrollbar" aria-label="Parent sections">
          {PARENT_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={`/parent/${item.path}`}
                end
                title={sidebarCollapsed ? item.label : undefined}
                onClick={closeMobileSidebar}
                className={({ isActive }) =>
                  `flex w-full items-center gap-3.5 py-3 text-sm transition-all duration-300 rounded-xl group outline-none font-bold ${
                    sidebarCollapsed ? 'justify-center px-0' : 'px-3.5'
                  } ${
                    isActive
                      // Premium Dark Contrast for Active Item
                      ? 'bg-lime-400 text-slate-950 shadow-[0_4px_20px_rgba(132,204,22,0.3)] translate-x-1'
                      : 'text-slate-400 hover:bg-white/5 hover:text-lime-300'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <motion.span 
                      whileHover={{ scale: 1.15, rotate: isActive ? 0 : 5 }}
                      className={`flex items-center justify-center ${sidebarCollapsed ? '' : 'min-w-[20px]'}`}
                    >
                      <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                    </motion.span>
                    <motion.span
                      initial={{ opacity: 1 }}
                      animate={{ opacity: sidebarCollapsed ? 0 : 1, display: sidebarCollapsed ? 'none' : 'block' }}
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

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-emerald-900/40 shrink-0">
          {!sidebarCollapsed && (
            <div className="text-xs text-slate-400 mb-3 px-1 truncate font-medium">
              Parent: <br/><span className="text-white font-bold text-sm">{user?.name || 'Loading...'}</span>
            </div>
          )}
          <button
            type="button"
            className={`w-full flex justify-center items-center gap-2 rounded-xl text-sm py-2.5 font-bold transition-all ${
              sidebarCollapsed 
              ? 'text-slate-500 hover:bg-red-500/20 hover:text-red-400' 
              : 'bg-white/5 text-slate-300 hover:bg-red-500 hover:text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]'
            }`}
            onClick={handleLogout}
            title={sidebarCollapsed ? "Sign Out" : undefined}
          >
            <LogOut size={16} strokeWidth={2.5} />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* Mobile Sidebar Overlay */}
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

      {/* Main Content Area - Light Mode Maintained */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto relative">
        
        {/* Top Header - Light Mode Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 flex h-16 items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 lg:hidden text-slate-500 hover:bg-slate-50 hover:text-slate-900 bg-white"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} strokeWidth={2.5} />
            </button>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-widest text-slate-900 uppercase">Headquarters</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell userRole="PARENT" />
            <ThemeToggle />
          </div>
        </header>

        {/* Route Content Area */}
        <main className="flex-1 min-w-0 p-4 lg:p-8 overflow-x-hidden relative">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full min-w-0 max-w-7xl mx-auto"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}

export default function ParentLayout() {
  return <ParentLayoutShell />;
}