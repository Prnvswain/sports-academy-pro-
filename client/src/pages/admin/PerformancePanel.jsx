import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Loader from '../../components/Loader';
import { adminGet, adminPost, adminPatch } from '../../api/client';

// Expanded Sports Icon Matrix Map with automatic fallback layout compatibility
const SPORT_ICONS = {
  Cricket: '🏏',
  Football: '⚽',
  Basketball: '🏀',
  Tennis: '🎾',
  Badminton: '🏸',
  Swimming: '🏊',
  Volleyball: '🏐',
  Rugby: '🏉',
  Hockey: '🏑',
  TableTennis: '🏓',
  PingPong: '🏓',
  Squash: '🏓',
  Baseball: ' baseball',
  Softball: '🥎',
  Golf: '🏌️‍♂️',
  Boxing: '🥊',
  Karate: '🥋',
  Taekwondo: '🥋',
  Judo: '🥋',
  Gymnastics: '🤸',
  Athletics: '🏃‍♂️',
  Running: '🏃‍♂️',
  Archery: '🏹',
  Shooting: '🎯',
  Skating: '🛼',
  Cycling: '🚴',
};

// Fixed 10 core performance attributes for all sports
const CORE_ATTRIBUTES = [
  'Stamina',
  'Accuracy',
  'Agility',
  'Speed',
  'Reflexes',
  'Tactical Knowledge',
  'Power',
  'Coordination',
  'Endurance',
  'Discipline',
];

