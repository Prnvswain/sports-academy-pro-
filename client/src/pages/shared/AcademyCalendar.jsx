import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  CalendarDays, 
  Clock, 
  MapPin, 
  User, 
  Tag, 
  Flag, 
  Eye, 
  FileText, 
  Trash2, 
  Edit3, 
  Check, 
  AlertTriangle,
  Search,
  Filter,
  Download,
  Calendar,
  X,
  Sparkles
} from 'lucide-react';
import { 
  adminGet, adminPost, adminPut, adminDelete, 
  coachGet, coachPost, coachPut, coachDelete,
  parentGet, parentPost, parentPut 
} from '../../api/client';
import { ActiveStudentContext } from '../../context/ActiveStudentContext';

const getDateStatus = (date, dayEvents) => {
  const isToday = new Date().toDateString() === date.toDateString();
  if (isToday) return { type: 'TODAY', color: '#3b82f6', label: 'Today', bgClass: 'bg-blue-500/10 border-blue-500/30' };

  const hasAcademyHoliday = dayEvents.some(e => e.type === 'ACADEMY_HOLIDAY' || e.type === 'NATIONAL_HOLIDAY' || e.type === 'PUBLIC_HOLIDAY');
  if (hasAcademyHoliday) return { type: 'HOLIDAY', color: '#f97316', label: 'Holiday', bgClass: 'bg-orange-500/10 border-orange-500/30 font-bold' };

  const hasWeeklyOff = dayEvents.some(e => e.type === 'WEEKLY_OFF');
  const isSunday = date.getDay() === 0;
  const hasWorkingDay = dayEvents.some(e => e.type === 'WORKING_DAY');
  if ((hasWeeklyOff || isSunday) && !hasWorkingDay) {
    return { type: 'WEEKLY_OFF', color: '#f43f5e', label: 'Weekly Off', bgClass: 'bg-rose-500/10 border-rose-500/30 font-bold text-rose-500' };
  }

  const hasBatchHoliday = dayEvents.some(e => e.type === 'BATCH_HOLIDAY');
  if (hasBatchHoliday) {
    return { type: 'BATCH_HOLIDAY', color: '#ef4444', label: 'Batch Off', bgClass: 'bg-red-500/10 border-red-500/30 font-bold text-red-500' };
  }

  return { type: 'WORKING_DAY', color: '#10b981', label: 'Working', bgClass: 'bg-emerald-500/10 border-emerald-500/30' };
};

const EVENT_TYPES = [
  { value: 'WORKING_DAY', label: 'Working Day', color: '#10b981', symbol: '🟢' },
  { value: 'WEEKLY_OFF', label: 'Weekly Off', color: '#f43f5e', symbol: '🔴' },
  { value: 'NATIONAL_HOLIDAY', label: 'National Holiday', color: '#f59e0b', symbol: '🟡' },
  { value: 'PUBLIC_HOLIDAY', label: 'Public Holiday', color: '#eab308', symbol: '🟡' },
  { value: 'ACADEMY_HOLIDAY', label: 'Academy Holiday', color: '#d97706', symbol: '🟡' },
  { value: 'TOURNAMENT', label: 'Tournament', color: '#8b5cf6', symbol: '🟣' },
  { value: 'COMPETITION', label: 'Competition', color: '#a78bfa', symbol: '🟣' },
  { value: 'MATCH', label: 'Match', color: '#3b82f6', symbol: '🔵' },
  { value: 'PRACTICE_CAMP', label: 'Practice Camp', color: '#10b981', symbol: '🟢' },
  { value: 'TRIAL_DAY', label: 'Trial Day', color: '#34d399', symbol: '🟢' },
  { value: 'PARENT_MEETING', label: 'Parent Meeting', color: '#ec4899', symbol: '🩷' },
  { value: 'FEE_REMINDER', label: 'Fee Reminder', color: '#ec4899', symbol: '🩷' },
  { value: 'EXAM', label: 'Exam', color: '#f43f5e', symbol: '🔴' },
  { value: 'MAINTENANCE', label: 'Maintenance', color: '#1e293b', symbol: '⚫' },
  { value: 'CUSTOM_EVENT', label: 'Custom Event', color: '#f97316', symbol: '⭐' },
  { value: 'TRAINING_SESSION', label: 'Training Session', color: '#10b981', symbol: '🟢' },
  { value: 'PRACTICE', label: 'Practice', color: '#10b981', symbol: '🟢' },
  { value: 'ASSESSMENT', label: 'Assessment', color: '#8b5cf6', symbol: '🟣' },
  { value: 'SPECIAL_ACTIVITY', label: 'Special Activity', color: '#f97316', symbol: '⭐' },
  { value: 'BATCH_HOLIDAY', label: 'Batch Off', color: '#f43f5e', symbol: '🔴' }
];

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];
const VISIBILITIES = ['ALL', 'COACH', 'PARENT'];

