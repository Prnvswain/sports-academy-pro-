import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Loader from '../../components/Loader';
import { adminGet, adminPost, TIMING_OPTIONS } from '../../api/client';

const emptyBatchForm = {
  name: '',
  startTime: '08:00',
  endTime: '09:00',
  coach_id: '',
  sport_id: '',
  max_capacity: '',
};

export default function BatchesPanel() {
  const [batches, setBatches] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [sports, setSports] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [batchForm, setBatchForm] = useState(emptyBatchForm);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

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
          error = 'Batch name is required';
        }
        break;
      case 'coach_id':
        if (!value) {
          error = 'Coach is required';
        }
        break;
      case 'sport_id':
        if (!value) {
          error = 'Sport is required';
        }
        break;
      case 'max_capacity':
        if (value && (isNaN(value) || parseInt(value) < 1)) {
          error = 'Capacity must be a positive number';
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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [batchesRes, coachesRes, sportsRes] = await Promise.all([
        adminGet('/admin/batches'),
        adminGet('/admin/coaches'),
        adminGet('/admin/sports'),
      ]);
      setBatches(batchesRes?.data || []);
      setCoaches(coachesRes?.data || []);
      const sportsData = sportsRes?.data?.data || sportsRes?.data || [];
      setSports(Array.isArray(sportsData) ? sportsData.filter(s => s.status === 'ACTIVE') : []);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setBatches([]);
      setCoaches([]);
      setSports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBatchChange = (event) => {
    const { name, value } = event.target;
    setBatchForm((prev) => ({ ...prev, [name]: value }));
    clearFieldError(name);
  };

  const handleBatchSubmit = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });
    setFieldErrors({});

    // Validate all fields
    const isValid =
      validateField('name', batchForm.name) &&
      validateField('coach_id', batchForm.coach_id) &&
      validateField('sport_id', batchForm.sport_id) &&
      validateField('max_capacity', batchForm.max_capacity);

    if (!isValid) {
      return;
    }

    try {
      // Format times to ensure HH:mm format with leading zeros
      const formatTime = (time) => {
        if (!time) return '';
        const [hours, minutes] = time.split(':');
        return `${hours.padStart(2, '0')}:${minutes}`;
      };
      const timing = `${formatTime(batchForm.startTime)} - ${formatTime(batchForm.endTime)}`;

      const result = await adminPost('/admin/batches', {
        name: batchForm.name?.trim(),
        timing,
        coach_id: parseInt(batchForm.coach_id, 10),
        sport_id: parseInt(batchForm.sport_id, 10),
        max_capacity: batchForm.max_capacity ? parseInt(batchForm.max_capacity, 10) : undefined,
      });
      setMessage({ text: result?.message || 'Batch created successfully', type: 'success' });
      setBatchForm(emptyBatchForm);
      setFieldErrors({});
      loadData();
    } catch (error) {
      // Handle structured validation errors from backend
      if (error.data && error.data.errors) {
        setBackendFieldErrors(error.data.errors);
        setMessage({ text: 'Please fix the validation errors below.', type: 'error' });
      } else {
        setMessage({ text: error.message, type: 'error' });
      }
    }
  };

  const filteredBatches = (batches || []).filter(
    (batch) =>
      batch?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch?.sport?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch?.coach?.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <motion.div
      className="space-y-6 w-full overflow-x-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div>
        <h2 className="text-2xl font-bold">Training Batches</h2>
        <p className="text-muted">Schedule and manage training batches with coaches and sports.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* FIXED FORM: Replaced 'bg-white border p-6 rounded-xl' with global 'card' utility */}
        <form className="card space-y-4" onSubmit={handleBatchSubmit}>
          <h3 className="text-lg font-bold">Create Batch</h3>
          <div>
            <label className="label" htmlFor="batchName">
              Batch Name
            </label>
            {/* FIXED INPUT: Replaced explicitly broken inner utility classes with generic clean 'input-field' */}
            <motion.input
              id="batchName"
              name="name"
              className={`input-field ${fieldErrors.name ? 'border-red-500' : ''}`}
              value={batchForm.name}
              onChange={handleBatchChange}
              onBlur={() => validateField('name', batchForm.name)}
              required
              whileFocus={{ scale: 1.01 }}
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="batchStartTime">
                Start Time
              </label>
              <motion.input
                id="batchStartTime"
                name="startTime"
                type="time"
                className="input-field"
                value={batchForm.startTime}
                onChange={handleBatchChange}
                required
                whileFocus={{ scale: 1.01 }}
              />
            </div>
            <div>
              <label className="label" htmlFor="batchEndTime">
                End Time
              </label>
              <motion.input
                id="batchEndTime"
                name="endTime"
                type="time"
                className="input-field"
                value={batchForm.endTime}
                onChange={handleBatchChange}
                required
                whileFocus={{ scale: 1.01 }}
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="batchCoach">
              Coach
            </label>
            <motion.select
              id="batchCoach"
              name="coach_id"
              className={`input-field text-foreground bg-[var(--color-input)] ${fieldErrors.coach_id ? 'border-red-500' : ''}`}
              value={batchForm.coach_id}
              onChange={handleBatchChange}
              onBlur={() => validateField('coach_id', batchForm.coach_id)}
              required
              whileFocus={{ scale: 1.01 }}
            >
              <option value="" className="text-muted">
                Select coach…
              </option>
              {coaches.map((c) => (
                <option key={c?.coach_id} value={c?.coach_id}>
                  {c?.name}
                </option>
              ))}
            </motion.select>
            {fieldErrors.coach_id && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.coach_id}</p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="batchSport">
              Sport
            </label>
            <motion.select
              id="batchSport"
              name="sport_id"
              className={`input-field text-foreground bg-[var(--color-input)] ${fieldErrors.sport_id ? 'border-red-500' : ''}`}
              value={batchForm.sport_id}
              onChange={handleBatchChange}
              onBlur={() => validateField('sport_id', batchForm.sport_id)}
              required
              whileFocus={{ scale: 1.01 }}
            >
              <option value="" className="text-muted">
                Select sport…
              </option>
              {sports.map((s) => (
                <option key={s?.sport_id} value={s?.sport_id}>
                  {s?.name}
                </option>
              ))}
            </motion.select>
            {fieldErrors.sport_id && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.sport_id}</p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="batchCapacity">
              Max Capacity (optional)
            </label>
            <motion.input
              id="batchCapacity"
              name="max_capacity"
              type="number"
              min={1}
              className={`input-field ${fieldErrors.max_capacity ? 'border-red-500' : ''}`}
              value={batchForm.max_capacity}
              onChange={handleBatchChange}
              onBlur={() => validateField('max_capacity', batchForm.max_capacity)}
              placeholder="e.g. 20"
              whileFocus={{ scale: 1.01 }}
            />
            {fieldErrors.max_capacity && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.max_capacity}</p>
            )}
          </div>
          {/* FIXED BUTTON: Replaced static 'bg-blue-600' with your global green/emerald setup 'btn-primary' */}
          <motion.button
            type="submit"
            className="btn-primary w-full cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Create Batch
          </motion.button>
        </form>

        {/* FIXED LIST CONTAINER: Removed hardcoded background utilities */}
        <div className="card space-y-4 overflow-x-auto">
          <h3 className="text-lg font-bold">Scheduled Batches</h3>
          <div>
            <input
              type="text"
              className="input-field"
              placeholder="Search batches by name, sport, or coach..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {loading ? (
            <Loader />
          ) : (
            /* FIXED TABLE: Leveraged theme-aware text-muted and internal token borders */
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-border text-muted border-b text-xs font-bold uppercase tracking-wider">
                  <th className="pb-3">Name</th>
                  <th className="px-2 pb-3">Timing</th>
                  <th className="px-2 pb-3">Coach</th>
                  <th className="px-2 pb-3">Sport</th>
                  <th className="px-2 pb-3">Capacity</th>
                  <th className="px-2 pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-muted py-8 text-center text-xs">
                      {searchQuery ? 'No batches match your search.' : 'No batches scheduled.'}
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map((batch, index) => (
                    <motion.tr
                      key={batch?.batch_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                      className="text-foreground"
                    >
                      <td className="py-3 font-semibold">{batch?.name}</td>
                      <td className="text-muted px-2 py-3">{batch?.timing || '—'}</td>
                      <td className="px-2 py-3">{batch?.coach?.name || '—'}</td>
                      <td className="px-2 py-3">{batch?.sport?.name || '—'}</td>
                      <td className="px-2 py-3 font-medium">
                        {batch?.enrolled_count ?? batch?.students?.length ?? 0}
                        {batch?.max_capacity != null ? ` / ${batch.max_capacity}` : ''}
                      </td>
                      <td className="px-2 py-3">
                        {/* Dynamic green status badges using customized color tokens */}
                        <span
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold ${batch?.status === 'ACTIVE' || !batch?.status ? 'bg-success/10 text-success border-success/20 border' : 'bg-danger/10 text-danger border-danger/20 border'}`}
                        >
                          {batch?.status || 'ACTIVE'}
                        </span>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* FIXED SEMANTIC ALERTS: Replaced static styles with standard design framework variants */}
      {message?.text && (
        <div className={message.type === 'success' ? 'alert-success' : 'alert-error'}>
          {message.text}
        </div>
      )}
    </motion.div>
  );
}