export default function PerformancePanel() {
  const [sports, setSports] = useState([]);
  const [selectedSport, setSelectedSport] = useState(null);
  const [studentMetrics, setStudentMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  const loadSports = useCallback(async () => {
    try {
      const result = await adminGet('/admin/sports');
      const responseData = result.data;
      let sportsArray = [];
      if (Array.isArray(responseData)) {
        sportsArray = responseData;
      } else if (responseData && Array.isArray(responseData.data)) {
        sportsArray = responseData.data;
      } else if (responseData && Array.isArray(responseData.academy_sports)) {
        sportsArray = responseData.academy_sports;
      } else if (responseData && Array.isArray(responseData.sports)) {
        sportsArray = responseData.sports;
      }
      setSports(sportsArray.filter(s => s.status === 'ACTIVE'));
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setSports([]);
    }
  }, []);

  const loadStudentMetrics = useCallback(async (sportId) => {
    if (!sportId) {
      setStudentMetrics([]);
      return;
    }
    try {
      const result = await adminGet(`/admin/students?sport_id=${sportId}`);
      const responseData = result.data;
      let studentsArray = [];
      if (Array.isArray(responseData)) {
        studentsArray = responseData;
      } else if (responseData && Array.isArray(responseData.data)) {
        studentsArray = responseData.data;
      } else {
        studentsArray = [];
      }
      setStudentMetrics(studentsArray);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setStudentMetrics([]);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await loadSports();
      setLoading(false);
    };
    initialize();
  }, [loadSports]);

  useEffect(() => {
    if (selectedSport) {
      loadStudentMetrics(selectedSport.sport_id);
    }
  }, [selectedSport, loadStudentMetrics]);

  const handleSportSelect = (sport) => {
    setSelectedSport(sport);
  };

  const handleBackToAllSports = () => {
    setSelectedSport(null);
    setStudentMetrics([]);
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <motion.div
      className="bg-surface text-foreground min-h-screen space-y-6 p-6 w-full overflow-x-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div>
        <h2 className="from-accent bg-gradient-to-r to-emerald-500 bg-clip-text text-3xl font-black tracking-tight text-transparent">
          Performance Tracker
        </h2>
        <p className="text-muted mt-1 text-sm">
          Manage core sports criteria profiles and validate coach-submitted metrics.
        </p>
      </div>

      {message.text && (
        <div
          className={`alert-${message.type === 'success' ? 'success' : 'error'} border-current/10 rounded-xl border p-4 text-sm font-semibold`}
        >
          {message.text}
        </div>
      )}

      {!selectedSport ? (
        <>
          {/* Sports Selection Grid Container */}
          <div className="space-y-4">
            <h3 className="text-lg font-black tracking-tight">Active Sports Catalog</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sports.map((sport, index) => {
                // Cleans up naming variants (e.g. "Table Tennis" -> "TableTennis") to match keys perfectly
                const cleanKey = sport.name.replace(/\s+/g, '');
                // Dynamic check: returns explicit emoji if matched, or falls back onto Multi-sport Trophy
                const icon = SPORT_ICONS[cleanKey] || SPORT_ICONS[sport.name] || '🏆';

                return (
                  <motion.button
                    key={sport.sport_id}
                    type="button"
                    onClick={() => handleSportSelect(sport)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    className="card hover:border-accent/40 border-border bg-surface-secondary group relative overflow-hidden p-5 text-left transition-all duration-300"
                  >
                    <div
                      className={`absolute left-0 top-0 h-full w-1 origin-top scale-y-0 transform transition-transform duration-300 group-hover:scale-y-100 ${
                        index % 4 === 0
                          ? 'bg-blue'
                          : index % 4 === 1
                            ? 'bg-purple'
                            : index % 4 === 2
                              ? 'bg-orange'
                              : 'bg-cyan'
                      }`}
                    />
                    <div className="mb-3 inline-block text-3xl transition-transform duration-300 group-hover:scale-110">
                      {icon}
                    </div>
                    <div className="text-foreground text-base font-black tracking-tight">
                      {sport.name}
                    </div>
                    <div className="text-muted mt-1.5 text-xs font-medium">
                      View student performance metrics
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Back Button */}
          <button
            type="button"
            onClick={handleBackToAllSports}
            className="text-muted hover:text-accent flex items-center gap-2 text-sm font-semibold transition-colors"
          >
            <span>←</span> Back to All Sports
          </button>

          {/* Sport Detail Header */}
          <div className="card border-accent/20 bg-accent/5 border p-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl">
                {(() => {
                  const cleanKey = selectedSport.name.replace(/\s+/g, '');
                  return SPORT_ICONS[cleanKey] || SPORT_ICONS[selectedSport.name] || '🏆';
                })()}
              </div>
              <div>
                <h3 className="text-foreground text-2xl font-black tracking-tight">
                  {selectedSport.name}
                </h3>
                <p className="text-muted mt-1 text-sm">
                  Student performance metrics for core evaluation parameters
                </p>
              </div>
            </div>
          </div>

          {/* Fixed Core Attributes Display */}
          <div className="card bg-surface-secondary border-border space-y-4 border p-6 shadow-sm">
            <h3 className="text-foreground border-border border-b pb-3 text-lg font-black tracking-tight">
              Core Evaluation Parameters
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {CORE_ATTRIBUTES.map((attr, index) => (
                <div
                  key={attr}
                  className="bg-surface border-border/50 hover:border-accent/30 rounded-lg border p-3 text-center transition-colors"
                >
                  <div className="text-accent text-xs font-black uppercase tracking-wider">
                    {index + 1}
                  </div>
                  <div className="text-foreground mt-1 text-sm font-semibold">
                    {attr}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Student Metrics Table */}
          <div className="card bg-surface-secondary border-border space-y-4 border p-6 shadow-sm">
            <h3 className="text-foreground border-border border-b pb-3 text-lg font-black tracking-tight">
              Student Performance Metrics
            </h3>

            {studentMetrics.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-border border-b">
                      <th className="bg-surface text-left p-3 font-semibold">Student Name</th>
                      {CORE_ATTRIBUTES.map((attr) => (
                        <th key={attr} className="bg-surface text-center p-3 font-semibold">
                          {attr}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {studentMetrics.map((student) => (
                      <tr key={student.student_id || student.id} className="border-border/50 border-b hover:bg-surface/50">
                        <td className="p-3 font-medium">
                          {student.name || `${student.firstName || ''} ${student.lastName || ''}`}
                        </td>
                        {CORE_ATTRIBUTES.map((attr) => (
                          <td key={attr} className="text-center p-3">
                            <span className="bg-surface-secondary border-border/50 inline-block min-w-[60px] rounded border px-2 py-1 text-xs font-semibold">
                              {student.performance_metrics?.[attr] || '-'}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted border-border bg-surface/30 rounded-xl border border-dashed py-6 text-center text-sm font-medium">
                No students enrolled in this sport yet.
              </p>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
