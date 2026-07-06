import { Lock, Clock, AlertTriangle } from 'lucide-react';

export default function AttendanceLockedCard({ reason, canUnlock = false, onUnlock }) {
  return (
    <div className="card bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
          <Lock className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Attendance Locked</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{reason}</p>
          
          {canUnlock && onUnlock && (
            <button
              onClick={onUnlock}
              className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors text-sm font-medium"
            >
              Request Admin Unlock
            </button>
          )}

          <div className="flex items-start gap-2 mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              Attendance can only be modified by admin after the attendance window closes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
