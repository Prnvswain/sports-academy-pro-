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
        password: form.password,
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
    <div className="via-surface-secondary to-surface flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50/80 p-4 dark:from-slate-900/40">
      <div className="card w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="text-foreground flex items-center gap-2 font-extrabold no-underline"
          >
            <span className="bg-accent text-foreground flex h-9 w-9 items-center justify-center rounded-md text-xs">
              SA
            </span>
            Coach Portal
          </Link>
          <ThemeToggle />
        </div>
        <h1 className="text-xl font-bold">Coach Sign In</h1>
        <p className="text-muted mb-6 text-sm">
          Use the login URL, email, and temporary password sent by your academy administrator.
        </p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label className="label" htmlFor="coachEmail">
              Email
            </label>
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
            <label className="label" htmlFor="coachPassword">
              Password
            </label>
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
            <Link to="/forgot-password" className="text-accent text-sm font-medium">
              Forgot password?
            </Link>
          </p>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Verifying credentials…' : 'Sign In'}
          </button>
          {message.text && (
            <p
              className={message.type === 'success' ? 'alert-success' : 'alert-error'}
              role="alert"
            >
              {message.text}
            </p>
          )}
        </form>
        <Link to="/" className="text-accent mt-6 block text-center text-sm">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
