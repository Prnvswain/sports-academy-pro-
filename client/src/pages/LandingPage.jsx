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

const SPORTS = ['Cricket', 'Football', 'Basketball', 'Tennis', 'Badminton', 'Swimming'];
const FACILITIES = [
  'Professional turf & nets',
  'Fitness & recovery zone',
  'Locker rooms & hydration stations',
  'Parent viewing gallery'
];
const TESTIMONIALS = [
  ['Rajesh K.', 'Parent', 'Attendance alerts give us peace of mind every training day.'],
  ['Coach Meera', 'Head Coach', 'Batch scheduling and fee tracking saved hours every week.'],
  ['Elite Sports Club', 'Academy Admin', 'We scaled from one branch to three without spreadsheets.']
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { isInstallable, installHint, promptInstall } = usePwaInstall();

  // 1. FORM DATA PROTECTION STATE LAYER (AUTO-SAVE & RECOVERY)
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

  // Confirmation Modals Trigger Flags
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

  // Draft Recovery Reset Handlers
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

  // 2. SECURE PASSIVE REDIRECTION INTERACTION (SUPER ADMIN HIDDEN GATEWAY)
  const handleSecretGateway = () => {
    window.location.href = '/super-admin-login';
  };

  return (
    <div className="min-h-screen bg-surface text-foreground transition-colors duration-200">
      
      {/* 3. NAVIGATION HEADER MODULE */}
      <Navbar>
        <nav className="hidden items-center gap-6 md:flex">
          <a href="#about" className="text-sm font-bold text-muted hover:text-accent transition-colors">About</a>
          <a href="#sports" className="text-sm font-bold text-muted hover:text-accent transition-colors">Sports Streams</a>
          <a href="#facilities" className="text-sm font-bold text-muted hover:text-accent transition-colors">Facilities</a>
          <a href="#testimonials" className="text-sm font-bold text-muted hover:text-accent transition-colors">Testimonials</a>
          <a href="#pricing" className="text-sm font-bold text-muted hover:text-accent transition-colors">Pricing Plans</a>
          <a href="#contact" className="text-sm font-bold text-muted hover:text-accent transition-colors">Contact</a>
          <Link to="/login/admin" className="text-sm font-bold text-muted hover:text-accent transition-colors">
            Admin Login
          </Link>
          <Link to="/coach/login" className="text-sm font-bold text-muted hover:text-accent transition-colors">
            Coach Login
          </Link>
        </nav>
        <NavbarActions>
          {isInstallable && (
            <button type="button" className="btn-success btn-sm" onClick={promptInstall}>
              Install App
            </button>
          )}
          <Link to="/login/admin" className="btn-secondary btn-sm">
            Admin Login
          </Link>
          <a href="#signup" className="btn-primary btn-sm">
            Admin Signup
          </a>
        </NavbarActions>
      </Navbar>

      {/* 4. HERO SECTION */}
      <section className="border-b border-border bg-gradient-to-br from-accent/5 via-surface-secondary to-surface px-6 py-20 lg:py-32">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            <span className="inline-block rounded-full bg-accent/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-accent">
              ⚡ Multi-Tenant Sports SaaS
            </span>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]">
              Run Your Sports Academy at <span className="text-accent">Enterprise Scale</span>
            </h1>
            <p className="max-w-xl text-base sm:text-lg text-muted leading-relaxed">
              Onboard your academy in minutes. Manage coaches, students, smart batches, fees, and secure real-time parent attendance communication from one premium platform.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <a href="#signup" className="btn-primary px-8 py-4">
                Start Free Trial
              </a>
              {isInstallable && (
                <button type="button" className="btn-success px-8 py-4" onClick={promptInstall}>
                  Install App System
                </button>
              )}
            </div>
            {installHint && (
              <p className="alert-info mt-4 inline-block" role="status">
                {installHint}
              </p>
            )}
            
            {/* KPI TRACKING METRICS GRID */}
            <div className="mt-10 grid grid-cols-3 gap-4">
              <div className="card text-center py-4 bg-surface-secondary">
                <div className="text-3xl font-black text-accent">4</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted mt-1">Core Modules</div>
              </div>
              <div className="card text-center py-4 bg-surface-secondary">
                <div className="text-3xl font-black text-accent">100%</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted mt-1">Data Safety</div>
              </div>
              <div className="card text-center py-4 bg-surface-secondary">
                <div className="text-3xl font-black text-accent">PWA</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted mt-1">Offline Base</div>
              </div>
            </div>
          </div>

          {/* GREEN PALETTE REBUILT ATTRIBUTES GRID */}
          <div id="features" className="grid gap-4 sm:grid-cols-2">
            {[
              ['Academy Administration', 'Provision distinct coach workspaces, register student profiles, and track transaction logs and pending fees.'],
              ['Coach Portals', 'Mark attendance states seamlessly with immediate automated notification logs direct to parent emails.'],
              ['Secure Registration', 'Single-transaction processing framework handles academy configurations and admin creation concurrently.'],
              ['Install Anywhere', 'Add SAMS directly to native home screens utilizing background chromium progressive web application systems.']
            ].map(([title, desc]) => (
              <article key={title} className="card bg-surface-secondary hover:shadow-card border border-border">
                <h3 className="mb-2 text-base font-bold text-foreground">{title}</h3>
                <p className="m-0 text-sm text-muted leading-relaxed">{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT ACADEMY */}
      <section id="about" className="border-b border-border bg-surface-secondary px-6 py-20">
        <div className="mx-auto max-w-4xl text-center space-y-4">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">About Our Academy Platform</h2>
          <p className="text-base sm:text-lg text-muted leading-relaxed">
            SAMS helps sports academies run operations end-to-end — from coach onboarding and batch scheduling to fee collection, parent communication, and performance insights. Built for multi-branch academies that need reliability, security, and a professional parent experience.
          </p>
        </div>
      </section>

      {/* SPORTS OFFERED */}
      <section id="sports" className="px-6 py-20 border-b border-border">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-12 text-center text-3xl font-black tracking-tight sm:text-4xl">Sports Streams Offered</h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {SPORTS.map((sport) => (
              <article key={sport} className="card text-center font-bold text-base bg-surface-secondary border border-border hover:border-accent/40 hover:text-accent">
                {sport}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FACILITIES */}
      <section id="facilities" className="bg-surface-secondary px-6 py-20 border-b border-border">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-12 text-center text-3xl font-black tracking-tight sm:text-4xl">World-Class Infrastructure</h2>
          <ul className="grid gap-4 md:grid-cols-2 list-none p-0 m-0">
            {FACILITIES.map((item) => (
              <li key={item} className="card flex items-center gap-4 text-sm font-semibold text-foreground bg-surface border border-border">
                <span className="text-accent text-lg font-black" aria-hidden="true">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* TESTIMONIAL MONITOR BAR */}
      <section id="testimonials" className="px-6 py-20 border-b border-border">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-12 text-center text-3xl font-black tracking-tight sm:text-4xl">System Endorsements</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map(([name, role, quote]) => (
              <blockquote key={name} className="card bg-surface-secondary border border-border flex flex-col justify-between m-0">
                <p className="text-muted italic text-sm leading-relaxed m-0">&ldquo;{quote}&rdquo;</p>
                <footer className="mt-6 pt-4 border-t border-border/60 font-bold text-sm text-foreground not-italic">
                  {name}
                  <span className="block text-xs font-semibold text-muted mt-0.5">{role}</span>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING TIER TRACK MODULE */}
      <section id="pricing" className="px-6 py-20 border-b border-border">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center space-y-2">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Simple, Transparent Pricing</h2>
            <p className="text-muted text-sm sm:text-base">Choose the configuration tier that matches your active academy metrics.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {PRICING_PLANS.map((plan) => (
              <article
                key={plan.id}
                className={`card bg-surface-secondary flex flex-col justify-between border ${
                  plan.featured ? 'border-accent shadow-accent-glow ring-1 ring-accent/30' : 'border-border'
                }`}
              >
                <div className="relative">
                  {plan.featured && (
                    <span className="absolute -top-9 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                      Most Selected Plan
                    </span>
                  )}
                  <p className="text-xs font-bold uppercase tracking-wider text-accent mb-2">{plan.name}</p>
                  <p className="my-2 text-4xl font-black text-foreground tracking-tight">
                    ${plan.price}
                    <span className="text-xs font-semibold text-muted tracking-normal">/month</span>
                  </p>
                  <ul className="my-6 space-y-3 border-t border-border pt-4 text-xs text-muted list-none p-0">
                    <li>
                      <strong className="text-foreground font-bold">Up to {plan.coaches}</strong> Active Coaches
                    </li>
                    <li>
                      <strong className="text-foreground font-bold">Up to {plan.students}</strong> Registered Profiles
                    </li>
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <span className="text-accent font-bold">✓</span> {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <button 
                  type="button" 
                  className={plan.featured ? 'btn-primary w-full' : 'btn-secondary w-full'} 
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
      <section id="contact" className="border-b border-border bg-surface-secondary px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2 items-start">
          <div className="space-y-3 text-center lg:text-left">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Contact Administration</h2>
            <p className="text-muted text-sm sm:text-base max-w-md">
              Questions regarding complex multi-campus configuration streams? Broadcast your inquiry parameters safely to system validation controllers.
            </p>
          </div>
          <div className="card bg-surface border border-border shadow-card">
            <form className="space-y-4" onSubmit={handleContactSubmit}>
              <div>
                <label className="label">Full Legal Name</label>
                <input className="input-field" name="name" placeholder="Your name" value={contactForm.name} onChange={handleContactChange} required />
              </div>
              <div>
                <label className="label">Identity Email Address</label>
                <input className="input-field" type="email" name="email" placeholder="Email" value={contactForm.email} onChange={handleContactChange} required />
              </div>
              <div>
                <label className="label">Phone Number (Optional)</label>
                <input className="input-field" type="tel" name="phone" placeholder="Phone (optional)" value={contactForm.phone} onChange={handleContactChange} />
              </div>
              <div>
                <label className="label">Inquiry Description</label>
                <textarea className="input-field min-h-[120px] resize-none" name="message" placeholder="Message" value={contactForm.message} onChange={handleContactChange} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={contactLoading}>
                  {contactLoading ? 'Transmitting parameters...' : 'Send Message'}
                </button>
                <button type="button" className="btn-secondary text-muted px-4" onClick={() => setActiveModal('contact')}>
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

      {/* ACADEMY SINGLE-TRANSACTION REGISTRATION WORKSPACE */}
      <section id="signup" className="px-6 py-20 bg-surface">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center space-y-2">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Create Your Academy Workspace</h2>
            <p className="text-muted text-sm sm:text-base">Provision your unique database instance nodes and main administrator credentials in one action loop.</p>
          </div>
          <div className="mx-auto max-w-xl">
            <div className="card bg-surface-secondary border border-border shadow-card">
              <h3 className="text-xl font-black mb-1">Academy Workspace Setup</h3>
              <p className="mb-6 text-xs text-muted">
                Already have an active system domain configured?{' '}
                <Link to="/login/admin" className="font-bold text-accent hover:underline">
                  Admin Entrance Port
                </Link>
              </p>
              <form onSubmit={handleSignupSubmit} noValidate className="space-y-4">
                <div>
                  <label className="label" htmlFor="signupName">Full Legal Name</label>
                  <input className="input-field" id="signupName" name="name" value={signupForm.name} onChange={handleSignupChange} required />
                </div>
                <div>
                  <label className="label" htmlFor="signupEmail">Identity Email</label>
                  <input className="input-field" type="email" id="signupEmail" name="email" value={signupForm.email} onChange={handleSignupChange} required />
                </div>
                <div>
                  <label className="label" htmlFor="signupPassword">Security Password (Min 6 Characters)</label>
                  <input className="input-field" type="password" id="signupPassword" name="password" value={signupForm.password} onChange={handleSignupChange} minLength={6} required />
                </div>
                <div>
                  <label className="label" htmlFor="signupAcademy">Academy Corporate Name</label>
                  <input className="input-field" id="signupAcademy" name="academy_name" value={signupForm.academy_name} onChange={handleSignupChange} required />
                </div>
                <div>
                  <label className="label" htmlFor="signupPhone">Contact Number</label>
                  <input className="input-field" type="tel" id="signupPhone" name="phone_number" value={signupForm.phone_number} onChange={handleSignupChange} />
                </div>
                <div>
                  <label className="label" htmlFor="signupPlan">Core Subscribed Workspace Tier</label>
                  <select className="input-field" id="signupPlan" name="subscription_plan" value={signupForm.subscription_plan} onChange={handleSignupChange} required>
                    <option value="free">Free Starter Tier — Max 3 Coaches / 30 Student Matrix</option>
                    <option value="pro">Pro Academy Tier — Max 6 Coaches / 80 Student Matrix</option>
                    <option value="plus">Plus Enterprise Tier — Complete Unrestricted Operational Pipelines</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="btn-primary flex-1" disabled={signupLoading}>
                    {signupLoading ? 'Configuring instances...' : 'Create Academy Account'}
                  </button>
                  <button type="button" className="btn-secondary text-muted px-4" onClick={() => setActiveModal('signup')}>
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

      {/* 5. FORM RESET DRAFT PROTECTION MODAL DIALOG */}
      {activeModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md card bg-surface border border-border p-6 shadow-2xl animate-premiumModal">
            <h4 className="text-lg font-black tracking-tight text-foreground mb-2">Clear Active Input Fields?</h4>
            <p className="text-sm text-muted mb-6 leading-relaxed">
              This structural choice resets your continuous auto-save database cache slice for this template view and drops tracked changes entirely.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button onClick={() => setActiveModal(null)} className="btn-secondary py-2">
                Cancel
              </button>
              <button 
                onClick={() => clearFormState(activeModal)} 
                className="btn bg-danger text-white hover:bg-danger/90 py-2 px-5 rounded-xl font-bold text-sm transition-colors"
              >
                Reset System Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. PASSIVE STYLISH FOOTER CONTAINING THE SECRET BUTTON */}
      <footer className="border-t border-border bg-surface-secondary py-12 text-xs text-muted">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between px-6 sm:flex-row gap-6">
          <div className="font-medium">
            &copy; 2026 SAMS — Sports Academy Management System. All application configurations active.
          </div>
          
          {/* Secret Interface Trigger - Styled to mirror standard layout decoration nodes */}
          <div 
            onDoubleClick={handleSecretGateway}
            className="cursor-default select-none opacity-20 hover:opacity-100 text-base transition-opacity px-6 py-2"
            title="Operational System Diagnostics: Normal"
          >
            🍃
          </div>

          <div className="flex space-x-6 font-semibold">
            <a href="#privacy" className="hover:text-accent transition-colors">Privacy Matrix</a>
            <a href="#terms" className="hover:text-accent transition-colors">Operational Terms</a>
          </div>
        </div>
      </footer>

    </div>
  );
}