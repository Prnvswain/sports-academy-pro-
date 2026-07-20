import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import Navbar, { NavbarActions } from '../components/Navbar';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { PRICING_PLANS, publicPost } from '../api/client';
import {
  Trophy,
  Users,
  CalendarClock,
  ShieldCheck,
  TrendingUp,
  Bell,
  CreditCard,
  ChevronDown,
  Star,
  ArrowRight,
  CheckCircle2,
  Activity,
  Building2,
  Quote,
} from 'lucide-react';

const initialContact = {
  name: '',
  email: '',
  phone: '',
  message: '',
};

// Sports Theme - Deep Navy & Vibrant Lime Green
const SPORTS = [
  { name: 'Cricket', icon: '🏏', bg: 'bg-slate-800', shadow: 'hover:shadow-lime-500/20 hover:border-lime-500' },
  { name: 'Football', icon: '⚽', bg: 'bg-slate-800', shadow: 'hover:shadow-lime-500/20 hover:border-lime-500' },
  { name: 'Basketball', icon: '🏀', bg: 'bg-slate-800', shadow: 'hover:shadow-lime-500/20 hover:border-lime-500' },
  { name: 'Tennis', icon: '🎾', bg: 'bg-slate-800', shadow: 'hover:shadow-lime-500/20 hover:border-lime-500' },
  { name: 'Badminton', icon: '🏸', bg: 'bg-slate-800', shadow: 'hover:shadow-lime-500/20 hover:border-lime-500' },
  { name: 'Swimming', icon: '🏊', bg: 'bg-slate-800', shadow: 'hover:shadow-lime-500/20 hover:border-lime-500' },
];

const FACILITIES = [
  {
    title: 'Professional Turf & Nets',
    desc: 'High-grade seasonal multi-lane training spaces built for elite conditioning.',
    icon: '🏟️',
    color: 'text-lime-500',
    bg: 'bg-white dark:bg-slate-800',
    border: 'border-slate-200 dark:border-slate-700',
  },
  {
    title: 'Fitness & Recovery Zone',
    desc: 'Dedicated sports science and athletic recovery hubs for every squad.',
    icon: '🏋️‍♂️',
    color: 'text-slate-900 dark:text-white',
    bg: 'bg-lime-50 dark:bg-lime-900/10',
    border: 'border-lime-200 dark:border-lime-900/30',
  },
  {
    title: 'Locker Rooms & Hydration Stations',
    desc: 'Smart sanitization loops and specialized player amenities on tap.',
    icon: '💧',
    color: 'text-lime-500',
    bg: 'bg-white dark:bg-slate-800',
    border: 'border-slate-200 dark:border-slate-700',
  },
  {
    title: 'Parent Viewing Gallery',
    desc: 'Premium elevated spaces for training observation, every session.',
    icon: '👥',
    color: 'text-slate-900 dark:text-white',
    bg: 'bg-lime-50 dark:bg-lime-900/10',
    border: 'border-lime-200 dark:border-lime-900/30',
  },
];

const FEATURES = [
  {
    title: 'Academy Command',
    desc: 'Provision professional coach workspaces, register student paths, and oversee audit-grade execution records.',
    icon: Building2,
    iconColor: 'text-slate-900',
    titleColor: 'text-slate-900',
    descColor: 'text-slate-800',
    bg: 'bg-lime-400',
    shadow: 'hover:shadow-lime-500/30 hover:-translate-y-2',
  },
  {
    title: 'Smart Batch Flows',
    desc: 'Automate schedule conflict isolation, map team capacities, and cross-validate sport availability.',
    icon: CalendarClock,
    iconColor: 'text-lime-400',
    titleColor: 'text-white',
    descColor: 'text-slate-300',
    bg: 'bg-slate-800',
    shadow: 'hover:shadow-slate-900/30 hover:-translate-y-2',
  },
  {
    title: 'Coach Portals',
    desc: 'Log attendance in seconds, with automated condition alerts delivered straight to parent inboxes.',
    icon: Bell,
    iconColor: 'text-slate-900',
    titleColor: 'text-slate-900',
    descColor: 'text-slate-800',
    bg: 'bg-lime-400',
    shadow: 'hover:shadow-lime-500/30 hover:-translate-y-2',
  },
  {
    title: 'Secure Architecture',
    desc: 'Relational-database backed infrastructure, engineered for high-performance joins at scale.',
    icon: ShieldCheck,
    iconColor: 'text-lime-400',
    titleColor: 'text-white',
    descColor: 'text-slate-300',
    bg: 'bg-slate-800',
    shadow: 'hover:shadow-slate-900/30 hover:-translate-y-2',
  },
];

