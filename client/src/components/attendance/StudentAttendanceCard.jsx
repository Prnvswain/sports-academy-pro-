import Avatar from '../Avatar';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

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
  if (!students || students.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">No students in this batch</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Student Attendance</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">{students.length} students</span>
      </div>

      <div className="space-y-3">
        {students.map((student) => (
          <div
            key={student.student_id}
            className="grid gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4 sm:grid-cols-[1fr_auto_1fr]"
          >
            <div className="flex items-center gap-3 font-semibold">
              <Avatar
                src={student.profile_photo}
                name={student.name}
                size="sm"
              />
              <div>
                <p className="text-gray-900 dark:text-white">{student.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{student.sport || ''}</p>
              </div>
            </div>

            {!readOnly ? (
              <div className="flex flex-wrap gap-3">
                {['PRESENT', 'ABSENT', 'LATE'].map((status) => {
                  const Icon = status === 'PRESENT' ? CheckCircle : status === 'ABSENT' ? XCircle : Clock;
                  const isSelected = attendanceMap[student.student_id] === status;
                  
                  return (
                    <label
                      key={status}
                      className={`flex cursor-pointer items-center gap-2 text-sm px-3 py-2 rounded-lg border transition-all ${
                        isSelected
                          ? status === 'PRESENT'
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                            : status === 'ABSENT'
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                            : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400'
                      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="radio"
                        name={`status_${student.student_id}`}
                        value={status}
                        checked={isSelected}
                        onChange={() => !disabled && onAttendanceChange(student.student_id, status)}
                        disabled={disabled}
                        className="sr-only"
                      />
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{status.charAt(0) + status.slice(1).toLowerCase()}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {(() => {
                  const status = attendanceMap[student.student_id] || 'PRESENT';
                  const Icon = status === 'PRESENT' ? CheckCircle : status === 'ABSENT' ? XCircle : Clock;
                  const colorClass = status === 'PRESENT' 
                    ? 'text-green-600 dark:text-green-400' 
                    : status === 'ABSENT' 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-yellow-600 dark:text-yellow-400';
                  
                  return (
                    <span className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{status.charAt(0) + status.slice(1).toLowerCase()}</span>
                    </span>
                  );
                })()}
              </div>
            )}

            <input
              type="text"
              className="input-field"
              placeholder="Optional remarks"
              value={remarksMap[student.student_id] || ''}
              onChange={(e) => !disabled && !readOnly && onRemarksChange(student.student_id, e.target.value)}
              onBlur={() => !disabled && !readOnly && onRemarksBlur && onRemarksBlur(student.student_id)}
              disabled={disabled || readOnly}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
