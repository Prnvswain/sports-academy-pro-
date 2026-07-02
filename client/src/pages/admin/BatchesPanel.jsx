import { useCallback, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Loader from '../../components/Loader';
import { adminGet, adminPost, adminDelete } from '../../api/client';

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
  const [editingBatchId, setEditingBatchId] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [overlapDetails, setOverlapDetails] = useState(null);

  // States for Searchable Coach Dropdown
  const [coachSearch, setCoachSearch] = useState('');
  const [coachDropdownOpen, setCoachDropdownOpen] = useState(false);
  const coachRef = useRef(null);

  // States for Searchable Sport Dropdown
  const [sportSearch, setSportSearch] = useState('');
  const [sportDropdownOpen, setSportDropdownOpen] = useState(false);
  const sportRef = useRef(null);

  const setFieldError = (field, msg) => {
    setFieldErrors((prev) => ({ ...prev, [field]: msg }));
  };

  const clearFieldError = (field) => {
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
  };

  // Close dropdowns on outside clicks
  useEffect(() => {
    function handleOutsideClick(event) {
      if (coachRef.current && !coachRef.current.contains(event.target)) {
        setCoachDropdownOpen(false);
      }
      if (sportRef.current && !sportRef.current.contains(event.target)) {
        setSportDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const validateField = (field, value) => {
    let error = '';
    switch (field) {
      case 'name':
        if (!value || value.trim() === '') error = 'Batch name is required';
        break;
      case 'coach_id':
        if (!value) error = 'Coach selection is required';
        break;
      case 'sport_id':
        if (!value) error = 'Sport selection is strictly mandatory';
        break;
      case 'max_capacity':
        if (value && (isNaN(value) || parseInt(value, 10) < 1)) error = 'Capacity must be a positive number';
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

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hrs, mins] = timeStr.split(':').map(Number);
    return hrs * 60 + mins;
  };

  const checkBatchConflicts = (startStr, endStr, coachId, sportId, ignoreBatchId) => {
    const newStart = timeToMinutes(startStr);
    const newEnd = timeToMinutes(endStr);

    if (newStart >= newEnd) {
      return { hasConflict: true, type: 'INVALID_TIME', message: 'End time must be after Start time.' };
    }

    for (const b of batches) {
      if (b.batch_id === ignoreBatchId) continue;

      let bStart = 0;
      let bEnd = 0;
      if (b.timing && b.timing.includes('-')) {
        const parts = b.timing.split('-');
        bStart = timeToMinutes(parts[0].trim());
        bEnd = timeToMinutes(parts[1].trim());
      } else {
        continue;
      }

      const isOverlapping = newStart < bEnd && newEnd > bStart;

      if (isOverlapping) {
        if (b.coach_id === parseInt(coachId, 10)) {
          const coachName = coaches.find(c => c.coach_id === b.coach_id)?.name || 'Same Coach';
          return {
            hasConflict: true,
            type: 'COACH_OVERLAP',
            message: `Coach conflict found! "${coachName}" is already handling the batch "${b.name}" during this slot (${b.timing}).`
          };
        }
        if (b.sport_id === parseInt(sportId, 10)) {
          const sportName = sports.find(s => s.sport_id === b.sport_id)?.name || 'Same Sport';
          return {
            hasConflict: true,
            type: 'SPORT_OVERLAP',
            message: `Sport/Facility slot override warning! There is already another "${sportName}" batch named "${b.name}" running at this exact time.`
          };
        }
      }
    }
    return { hasConflict: false };
  };

  const handleBatchSubmit = async (event, forceSubmit = false) => {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    setMessage({ text: '', type: '' });

    const isNameValid = validateField('name', batchForm.name);
    const isCoachValid = validateField('coach_id', batchForm.coach_id);
    const isSportValid = validateField('sport_id', batchForm.sport_id);

    if (!isNameValid || !isCoachValid || !isSportValid) {
      setMessage({ text: 'Please complete all required fields correctly.', type: 'error' });
      return;
    }

    if (!forceSubmit) {
      const conflict = checkBatchConflicts(
        batchForm.startTime,
        batchForm.endTime,
        batchForm.coach_id,
        batchForm.sport_id,
        editingBatchId
      );

      if (conflict.hasConflict) {
        if (conflict.type === 'INVALID_TIME') {
          setMessage({ text: conflict.message, type: 'error' });
          return;
        }
        setOverlapDetails(conflict.message);
        return;
      }
    }

    try {
      const formatTime = (time) => {
        if (!time) return '00:00';
        const [hours, minutes] = time.split(':');
        return `${hours.padStart(2, '0')}:${minutes}`;
      };
      const timing = `${formatTime(batchForm.startTime)} - ${formatTime(batchForm.endTime)}`;

      const endpoint = editingBatchId ? `/admin/batches/${editingBatchId}` : '/admin/batches';

      const result = await adminPost(endpoint, {
        name: batchForm.name?.trim(),
        timing,
        coach_id: parseInt(batchForm.coach_id, 10),
        sport_id: parseInt(batchForm.sport_id, 10),
        max_capacity: batchForm.max_capacity ? parseInt(batchForm.max_capacity, 10) : undefined,
        status: 'ACTIVE',
      });

      setMessage({ text: result?.message || `Batch saved successfully`, type: 'success' });
      setBatchForm(emptyBatchForm);
      setCoachSearch('');
      setSportSearch('');
      setEditingBatchId(null);
      setOverlapDetails(null);
      loadData();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const handleEditClick = (batch) => {
    setEditingBatchId(batch.batch_id);
    let start = '08:00';
    let end = '09:00';
    if (batch.timing && batch.timing.includes('-')) {
      const parts = batch.timing.split('-');
      start = parts[0].trim();
      end = parts[1].trim();
    }
    setBatchForm({
      name: batch.name || '',
      startTime: start,
      endTime: end,
      coach_id: batch.coach_id?.toString() || '',
      sport_id: batch.sport_id?.toString() || '',
      max_capacity: batch.max_capacity?.toString() || '',
    });

    const currentCoach = coaches.find(c => c.coach_id === batch.coach_id);
    setCoachSearch(currentCoach ? currentCoach.name : '');

    const currentSport = sports.find(s => s.sport_id === batch.sport_id);
    setSportSearch(currentSport ? currentSport.name : '');
    
    setFieldErrors({});
  };

  const handleDeleteBatch = async (batchId) => {
    if (!window.confirm("Are you sure you want to delete this batch?")) return;
    try {
      await adminDelete(`/admin/batches/${batchId}`);
      setMessage({ text: "Batch deleted successfully", type: "success" });
      setBatches((prevBatches) => prevBatches.filter(b => b.batch_id !== batchId));
      loadData();
    } catch (error) {
      setMessage({ text: error.message, type: "error" });
    }
  };

  const filteredBatches = (batches || []).filter(
    (batch) =>
      batch?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch?.sport?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch?.coach?.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredCoaches = coaches.filter(c => 
    c.name?.toLowerCase().includes(coachSearch.toLowerCase())
  );

  const filteredSports = sports.filter(s => 
    s.name?.toLowerCase().includes(sportSearch.toLowerCase())
  );

  return (
    <motion.div className="space-y-6 w-full relative" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {overlapDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <motion.div
            className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-xl max-w-md w-full mx-4 border border-zinc-200 dark:border-zinc-800 space-y-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="flex items-center gap-3 text-amber-500">
              <span className="text-2xl">⚠️</span>
              <h4 className="text-lg font-bold text-foreground">Schedule Overlap Alert</h4>
            </div>
            <p className="text-sm text-muted leading-relaxed">{overlapDetails}</p>
            <div className="flex gap-3 pt-2 justify-end">
              <button
                type="button"
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 text-foreground hover:bg-zinc-200"
                onClick={() => setOverlapDetails(null)}
              >
                Go Back & Fix
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-bold rounded-lg bg-amber-500 text-white hover:bg-amber-600 shadow-xs"
                onClick={() => handleBatchSubmit(null, true)}
              >
                Continue Anyway
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold">Training Batches</h2>
        <p className="text-muted">Schedule and manage training batches with coaches and sports.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <form className="card space-y-4" onSubmit={(e) => handleBatchSubmit(e, false)}>
          <h3 className="text-lg font-bold">{editingBatchId ? 'Modify Batch Settings' : 'Create Batch'}</h3>

          <div>
            <label className="label">Batch Name</label>
            <input
              name="name"
              className={`input-field ${fieldErrors.name ? 'border-red-500' : ''}`}
              value={batchForm.name}
              onChange={handleBatchChange}
              required
            />
            {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Time</label>
              <input name="startTime" type="time" className="input-field" value={batchForm.startTime} onChange={handleBatchChange} required />
            </div>
            <div>
              <label className="label">End Time</label>
              <input name="endTime" type="time" className="input-field" value={batchForm.endTime} onChange={handleBatchChange} required />
            </div>
          </div>

          {/* Searchable Coach Picker Component */}
          <div ref={coachRef} className="relative">
            <label className="label">Coach Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search and select coach..."
                className={`input-field pr-10 ${fieldErrors.coach_id ? 'border-red-500' : ''}`}
                value={coachSearch}
                onChange={(e) => {
                  setCoachSearch(e.target.value);
                  setCoachDropdownOpen(true);
                  if (batchForm.coach_id) {
                    setBatchForm(prev => ({ ...prev, coach_id: '' }));
                  }
                }}
                onFocus={() => setCoachDropdownOpen(true)}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none text-xs">
                {coachDropdownOpen ? '▲' : '▼'}
              </div>
            </div>
            {fieldErrors.coach_id && <p className="text-xs text-red-500 mt-1">{fieldErrors.coach_id}</p>}
            
            <AnimatePresence>
              {coachDropdownOpen && (
                <motion.ul 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg divide-y divide-zinc-100 dark:divide-zinc-800"
                >
                  {filteredCoaches.length === 0 ? (
                    <li className="p-3 text-xs text-muted text-center">No coaches match search</li>
                  ) : (
                    filteredCoaches.map(c => (
                      <li 
                        key={c.coach_id}
                        className={`p-2.5 text-sm cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${batchForm.coach_id === c.coach_id?.toString() ? 'bg-green-500/10 text-green-600 font-semibold' : ''}`}
                        onClick={() => {
                          setBatchForm(prev => ({ ...prev, coach_id: c.coach_id.toString() }));
                          setCoachSearch(c.name);
                          setCoachDropdownOpen(false);
                          clearFieldError('coach_id');
                        }}
                      >
                        {c.name}
                      </li>
                    ))
                  )}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          {/* Searchable & Mandatory Sport Picker Component */}
          <div ref={sportRef} className="relative">
            <div className="flex justify-between items-center">
              <label className="label">Sports Search <span className="text-red-500 font-bold">*</span></label>
              <span className="text-[10px] uppercase font-bold text-red-500 tracking-wider bg-red-500/10 px-2 py-0.5 rounded-sm">Mandatory</span>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Search and select sport (Required)..."
                className={`input-field pr-10 ${fieldErrors.sport_id ? 'border-red-500 bg-red-50/20' : ''}`}
                value={sportSearch}
                onChange={(e) => {
                  setSportSearch(e.target.value);
                  setSportDropdownOpen(true);
                  if (batchForm.sport_id) {
                    setBatchForm(prev => ({ ...prev, sport_id: '' }));
                  }
                }}
                onFocus={() => setSportDropdownOpen(true)}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none text-xs">
                {sportDropdownOpen ? '▲' : '▼'}
              </div>
            </div>
            {fieldErrors.sport_id && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-semibold text-red-500 mt-1">
                ⚠️ {fieldErrors.sport_id}
              </motion.p>
            )}
            
            <AnimatePresence>
              {sportDropdownOpen && (
                <motion.ul 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg divide-y divide-zinc-100 dark:divide-zinc-800"
                >
                  {filteredSports.length === 0 ? (
                    <li className="p-3 text-xs text-muted text-center">No active sports found</li>
                  ) : (
                    filteredSports.map(s => (
                      <li 
                        key={s.sport_id}
                        className={`p-2.5 text-sm cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${batchForm.sport_id === s.sport_id?.toString() ? 'bg-green-500/10 text-green-600 font-semibold' : ''}`}
                        onClick={() => {
                          setBatchForm(prev => ({ ...prev, sport_id: s.sport_id.toString() }));
                          setSportSearch(s.name);
                          setSportDropdownOpen(false);
                          clearFieldError('sport_id');
                        }}
                      >
                        <span className="mr-2">{s.icon || '🏅'}</span>
                        {s.name}
                      </li>
                    ))
                  )}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          <div>
            <label className="label">Max Capacity (Optional)</label>
            <input name="max_capacity" type="number" min={1} className="input-field" value={batchForm.max_capacity} onChange={handleBatchChange} placeholder="e.g. 20" />
            {fieldErrors.max_capacity && <p className="text-xs text-red-500 mt-1">{fieldErrors.max_capacity}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            {editingBatchId && (
              <button 
                type="button" 
                className="w-1/3 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-bold py-2.5 text-sm" 
                onClick={() => { 
                  setEditingBatchId(null); 
                  setBatchForm(emptyBatchForm);
                  setCoachSearch('');
                  setSportSearch('');
                  setFieldErrors({});
                }}
              >
                Cancel
              </button>
            )}
            <button type="submit" className={`btn-primary ${editingBatchId ? 'w-2/3' : 'w-full'}`}>
              {editingBatchId ? 'Save Changes' : 'Create Batch'}
            </button>
          </div>
        </form>

        <div className="card space-y-4 overflow-x-auto">
          <h3 className="text-lg font-bold">Scheduled Batches</h3>
          <input type="text" className="input-field" placeholder="Search batches by name, sport, or coach..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />

          {loading ? <Loader /> : (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-border text-muted border-b text-xs font-bold uppercase tracking-wider">
                  <th className="pb-3">Name</th>
                  <th className="px-2 pb-3">Timing</th>
                  <th className="px-2 pb-3">Coach</th>
                  <th className="px-2 pb-3">Sport</th>
                  <th className="px-2 pb-3">Capacity</th>
                  <th className="px-2 pb-3 text-right">Actions</th>
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
                      <td className="px-2 py-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleEditClick(batch)}
                          className="px-2 py-1 text-xs font-semibold rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBatch(batch?.batch_id)}
                          className="px-2 py-1 text-xs font-semibold rounded border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {message?.text && (
        <div className={message.type === 'success' ? 'alert-success' : 'alert-error'}>
          {message.text}
        </div>
      )}
    </motion.div>
  );
}