const TESTIMONIALS = [
  ['Rajesh K.', 'Parent', 'Attendance alerts give us peace of mind every training day. Highly recommended.', '👥', 'border-t-lime-500'],
  ['Coach Meera', 'Head Coach', 'Batch scheduling and fee tracking saved hours every week. A must-have tool.', '📋', 'border-t-slate-800'],
  ['Elite Sports Club', 'Academy Admin', 'We scaled from one branch to three without spreadsheets. Pure efficiency.', '⚡', 'border-t-lime-500'],
];

const FAQS = [
  {
    q: 'Can I run multiple academy branches from one account?',
    a: 'Yes. Sports Academy Pro is built multi-tenant from the ground up, so you can operate several branches, each with its own coaches, batches, and attendance zones, under a single admin login.',
  },
  {
    q: 'How does GPS attendance verification work?',
    a: 'When you set your academy location during signup, we store the exact coordinates and your chosen radius. Coaches can only mark attendance when they are physically within that radius, keeping your records honest.',
  },
  {
    q: 'Can I change my subscription plan later?',
    a: 'Absolutely. You can upgrade from Free to Pro or Plus at any time as your coach and student count grows, directly from your admin dashboard.',
  },
  {
    q: 'Is my academy data secure?',
    a: 'Every workspace is isolated at the database level, with encrypted credentials and audit-tracked changes across coaches, batches, and payment records.',
  },
];

function CountUp({ target, suffix = '', duration = 1400 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = null;
    let frame;
    const step = (timestamp) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [inView, target, duration]);

  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  );
}

