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
} from 'lucide-react';

const initialContact = {
  name: '',
  email: '',
  phone: '',
  message: '',
};

const SPORTS = [
  { name: 'Cricket', icon: '🏏', bg: 'from-emerald-500/15 to-teal-500/5', ring: 'group-hover:ring-emerald-400/40' },
  { name: 'Football', icon: '⚽', bg: 'from-green-500/15 to-emerald-500/5', ring: 'group-hover:ring-green-400/40' },
  { name: 'Basketball', icon: '🏀', bg: 'from-orange-500/15 to-amber-500/5', ring: 'group-hover:ring-orange-400/40' },
  { name: 'Tennis', icon: '🎾', bg: 'from-lime-500/15 to-emerald-500/5', ring: 'group-hover:ring-lime-400/40' },
  { name: 'Badminton', icon: '🏸', bg: 'from-cyan-500/15 to-teal-500/5', ring: 'group-hover:ring-cyan-400/40' },
  { name: 'Swimming', icon: '🏊', bg: 'from-blue-500/15 to-indigo-500/5', ring: 'group-hover:ring-blue-400/40' },
];

const FACILITIES = [
  {
    title: 'Professional Turf & Nets',
    desc: 'High-grade seasonal multi-lane training spaces built for elite conditioning.',
    icon: '🏟️',
    color: 'text-emerald-500',
  },
  {
    title: 'Fitness & Recovery Zone',
    desc: 'Dedicated sports science and athletic recovery hubs for every squad.',
    icon: '🏋️‍♂️',
    color: 'text-orange-500',
  },
  {
    title: 'Locker Rooms & Hydration Stations',
    desc: 'Smart sanitization loops and specialized player amenities on tap.',
    icon: '💧',
    color: 'text-cyan-500',
  },
  {
    title: 'Parent Viewing Gallery',
    desc: 'Premium elevated spaces for training observation, every session.',
    icon: '👥',
    color: 'text-purple-500',
  },
];

const FEATURES = [
  {
    title: 'Academy Command',
    desc: 'Provision professional coach workspaces, register student paths, and oversee audit-grade execution records.',
    icon: Building2,
    color: 'text-blue-500',
    bar: 'bg-blue-500',
  },
  {
    title: 'Smart Batch Flows',
    desc: 'Automate schedule conflict isolation, map team capacities, and cross-validate sport availability.',
    icon: CalendarClock,
    color: 'text-purple-500',
    bar: 'bg-purple-500',
  },
  {
    title: 'Coach Portals',
    desc: 'Log attendance in seconds, with automated condition alerts delivered straight to parent inboxes.',
    icon: Bell,
    color: 'text-orange-500',
    bar: 'bg-orange-500',
  },
  {
    title: 'Secure Architecture',
    desc: 'Relational-database backed infrastructure, engineered for high-performance joins at scale.',
    icon: ShieldCheck,
    color: 'text-cyan-500',
    bar: 'bg-cyan-500',
  },
];

