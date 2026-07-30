import { useCallback, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, CheckCircle, AlertCircle, Clock, Trash2, Edit2, Plus, Calendar, AlertTriangle, User, Medal, Users, Activity, Layers, ArrowDown } from 'lucide-react';
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

// Custom Sports SVG Icons
const SoccerIcon = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="m12 2-3.5 3.5v4L12 11l3.5-1.5v-4z" />
    <path d="M12 11v4.5l-4 3" />
    <path d="M12 15.5l4 3" />
    <path d="M3.5 12h5" />
    <path d="M15.5 12h5" />
    <path d="M8.5 5.5 5 9" />
    <path d="m15.5 5.5 3.5 3.5" />
  </svg>
);

const CricketIcon = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m14.5 5.5 4 4" />
    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L7 20l-4.5 1.5L4 17Z" />
    <circle cx="5" cy="5" r="1" />
  </svg>
);

const BasketballIcon = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M6.2 6.2c2.4 2.4 2.4 6.4 0 8.8" />
    <path d="M17.8 6.2c-2.4 2.4-2.4 6.4 0 8.8" />
    <path d="M2 12h20" />
    <path d="M12 2v20" />
  </svg>
);


// Time parsing helper
const getBatchTimeStatus = (timing) => {
  if (!timing || !timing.includes('-')) return 'ACTIVE';
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startStr, endStr] = timing.split('-');
  const [startHr, startMin] = startStr.trim().split(':').map(Number);
  const [endHr, endMin] = endStr.trim().split(':').map(Number);

  if (isNaN(startHr) || isNaN(endHr)) return 'ACTIVE';

  const startMinutes = startHr * 60 + (startMin || 0);
  const endMinutes = endHr * 60 + (endMin || 0);

  if (currentMinutes < startMinutes) return 'UPCOMING';
  if (currentMinutes > endMinutes) return 'COMPLETED';
  return 'ACTIVE';
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
  const [sessionToEnd, setSessionToEnd] = useState(null);
  const [endingSession, setEndingSession] = useState(false);

  // Redesign state additions
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedSportFilter, setSelectedSportFilter] = useState('');
  const [selectedCoachFilter, setSelectedCoachFilter] = useState('');

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

  // Scrolling Logic
  const [scrollTop, setScrollTop] = useState(0);
  const [showScrollBtn, setShowScrollBtn] = useState(true);

  useEffect(() => {
    const scrollContainer = document.querySelector('main')?.parentElement || window;
    const handleScroll = () => {
      const currentScroll = scrollContainer.scrollTop || window.scrollY;
      setScrollTop(currentScroll);
    };
    scrollContainer.addEventListener('scroll', handleScroll);
    setTimeout(handleScroll, 500);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [batches]);

  const handleScrollAction = () => {
    const scrollContainer = document.querySelector('main')?.parentElement || window;
    if (scrollTop > 150) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      scrollContainer.scrollTo({ top: scrollContainer.scrollHeight || 5000, behavior: 'smooth' });
    }
  };

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
      setIsDrawerOpen(false);
      loadData();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
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
    setIsDrawerOpen(true);
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
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
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

  const handleEndSession = async () => {
    if (!sessionToEnd) return;

    setEndingSession(true);
    try {
      await adminPost(`/admin/batch-sessions/${sessionToEnd.session_id}/end`);
      setMessage({ text: 'Batch session ended successfully', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      setSessionToEnd(null);
      loadSessionHistory();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setEndingSession(false);
    }
  };

  const filteredBatches = (batches || []).filter(
    (batch) => {
      const matchesSearch =
        batch?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        batch?.sport?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        batch?.coach?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSport = selectedSportFilter === '' || batch?.sport_id?.toString() === selectedSportFilter;
      const matchesCoach = selectedCoachFilter === '' || batch?.coach_id?.toString() === selectedCoachFilter;

      return matchesSearch && matchesSport && matchesCoach;
    }
  );

  const filteredCoaches = coaches.filter(c =>
    c.name?.toLowerCase().includes(coachSearch.toLowerCase())
  );

  const filteredSports = sports.filter(s =>
    s.name?.toLowerCase().includes(sportSearch.toLowerCase())
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.04 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const totalCount = batches.length;
  const activeCount = batches.filter(b => getBatchTimeStatus(b.timing) === 'ACTIVE').length;
  const upcomingCount = batches.filter(b => getBatchTimeStatus(b.timing) === 'UPCOMING').length;
  const completedCount = batches.filter(b => getBatchTimeStatus(b.timing) === 'COMPLETED').length;

  return (
    <motion.div
      className="relative z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Main Content Wrapper (Sits on top of the curve) */}
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Global Alerts using Portal */}
        {typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            {message.text && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className={`fixed top-4 right-4 z-[9999] rounded-xl px-4 py-3 shadow-xl border-l-4 flex items-center gap-2.5 font-bold text-sm ${message.type === 'success'
                  ? 'bg-white border-emerald-500 text-emerald-700 dark:bg-gray-900 dark:border-emerald-500 dark:text-emerald-400'
                  : 'bg-white border-rose-500 text-rose-700 dark:bg-gray-900 dark:border-rose-500 dark:text-rose-400'
                  }`}
              >
                {message.type === 'success' ? <CheckCircle size={18} className="shrink-0 text-emerald-500" /> : <AlertCircle size={18} className="shrink-0 text-rose-500" />}
                <span className="tracking-wide">{message.text}</span>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

        {/* Header */}
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                Batches & Scheduling
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your sports and coaching allocations seamlessly.
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleViewSessionHistory}
            className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-5 py-3 rounded-xl shadow-[0_4px_14px_rgba(244,63,94,0.3)] flex items-center justify-center gap-2 text-sm transition-all border border-rose-600 relative z-10"
          >
            <Activity className="w-4 h-4" />
            Session History
          </motion.button>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl shadow-sm flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Batches</span>
              <span className="text-3xl font-black text-gray-900 dark:text-white mt-1">{totalCount}</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center">
              <Layers className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl shadow-sm flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live Today</span>
              <span className="text-3xl font-black text-gray-900 dark:text-white mt-1 flex items-center gap-2">
                {activeCount}
                {activeCount > 0 && (
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                  </span>
                )}
              </span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-orange-500 dark:text-orange-400 flex items-center justify-center">
              <Activity className="h-6 w-6 animate-pulse" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl shadow-sm flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Upcoming</span>
              <span className="text-3xl font-black text-gray-900 dark:text-white mt-1">{upcomingCount}</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-500 flex items-center justify-center">
              <Clock className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl shadow-sm flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Completed Today</span>
              <span className="text-3xl font-black text-gray-900 dark:text-white mt-1">{completedCount}</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Modals using Portal... */}
        {/* Overlap Conflict Modal */}
        {typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            {overlapDetails && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <motion.div
                  className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-2xl max-w-sm w-full border-t-4 border-amber-500"
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Schedule Conflict</h4>
                  </div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 leading-relaxed mb-6 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-xl">{overlapDetails}</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="flex-1 px-4 py-3 text-sm font-bold rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => setOverlapDetails(null)}
                    >
                      Go Back
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      className="flex-1 px-4 py-3 text-sm font-black uppercase tracking-wider rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-500/30 transition-all hover:bg-amber-600"
                      onClick={() => handleBatchSubmit(null, true)}
                    >
                      Override
                    </motion.button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

        {/* Batch Session History Modal */}
        {typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            {showSessionHistory && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <motion.div
                  className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col"
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ type: "spring", bounce: 0.3 }}
                >
                  <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-sm shadow-rose-500/20">
                        <Activity className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none mb-1">Batch History</h4>
                        <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Track attendances and timelines</p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ rotate: 90 }}
                      type="button"
                      onClick={handleCloseSessionHistory}
                      className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                    </motion.button>
                  </div>

                  {/* Filters */}
                  <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <select
                        value={sessionFilters.batch_id}
                        onChange={(e) => setSessionFilters({ ...sessionFilters, batch_id: e.target.value })}
                        className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      >
                        <option value="">All Batches</option>
                        {batches.map(b => (
                          <option key={b.batch_id} value={b.batch_id}>{b.name}</option>
                        ))}
                      </select>
                      <select
                        value={sessionFilters.coach_id}
                        onChange={(e) => setSessionFilters({ ...sessionFilters, coach_id: e.target.value })}
                        className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      >
                        <option value="">All Coaches</option>
                        {coaches.map(c => (
                          <option key={c.coach_id} value={c.coach_id}>{c.name}</option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={sessionFilters.date_from}
                        onChange={(e) => setSessionFilters({ ...sessionFilters, date_from: e.target.value })}
                        className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      />
                      <input
                        type="date"
                        value={sessionFilters.date_to}
                        onChange={(e) => setSessionFilters({ ...sessionFilters, date_to: e.target.value })}
                        className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      />
                      <select
                        value={sessionFilters.status}
                        onChange={(e) => setSessionFilters({ ...sessionFilters, status: e.target.value })}
                        className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      >
                        <option value="">All Status</option>
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="LIVE">Live</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="MISSED">Missed</option>
                      </select>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={loadSessionHistory}
                      className="mt-3 w-full px-4 py-2.5 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white text-xs font-black rounded-xl transition-colors uppercase tracking-widest shadow-md"
                    >
                      Apply Filters
                    </motion.button>
                  </div>

                  {/* Session List */}
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-50/50 dark:bg-gray-900">
                    {sessionHistoryLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <div className="w-8 h-8 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin"></div>
                      </div>
                    ) : sessionHistory.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Activity className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-4" />
                        <h3 className="text-base font-bold text-gray-900 dark:text-white uppercase tracking-tight">No sessions found</h3>
                      </div>
                    ) : (
                      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
                        {sessionHistory.map((session) => {
                          const presentCount = session.attendance_summary?.present ?? 0;
                          const absentCount = session.attendance_summary?.absent ?? 0;
                          const lateCount = session.attendance_summary?.late ?? 0;
                          const totalStudents = presentCount + absentCount + lateCount;
                          const attendancePct = totalStudents > 0 ? Math.round(((presentCount + lateCount) / totalStudents) * 100) : 0;
                          const durationStr = session.duration_minutes ? `${session.duration_minutes} mins` : 'N/A';

                          return (
                            <motion.div variants={itemVariants} key={session.session_id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 hover:border-rose-400 dark:hover:border-rose-500 transition-colors shadow-sm">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h5 className="font-black text-base text-gray-900 dark:text-white uppercase tracking-tight">{session.batch_name}</h5>
                                  <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mt-0.5">{session.sport_name} • {session.timing}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${session.status === 'LIVE' ? 'bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50' :
                                    session.status === 'LATE_START' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' :
                                      session.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' :
                                        session.status === 'MISSED' ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400' :
                                          session.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' :
                                            'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                    }`}>
                                    {session.status}
                                  </span>
                                  {(session.status === 'LIVE' || session.status === 'LATE_START') && (
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => setSessionToEnd(session)}
                                      className="bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black px-3 py-1 rounded-lg transition-colors uppercase tracking-widest"
                                    >
                                      End
                                    </motion.button>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                <div>
                                  <p className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">Date</p>
                                  <p className="font-black text-gray-900 dark:text-gray-100">{new Date(session.session_date).toLocaleDateString()}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">Start</p>
                                  <p className="font-black text-gray-900 dark:text-gray-100">{session.start_time ? new Date(session.start_time).toLocaleTimeString() : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">Duration</p>
                                  <p className="font-black text-gray-900 dark:text-gray-100">{durationStr}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">Coach</p>
                                  <p className="font-black text-gray-900 dark:text-gray-100 truncate">{session.coach_name}</p>
                                </div>
                              </div>
                              {session.attendance_summary && (
                                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50 space-y-2">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700/50 text-xs">
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400 block mb-1 font-bold text-[10px] uppercase tracking-widest">Total</span>
                                      <strong className="text-gray-900 dark:text-white font-black text-sm">{totalStudents}</strong>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400 block mb-1 font-bold text-[10px] uppercase tracking-widest">P/L/A</span>
                                      <strong className="text-gray-900 dark:text-white font-black text-sm">
                                        <span className="text-emerald-500">{presentCount}</span> / <span className="text-amber-500">{lateCount}</span> / <span className="text-rose-500">{absentCount}</span>
                                      </strong>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400 block mb-1 font-bold text-[10px] uppercase tracking-widest">Attend.</span>
                                      <strong className="text-emerald-600 dark:text-emerald-400 font-black text-sm">{attendancePct}%</strong>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

        {/* Batch Over Confirmation Modal */}
        {typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            {sessionToEnd && (
              <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <motion.div
                  className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-2xl max-w-sm w-full border-t-4 border-rose-500"
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center shrink-0">
                      <AlertCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                    </div>
                    <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">End Session</h4>
                  </div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 leading-relaxed mb-6 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-xl">
                    Are you sure you want to end <span className="text-gray-900 dark:text-white font-black">{sessionToEnd.batch_name}</span>?
                    This will lock all attendance records.
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="flex-1 px-4 py-3 text-sm font-bold rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => setSessionToEnd(null)}
                      disabled={endingSession}
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      className="flex-1 px-4 py-3 text-sm font-black uppercase tracking-wider rounded-xl bg-rose-500 text-white shadow-lg shadow-rose-500/30 transition-all hover:bg-rose-600 disabled:opacity-50"
                      onClick={handleEndSession}
                      disabled={endingSession}
                    >
                      {endingSession ? 'Ending...' : 'End Now'}
                    </motion.button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

        {/* Search & Filters Row */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500" size={18} />
            <input
              type="text"
              className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-yellow-400 rounded-2xl outline-none text-sm transition-all text-gray-900 dark:text-white font-bold placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-yellow-400/20"
              placeholder="Search by name, sport, or coach..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedSportFilter}
              onChange={(e) => setSelectedSportFilter(e.target.value)}
              className="px-4 py-3 text-sm font-bold rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 cursor-pointer transition-all"
            >
              <option value="">All Sports</option>
              {sports.map(s => (
                <option key={s.sport_id} value={s.sport_id}>{s.name}</option>
              ))}
            </select>

            <select
              value={selectedCoachFilter}
              onChange={(e) => setSelectedCoachFilter(e.target.value)}
              className="px-4 py-3 text-sm font-bold rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 cursor-pointer transition-all"
            >
              <option value="">All Coaches</option>
              {coaches.map(c => (
                <option key={c.coach_id} value={c.coach_id}>{c.name}</option>
              ))}
            </select>

            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setEditingBatchId(null);
                setBatchForm(emptyBatchForm);
                setCoachSearch('');
                setSportSearch('');
                setFieldErrors({});
                setIsDrawerOpen(true);
              }}
              className="bg-[#FFD100] hover:bg-[#E6BC00] text-gray-950 font-black px-5 py-3 rounded-2xl shadow-[0_4px_14px_rgba(255,209,0,0.3)] flex items-center justify-center gap-2 text-sm transition-all border border-[#FFD100] shrink-0 uppercase tracking-widest"
            >
              <Plus size={18} strokeWidth={3} />
              Create Batch
            </motion.button>
          </div>
        </div>

        {/* Batch Cards Grid */}
        <div className="relative">
          {loading ? (
            <div className="p-16 flex justify-center"><Loader /></div>
          ) : filteredBatches.length === 0 ? (
            <motion.div
              variants={itemVariants}
              initial="hidden" animate="show"
              className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-20 text-center shadow-sm"
            >
              <div className="flex flex-col items-center justify-center">
                <span className="text-6xl mb-5 block opacity-50">🏟️</span>
                <p className="font-black text-xl text-gray-900 dark:text-white uppercase tracking-tight">No training batches found</p>
                <p className="mt-2 text-sm font-semibold text-gray-500">Create a new batch or try adjusting your search filters.</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden" animate="show"
              className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            >
              {filteredBatches.map((batch) => {
                const enrolled = batch?.enrolled_count ?? batch?.students?.length ?? 0;
                const max = batch?.max_capacity;
                const isFull = max && enrolled >= max;
                const sportIcon = sports.find(s => s.sport_id === batch.sport_id)?.icon || '🏅';
                const status = getBatchTimeStatus(batch.timing);

                return (
                  <motion.div
                    layout
                    key={batch?.batch_id}
                    variants={itemVariants}
                    className={`bg-white dark:bg-gray-900 rounded-3xl border transition-all duration-300 p-5 shadow-sm relative overflow-hidden group flex flex-col justify-between ${editingBatchId === batch.batch_id ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-900/10 shadow-blue-500/20 shadow-xl z-10' : 'border-gray-100 dark:border-gray-800 hover:border-yellow-400 hover:shadow-xl'}`}
                  >
                    <div>
                      {/* Top line: Status and Sport badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div>
                          {status === 'ACTIVE' ? (
                            <span className="inline-flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border border-orange-200/50 dark:border-orange-800/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" /> Live
                            </span>
                          ) : status === 'UPCOMING' ? (
                            <span className="inline-flex items-center gap-1.5 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border border-yellow-200/50 dark:border-yellow-800/50">
                              Upcoming
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-200/50 dark:border-gray-700">
                              Completed
                            </span>
                          )}
                        </div>

                        <span className="inline-flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest">
                          <span className="text-xs leading-none">{sportIcon}</span> {batch?.sport?.name || '—'}
                        </span>
                      </div>

                      {/* Batch Name */}
                      <h4 className="text-lg font-black text-gray-900 dark:text-white group-hover:text-[#FFD100] transition-colors line-clamp-1 leading-snug tracking-tight">
                        {batch?.name}
                      </h4>

                      {/* Timing Schedule */}
                      <div className="inline-flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700 px-3 py-1 rounded-xl text-gray-800 dark:text-gray-200 font-bold text-xs mt-2">
                        <Clock size={12} className="text-[#FFD100]" />
                        {batch?.timing || '—'}
                      </div>

                      {/* Coach Profile */}
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-50 dark:border-gray-800">
                        <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-black text-xs flex items-center justify-center border border-gray-200/50 dark:border-gray-700 group-hover:scale-105 transition-transform duration-300">
                          {batch?.coach?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Coach Assigned</span>
                          <span className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[140px] mt-0.5">
                            {batch?.coach?.name || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer: Capacity Utilization & Actions */}
                    <div className="mt-4 pt-3 border-t border-gray-50 dark:border-gray-800 space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          <span>Students: {enrolled} {max ? `/ ${max}` : ''}</span>
                          {isFull && <span className="text-rose-500">Full</span>}
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          {max ? (
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min((enrolled / max) * 100, 100)}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className={`h-full ${isFull ? 'bg-rose-500' : 'bg-[#FFD100]'}`}
                            />
                          ) : (
                            <div className="h-full bg-[#FFD100]/50 w-full" />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] font-bold text-gray-400 italic">ID: #{batch?.batch_id}</span>
                        <div className="flex items-center gap-1.5">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            type="button"
                            onClick={() => handleEditClick(batch)}
                            className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500 flex items-center justify-center transition-colors"
                            title="Edit Batch"
                          >
                            <Edit2 size={13} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            type="button"
                            onClick={() => handleDeleteBatch(batch?.batch_id)}
                            className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500 flex items-center justify-center transition-colors"
                            title="Delete Batch"
                          >
                            <Trash2 size={13} />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>

        {/* Slide-over Side Drawer (Create / Edit Form) */}
        <AnimatePresence>
          {isDrawerOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setIsDrawerOpen(false);
                  setEditingBatchId(null);
                  setBatchForm(emptyBatchForm);
                  setCoachSearch('');
                  setSportSearch('');
                  setFieldErrors({});
                }}
                className="fixed inset-0 z-[9990] bg-gray-900/40 backdrop-blur-sm"
              />
              {/* Drawer Container */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 right-0 z-[9999] w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl flex flex-col border-l border-gray-100 dark:border-gray-800"
              >
                {/* Drawer Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
                  <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2.5">
                    {editingBatchId ? (
                      <><div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400"><Edit2 size={18} /></div> Edit Batch</>
                    ) : (
                      <><div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400"><Plus size={18} strokeWidth={3} /></div> Create Batch</>
                    )}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      setEditingBatchId(null);
                      setBatchForm(emptyBatchForm);
                      setCoachSearch('');
                      setSportSearch('');
                      setFieldErrors({});
                    }}
                    className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Drawer Body (Scrollable form) */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                  {/* Batch Name */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Batch Name <span className="text-rose-500">*</span></label>
                    <input
                      name="name"
                      placeholder="e.g. Morning Elite"
                      className={`w-full rounded-2xl border bg-gray-50 dark:bg-gray-800/50 px-4 py-3.5 text-sm font-bold outline-none transition-all focus:bg-white dark:focus:bg-gray-900 text-gray-900 dark:text-white ${fieldErrors.name ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20' : `border-gray-200 dark:border-gray-700 ${editingBatchId ? 'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' : 'focus:border-[#FFD100] focus:ring-2 focus:ring-[#FFD100]/20'}`}`}
                      value={batchForm.name}
                      onChange={handleBatchChange}
                    />
                    {fieldErrors.name && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-[10px] font-bold text-rose-500 mt-1.5">{fieldErrors.name}</motion.p>}
                  </div>

                  {/* Timings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Start <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          name="startTime"
                          type="time"
                          className={`w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 pl-10 pr-3 py-3.5 text-sm font-bold text-gray-900 dark:text-white outline-none transition-all focus:bg-white dark:focus:bg-gray-900 ${editingBatchId ? 'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' : 'focus:border-[#FFD100] focus:ring-2 focus:ring-[#FFD100]/20'}`}
                          value={batchForm.startTime}
                          onChange={handleBatchChange}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">End <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          name="endTime"
                          type="time"
                          className={`w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 pl-10 pr-3 py-3.5 text-sm font-bold text-gray-900 dark:text-white outline-none transition-all focus:bg-white dark:focus:bg-gray-900 ${editingBatchId ? 'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' : 'focus:border-[#FFD100] focus:ring-2 focus:ring-[#FFD100]/20'}`}
                          value={batchForm.endTime}
                          onChange={handleBatchChange}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Coach Selection */}
                  <div ref={coachRef} className="relative z-20">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Assign Coach <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search coach..."
                        className={`w-full rounded-2xl border bg-gray-50 dark:bg-gray-800/50 pl-10 pr-10 py-3.5 text-sm font-bold text-gray-900 dark:text-white outline-none transition-all focus:bg-white dark:focus:bg-gray-900 ${fieldErrors.coach_id ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20' : `border-gray-200 dark:border-gray-700 ${editingBatchId ? 'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' : 'focus:border-[#FFD100] focus:ring-2 focus:ring-[#FFD100]/20'}`}`}
                        value={coachSearch}
                        onChange={(e) => {
                          setCoachSearch(e.target.value);
                          setCoachDropdownOpen(true);
                          if (batchForm.coach_id) setBatchForm(prev => ({ ...prev, coach_id: '' }));
                        }}
                        onFocus={() => setCoachDropdownOpen(true)}
                      />
                      {coachSearch && (
                        <button type="button" className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-gray-200 dark:bg-gray-700 rounded-lg p-1 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors" onClick={() => { setCoachSearch(''); setBatchForm(prev => ({ ...prev, coach_id: '' })); }}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {fieldErrors.coach_id && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-[10px] font-bold text-rose-500 mt-1.5">{fieldErrors.coach_id}</motion.p>}

                    <AnimatePresence>
                      {coachDropdownOpen && (
                        <motion.ul
                          initial={{ opacity: 0, y: -5, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.98 }} transition={{ duration: 0.15 }}
                          className="absolute w-full mt-2 max-h-48 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl p-2 custom-scrollbar z-50"
                        >
                          {filteredCoaches.length === 0 ? (
                            <li className="p-4 text-xs font-semibold text-gray-500 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">No coaches found</li>
                          ) : (
                            filteredCoaches.map(c => {
                              const isSel = batchForm.coach_id === c.coach_id?.toString();
                              return (
                                <li
                                  key={c.coach_id}
                                  className={`px-4 py-3 text-xs font-bold rounded-xl cursor-pointer transition-colors flex items-center justify-between mb-1 last:mb-0 ${isSel ? (editingBatchId ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-black' : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-500 font-black') : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
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

                  {/* Sport Selection */}
                  <div ref={sportRef} className="relative z-10">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Assign Sport <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <Medal size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search sport..."
                        className={`w-full rounded-2xl border bg-gray-50 dark:bg-gray-800/50 pl-10 pr-10 py-3.5 text-sm font-bold text-gray-900 dark:text-white outline-none transition-all focus:bg-white dark:focus:bg-gray-900 ${fieldErrors.sport_id ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20' : `border-gray-200 dark:border-gray-700 ${editingBatchId ? 'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' : 'focus:border-[#FFD100] focus:ring-2 focus:ring-[#FFD100]/20'}`}`}
                        value={sportSearch}
                        onChange={(e) => {
                          setSportSearch(e.target.value);
                          setSportDropdownOpen(true);
                          if (batchForm.sport_id) setBatchForm(prev => ({ ...prev, sport_id: '' }));
                        }}
                        onFocus={() => setSportDropdownOpen(true)}
                      />
                      {sportSearch && (
                        <button type="button" className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-gray-200 dark:bg-gray-700 rounded-lg p-1 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors" onClick={() => { setSportSearch(''); setBatchForm(prev => ({ ...prev, sport_id: '' })); }}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {fieldErrors.sport_id && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-[10px] font-bold text-rose-500 mt-1.5">{fieldErrors.sport_id}</motion.p>}

                    <AnimatePresence>
                      {sportDropdownOpen && (
                        <motion.ul
                          initial={{ opacity: 0, y: -5, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.98 }} transition={{ duration: 0.15 }}
                          className="absolute w-full mt-2 max-h-48 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl p-2 custom-scrollbar z-50"
                        >
                          {filteredSports.length === 0 ? (
                            <li className="p-4 text-xs font-semibold text-gray-500 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">No sports found</li>
                          ) : (
                            filteredSports.map(s => {
                              const isSel = batchForm.sport_id === s.sport_id?.toString();
                              return (
                                <li
                                  key={s.sport_id}
                                  className={`px-4 py-3 text-xs font-bold rounded-xl cursor-pointer transition-colors flex items-center justify-between mb-1 last:mb-0 ${isSel ? (editingBatchId ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-black' : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-500 font-black') : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                  onClick={() => {
                                    setBatchForm(prev => ({ ...prev, sport_id: s.sport_id.toString() }));
                                    setSportSearch(s.name);
                                    setSportDropdownOpen(false);
                                    clearFieldError('sport_id');
                                  }}
                                >
                                  <span className="flex items-center gap-2"><span className="text-base leading-none">{s.icon || '🏅'}</span> {s.name}</span>
                                  {isSel && <CheckCircle size={16} />}
                                </li>
                              );
                            })
                          )}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Max Capacity */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Max Capacity <span className="opacity-70 normal-case tracking-normal font-semibold">(Optional)</span></label>
                    <div className="relative">
                      <Users size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        name="max_capacity"
                        type="number"
                        min={1}
                        className={`w-full rounded-2xl border bg-gray-50 dark:bg-gray-800/50 pl-10 pr-3 py-3.5 text-sm font-bold text-gray-900 dark:text-white outline-none transition-all focus:bg-white dark:focus:bg-gray-900 ${fieldErrors.max_capacity ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20' : `border-gray-200 dark:border-gray-700 ${editingBatchId ? 'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' : 'focus:border-[#FFD100] focus:ring-2 focus:ring-[#FFD100]/20'}`}`}
                        value={batchForm.max_capacity}
                        onChange={handleBatchChange}
                        placeholder="e.g. 20"
                      />
                    </div>
                    {fieldErrors.max_capacity && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-[10px] font-bold text-rose-500 mt-1.5">{fieldErrors.max_capacity}</motion.p>}
                  </div>
                </div>

                {/* Drawer Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      setEditingBatchId(null);
                      setBatchForm(emptyBatchForm);
                      setCoachSearch('');
                      setSportSearch('');
                      setFieldErrors({});
                    }}
                    className="flex-1 py-3.5 text-sm font-bold rounded-2xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={(e) => handleBatchSubmit(e, false)}
                    className={`flex-1 py-3.5 text-sm font-black uppercase tracking-widest rounded-2xl text-white shadow-lg transition-all ${editingBatchId ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'}`}
                  >
                    {editingBatchId ? 'Update' : 'Create'}
                  </motion.button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Scroll Top / Scroll Down Button */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleScrollAction}
            className="fixed bottom-6 right-6 z-[9999] p-4 rounded-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 shadow-2xl flex items-center justify-center transition-all hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
            title={scrollTop > 150 ? "Scroll to Top" : "Scroll Down"}
          >
            {scrollTop > 150 ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <ArrowDown size={20} strokeWidth={3} />
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}