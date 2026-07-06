import { CheckCircle, XCircle, Clock, Users } from 'lucide-react';

export default function AttendanceSummaryCard({ attendanceMap, students }) {
  if (!students || students.length === 0) return null;

  const present = Object.values(attendanceMap).filter(s => s === 'PRESENT').length;
  const absent = Object.values(attendanceMap).filter(s => s === 'ABSENT').length;
  const late = Object.values(attendanceMap).filter(s => s === 'LATE').length;
  const pending = students.length - present - absent - late;

  const stats = [
    { label: 'Present', count: present, total: students.length, color: 'green', icon: CheckCircle },
    { label: 'Absent', count: absent, total: students.length, color: 'red', icon: XCircle },
    { label: 'Late', count: late, total: students.length, color: 'yellow', icon: Clock },
    { label: 'Pending', count: pending, total: students.length, color: 'gray', icon: Users },
  ];

  const getPercentage = (count, total) => total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Attendance Summary</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">{students.length} total</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const percentage = getPercentage(stat.count, stat.total);
          
          return (
            <div
              key={stat.label}
              className={`p-4 rounded-xl border ${
                stat.color === 'green'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : stat.color === 'red'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : stat.color === 'yellow'
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                  : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-5 h-5 ${
                  stat.color === 'green'
                    ? 'text-green-600 dark:text-green-400'
                    : stat.color === 'red'
                    ? 'text-red-600 dark:text-red-400'
                    : stat.color === 'yellow'
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{stat.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold ${
                  stat.color === 'green'
                    ? 'text-green-700 dark:text-green-400'
                    : stat.color === 'red'
                    ? 'text-red-700 dark:text-red-400'
                    : stat.color === 'yellow'
                    ? 'text-yellow-700 dark:text-yellow-400'
                    : 'text-gray-700 dark:text-gray-400'
                }`}>
                  {stat.count}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">/ {stat.total}</span>
              </div>
              <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    stat.color === 'green'
                      ? 'bg-green-500'
                      : stat.color === 'red'
                      ? 'bg-red-500'
                      : stat.color === 'yellow'
                      ? 'bg-yellow-500'
                      : 'bg-gray-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{percentage}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
