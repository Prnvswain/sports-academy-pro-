import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function CoachAttendanceCard({ 
  onMarkAttendance, 
  disabled = false, 
  alreadyMarked = false,
  existingAttendance = null,
  initialStatus = 'PRESENT',
  onStatusChange,
  windowClosed = false
}) {
  const [status, setStatus] = useState(initialStatus);
  const [remarks, setRemarks] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onMarkAttendance({ status, remarks });
  };

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    if (onStatusChange) {
      onStatusChange(newStatus);
    }
  };

  // Update status when initialStatus prop changes
  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  if (alreadyMarked && existingAttendance) {
    return (
      <div className="card bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Coach Attendance Marked</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {existingAttendance.status === 'PRESENT' ? 'Present' : 'Absent'} on {existingAttendance.date}
            </p>
          </div>
        </div>
        {existingAttendance.remarks && (
          <div className="mt-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Remarks</p>
            <p className="text-sm text-gray-900 dark:text-white">{existingAttendance.remarks}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          status === 'PRESENT' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
        }`}>
          {status === 'PRESENT' ? (
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          )}
        </div>
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Mark Your Attendance</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Attendance Status</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleStatusChange('PRESENT')}
              disabled={disabled || windowClosed}
              className={`p-4 rounded-xl border-2 transition-all ${
                status === 'PRESENT'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700'
              } ${disabled || windowClosed ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className={`w-5 h-5 ${status === 'PRESENT' ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
                <span className="font-semibold text-gray-900 dark:text-white">Present</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">GPS verification required</p>
            </button>

            <button
              type="button"
              onClick={() => handleStatusChange('ABSENT')}
              disabled={disabled}
              className={`p-4 rounded-xl border-2 transition-all ${
                status === 'ABSENT'
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-2">
                <XCircle className={`w-5 h-5 ${status === 'ABSENT' ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`} />
                <span className="font-semibold text-gray-900 dark:text-white">Absent</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No GPS required</p>
            </button>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="coachRemarks">Remarks (Optional)</label>
          <input
            id="coachRemarks"
            type="text"
            className="input-field"
            placeholder="Add any notes..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            disabled={disabled}
          />
        </div>

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={disabled}
        >
          {disabled ? 'Submitting...' : 'Mark Attendance'}
        </button>

        {status === 'ABSENT' && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              Marking yourself as absent will notify your admin automatically.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
