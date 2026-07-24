import { useState } from 'react';
import Avatar from '../Avatar';
import { CheckCircle, XCircle, Clock, Search, Sparkles, Check, X, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StudentAttendanceCard({
  students,
  attendanceMap,
  remarksMap,
  onAttendanceChange,
  onRemarksChange,
  onRemarksBlur,
  disabled = false,
  readOnly = false
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  if (!students || students.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
        <p className="text-slate-500 dark:text-slate-400 font-bold">No trainees registered in this batch</p>
      </div>
    );
  }

  // Filter students based on search and selected filter tab
  const filteredStudents = students.filter((student) => {
    const nameMatch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
    const status = attendanceMap[student.student_id] || 'PRESENT';

    if (statusFilter === 'ALL') return nameMatch;
    if (statusFilter === 'PRESENT') return nameMatch && status === 'PRESENT';
    if (statusFilter === 'ABSENT') return nameMatch && status === 'ABSENT';
    if (statusFilter === 'LATE') return nameMatch && status === 'LATE';
    if (statusFilter === 'PENDING') {
      // Pending if they aren't explicitly updated or status doesn't exist
      return nameMatch && !attendanceMap[student.student_id];
    }
    return nameMatch;
  });

  const handleBulkAction = (status) => {
    if (disabled || readOnly) return;
    filteredStudents.forEach((student) => {
      onAttendanceChange(student.student_id, status);
    });
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Header */}
      <div className="p-5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search trainees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl w-full md:w-auto">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'PRESENT', label: 'Present' },
            { id: 'ABSENT', label: 'Absent' },
            { id: 'LATE', label: 'Late' }
          ].map((tab) => {
            const count = students.filter(s => {
              const status = attendanceMap[s.student_id] || 'PRESENT';
              return tab.id === 'ALL' || status === tab.id;
            }).length;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`flex-1 md:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-655 font-bold">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bulk Action Controls */}
      {!readOnly && (
        <div className="px-5 flex flex-wrap gap-2 items-center justify-between">
          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Apply bulk status to filtered trainees:
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleBulkAction('PRESENT')}
              disabled={disabled}
              className="flex items-center gap-1 py-1.5 px-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 text-xs font-bold rounded-lg border border-emerald-250 dark:border-emerald-900/40 transition disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5" /> All Present
            </button>
            <button
              type="button"
              onClick={() => handleBulkAction('ABSENT')}
              disabled={disabled}
              className="flex items-center gap-1 py-1.5 px-3 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 hover:bg-rose-100 text-xs font-bold rounded-lg border border-rose-250 dark:border-rose-900/40 transition disabled:opacity-40"
            >
              <X className="w-3.5 h-3.5" /> All Absent
            </button>
            <button
              type="button"
              onClick={() => handleBulkAction('LATE')}
              disabled={disabled}
              className="flex items-center gap-1 py-1.5 px-3 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 text-xs font-bold rounded-lg border border-amber-250 dark:border-amber-900/40 transition disabled:opacity-40"
            >
              <Clock className="w-3.5 h-3.5" /> All Late
            </button>
          </div>
        </div>
      )}

      {/* Trainees List */}
      <div className="px-5 pb-5 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-950/30 rounded-xl border border-dashed border-slate-200">
              <p className="text-slate-400 text-xs font-semibold">No trainees match the search filter criteria.</p>
            </div>
          ) : (
            filteredStudents.map((student) => {
              const status = attendanceMap[student.student_id] || 'PRESENT';
              const isSelected = (statusFilter === 'ALL' || status === statusFilter);

              // Status styles mapping
              const rowBg = status === 'PRESENT'
                ? 'bg-emerald-50/10 border-emerald-100 hover:bg-emerald-50/20 dark:bg-emerald-950/5 dark:border-emerald-900/20'
                : status === 'ABSENT'
                ? 'bg-rose-50/10 border-rose-100 hover:bg-rose-50/20 dark:bg-rose-950/5 dark:border-rose-900/20'
                : 'bg-amber-50/10 border-amber-100 hover:bg-amber-50/20 dark:bg-amber-950/5 dark:border-amber-900/20';

              return (
                <motion.div
                  key={student.student_id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`grid gap-4 rounded-xl border p-4 sm:grid-cols-[1fr_auto_1fr] items-center transition shadow-sm ${rowBg}`}
                >
                  {/* Avatar & Profile */}
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={student.profile_photo}
                      name={student.name}
                      size="sm"
                    />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{student.name}</p>
                      <p className="text-xs text-slate-400 font-semibold">{student.sport || 'Athlete'}</p>
                    </div>
                  </div>

                  {/* Attendance status radio selection */}
                  {!readOnly ? (
                    <div className="flex gap-2">
                      {[
                        { id: 'PRESENT', label: 'Present', color: 'green', icon: CheckCircle },
                        { id: 'ABSENT', label: 'Absent', color: 'red', icon: XCircle },
                        { id: 'LATE', label: 'Late', color: 'yellow', icon: Clock }
                      ].map((item) => {
                        const Icon = item.icon;
                        const active = status === item.id;
                        
                        const activeColors = item.id === 'PRESENT'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : item.id === 'ABSENT'
                          ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-455'
                          : 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400';

                        return (
                          <label
                            key={item.id}
                            className={`flex cursor-pointer items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-all ${
                              active
                                ? activeColors + ' shadow-sm scale-[1.03] font-bold border-2'
                                : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-350 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                            } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                          >
                            <input
                              type="radio"
                              name={`status_${student.student_id}`}
                              value={item.id}
                              checked={active}
                              onChange={() => !disabled && onAttendanceChange(student.student_id, item.id)}
                              disabled={disabled}
                              className="sr-only"
                            />
                            <Icon className="w-3.5 h-3.5" />
                            <span>{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {(() => {
                        const activeItem = [
                          { id: 'PRESENT', label: 'Present', icon: CheckCircle, colors: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20' },
                          { id: 'ABSENT', label: 'Absent', icon: XCircle, colors: 'text-rose-600 dark:text-rose-455 bg-rose-50/50 dark:bg-rose-955/20' },
                          { id: 'LATE', label: 'Late', icon: Clock, colors: 'text-amber-605 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20' }
                        ].find(i => i.id === status) || { label: 'Present', icon: CheckCircle, colors: 'text-slate-500 bg-slate-50' };

                        const Icon = activeItem.icon;
                        return (
                          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200/60 text-xs font-semibold ${activeItem.colors}`}>
                            <Icon className="w-3.5 h-3.5" />
                            <span>{activeItem.label}</span>
                          </span>
                        );
                      })()}
                    </div>
                  )}

                  {/* Inline remarks field */}
                  <div className="w-full relative">
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-300"
                      placeholder="Add trainee notes / remarks..."
                      value={remarksMap[student.student_id] || ''}
                      onChange={(e) => !disabled && !readOnly && onRemarksChange(student.student_id, e.target.value)}
                      onBlur={() => !disabled && !readOnly && onRemarksBlur && onRemarksBlur(student.student_id)}
                      disabled={disabled || readOnly}
                    />
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
