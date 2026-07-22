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
  Activity,
  CircleDot
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

// Mapped specific UI accent colors to each admin sidebar item
export const ADMIN_NAV_ITEMS = [
  { path: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-[#2563EB]' },
  { path: 'sports', label: 'Sports', icon: Trophy, color: 'text-[#16A34A]' },
  { path: 'coaches', label: 'Coaches', icon: Users, color: 'text-[#8B5CF6]' },
  { path: 'batches', label: 'Training Batches', icon: Dumbbell, color: 'text-[#F97316]' },
  { path: 'plans', label: 'Duration Plans', icon: CalendarDays, color: 'text-[#06B6D4]' },
  { path: 'students', label: 'Students', icon: GraduationCap, color: 'text-[#10B981]' },
  { path: 'accounts', label: 'Accounts', icon: Wallet, color: 'text-[#F59E0B]' },
  { path: 'performance', label: 'Performance Tracker', icon: TrendingUp, color: 'text-[#6366F1]' },
  { path: 'enquiries', label: 'Enquiries Desk', icon: MessageSquare, color: 'text-[#F43F5E]' },
  { path: 'reports', label: 'Reports', icon: FileText, color: 'text-[#0ea5e9]' },
  { path: 'announcements', label: 'Announcements', icon: Megaphone, color: 'text-[#F59E0B]' },
  { path: 'settings', label: 'Settings', icon: Settings, color: 'text-[#64748B]' },
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
    // Main App Container
    <div className="bg-[#FBFFF8] dark:bg-[#0F172A] text-[#0F172A] dark:text-white flex h-screen w-screen overflow-hidden antialiased font-['Poppins',sans-serif] transition-colors duration-300">
      
      {/* ====================================================
          COMPACT SIDEBAR 
          ==================================================== */}
      <motion.aside
        initial={{ width: sidebarCollapsed ? '4.5rem' : '14rem' }}
        animate={{ width: sidebarCollapsed ? '4.5rem' : '14rem' }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={`bg-white border-r border-[#E2E8F0] dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/60 dark:border-emerald-900/30 flex-shrink-0 flex flex-col fixed inset-y-0 left-0 z-50 lg:relative shadow-sm dark:shadow-[8px_0_30px_rgba(0,0,0,0.15)] transition-all duration-200 ${sidebarOpen ? '!translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Sidebar Header / Logo */}
        <div className="flex h-[76px] items-center justify-between px-4 shrink-0 relative z-10 border-b border-[#E2E8F0]/60 dark:border-emerald-900/40">
          <Link
            to="/admin/dashboard"
            className="flex items-center gap-2.5 no-underline outline-none group"
            onClick={() => !sidebarCollapsed && setSidebarCollapsed(true)}
          >
            {academy?.logo_url ? (
              <img
                src={`${academy.logo_url}?t=${Date.now()}`}
                alt="Academy Logo"
                className="h-8 w-8 rounded-lg object-cover border border-[#E2E8F0] dark:border-emerald-900/50 shadow-sm transition-transform hover:scale-105 cursor-pointer bg-white dark:bg-slate-900"
              />
            ) : (
              <motion.div whileHover={{ scale: 1.05 }} className="bg-gradient-to-br from-[#27C34A] to-[#84D400] dark:from-lime-400 dark:to-lime-500 text-white dark:text-slate-950 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-black tracking-tighter shadow-sm relative overflow-hidden">
                {academy?.name ? academy.name.substring(0, 2).toUpperCase() : PRODUCT_LOGO}
              </motion.div>
            )}
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: sidebarCollapsed ? 0 : 1, display: sidebarCollapsed ? 'none' : 'block' }}
              transition={{ duration: 0.15 }}
              className="flex flex-col"
            >
              <span className="font-bold tracking-tight text-[#0F172A] dark:text-white text-[16px] whitespace-nowrap leading-tight uppercase">
                {academy?.name || <>{PRODUCT_NAME.split(' ')[0]} <span className="text-[#5BC61E] dark:text-lime-400">PRO</span></>}
              </span>
            </motion.div>
          </Link>
          <button
            type="button"
            className="hidden h-6 w-6 items-center justify-center rounded-md text-[#64748B] hover:bg-[#F4FFE9] hover:text-[#5BC61E] dark:text-emerald-500/70 dark:hover:bg-white/10 dark:hover:text-lime-400 lg:flex shrink-0 transition-all duration-150"
            onClick={() => setSidebarCollapsed((c) => !c)}
          >
            {sidebarCollapsed ? <ChevronRight size={16} strokeWidth={2.5} /> : <ChevronLeft size={16} strokeWidth={2.5} />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar relative z-10">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={`/admin/${item.path}`}
                end
                onClick={closeMobileSidebar}
                className={({ isActive }) =>
                  `relative flex w-full items-center gap-3 py-2 px-3 text-[14px] transition-all duration-150 rounded-[12px] group ${
                    sidebarCollapsed ? 'justify-center px-0' : ''
                  } ${
                    isActive
                      // Premium Light Active: Gradient green, white text, soft shadow | Dark Active: Lime background, dark text (Preserved)
                      ? 'bg-[linear-gradient(90deg,#27C34A,#84D400)] text-white shadow-[0_4px_10px_rgba(34,197,94,0.3)] font-medium dark:!bg-none dark:bg-lime-400 dark:text-slate-950 dark:shadow-[0_4px_20px_rgba(132,204,22,0.3)] dark:translate-x-1'
                      // Premium Light Inactive: Soft hover green | Dark Inactive: Slate to lime hover
                      : 'text-[#64748B] hover:bg-[#F4FFE9] hover:text-[#27C34A] dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-lime-300'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Perfect Center Icon Alignment */}
                    <div className="flex items-center justify-center h-8 w-8 shrink-0 transition-transform duration-150 group-hover:scale-105">
                      <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white dark:text-slate-950' : `${item.color} dark:text-slate-400`} />
                    </div>
                    
                    {!sidebarCollapsed && (
                      <span className={`font-medium tracking-wide transition-colors duration-150 ${isActive ? 'text-white dark:text-slate-950' : 'text-[#64748B] group-hover:text-[#27C34A] dark:text-slate-400 dark:group-hover:text-lime-300'}`}>
                        {item.label}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer / Actions */}
        <div className="p-3 relative z-10 bg-transparent border-t border-[#E2E8F0]/60 dark:border-emerald-900/40 space-y-1">
          <motion.button
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }} 
            type="button"
            className={`w-full flex justify-center items-center rounded-[12px] text-[13px] py-1.5 font-medium transition-all duration-150 overflow-hidden relative group bg-white text-[#64748B] hover:text-[#27C34A] hover:bg-[#F4FFE9] border border-[#E2E8F0] shadow-sm dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white dark:border-transparent`}
          >
            <Link to="/" className="text-inherit no-underline flex items-center justify-center gap-2 w-full">
              <Home size={14} strokeWidth={2.5} />
              {!sidebarCollapsed && <span>Back to Home</span>}
            </Link>
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }} 
            type="button" 
            onClick={handleLogout} 
            title={sidebarCollapsed ? "Sign Out" : undefined}
            className={`w-full flex justify-center items-center gap-2 rounded-[12px] text-[14px] py-2 font-medium transition-all duration-150 overflow-hidden relative group ${
              sidebarCollapsed ? 'text-[#64748B] hover:text-[#EF4444] dark:text-slate-500 dark:hover:text-red-400' : 'bg-white text-[#64748B] hover:text-[#EF4444] hover:bg-red-50 hover:border-red-100 border border-[#E2E8F0] shadow-sm dark:bg-white/5 dark:text-slate-300 dark:hover:bg-red-500 dark:hover:text-white dark:hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] dark:border-transparent'
            }`}
          >
            <LogOut size={16} strokeWidth={2.5} className="group-hover:text-[#EF4444] dark:group-hover:text-white transition-colors duration-150" />
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
            transition={{ duration: 0.2 }}
            type="button"
            className="fixed inset-0 z-40 bg-[#0F172A]/40 backdrop-blur-sm dark:bg-slate-950/80 lg:hidden cursor-default outline-none"
            onClick={closeMobileSidebar}
          />
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto relative bg-transparent">
        
        {/* ====================================================
            LAYERED SPORTS BACKGROUND WATERMARK 
            ==================================================== */}
        <div 
          className="fixed inset-0 pointer-events-none z-0 dark:hidden" 
          style={{ backgroundImage: 'linear-gradient(135deg, #FBFFF8, #F4FFE9, #FBFFF8)' }}
        >
          {/* Subtle 2% Watermark Icons */}
          <div className="absolute top-10 left-10 text-[#0F172A] opacity-[0.02] transform -rotate-12"><Activity size={200} /></div>
          <div className="absolute bottom-20 right-10 text-[#0F172A] opacity-[0.02] transform rotate-12"><Dumbbell size={240} /></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#0F172A] opacity-[0.015]"><CircleDot size={400} /></div>
        </div>
        
        {/* ====================================================
            PREMIUM GREEN GRADIENT NAVBAR (Hamburger Removed Desktop)
            ==================================================== */}
        <div className="px-4 pt-3 z-30 sticky top-0 max-w-[1450px] mx-auto w-full">
          <header className="bg-gradient-to-r from-[#21B94D] via-[#5BC61E] to-[#84D400] h-[60px] rounded-[16px] shadow-[0_4px_20px_rgba(34,197,94,0.15)] flex items-center justify-between px-5 border border-[#84D400]/20 backdrop-blur-md">
            
            <div className="flex items-center gap-3">
              <motion.button type="button" className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/20 lg:hidden text-white hover:bg-white/20 transition-all" onClick={() => setSidebarOpen(true)}>
                <Menu size={16} strokeWidth={2.5} />
              </motion.button>
              
              {/* Hierarchical User Info (Shifted Left natively) */}
              <div className="flex flex-col justify-center">
                <span className="text-[10px] font-bold tracking-widest text-white/90 uppercase leading-none mb-1">
                  ADMIN HQ
                </span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center text-[9px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm backdrop-blur-sm border border-white/20">
                    Admin
                  </span>
                  <span className="text-[16px] font-bold tracking-tight text-white capitalize leading-none">
                    {adminUser?.name || 'Loading...'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5">
              {/* Broadcast Button */}
              <motion.div whileHover={{ scale: 1.05 }} className="relative bg-white/90 shadow-sm h-[44px] w-[44px] rounded-full flex items-center justify-center text-[#0F172A] hover:bg-[#F4FFE9] hover:text-[#5BC61E] transition-all duration-150 cursor-pointer" onClick={() => setBroadcastModalOpen(true)}>
                <Megaphone size={18} strokeWidth={2.5} />
              </motion.div>
              
              {/* Notification Button */}
              <motion.div whileHover={{ scale: 1.05 }} className="relative bg-white/90 shadow-sm h-[44px] w-[44px] rounded-full flex items-center justify-center text-[#0F172A] hover:bg-[#F4FFE9] hover:text-[#5BC61E] transition-all duration-150 cursor-pointer group">
                <div className="absolute top-2.5 right-2.5 h-2 w-2 bg-[#EF4444] rounded-full border-2 border-white"></div>
                <NotificationBell userRole="ACADEMY_ADMIN" className="group-hover:text-[#5BC61E]" />
              </motion.div>
              
              {/* Theme Toggle */}
              <motion.div whileHover={{ scale: 1.05 }} className="bg-white/90 shadow-sm h-[44px] w-[44px] rounded-full flex items-center justify-center text-[#0F172A] hover:bg-[#FFFBEB] hover:text-[#F59E0B] transition-all duration-150 cursor-pointer">
                <ThemeToggle />
              </motion.div>
            </div>
          </header>
        </div>

        {/* ====================================================
            COMPACT BODY AREA
            ==================================================== */}
        <main className="flex-1 min-w-0 overflow-x-hidden relative flex flex-col">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="w-full h-full min-w-0 flex flex-col p-3 lg:p-4 relative z-10 max-w-[1450px] mx-auto">
            <Outlet />
          </motion.div>
        </main>
      </div>

      <BroadcastModal
        isOpen={broadcastModalOpen}
        onClose={() => setBroadcastModalOpen(false)}
        batches={batches}
      />
    </div>
  );
}