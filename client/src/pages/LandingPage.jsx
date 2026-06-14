import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar, { NavbarActions } from '../components/Navbar';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { PRICING_PLANS, publicPost, signup } from '../api/client';

const initialSignup = {
  name: '',
  email: '',
  password: '',
  academy_name: '',
  phone_number: '',
  subscription_plan: 'free'
};

const initialContact = { 
  name: '', 
  email: '', 
  phone: '', 
  message: '' 
};

const SPORTS = [
  { name: 'Cricket', icon: '🏏', bg: 'from-emerald-500/10 to-teal-500/5' },
  { name: 'Football', icon: '⚽', bg: 'from-green-500/10 to-emerald-500/5' },
  { name: 'Basketball', icon: '🏀', bg: 'from-orange-500/10 to-amber-500/5' },
  { name: 'Tennis', icon: '🎾', bg: 'from-lime-500/10 to-emerald-500/5' },
  { name: 'Badminton', icon: '🏸', bg: 'from-cyan-500/10 to-teal-500/5' },
  { name: 'Swimming', icon: '🏊', bg: 'from-blue-500/10 to-indigo-500/5' }
];

const FACILITIES = [
  { title: 'Professional Turf & Nets', desc: 'High-grade seasonal multi-lane training spaces.', icon: '🏟️' },
  { title: 'Fitness & Recovery Zone', desc: 'Dedicated sports science and athletic recovery hubs.', icon: '🏋️‍♂️' },
  { title: 'Locker Rooms & Hydration Stations', desc: 'Smart sanitization loops and specialized player amenities.', icon: '💧' },
  { title: 'Parent Viewing Gallery', desc: 'Premium elevated spaces for training observation sessions.', icon: '👥' }
];

