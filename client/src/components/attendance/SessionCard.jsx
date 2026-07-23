import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, Play, Square } from 'lucide-react';

export default function SessionCard({ batch, academy, activeSession }) {
  if (!batch) return null;

  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (activeSession && activeSession.start_time) {
      const startTime = new Date(activeSession.start_time);
      const interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setElapsedTime(0);
    }
  }, [activeSession]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const isLive = activeSession && activeSession.status === 'LIVE';

  return (
    <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{batch.name}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{batch.sport?.name || 'Sport'}</p>
        </div>
        {isLive ? (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold animate-pulse">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            LIVE
          </div>
        ) : (
          <div className="px-3 py-1 bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 rounded-full text-xs font-semibold">
            Inactive
          </div>
        )}
      </div>

      {isLive && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-semibold text-green-700 dark:text-green-300">Session Duration</span>
            </div>
            <span className="text-lg font-bold text-green-700 dark:text-green-300">{formatTime(elapsedTime)}</span>
          </div>
          {activeSession.start_time && (
            <div className="mt-2 text-xs text-green-600 dark:text-green-400">
              Started at {new Date(activeSession.start_time).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Timing</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{batch.timing || 'Not set'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Students</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{batch.students?.length || 0}</p>
          </div>
        </div>

        {batch.sport?.sport_center && (
          <div className="flex items-center gap-2 col-span-2">
            <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Location</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{batch.sport.sport_center}</p>
            </div>
          </div>
        )}

        {batch.sport?.attendance_radius_meters && (
          <div className="flex items-center gap-2 col-span-2">
            <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Attendance Radius</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{batch.sport.attendance_radius_meters}m</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
