import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Trash2,
  Copy,
  Calendar,
  AlertCircle,
  Clock,
  MapPin,
  HelpCircle,
  Info,
  Trophy,
  CheckCircle,
  Activity,
  Plus
} from 'lucide-react';
import { adminGet, adminPost, adminPut, adminDelete, coachGet, parentGet } from '../api/client';

const EVENT_TYPES = [
  { value: 'WORKING_DAY', label: 'Working Day', color: '#10b981', icon: '🟢' },
  { value: 'WEEKLY_OFF', label: 'Weekly Off', color: '#f43f5e', icon: '🔴' },
  { value: 'ACADEMY_HOLIDAY', label: 'Academy Holiday', color: '#f97316', icon: '🟠' },
  { value: 'NATIONAL_HOLIDAY', label: 'National Holiday', color: '#f97316', icon: '🟠' },
  { value: 'TOURNAMENT', label: 'Tournament', color: '#f97316', icon: '🏆' },
  { value: 'EVENT', label: 'Event', color: '#f97316', icon: '📅' },
  { value: 'COMPETITION', label: 'Competition', color: '#f97316', icon: '🥇' },
  { value: 'MAINTENANCE', label: 'Maintenance', color: '#f97316', icon: '🔧' },
  { value: 'CUSTOM_EVENT', label: 'Custom Activity', color: '#f97316', icon: '⭐' }
];

