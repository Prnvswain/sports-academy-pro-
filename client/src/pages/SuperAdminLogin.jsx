import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import { setSuperAdminToken, superAdminLogin } from '../api/client';

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      // 1. API Call executing wrapper request
      const response = await superAdminLogin(form);
      
      // 2. 🎯 FIX: safely backend response wrapper check karo data parsing ke liye
      const data = response?.data || response;
      
      if (data && data.token) {
        // 3. 🎯 FIX: Isolate token globally through your client utility handler
        setSuperAdminToken(data.token);
        
        // Safety Fallback (directly save inside custom namespace block to avoid conflict)
        localStorage.setItem('superAdminToken', data.token);

        setMessage({ text: 'Login successful! Redirecting...', type: 'success' });
        
        // Navigate after local session initialization
        setTimeout(() => {
          navigate('/super-admin/dashboard');
        }, 800);
      } else {
        throw new Error('Token missing from server authentication response.');
      }
    } catch (error) {
      console.error('Authentication process failed:', error);
      const errMsg = error.response?.data?.message || error.message || 'Invalid credentials.';
      setMessage({ text: errMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="card w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold">Super Admin Access</h1>
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
            <div className="relative">
              <input
                id="saPassword"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="input-field pr-10"
                value={form.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground text-sm"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Login'}
          </button>
          <button
            type="button"
            className="btn-secondary w-full"
            onClick={() => navigate('/')}
          >
            Back to Home
          </button>
          {message.text && (
            <p className={message.type === 'error' ? 'alert-error' : 'alert-success'}>
              {message.text}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}