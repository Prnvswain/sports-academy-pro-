import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import { setSuperAdminToken, superAdminLogin } from '../api/client';

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      await superAdminLogin(form);
      navigate('/super-admin/dashboard');
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="card w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold">Platform Administration</h1>
          <ThemeToggle />
        </div>
        <p className="mb-4 text-sm text-muted">Restricted access for platform operators only.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="saEmail">Email</label>
            <input
              id="saEmail"
              name="email"
              type="email"
              className="input-field"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="saPassword">Password</label>
            <input
              id="saPassword"
              name="password"
              type="password"
              className="input-field"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
          {message.text && (
            <p className={message.type === 'error' ? 'alert-error' : 'alert-success'}>{message.text}</p>
          )}
        </form>
      </div>
    </div>
  );
}
