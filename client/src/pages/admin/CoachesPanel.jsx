import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Loader from '../../components/Loader';
import { adminDelete, adminGet, adminPost, adminPut } from '../../api/client';

const emptyForm = {
  name: '',
  email: '',
  phone_number: '',
  specialization: '',
};

export default function CoachesPanel() {
  const [coaches, setCoaches] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Field-level validation errors
  const [fieldErrors, setFieldErrors] = useState({});

  const setFieldError = (field, message) => {
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
  };

  const clearFieldError = (field) => {
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const setBackendFieldErrors = (backendErrors) => {
    setFieldErrors(backendErrors);
  };

  const validateField = (field, value) => {
    let error = '';

    switch (field) {
      case 'name':
        if (!value || value.trim() === '') {
          error = 'Coach name is required';
        }
        break;
      case 'email':
        if (!value || value.trim() === '') {
          error = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Enter a valid email address';
        }
        break;
      case 'phone_number':
        if (!value || value.trim() === '') {
          error = 'Phone number is required';
        } else if (!/^[0-9]{10}$/.test(value.replace(/[\s-]/g, ''))) {
          error = 'Phone number must be 10 digits';
        }
        break;
      case 'specialization':
        if (!value || value.trim() === '') {
          error = 'Specialization is required';
        }
        break;
      default:
        break;
    }

    if (error) {
      setFieldError(field, error);
      return false;
    }
    clearFieldError(field);
    return true;
  };

  const loadCoaches = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminGet('/admin/coaches');
      setCoaches(result.data || []);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoaches();
  }, [loadCoaches]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage({ text: '', type: '' });
    setFieldErrors({});

    // Validate all fields
    const isValid =
      validateField('name', form.name) &&
      validateField('email', form.email) &&
      validateField('phone_number', form.phone_number) &&
      validateField('specialization', form.specialization);

    if (!isValid) {
      setSubmitting(false);
      return;
    }

    try {
      const result = await adminPost('/admin/coaches', {
        name: form.name.trim(),
        email: form.email.trim(),
        phone_number: form.phone_number.trim(),
        specialization: form.specialization.trim(),
      });
      setMessage({
        text: `${result.message} Login credentials have been emailed to the coach.`,
        type: 'success',
      });
      setForm(emptyForm);
      setFieldErrors({});
      setShowModal(false);
      loadCoaches();
    } catch (error) {
      // Handle structured validation errors from backend
      if (error.data && error.data.errors) {
        setBackendFieldErrors(error.data.errors);
        setMessage({ text: 'Please fix the validation errors below.', type: 'error' });
      } else {
        setMessage({ text: error.message, type: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (coachId) => {
    if (!window.confirm('Archive this coach? Record will be soft-deleted (is_deleted: true).')) {
      return;
    }
    try {
      await adminDelete(`/admin/coaches/${coachId}`);
      setMessage({ text: 'Coach archived successfully.', type: 'success' });
      loadCoaches();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const handleMarkActive = async (coachId) => {
    try {
      await adminPut(`/admin/coaches/${coachId}`, { status: 'ACTIVE' });
      setMessage({ text: 'Coach marked as active successfully.', type: 'success' });
      loadCoaches();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const handleDeactivate = async (coachId) => {
    try {
      await adminPut(`/admin/coaches/${coachId}`, { status: 'INACTIVE' });
      setMessage({ text: 'Coach deactivated successfully.', type: 'success' });
      loadCoaches();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const openModal = () => {
    setForm(emptyForm);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(emptyForm);
  };

  const filteredCoaches = (coaches || []).filter((coach) => {
    const matchesSearch =
      coach?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coach?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coach?.specialization?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !statusFilter || coach?.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <motion.div
      className="space-y-6 w-full overflow-x-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Coaches</h2>
          <p className="text-muted">
            Provision coaches with auto-generated credentials sent via email.
          </p>
        </div>
        <motion.button
          type="button"
          className="btn-primary"
          onClick={openModal}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          + Add Coach
        </motion.button>
      </div>

      {/* Filter Section */}
      <div className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <input
              type="text"
              className="input-field"
              placeholder="Search coaches by name, email, or specialization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <select
              className="input-field text-foreground bg-[var(--color-input)]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Coaches Table */}
      <div className="card overflow-x-auto">
        <h3 className="mb-4 font-bold">Active Coaches</h3>
        {loading ? (
          <Loader />
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-border text-muted border-b text-xs font-medium uppercase tracking-wider">
                <th className="pb-3">Name</th>
                <th className="px-2 pb-3">Email</th>
                <th className="px-2 pb-3">Phone</th>
                <th className="px-2 pb-3">Specialization</th>
                <th className="px-2 pb-3">Status</th>
                <th className="pb-3 pl-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {filteredCoaches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted py-8 text-center text-xs">
                    {searchQuery || statusFilter
                      ? 'No coaches match your filters.'
                      : 'No coaches yet.'}
                  </td>
                </tr>
              ) : (
                filteredCoaches.map((coach, index) => (
                  <motion.tr
                    key={coach.coach_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                    className="text-foreground"
                  >
                    <td className="py-3 font-semibold">{coach.name}</td>
                    <td className="px-2 py-3">{coach.email}</td>
                    <td className="px-2 py-3">{coach.phone_number || '—'}</td>
                    <td className="px-2 py-3">{coach.specialization || '—'}</td>
                    <td className="px-2 py-3">
                      <span
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                          coach.status === 'ACTIVE'
                            ? 'bg-success/10 text-success border-success/20 border'
                            : 'bg-danger/10 text-danger border-danger/20 border'
                        }`}
                      >
                        {coach.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="space-x-1 py-3 pl-2 text-right">
                      {coach.status === 'ACTIVE' ? (
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => handleDeactivate(coach.coach_id)}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => handleMarkActive(coach.coach_id)}
                        >
                          Mark Active
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-danger btn-sm"
                        onClick={() => handleRemove(coach.coach_id)}
                      >
                        Remove
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {message.text && (
        <div className={message.type === 'success' ? 'alert-success' : 'alert-error'}>
          {message.text}
        </div>
      )}

      {/* Add Coach Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-surface border-border animate-fadeIn w-full max-w-md overflow-hidden rounded-xl border shadow-xl">
            <div className="bg-accent text-foreground flex items-center justify-between px-6 py-4">
              <h3 className="text-lg font-bold">Add New Coach</h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-foreground hover:text-muted text-xl font-bold"
              >
                &times;
              </button>
            </div>
            <form className="space-y-4 p-6" onSubmit={handleSubmit}>
              <p className="text-muted text-sm">
                A secure 8-character temporary password will be generated and emailed automatically.
              </p>
              <div>
                <label className="label" htmlFor="coachName">
                  Name
                </label>
                <input
                  id="coachName"
                  name="name"
                  className={`input-field ${fieldErrors.name ? 'border-red-500' : ''}`}
                  value={form.name}
                  onChange={(e) => {
                    handleChange(e);
                    clearFieldError('name');
                  }}
                  onBlur={() => validateField('name', form.name)}
                  required
                />
                {fieldErrors.name && (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>
                )}
              </div>
              <div>
                <label className="label" htmlFor="coachEmail">
                  Email
                </label>
                <input
                  id="coachEmail"
                  name="email"
                  type="email"
                  className={`input-field ${fieldErrors.email ? 'border-red-500' : ''}`}
                  value={form.email}
                  onChange={(e) => {
                    handleChange(e);
                    clearFieldError('email');
                  }}
                  onBlur={() => validateField('email', form.email)}
                  required
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>
                )}
              </div>
              <div>
                <label className="label" htmlFor="coachPhone">
                  Phone
                </label>
                <input
                  id="coachPhone"
                  name="phone_number"
                  type="tel"
                  className={`input-field ${fieldErrors.phone_number ? 'border-red-500' : ''}`}
                  value={form.phone_number}
                  onChange={(e) => {
                    handleChange(e);
                    clearFieldError('phone_number');
                  }}
                  onBlur={() => validateField('phone_number', form.phone_number)}
                  required
                />
                {fieldErrors.phone_number && (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.phone_number}</p>
                )}
              </div>
              <div>
                <label className="label" htmlFor="coachSpec">
                  Specialization
                </label>
                <input
                  id="coachSpec"
                  name="specialization"
                  className={`input-field ${fieldErrors.specialization ? 'border-red-500' : ''}`}
                  value={form.specialization}
                  onChange={(e) => {
                    handleChange(e);
                    clearFieldError('specialization');
                  }}
                  onBlur={() => validateField('specialization', form.specialization)}
                  required
                />
                {fieldErrors.specialization && (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.specialization}</p>
                )}
              </div>
              <button
                type="submit"
                className="btn-primary w-full cursor-pointer"
                disabled={submitting}
              >
                {submitting ? 'Provisioning coach…' : 'Add Coach & Send Credentials'}
              </button>
              {submitting && (
                <div className="mt-3">
                  <Loader message="Generating credentials and sending onboarding email…" />
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
