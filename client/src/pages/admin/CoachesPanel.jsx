import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Loader from '../../components/Loader';
import { adminDelete, adminGet, adminPost, adminPut } from '../../api/client';

const emptyForm = {
  name: '',
  email: '',
  phone_number: '',
  specialization: ''
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
    try {
      const result = await adminPost('/admin/coaches', {
        name: form.name.trim(),
        email: form.email.trim(),
        phone_number: form.phone_number.trim(),
        specialization: form.specialization.trim()
      });
      setMessage({
        text: `${result.message} Login credentials have been emailed to the coach.`,
        type: 'success'
      });
      setForm(emptyForm);
      setShowModal(false);
      loadCoaches();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
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

  const filteredCoaches = (coaches || []).filter(coach => {
    const matchesSearch = 
      coach?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coach?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coach?.specialization?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = !statusFilter || coach?.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Coaches</h2>
          <p className="text-muted">Provision coaches with auto-generated credentials sent via email.</p>
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
            <select className="input-field bg-[var(--color-input)] text-foreground" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
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
              <tr className="border-b border-border text-muted font-medium text-xs uppercase tracking-wider">
                <th className="pb-3">Name</th>
                <th className="pb-3 px-2">Email</th>
                <th className="pb-3 px-2">Phone</th>
                <th className="pb-3 px-2">Specialization</th>
                <th className="pb-3 px-2">Status</th>
                <th className="pb-3 pl-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCoaches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted text-xs">
                    {searchQuery || statusFilter ? 'No coaches match your filters.' : 'No coaches yet.'}
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
                    <td className="py-3 px-2">{coach.email}</td>
                    <td className="py-3 px-2">{coach.phone_number || '—'}</td>
                    <td className="py-3 px-2">{coach.specialization || '—'}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        coach.status === 'ACTIVE' ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'
                      }`}>
                        {coach.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="py-3 pl-2 text-right space-x-1">
                      <button type="button" className="btn-secondary btn-sm" onClick={() => handleMarkActive(coach.coach_id)}>
                        Mark Active
                      </button>
                      <button type="button" className="btn-secondary btn-sm" onClick={() => handleDeactivate(coach.coach_id)}>
                        Deactivate
                      </button>
                      <button type="button" className="btn-danger btn-sm" onClick={() => handleRemove(coach.coach_id)}>
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
        <div className={message.type === 'success' ? 'alert-success' : 'alert-error'}>{message.text}</div>
      )}

      {/* Add Coach Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface w-full max-w-md rounded-xl shadow-xl overflow-hidden border border-border animate-fadeIn">
            <div className="bg-accent px-6 py-4 flex justify-between items-center text-white">
              <h3 className="text-lg font-bold">Add New Coach</h3>
              <button type="button" onClick={closeModal} className="text-white hover:text-gray-200 font-bold text-xl">
                &times;
              </button>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleSubmit}>
              <p className="text-sm text-muted">
                A secure 8-character temporary password will be generated and emailed automatically.
              </p>
              <div>
                <label className="label" htmlFor="coachName">Name</label>
                <input id="coachName" name="name" className="input-field" value={form.name} onChange={handleChange} required />
              </div>
              <div>
                <label className="label" htmlFor="coachEmail">Email</label>
                <input id="coachEmail" name="email" type="email" className="input-field" value={form.email} onChange={handleChange} required />
              </div>
              <div>
                <label className="label" htmlFor="coachPhone">Phone</label>
                <input id="coachPhone" name="phone_number" type="tel" className="input-field" value={form.phone_number} onChange={handleChange} required />
              </div>
              <div>
                <label className="label" htmlFor="coachSpec">Specialization</label>
                <input id="coachSpec" name="specialization" className="input-field" value={form.specialization} onChange={handleChange} required />
              </div>
              <button type="submit" className="btn-primary w-full cursor-pointer" disabled={submitting}>
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
