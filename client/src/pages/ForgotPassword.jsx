import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' }
});

export default function ForgotPassword() {
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const requestCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim() });
      setMessage({
        text: data.message || 'If an account exists, a verification code was sent.',
        type: 'success'
      });
      setStep('reset');
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || err.message || 'Request failed',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const { data } = await api.post('/auth/reset-password', {
        email: email.trim(),
        code: code.trim(),
        new_password: newPassword
      });
      setMessage({
        text: data.message || 'Password updated. You can sign in now.',
        type: 'success'
      });
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || err.message || 'Reset failed',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <Navbar>
        <Link to="/login/admin" className="text-sm font-medium text-muted hover:text-foreground">
          Back to login
        </Link>
      </Navbar>
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="card">
          <h1 className="mb-2 text-2xl font-bold">Reset password</h1>
          {step === 'request' ? (
            <form onSubmit={requestCode} className="space-y-4">
              <div>
                <label className="label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send verification code'}
              </button>
            </form>
          ) : (
            <form onSubmit={resetPassword} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input type="email" className="input-field" value={email} readOnly />
              </div>
              <div>
                <label className="label" htmlFor="code">Verification code</label>
                <input
                  id="code"
                  className="input-field"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="newPassword">New password</label>
                <input
                  id="newPassword"
                  type="password"
                  className="input-field"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Updating…' : 'Reset password'}
              </button>
            </form>
          )}
          {message.text && (
            <p className={message.type === 'success' ? 'alert-success mt-4' : 'alert-error mt-4'}>
              {message.text}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
