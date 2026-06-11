import { useCallback, useEffect, useState } from 'react';
import Loader from '../../components/Loader';
import { adminDelete, adminGet, adminPost } from '../../api/client';

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Coaches Management</h2>
        <p className="text-muted">Provision coaches with auto-generated credentials sent via email.</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <form className="card" onSubmit={handleSubmit}>
          <h3 className="mb-2 font-bold">Add New Coach</h3>
          <p className="mb-4 text-sm text-muted">
            A secure 8-character temporary password will be generated and emailed automatically.
          </p>
          <div className="mb-4">
            <label className="label" htmlFor="coachName">Name</label>
            <input id="coachName" name="name" className="input-field" value={form.name} onChange={handleChange} required />
          </div>
          <div className="mb-4">
            <label className="label" htmlFor="coachEmail">Email</label>
            <input id="coachEmail" name="email" type="email" className="input-field" value={form.email} onChange={handleChange} required />
          </div>
          <div className="mb-4">
            <label className="label" htmlFor="coachPhone">Phone</label>
            <input id="coachPhone" name="phone_number" type="tel" className="input-field" value={form.phone_number} onChange={handleChange} required />
          </div>
          <div className="mb-4">
            <label className="label" htmlFor="coachSpec">Specialization</label>
            <input id="coachSpec" name="specialization" className="input-field" value={form.specialization} onChange={handleChange} required />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Provisioning coach…' : 'Add Coach & Send Credentials'}
          </button>
          {submitting && (
            <div className="mt-3">
              <Loader message="Generating credentials and sending onboarding email…" />
            </div>
          )}
        </form>
        <div className="card overflow-x-auto">
          <h3 className="mb-4 font-bold">Active Coaches</h3>
          {loading ? (
            <Loader />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Spec</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coaches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted">
                      No coaches yet.
                    </td>
                  </tr>
                ) : (
                  coaches.map((coach) => (
                    <tr key={coach.coach_id}>
                      <td>{coach.name}</td>
                      <td>{coach.email}</td>
                      <td>{coach.phone_number || '—'}</td>
                      <td>{coach.specialization || '—'}</td>
                      <td>
                        <button type="button" className="btn-danger btn-sm" onClick={() => handleRemove(coach.coach_id)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {message.text && (
        <p className={message.type === 'success' ? 'alert-success' : 'alert-error'}>{message.text}</p>
      )}
    </div>
  );
}