function LaneLines({ className = '' }) {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full opacity-10 mix-blend-overlay ${className}`}
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      {[12, 28, 44, 60, 76, 92].map((y) => (
        <line
          key={y}
          x1="0"
          y1={y}
          x2="100"
          y2={y}
          stroke="currentColor"
          strokeWidth="0.2"
          strokeDasharray="2 4"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const staggerParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { isInstallable, promptInstall } = usePwaInstall();

  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);

  useEffect(() => {
    const fetchPublicPlans = async () => {
      try {
        const response = await fetch('/api/v1/public/plans');
        const data = await response.json();
        if (data.success) {
          setPlans(data.data);
        } else {
          setPlans(PRICING_PLANS);
        }
      } catch (err) {
        console.error('Failed to load public plans:', err);
        setPlans(PRICING_PLANS);
      } finally {
        setPlansLoading(false);
      }
    };
    fetchPublicPlans();
  }, []);

  const [contactForm, setContactForm] = useState(() => {
    const savedDraft = localStorage.getItem('sams_draft_public_contact');
    return savedDraft ? JSON.parse(savedDraft) : initialContact;
  });
  const [contactLoading, setContactLoading] = useState(false);
  const [contactMessage, setContactMessage] = useState({ text: '', type: '' });
  const [activeModal, setActiveModal] = useState(null);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    localStorage.setItem('sams_draft_public_contact', JSON.stringify(contactForm));
  }, [contactForm]);

  const selectPlan = (planId) => {
    navigate('/signup');
  };

  const clearFormState = () => {
    setContactForm(initialContact);
    localStorage.removeItem('sams_draft_public_contact');
    setActiveModal(null);
  };

  const handleContactChange = (event) => {
    const { name, value } = event.target;
    setContactForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleContactSubmit = async (event) => {
    event.preventDefault();
    setContactLoading(true);
    setContactMessage({ text: '', type: '' });
    try {
      const result = await publicPost('/public/contact', {
        name: contactForm.name.trim(),
        email: contactForm.email.trim(),
        phone: contactForm.phone.trim() || undefined,
        message: contactForm.message.trim(),
      });
      setContactMessage({ text: result.message, type: 'success' });
      setContactForm(initialContact);
      localStorage.removeItem('sams_draft_public_contact');
    } catch (error) {
      setContactMessage({ text: error.message, type: 'error' });
    } finally {
      setContactLoading(false);
    }
  };

  const handleSecretGateway = () => {
    window.location.href = '/super-admin/login';
  };

  const inputThemeStyles =
    'w-full rounded-none bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-700 p-3 focus:border-lime-500 focus:ring-0 focus:outline-none transition-all duration-300 text-sm font-medium shadow-sm';

  return (
    <div className="bg-slate-50 text-slate-900 font-sans overflow-x-hidden selection:bg-lime-400 selection:text-slate-900">
      
      {/* NAVIGATION HEADER */}
      <Navbar>
        <nav className="hidden items-center gap-5 md:flex">
          {['About', 'Features', 'Sports', 'Pricing', 'Testimonials', 'Contact'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-slate-700 hover:text-lime-600 dark:text-slate-200 relative text-xs font-black uppercase tracking-wider transition-colors group"
            >
              {item}
              <span className="absolute -bottom-1.5 left-0 h-0.5 w-0 bg-lime-500 transition-all duration-300 group-hover:w-full"></span>
            </a>
          ))}
        </nav>
        <NavbarActions>
          {isInstallable && (
            <button
              type="button"
              className="hidden sm:block rounded bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-800 transition-all hover:bg-slate-200"
              onClick={promptInstall}
            >
              Install App
            </button>
          )}
          <button
            type="button"
            className="rounded border-2 border-slate-900 dark:border-white px-4 py-1 text-xs font-black uppercase tracking-wider transition-all hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900"
            onClick={() => navigate('/login')}
          >
            Login
          </button>
          <button
            type="button"
            className="rounded bg-lime-500 px-5 py-1.5 text-xs font-black uppercase tracking-wider text-slate-900 shadow-md transition-all hover:-translate-y-0.5 hover:bg-lime-400"
            onClick={() => navigate('/signup')}
          >
            Sign Up
          </button>
        </NavbarActions>
      </Navbar>

      {/* COMPACT HERO SECTION */}
      <section className="relative overflow-hidden bg-slate-900 pt-24 pb-20 sm:pt-28 sm:pb-28 lg:pt-32 lg:pb-32 text-white z-0">
        
        {/* Backgrounds & Floating Icons - Icons Repositioned */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <LaneLines className="text-white opacity-10" />
          
          <motion.div
            className="absolute left-[8%] top-[12%] text-4xl sm:text-6xl drop-shadow-2xl opacity-60 z-10"
            animate={{ rotate: 360, y: [0, -15, 0] }}
            transition={{ rotate: { duration: 25, repeat: Infinity, ease: 'linear' }, y: { duration: 4, repeat: Infinity, ease: 'easeInOut' } }}
          >
            ⚽
          </motion.div>
          {/* Badminton moved to middle-right so it is visible beside the text/box */}
          <motion.div
            className="absolute right-[45%] top-[18%] text-4xl sm:text-6xl drop-shadow-2xl opacity-60 z-10"
            animate={{ scale: [1, 1.1, 1], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            🏸
          </motion.div>
          <motion.div
            className="absolute left-[20%] bottom-[15%] text-5xl sm:text-7xl drop-shadow-2xl opacity-50 z-10"
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            🏀
          </motion.div>
          {/* Tennis moved up and far right to avoid the box */}
          <motion.div
            className="absolute right-[4%] bottom-[45%] text-4xl sm:text-6xl drop-shadow-2xl opacity-60 z-10"
            animate={{ rotate: -360, x: [0, -15, 0] }}
            transition={{ rotate: { duration: 30, repeat: Infinity, ease: 'linear' }, x: { duration: 5, repeat: Infinity, ease: 'easeInOut' } }}
          >
            🎾
          </motion.div>

          {/* Neon Green Diagonal Slice */}
          <div 
            className="absolute top-0 right-0 h-full w-full sm:w-[70%] bg-lime-500 origin-top-right transition-transform" 
            style={{ clipPath: 'polygon(25% 0, 100% 0, 100% 100%, 0% 100%)' }}>
          </div>
          <div 
            className="absolute top-0 right-0 h-full w-full sm:w-[70%] bg-slate-900/40 mix-blend-multiply" 
            style={{ clipPath: 'polygon(45% 0, 100% 0, 100% 100%, 15% 100%)' }}>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-20 w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid items-center gap-10 lg:grid-cols-2">
          
          <motion.div variants={staggerParent} initial="hidden" animate="show" className="space-y-6">
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded bg-slate-800/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-lime-400 border border-slate-700 backdrop-blur-md"
            >
              <span className="h-2 w-2 rounded-full bg-lime-400 shadow-[0_0_8px_#a3e635] animate-pulse" />
              Sports Academy Pro
            </motion.span>

            <motion.h1
              variants={fadeUp}
              className="text-white text-4xl sm:text-5xl lg:text-[3.25rem] leading-[1.1] font-black uppercase tracking-tight drop-shadow-md"
            >
              The Complete <br />
              <span className="text-lime-400 drop-shadow-lg">Sports Academy</span> <br />
              Platform
            </motion.h1>

            <motion.p variants={fadeUp} className="text-white/95 max-w-lg text-base sm:text-lg font-medium leading-relaxed drop-shadow-sm">
              Onboard your multi-tenant sports academy in moments. Seamlessly orchestrate elite coaches, dynamic student batches, payment tracking, and real-time parent notifications.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-4 pt-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/signup')}
                className="inline-flex items-center gap-3 rounded bg-lime-500 px-6 py-3 text-sm font-black uppercase tracking-wider text-slate-900 shadow-xl shadow-lime-500/20 transition-all hover:bg-lime-400"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </motion.button>
              {isInstallable && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={promptInstall}
                  className="rounded border-2 border-slate-500 bg-slate-800/80 px-6 py-3 text-sm font-black uppercase tracking-wider text-white backdrop-blur transition-all hover:bg-slate-700 hover:border-slate-400"
                >
                  Install App System
                </motion.button>
              )}
            </motion.div>
          </motion.div>

          {/* DASHBOARD WIDGET PREVIEW (More Content Added) */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative lg:ml-auto w-full max-w-lg"
          >
            <div className="relative overflow-hidden rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-900 border-l-8 border-lime-500 transform lg:rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded bg-slate-900 text-lime-400 shadow-inner">
                    <Activity className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-black tracking-wide text-slate-900 dark:text-white uppercase">Academy Command</span>
                </div>
                <span className="rounded bg-lime-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-lime-700">Live</span>
              </div>

              {/* Stats Row */}
              <div className="mb-4 grid grid-cols-3 gap-2">
                {[
                  { label: 'Attendance', val: '96%' },
                  { label: 'Coaches', val: '18' },
                  { label: 'Students', val: '312' },
                ].map((s) => (
                  <div key={s.label} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2 text-center border border-slate-100 dark:border-slate-700">
                    <div className="text-lg font-black text-slate-900 dark:text-lime-400">{s.val}</div>
                    <div className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Weekly Target Progress - New Content */}
              <div className="mb-4 space-y-1.5 px-1">
                <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-slate-500">
                  <span>Weekly Sessions Target</span>
                  <span className="text-lime-600 dark:text-lime-400">85%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-lime-500 shadow-[0_0_10px_#a3e635]" style={{ width: '85%' }}></div>
                </div>
              </div>

              {/* List Items */}
              <div className="space-y-2">
                {[
                  { name: 'U-14 Cricket Batch', tag: 'On time', icon: Trophy, bg: 'bg-lime-100 dark:bg-lime-900/30', color: 'text-lime-700 dark:text-lime-400' },
                  { name: 'Coach Checked in', tag: 'Verified', icon: CheckCircle2, bg: 'bg-slate-100 dark:bg-slate-800', color: 'text-slate-700 dark:text-slate-300' },
                  // Extra list item added
                  { name: 'New Enrolment', tag: 'Today', icon: Users, bg: 'bg-slate-100 dark:bg-slate-800', color: 'text-slate-700 dark:text-slate-300' },
                ].map((row) => (
                  <div key={row.name} className="flex items-center gap-3 rounded-lg bg-white dark:bg-slate-900 p-2.5 border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${row.bg}`}>
                      <row.icon className={`h-4 w-4 ${row.color}`} />
                    </div>
                    <span className="flex-1 text-xs font-bold text-slate-800 dark:text-slate-200">{row.name}</span>
                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">{row.tag}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Trust Badge */}
            <div className="absolute -bottom-5 -left-5 hidden sm:flex items-center gap-3 rounded-lg bg-white p-3 shadow-xl dark:bg-slate-800 border border-slate-100 dark:border-slate-700 z-10">
               <div className="flex -space-x-2.5">
                {['bg-slate-900', 'bg-lime-500', 'bg-slate-700'].map((c, i) => (
                  <div key={i} className={`h-8 w-8 rounded-full border-2 border-white dark:border-slate-800 ${c}`} />
                ))}
              </div>
              <div>
                <div className="text-xs font-black text-slate-900 dark:text-white uppercase">500+ Academies</div>
                <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 dark:text-slate-400">
                  <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" /> 4.9 Rating
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* STATS BANNER */}
      <section className="relative z-30 py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, type: 'spring' }}
          className="grid grid-cols-2 md:grid-cols-4 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 divide-x divide-y md:divide-y-0 divide-slate-100 dark:divide-slate-700 overflow-hidden"
        >
          {[
            { val: 500, suffix: '+', label: 'Academies', icon: Building2 },
            { val: 12000, suffix: '+', label: 'Athletes', icon: Users },
            { val: 98, suffix: '%', label: 'Accuracy', icon: TrendingUp },
            { val: 40000, suffix: '+', label: 'Payments', icon: CreditCard },
          ].map((s, i) => (
            <div 
              key={s.label} 
              className="p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
            >
              <s.icon className="h-7 w-7 mx-auto mb-3 text-slate-300 dark:text-slate-500 group-hover:text-lime-500 transition-colors" />
              <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                <CountUp target={s.val} suffix={s.suffix} />
              </div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-lime-400">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ABOUT SECTION */}
      <section id="about" className="px-4 py-16 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900/50">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          className="mx-auto max-w-4xl text-center space-y-5"
        >
          <p className="inline-block rounded bg-lime-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-lime-700 dark:bg-lime-900/30 dark:text-lime-400">Why Sports Academy Pro</p>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white uppercase">Unified Operations Framework</h2>
          <div className="mx-auto h-1 w-16 bg-lime-500" />
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed font-medium">
            Sports Academy Pro resolves structural fragmentation within sports organizations. We connect coach schedules, automated parental confirmation pipelines, and structural transaction ledger tracking under a single secure, responsive workspace.
          </p>
        </motion.div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="px-4 py-16 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl uppercase">Everything Runs From One Place</h2>
        </div>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerParent}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {FEATURES.map((f) => (
            <motion.article
              key={f.title}
              variants={fadeUp}
              className={`${f.bg} ${f.shadow} group relative flex flex-col justify-between rounded-xl p-6 transition-all duration-300 border border-transparent`}
            >
              <div>
                <f.icon className={`h-7 w-7 mb-5 opacity-90 transform group-hover:scale-110 transition-transform ${f.iconColor}`} />
                <h3 className={`mb-2 text-lg font-black tracking-tight uppercase ${f.titleColor}`}>{f.title}</h3>
                <p className={`text-xs font-medium opacity-90 leading-relaxed ${f.descColor}`}>{f.desc}</p>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </section>

      {/* DIAGONAL BANNER - SPORTS STREAMS */}
      <section id="sports" className="relative bg-slate-900 py-24 mt-12 mb-12 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-lime-500 opacity-5" style={{ clipPath: 'polygon(0 0, 40% 0, 60% 100%, 0% 100%)' }}></div>
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            className="mb-12 text-center"
          >
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-lime-400">Multi-Sport Ready</p>
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl uppercase">Sports Streams Offered</h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            variants={staggerParent}
            className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
          >
            {SPORTS.map((sport) => (
              <motion.article
                key={sport.name}
                variants={fadeUp}
                whileHover={{ y: -6, scale: 1.05 }}
                className={`group cursor-pointer rounded bg-slate-800 p-6 text-center transition-all border-b-4 border-slate-700 ${sport.shadow}`}
              >
                <div className="mb-3 text-4xl transform group-hover:rotate-12 transition-transform drop-shadow-md">{sport.icon}</div>
                <div className="text-xs font-black uppercase tracking-wide text-white group-hover:text-lime-400 transition-colors">
                  {sport.name}
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FACILITIES */}
      <section id="facilities" className="px-4 py-16 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-12 text-center">
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-lime-600">Facilities</p>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl uppercase">World-Class Infrastructure</h2>
        </div>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerParent}
          className="grid gap-5 md:grid-cols-2"
        >
          {FACILITIES.map((item) => (
            <motion.div
              key={item.title}
              variants={fadeUp}
              className={`group flex items-start gap-4 rounded-none border ${item.border} ${item.bg} p-5 transition-all hover:shadow-md`}
            >
              <div className="text-3xl transform group-hover:scale-110 transition-transform">{item.icon}</div>
              <div>
                <h3 className={`mb-1.5 text-base font-black uppercase ${item.color}`}>{item.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="bg-slate-100 px-4 py-20 sm:px-6 lg:px-8 dark:bg-slate-900/30">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
             <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl uppercase">System Endorsements</h2>
          </div>
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerParent}
            className="grid gap-5 md:grid-cols-3"
          >
            {TESTIMONIALS.map(([name, role, quote, icon, borderClass]) => (
              <motion.blockquote
                key={name}
                variants={fadeUp}
                className={`relative flex flex-col justify-between bg-white p-6 shadow-sm border border-slate-200 transition-all hover:shadow-md border-t-4 ${borderClass} dark:bg-slate-800 dark:border-slate-700`}
              >
                <div>
                  <Quote className="h-6 w-6 text-slate-200 dark:text-slate-600 mb-3" />
                  <p className="text-sm font-medium italic leading-relaxed text-slate-600 dark:text-slate-300">&ldquo;{quote}&rdquo;</p>
                </div>
                <footer className="mt-6 flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-lime-400 shadow-inner`}>
                    {name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-black uppercase text-slate-900 dark:text-white">{name}</div>
                    <span className="text-[10px] font-bold tracking-wide text-slate-500">{role}</span>
                  </div>
                </footer>
              </motion.blockquote>
            ))}
          </motion.div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="px-4 py-20 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-12 text-center">
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-lime-600">Pricing</p>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl uppercase">Simple, Transparent Pricing</h2>
        </div>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={staggerParent}
          className="grid gap-6 lg:grid-cols-3 items-center"
        >
          {plans.map((plan) => {
            const isFeatured = plan.featured || plan.id === 'pro' || String(plan.name).toLowerCase().includes('pro');
            const coachesLimit = plan.teacher_limit === null ? 'Unlimited' : plan.teacher_limit;
            const studentsLimit = plan.student_limit === null ? 'Unlimited' : plan.student_limit;
            
            return (
              <motion.article
                key={plan.id}
                variants={fadeUp}
                className={`relative flex flex-col justify-between p-8 transition-all border ${
                  isFeatured 
                  ? 'bg-slate-900 text-white shadow-xl border-slate-900 lg:-translate-y-3 scale-[1.02] z-10 rounded-xl' 
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg hover:shadow-md'
                }`}
              >
                <div>
                  {isFeatured && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-lime-500 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-900 rounded-full shadow-md">
                      Recommended
                    </span>
                  )}
                  <p className={`text-xs font-black uppercase tracking-widest ${isFeatured ? 'text-lime-400' : 'text-slate-500'}`}>{plan.name}</p>
                  <p className="my-5 text-4xl font-black tracking-tight">
                    ₹{plan.price} <span className="text-xs font-bold text-slate-500">/ {plan.duration || 'mo'}</span>
                  </p>
                  
                  <ul className={`my-6 space-y-3 text-xs font-medium border-t pt-6 ${isFeatured ? 'border-slate-700' : 'border-slate-100 dark:border-slate-700'}`}>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className={`h-4 w-4 ${isFeatured ? 'text-lime-400' : 'text-slate-400'}`} />
                      <span>Up to <strong className="font-black">{coachesLimit}</strong> Coaches</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className={`h-4 w-4 ${isFeatured ? 'text-lime-400' : 'text-slate-400'}`} />
                      <span>Up to <strong className="font-black">{studentsLimit}</strong> Students</span>
                    </li>
                    {plan.features?.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckCircle2 className={`h-4 w-4 ${isFeatured ? 'text-lime-400' : 'text-slate-400'}`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  className={`w-full py-3 text-xs font-black uppercase tracking-wider transition-all ${
                    isFeatured ? 'bg-lime-500 text-slate-900 hover:bg-lime-400 shadow-md' : 'bg-transparent border-2 border-slate-900 dark:border-slate-500 text-slate-900 dark:text-white hover:bg-slate-900 hover:text-white rounded'
                  }`}
                  onClick={() => selectPlan(plan.id)}
                >
                  Choose {plan.name}
                </button>
              </motion.article>
            );
          })}
        </motion.div>
      </section>

      {/* FAQS */}
      <section className="bg-slate-50 px-4 py-20 sm:px-6 lg:px-8 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-lime-600">FAQ</p>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl uppercase">Questions, Answered</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((item, idx) => {
              const open = openFaq === idx;
              return (
                <motion.div
                  key={item.q}
                  className={`overflow-hidden transition-all duration-300 ${open ? 'bg-white shadow-sm border border-lime-500 dark:bg-slate-800' : 'bg-white border border-slate-200 hover:border-lime-300 dark:bg-slate-800 dark:border-slate-700'}`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? -1 : idx)}
                    className="flex w-full items-center justify-between gap-4 p-4 text-left"
                  >
                    <span className="text-sm font-black uppercase tracking-wide text-slate-900 dark:text-white">{item.q}</span>
                    <motion.span animate={{ rotate: open ? 180 : 0 }} className={`flex h-7 w-7 shrink-0 items-center justify-center rounded ${open ? 'bg-slate-900 text-lime-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700'}`}>
                      <ChevronDown className="h-4 w-4" />
                    </motion.span>
                  </button>
                  <AnimatePresence>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                      >
                        <p className="m-0 border-t border-slate-100 px-4 pb-4 pt-3 text-xs leading-relaxed text-slate-600 font-medium dark:border-slate-700 dark:text-slate-300">
                          {item.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="relative overflow-hidden bg-lime-500 px-4 py-24 text-center sm:px-6 lg:px-8 clip-diagonal-reverse mt-10">
        <div className="absolute inset-0 z-0 bg-slate-900" style={{ clipPath: 'polygon(0 0, 30% 0, 70% 100%, 0% 100%)', opacity: 0.1 }}></div>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeUp}
          className="relative z-10 mx-auto max-w-3xl space-y-5"
        >
          <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl uppercase">
            Ready to Elevate Your Academy?
          </h2>
          <p className="mx-auto max-w-xl text-base text-slate-800 font-medium">
            Join hundreds of academies running smarter, safer, and more transparent operations today.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => navigate('/signup')}
            className="mt-3 inline-flex items-center gap-2 bg-slate-900 px-8 py-4 text-xs font-black uppercase tracking-wider text-lime-400 shadow-lg transition-all hover:bg-slate-800"
          >
            Create Your Academy Account
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        </motion.div>
      </section>

      {/* CONTACT FORM */}
      <section id="contact" className="px-4 py-20 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-lime-600">Get in Touch</p>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white uppercase">Contact Administration</h2>
            <p className="text-sm leading-relaxed text-slate-600 font-medium dark:text-slate-300">
              Inquire regarding multi-campus instance orchestration or global custom parameter layers. Your inquiry vector is protected.
            </p>
            <div className="hidden lg:flex items-center gap-4 pt-6">
              <div className="flex h-14 w-14 items-center justify-center rounded bg-slate-900 text-lime-400 shadow-md">
                 <Building2 className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm font-black uppercase text-slate-900 dark:text-white">Global Headquarters</div>
                <div className="text-xs text-slate-500 font-medium mt-1">128 Tech Park, CA 94016</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white border-2 border-slate-100 p-6 sm:p-8 shadow-xl dark:bg-slate-800 dark:border-slate-700 relative">
            <div className="absolute top-0 right-0 w-12 h-12 bg-lime-500" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}></div>
            
            <form className="space-y-4 relative z-10" onSubmit={handleContactSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Full Legal Name</label>
                  <input
                    className={inputThemeStyles}
                    name="name"
                    placeholder="John Doe"
                    value={contactForm.name || ''}
                    onChange={handleContactChange}
                    required
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Email Address</label>
                  <input
                    className={inputThemeStyles}
                    type="email"
                    name="email"
                    placeholder="john@example.com"
                    value={contactForm.email || ''}
                    onChange={handleContactChange}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Phone Number</label>
                <input
                  className={inputThemeStyles}
                  type="tel"
                  name="phone"
                  placeholder="+1 (555) 000-0000"
                  value={contactForm.phone || ''}
                  onChange={handleContactChange}
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Inquiry Description</label>
                <textarea
                  className={`${inputThemeStyles} min-h-[100px] resize-none`}
                  name="message"
                  placeholder="How can we help scale your academy?"
                  value={contactForm.message || ''}
                  onChange={handleContactChange}
                  required
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 py-3 text-xs font-black uppercase tracking-wider text-lime-400 transition-all hover:bg-slate-800 shadow-md"
                  disabled={contactLoading}
                >
                  {contactLoading ? 'Transmitting...' : 'Send Message'}
                </button>
                <button
                  type="button"
                  className="border-2 border-slate-200 bg-transparent px-6 py-3 text-xs font-black uppercase tracking-wider text-slate-600 transition-all hover:border-slate-900 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-white dark:hover:text-white"
                  onClick={() => setActiveModal('contact')}
                >
                  Clear Form
                </button>
              </div>
              {contactMessage.text && (
                <div className={`mt-3 p-3 text-[10px] font-bold text-center border-l-4 ${contactMessage.type === 'success' ? 'bg-lime-50 text-lime-700 border-lime-500' : 'bg-red-50 text-red-700 border-red-500'}`}>
                  {contactMessage.text}
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* FORM RESET MODAL DIALOG */}
      <AnimatePresence>
        {activeModal !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-sm rounded bg-white p-6 shadow-2xl dark:bg-slate-900 border-t-4 border-red-500"
            >
              <h4 className="mb-2 text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Clear Active Fields?</h4>
              <p className="mb-6 text-xs font-medium text-slate-500">This choice resets your continuous auto-save draft.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setActiveModal(null)}
                  className="flex-1 bg-slate-100 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => clearFormState()}
                  className="flex-1 bg-red-500 py-2.5 text-[10px] font-black uppercase tracking-wider text-white hover:bg-red-600 shadow-md shadow-red-500/30"
                >
                  Reset System
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="bg-slate-900 py-10 text-xs text-slate-500 border-t-4 border-lime-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 sm:flex-row">
          <div className="text-center font-medium sm:text-left">
            &copy; 2026 Sports Academy Pro.<br className="hidden sm:block" /> All operations active.
          </div>
          <div
            onDoubleClick={handleSecretGateway}
            className="cursor-default select-none text-lime-500/30 hover:text-lime-500 transition-colors text-xl"
            title="System Diagnostics"
          >
            ●
          </div>
          <div className="flex space-x-5 font-black uppercase tracking-widest text-lime-500 text-[9px]">
            <a href="#privacy" className="hover:text-white transition-colors">Privacy</a>
            <a href="#terms" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}