export default function AcademyCalendarModal({ isOpen, onClose, role }) {
  if (!isOpen) return null;

  const isAdmin = role === 'ADMIN';
  const getCall = isAdmin ? adminGet : role === 'COACH' ? coachGet : parentGet;
  const postCall = isAdmin ? adminPost : null;
  const putCall = isAdmin ? adminPut : null;
  const deleteCall = isAdmin ? adminDelete : null;
  const prefix = isAdmin ? '/admin' : role === 'COACH' ? '/coach' : '/parent';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weeklyOffRule, setWeeklyOffRule] = useState('SUNDAY');
  const [popoverDate, setPopoverDate] = useState(null); // date string 'YYYY-MM-DD'
  const [popoverEvent, setPopoverEvent] = useState(null); // active event for date
  
  // Inline Popover Form
  const [inlineForm, setInlineForm] = useState({
    title: '',
    description: '',
    type: 'WORKING_DAY'
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await getCall(`${prefix}/calendar?year=${year}`);
      if (res?.success) {
        setEvents(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
    setPopoverDate(null);
  };

  const handleNextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
    setPopoverDate(null);
  };

  const handleCurrentMonth = () => {
    setCurrentDate(new Date());
    setPopoverDate(null);
  };

  // Indian National Holidays list for fallback pre-render
  const indiaHolidays = [
    { title: 'Republic Day', date: `${year}-01-26` },
    { title: 'Independence Day', date: `${year}-08-15` },
    { title: 'Gandhi Jayanti', date: `${year}-10-02` },
    { title: 'Christmas', date: `${year}-12-25` }
  ];

  // Map events to date keys 'YYYY-MM-DD' (local timezone match)
  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach(evt => {
      const dateStr = new Date(evt.start_date).toISOString().split('T')[0];
      map[dateStr] = evt;
    });
    return map;
  }, [events]);

  const getDayStatus = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const isToday = new Date().toDateString() === date.toDateString();
    
    // Check DB Event
    const dbEvent = eventsByDate[dateStr];
    if (dbEvent) {
      return {
        type: dbEvent.type,
        title: dbEvent.title,
        description: dbEvent.description,
        event: dbEvent
      };
    }

    // Default National Holidays
    const nationalHoliday = indiaHolidays.find(h => h.date === dateStr);
    if (nationalHoliday) {
      return {
        type: 'NATIONAL_HOLIDAY',
        title: nationalHoliday.title,
        description: 'Indian National Holiday'
      };
    }

    // Default Sunday Weekly Off
    const dayOfWeek = date.getDay();
    let isWeeklyOff = false;
    if (weeklyOffRule === 'SUNDAY' && dayOfWeek === 0) isWeeklyOff = true;
    else if (weeklyOffRule === 'SATURDAY_SUNDAY' && (dayOfWeek === 0 || dayOfWeek === 6)) isWeeklyOff = true;
    else if (weeklyOffRule === 'FRIDAY' && dayOfWeek === 5) isWeeklyOff = true;

    if (isWeeklyOff) {
      return {
        type: 'WEEKLY_OFF',
        title: 'Weekly Off',
        description: 'Scheduled weekly rest day'
      };
    }

    return {
      type: 'WORKING_DAY',
      title: 'Working Day',
      description: 'Standard working operations'
    };
  };

  const getStatusColor = (type) => {
    switch (type) {
      case 'WORKING_DAY':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20';
      case 'WEEKLY_OFF':
        return 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20';
      default:
        return 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20';
    }
  };

  // Date click logic
  const handleDateClick = (date, status) => {
    if (!isAdmin) return;
    const dateStr = date.toISOString().split('T')[0];
    setPopoverDate(dateStr);
    setPopoverEvent(status.event || null);
    setInlineForm({
      title: status.event ? status.event.title : (status.type === 'WORKING_DAY' || status.type === 'WEEKLY_OFF' ? '' : status.title),
      description: status.event ? status.event.description || '' : '',
      type: status.type
    });
  };

  const handleSaveInline = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      const isSpecial = !['WORKING_DAY', 'WEEKLY_OFF'].includes(inlineForm.type);
      
      const payload = {
        title: isSpecial ? (inlineForm.title.trim() || 'Special Event') : inlineForm.type === 'WEEKLY_OFF' ? 'Weekly Off' : 'Working Day',
        description: inlineForm.description,
        type: inlineForm.type,
        start_date: `${popoverDate}T09:00:00.000Z`,
        end_date: `${popoverDate}T18:00:00.000Z`,
        block_attendance: inlineForm.type !== 'WORKING_DAY',
        block_performance: inlineForm.type !== 'WORKING_DAY',
        color: inlineForm.type === 'WORKING_DAY' ? '#10b981' : inlineForm.type === 'WEEKLY_OFF' ? '#f43f5e' : '#f97316'
      };

      if (popoverEvent) {
        if (inlineForm.type === 'WORKING_DAY') {
          await deleteCall(`${prefix}/calendar/${popoverEvent.event_id}`);
        } else {
          await putCall(`${prefix}/calendar/${popoverEvent.event_id}`, payload);
        }
      } else {
        if (inlineForm.type !== 'WORKING_DAY') {
          await postCall(`${prefix}/calendar`, payload);
        }
      }

      setPopoverDate(null);
      fetchEvents();
    } catch (err) {
      alert(err.message || 'Error updating date');
    }
  };

  // Bulk Operations
  const handleReset = async () => {
    if (!isAdmin || !window.confirm('Reset this month calendar to defaults?')) return;
    try {
      await postCall(`${prefix}/calendar/reset`, { year, month });
      fetchEvents();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleClear = async () => {
    if (!isAdmin || !window.confirm('Clear all events for this month?')) return;
    try {
      await postCall(`${prefix}/calendar/clear`, { year, month });
      fetchEvents();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCopyPrevious = async () => {
    if (!isAdmin || !window.confirm('Copy calendar events from the previous month?')) return;
    try {
      await postCall(`${prefix}/calendar/copy-previous`, { year, month });
      fetchEvents();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleWeeklyOffChange = async (e) => {
    const val = e.target.value;
    setWeeklyOffRule(val);
    if (!isAdmin) return;
    try {
      await postCall(`${prefix}/calendar/weekly-off`, { year, month, rule: val });
      fetchEvents();
    } catch (err) {
      alert(err.message);
    }
  };

  // Calendar calculations
  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  const gridCells = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    gridCells.push({ date: new Date(year, month - 1, getDaysInMonth(year, month - 1) - i), isCurrentMonth: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    gridCells.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }
  const remaining = 42 - gridCells.length;
  for (let i = 1; i <= remaining; i++) {
    gridCells.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }

  // Stats Calculations
  const stats = useMemo(() => {
    let working = 0;
    let weeklyOff = 0;
    let holidays = 0;
    let eventsCount = 0;
    let tournaments = 0;
    let upcoming = null;

    gridCells.forEach(cell => {
      if (!cell.isCurrentMonth) return;
      const status = getDayStatus(cell.date);
      if (status.type === 'WORKING_DAY') working++;
      else if (status.type === 'WEEKLY_OFF') weeklyOff++;
      else if (status.type === 'TOURNAMENT') {
        tournaments++;
        holidays++;
      } else {
        holidays++;
        eventsCount++;
      }
    });

    const now = new Date();
    const sortedUpcoming = events
      .filter(e => new Date(e.start_date) > now && e.type !== 'WORKING_DAY')
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    upcoming = sortedUpcoming[0] || null;

    return {
      total: daysInMonth,
      working,
      weeklyOff,
      holidays,
      eventsCount,
      tournaments,
      upcoming
    };
  }, [gridCells, events]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-6xl h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col relative text-left font-sans"
      >
        
        {/* Header Action Row */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-850">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20">
              <Calendar size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">Academy Working Calendar</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">SAMS Single Source of Truth</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 border border-slate-200 dark:border-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Layout Panel Columns */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Main Calendar Desk */}
          <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-4">
            
            {/* Top Toolbar controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/30 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-850">
              
              <div className="flex items-center gap-2">
                <button onClick={handlePrevMonth} className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={handleCurrentMonth} className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-white dark:hover:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300">
                  Today
                </button>
                <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white px-2">
                  {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={handleNextMonth} className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300">
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isAdmin && (
                  <>
                    <button onClick={handleCopyPrevious} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900">
                      <Copy size={12} /> Copy Previous
                    </button>
                    <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900">
                      <RefreshCw size={12} /> Reset
                    </button>
                    <button onClick={handleClear} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20">
                      <Trash2 size={12} /> Clear
                    </button>
                  </>
                )}

                {isAdmin && (
                  <select 
                    value={weeklyOffRule} 
                    onChange={handleWeeklyOffChange}
                    className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="SUNDAY">Sunday Off</option>
                    <option value="SATURDAY_SUNDAY">Sat+Sun Off</option>
                    <option value="FRIDAY">Friday Off</option>
                    <option value="NONE">No Weekly Off</option>
                  </select>
                )}
              </div>

            </div>

            {/* Grid Header days of week */}
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Square Cards Grid */}
            <div className="grid grid-cols-7 gap-2 flex-1 relative">
              {gridCells.map((cell, idx) => {
                const status = getDayStatus(cell.date);
                const isToday = new Date().toDateString() === cell.date.toDateString();
                const isCurrentMonthCell = cell.isCurrentMonth;
                const statusColorClass = getStatusColor(status.type);

                return (
                  <div
                    key={idx}
                    onClick={() => handleDateClick(cell.date, status)}
                    className={`aspect-square p-2.5 rounded-2xl border flex flex-col justify-between transition-all relative group cursor-pointer ${
                      isToday
                        ? 'bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-500/30 shadow-md shadow-blue-500/10'
                        : statusColorClass
                    } ${
                      !isCurrentMonthCell ? 'opacity-30' : 'opacity-100'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-xs font-black ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {cell.date.getDate()}
                      </span>
                      {status.type !== 'WORKING_DAY' && status.type !== 'WEEKLY_OFF' && (
                        <span className="text-[10px] opacity-80">
                          {EVENT_TYPES.find(t => t.value === status.type)?.icon || '🟠'}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex-1 flex flex-col justify-end min-h-0">
                      <span className="text-[9px] font-black tracking-tight truncate leading-tight uppercase">
                        {status.title}
                      </span>
                      {status.description && (
                        <span className="text-[8px] opacity-60 truncate leading-none mt-0.5 font-bold">
                          {status.description}
                        </span>
                      )}
                    </div>

                    {/* Popover overlay placement inside card structure */}
                    {popoverDate === cell.date.toISOString().split('T')[0] && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-[110%] left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-2xl w-56 text-left space-y-3 cursor-default"
                      >
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-900">
                          <span className="text-[10px] font-black uppercase text-slate-400">Configure Date</span>
                          <button onClick={() => setPopoverDate(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded">
                            <X size={10} />
                          </button>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase text-slate-400">Set Day Type</label>
                          <select
                            value={inlineForm.type}
                            onChange={(e) => setInlineForm({ ...inlineForm, type: e.target.value })}
                            className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-850 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none"
                          >
                            {EVENT_TYPES.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>

                        {!['WORKING_DAY', 'WEEKLY_OFF'].includes(inlineForm.type) && (
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-slate-400">Event Title</label>
                            <input
                              type="text"
                              value={inlineForm.title}
                              onChange={(e) => setInlineForm({ ...inlineForm, title: e.target.value })}
                              placeholder="e.g. Diwali Celebration"
                              className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-850 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none"
                            />
                            <label className="text-[9px] font-black uppercase text-slate-400">Notes (optional)</label>
                            <textarea
                              value={inlineForm.description}
                              onChange={(e) => setInlineForm({ ...inlineForm, description: e.target.value })}
                              placeholder="Brief description..."
                              rows="1"
                              className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-850 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none"
                            />
                          </div>
                        )}

                        <button 
                          onClick={handleSaveInline}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black"
                        >
                          Apply Changes
                        </button>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

            {/* Compact Legend */}
            <div className="flex flex-wrap items-center gap-6 justify-center text-xs font-bold pt-2 border-t border-slate-100 dark:border-slate-900">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></span> Working Day</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500/50"></span> Weekly Off</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-500/20 border border-orange-500/50"></span> Holiday / Event / Tournament</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-600/20 border border-blue-500"></span> Today</span>
            </div>

          </div>

          {/* Right Stats panel */}
          <div className="w-80 border-l border-slate-200 dark:border-slate-850 p-6 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between overflow-y-auto">
            
            <div className="space-y-6">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Month Summary Stats</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
                  <span className="text-[10px] font-black text-slate-400 block uppercase">Total Days</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{stats.total}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
                  <span className="text-[10px] font-black text-slate-400 block uppercase">Working</span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-450 mt-1 block">{stats.working}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
                  <span className="text-[10px] font-black text-slate-400 block uppercase">Weekly Offs</span>
                  <span className="text-2xl font-black text-rose-500 mt-1 block">{stats.weeklyOff}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
                  <span className="text-[10px] font-black text-slate-400 block uppercase">Holidays</span>
                  <span className="text-2xl font-black text-orange-500 mt-1 block">{stats.holidays}</span>
                </div>
              </div>

              <div className="space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
                <h4 className="text-[10px] font-black uppercase text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-900">Event Breakdown</h4>
                <div className="space-y-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span>🏆 Tournaments:</span>
                    <span>{stats.tournaments}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>📅 Academy Events:</span>
                    <span>{stats.eventsCount}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Upcoming banner footer block inside right sidebar */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-850">
              <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider mb-2">Next Upcoming Event</span>
              {stats.upcoming ? (
                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                    <Trophy size={14} />
                    <span className="text-xs font-black uppercase">{stats.upcoming.type.replace('_', ' ')}</span>
                  </div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-white">{stats.upcoming.title}</h4>
                  <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(stats.upcoming.start_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-slate-100 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-2xl text-center text-xs font-bold text-slate-400">
                  No upcoming activities scheduled.
                </div>
              )}
            </div>

          </div>

        </div>

      </motion.div>
    </div>
  );
}
