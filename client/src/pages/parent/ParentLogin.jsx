import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { motion } from "framer-motion";
import Navbar from "../../components/Navbar"; // <-- Added an extra ../
import ThemeToggle from "../../components/ThemeToggle"; // <-- Added an extra ../

export default function ParentLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/v1/parent/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store token and user data
      localStorage.setItem('parent_token', data.data.token);
      localStorage.setItem('parent_user', JSON.stringify(data.data.parent));

      navigate('/parent/dashboard');
    } catch (err) {
      setError(err.message);
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
              PARENT <span className="bg-slate-900 text-lime-400 px-3 ml-2">PORTAL</span>
            </h1>
            <p className="mx-auto mt-3 max-w-md text-[10px] font-black uppercase tracking-widest text-slate-200 drop-shadow-sm leading-relaxed">
              Sign in to view your child's progress
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white border-2 border-slate-100 p-6 sm:p-8 shadow-2xl dark:bg-slate-800 dark:border-slate-700 relative">
            <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 bg-lime-500" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}></div>
            
            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-none border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 transition-colors focus:border-lime-500 focus:bg-white focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-lime-500"
                  placeholder="parent@example.com"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-none border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 transition-colors focus:border-lime-500 focus:bg-white focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-lime-500"
                  placeholder="••••••••"
                />
              </div>

              <div className="text-right">
                <Link to="/forgot-password" className="text-[10px] font-black uppercase tracking-widest text-lime-600 hover:text-lime-500 transition-colors">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-lime-400 px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-900 transition-all hover:bg-lime-500 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {error && (
              <p className="p-3 text-center text-[10px] font-bold uppercase tracking-widest border-l-4 mt-6 bg-red-50 text-red-700 border-red-500">
                {error}
              </p>
            )}
          </div>

          <div className="text-center">
            <Link to="/login" className="text-[10px] font-black uppercase tracking-widest text-slate-200 drop-shadow-md hover:text-lime-400 transition-colors">
              &larr; Back to main login
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}