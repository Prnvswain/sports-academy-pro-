import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
        password: form.password
      });
      setMessage({ text: 'Login successful. Opening coach portal…', type: 'success' });
      setTimeout(() => navigate('/coach/dashboard'), 600);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50/80 via-surface-secondary to-surface p-4 dark:from-slate-900/40">
      <div className="card w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-extrabold text-foreground no-underline">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-xs text-white">SA</span>
            Coach Portal
          </Link>
          <ThemeToggle />
        </div>
        <h1 className="text-xl font-bold">Coach Sign In</h1>
        <p className="mb-6 text-sm text-muted">
          Use the login URL, email, and temporary password sent by your academy administrator.
        </p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label className="label" htmlFor="coachEmail">Email</label>
            <input
              id="coachEmail"
              name="email"
              type="email"
              className="input-field"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>
          <div className="mb-4">
            <label className="label" htmlFor="coachPassword">Password</label>
            <input
              id="coachPassword"
              name="password"
              type="password"
              className="input-field"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>
          <p className="text-right">
            <Link to="/forgot-password" className="text-sm font-medium text-accent">
              Forgot password?
            </Link>
          </p>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Verifying credentials…' : 'Sign In'}
          </button>
          {message.text && (
            <p className={message.type === 'success' ? 'alert-success' : 'alert-error'} role="alert">
              {message.text}
            </p>
          )}
        </form>
        <Link to="/" className="mt-6 block text-center text-sm text-accent">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
