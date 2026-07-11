import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import ThemeToggle from '../components/ThemeToggle';
import { coachLogin, getCoachToken } from '../api/client';

export default function CoachLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (getCoachToken()) {
      navigate('/coach/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      await coachLogin({
        email: form.email.trim(),
        password: form.password,
      });
      setMessage({ text: 'Login successful. Opening coach portal...', type: 'success' });
      setTimeout(() => navigate('/coach/dashboard'), 600);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen text-slate-900 dark:text-white font-sans selection:bg-lime-400 selection:text-slate-900 flex flex-col relative">
      
      {/* FULL PAGE DYNAMIC BACKGROUND */}
      <div className="fixed inset-0 w-full h-full bg-slate-900 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#a3e635 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        <div className="absolute top-0 right-0 h-full w-full bg-lime-500 origin-top-right transition-transform" style={{ clipPath: 'polygon(45% 0, 100% 0, 100% 100%, 15% 100%)' }}></div>
      </div>

      <div className="relative z-20">
        <Navbar>
          <Link to="/" className="text-xs font-black uppercase tracking-wider text-slate-700 hover:text-lime-600 dark:text-slate-200">
            Home
          </Link>
          <Link to="/login/admin" className="text-xs font-black uppercase tracking-wider text-slate-700 hover:text-lime-600 dark:text-slate-200">
            Admin Login
          </Link>
          <ThemeToggle />
        </Navbar>
      </div>

      <main className="relative z-10 flex-grow flex items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-6"
        >
          {/* Header Text */}
          <div className="text-center">
            <h1 className="text-white text-3xl font-black tracking-tight sm:text-5xl uppercase drop-shadow-md">
              COACH <span className="bg-slate-900 text-lime-400 px-3 ml-2">PORTAL</span>
            </h1>
            <p className="mx-auto mt-3 max-w-md text-[10px] font-black uppercase tracking-widest text-slate-200 drop-shadow-sm leading-relaxed">
              Use the credentials sent by your academy administrator
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white border-2 border-slate-100 p-6 sm:p-8 shadow-2xl dark:bg-slate-800 dark:border-slate-700 relative">
            <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 bg-lime-500" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}></div>
            
            <form onSubmit={handleSubmit} noValidate className="space-y-4 relative z-10">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2" htmlFor="coachEmail">
                  Email
                </label>
                <input
                  id="coachEmail"
                  name="email"
                  type="email"
                  className="w-full rounded-none border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 transition-colors focus:border-lime-500 focus:bg-white focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-lime-500"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2" htmlFor="coachPassword">
                  Password
                </label>
                <input
                  id="coachPassword"
                  name="password"
                  type="password"
                  className="w-full rounded-none border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 transition-colors focus:border-lime-500 focus:bg-white focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-lime-500"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                />
              </div>
              
              <div className="text-right">
                <Link to="/forgot-password" className="text-[10px] font-black uppercase tracking-widest text-lime-600 hover:text-lime-500 transition-colors">
                  Forgot password?
                </Link>
              </div>

              <button 
                type="submit" 
                className="w-full mt-2 bg-lime-400 px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-900 transition-all hover:bg-lime-500 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Sign In'}
              </button>
            </form>

            {message.text && (
              <p className={`p-3 text-center text-[10px] font-bold uppercase tracking-widest border-l-4 mt-6 ${message.type === 'error' ? 'bg-red-50 text-red-700 border-red-500' : 'bg-lime-50 text-lime-800 border-lime-500'}`}>
                {message.text}
              </p>
            )}
          </div>

          <div className="text-center">
            <Link to="/" className="text-[10px] font-black uppercase tracking-widest text-slate-200 drop-shadow-md hover:text-lime-400 transition-colors">
              &larr; Back to Home
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}