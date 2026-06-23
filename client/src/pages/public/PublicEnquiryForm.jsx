import { useState } from 'react';
import { publicPost } from '../../api/client';

const GENDER_OPTIONS = ['MALE', 'FEMALE', 'OTHER'];

const SPORTS_OPTIONS = [
  'Cricket',
  'Football',
  'Basketball',
  'Tennis',
  'Badminton',
  'Swimming',
  'Athletics',
  'Hockey',
  'Volleyball',
  'Table Tennis',
  'Kabaddi',
  'Other',
];

const SOURCE_OPTIONS = ['WALK_IN', 'PHONE', 'WEBSITE', 'WHATSAPP', 'REFERRAL', 'SOCIAL_MEDIA'];

export default function PublicEnquiryForm() {
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    parent_name: '',
    age: '',
    gender: '',
    interested_sports: [],
    enquiry_source: '',
    follow_up_date: today,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSportsChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
    setFormData({ ...formData, interested_sports: selectedOptions });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    // Validation: At least one sport must be selected
    if (formData.interested_sports.length === 0) {
      setMessage({
        text: 'Please select at least one sport.',
        type: 'error',
      });
      setLoading(false);
      return;
    }

    // Fallback: if follow_up_date is cleared, use today's date
    const submissionData = {
      ...formData,
      follow_up_date: formData.follow_up_date || today,
    };

    try {
      await publicPost('/public/enquiry', submissionData);
      setMessage({
        text: 'Thank you for your inquiry! We will get back to you soon.',
        type: 'success',
      });
      setFormData({
        name: '',
        email: '',
        phone: '',
        message: '',
        parent_name: '',
        age: '',
        gender: '',
        interested_sports: [],
        enquiry_source: '',
        follow_up_date: today,
      });
    } catch (error) {
      setMessage({
        text: error.message || 'Failed to submit inquiry. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="card bg-surface-secondary border-border border p-8 shadow-xl">
          <div className="mb-8 text-center">
            <h1 className="text-foreground mb-2 text-3xl font-black tracking-tight">
              Sports Academy Enquiry
            </h1>
            <p className="text-muted text-sm">
              Join our elite training programs. Submit your details below.
            </p>
          </div>

          {message.text && (
            <div
              className={`mb-6 rounded-xl p-4 text-sm font-bold ${
                message.type === 'success'
                  ? 'bg-success/10 text-success border-success/20 border'
                  : 'bg-danger/10 text-danger border-danger/20 border'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="name">
                Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter your name"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="email">
                Email Address *
              </label>
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
              <label className="label" htmlFor="phone">
                Phone Number
              </label>
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
              <label className="label" htmlFor="parent_name">
                Parent Name
              </label>
              <input
                type="text"
                id="parent_name"
                name="parent_name"
                value={formData.parent_name}
                onChange={handleChange}
                className="input-field"
                placeholder="Parent/Guardian name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="age">
                  Age
                </label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Age"
                  min="1"
                  max="100"
                />
              </div>

              <div>
                <label className="label" htmlFor="gender">
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="">Select</option>
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="interested_sports">
                Interested Sports *
              </label>
              <select
                id="interested_sports"
                name="interested_sports"
                multiple
                value={formData.interested_sports}
                onChange={handleSportsChange}
                className="input-field min-h-[120px]"
                required
              >
                {SPORTS_OPTIONS.map((sport) => (
                  <option key={sport} value={sport}>
                    {sport}
                  </option>
                ))}
              </select>
              <p className="text-muted mt-1 text-xs">
                Hold Ctrl/Cmd to select multiple sports
              </p>
            </div>

            <div>
              <label className="label" htmlFor="enquiry_source">
                How did you hear about us?
              </label>
              <select
                id="enquiry_source"
                name="enquiry_source"
                value={formData.enquiry_source}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">Select source</option>
                {SOURCE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="follow_up_date">
                Preferred Follow-up Date
              </label>
              <input
                type="date"
                id="follow_up_date"
                name="follow_up_date"
                value={formData.follow_up_date}
                onChange={handleChange}
                className="input-field"
              />
            </div>

            <div>
              <label className="label" htmlFor="message">
                Message *
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                className="input-field min-h-[120px] resize-none"
                placeholder="Tell us about your inquiry..."
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-accent hover:bg-accent-hover text-foreground shadow-accent/10 w-full rounded-xl px-6 py-3.5 text-sm font-bold shadow-md transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Enquiry'}
            </button>
          </form>

          <div className="border-border mt-8 border-t pt-6 text-center">
            <p className="text-muted text-xs">Powered by SAMS — Sports Academy Management System</p>
          </div>
        </div>
      </div>
    </div>
  );
}
