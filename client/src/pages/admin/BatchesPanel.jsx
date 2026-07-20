import { useCallback, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [sessionHistoryLoading, setSessionHistoryLoading] = useState(false);
  const [sessionFilters, setSessionFilters] = useState({ batch_id: '', coach_id: '', date_from: '', date_to: '', status: '' });

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
    setTimeout(() => setMessage({text: '', type: ''}), 4000);
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
    setTimeout(() => setMessage({text: '', type: ''}), 4000);
  };

  const loadSessionHistory = async () => {
    setSessionHistoryLoading(true);
    try {
      const params = new URLSearchParams();
      if (sessionFilters.batch_id) params.append('batch_id', sessionFilters.batch_id);
      if (sessionFilters.coach_id) params.append('coach_id', sessionFilters.coach_id);
      if (sessionFilters.date_from) params.append('date_from', sessionFilters.date_from);
      if (sessionFilters.date_to) params.append('date_to', sessionFilters.date_to);
      if (sessionFilters.status) params.append('status', sessionFilters.status);
      
      const result = await adminGet(`/admin/batch-sessions?${params.toString()}`);
      setSessionHistory(result.data || []);
    } catch (error) {
      setMessage({ text: error.message, type: "error" });
    } finally {
      setSessionHistoryLoading(false);
    }
  };

  const handleViewSessionHistory = () => {
    setShowSessionHistory(true);
    loadSessionHistory();
  };

  const handleCloseSessionHistory = () => {
    setShowSessionHistory(false);
    setSessionHistory([]);
    setSessionFilters({ batch_id: '', coach_id: '', date_from: '', date_to: '', status: '' });
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
      className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 font-sans overflow-x-hidden relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mx-auto max-w-7xl space-y-6 relative z-10">
        
        {/* Global Alerts using Portal to prevent overlap issues */}
        {typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            {message.text && (
              <motion.div 
                initial={{ opacity: 0, y: -20, scale: 0.95 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className={`fixed top-6 right-6 z-[9999] rounded-2xl px-6 py-4 shadow-2xl border flex items-center gap-3 font-bold ${
                  message.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/90 dark:border-emerald-700 dark:text-emerald-300' 
                    : 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/90 dark:border-rose-700 dark:text-rose-300'
                }`}
              >
                {message.type === 'success' ? <CheckCircle size={20} className="shrink-0" /> : <AlertCircle size={20} className="shrink-0" />}
                <span className="text-sm tracking-wide">{message.text}</span>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

        {/* Header Panel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-card border border-border p-6 rounded-3xl shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"></div>
          <div>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 shadow-inner">
                <Calendar className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight text-foreground">Training Batches</h2>
                <p className="text-muted-foreground mt-1 font-medium text-sm">Schedule and manage allocations for coaches and sports.</p>
              </div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleViewSessionHistory}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 transition-all"
          >
            <Clock className="w-5 h-5" />
            Batch Session History
          </motion.button>
        </div>

        {/* Overlap Conflict Modal using Portal */}
        {typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            {overlapDetails && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                <motion.div
                  className="bg-card p-8 rounded-[2rem] shadow-2xl max-w-md w-full border border-amber-200 dark:border-amber-900/50"
                  initial={{ scale: 0.95, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 20 }}
                  transition={{ type: "spring", bounce: 0.4 }}
                >
                  <div className="flex items-center gap-4 mb-5">
                    <div className="h-14 w-14 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-800">
                      <AlertTriangle className="h-7 w-7 text-amber-500" />
                    </div>
                    <h4 className="text-xl font-black text-foreground">Schedule Conflict</h4>
                  </div>
                  <p className="text-sm font-bold text-muted-foreground leading-relaxed mb-8 bg-surface border border-border p-4 rounded-xl">{overlapDetails}</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="flex-1 px-4 py-3.5 text-sm font-bold rounded-xl bg-surface border border-border text-foreground hover:bg-surface-secondary transition-colors"
                      onClick={() => setOverlapDetails(null)}
                    >
                      Go Back & Fix
                    </button>
                    <button
                      type="button"
                      className="flex-1 px-4 py-3.5 text-sm font-black rounded-xl bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/20 transition-all"
                      onClick={() => handleBatchSubmit(null, true)}
                    >
                      Override & Save
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

        {/* Batch Session History Modal using Portal */}
        {typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            {showSessionHistory && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                <motion.div
                  className="bg-card rounded-[2rem] shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-purple-200 dark:border-purple-900/50 flex flex-col"
                  initial={{ scale: 0.95, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 20 }}
                  transition={{ type: "spring", bounce: 0.4 }}
                >
                  <div className="p-6 border-b border-border flex items-center justify-between bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-200 dark:border-purple-800">
                        <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-foreground">Batch Session History</h4>
                        <p className="text-sm text-muted-foreground">View all batch sessions with attendance summaries</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCloseSessionHistory}
                      className="p-2 rounded-lg hover:bg-surface-secondary transition-colors"
                    >
                      <X className="w-6 h-6 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Filters */}
                  <div className="p-4 border-b border-border bg-surface/50">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <select
                        value={sessionFilters.batch_id}
                        onChange={(e) => setSessionFilters({...sessionFilters, batch_id: e.target.value})}
                        className="px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      >
                        <option value="">All Batches</option>
                        {batches.map(b => (
                          <option key={b.batch_id} value={b.batch_id}>{b.name}</option>
                        ))}
                      </select>
                      <select
                        value={sessionFilters.coach_id}
                        onChange={(e) => setSessionFilters({...sessionFilters, coach_id: e.target.value})}
                        className="px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      >
                        <option value="">All Coaches</option>
                        {coaches.map(c => (
                          <option key={c.coach_id} value={c.coach_id}>{c.name}</option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={sessionFilters.date_from}
                        onChange={(e) => setSessionFilters({...sessionFilters, date_from: e.target.value})}
                        className="px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                        placeholder="From Date"
                      />
                      <input
                        type="date"
                        value={sessionFilters.date_to}
                        onChange={(e) => setSessionFilters({...sessionFilters, date_to: e.target.value})}
                        className="px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                        placeholder="To Date"
                      />
                      <select
                        value={sessionFilters.status}
                        onChange={(e) => setSessionFilters({...sessionFilters, status: e.target.value})}
                        className="px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      >
                        <option value="">All Status</option>
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="LIVE">Live</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="MISSED">Missed</option>
                      </select>
                    </div>
                    <button
                      onClick={loadSessionHistory}
                      className="mt-3 w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg transition-colors"
                    >
                      Apply Filters
                    </button>
                  </div>

                  {/* Session List */}
                  <div className="flex-1 overflow-y-auto p-4">
                    {sessionHistoryLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                      </div>
                    ) : sessionHistory.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Clock className="w-16 h-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-bold text-foreground">No sessions found</h3>
                        <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters or check back later.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sessionHistory.map((session) => (
                          <div key={session.session_id} className="bg-surface border border-border rounded-xl p-4 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h5 className="font-bold text-foreground">{session.batch_name}</h5>
                                <p className="text-sm text-muted-foreground">{session.sport_name} • {session.timing}</p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                session.status === 'LIVE' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                session.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                session.status === 'MISSED' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}>
                                {session.status}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground text-xs">Date</p>
                                <p className="font-semibold">{new Date(session.session_date).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Start Time</p>
                                <p className="font-semibold">{session.start_time ? new Date(session.start_time).toLocaleTimeString() : 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Duration</p>
                                <p className="font-semibold">{session.duration_minutes ? `${session.duration_minutes} min` : 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Coach</p>
                                <p className="font-semibold">{session.coach_name}</p>
                              </div>
                            </div>
                            {session.attendance_summary && (
                              <div className="mt-3 pt-3 border-t border-border flex gap-4 text-xs">
                                <span className="text-emerald-600 font-bold">Present: {session.attendance_summary.present}</span>
                                <span className="text-rose-600 font-bold">Absent: {session.attendance_summary.absent}</span>
                                <span className="text-amber-600 font-bold">Late: {session.attendance_summary.late}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

        <div className="grid gap-6 lg:grid-cols-12 items-start">
          
          {/* LEFT COLUMN: Create / Edit Form */}
          <div className="lg:col-span-4 xl:col-span-4 rounded-3xl bg-card shadow-sm border border-border p-6 lg:sticky lg:top-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
            <form onSubmit={(e) => handleBatchSubmit(e, false)} className="space-y-6 mt-2">
              <div className="flex items-center justify-between border-b border-border/50 pb-4 mb-2">
                <h3 className="text-xl font-black text-foreground flex items-center gap-2">
                  {editingBatchId ? <><Edit2 size={20} className="text-blue-500" /> Modify Batch</> : <><Plus size={20} className="text-primary stroke-[3]" /> Create Batch</>}
                </h3>
                {editingBatchId && (
                  <button 
                    type="button" 
                    onClick={() => { 
                      setEditingBatchId(null); setBatchForm(emptyBatchForm); setCoachSearch(''); setSportSearch(''); setFieldErrors({});
                    }} 
                    className="text-xs font-bold text-muted-foreground hover:text-foreground uppercase bg-surface border border-border px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Batch Name <span className="text-rose-500">*</span></label>
                <input
                  name="name"
                  placeholder="e.g. Morning Elite"
                  className={`w-full rounded-xl border bg-surface px-4 py-3 text-sm font-semibold outline-none transition-all focus:bg-background ${fieldErrors.name ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20' : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/20'}`}
                  value={batchForm.name}
                  onChange={handleBatchChange}
                />
                {fieldErrors.name && <p className="text-[11px] font-bold text-rose-500 mt-1">{fieldErrors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Start Time <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input 
                      name="startTime" 
                      type="time" 
                      className="w-full rounded-xl border border-border bg-surface pl-10 pr-3 py-3 text-sm font-black outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all focus:bg-background" 
                      value={batchForm.startTime} 
                      onChange={handleBatchChange} 
                      required 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">End Time <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input 
                      name="endTime" 
                      type="time" 
                      className="w-full rounded-xl border border-border bg-surface pl-10 pr-3 py-3 text-sm font-black outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all focus:bg-background" 
                      value={batchForm.endTime} 
                      onChange={handleBatchChange} 
                      required 
                    />
                  </div>
                </div>
              </div>

              {/* Coach Picker */}
              <div ref={coachRef} className="relative z-20">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Assign Coach <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search coach..."
                    className={`w-full rounded-xl border bg-surface pl-10 pr-8 py-3 text-sm font-semibold outline-none transition-all focus:bg-background ${fieldErrors.coach_id ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20' : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/20'}`}
                    value={coachSearch}
                    onChange={(e) => {
                      setCoachSearch(e.target.value);
                      setCoachDropdownOpen(true);
                      if (batchForm.coach_id) setBatchForm(prev => ({ ...prev, coach_id: '' }));
                    }}
                    onFocus={() => setCoachDropdownOpen(true)}
                  />
                  {coachSearch && (
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 bg-surface-secondary rounded p-1 text-muted-foreground hover:text-foreground transition-colors" onClick={() => { setCoachSearch(''); setBatchForm(prev => ({...prev, coach_id: ''})); }}>
                      <X size={14} />
                    </button>
                  )}
                </div>
                {fieldErrors.coach_id && <p className="text-[11px] font-bold text-rose-500 mt-1">{fieldErrors.coach_id}</p>}
                
                <AnimatePresence>
                  {coachDropdownOpen && (
                    <motion.ul 
                      initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}
                      className="absolute w-full mt-2 max-h-48 overflow-y-auto bg-card border border-border rounded-xl shadow-xl p-2 custom-scrollbar"
                    >
                      {filteredCoaches.length === 0 ? (
                        <li className="p-4 text-xs font-bold text-muted-foreground text-center bg-surface rounded-lg border border-dashed border-border">No coaches match search</li>
                      ) : (
                        filteredCoaches.map(c => {
                          const isSel = batchForm.coach_id === c.coach_id?.toString();
                          return (
                            <li 
                              key={c.coach_id}
                              className={`p-3 text-sm font-bold rounded-lg cursor-pointer transition-colors flex items-center justify-between mb-1 last:mb-0 ${isSel ? 'bg-primary/10 text-primary border border-primary/20' : 'text-foreground hover:bg-surface-secondary'}`}
                              onClick={() => {
                                setBatchForm(prev => ({ ...prev, coach_id: c.coach_id.toString() }));
                                setCoachSearch(c.name);
                                setCoachDropdownOpen(false);
                                clearFieldError('coach_id');
                              }}
                            >
                              <span>{c.name}</span>
                              {isSel && <CheckCircle size={16} />}
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
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Assign Sport <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <Medal size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search sport..."
                    className={`w-full rounded-xl border bg-surface pl-10 pr-8 py-3 text-sm font-semibold outline-none transition-all focus:bg-background ${fieldErrors.sport_id ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20' : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/20'}`}
                    value={sportSearch}
                    onChange={(e) => {
                      setSportSearch(e.target.value);
                      setSportDropdownOpen(true);
                      if (batchForm.sport_id) setBatchForm(prev => ({ ...prev, sport_id: '' }));
                    }}
                    onFocus={() => setSportDropdownOpen(true)}
                  />
                  {sportSearch && (
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 bg-surface-secondary rounded p-1 text-muted-foreground hover:text-foreground transition-colors" onClick={() => { setSportSearch(''); setBatchForm(prev => ({...prev, sport_id: ''})); }}>
                      <X size={14} />
                    </button>
                  )}
                </div>
                {fieldErrors.sport_id && <p className="text-[11px] font-bold text-rose-500 mt-1">{fieldErrors.sport_id}</p>}
                
                <AnimatePresence>
                  {sportDropdownOpen && (
                    <motion.ul 
                      initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}
                      className="absolute w-full mt-2 max-h-48 overflow-y-auto bg-card border border-border rounded-xl shadow-xl p-2 custom-scrollbar"
                    >
                      {filteredSports.length === 0 ? (
                        <li className="p-4 text-xs font-bold text-muted-foreground text-center bg-surface rounded-lg border border-dashed border-border">No sports match search</li>
                      ) : (
                        filteredSports.map(s => {
                          const isSel = batchForm.sport_id === s.sport_id?.toString();
                          return (
                            <li 
                              key={s.sport_id}
                              className={`p-3 text-sm font-bold rounded-lg cursor-pointer transition-colors flex items-center justify-between mb-1 last:mb-0 ${isSel ? 'bg-primary/10 text-primary border border-primary/20' : 'text-foreground hover:bg-surface-secondary'}`}
                              onClick={() => {
                                setBatchForm(prev => ({ ...prev, sport_id: s.sport_id.toString() }));
                                setSportSearch(s.name);
                                setSportDropdownOpen(false);
                                clearFieldError('sport_id');
                              }}
                            >
                              <span className="flex items-center gap-2"><span className="text-xl leading-none">{s.icon || '🏅'}</span> {s.name}</span>
                              {isSel && <CheckCircle size={16} />}
                            </li>
                          );
                        })
                      )}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Max Capacity <span className="text-muted-foreground font-medium normal-case tracking-normal opacity-70">(Optional)</span></label>
                <div className="relative">
                  <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input 
                    name="max_capacity" 
                    type="number" 
                    min={1} 
                    className={`w-full rounded-xl border bg-surface pl-10 pr-4 py-3 text-sm font-semibold outline-none transition-all focus:bg-background ${fieldErrors.max_capacity ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20' : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/20'}`} 
                    value={batchForm.max_capacity} 
                    onChange={handleBatchChange} 
                    placeholder="e.g. 20" 
                  />
                </div>
                {fieldErrors.max_capacity && <p className="text-[11px] font-bold text-rose-500 mt-1">{fieldErrors.max_capacity}</p>}
              </div>

              <div className="pt-4 mt-8">
                <motion.button 
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  type="submit" 
                  className={`w-full py-4 rounded-xl font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 ${editingBatchId ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-[0_4px_15px_rgba(37,99,235,0.3)]' : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_15px_rgba(16,185,129,0.3)]'}`}
                >
                  {editingBatchId ? <Edit2 size={18} /> : <Plus size={18} strokeWidth={3} />}
                  {editingBatchId ? 'Save Changes' : 'Create Batch'}
                </motion.button>
              </div>
            </form>
          </div>

          {/* RIGHT COLUMN: Table View */}
          <div className="lg:col-span-8 xl:col-span-8 space-y-5">
            
            {/* Table Search Header */}
            <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="text"
                  className="w-full pl-11 pr-4 py-3.5 bg-surface border border-transparent focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-sm transition-all text-foreground font-semibold placeholder:text-muted-foreground/60 placeholder:font-medium"
                  placeholder="Filter scheduled batches by name, sport, or coach..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Table Core */}
            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
              {loading ? (
                <div className="p-20 flex justify-center"><Loader /></div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-surface-secondary/50 border-b border-border/50">
                      <tr className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <th className="px-6 py-5">Batch Profile</th>
                        <th className="px-4 py-5 text-center">Schedule</th>
                        <th className="px-4 py-5">Assignment</th>
                        <th className="px-4 py-5 text-center">Capacity</th>
                        <th className="px-6 py-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <motion.tbody 
                      variants={tableContainerVariants}
                      initial="hidden" animate="show"
                      className="divide-y divide-border/50"
                    >
                      {filteredBatches.length === 0 ? (
                        <motion.tr variants={rowVariants}>
                          <td colSpan={5} className="py-24 text-center bg-surface/30">
                            <div className="flex flex-col items-center justify-center">
                              <span className="text-5xl opacity-30 mb-4 block">🏟️</span>
                              <p className="font-bold text-lg text-foreground">No batches found</p>
                              <p className="mt-1 text-sm font-medium text-muted-foreground">Create a new batch using the form to your left.</p>
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
                              className={`group hover:bg-surface-secondary/50 transition-colors ${editingBatchId === batch.batch_id ? 'bg-primary/5 hover:bg-primary/10 relative z-10' : ''}`}
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-surface-secondary border border-border shadow-inner flex items-center justify-center text-lg font-black text-muted-foreground group-hover:text-foreground transition-colors">
                                    {(batch?.name).charAt(0).toUpperCase()}
                                  </div>
                                  <span className={`font-black text-base transition-colors ${editingBatchId === batch.batch_id ? 'text-primary' : 'text-foreground group-hover:text-primary'}`}>{batch?.name}</span>
                                </div>
                              </td>
                              
                              <td className="px-4 py-4 text-center">
                                <div className="inline-flex items-center gap-2 bg-surface border border-border/50 shadow-sm px-3 py-1.5 rounded-lg text-foreground font-bold text-xs">
                                  <Clock size={12} className="text-muted-foreground" />
                                  {batch?.timing || '—'}
                                </div>
                              </td>

                              <td className="px-4 py-4">
                                <div className="flex flex-col gap-2">
                                  {/* Coach Badge */}
                                  <span className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider w-fit border border-blue-200 dark:border-blue-800/50">
                                    <User size={12} /> {batch?.coach?.name || 'Unassigned'}
                                  </span>
                                  {/* Sport Badge */}
                                  <span className="inline-flex items-center gap-1.5 bg-surface border border-border text-foreground px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider w-fit shadow-sm">
                                    <span className="text-[12px] leading-none">{sportIcon}</span> {batch?.sport?.name || '—'}
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-4">
                                <div className="flex flex-col items-center gap-1">
                                  <span className={`text-[11px] font-black ${isFull ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded' : 'text-foreground'}`}>
                                    {enrolled} {max ? `/ ${max}` : 'enrolled'}
                                  </span>
                                  <div className="w-20 h-1.5 bg-surface-secondary border border-border rounded-full overflow-hidden shadow-inner">
                                    {max ? (
                                      <div 
                                        className={`h-full transition-all ${isFull ? 'bg-rose-500' : 'bg-primary'}`} 
                                        style={{ width: `${Math.min((enrolled / max) * 100, 100)}%` }}
                                      />
                                    ) : (
                                      <div className="h-full bg-primary/50 w-full" />
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
                                  <button
                                    type="button"
                                    onClick={() => handleEditClick(batch)}
                                    className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 flex items-center justify-center transition-colors"
                                    title="Edit Batch"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBatch(batch?.batch_id)}
                                    className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 flex items-center justify-center transition-colors"
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