const TESTIMONIALS = [
  ['Rajesh K.', 'Parent', 'Attendance alerts give us peace of mind every training day.', '👥'],
  ['Coach Meera', 'Head Coach', 'Batch scheduling and fee tracking saved hours every week.', '📋'],
  [
    'Elite Sports Club',
    'Academy Admin',
    'We scaled from one branch to three without spreadsheets.',
    '⚡',
  ],
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

// Count-up component that animates a number into view once, using a lightweight rAF loop.
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

// Decorative lane-line pattern used as a recurring signature motif (running-track lanes).
function LaneLines({ className = '' }) {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
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
          strokeWidth="0.15"
          strokeDasharray="2 3"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

const staggerParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { isInstallable, installHint, promptInstall } = usePwaInstall();

  const [contactForm, setContactForm] = useState(() => {
    const savedDraft = localStorage.getItem('sams_draft_public_contact');
    return savedDraft ? JSON.parse(savedDraft) : initialContact;
  });
  const [contactLoading, setContactLoading] = useState(false);
  const [contactMessage, setContactMessage] = useState({ text: '', type: '' });

  const [activeModal, setActiveModal] = useState(null); // 'contact' | null
  const [openFaq, setOpenFaq] = useState(0);

  // Auto-Save Persistence Loops
  useEffect(() => {
    localStorage.setItem('sams_draft_public_contact', JSON.stringify(contactForm));
  }, [contactForm]);

  const handleContactChange = (event) => {
    const { name, value } = event.target;
    setContactForm((prev) => ({ ...prev, [name]: value }));
  };

  const selectPlan = (planId) => {
    navigate('/signup');
  };

  const clearFormState = () => {
    setContactForm(initialContact);
    localStorage.removeItem('sams_draft_public_contact');
    setActiveModal(null);
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

  // Shared utility string to suppress white background states on inputs across all viewports
  const inputThemeStyles =
    'input-field bg-[var(--color-input)] dark:bg-[#09090b] text-foreground border-border focus:border-accent focus:ring-accent/20 autofill:shadow-[0_0_0_30px_var(--color-input)_inset] autofill:text-foreground';

  return (
    <div className="bg-surface text-foreground selection:bg-accent/20 min-h-screen overflow-x-hidden transition-colors duration-200">
      {/* NAVIGATION HEADER */}
      <Navbar>
        <nav className="hidden items-center gap-6 md:flex">
          <a href="#about" className="text-muted hover:text-accent text-sm font-bold transition-colors">
            About
          </a>
          <a href="#sports" className="text-muted hover:text-accent text-sm font-bold transition-colors">
            Sports Streams
          </a>
          <a href="#facilities" className="text-muted hover:text-accent text-sm font-bold transition-colors">
            Facilities
          </a>
          <a href="#testimonials" className="text-muted hover:text-accent text-sm font-bold transition-colors">
            Testimonials
          </a>
          <a href="#pricing" className="text-muted hover:text-accent text-sm font-bold transition-colors">
            Pricing Plans
          </a>
          <a href="#contact" className="text-muted hover:text-accent text-sm font-bold transition-colors">
            Contact
          </a>
        </nav>
        <NavbarActions>
          {isInstallable && (
            <button
              type="button"
              className="btn-success btn-sm transition-transform active:scale-95"
              onClick={promptInstall}
            >
              Install App
            </button>
          )}
          <button
            type="button"
            className="btn-gradient-primary px-4 py-1.5 text-sm font-bold rounded-lg shadow-md transition-transform active:scale-95"
            onClick={() => navigate('/signup')}
          >
            Sign Up
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm transition-transform active:scale-95"
            onClick={() => navigate('/login')}
          >
            Login
          </button>
        </NavbarActions>
      </Navbar>

      {/* HERO SECTION */}
      <section className="border-border relative overflow-hidden border-b bg-[radial-gradient(circle_at_15%_0%,var(--color-accent-light),transparent_45%),radial-gradient(circle_at_100%_20%,rgba(56,189,248,0.12),transparent_40%)] bg-surface px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        {/* Signature background: running-track lane lines + floating sports elements */}
        <div className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden">
          <LaneLines className="text-accent/[0.07] -rotate-3 scale-125" />
          <motion.div
            className="absolute left-[8%] top-16 text-6xl opacity-20"
            animate={{ rotate: 360 }}
            transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
          >
            ⚽
          </motion.div>
          <motion.div
            className="absolute bottom-24 left-1/4 cursor-pointer text-5xl opacity-25"
            animate={{ y: [0, -14, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            onClick={handleSecretGateway}
          >
            🏀
          </motion.div>
          <motion.div
            className="absolute right-1/3 top-24 text-6xl opacity-20"
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            🏸
          </motion.div>
          <motion.div
            className="absolute bottom-16 right-10 text-7xl opacity-15"
            animate={{ rotate: -360 }}
            transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
          >
            🎾
          </motion.div>
          <motion.div
            className="absolute right-10 top-1/3 text-5xl opacity-25"
            animate={{ y: [0, -16, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
          >
            🏏
          </motion.div>
        </div>

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
          <motion.div
            variants={staggerParent}
            initial="hidden"
            animate="show"
            className="space-y-8"
          >
            <motion.span
              variants={fadeUp}
              className="bg-accent/10 text-accent border-accent/20 inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wider"
            >
              <span className="bg-accent h-2 w-2 animate-pulse rounded-full" />
              Sports Academy Pro
            </motion.span>

            <motion.h1
              variants={fadeUp}
              className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
            >
              The Complete{' '}
              <span className="from-accent relative inline-block bg-gradient-to-r to-emerald-500 bg-clip-text text-transparent">
                Sports Academy
              </span>{' '}
              Management Platform
            </motion.h1>

            <motion.p variants={fadeUp} className="text-muted max-w-xl text-base leading-relaxed sm:text-lg">
              Onboard your multi-tenant sports academy in moments. Seamlessly orchestrate elite
              coaches, dynamic student batches, payment tracking, and real-time parent
              notifications — all from one command center.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-4 pt-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => navigate('/signup')}
                className="btn-gradient-primary inline-flex items-center gap-2 px-8 py-4 text-base font-black transition-shadow hover:shadow-lg"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </motion.button>
              {isInstallable && (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  className="btn-gradient-blue px-8 py-4 text-base font-black"
                  onClick={promptInstall}
                >
                  Install App System
                </motion.button>
              )}
            </motion.div>

            {/* KPI METRICS TRACKER */}
            <motion.div variants={fadeUp} className="mt-12 grid grid-cols-3 gap-4">
              {[
                { val: 4, suffix: '', label: 'Core Modules', color: 'text-blue-500' },
                { val: 100, suffix: '%', label: 'Data Safety', color: 'text-emerald-500' },
                { val: null, label: 'Robust Base', color: 'text-purple-500', display: 'MySQL' },
              ].map((kpi, idx) => (
                <div
                  key={idx}
                  className="card bg-surface-secondary/70 border-border/60 hover:border-accent/40 group py-5 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  <div className={`text-3xl font-black ${kpi.color} transition-transform duration-300 group-hover:scale-110`}>
                    {kpi.display ?? <CountUp target={kpi.val} suffix={kpi.suffix} />}
                  </div>
                  <div className="text-muted mt-2 text-[10px] font-black uppercase tracking-widest">
                    {kpi.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* ANIMATED DASHBOARD PREVIEW MOCKUP */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="card border-border bg-surface-secondary/90 relative overflow-hidden border p-5 shadow-2xl backdrop-blur-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-accent/15 text-accent flex h-8 w-8 items-center justify-center rounded-lg">
                    <Activity className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-black tracking-tight">Academy Overview</span>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                  Live
                </span>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-3">
                {[
                  { label: 'Attendance', val: '96%', color: 'text-emerald-500' },
                  { label: 'Coaches', val: '18', color: 'text-blue-500' },
                  { label: 'Students', val: '312', color: 'text-purple-500' },
                ].map((s) => (
                  <div key={s.label} className="bg-surface border-border/70 rounded-xl border p-3 text-center">
                    <div className={`text-xl font-black ${s.color}`}>{s.val}</div>
                    <div className="text-muted mt-1 text-[9px] font-bold uppercase tracking-wider">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Fake bar chart */}
              <div className="bg-surface border-border/70 mb-4 flex h-28 items-end gap-2 rounded-xl border p-3">
                {[45, 70, 55, 90, 65, 80, 96].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 0.8, delay: 0.4 + i * 0.07, ease: 'easeOut' }}
                    className="from-accent flex-1 rounded-md bg-gradient-to-t to-emerald-300"
                  />
                ))}
              </div>

              <div className="space-y-2">
                {[
                  { name: 'U-14 Cricket Batch', tag: 'On time', icon: Trophy, color: 'text-orange-500' },
                  { name: 'Coach Meera checked in', tag: 'Verified', icon: CheckCircle2, color: 'text-emerald-500' },
                ].map((row) => (
                  <div key={row.name} className="bg-surface border-border/60 flex items-center gap-3 rounded-lg border p-2.5">
                    <row.icon className={`h-4 w-4 ${row.color}`} />
                    <span className="flex-1 text-xs font-bold">{row.name}</span>
                    <span className="text-muted text-[10px] font-black uppercase tracking-wider">{row.tag}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Floating trust badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.9 }}
              className="card bg-surface border-border absolute -bottom-6 -left-6 hidden items-center gap-2 border px-4 py-3 shadow-xl sm:flex"
            >
              <div className="flex -space-x-2">
                {['bg-emerald-500', 'bg-blue-500', 'bg-orange-500'].map((c, i) => (
                  <div key={i} className={`h-7 w-7 rounded-full border-2 border-white dark:border-[#09090b] ${c}`} />
                ))}
              </div>
              <div>
                <div className="text-xs font-black">500+ Academies</div>
                <div className="text-muted flex items-center gap-0.5 text-[10px] font-bold">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> 4.9 rating
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ABOUT ACADEMY */}
      <section id="about" className="border-border bg-surface-secondary relative overflow-hidden border-b px-4 py-24 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          className="relative z-10 mx-auto max-w-4xl space-y-6 text-center"
        >
          <p className="text-accent text-xs font-black uppercase tracking-widest">Why Sports Academy Pro</p>
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Unified Operations Framework</h2>
          <div className="bg-accent mx-auto my-4 h-1 w-16 rounded-full" />
          <p className="text-muted mx-auto max-w-3xl text-base leading-relaxed sm:text-lg">
            Sports Academy Pro resolves structural fragmentation within sports organizations. We
            connect coach schedules, automated parental confirmation pipelines, and structural
            transaction ledger tracking under a single secure, responsive workspace.
          </p>
        </motion.div>
      </section>

      {/* FEATURES / ATTRIBUTES */}
      <section className="bg-surface border-border border-b px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            className="mb-16 space-y-3 text-center"
          >
            <p className="text-accent text-xs font-black uppercase tracking-widest">Built for Academies</p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Everything Runs From One Place</h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerParent}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {FEATURES.map((f) => (
              <motion.article
                key={f.title}
                variants={fadeUp}
                whileHover={{ y: -6 }}
                className="card bg-surface-secondary border-border/80 hover:border-accent/30 group relative flex flex-col justify-between overflow-hidden border p-6 shadow-sm transition-colors duration-300 hover:shadow-md"
              >
                <div className={`absolute left-0 top-0 h-full w-1 ${f.bar} origin-top scale-y-0 transform transition-transform duration-300 group-hover:scale-y-100`} />
                <div>
                  <div className={`bg-surface mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${f.color} transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110`}>
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-foreground mb-2 text-base font-black tracking-tight">{f.title}</h3>
                  <p className="text-muted m-0 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      {/* SPORTS OFFERED */}
      <section id="sports" className="border-border bg-surface-secondary relative border-b px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            className="mb-16 text-center"
          >
            <p className="text-accent mb-2 text-xs font-black uppercase tracking-widest">Multi-Sport Ready</p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Sports Streams Offered</h2>
            <p className="text-muted mx-auto mt-4 max-w-md text-sm">
              Enforce clean validation streams mapping across dynamic sport configurations.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            variants={staggerParent}
            className="grid gap-6 sm:grid-cols-2 md:grid-cols-3"
          >
            {SPORTS.map((sport) => (
              <motion.article
                key={sport.name}
                variants={fadeUp}
                whileHover={{ y: -8, scale: 1.02 }}
                className={`card relative cursor-pointer overflow-hidden bg-gradient-to-br ${sport.bg} border-border ring-1 ring-transparent transition-shadow duration-300 hover:shadow-lg ${sport.ring} group border p-8 text-center`}
              >
                <motion.div
                  className="mb-4 inline-block text-5xl"
                  whileHover={{ scale: 1.2, rotate: 8 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  {sport.icon}
                </motion.div>
                <div className="text-foreground group-hover:text-accent text-lg font-black tracking-tight transition-colors">
                  {sport.name}
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FACILITIES */}
      <section id="facilities" className="bg-surface border-border border-b px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            className="mb-16 text-center"
          >
            <p className="text-accent mb-2 text-xs font-black uppercase tracking-widest">Facilities</p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">World-Class Infrastructure</h2>
            <p className="text-muted mx-auto mt-4 max-w-md text-sm">
              Premium physical operational foundations optimized for high-tier telemetry support.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerParent}
            className="grid gap-6 md:grid-cols-2"
          >
            {FACILITIES.map((item) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="card bg-surface-secondary border-border/70 hover:border-accent/30 flex items-start gap-5 border p-6 text-sm shadow-sm transition-colors duration-300 hover:shadow-md"
              >
                <div className={`bg-surface rounded-xl p-3 text-2xl shadow-inner ${item.color}`}>{item.icon}</div>
                <div>
                  <h3 className="text-foreground mb-1 text-base font-black tracking-tight">{item.title}</h3>
                  <p className="text-muted m-0 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* STATS / TRUST STRIP */}
      <section className="border-border from-accent to-emerald-600 relative overflow-hidden border-b bg-gradient-to-r px-4 py-16 sm:px-6 lg:px-8">
        <LaneLines className="text-white/10" />
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={staggerParent}
          className="relative z-10 mx-auto grid max-w-6xl grid-cols-2 gap-8 text-center text-white md:grid-cols-4"
        >
          {[
            { val: 500, suffix: '+', label: 'Academies Onboarded', icon: Building2 },
            { val: 12000, suffix: '+', label: 'Athletes Tracked', icon: Users },
            { val: 98, suffix: '%', label: 'Attendance Accuracy', icon: TrendingUp },
            { val: 40000, suffix: '+', label: 'Payments Processed', icon: CreditCard },
          ].map((s) => (
            <motion.div key={s.label} variants={fadeUp} className="space-y-2">
              <s.icon className="mx-auto h-6 w-6 opacity-80" />
              <div className="text-3xl font-black sm:text-4xl">
                <CountUp target={s.val} suffix={s.suffix} />
              </div>
              <div className="text-[11px] font-bold uppercase tracking-widest opacity-85">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* TESTIMONIAL MONITOR BAR */}
      <section id="testimonials" className="border-border bg-surface-secondary border-b px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            className="mb-16 text-center"
          >
            <p className="text-accent mb-2 text-xs font-black uppercase tracking-widest">Testimonials</p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">System Endorsements</h2>
            <p className="text-muted mx-auto mt-4 max-w-md text-sm">
              Verified architectural performance markers derived from active managers.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerParent}
            className="grid gap-6 md:grid-cols-3"
          >
            {TESTIMONIALS.map(([name, role, quote, icon]) => (
              <motion.blockquote
                key={name}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="card bg-surface border-border/80 hover:border-accent/20 relative m-0 flex flex-col justify-between border p-6 shadow-sm transition-shadow duration-300 hover:shadow-md"
              >
                <span className="text-accent/10 pointer-events-none absolute right-4 top-2 select-none font-serif text-5xl">
                  &ldquo;
                </span>
                <div>
                  <div className="mb-3 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <div className="mb-2 text-2xl">{icon}</div>
                  <p className="text-muted m-0 text-sm font-medium italic leading-relaxed">&ldquo;{quote}&rdquo;</p>
                </div>
                <footer className="border-border/60 text-foreground mt-8 flex items-center gap-3 border-t pt-4 text-sm font-black not-italic">
                  <div className="bg-accent/10 text-accent flex h-8 w-8 items-center justify-center rounded-full text-xs font-black">
                    {name.charAt(0)}
                  </div>
                  <div>
                    {name}
                    <span className="text-muted mt-0.5 block text-xs font-bold tracking-normal">{role}</span>
                  </div>
                </footer>
              </motion.blockquote>
            ))}
          </motion.div>
        </div>
      </section>

      {/* PRICING TIER TRACK MODULE */}
      <section
        id="pricing"
        className="border-border from-surface to-surface-secondary/30 border-b bg-gradient-to-b px-4 py-24 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            className="mb-16 space-y-3 text-center"
          >
            <p className="text-accent text-xs font-black uppercase tracking-widest">Pricing</p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Simple, Transparent Pricing</h2>
            <p className="text-muted mx-auto max-w-md text-sm sm:text-base">
              Choose the processing arrangement calibrated to your active student metrics.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            variants={staggerParent}
            className="grid items-stretch gap-8 lg:grid-cols-3"
          >
            {PRICING_PLANS.map((plan) => (
              <motion.article
                key={plan.id}
                variants={fadeUp}
                whileHover={{ y: -6 }}
                className={`card bg-surface-secondary flex flex-col justify-between border-2 p-8 transition-shadow duration-300 ${
                  plan.featured ? 'border-accent shadow-accent-glow relative' : 'border-border/80'
                }`}
              >
                <div className="relative">
                  {plan.featured && (
                    <motion.span
                      animate={{ scale: [1, 1.06, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="bg-accent text-foreground absolute -top-12 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-md"
                    >
                      Recommended Tier
                    </motion.span>
                  )}
                  <p className="text-accent mb-2 text-xs font-black uppercase tracking-widest">{plan.name}</p>
                  <p className="text-foreground my-4 text-5xl font-black tracking-tight">
                    ${plan.price}
                    <span className="text-muted ml-1 text-xs font-bold tracking-wide">/ month</span>
                  </p>

                  <ul className="border-border text-muted my-8 list-none space-y-4 border-t p-0 pt-6 text-sm">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="text-accent h-4 w-4 shrink-0" />
                      <span>
                        Up to <strong className="text-foreground font-black">{plan.coaches}</strong> Active Coaches
                      </span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="text-accent h-4 w-4 shrink-0" />
                      <span>
                        Up to <strong className="text-foreground font-black">{plan.students}</strong> Registered Profiles
                      </span>
                    </li>
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2.5">
                        <CheckCircle2 className="text-accent h-4 w-4 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  className={`${plan.featured ? 'btn-gradient-primary' : 'btn-secondary'} w-full rounded-xl py-3.5 text-sm font-bold shadow-md`}
                  onClick={() => selectPlan(plan.id)}
                >
                  Choose {plan.name} Package
                </motion.button>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-surface border-border border-b px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            className="mb-12 text-center"
          >
            <p className="text-accent mb-2 text-xs font-black uppercase tracking-widest">FAQ</p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Questions, Answered</h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerParent}
            className="space-y-3"
          >
            {FAQS.map((item, idx) => {
              const open = openFaq === idx;
              return (
                <motion.div
                  key={item.q}
                  variants={fadeUp}
                  className="card bg-surface-secondary border-border/80 overflow-hidden border"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? -1 : idx)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left"
                  >
                    <span className="text-foreground text-sm font-black tracking-tight">{item.q}</span>
                    <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="text-accent h-5 w-5 shrink-0" />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <p className="text-muted m-0 px-5 pb-5 text-sm leading-relaxed">{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="border-border relative overflow-hidden border-b bg-gradient-to-br from-emerald-600 via-emerald-500 to-lime-500 px-4 py-20 text-center sm:px-6 lg:px-8">
        <LaneLines className="text-white/10 rotate-2" />
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeUp}
          className="relative z-10 mx-auto max-w-2xl space-y-6"
        >
          <Trophy className="mx-auto h-10 w-10 text-white/90" />
          <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Ready to Elevate Your Academy?
          </h2>
          <p className="text-sm leading-relaxed text-white/85 sm:text-base">
            Join hundreds of academies running smarter, safer, and more transparent operations
            with Sports Academy Pro.
          </p>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => navigate('/signup')}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-black text-emerald-600 shadow-xl transition-shadow hover:shadow-2xl"
          >
            Create Your Academy Account
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        </motion.div>
      </section>

      {/* CONTACT DATA PIPELINE FORM */}
      <section id="contact" className="border-border bg-surface-secondary border-b px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            className="space-y-4 text-center lg:text-left"
          >
            <p className="text-accent text-xs font-black uppercase tracking-widest">Get in Touch</p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Contact Administration</h2>
            <p className="text-muted mx-auto max-w-md text-sm leading-relaxed sm:text-base lg:mx-0">
              Inquire regarding multi-campus instance orchestration or global custom parameter
              layers. Your inquiry vector is protected via cached transactional recovery loops.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp}
            className="card bg-surface border-border border p-8 shadow-md"
          >
            <form className="space-y-5" onSubmit={handleContactSubmit}>
              <div>
                <label className="label">Full Legal Name</label>
                <input
                  className={inputThemeStyles}
                  name="name"
                  placeholder="Your name"
                  value={contactForm.name || ''}
                  onChange={handleContactChange}
                  required
                />
              </div>
              <div>
                <label className="label">Identity Email Address</label>
                <input
                  className={inputThemeStyles}
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={contactForm.email || ''}
                  onChange={handleContactChange}
                  required
                />
              </div>
              <div>
                <label className="label">Phone Number (Optional)</label>
                <input
                  className={inputThemeStyles}
                  type="tel"
                  name="phone"
                  placeholder="Phone (optional)"
                  value={contactForm.phone || ''}
                  onChange={handleContactChange}
                />
              </div>
              <div>
                <label className="label">Inquiry Description</label>
                <textarea
                  className={`${inputThemeStyles} min-h-[120px] resize-none py-3.5`}
                  name="message"
                  placeholder="Message"
                  value={contactForm.message || ''}
                  onChange={handleContactChange}
                  required
                />
              </div>
              <div className="flex gap-4 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  className="btn-gradient-blue flex-1 rounded-xl py-3.5 text-sm font-bold shadow-md"
                  disabled={contactLoading}
                >
                  {contactLoading ? 'Transmitting parameters...' : 'Send Message'}
                </motion.button>
                <button
                  type="button"
                  className="btn-secondary text-muted px-5 transition-transform active:scale-95"
                  onClick={() => setActiveModal('contact')}
                >
                  Clear Form
                </button>
              </div>
              {contactMessage.text && (
                <p
                  className={
                    contactMessage.type === 'success' ? 'alert-success m-0 mt-4' : 'alert-error m-0 mt-4'
                  }
                >
                  {contactMessage.text}
                </p>
              )}
            </form>
          </motion.div>
        </div>
      </section>

      {/* FORM RESET DRAFT PROTECTION MODAL DIALOG */}
      <AnimatePresence>
        {activeModal !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="card bg-surface border-border w-full max-w-md border p-8 shadow-2xl"
            >
              <h4 className="text-foreground mb-2 text-xl font-black tracking-tight">
                Clear Active Input Fields?
              </h4>
              <p className="text-muted mb-6 text-sm leading-relaxed">
                This choice resets your continuous auto-save database cache slice for this
                template view and drops tracked changes entirely.
              </p>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setActiveModal(null)}
                  className="btn-secondary px-4 py-2.5 text-sm font-bold transition-transform active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={() => clearFormState()}
                  className="btn-gradient-orange rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition-all active:scale-95"
                >
                  Reset System Draft
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="border-border bg-surface-secondary text-muted relative z-10 border-t py-14 text-xs">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
          <div className="font-bold tracking-wide">
            &copy; 2026 Sports Academy Pro — Sports Academy Management System. All application
            configurations active.
          </div>

          <div
            onDoubleClick={handleSecretGateway}
            className="cursor-default select-none px-6 py-2 text-base opacity-20 transition-opacity duration-300 hover:opacity-100"
            title="Operational System Diagnostics: Normal"
          >
            🍃
          </div>

          <div className="flex space-x-6 text-[10px] font-black uppercase tracking-wider">
            <a href="#privacy" className="hover:text-accent transition-colors">
              Privacy Matrix
            </a>
            <a href="#terms" className="hover:text-accent transition-colors">
              Operational Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}