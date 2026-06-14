import { useState } from 'react';
import { publicPost } from '../../api/client';

export default function IntakeForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const result = await publicPost('/public/enquiry', formData);
      setMessage({ text: 'Thank you for your inquiry! We will get back to you soon.', type: 'success' });
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      setMessage({ text: error.message || 'Failed to submit inquiry. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card bg-surface-secondary border border-border p-8 shadow-xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-foreground tracking-tight mb-2">
              Sports Academy Inquiry
            </h1>
            <p className="text-sm text-muted">
              Join our elite training programs. Submit your details below.
            </p>
          </div>

          {message.text && (
            <div className={`mb-6 p-4 rounded-xl text-sm font-bold ${
              message.type === 'success' 
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                : 'bg-danger/10 text-danger border border-danger/20'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label" htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                placeholder="your.email@example.com"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input-field"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label className="label" htmlFor="message">Your Message</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                className="input-field min-h-[120px] resize-none"
                placeholder="Tell us about your training goals, preferred sports, or any questions..."
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-white hover:bg-accent-hover py-3.5 px-6 rounded-xl font-bold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-accent/10"
            >
              {loading ? 'Submitting...' : 'Submit Inquiry'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted">
              Powered by SAMS — Sports Academy Management System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
