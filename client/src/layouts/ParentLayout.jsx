import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import NotificationBell from '../components/NotificationBell';
import { SIDEBAR_COLLAPSED_KEY } from '../api/client';

// FIXED: Removed Dribbble. Using safely existing icons.
import { 
  Target, CalendarDays, Trophy, Ticket, Megaphone, Dumbbell, LogOut, ChevronLeft, ChevronRight, Activity, CircleDot
} from 'lucide-react';

const PRODUCT_LOGO = 'SP';

const PARENT_NAV_ITEMS = [
  { path: 'dashboard', label: 'Dashboard', icon: Target, color: 'text-[#2563EB]' },
  { path: 'attendance', label: 'Attendance', icon: CalendarDays, color: 'text-[#16A34A]' },
  { path: 'performance', label: 'Performance', icon: Trophy, color: 'text-[#8B5CF6]' },
  { path: 'fees', label: 'Fees', icon: Ticket, color: 'text-[#F97316]' },
  { path: 'announcements', label: 'Announcements', icon: Megaphone, color: 'text-[#F59E0B]' },
  { path: 'settings', label: 'Settings', icon: Dumbbell, color: 'text-[#64748B]' },
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
        if (data.data?.length > 0) setSelectedChild(data.data[0]);
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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'GOOD MORNING' : hour < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING';
  const initials = user?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'P';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4FFE9] dark:bg-[#0F172A] font-['Poppins',sans-serif] transition-colors duration-500">
        <div className="text-center flex flex-col items-center">
          <motion.div animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-[#5BC61E] mb-3">
            <Activity size={32} strokeWidth={2.5} />
          </motion.div>
          <p className="text-[12px] text-[#64748B] dark:text-slate-500 font-semibold tracking-wider uppercase">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4FFE9] dark:bg-[#0F172A] font-['Poppins',sans-serif] transition-colors duration-500">
        <div className="text-center"><p className="text-[#EF4444] text-[14px] font-medium">Session expired. Redirecting...</p></div>
      </div>
    );
  }

  return (
    <div className="bg-[#FBFFF8] dark:bg-[#0F172A] text-[#0F172A] dark:text-white flex h-screen w-screen overflow-hidden antialiased font-['Poppins',sans-serif] transition-colors duration-300">
      
      {/* ====================================================
          COMPACT SIDEBAR 
          ==================================================== */}
      <motion.aside
        initial={{ width: sidebarCollapsed ? '4.5rem' : '14rem' }}
        animate={{ width: sidebarCollapsed ? '4.5rem' : '14rem' }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-white border-r border-[#E2E8F0] dark:bg-gradient-to-b dark:from-[#071A2E] dark:via-[#0F172A] dark:to-[#101828] flex-shrink-0 flex flex-col fixed inset-y-0 left-0 z-50 lg:relative shadow-sm dark:shadow-[8px_0_30px_rgba(0,0,0,0.15)] dark:border-r-0"
      >
        <div className="flex h-[76px] items-center justify-between px-4 shrink-0 relative z-10 border-b border-[#E2E8F0]/60 dark:border-transparent">
          <Link to="/parent/dashboard" className="flex items-center gap-2.5 no-underline outline-none group" onClick={() => !sidebarCollapsed && setSidebarCollapsed(true)}>
            <motion.div whileHover={{ scale: 1.05 }} className="bg-gradient-to-br from-[#27C34A] to-[#84D400] text-white flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-black tracking-tighter shadow-sm relative overflow-hidden">
              {PRODUCT_LOGO}
            </motion.div>
            <motion.div initial={{ opacity: 1 }} animate={{ opacity: sidebarCollapsed ? 0 : 1, display: sidebarCollapsed ? 'none' : 'block' }} transition={{ duration: 0.15 }} className="flex flex-col">
              <span className="font-bold tracking-tight text-[#0F172A] dark:text-white text-[16px] whitespace-nowrap leading-tight">Sports <span className="text-[#5BC61E]">Pro</span></span>
            </motion.div>
          </Link>
          <button type="button" className="hidden h-6 w-6 items-center justify-center rounded-md text-[#64748B] hover:bg-[#F4FFE9] hover:text-[#5BC61E] lg:flex shrink-0 transition-all duration-150" onClick={() => setSidebarCollapsed((c) => !c)}>
            {sidebarCollapsed ? <ChevronRight size={16} strokeWidth={2.5} /> : <ChevronLeft size={16} strokeWidth={2.5} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar relative z-10">
          {PARENT_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.path} to={`/parent/${item.path}`} end
                className={({ isActive }) =>
                  `relative flex w-full items-center gap-3 py-2 px-3 text-[14px] transition-all duration-150 rounded-[12px] group ${
                    sidebarCollapsed ? 'justify-center px-0' : ''
                  } ${
                    isActive
                      ? 'bg-[linear-gradient(90deg,#27C34A,#84D400)] text-white shadow-[0_4px_10px_rgba(34,197,94,0.3)] font-medium'
                      : 'text-[#64748B] hover:bg-[#F4FFE9] hover:text-[#27C34A]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center justify-center h-8 w-8 shrink-0 transition-transform duration-150 group-hover:scale-105">
                      <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : item.color} />
                    </div>
                    
                    {!sidebarCollapsed && (
                      <span className={`font-medium tracking-wide transition-colors duration-150 ${isActive ? 'text-white' : 'text-[#64748B] group-hover:text-[#27C34A]'}`}>
                        {item.label}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 relative z-10 bg-transparent border-t border-[#E2E8F0]/60 dark:border-transparent">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={handleLogout} title={sidebarCollapsed ? "Sign Out" : undefined}
            className={`w-full flex justify-center items-center gap-2 rounded-[12px] text-[14px] py-2 font-medium transition-all duration-150 overflow-hidden relative group ${
              sidebarCollapsed ? 'text-[#64748B] hover:text-[#EF4444]' : 'bg-white text-[#64748B] hover:text-[#EF4444] hover:bg-red-50 hover:border-red-100 border border-[#E2E8F0] shadow-sm'
            }`}
          >
            <LogOut size={16} strokeWidth={2.5} className="group-hover:text-[#EF4444] transition-colors duration-150" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </motion.button>
        </div>
      </motion.aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto relative bg-transparent">
        
        {/* ====================================================
            LAYERED SPORTS BACKGROUND WATERMARK 
            ==================================================== */}
        <div 
          className="fixed inset-0 pointer-events-none z-0 dark:hidden" 
          style={{ backgroundImage: 'linear-gradient(135deg, #FBFFF8, #F4FFE9, #FBFFF8)' }}
        >
          {/* FIXED: Replaced Dribbble with safely imported icons */}
          <div className="absolute top-10 left-10 text-[#0F172A] opacity-[0.02] transform -rotate-12"><Activity size={200} /></div>
          <div className="absolute bottom-20 right-10 text-[#0F172A] opacity-[0.02] transform rotate-12"><Dumbbell size={240} /></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#0F172A] opacity-[0.015]"><CircleDot size={400} /></div>
        </div>
        
        {/* ====================================================
            PREMIUM GREEN GRADIENT NAVBAR 
            ==================================================== */}
        <div className="px-4 pt-3 z-30 sticky top-0 max-w-[1450px] mx-auto w-full">
          <header className="bg-gradient-to-r from-[#21B94D] via-[#5BC61E] to-[#84D400] h-[60px] rounded-[16px] shadow-[0_4px_20px_rgba(34,197,94,0.15)] flex items-center justify-between px-5 border border-[#84D400]/20 backdrop-blur-md">
            
            <div className="flex items-center gap-3">
              <div className="flex flex-col justify-center">
                <span className="text-[10px] font-bold tracking-widest text-white/90 uppercase leading-none mb-1">
                  {greeting}
                </span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center text-[9px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm backdrop-blur-sm border border-white/20">
                    Parent
                  </span>
                  <span className="text-[16px] font-bold tracking-tight text-white capitalize leading-none">
                    {user?.name || 'Parent'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5">
              <motion.div whileHover={{ scale: 1.05 }} className="relative bg-white/90 shadow-sm h-[44px] w-[44px] rounded-full flex items-center justify-center text-[#0F172A] hover:bg-[#F4FFE9] hover:text-[#5BC61E] transition-all duration-150 cursor-pointer group">
                <div className="absolute top-2.5 right-2.5 h-2 w-2 bg-[#EF4444] rounded-full border-2 border-white"></div>
                <NotificationBell userRole="PARENT" className="group-hover:text-[#5BC61E]" />
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.05 }} className="bg-white/90 shadow-sm h-[44px] w-[44px] rounded-full flex items-center justify-center text-[#0F172A] hover:bg-[#FFFBEB] hover:text-[#F59E0B] transition-all duration-150 cursor-pointer">
                <ThemeToggle />
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.05 }} className="h-[44px] w-[44px] rounded-full bg-white/90 p-0.5 shadow-sm border-[2.5px] border-[#84D400] cursor-pointer">
                <div className="h-full w-full rounded-full bg-white/50 flex items-center justify-center text-[13px] font-bold text-[#0F172A]">{initials}</div>
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
    </div>
  );
}

export default function ParentLayout() {
  return <ParentLayoutShell />;
}