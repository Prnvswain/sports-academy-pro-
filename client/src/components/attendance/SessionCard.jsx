import { Calendar, Clock, MapPin, Users } from 'lucide-react';

export default function SessionCard({ batch, academy }) {
  if (!batch) return null;

  return (
    <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{batch.name}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{batch.sport?.name || 'Sport'}</p>
        </div>
        <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold">
          Active
        </div>
      </div>

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

        {academy?.attendance_radius_meters && (
          <div className="flex items-center gap-2 col-span-2">
            <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Attendance Radius</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{academy.attendance_radius_meters}m</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
