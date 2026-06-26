import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar, { NavbarActions } from '../components/Navbar';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { PRICING_PLANS, publicPost, signup } from '../api/client';
import { MapPin, AlertTriangle } from 'lucide-react';

const initialSignup = {
  name: '',
  email: '',
  password: '',
  academy_name: '',
  phone_number: '',
  city: '',
  state: '',
  address: '',
  attendance_radius_meters: 100,
  latitude: null,
  longitude: null,
  subscription_plan: 'free',
};

const initialContact = {
  name: '',
  email: '',
  phone: '',
  message: '',
};

const SPORTS = [
  { name: 'Cricket', icon: '🏏', bg: 'from-emerald-500/10 to-teal-500/5' },
  { name: 'Football', icon: '⚽', bg: 'from-green-500/10 to-emerald-500/5' },
  { name: 'Basketball', icon: '🏀', bg: 'from-orange-500/10 to-amber-500/5' },
  { name: 'Tennis', icon: '🎾', bg: 'from-lime-500/10 to-emerald-500/5' },
  { name: 'Badminton', icon: '🏸', bg: 'from-cyan-500/10 to-teal-500/5' },
  { name: 'Swimming', icon: '🏊', bg: 'from-blue-500/10 to-indigo-500/5' },
];

const FACILITIES = [
  {
    title: 'Professional Turf & Nets',
    desc: 'High-grade seasonal multi-lane training spaces.',
    icon: '🏟️',
  },
  {
    title: 'Fitness & Recovery Zone',
    desc: 'Dedicated sports science and athletic recovery hubs.',
    icon: '🏋️‍♂️',
  },
  {
    title: 'Locker Rooms & Hydration Stations',
    desc: 'Smart sanitization loops and specialized player amenities.',
    icon: '💧',
  },
  {
    title: 'Parent Viewing Gallery',
    desc: 'Premium elevated spaces for training observation sessions.',
    icon: '👥',
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

export default function LandingPage() {
  const navigate = useNavigate();
  const { isInstallable, installHint, promptInstall } = usePwaInstall();

  // FORM DATA PROTECTION STATE LAYER (AUTO-SAVE & RECOVERY)
  const [signupForm, setSignupForm] = useState(() => {
    const savedDraft = localStorage.getItem('sams_draft_public_signup');
    if (!savedDraft) return initialSignup;

    try {
      return {
        ...initialSignup,
        ...JSON.parse(savedDraft),
      };
    } catch {
      return initialSignup;
    }
  });
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupMessage, setSignupMessage] = useState({ text: '', type: '' });
  const [gpsError, setGpsError] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);

  const [contactForm, setContactForm] = useState(() => {
    const savedDraft = localStorage.getItem('sams_draft_public_contact');
    return savedDraft ? JSON.parse(savedDraft) : initialContact;
  });
  const [contactLoading, setContactLoading] = useState(false);
  const [contactMessage, setContactMessage] = useState({ text: '', type: '' });

  const [activeModal, setActiveModal] = useState(null); // 'signup' | 'contact' | null
  const [loginDropdownOpen, setLoginDropdownOpen] = useState(false);

  // Auto-Save Persistence Loops
  useEffect(() => {
    localStorage.setItem('sams_draft_public_signup', JSON.stringify(signupForm));
  }, [signupForm]);

  useEffect(() => {
    localStorage.setItem('sams_draft_public_contact', JSON.stringify(contactForm));
  }, [contactForm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (loginDropdownOpen && !event.target.closest('.login-dropdown-container')) {
        setLoginDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [loginDropdownOpen]);

  const handleSignupChange = (event) => {
    const { name, value } = event.target;
    setSignupForm((prev) => ({ ...prev, [name]: value }));
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSignupForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
        setGettingLocation(false);
        setSignupMessage({ text: 'Academy location captured successfully', type: 'success' });
        setTimeout(() => setSignupMessage({ text: '', type: '' }), 3000);
      },
      (error) => {
        setGettingLocation(false);
        let errorMessage = 'Unable to fetch current location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission is required for attendance tracking.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
          default:
            errorMessage = 'An unknown error occurred getting location.';
        }
        setGpsError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleContactChange = (event) => {
    const { name, value } = event.target;
    setContactForm((prev) => ({ ...prev, [name]: value }));
  };

  const selectPlan = (planId) => {
    setSignupForm((prev) => ({ ...prev, subscription_plan: planId }));
    const el = document.getElementById('signup');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const clearFormState = (formType) => {
    if (formType === 'signup') {
      setSignupForm(initialSignup);
      localStorage.removeItem('sams_draft_public_signup');
    } else if (formType === 'contact') {
      setContactForm(initialContact);
      localStorage.removeItem('sams_draft_public_contact');
    }
    setActiveModal(null);
  };

  const handleSignupSubmit = async (event) => {
    event.preventDefault();

    // Validation
    if (!signupForm.city.trim()) {
      setSignupMessage({ text: 'City is required', type: 'error' });
      return;
    }
    if (!signupForm.state.trim()) {
      setSignupMessage({ text: 'State is required', type: 'error' });
      return;
    }
    if (!signupForm.latitude || !signupForm.longitude) {
      setSignupMessage({ text: 'Please capture academy location using the Set Academy Location button', type: 'error' });
      return;
    }

    setSignupLoading(true);
    setSignupMessage({ text: '', type: '' });

    try {
      const result = await signup({
        name: signupForm.name.trim(),
        email: signupForm.email.trim(),
        password: signupForm.password,
        academy_name: signupForm.academy_name.trim(),
        phone_number: signupForm.phone_number.trim() || undefined,
        city: signupForm.city.trim(),
        state: signupForm.state.trim(),
        address: signupForm.address.trim() || undefined,
        latitude: signupForm.latitude,
        longitude: signupForm.longitude,
        attendance_radius_meters: parseInt(signupForm.attendance_radius_meters) || 100,
        subscription_plan: signupForm.subscription_plan,
      });
      setSignupMessage({ text: `${result.message} Redirecting…`, type: 'success' });
      localStorage.removeItem('sams_draft_public_signup');
      setTimeout(() => navigate('/admin/coaches'), 1000);
    } catch (error) {
      setSignupMessage({ text: error.message, type: 'error' });
    } finally {
      setSignupLoading(false);
    }
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
        <a
          href="#about"
          className="text-muted hover:text-accent text-sm font-bold transition-colors"
        >
          About
        </a>
        <a
          href="#sports"
          className="text-muted hover:text-accent text-sm font-bold transition-colors"
        >
          Sports Streams
        </a>
        <a
          href="#facilities"
          className="text-muted hover:text-accent text-sm font-bold transition-colors"
        >
          Facilities
        </a>
        <a
          href="#testimonials"
          className="text-muted hover:text-accent text-sm font-bold transition-colors"
        >
          Testimonials
        </a>
        <a
          href="#pricing"
          className="text-muted hover:text-accent text-sm font-bold transition-colors"
        >
          Pricing Plans
        </a>
        <a
          href="#contact"
          className="text-muted hover:text-accent text-sm font-bold transition-colors"
        >
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
        <div className="relative login-dropdown-container">
          <button
            type="button"
            className="btn-secondary btn-sm transition-transform active:scale-95"
            onClick={() => setLoginDropdownOpen(!loginDropdownOpen)}
          >
            Login
          </button>
          {loginDropdownOpen && (
            <div className="bg-surface border-border absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border shadow-lg">
              <div className="p-1">
                <Link
                  to="/login/admin"
                  className="text-foreground hover:bg-accent/10 block rounded px-4 py-2 text-sm font-bold transition-colors"
                  onClick={() => setLoginDropdownOpen(false)}
                >
                  Admin
                </Link>
                <div className="px-4 pb-2 pt-1">
                  <Link
                    to="#signup"
                    className="text-accent hover:text-accent/80 text-xs font-bold transition-colors"
                    onClick={() => setLoginDropdownOpen(false)}
                  >
                    Sign Up
                  </Link>
                </div>
                <Link
                  to="/coach/login"
                  className="text-foreground hover:bg-accent/10 block rounded px-4 py-2 text-sm font-bold transition-colors"
                  onClick={() => setLoginDropdownOpen(false)}
                >
                  Coach
                </Link>
                <Link
                  to="/parent/login"
                  className="text-foreground hover:bg-accent/10 block rounded px-4 py-2 text-sm font-bold transition-colors"
                  onClick={() => setLoginDropdownOpen(false)}
                >
                  Parent
                </Link>
              </div>
            </div>
          )}
        </div>
      </NavbarActions>
    </Navbar>

    {/* HERO SECTION */}
    <section className="border-border from-accent/10 via-surface-secondary to-surface relative overflow-hidden border-b bg-gradient-to-br px-4 sm:px-6 lg:px-8 py-24 lg:py-36">
      {/* Animated Background Graphics and Floating Sports Elements */}
      <div className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden opacity-40">
        <div className="absolute left-10 top-12 animate-[spin_25s_linear_infinite] text-6xl opacity-30">
          ⚽
        </div>
        <div
          className="absolute bottom-20 left-1/4 animate-[bounce_4s_ease-in-out_infinite] text-5xl opacity-20 cursor-pointer"
          onClick={handleSecretGateway}
        >
          🏀
        </div>
        <div className="absolute right-1/3 top-24 animate-[pulse_3s_ease-in-out_infinite] text-6xl opacity-20">
          🏸
        </div>
        <div className="absolute bottom-12 right-12 animate-[spin_30s_linear_infinite] text-7xl opacity-20">
          🎾
        </div>
        <div className="absolute right-10 top-1/3 animate-[bounce_5s_ease-in-out_infinite] text-5xl opacity-30">
          🏏
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--color-accent-light),transparent_50%)] opacity-50" />
      </div>

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
        <div className="animate-[premiumFadeIn_0.6s_cubic-bezier(0.16,1,0.3,1)_forwards] space-y-8">
          <span className="bg-accent/10 text-accent border-accent/20 inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wider">
            <span className="bg-accent h-2 w-2 animate-pulse rounded-full" />⚡ High-Performance
            Academy Engine
          </span>
          <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Accelerate Athletic Growth at{' '}
            <span className="from-accent bg-gradient-to-r to-emerald-500 bg-clip-text text-transparent">
              Enterprise Scale
            </span>
          </h1>
          <p className="text-muted max-w-xl text-base leading-relaxed sm:text-lg">
            Onboard your multi-tenant sports academy in moments. Seamlessly orchestrate elite
            coaches, dynamic student batches, payment tracking, and real-time parent
            notifications.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <a
              href="#signup"
              className="btn-gradient-primary px-8 py-4 text-base font-black transition-all hover:scale-[1.03] active:scale-[0.97]"
            >
              Start Free Trial
            </a>
            {isInstallable && (
              <button
                type="button"
                className="btn-gradient-blue px-8 py-4 text-base font-black transition-all hover:scale-[1.03] active:scale-[0.97]"
                onClick={promptInstall}
              >
                Install App System
              </button>
            )}
          </div>

          {/* KPI METRICS TRACKER */}
          <div className="mt-12 grid grid-cols-3 gap-4">
            {[
              { val: '4', label: 'Core Modules', color: 'text-blue' },
              { val: '100%', label: 'Data Safety', color: 'text-success' },
              { val: 'MySQL', label: 'Robust Base', color: 'text-purple' },
            ].map((kpi, idx) => (
              <div
                key={idx}
                className="card bg-surface-secondary/70 border-border/60 hover:border-accent/40 group py-5 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <div
                  className={`text-3xl font-black ${kpi.color} transition-transform duration-300 group-hover:scale-110`}
                >
                  {kpi.val}
                </div>
                <div className="text-muted mt-2 text-[10px] font-black uppercase tracking-widest">
                  {kpi.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ATTRIBUTES GRID */}
        <div className="grid animate-[premiumFadeIn_0.9s_cubic-bezier(0.16,1,0.3,1)_forwards] gap-4 sm:grid-cols-2">
          {[
            [
              'Academy Command',
              'Provision professional coach workspaces, register student paths, and oversee audit execution records.',
              '🏢',
              'bg-blue',
            ],
            [
              'Smart Batch Flows',
              'Automate schedule conflict isolation, map team capacities, and cross-validate sport availability.',
              '🧠',
              'bg-purple',
            ],
            [
              'Coach Portals',
              'Execute quick attendance logging alongside automated condition alerts delivered directly to parent emails.',
              '📋',
              'bg-orange',
            ],
            [
              'Secure Architecture',
              'MERN architecture optimized via structural relational database engines for high-performance joins.',
              '🛡️',
              'bg-cyan',
            ],
          ].map(([title, desc, icon, colorClass]) => (
            <article
              key={title}
              className="card bg-surface-secondary border-border/80 hover:border-accent/30 group relative flex flex-col justify-between overflow-hidden border p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-md"
            >
              <div
                className={`absolute left-0 top-0 h-full w-1 ${colorClass} origin-top scale-y-0 transform transition-transform duration-300 group-hover:scale-y-100`}
              />
              <div>
                <div className="group-hover:scale-120 mb-4 inline-block text-3xl transition-transform duration-300 group-hover:rotate-6">
                  {icon}
                </div>
                <h3 className="text-foreground mb-2 text-base font-black tracking-tight">
                  {title}
                </h3>
                <p className="text-muted m-0 text-sm leading-relaxed">{desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>

    {/* ABOUT ACADEMY */}
    <section
      id="about"
      className="border-border bg-surface-secondary relative overflow-hidden border-b px-4 sm:px-6 lg:px-8 py-24"
    >
      <div className="relative z-10 mx-auto max-w-4xl space-y-6 text-center">
        <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
          Unified Operations Framework
        </h2>
        <div className="bg-accent mx-auto my-4 h-1 w-16 rounded-full" />
        <p className="text-muted mx-auto max-w-3xl text-base leading-relaxed sm:text-lg">
          SAMS resolves structural fragmentation within sports organizations. We connect coach
          schedules, automated parental confirmation pipelines, and structural transaction ledger
          tracking under a single secure, responsive workspace.
        </p>
      </div>
    </section>

    {/* SPORTS OFFERED */}
    <section id="sports" className="border-border bg-surface relative border-b px-4 sm:px-6 lg:px-8 py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-4 text-center text-3xl font-black tracking-tight sm:text-4xl">
          Sports Streams Offered
        </h2>
        <p className="text-muted mx-auto mb-16 max-w-md text-center text-sm">
          Enforce clean validation streams mapping across dynamic sport configurations.
        </p>

        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {SPORTS.map((sport) => (
            <article
              key={sport.name}
              className={`card relative overflow-hidden bg-gradient-to-br ${sport.bg} border-border hover:border-accent/50 group cursor-pointer border p-8 text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-lg`}
            >
              <div className="group-hover:scale-120 mb-4 inline-block transform text-5xl transition-transform duration-300 group-hover:animate-bounce">
                {sport.icon}
              </div>
              <div className="text-foreground group-hover:text-accent text-lg font-black tracking-tight transition-colors">
                {sport.name}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>

    {/* FACILITIES */}
    <section id="facilities" className="bg-surface-secondary border-border border-b px-4 sm:px-6 lg:px-8 py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-4 text-center text-3xl font-black tracking-tight sm:text-4xl">
          World-Class Infrastructure
        </h2>
        <p className="text-muted mx-auto mb-16 max-w-md text-center text-sm">
          Premium physical operational foundations optimized for high-tier telemetry support.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {FACILITIES.map((item, idx) => (
            <div
              key={idx}
              className="card bg-surface border-border/70 hover:border-accent/30 flex items-start gap-5 border p-6 text-sm shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="bg-surface-secondary rounded-xl p-3 text-2xl shadow-inner transition-transform duration-300">
                {item.icon}
              </div>
              <div>
                <h3 className="text-foreground mb-1 text-base font-black tracking-tight">
                  {item.title}
                </h3>
                <p className="text-muted m-0 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* TESTIMONIAL MONITOR BAR */}
    <section id="testimonials" className="border-border bg-surface border-b px-4 sm:px-6 lg:px-8 py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-4 text-center text-3xl font-black tracking-tight sm:text-4xl">
          System Endorsements
        </h2>
        <p className="text-muted mx-auto mb-16 max-w-md text-center text-sm">
          Verified architectural performance markers derived from active managers.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map(([name, role, quote, icon]) => (
            <blockquote
              key={name}
              className="card bg-surface-secondary border-border/80 hover:border-accent/20 relative m-0 flex flex-col justify-between border p-6 transition-all duration-300 hover:shadow-md"
            >
              <span className="text-accent/10 pointer-events-none absolute right-4 top-2 select-none font-serif text-5xl">
                “
              </span>
              <div>
                <div className="mb-4 text-2xl">{icon}</div>
                <p className="text-muted m-0 text-sm font-medium italic leading-relaxed">
                  &ldquo;{quote}&rdquo;
                </p>
              </div>
              <footer className="border-border/60 text-foreground mt-8 flex items-center gap-3 border-t pt-4 text-sm font-black not-italic">
                <div className="bg-accent/10 text-accent flex h-8 w-8 items-center justify-center rounded-full text-xs font-black">
                  {name.charAt(0)}
                </div>
                <div>
                  {name}
                  <span className="text-muted mt-0.5 block text-xs font-bold tracking-normal">
                    {role}
                  </span>
                </div>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>

    {/* PRICING TIER TRACK MODULE */}
    <section
      id="pricing"
      className="border-border from-surface to-surface-secondary/30 border-b bg-gradient-to-b px-4 sm:px-6 lg:px-8 py-24"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 space-y-3 text-center">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted mx-auto max-w-md text-sm sm:text-base">
            Choose the processing arrangement calibrated to your active student metrics.
          </p>
        </div>

        <div className="grid items-stretch gap-8 lg:grid-cols-3">
          {PRICING_PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`card bg-surface-secondary flex flex-col justify-between border-2 p-8 transition-all duration-300 hover:-translate-y-1.5 ${plan.featured ? 'border-accent shadow-accent-glow relative' : 'border-border/80'
                }`}
            >
              <div className="relative">
                {plan.featured && (
                  <span className="bg-accent text-foreground absolute -top-12 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-md">
                    Recommended Tier
                  </span>
                )}
                <p className="text-accent mb-2 text-xs font-black uppercase tracking-widest">
                  {plan.name}
                </p>
                <p className="text-foreground my-4 text-5xl font-black tracking-tight">
                  ${plan.price}
                  <span className="text-muted ml-1 text-xs font-bold tracking-wide">/ month</span>
                </p>

                <ul className="border-border text-muted my-8 list-none space-y-4 border-t p-0 pt-6 text-sm">
                  <li className="flex items-center gap-2.5">
                    <span className="text-accent font-black">✓</span>
                    <span>
                      Up to <strong className="text-foreground font-black">{plan.coaches}</strong>{' '}
                      Active Coaches
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="text-accent font-black">✓</span>
                    <span>
                      Up to{' '}
                      <strong className="text-foreground font-black">{plan.students}</strong>{' '}
                      Registered Profiles
                    </span>
                  </li>
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2.5">
                      <span className="text-accent font-black">✓</span> <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                className={`${plan.featured ? 'btn-gradient-primary' : 'btn-secondary'} w-full rounded-xl py-3.5 text-sm font-bold shadow-md transition-transform active:scale-95`}
                onClick={() => selectPlan(plan.id)}
              >
                Choose {plan.name} Package
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>

    {/* CONTACT DATA PIPELINE FORM */}
    <section id="contact" className="border-border bg-surface-secondary border-b px-4 sm:px-6 lg:px-8 py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div className="space-y-4 text-center lg:text-left">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
            Contact Administration
          </h2>
          <p className="text-muted mx-auto max-w-md text-sm leading-relaxed sm:text-base lg:mx-0">
            Inquire regarding multi-campus instance orchestration or global custom parameter
            layers. Your inquiry vector is protected via cached transactional recovery loops.
          </p>
        </div>

        <div className="card bg-surface border-border border p-8 shadow-md">
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
              <button
                type="submit"
                className="btn-gradient-blue flex-1 rounded-xl py-3.5 text-sm font-bold shadow-md transition-transform active:scale-95"
                disabled={contactLoading}
              >
                {contactLoading ? 'Transmitting parameters...' : 'Send Message'}
              </button>
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
                  contactMessage.type === 'success'
                    ? 'alert-success m-0 mt-4'
                    : 'alert-error m-0 mt-4'
                }
              >
                {contactMessage.text}
              </p>
            )}
          </form>
        </div>
      </div>
    </section>

    {/* ACADEMY WORKSPACE SIGNUP FORM */}
    <section id="signup" className="bg-surface px-4 sm:px-6 lg:px-8 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 space-y-3 text-center">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
            Create Your Academy Workspace
          </h2>
          <p className="text-muted mx-auto max-w-md text-sm sm:text-base">
            Provision isolated multi-tenant records nodes and structural administrator properties
            concurrently.
          </p>
        </div>

        <div className="mx-auto max-w-xl">
          <div className="card bg-surface-secondary border-border border p-8 shadow-lg">
            <h3 className="mb-1 text-xl font-black tracking-tight">Academy Workspace Setup</h3>
            <p className="text-muted mb-6 text-xs">
              Already have an active system domain configured?{' '}
              <Link to="/login/admin" className="text-accent font-bold hover:underline">
                Admin Entrance Port
              </Link>
            </p>

            <form onSubmit={handleSignupSubmit} noValidate className="space-y-5">
              <div>
                <label className="label" htmlFor="signupName">
                  Full Legal Name
                </label>
                <input
                  className={inputThemeStyles}
                  id="signupName"
                  name="name"
                  value={signupForm.name || ''}
                  onChange={handleSignupChange}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="signupEmail">
                  Identity Email
                </label>
                <input
                  className={inputThemeStyles}
                  type="email"
                  id="signupEmail"
                  name="email"
                  value={signupForm.email || ''}
                  onChange={handleSignupChange}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="signupPassword">
                  Security Password (Min 6 Characters)
                </label>
                <input
                  className={inputThemeStyles}
                  type="password"
                  id="signupPassword"
                  name="password"
                  value={signupForm.password || ''}
                  onChange={handleSignupChange}
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="signupAcademy">
                  Academy Corporate Name
                </label>
                <input
                  className={inputThemeStyles}
                  id="signupAcademy"
                  name="academy_name"
                  value={signupForm.academy_name || ''}
                  onChange={handleSignupChange}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="signupPhone">
                  Contact Number
                </label>
                <input
                  className={inputThemeStyles}
                  type="tel"
                  id="signupPhone"
                  name="phone_number"
                  value={signupForm.phone_number || ''}
                  onChange={handleSignupChange}
                />
              </div>

              {/* GPS Location Setup */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="signupCity">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    className={inputThemeStyles}
                    id="signupCity"
                    name="city"
                    value={signupForm.city || ''}
                    onChange={handleSignupChange}
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="signupState">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    className={inputThemeStyles}
                    id="signupState"
                    name="state"
                    value={signupForm.state || ''}
                    onChange={handleSignupChange}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="signupAddress">
                  Full Address (Optional)
                </label>
                <input
                  className={inputThemeStyles}
                  id="signupAddress"
                  name="address"
                  value={signupForm.address || ''}
                  onChange={handleSignupChange}
                  placeholder="Street address, landmark, etc."
                />
              </div>

              <div>
                <label className="label" htmlFor="signupRadius">
                  Attendance Radius (meters)
                </label>
                <input
                  className={inputThemeStyles}
                  type="number"
                  id="signupRadius"
                  name="attendance_radius_meters"
                  value={signupForm.attendance_radius_meters || 100}
                  onChange={handleSignupChange}
                  min="50"
                  max="5000"
                />
                <p className="text-xs text-muted mt-1">
                  Maximum distance from academy location for attendance verification (50-5000m)
                </p>
              </div>

              <div className="p-4 bg-surface-secondary border border-border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                    <label className="font-semibold text-sm">Academy Location</label>
                  </div>
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={gettingLocation}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-gray-400 text-sm font-medium flex items-center gap-2"
                  >
                    {gettingLocation ? 'Getting Location...' : 'Set Academy Location'}
                  </button>
                </div>

                {gpsError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-3">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p className="text-xs">{gpsError}</p>
                  </div>
                )}

                {signupForm.latitude && signupForm.longitude && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs text-green-700">
                      <span className="font-medium">Location captured:</span>
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Lat: {signupForm.latitude.toFixed(7)}<br />
                      Lon: {signupForm.longitude.toFixed(7)}
                    </p>
                  </div>
                )}

                {!signupForm.latitude && !signupForm.longitude && !gpsError && (
                  <p className="text-xs text-muted mt-2">
                    Click "Set Academy Location" to capture GPS coordinates for attendance verification
                  </p>
                )}
              </div>

              <div>
                <label className="label" htmlFor="signupPlan">
                  Core Subscribed Workspace Tier
                </label>
                <select
                  className={`${inputThemeStyles} cursor-pointer py-3`}
                  id="signupPlan"
                  name="subscription_plan"
                  value={signupForm.subscription_plan || 'free'}
                  onChange={handleSignupChange}
                  required
                >
                  <option value="free" className="bg-surface text-foreground">
                    Free Starter Tier — Max 3 Coaches / 30 Student Matrix
                  </option>
                  <option value="pro" className="bg-surface text-foreground">
                    Pro Academy Tier — Max 6 Coaches / 80 Student Matrix
                  </option>
                  <option value="plus" className="bg-surface text-foreground">
                    Plus Enterprise Tier — Complete Unrestricted Operational Pipelines
                  </option>
                </select>
              </div>
              <div className="flex gap-4 pt-2">
                <button
                  type="submit"
                  className="btn-gradient-primary shadow-accent/10 flex-1 rounded-xl py-3.5 text-sm font-bold tracking-wide shadow-md transition-all active:scale-95"
                  disabled={signupLoading}
                >
                  {signupLoading ? 'Configuring instances...' : 'Create Academy Account'}
                </button>
                <button
                  type="button"
                  className="btn-secondary text-muted px-5 transition-transform active:scale-95"
                  onClick={() => setActiveModal('signup')}
                >
                  Clear Form
                </button>
              </div>
              {signupMessage.text && (
                <p
                  className={
                    signupMessage.type === 'success'
                      ? 'alert-success m-0 mt-4'
                      : 'alert-error m-0 mt-4'
                  }
                  role="alert"
                >
                  {signupMessage.text}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>

    {/* FORM RESET DRAFT PROTECTION MODAL DIALOG */}
    {activeModal !== null && (
      <div className="fixed inset-0 z-50 flex animate-[premiumFadeIn_0.2s_ease-out] items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="card bg-surface border-border w-full max-w-md border p-8 shadow-2xl">
          <h4 className="text-foreground mb-2 text-xl font-black tracking-tight">
            Clear Active Input Fields?
          </h4>
          <p className="text-muted mb-6 text-sm leading-relaxed">
            This choice resets your continuous auto-save database cache slice for this template
            view and drops tracked changes entirely.
          </p>
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={() => setActiveModal(null)}
              className="btn-secondary px-4 py-2.5 text-sm font-bold transition-transform active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={() => clearFormState(activeModal)}
              className="btn-gradient-orange rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition-all active:scale-95"
            >
              Reset System Draft
            </button>
          </div>
        </div>
      </div>
    )}

    {/* FOOTER */}
    <footer className="border-border bg-surface-secondary text-muted relative z-10 border-t py-14 text-xs">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
        <div className="font-bold tracking-wide">
          &copy; 2026 SAMS — Sports Academy Management System. All application configurations
          active.
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