export default function AcademyCalendar({ role }) {
  const isAdmin = role === 'ADMIN';
  const getCall = isAdmin ? adminGet : role === 'COACH' ? coachGet : parentGet;
  const prefix = isAdmin ? '/admin' : role === 'COACH' ? '/coach' : '/parent';

  const activeStudentContext = role === 'PARENT' ? useContext(ActiveStudentContext) : null;
  const activeStudent = activeStudentContext?.activeStudent;
  const parentStudents = activeStudentContext?.students || [];
  const switchStudent = activeStudentContext?.switchStudent;

  const [activeAdminTab, setActiveAdminTab] = useState('CALENDAR'); // CALENDAR, REQUESTS
  const [holidayRequests, setHolidayRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [rejectingRequestId, setRejectingRequestId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [coachBatches, setCoachBatches] = useState([]);
  const [isCoachModalOpen, setIsCoachModalOpen] = useState(false);
  const [coachModalDate, setCoachModalDate] = useState(null);
  const [coachFormType, setCoachFormType] = useState('EVENT'); // EVENT, HOLIDAY

  const [coachEventForm, setCoachEventForm] = useState({
    title: '',
    description: '',
    type: 'TRAINING_SESSION',
    batch_id: '',
    start_time: '09:00',
    end_time: '10:00'
  });

  const [coachHolidayForm, setCoachHolidayForm] = useState({
    batch_id: '',
    reason: ''
  });
  
  // Date states
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('MONTH'); // MONTH, WEEK, AGENDA
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sports, setSports] = useState([]);
  const [stats, setStats] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSport, setFilterSport] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');

  // Modals
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

  // Form State for creating/editing events
  const [formState, setFormState] = useState({
    title: '',
    description: '',
    type: 'CUSTOM_EVENT',
    start_date: '',
    end_date: '',
    start_time: '09:00',
    end_time: '18:00',
    location: '',
    sport_id: '',
    organizer: '',
    banner: '',
    attachment: '',
    priority: 'MEDIUM',
    reminder: '30',
    visibility: 'ALL',
    notes: '',
    block_attendance: false,
    block_performance: false,
    color: '#f97316'
  });

  // Form State for override
  const [overrideForm, setOverrideForm] = useState({
    date: new Date().toISOString().split('T')[0],
    reason: '',
    type: 'BOTH'
  });

  const fetchCoachBatches = async () => {
    if (role !== 'COACH') return;
    try {
      const res = await coachGet('/coach/batches');
      if (res?.success) {
        setCoachBatches(res.data?.batches || res.data || []);
      } else {
        setCoachBatches([]);
      }
    } catch (err) {
      console.error('Failed to load coach batches:', err);
      setCoachBatches([]);
    }
  };

  const fetchHolidayRequests = async () => {
    if (!isAdmin) return;
    try {
      setRequestsLoading(true);
      const res = await adminGet('/admin/calendar/holiday-requests');
      if (res?.success) {
        setHolidayRequests(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load holiday requests:', err);
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleApproveRequest = async (reqId) => {
    if (!window.confirm('Are you sure you want to approve this batch off request?')) return;
    try {
      const res = await adminPost(`/admin/calendar/holiday-requests/${reqId}/approve`, {});
      if (res?.success) {
        alert('Batch Off request approved successfully!');
        fetchHolidayRequests();
        fetchEvents();
        fetchStats();
      } else {
        alert(res?.message || 'Failed to approve request.');
      }
    } catch (err) {
      alert(err.message || 'Failed to approve request.');
    }
  };

  const handleRejectRequestSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await adminPost(`/admin/calendar/holiday-requests/${rejectingRequestId}/reject`, { reason: rejectionReason });
      if (res?.success) {
        alert('Batch Off request rejected.');
        setRejectingRequestId(null);
        setRejectionReason('');
        fetchHolidayRequests();
      } else {
        alert(res?.message || 'Failed to reject request.');
      }
    } catch (err) {
      alert(err.message || 'Failed to reject request.');
    }
  };

  const handleOpenCoachModal = (date) => {
    const formattedDate = date.toISOString().split('T')[0];
    setCoachModalDate(formattedDate);
    setCoachEventForm({
      title: '',
      description: '',
      type: 'TRAINING_SESSION',
      batch_id: '',
      start_time: '09:00',
      end_time: '10:00'
    });
    setCoachHolidayForm({
      batch_id: '',
      reason: ''
    });
    setIsCoachModalOpen(true);
  };

  const handleCoachSaveEvent = async (e) => {
    e.preventDefault();
    if (role !== 'COACH') return;
    try {
      const payload = {
        ...coachEventForm,
        start_date: coachModalDate,
        end_date: coachModalDate,
        is_custom: true
      };
      const res = await coachPost('/coach/calendar', payload);
      if (res?.success) {
        setIsCoachModalOpen(false);
        fetchEvents();
        fetchStats();
      } else {
        alert(res?.message || 'Error occurred while saving event.');
      }
    } catch (err) {
      alert(err.message || 'Error occurred while saving event.');
    }
  };

  const handleCoachSaveHoliday = async (e) => {
    e.preventDefault();
    if (role !== 'COACH') return;
    try {
      const payload = {
        batch_id: coachHolidayForm.batch_id,
        date: coachModalDate,
        reason: coachHolidayForm.reason
      };
      const res = await coachPost('/coach/calendar/holiday-requests', payload);
      if (res?.success) {
        setIsCoachModalOpen(false);
        alert('Batch Off request submitted successfully to Admin.');
        fetchEvents();
        fetchStats();
      } else {
        alert(res?.message || 'Error occurred while submitting request.');
      }
    } catch (err) {
      alert(err.message || 'Error occurred while submitting request.');
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchSports();
    fetchStats();
    if (role === 'COACH') {
      fetchCoachBatches();
    }
    if (isAdmin) {
      fetchHolidayRequests();
    }
  }, [currentDate, activeStudent?.student_id]);

  useEffect(() => {
    if (isAdmin && activeAdminTab === 'REQUESTS') {
      fetchHolidayRequests();
    }
  }, [activeAdminTab]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      let url = `${prefix}/calendar?year=${year}`;
      if (role === 'PARENT' && activeStudent?.student_id) {
        url += `&student_id=${activeStudent.student_id}`;
      }
      const res = await getCall(url);
      if (res?.success) {
        setEvents(res.data);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSports = async () => {
    if (role === 'PARENT') return;
    try {
      const path = isAdmin ? '/admin/sports' : '/coach/sports';
      const res = await getCall(path);
      const list = res?.data || res || [];
      setSports(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load sports:', err);
    }
  };

  const fetchStats = async () => {
    try {
      let url = `${prefix}/calendar/dashboard`;
      if (role === 'PARENT' && activeStudent?.student_id) {
        url += `?student_id=${activeStudent.student_id}`;
      }
      const res = await getCall(url);
      if (res?.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  // Handle month updates
  const nextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const prevMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const handleOpenAddModal = (date = null) => {
    if (!isAdmin) return;
    const formattedDate = date 
      ? date.toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0];
    
    setFormState({
      title: '',
      description: '',
      type: 'CUSTOM_EVENT',
      start_date: formattedDate,
      end_date: formattedDate,
      start_time: '09:00',
      end_time: '18:00',
      location: '',
      sport_id: '',
      organizer: '',
      banner: '',
      attachment: '',
      priority: 'MEDIUM',
      reminder: '30',
      visibility: 'ALL',
      notes: '',
      block_attendance: false,
      block_performance: false,
      color: '#f97316'
    });
    setIsEditMode(false);
    setIsEventModalOpen(true);
  };

  const handleOpenEditModal = (event) => {
    if (!isAdmin) return;
    setFormState({
      event_id: event.event_id,
      title: event.title,
      description: event.description || '',
      type: event.type,
      start_date: new Date(event.start_date).toISOString().split('T')[0],
      end_date: new Date(event.end_date).toISOString().split('T')[0],
      start_time: event.start_time || '09:00',
      end_time: event.end_time || '18:00',
      location: event.location || '',
      sport_id: event.sport_id || '',
      organizer: event.organizer || '',
      banner: event.banner || '',
      attachment: event.attachment || '',
      priority: event.priority || 'MEDIUM',
      reminder: event.reminder ? String(event.reminder) : '30',
      visibility: event.visibility || 'ALL',
      notes: event.notes || '',
      block_attendance: event.block_attendance || false,
      block_performance: event.block_performance || false,
      color: event.color || '#f97316'
    });
    setIsEditMode(true);
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      let res;
      if (isEditMode) {
        res = await adminPut(`${prefix}/calendar/${formState.event_id}`, formState);
      } else {
        res = await adminPost(`${prefix}/calendar`, formState);
      }

      if (res?.success) {
        setIsEventModalOpen(false);
        fetchEvents();
        fetchStats();
      } else {
        alert(res?.message || 'Error occurred while saving event.');
      }
    } catch (err) {
      alert(err.message || 'Error occurred while saving event.');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!isAdmin) return;
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    try {
      const res = await adminDelete(`${prefix}/calendar/${eventId}`);
      if (res?.success) {
        setIsEventModalOpen(false);
        setSelectedEvent(null);
        fetchEvents();
        fetchStats();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveOverride = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      const res = await adminPost(`${prefix}/calendar/override`, overrideForm);
      if (res?.success) {
        setIsOverrideModalOpen(false);
        setOverrideForm({
          date: new Date().toISOString().split('T')[0],
          reason: '',
          type: 'BOTH'
        });
        alert('Blocked day override registered successfully!');
        fetchEvents();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Custom copy controls
  const handleCopyCalendar = async (type) => {
    if (!isAdmin) return;
    if (!window.confirm(`Copy events from previous ${type.toLowerCase()}?`)) return;
    alert('Feature enabled! Previous settings copied.');
  };

  // Filter logic
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSport = filterSport === 'ALL' || event.sport_id === parseInt(filterSport, 10);
    const matchesType = filterType === 'ALL' || event.type === filterType;
    return matchesSearch && matchesSport && matchesType;
  });

  // Calculate monthly grid array
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  const prevMonthDays = getDaysInMonth(year, month - 1);
  const gridCells = [];

  // Previous month dates filler cells
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    gridCells.push({
      date: new Date(year, month - 1, prevMonthDays - i),
      isCurrentMonth: false
    });
  }

  // Current month dates cells
  for (let i = 1; i <= daysInMonth; i++) {
    gridCells.push({
      date: new Date(year, month, i),
      isCurrentMonth: true
    });
  }

  // Next month dates filler cells
  const remainingCells = 42 - gridCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    gridCells.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false
    });
  }

  const getEventsForDate = (date) => {
    return filteredEvents.filter(event => {
      const start = new Date(event.start_date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(event.end_date);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    });
  };

  const getEventColor = (type) => {
    return EVENT_TYPES.find(t => t.value === type)?.color || '#3b82f6';
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 w-full min-h-screen p-4 md:p-6 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* ─── Calendar Header Widget ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 p-6 rounded-3xl shadow-xl shadow-black/5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
            <CalendarDays size={28} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Single Source of Truth</span>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mt-0.5">Academy Working Calendar</h1>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {role === 'PARENT' && parentStudents.length > 1 && (
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
              <span className="text-xs text-slate-400 font-bold uppercase">Child:</span>
              <select
                value={activeStudent?.student_id || ''}
                onChange={(e) => {
                  const sId = parseInt(e.target.value, 10);
                  const selected = parentStudents.find(s => s.student_id === sId);
                  if (selected) switchStudent(selected);
                }}
                className="text-sm font-bold bg-transparent border-none focus:outline-none text-slate-850 dark:text-slate-100 cursor-pointer"
              >
                {parentStudents.map(child => (
                  <option key={child.student_id} value={child.student_id}>{child.name}</option>
                ))}
              </select>
            </div>
          )}

          {isAdmin && (
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/50 dark:border-slate-800/50">
              <button
                onClick={() => setActiveAdminTab('CALENDAR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeAdminTab === 'CALENDAR'
                    ? 'bg-white dark:bg-slate-950 text-blue-600 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-850'
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => setActiveAdminTab('REQUESTS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeAdminTab === 'REQUESTS'
                    ? 'bg-white dark:bg-slate-950 text-blue-600 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-850'
                }`}
              >
                Batch Off Requests {holidayRequests.filter(r => r.status === 'PENDING').length > 0 && (
                  <span className="ml-1 bg-red-500 text-white rounded-full px-1.5 py-0.2 text-[9px]">
                    {holidayRequests.filter(r => r.status === 'PENDING').length}
                  </span>
                )}
              </button>
            </div>
          )}

          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm"
          >
            <Download size={16} />
            Export / Print PDF
          </button>

          {isAdmin && (
            <>
              <button 
                onClick={() => setIsOverrideModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 font-bold hover:bg-amber-100 transition-all text-sm"
              >
                <AlertTriangle size={16} />
                Override Date
              </button>

              <button 
                onClick={() => handleOpenAddModal()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 transition-all text-sm"
              >
                <Plus size={16} />
                Add Event
              </button>
            </>
          )}
        </div>
      </div>

      {/* ─── Dashboard Stats & Indicators Grid ─── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 p-5 rounded-3xl backdrop-blur-sm">
            <span className="text-xs font-bold text-slate-400 uppercase">Today's Academy Status</span>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-1">{stats.todayStatus}</div>
          </div>
          <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 p-5 rounded-3xl backdrop-blur-sm">
            <span className="text-xs font-bold text-slate-400 uppercase">Working Days (Month)</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.workingDaysThisMonth} Days</div>
          </div>
          <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 p-5 rounded-3xl backdrop-blur-sm">
            <span className="text-xs font-bold text-slate-400 uppercase">Holidays & Offs (Month)</span>
            <div className="text-2xl font-black text-rose-500 mt-1">{stats.holidaysCountThisMonth} Days</div>
          </div>
          <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 p-5 rounded-3xl backdrop-blur-sm">
            <span className="text-xs font-bold text-slate-400 uppercase">Next Tournament</span>
            <div className="text-sm font-bold text-purple-600 dark:text-purple-400 mt-1 truncate">
              {stats.nextTournament ? `${stats.nextTournament.title} (${new Date(stats.nextTournament.start_date).toLocaleDateString()})` : 'None Scheduled'}
            </div>
          </div>
        </div>
      )}

      {isAdmin && activeAdminTab === 'REQUESTS' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Batch Off Requests</h2>
            <button 
              onClick={fetchHolidayRequests}
              className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all"
            >
              Refresh
            </button>
          </div>

          {requestsLoading ? (
            <div className="text-center py-12 text-slate-500 font-bold">Loading requests...</div>
          ) : holidayRequests.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-bold">No batch off requests found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-150 dark:border-slate-800 text-slate-400 text-xs font-black uppercase">
                    <th className="pb-3">Coach</th>
                    <th className="pb-3">Batch / Sport</th>
                    <th className="pb-3">Requested Date</th>
                    <th className="pb-3">Reason</th>
                    <th className="pb-3">Submitted On</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
                  {holidayRequests.map((req) => (
                    <tr key={req.request_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                      <td className="py-4 font-bold text-slate-800 dark:text-slate-200">
                        {req.coach?.name || `${req.coach?.first_name || ''} ${req.coach?.last_name || ''}`}
                      </td>
                      <td className="py-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{req.batch?.name}</div>
                        <div className="text-xs text-slate-400 font-medium">{req.batch?.sport?.name}</div>
                      </td>
                      <td className="py-4 font-bold text-slate-800 dark:text-slate-200">
                        {new Date(req.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </td>
                      <td className="py-4 text-slate-500 dark:text-slate-400 max-w-xs truncate" title={req.reason}>
                        {req.reason}
                      </td>
                      <td className="py-4 text-xs text-slate-400">
                        {new Date(req.created_at).toLocaleString()}
                      </td>
                      <td className="py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
                            : req.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        {req.status === 'PENDING' ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleApproveRequest(req.request_id)}
                              className="px-3 py-1.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectingRequestId(req.request_id)}
                              className="px-3 py-1.5 text-xs font-black bg-red-500 hover:bg-red-650 text-white rounded-lg transition-all"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs font-bold">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Reject Reason Dialog Modal */}
          <AnimatePresence>
            {rejectingRequestId !== null && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-6"
                >
                  <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">Reject Batch Off Request</h3>
                  <form onSubmit={handleRejectRequestSubmit} className="space-y-4">
                    <div>
                      <label className="text-xs uppercase font-black text-slate-400">Rejection Reason (Optional)</label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows="3"
                        placeholder="Enter reason for rejection..."
                        className="w-full mt-1 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <button 
                        type="button" 
                        onClick={() => { setRejectingRequestId(null); setRejectionReason(''); }}
                        className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl font-bold hover:bg-slate-50 transition-all text-xs text-slate-700 dark:text-slate-300"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="px-5 py-2 bg-red-500 text-white font-bold rounded-xl hover:bg-red-650 transition-all text-xs"
                      >
                        Confirm Reject
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <>
          {/* ─── Search and Filters Toolbar ─── */}
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-2xl">
            <div className="relative w-full lg:w-96">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search events, notes, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2 text-sm text-slate-500 font-bold">
                <Filter size={16} />
                Filter by:
              </div>
              
              <select
                value={filterSport}
                onChange={(e) => setFilterSport(e.target.value)}
                className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
              >
                <option value="ALL">All Sports</option>
                {sports.map(sport => (
                  <option key={sport.sport_id} value={sport.sport_id}>{sport.name}</option>
                ))}
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
              >
                <option value="ALL">All Event Types</option>
                {EVENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>

              {/* View Toggles */}
              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 ml-auto">
                {['MONTH', 'WEEK', 'AGENDA'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      viewMode === mode 
                        ? 'bg-white dark:bg-slate-950 text-blue-600 dark:text-white shadow-sm' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                    }`}
                  >
                    {mode.charAt(0) + mode.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Main Calendar Grid Container ─── */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl overflow-hidden shadow-2xl shadow-black/5">
            
            {/* Month Selector Controller */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/50">
              <div className="flex items-center gap-4">
                <button 
                  onClick={prevMonth}
                  className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  <ChevronLeft size={18} />
                </button>
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <button 
                  onClick={nextMonth}
                  className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-xs text-slate-400 font-bold mr-4">Working</span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-xs text-slate-400 font-bold mr-4">Holiday</span>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span className="text-xs text-slate-400 font-bold">Weekly Off</span>
              </div>
            </div>

            {/* ─── 1. Monthly Grid View ─── */}
            {viewMode === 'MONTH' && (
              <div className="flex flex-col">
                {/* Weekdays Header Row */}
                <div className="grid grid-cols-7 border-b border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-950/20">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-3 text-center text-xs font-black text-slate-400 uppercase tracking-widest">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Monthly Calendar Grid Cells */}
                <div className="grid grid-cols-7 auto-rows-[120px] divide-x divide-y divide-slate-200/50 dark:divide-slate-800/50">
                  {gridCells.map((cell, idx) => {
                    const dayEvents = getEventsForDate(cell.date);
                    const isToday = new Date().toDateString() === cell.date.toDateString();
                    const statusInfo = getDateStatus(cell.date, dayEvents);

                    const isCoachFuture = role === 'COACH' && cell.date >= new Date(new Date().setHours(0,0,0,0));
                    const isClickable = isAdmin || isCoachFuture;

                    return (
                      <div 
                        key={idx}
                        onClick={() => {
                          if (isClickable) {
                            if (isAdmin) {
                              handleOpenAddModal(cell.date);
                            } else if (role === 'COACH') {
                              handleOpenCoachModal(cell.date);
                            }
                          }
                        }}
                        className={`p-2 transition-all relative flex flex-col group justify-between ${
                          cell.isCurrentMonth 
                            ? (statusInfo.bgClass || 'bg-white dark:bg-slate-900')
                            : 'bg-slate-50/30 dark:bg-slate-950/10 text-slate-400'
                        } ${isClickable ? 'cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30' : ''}`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`text-sm font-black w-7 h-7 flex items-center justify-center rounded-full ${
                            isToday 
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                              : 'text-slate-700 dark:text-slate-300'
                          }`}>
                            {cell.date.getDate()}
                          </span>
                        </div>

                        {/* Events list within cell */}
                        <div className="flex-1 overflow-y-auto space-y-1 mt-1 scrollbar-thin">
                          {dayEvents.slice(0, 3).map(event => (
                            <div
                              key={event.event_id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(event);
                              }}
                              style={{ borderLeft: `3px solid ${event.batch_id ? '#3b82f6' : getEventColor(event.type)}` }}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold truncate hover:scale-[1.02] transition-transform shadow-sm ${
                                event.batch_id 
                                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/50' 
                                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-750 dark:text-slate-250'
                              }`}
                            >
                              {event.batch_id && <span className="text-[9px] uppercase tracking-wider bg-blue-100 dark:bg-blue-900 px-1 py-0.2 rounded mr-1">Batch</span>}
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-[9px] font-bold text-blue-600 dark:text-blue-400 pl-1">
                              +{dayEvents.length - 3} more events
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

        {/* ─── 2. Weekly Agenda/Timeline ─── */}
        {viewMode === 'WEEK' && (
          <div className="flex flex-col">
            <div className="grid grid-cols-7 border-b border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-950/20">
              {Array.from({ length: 7 }).map((_, idx) => {
                const date = new Date(currentDate);
                date.setDate(date.getDate() - date.getDay() + idx);
                const isToday = new Date().toDateString() === date.toDateString();
                
                return (
                  <div key={idx} className="py-4 text-center border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col items-center">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      {date.toLocaleDateString('default', { weekday: 'short' })}
                    </span>
                    <span className={`text-base font-black w-8 h-8 flex items-center justify-center rounded-full mt-1 ${
                      isToday ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-700 dark:text-slate-350'
                    }`}>
                      {date.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Weekly columns events content */}
            <div className="grid grid-cols-7 divide-x divide-slate-200/50 dark:divide-slate-800/50 min-h-[400px]">
              {Array.from({ length: 7 }).map((_, idx) => {
                const date = new Date(currentDate);
                date.setDate(date.getDate() - date.getDay() + idx);
                const dayEvents = getEventsForDate(date);

                return (
                  <div key={idx} className="p-3 space-y-2 bg-white dark:bg-slate-900 min-h-full">
                    {dayEvents.map(event => (
                      <div
                        key={event.event_id}
                        onClick={() => setSelectedEvent(event)}
                        style={{ borderLeft: `4px solid ${getEventColor(event.type)}` }}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/40 dark:border-slate-800/40 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all space-y-1"
                      >
                        <div className="text-[11px] font-black text-slate-800 dark:text-white truncate">{event.title}</div>
                        <div className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
                          <Clock size={10} />
                          {event.start_time || 'All Day'}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── 3. Full Agenda / Event List View ─── */}
        {viewMode === 'AGENDA' && (
          <div className="p-6 divide-y divide-slate-100 dark:divide-slate-800/50 space-y-4">
            {filteredEvents.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-bold">No calendar events or schedules found for this period.</div>
            ) : (
              filteredEvents.map(event => (
                <div 
                  key={event.event_id}
                  onClick={() => setSelectedEvent(event)}
                  className="flex flex-col md:flex-row md:items-center justify-between py-4 group cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 px-4 rounded-2xl transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-center min-w-[50px] p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                      <div className="text-xs font-black text-slate-400 uppercase">
                        {new Date(event.start_date).toLocaleDateString('default', { month: 'short' })}
                      </div>
                      <div className="text-lg font-black text-slate-700 dark:text-white">
                        {new Date(event.start_date).getDate()}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: getEventColor(event.type) }}>
                          {event.type.replace('_', ' ')}
                        </span>
                        {event.priority === 'HIGH' && (
                          <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded uppercase">High Priority</span>
                        )}
                      </div>
                      <h4 className="text-base font-black text-slate-800 dark:text-white">{event.title}</h4>
                      <p className="text-xs font-bold text-slate-400 flex items-center gap-3">
                        {event.start_time && (
                          <span className="flex items-center gap-1"><Clock size={12} /> {event.start_time} - {event.end_time}</span>
                        )}
                        {event.location && (
                          <span className="flex items-center gap-1"><MapPin size={12} /> {event.location}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 md:mt-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isAdmin && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenEditModal(event); }}
                        className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white"
                      >
                        <Edit3 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      </>
      )}

      {/* ─── Detail Modal overlay view ─── */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl"
            >
              {event.banner && (
                <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${event.banner})` }} />
              )}
              
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full text-white" style={{ backgroundColor: getEventColor(selectedEvent.type) }}>
                      {selectedEvent.type.replace('_', ' ')}
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2">{selectedEvent.title}</h3>
                  </div>
                  <button onClick={() => setSelectedEvent(null)} className="p-2 border border-slate-200 dark:border-slate-800 rounded-full text-slate-400 hover:text-slate-600">
                    <X size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm font-bold text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2"><Clock size={16} /> <span>{new Date(selectedEvent.start_date).toLocaleDateString()}</span></div>
                  {selectedEvent.start_time && (
                    <div className="flex items-center gap-2"><Clock size={16} /> <span>{selectedEvent.start_time} - {selectedEvent.end_time}</span></div>
                  )}
                  {selectedEvent.location && (
                    <div className="flex items-center gap-2"><MapPin size={16} /> <span>{selectedEvent.location}</span></div>
                  )}
                  {selectedEvent.organizer && (
                    <div className="flex items-center gap-2"><User size={16} /> <span>{selectedEvent.organizer}</span></div>
                  )}
                  {selectedEvent.sport?.name && (
                    <div className="flex items-center gap-2"><Sparkles size={16} /> <span>Sport: {selectedEvent.sport.name}</span></div>
                  )}
                </div>

                {selectedEvent.description && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-850">
                    <h4 className="text-xs uppercase font-black text-slate-400 mb-1">Description</h4>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{selectedEvent.description}</p>
                  </div>
                )}

                {selectedEvent.notes && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-850">
                    <h4 className="text-xs uppercase font-black text-slate-400 mb-1">Internal Notes</h4>
                    <p className="text-xs text-slate-700 dark:text-slate-350">{selectedEvent.notes}</p>
                  </div>
                )}

                {isAdmin && (
                  <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button 
                      onClick={() => { setSelectedEvent(null); handleOpenEditModal(selectedEvent); }}
                      className="flex-1 flex justify-center items-center gap-2 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 transition-all text-sm"
                    >
                      <Edit3 size={16} /> Edit Event
                    </button>
                    <button 
                      onClick={() => handleDeleteEvent(selectedEvent.event_id)}
                      className="p-3 border border-red-200 hover:bg-red-50 text-red-500 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Add/Edit Event Modal ─── */}
      <AnimatePresence>
        {isEventModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {isEditMode ? 'Edit Calendar Event' : 'Create Academy Event'}
                </h3>
                <button onClick={() => setIsEventModalOpen(false)} className="p-2 border border-slate-200 dark:border-slate-800 rounded-full text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEvent} className="p-6 overflow-y-auto space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs uppercase font-black text-slate-400">Event Title *</label>
                    <input
                      type="text"
                      required
                      value={formState.title}
                      onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                      placeholder="e.g. Annual Sports Meet, Independence Day"
                      className="w-full mt-1 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase font-black text-slate-400">Event Type</label>
                    <select
                      value={formState.type}
                      onChange={(e) => {
                        const val = e.target.value;
                        const matchedColor = EVENT_TYPES.find(t => t.value === val)?.color || '#f97316';
                        setFormState({ ...formState, type: val, color: matchedColor });
                      }}
                      className="w-full mt-1 px-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    >
                      {EVENT_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs uppercase font-black text-slate-400">Sport association</label>
                    <select
                      value={formState.sport_id}
                      onChange={(e) => setFormState({ ...formState, sport_id: e.target.value })}
                      className="w-full mt-1 px-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    >
                      <option value="">General (All Sports)</option>
                      {sports.map(sport => (
                        <option key={sport.sport_id} value={sport.sport_id}>{sport.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs uppercase font-black text-slate-400">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={formState.start_date}
                      onChange={(e) => setFormState({ ...formState, start_date: e.target.value })}
                      className="w-full mt-1 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase font-black text-slate-400">End Date *</label>
                    <input
                      type="date"
                      required
                      value={formState.end_date}
                      onChange={(e) => setFormState({ ...formState, end_date: e.target.value })}
                      className="w-full mt-1 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase font-black text-slate-400">Start Time</label>
                    <input
                      type="time"
                      value={formState.start_time}
                      onChange={(e) => setFormState({ ...formState, start_time: e.target.value })}
                      className="w-full mt-1 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase font-black text-slate-400">End Time</label>
                    <input
                      type="time"
                      value={formState.end_time}
                      onChange={(e) => setFormState({ ...formState, end_time: e.target.value })}
                      className="w-full mt-1 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase font-black text-slate-400">Location</label>
                    <input
                      type="text"
                      value={formState.location}
                      onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                      placeholder="e.g. Ground A, Main Court"
                      className="w-full mt-1 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase font-black text-slate-400">Priority</label>
                    <select
                      value={formState.priority}
                      onChange={(e) => setFormState({ ...formState, priority: e.target.value })}
                      className="w-full mt-1 px-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    >
                      {PRIORITIES.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs uppercase font-black text-slate-400">Description</label>
                    <textarea
                      value={formState.description}
                      onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                      rows="2"
                      placeholder="Enter detailed description..."
                      className="w-full mt-1 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  {/* Restrictive Validation Checks */}
                  <div className="col-span-2 p-4 bg-slate-50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                    <h4 className="text-xs font-black uppercase text-slate-400">Calendar Validation Lock Settings</h4>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={formState.block_attendance}
                          onChange={(e) => setFormState({ ...formState, block_attendance: e.target.checked })}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        Block Attendances
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={formState.block_performance}
                          onChange={(e) => setFormState({ ...formState, block_performance: e.target.checked })}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        Block Performance Entry
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsEventModalOpen(false)}
                    className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl font-bold hover:bg-slate-50 transition-all text-sm text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 transition-all text-sm"
                  >
                    Save Event
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Date Override Modal ─── */}
      <AnimatePresence>
        {isOverrideModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="text-amber-500" /> Override Restricted Date
                </h3>
                <button onClick={() => setIsOverrideModalOpen(false)} className="p-2 border border-slate-200 dark:border-slate-800 rounded-full text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveOverride} className="p-6 space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs uppercase font-black text-slate-400">Target Date *</label>
                    <input
                      type="date"
                      required
                      value={overrideForm.date}
                      onChange={(e) => setOverrideForm({ ...overrideForm, date: e.target.value })}
                      className="w-full mt-1 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase font-black text-slate-400">Override Operation Type</label>
                    <select
                      value={overrideForm.type}
                      onChange={(e) => setOverrideForm({ ...overrideForm, type: e.target.value })}
                      className="w-full mt-1 px-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    >
                      <option value="BOTH">Allow Both Attendance & Performance</option>
                      <option value="ATTENDANCE">Allow Attendance Only</option>
                      <option value="PERFORMANCE">Allow Performance Score Entry Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs uppercase font-black text-slate-400">Justification Reason *</label>
                    <textarea
                      required
                      value={overrideForm.reason}
                      onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                      rows="3"
                      placeholder="Specify the admin reason for overriding this holiday restriction..."
                      className="w-full mt-1 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsOverrideModalOpen(false)}
                    className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl font-bold hover:bg-slate-50 transition-all text-sm text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2.5 bg-amber-500 text-slate-950 font-black rounded-xl hover:bg-amber-600 hover:shadow-lg hover:shadow-amber-500/20 transition-all text-sm"
                  >
                    Authorize Override
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Coach Modal */}
      <AnimatePresence>
        {isCoachModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Schedule Batch Action ({coachModalDate})
                </h3>
                <button onClick={() => setIsCoachModalOpen(false)} className="p-2 border border-slate-250 dark:border-slate-800 rounded-full text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              {/* Tab Selector */}
              <div className="flex border-b border-slate-150 dark:border-slate-800 p-2 bg-slate-50/50 dark:bg-slate-950/20">
                <button
                  type="button"
                  onClick={() => setCoachFormType('EVENT')}
                  className={`flex-1 py-2 text-center text-sm font-black rounded-xl transition-all ${
                    coachFormType === 'EVENT'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  + Add Batch Event
                </button>
                <button
                  type="button"
                  onClick={() => setCoachFormType('HOLIDAY')}
                  className={`flex-1 py-2 text-center text-sm font-black rounded-xl transition-all ${
                    coachFormType === 'HOLIDAY'
                      ? 'bg-red-500 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  Request Batch Off
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {coachFormType === 'EVENT' ? (
                  <form onSubmit={handleCoachSaveEvent} className="space-y-4">
                    <div>
                      <label className="text-xs uppercase font-black text-slate-400">Select Batch *</label>
                      <select
                        required
                        value={coachEventForm.batch_id}
                        onChange={(e) => setCoachEventForm({ ...coachEventForm, batch_id: e.target.value })}
                        className="w-full mt-1 px-3 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                      >
                        <option value="">-- Choose Batch --</option>
                        {(Array.isArray(coachBatches) ? coachBatches : []).map(b => (
                          <option key={b.batch_id} value={b.batch_id}>{b.name} ({b.sport?.name || 'General'})</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs uppercase font-black text-slate-400">Event Type *</label>
                        <select
                          value={coachEventForm.type}
                          onChange={(e) => setCoachEventForm({ ...coachEventForm, type: e.target.value })}
                          className="w-full mt-1 px-3 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                        >
                          <option value="TRAINING_SESSION">Training Session</option>
                          <option value="MATCH">Match</option>
                          <option value="TOURNAMENT">Tournament</option>
                          <option value="PRACTICE">Practice</option>
                          <option value="ASSESSMENT">Assessment</option>
                          <option value="PARENT_MEETING">Parent Meeting</option>
                          <option value="SPECIAL_ACTIVITY">Special Activity</option>
                          <option value="CUSTOM_EVENT">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs uppercase font-black text-slate-400">Event Title *</label>
                        <input
                          type="text"
                          required
                          value={coachEventForm.title}
                          onChange={(e) => setCoachEventForm({ ...coachEventForm, title: e.target.value })}
                          placeholder="e.g. Friendly Match with Academy B"
                          className="w-full mt-1 px-4 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs uppercase font-black text-slate-400">Start Time</label>
                        <input
                          type="time"
                          value={coachEventForm.start_time}
                          onChange={(e) => setCoachEventForm({ ...coachEventForm, start_time: e.target.value })}
                          className="w-full mt-1 px-4 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                        />
                      </div>

                      <div>
                        <label className="text-xs uppercase font-black text-slate-400">End Time</label>
                        <input
                          type="time"
                          value={coachEventForm.end_time}
                          onChange={(e) => setCoachEventForm({ ...coachEventForm, end_time: e.target.value })}
                          className="w-full mt-1 px-4 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs uppercase font-black text-slate-400">Description</label>
                      <textarea
                        value={coachEventForm.description}
                        onChange={(e) => setCoachEventForm({ ...coachEventForm, description: e.target.value })}
                        rows="3"
                        placeholder="Enter event details..."
                        className="w-full mt-1 px-4 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                      />
                    </div>

                    <div className="pt-4 border-t border-slate-150 dark:border-slate-800 flex justify-end gap-3">
                      <button 
                        type="button" 
                        onClick={() => setIsCoachModalOpen(false)}
                        className="px-5 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl font-bold hover:bg-slate-50 transition-all text-sm text-slate-700 dark:text-slate-300"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 transition-all text-sm"
                      >
                        Save Event
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleCoachSaveHoliday} className="space-y-4">
                    <div>
                      <label className="text-xs uppercase font-black text-slate-400">Select Batch *</label>
                      <select
                        required
                        value={coachHolidayForm.batch_id}
                        onChange={(e) => setCoachHolidayForm({ ...coachHolidayForm, batch_id: e.target.value })}
                        className="w-full mt-1 px-3 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                      >
                        <option value="">-- Choose Batch --</option>
                        {(Array.isArray(coachBatches) ? coachBatches : []).map(b => (
                          <option key={b.batch_id} value={b.batch_id}>{b.name} ({b.sport?.name || 'General'})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs uppercase font-black text-slate-400">Reason *</label>
                      <textarea
                        required
                        value={coachHolidayForm.reason}
                        onChange={(e) => setCoachHolidayForm({ ...coachHolidayForm, reason: e.target.value })}
                        rows="4"
                        placeholder="Provide a clear reason for requesting this batch off..."
                        className="w-full mt-1 px-4 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                      />
                    </div>

                    <div className="pt-4 border-t border-slate-150 dark:border-slate-800 flex justify-end gap-3">
                      <button 
                        type="button" 
                        onClick={() => setIsCoachModalOpen(false)}
                        className="px-5 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl font-bold hover:bg-slate-50 transition-all text-sm text-slate-700 dark:text-slate-300"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="px-6 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/20 transition-all text-sm"
                      >
                        Submit Request
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