const TESTIMONIALS = [
  ['Rajesh K.', 'Parent', 'Attendance alerts give us peace of mind every training day.', '👥'],
  ['Coach Meera', 'Head Coach', 'Batch scheduling and fee tracking saved hours every week.', '📋'],
  ['Elite Sports Club', 'Academy Admin', 'We scaled from one branch to three without spreadsheets.', '⚡']
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { isInstallable, installHint, promptInstall } = usePwaInstall();

  // FORM DATA PROTECTION STATE LAYER (AUTO-SAVE & RECOVERY)
  const [signupForm, setSignupForm] = useState(() => {
    const savedDraft = localStorage.getItem('sams_draft_public_signup');
    return savedDraft ? JSON.parse(savedDraft) : initialSignup;
  });
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupMessage, setSignupMessage] = useState({ text: '', type: '' });

  const [contactForm, setContactForm] = useState(() => {
    const savedDraft = localStorage.getItem('sams_draft_public_contact');
    return savedDraft ? JSON.parse(savedDraft) : initialContact;
  });
  const [contactLoading, setContactLoading] = useState(false);
  const [contactMessage, setContactMessage] = useState({ text: '', type: '' });

  const [activeModal, setActiveModal] = useState(null); // 'signup' | 'contact' | null

  // Auto-Save Persistence Loops
  useEffect(() => {
    localStorage.setItem('sams_draft_public_signup', JSON.stringify(signupForm));
  }, [signupForm]);

  useEffect(() => {
    localStorage.setItem('sams_draft_public_contact', JSON.stringify(contactForm));
  }, [contactForm]);

  const handleSignupChange = (event) => {
    const { name, value } = event.target;
    setSignupForm((prev) => ({ ...prev, [name]: value }));
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
    setSignupLoading(true);
    setSignupMessage({ text: '', type: '' });

    try {
      const result = await signup({
        name: signupForm.name.trim(),
        email: signupForm.email.trim(),
        password: signupForm.password,
        academy_name: signupForm.academy_name.trim(),
        phone_number: signupForm.phone_number.trim() || undefined,
        subscription_plan: signupForm.subscription_plan
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
        message: contactForm.message.trim()
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
    window.location.href = '/super-admin-login';
  };

  // Shared utility string to suppress white background states on inputs across all viewports
  const inputThemeStyles = "input-field bg-[var(--color-input)] dark:bg-[#09090b] text-foreground border-border focus:border-accent focus:ring-accent/20 autofill:shadow-[0_0_0_30px_var(--color-input)_inset] autofill:text-foreground";

  return (
    <div className="min-h-screen bg-surface text-foreground overflow-x-hidden selection:bg-accent/20 transition-colors duration-200">
      
      {/* NAVIGATION HEADER */}
      <Navbar>
        <nav className="hidden items-center gap-6 md:flex">
          <a href="#about" className="text-sm font-bold text-muted hover:text-accent transition-colors">About</a>
          <a href="#sports" className="text-sm font-bold text-muted hover:text-accent transition-colors">Sports Streams</a>
          <a href="#facilities" className="text-sm font-bold text-muted hover:text-accent transition-colors">Facilities</a>
          <a href="#testimonials" className="text-sm font-bold text-muted hover:text-accent transition-colors">Testimonials</a>
          <a href="#pricing" className="text-sm font-bold text-muted hover:text-accent transition-colors">Pricing Plans</a>
          <a href="#contact" className="text-sm font-bold text-muted hover:text-accent transition-colors">Contact</a>
          <Link to="/coach/login" className="text-sm font-bold text-muted hover:text-accent transition-colors">Coach Login</Link>
        </nav>
        <NavbarActions>
          {isInstallable && (
            <button type="button" className="btn-success btn-sm transition-transform active:scale-95" onClick={promptInstall}>
              Install App
            </button>
          )}
          <Link to="/login/admin" className="btn-secondary btn-sm transition-transform active:scale-95">Admin Login</Link>
          <a href="#signup" className="btn-primary btn-sm text-white font-bold transition-transform active:scale-95">Admin Signup</a>
        </NavbarActions>
      </Navbar>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-accent/10 via-surface-secondary to-surface px-6 py-24 lg:py-36">
        
        {/* Animated Background Graphics and Floating Sports Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0 opacity-40">
          <div className="absolute top-12 left-10 text-6xl animate-[spin_25s_linear_infinite] opacity-30">⚽</div>
          <div className="absolute bottom-20 left-1/4 text-5xl animate-[bounce_4s_ease-in-out_infinite] opacity-20">🏀</div>
          <div className="absolute top-24 right-1/3 text-6xl animate-[pulse_3s_ease-in-out_infinite] opacity-20">🏸</div>
          <div className="absolute bottom-12 right-12 text-7xl animate-[spin_30s_linear_infinite] opacity-20">🎾</div>
          <div className="absolute top-1/3 right-10 text-5xl animate-[bounce_5s_ease-in-out_infinite] opacity-30">🏏</div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--color-accent-light),transparent_50%)] opacity-50" />
        </div>
        
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2 relative z-10">
          <div className="space-y-8 animate-[premiumFadeIn_0.6s_cubic-bezier(0.16,1,0.3,1)_forwards]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-accent border border-accent/20">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              ⚡ High-Performance Academy Engine
            </span>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl leading-[1.05]">
              Accelerate Athletic Growth at <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-emerald-500">Enterprise Scale</span>
            </h1>
            <p className="max-w-xl text-base sm:text-lg text-muted leading-relaxed">
              Onboard your multi-tenant sports academy in moments. Seamlessly orchestrate elite coaches, dynamic student batches, payment tracking, and real-time parent notifications.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <a href="#signup" className="btn-primary px-8 py-4 text-base shadow-accent-glow text-white font-black transition-all hover:scale-[1.03] active:scale-[0.97]">
                Start Free Trial
              </a>
              {isInstallable && (
                <button type="button" className="btn-success px-8 py-4 text-base text-white font-black transition-all hover:scale-[1.03] active:scale-[0.97]" onClick={promptInstall}>
                  Install App System
                </button>
              )}
            </div>
            
            {/* KPI METRICS TRACKER */}
            <div className="mt-12 grid grid-cols-3 gap-4">
              {[
                { val: '4', label: 'Core Modules' },
                { val: '100%', label: 'Data Safety' },
                { val: 'MySQL', label: 'Robust Base' }
              ].map((kpi, idx) => (
                <div key={idx} className="card text-center py-5 bg-surface-secondary/70 backdrop-blur-sm border-border/60 group hover:border-accent/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                  <div className="text-3xl font-black text-accent transition-transform duration-300 group-hover:scale-110">{kpi.val}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted mt-2">{kpi.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ATTRIBUTES GRID */}
          <div className="grid gap-4 sm:grid-cols-2 animate-[premiumFadeIn_0.9s_cubic-bezier(0.16,1,0.3,1)_forwards]">
            {[
              ['Academy Command', 'Provision professional coach workspaces, register student paths, and oversee audit execution records.', '🏢'],
              ['Smart Batch Flows', 'Automate schedule conflict isolation, map team capacities, and cross-validate sport availability.', '🧠'],
              ['Coach Portals', 'Execute quick attendance logging alongside automated condition alerts delivered directly to parent emails.', '📋'],
              ['Secure Architecture', 'MERN architecture optimized via structural relational database engines for high-performance joins.', '🛡️']
            ].map(([title, desc, icon]) => (
              <article 
                key={title} 
                className="card bg-surface-secondary border border-border/80 shadow-sm flex flex-col justify-between p-6 relative group overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-md hover:border-accent/30"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-accent transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top" />
                <div>
                  <div className="text-3xl mb-4 transition-transform duration-300 group-hover:scale-120 group-hover:rotate-6 inline-block">{icon}</div>
                  <h3 className="mb-2 text-base font-black text-foreground tracking-tight">{title}</h3>
                  <p className="m-0 text-sm text-muted leading-relaxed">{desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT ACADEMY */}
      <section id="about" className="border-b border-border bg-surface-secondary px-6 py-24 relative overflow-hidden">
        <div className="mx-auto max-w-4xl text-center space-y-6 relative z-10">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Unified Operations Framework</h2>
          <div className="w-16 h-1 bg-accent mx-auto my-4 rounded-full" />
          <p className="text-base sm:text-lg text-muted leading-relaxed max-w-3xl mx-auto">
            SAMS resolves structural fragmentation within sports organizations. We connect coach schedules, automated parental confirmation pipelines, and structural transaction ledger tracking under a single secure, responsive workspace.
          </p>
        </div>
      </section>

      {/* SPORTS OFFERED */}
      <section id="sports" className="px-6 py-24 border-b border-border relative bg-surface">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-4 text-center text-3xl font-black tracking-tight sm:text-4xl">Sports Streams Offered</h2>
          <p className="text-muted text-sm text-center mb-16 max-w-md mx-auto">Enforce clean validation streams mapping across dynamic sport configurations.</p>
          
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {SPORTS.map((sport) => (
              <article 
                key={sport.name} 
                className={`card relative overflow-hidden bg-gradient-to-br ${sport.bg} border border-border p-8 text-center cursor-pointer group transition-all duration-300 hover:-translate-y-2 hover:shadow-lg hover:border-accent/50`}
              >
                <div className="text-5xl mb-4 transform group-hover:scale-120 transition-transform duration-300 group-hover:animate-bounce inline-block">
                  {sport.icon}
                </div>
                <div className="font-black text-lg text-foreground tracking-tight group-hover:text-accent transition-colors">
                  {sport.name}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FACILITIES */}
      <section id="facilities" className="bg-surface-secondary px-6 py-24 border-b border-border">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-4 text-center text-3xl font-black tracking-tight sm:text-4xl">World-Class Infrastructure</h2>
          <p className="text-muted text-sm text-center mb-16 max-w-md mx-auto">Premium physical operational foundations optimized for high-tier telemetry support.</p>
          
          <div className="grid gap-6 md:grid-cols-2">
            {FACILITIES.map((item, idx) => (
              <div 
                key={idx} 
                className="card flex items-start gap-5 text-sm bg-surface border border-border/70 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-accent/30 hover:-translate-y-0.5"
              >
                <div className="p-3 rounded-xl bg-surface-secondary text-2xl shadow-inner transition-transform duration-300">{item.icon}</div>
                <div>
                  <h3 className="text-base font-black text-foreground mb-1 tracking-tight">{item.title}</h3>
                  <p className="text-muted text-sm leading-relaxed m-0">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL MONITOR BAR */}
      <section id="testimonials" className="px-6 py-24 border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-4 text-center text-3xl font-black tracking-tight sm:text-4xl">System Endorsements</h2>
          <p className="text-muted text-sm text-center mb-16 max-w-md mx-auto">Verified architectural performance markers derived from active managers.</p>
          
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map(([name, role, quote, icon]) => (
              <blockquote key={name} className="card bg-surface-secondary border border-border/80 flex flex-col justify-between m-0 p-6 relative transition-all duration-300 hover:shadow-md hover:border-accent/20">
                <span className="text-5xl text-accent/10 absolute top-2 right-4 pointer-events-none font-serif select-none">“</span>
                <div>
                  <div className="text-2xl mb-4">{icon}</div>
                  <p className="text-muted italic text-sm leading-relaxed m-0 font-medium">&ldquo;{quote}&rdquo;</p>
                </div>
                <footer className="mt-8 pt-4 border-t border-border/60 font-black text-sm text-foreground not-italic flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-black">{name.charAt(0)}</div>
                  <div>
                    {name}
                    <span className="block text-xs font-bold text-muted mt-0.5 tracking-normal">{role}</span>
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING TIER TRACK MODULE */}
      <section id="pricing" className="px-6 py-24 border-b border-border bg-gradient-to-b from-surface to-surface-secondary/30">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center space-y-3">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Simple, Transparent Pricing</h2>
            <p className="text-muted text-sm sm:text-base max-w-md mx-auto">Choose the processing arrangement calibrated to your active student metrics.</p>
          </div>
          
          <div className="grid gap-8 lg:grid-cols-3 items-stretch">
            {PRICING_PLANS.map((plan) => (
              <article
                key={plan.id}
                className={`card bg-surface-secondary flex flex-col justify-between border-2 p-8 transition-all duration-300 hover:-translate-y-1.5 ${
                  plan.featured ? 'border-accent shadow-accent-glow relative' : 'border-border/80'
                }`}
              >
                <div className="relative">
                  {plan.featured && (
                    <span className="absolute -top-12 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1.5 text-[10px] font-black text-white uppercase tracking-widest shadow-md">
                      Recommended Tier
                    </span>
                  )}
                  <p className="text-xs font-black uppercase tracking-widest text-accent mb-2">{plan.name}</p>
                  <p className="my-4 text-5xl font-black text-foreground tracking-tight">
                    ${plan.price}
                    <span className="text-xs font-bold text-muted tracking-wide ml-1">/ month</span>
                  </p>
                  
                  <ul className="my-8 space-y-4 border-t border-border pt-6 text-sm text-muted list-none p-0">
                    <li className="flex items-center gap-2.5">
                      <span className="text-accent font-black">✓</span>
                      <span>Up to <strong className="text-foreground font-black">{plan.coaches}</strong> Active Coaches</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="text-accent font-black">✓</span>
                      <span>Up to <strong className="text-foreground font-black">{plan.students}</strong> Registered Profiles</span>
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
                  className={`${plan.featured ? 'bg-accent text-white hover:bg-accent-hover' : 'btn-secondary'} w-full py-3.5 rounded-xl text-sm font-bold shadow-md transition-transform active:scale-95`} 
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
      <section id="contact" className="border-b border-border bg-surface-secondary px-6 py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 items-center">
          <div className="space-y-4 text-center lg:text-left">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Contact Administration</h2>
            <p className="text-muted text-sm sm:text-base max-w-md mx-auto lg:mx-0 leading-relaxed">
              Inquire regarding multi-campus instance orchestration or global custom parameter layers. Your inquiry vector is protected via cached transactional recovery loops.
            </p>
          </div>
          
          <div className="card bg-surface border border-border shadow-md p-8">
            <form className="space-y-5" onSubmit={handleContactSubmit}>
              <div>
                <label className="label">Full Legal Name</label>
                <input className={inputThemeStyles} name="name" placeholder="Your name" value={contactForm.name} onChange={handleContactChange} required />
              </div>
              <div>
                <label className="label">Identity Email Address</label>
                <input className={inputThemeStyles} type="email" name="email" placeholder="Email" value={contactForm.email} onChange={handleContactChange} required />
              </div>
              <div>
                <label className="label">Phone Number (Optional)</label>
                <input className={inputThemeStyles} type="tel" name="phone" placeholder="Phone (optional)" value={contactForm.phone} onChange={handleContactChange} />
              </div>
              <div>
                <label className="label">Inquiry Description</label>
                <textarea className={`${inputThemeStyles} min-h-[120px] resize-none py-3.5`} name="message" placeholder="Message" value={contactForm.message} onChange={handleContactChange} required />
              </div>
              <div className="flex gap-4 pt-2">
                <button type="submit" className="bg-accent text-white hover:bg-accent-hover flex-1 py-3.5 rounded-xl font-bold text-sm transition-transform active:scale-95 shadow-md" disabled={contactLoading}>
                  {contactLoading ? 'Transmitting parameters...' : 'Send Message'}
                </button>
                <button type="button" className="btn-secondary text-muted px-5 transition-transform active:scale-95" onClick={() => setActiveModal('contact')}>
                  Clear Form
                </button>
              </div>
              {contactMessage.text && (
                <p className={contactMessage.type === 'success' ? 'alert-success m-0 mt-4' : 'alert-error m-0 mt-4'}>{contactMessage.text}</p>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* ACADEMY WORKSPACE SIGNUP FORM */}
      <section id="signup" className="px-6 py-24 bg-surface">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center space-y-3">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Create Your Academy Workspace</h2>
            <p className="text-muted text-sm sm:text-base max-w-md mx-auto">Provision isolated multi-tenant records nodes and structural administrator properties concurrently.</p>
          </div>
          
          <div className="mx-auto max-w-xl">
            <div className="card bg-surface-secondary border border-border shadow-lg p-8">
              <h3 className="text-xl font-black mb-1 tracking-tight">Academy Workspace Setup</h3>
              <p className="mb-6 text-xs text-muted">
                Already have an active system domain configured?{' '}
                <Link to="/login/admin" className="font-bold text-accent hover:underline">
                  Admin Entrance Port
                </Link>
              </p>
              
              <form onSubmit={handleSignupSubmit} noValidate className="space-y-5">
                <div>
                  <label className="label" htmlFor="signupName">Full Legal Name</label>
                  <input className={inputThemeStyles} id="signupName" name="name" value={signupForm.name} onChange={handleSignupChange} required />
                </div>
                <div>
                  <label className="label" htmlFor="signupEmail">Identity Email</label>
                  <input className={inputThemeStyles} type="email" id="signupEmail" name="email" value={signupForm.email} onChange={handleSignupChange} required />
                </div>
                <div>
                  <label className="label" htmlFor="signupPassword">Security Password (Min 6 Characters)</label>
                  <input className={inputThemeStyles} type="password" id="signupPassword" name="password" value={signupForm.password} onChange={handleSignupChange} minLength={6} required />
                </div>
                <div>
                  <label className="label" htmlFor="signupAcademy">Academy Corporate Name</label>
                  <input className={inputThemeStyles} id="signupAcademy" name="academy_name" value={signupForm.academy_name} onChange={handleSignupChange} required />
                </div>
                <div>
                  <label className="label" htmlFor="signupPhone">Contact Number</label>
                  <input className={inputThemeStyles} type="tel" id="signupPhone" name="phone_number" value={signupForm.phone_number} onChange={handleSignupChange} />
                </div>
                <div>
                  <label className="label" htmlFor="signupPlan">Core Subscribed Workspace Tier</label>
                  <select className={`${inputThemeStyles} py-3 cursor-pointer`} id="signupPlan" name="subscription_plan" value={signupForm.subscription_plan} onChange={handleSignupChange} required>
                    <option value="free" className="bg-surface text-foreground">Free Starter Tier — Max 3 Coaches / 30 Student Matrix</option>
                    <option value="pro" className="bg-surface text-foreground">Pro Academy Tier — Max 6 Coaches / 80 Student Matrix</option>
                    <option value="plus" className="bg-surface text-foreground">Plus Enterprise Tier — Complete Unrestricted Operational Pipelines</option>
                  </select>
                </div>
                <div className="flex gap-4 pt-2">
                  <button type="submit" className="bg-accent text-white hover:bg-accent-hover flex-1 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-95 shadow-md shadow-accent/10" disabled={signupLoading}>
                    {signupLoading ? 'Configuring instances...' : 'Create Academy Account'}
                  </button>
                  <button type="button" className="btn-secondary text-muted px-5 transition-transform active:scale-95" onClick={() => setActiveModal('signup')}>
                    Clear Form
                  </button>
                </div>
                {signupMessage.text && (
                  <p className={signupMessage.type === 'success' ? 'alert-success m-0 mt-4' : 'alert-error m-0 mt-4'} role="alert">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[premiumFadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md card bg-surface border border-border p-8 shadow-2xl">
            <h4 className="text-xl font-black tracking-tight text-foreground mb-2">Clear Active Input Fields?</h4>
            <p className="text-sm text-muted mb-6 leading-relaxed">
              This choice resets your continuous auto-save database cache slice for this template view and drops tracked changes entirely.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button onClick={() => setActiveModal(null)} className="btn-secondary py-2.5 px-4 font-bold text-sm transition-transform active:scale-95">
                Cancel
              </button>
              <button 
                onClick={() => clearFormState(activeModal)} 
                className="btn bg-danger text-white hover:bg-danger/90 py-2.5 px-5 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95"
              >
                Reset System Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-border bg-surface-secondary py-14 text-xs text-muted relative z-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between px-6 sm:flex-row gap-6">
          <div className="font-bold tracking-wide">
            &copy; 2026 SAMS — Sports Academy Management System. All application configurations active.
          </div>
          
          <div 
            onDoubleClick={handleSecretGateway}
            className="cursor-default select-none opacity-20 hover:opacity-100 text-base transition-opacity duration-300 px-6 py-2"
            title="Operational System Diagnostics: Normal"
          >
            🍃
          </div>

          <div className="flex space-x-6 font-black tracking-wider uppercase text-[10px]">
            <a href="#privacy" className="hover:text-accent transition-colors">Privacy Matrix</a>
            <a href="#terms" className="hover:text-accent transition-colors">Operational Terms</a>
          </div>
        </div>
      </footer>

    </div>
  );
}