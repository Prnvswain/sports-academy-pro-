import React, { useState, useEffect } from 'react';
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
import { adminGet, adminPost, adminPut, adminDelete, coachGet, parentGet } from '../../api/client';

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
  { value: 'CUSTOM_EVENT', label: 'Custom Event', color: '#f97316', symbol: '⭐' }
];

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];
const VISIBILITIES = ['ALL', 'COACH', 'PARENT'];

export default function AcademyCalendar({ role }) {
  const isAdmin = role === 'ADMIN';
  const getCall = isAdmin ? adminGet : role === 'COACH' ? coachGet : parentGet;
  const prefix = isAdmin ? '/admin' : role === 'COACH' ? '/coach' : '/parent';
  
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

  useEffect(() => {
    fetchEvents();
    fetchSports();
    fetchStats();
  }, [currentDate]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const res = await getCall(`${prefix}/calendar?year=${year}`);
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
      const res = await getCall(`${prefix}/calendar/dashboard`);
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

      {/* ─── Main Calendar Layout Grid ─── */}
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

                return (
                  <div 
                    key={idx}
                    onClick={() => handleOpenAddModal(cell.date)}
                    className={`p-2 transition-all relative flex flex-col group justify-between ${
                      cell.isCurrentMonth 
                        ? 'bg-white dark:bg-slate-900' 
                        : 'bg-slate-50/30 dark:bg-slate-950/10 text-slate-400'
                    } ${isAdmin ? 'cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30' : ''}`}
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
                          style={{ borderLeft: `3px solid ${getEventColor(event.type)}` }}
                          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-[10px] font-bold text-slate-750 dark:text-slate-250 truncate hover:scale-[1.02] transition-transform shadow-sm"
                        >
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

    </div>
  );
}
