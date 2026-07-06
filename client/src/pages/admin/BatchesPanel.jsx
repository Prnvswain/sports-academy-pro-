import { useCallback, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, CheckCircle, AlertCircle, Clock, Trash2, Edit2, Plus, Calendar, AlertTriangle, User, Medal, Users } from 'lucide-react';
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
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Ensure UX scroll to top for edit
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

  // Animation Variants
  const tableContainerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  const rowVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 25 } }
  };

  return (
    <motion.div
      className="min-h-screen bg-[#f4f7f6] dark:bg-[#0a0f0d] p-4 sm:p-6 lg:p-8 font-sans overflow-x-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white dark:bg-[#111814] p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] ring-1 ring-gray-100 dark:ring-gray-800/60 relative overflow-hidden">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Training Batches</h2>
                <p className="text-gray-500 mt-1 font-medium text-sm">Schedule and manage allocations for coaches and sports.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Global Alerts */}
        <AnimatePresence>
          {message.text && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="overflow-hidden"
            >
              <div className={`flex items-center gap-3 p-4 rounded-2xl border shadow-sm ${
                message.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-900/50 dark:text-emerald-400' 
                  : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/20 dark:border-rose-900/50 dark:text-rose-400'
              }`}>
                {message.type === 'success' ? <CheckCircle size={20} className="shrink-0" /> : <AlertCircle size={20} className="shrink-0" />}
                <span className="text-sm font-bold tracking-wide">{message.text}</span>
                <button className="ml-auto p-1 opacity-60 hover:opacity-100 transition-opacity bg-white/50 rounded-lg" onClick={() => setMessage({ text: '', type: '' })}><X size={16} /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overlap Conflict Modal */}
        <AnimatePresence>
          {overlapDetails && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4">
              <motion.div
                className="bg-white dark:bg-[#111814] p-8 rounded-[2rem] shadow-2xl max-w-md w-full border border-amber-200 dark:border-amber-900/50"
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", bounce: 0.4 }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-14 w-14 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-7 w-7 text-amber-500" />
                  </div>
                  <h4 className="text-xl font-black text-gray-900 dark:text-white">Schedule Conflict</h4>
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 leading-relaxed mb-8">{overlapDetails}</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="flex-1 px-4 py-3 text-sm font-bold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => setOverlapDetails(null)}
                  >
                    Go Back & Fix
                  </button>
                  <button
                    type="button"
                    className="flex-1 px-4 py-3 text-sm font-bold rounded-xl bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-all"
                    onClick={() => handleBatchSubmit(null, true)}
                  >
                    Override & Save
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="grid gap-6 lg:grid-cols-12 items-start">
          
          {/* LEFT COLUMN: Create / Edit Form */}
          <div className="lg:col-span-4 xl:col-span-3 rounded-3xl bg-white dark:bg-[#111814] shadow-[0_4px_20px_rgb(0,0,0,0.02)] ring-1 ring-gray-100 dark:ring-gray-800/60 p-6 sticky top-6">
            <form onSubmit={(e) => handleBatchSubmit(e, false)} className="space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/60 pb-4 mb-2">
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  {editingBatchId ? <Edit2 size={18} className="text-indigo-500" /> : <Plus size={18} className="text-emerald-500 stroke-[3]" />}
                  {editingBatchId ? 'Modify Batch' : 'Create Batch'}
                </h3>
                {editingBatchId && (
                  <button 
                    type="button" 
                    onClick={() => { 
                      setEditingBatchId(null); setBatchForm(emptyBatchForm); setCoachSearch(''); setSportSearch(''); setFieldErrors({});
                    }} 
                    className="text-xs font-bold text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 uppercase bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-md"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">Batch Name <span className="text-rose-500">*</span></label>
                <input
                  name="name"
                  placeholder="e.g. Morning Elite"
                  className={`w-full rounded-xl border bg-gray-50/50 dark:bg-gray-900/50 px-4 py-2.5 text-sm outline-none transition-all focus:bg-white dark:focus:bg-[#111814] ${fieldErrors.name ? 'border-rose-500 focus:ring-4 focus:ring-rose-500/10' : 'border-gray-200 dark:border-gray-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:text-white'}`}
                  value={batchForm.name}
                  onChange={handleBatchChange}
                />
                {fieldErrors.name && <p className="text-[11px] font-bold text-rose-500 mt-1">{fieldErrors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">Start Time <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input 
                      name="startTime" 
                      type="time" 
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:text-white font-medium" 
                      value={batchForm.startTime} 
                      onChange={handleBatchChange} 
                      required 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">End Time <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input 
                      name="endTime" 
                      type="time" 
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:text-white font-medium" 
                      value={batchForm.endTime} 
                      onChange={handleBatchChange} 
                      required 
                    />
                  </div>
                </div>
              </div>

              {/* Coach Picker */}
              <div ref={coachRef} className="relative z-20">
                <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">Assign Coach <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search coach..."
                    className={`w-full rounded-xl border bg-gray-50/50 dark:bg-gray-900/50 pl-9 pr-8 py-2.5 text-sm outline-none transition-all focus:bg-white dark:focus:bg-[#111814] dark:text-white ${fieldErrors.coach_id ? 'border-rose-500 focus:ring-4 focus:ring-rose-500/10' : 'border-gray-200 dark:border-gray-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'}`}
                    value={coachSearch}
                    onChange={(e) => {
                      setCoachSearch(e.target.value);
                      setCoachDropdownOpen(true);
                      if (batchForm.coach_id) setBatchForm(prev => ({ ...prev, coach_id: '' }));
                    }}
                    onFocus={() => setCoachDropdownOpen(true)}
                  />
                  {coachSearch && (
                    <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700" onClick={() => { setCoachSearch(''); setBatchForm(prev => ({...prev, coach_id: ''})); }}>
                      <X size={14} />
                    </button>
                  )}
                </div>
                {fieldErrors.coach_id && <p className="text-[11px] font-bold text-rose-500 mt-1">{fieldErrors.coach_id}</p>}
                
                <AnimatePresence>
                  {coachDropdownOpen && (
                    <motion.ul 
                      initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}
                      className="absolute w-full mt-1.5 max-h-48 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl p-1"
                    >
                      {filteredCoaches.length === 0 ? (
                        <li className="p-3 text-xs font-medium text-gray-400 text-center italic">No coaches match search</li>
                      ) : (
                        filteredCoaches.map(c => {
                          const isSel = batchForm.coach_id === c.coach_id?.toString();
                          return (
                            <li 
                              key={c.coach_id}
                              className={`p-2.5 text-sm font-semibold rounded-lg cursor-pointer transition-colors flex items-center justify-between ${isSel ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                              onClick={() => {
                                setBatchForm(prev => ({ ...prev, coach_id: c.coach_id.toString() }));
                                setCoachSearch(c.name);
                                setCoachDropdownOpen(false);
                                clearFieldError('coach_id');
                              }}
                            >
                              <span>{c.name}</span>
                              {isSel && <CheckCircle size={14} />}
                            </li>
                          );
                        })
                      )}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>

              {/* Sport Picker */}
              <div ref={sportRef} className="relative z-10">
                <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">Assign Sport <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <Medal size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search sport..."
                    className={`w-full rounded-xl border bg-gray-50/50 dark:bg-gray-900/50 pl-9 pr-8 py-2.5 text-sm outline-none transition-all focus:bg-white dark:focus:bg-[#111814] dark:text-white ${fieldErrors.sport_id ? 'border-rose-500 focus:ring-4 focus:ring-rose-500/10' : 'border-gray-200 dark:border-gray-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'}`}
                    value={sportSearch}
                    onChange={(e) => {
                      setSportSearch(e.target.value);
                      setSportDropdownOpen(true);
                      if (batchForm.sport_id) setBatchForm(prev => ({ ...prev, sport_id: '' }));
                    }}
                    onFocus={() => setSportDropdownOpen(true)}
                  />
                  {sportSearch && (
                    <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700" onClick={() => { setSportSearch(''); setBatchForm(prev => ({...prev, sport_id: ''})); }}>
                      <X size={14} />
                    </button>
                  )}
                </div>
                {fieldErrors.sport_id && <p className="text-[11px] font-bold text-rose-500 mt-1">{fieldErrors.sport_id}</p>}
                
                <AnimatePresence>
                  {sportDropdownOpen && (
                    <motion.ul 
                      initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}
                      className="absolute w-full mt-1.5 max-h-48 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl p-1"
                    >
                      {filteredSports.length === 0 ? (
                        <li className="p-3 text-xs font-medium text-gray-400 text-center italic">No sports match search</li>
                      ) : (
                        filteredSports.map(s => {
                          const isSel = batchForm.sport_id === s.sport_id?.toString();
                          return (
                            <li 
                              key={s.sport_id}
                              className={`p-2.5 text-sm font-semibold rounded-lg cursor-pointer transition-colors flex items-center justify-between ${isSel ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                              onClick={() => {
                                setBatchForm(prev => ({ ...prev, sport_id: s.sport_id.toString() }));
                                setSportSearch(s.name);
                                setSportDropdownOpen(false);
                                clearFieldError('sport_id');
                              }}
                            >
                              <span className="flex items-center gap-2"><span className="text-lg leading-none">{s.icon || '🏅'}</span> {s.name}</span>
                              {isSel && <CheckCircle size={14} />}
                            </li>
                          );
                        })
                      )}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">Max Capacity <span className="text-gray-400 font-medium normal-case tracking-normal">(Optional)</span></label>
                <div className="relative">
                  <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input 
                    name="max_capacity" 
                    type="number" 
                    min={1} 
                    className={`w-full rounded-xl border bg-gray-50/50 dark:bg-gray-900/50 pl-9 pr-4 py-2.5 text-sm outline-none transition-all focus:bg-white dark:focus:bg-[#111814] dark:text-white ${fieldErrors.max_capacity ? 'border-rose-500 focus:ring-4 focus:ring-rose-500/10' : 'border-gray-200 dark:border-gray-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'}`} 
                    value={batchForm.max_capacity} 
                    onChange={handleBatchChange} 
                    placeholder="e.g. 20" 
                  />
                </div>
                {fieldErrors.max_capacity && <p className="text-[11px] font-bold text-rose-500 mt-1">{fieldErrors.max_capacity}</p>}
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-800/60 mt-6">
                <motion.button 
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  type="submit" 
                  className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${editingBatchId ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20'}`}
                >
                  {editingBatchId ? <Edit2 size={16} /> : <Plus size={16} strokeWidth={3} />}
                  {editingBatchId ? 'Save Changes' : 'Create Batch'}
                </motion.button>
              </div>
            </form>
          </div>

          {/* RIGHT COLUMN: Table View */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            
            {/* Table Search Header */}
            <div className="bg-white dark:bg-[#111814] p-3 rounded-[1.5rem] border border-gray-100 dark:border-gray-800/60 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-emerald-500 focus:bg-white dark:focus:border-emerald-500 rounded-xl outline-none text-sm transition-all dark:text-white"
                  placeholder="Filter scheduled batches by name, sport, or coach..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Table Core */}
            <div className="bg-white dark:bg-[#111814] rounded-[1.5rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-gray-100 dark:border-gray-800/60">
              {loading ? (
                <div className="p-20 flex justify-center"><Loader /></div>
              ) : (
                <div className="overflow-x-auto pb-4">
                  <table className="w-full text-left text-sm border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 px-4">
                        <th className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">Batch details</th>
                        <th className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">Timing</th>
                        <th className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">Assigned To</th>
                        <th className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">Capacity</th>
                        <th className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 text-right">Manage</th>
                      </tr>
                    </thead>
                    <motion.tbody 
                      variants={tableContainerVariants}
                      initial="hidden" animate="show"
                    >
                      {filteredBatches.length === 0 ? (
                        <motion.tr variants={rowVariants}>
                          <td colSpan={5} className="py-20 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <div className="h-16 w-16 bg-gray-50 dark:bg-gray-900/50 rounded-full flex items-center justify-center mb-4 ring-8 ring-gray-50/50 dark:ring-gray-900/20">
                                <Calendar className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                              </div>
                              <p className="font-bold text-lg text-gray-900 dark:text-white">No batches found</p>
                              <p className="mt-1 text-sm text-gray-500">Create a new batch using the form to your left.</p>
                            </div>
                          </td>
                        </motion.tr>
                      ) : (
                        filteredBatches.map((batch) => {
                          const enrolled = batch?.enrolled_count ?? batch?.students?.length ?? 0;
                          const max = batch?.max_capacity;
                          const isFull = max && enrolled >= max;
                          const sportIcon = sports.find(s => s.sport_id === batch.sport_id)?.icon || '🏅';

                          return (
                            <motion.tr
                              key={batch?.batch_id}
                              variants={rowVariants}
                              className={`group bg-white dark:bg-[#111814] hover:bg-gray-50/80 dark:hover:bg-gray-800/30 transition-colors relative ${editingBatchId === batch.batch_id ? 'ring-2 ring-indigo-500 shadow-md z-10 rounded-2xl' : ''}`}
                            >
                              <td className={`px-6 py-4 ${editingBatchId === batch.batch_id ? 'rounded-l-2xl' : ''}`}>
                                <div className="flex flex-col gap-1">
                                  <span className="font-bold text-base text-gray-900 dark:text-white">{batch?.name}</span>
                                </div>
                              </td>
                              
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="inline-flex items-center gap-2 bg-gray-100/80 dark:bg-gray-800/50 px-3 py-1.5 rounded-lg text-gray-700 dark:text-gray-300 font-bold text-xs">
                                  <Clock size={12} className="text-gray-400" />
                                  {batch?.timing || '—'}
                                </div>
                              </td>

                              <td className="px-4 py-4">
                                <div className="flex flex-col gap-2">
                                  {/* Coach Badge */}
                                  <span className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 px-2.5 py-1 rounded-md text-xs font-bold w-fit border border-indigo-100/50 dark:border-indigo-800/30">
                                    <User size={12} /> {batch?.coach?.name || 'Unassigned'}
                                  </span>
                                  {/* Sport Badge */}
                                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-md text-xs font-bold w-fit border border-emerald-100/50 dark:border-emerald-800/30">
                                    <span className="text-[10px] leading-none">{sportIcon}</span> {batch?.sport?.name || '—'}
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 max-w-[80px] h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    {max ? (
                                      <div 
                                        className={`h-full rounded-full ${isFull ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                                        style={{ width: `${Math.min((enrolled / max) * 100, 100)}%` }}
                                      />
                                    ) : (
                                      <div className="h-full bg-gray-300 dark:bg-gray-600 w-full" />
                                    )}
                                  </div>
                                  <span className={`text-xs font-bold ${isFull ? 'text-rose-600 dark:text-rose-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                    {enrolled} {max ? `/ ${max}` : 'enrolled'}
                                  </span>
                                </div>
                              </td>

                              <td className={`px-6 py-4 text-right ${editingBatchId === batch.batch_id ? 'rounded-r-2xl' : ''}`}>
                                <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                  <button
                                    type="button"
                                    onClick={() => handleEditClick(batch)}
                                    className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/40 transition-colors"
                                    title="Edit Batch"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5"></div>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBatch(batch?.batch_id)}
                                    className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40 transition-colors"
                                    title="Delete Batch"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })
                      )}
                    </motion.tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}