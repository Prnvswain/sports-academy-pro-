import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ThemeToggle from '../components/ThemeToggle';
import { adminLogin, superAdminLogin } from '../api/client';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      // Try regular admin login first
      await adminLogin(form);
      navigate('/admin/dashboard');
    } catch (adminError) {
      // If regular admin login fails, try super admin login
      try {
        await superAdminLogin(form);
        navigate('/super-admin/dashboard');
      } catch (superAdminError) {
        setMessage({ text: 'Invalid credentials', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <Navbar>
        <Link to="/" className="text-sm font-medium text-muted hover:text-foreground">
          Home
        </Link>
        <Link to="/coach/login" className="text-sm font-medium text-muted hover:text-foreground">
          Coach Login
        </Link>
        <ThemeToggle />
      </Navbar>
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="card">
          <h1 className="mb-2 text-2xl font-bold">Admin Login</h1>
          <p className="mb-6 text-sm text-muted">Sign in to your academy workspace.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                className="input-field"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                className="input-field"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>
            <p className="text-right">
              <Link to="/forgot-password" className="text-sm font-medium text-accent">
                Forgot password?
              </Link>
            </p>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          {message.text && (
            <p className={message.type === 'error' ? 'alert-error mt-4' : 'alert-success mt-4'}>
              {message.text}
            </p>
          )}
          <p className="mt-6 text-center text-sm text-muted">
            New academy?{' '}
            <Link to="/signup" className="font-semibold text-accent">
              Register here
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
