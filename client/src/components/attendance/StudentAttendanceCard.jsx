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
        <p className="text-slate-500 dark:text-slate-400 font-bold">No students registered in this batch</p>
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
            placeholder="Search students..."
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
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Apply bulk status to filtered students:
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

      {/* Students Table */}
      <div className="px-5 pb-5">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <AnimatePresence initial={false}>
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-950/30 rounded-xl border border-dashed border-slate-200">
                  <p className="text-slate-400 text-xs font-semibold">No students match the search filter criteria.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="text-left py-3 px-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Photo</th>
                      <th className="text-left py-3 px-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Student Name</th>
                      <th className="text-left py-3 px-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ID</th>
                      <th className="text-left py-3 px-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Batch</th>
                      <th className="text-left py-3 px-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sport</th>
                      <th className="text-left py-3 px-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Attendance Status</th>
                      <th className="text-left py-3 px-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mark Attendance</th>
                      <th className="text-left py-3 px-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, index) => {
                      const status = attendanceMap[student.student_id] || 'PRESENT';
                      const rowBg = index % 2 === 0 
                        ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50' 
                        : 'bg-slate-50/50 dark:bg-slate-950/50 hover:bg-slate-100/50 dark:hover:bg-slate-800/30';

                      const statusBadge = status === 'PRESENT'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40'
                        : status === 'ABSENT'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-455 border-rose-200 dark:border-rose-900/40'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-900/40';

                      return (
                        <motion.tr
                          key={student.student_id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className={`border-b border-slate-100 dark:border-slate-800 transition-colors ${rowBg}`}
                        >
                          <td className="py-3 px-2">
                            <Avatar
                              src={student.profile_photo}
                              name={student.name}
                              size="sm"
                            />
                          </td>
                          <td className="py-3 px-2">
                            <p className="font-semibold text-slate-900 dark:text-white text-sm">{student.name}</p>
                          </td>
                          <td className="py-3 px-2">
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">#{student.student_id}</p>
                          </td>
                          <td className="py-3 px-2">
                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{student.batch_name || '—'}</p>
                          </td>
                          <td className="py-3 px-2">
                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{student.sport || '—'}</p>
                          </td>
                          <td className="py-3 px-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold border ${statusBadge}`}>
                              {status === 'PRESENT' && <CheckCircle className="w-3 h-3" />}
                              {status === 'ABSENT' && <XCircle className="w-3 h-3" />}
                              {status === 'LATE' && <Clock className="w-3 h-3" />}
                              {status}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            {!readOnly ? (
                              <div className="flex gap-1">
                                {[
                                  { id: 'PRESENT', label: 'P', color: 'emerald' },
                                  { id: 'ABSENT', label: 'A', color: 'rose' },
                                  { id: 'LATE', label: 'L', color: 'amber' }
                                ].map((item) => {
                                  const active = status === item.id;
                                  const activeColors = item.id === 'PRESENT'
                                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                    : item.id === 'ABSENT'
                                    ? 'bg-rose-500 text-white hover:bg-rose-600'
                                    : 'bg-amber-500 text-white hover:bg-amber-600';

                                  return (
                                    <label
                                      key={item.id}
                                      className={`cursor-pointer px-2 py-1 rounded-md text-xs font-bold transition-all ${
                                        active
                                  ? activeColors
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
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
                                      {item.label}
                                    </label>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500 dark:text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <input
                              type="text"
                              className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-300"
                              placeholder="Add remarks..."
                              value={remarksMap[student.student_id] || ''}
                              onChange={(e) => !disabled && !readOnly && onRemarksChange(student.student_id, e.target.value)}
                              onBlur={() => !disabled && !readOnly && onRemarksBlur && onRemarksBlur(student.student_id)}
                              disabled={disabled || readOnly}
                            />
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
