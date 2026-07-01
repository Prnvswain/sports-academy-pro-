import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Loader from '../../components/Loader';
import { adminGet } from '../../api/client';

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

export default function PerformancePanel() {
  const [sports, setSports] = useState([]);
  const [selectedSport, setSelectedSport] = useState(null);
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [students, setStudents] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showAttrs, setShowAttrs] = useState(false);
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

  const loadBatches = useCallback(async (sportId) => {
    if (!sportId) {
      setBatches([]);
      return;
    }
    try {
      setLoadingBatches(true);
      const result = await adminGet(`/admin/batches?sport_id=${sportId}`);
      const responseData = result.data;
      let batchesArray = [];
      if (Array.isArray(responseData)) {
        batchesArray = responseData;
      } else if (responseData && Array.isArray(responseData.data)) {
        batchesArray = responseData.data;
      } else if (responseData && Array.isArray(responseData.batches)) {
        batchesArray = responseData.batches;
      } else {
        batchesArray = [];
      }
      setBatches(batchesArray);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  }, []);

  const loadAttributes = useCallback(async (sportId) => {
    if (!sportId) {
      setAttributes([]);
      return;
    }
    try {
      const result = await adminGet(`/admin/performance/sport-attributes/${sportId}`);
      const responseData = result.data;
      let attributesArray = [];
      if (Array.isArray(responseData)) {
        attributesArray = responseData;
      } else if (responseData && Array.isArray(responseData.data)) {
        attributesArray = responseData.data;
      } else if (responseData && Array.isArray(responseData.attributes)) {
        attributesArray = responseData.attributes;
      } else {
        attributesArray = [];
      }
      setAttributes(attributesArray);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setAttributes([]);
    }
  }, []);

  const loadStudents = useCallback(async (batchId) => {
    if (!batchId) {
      setStudents([]);
      return;
    }
    try {
      setLoadingStudents(true);
      const result = await adminGet(`/admin/students?batch_id=${batchId}`);
      const responseData = result.data;
      let studentsArray = [];
      if (Array.isArray(responseData)) {
        studentsArray = responseData;
      } else if (responseData && Array.isArray(responseData.data)) {
        studentsArray = responseData.data;
      } else if (responseData && Array.isArray(responseData.students)) {
        studentsArray = responseData.students;
      } else {
        studentsArray = [];
      }
      setStudents(studentsArray);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setStudents([]);
    } finally {
      setLoadingStudents(false);
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
      // Use sport_id for academy sports, id for global sports
      const sportId = selectedSport.sport_id || selectedSport.id;
      loadBatches(sportId);
      loadAttributes(sportId);
      setSelectedBatchId(null);
      setStudents([]);
    }
  }, [selectedSport, loadBatches, loadAttributes]);

  useEffect(() => {
    if (selectedBatchId) {
      loadStudents(selectedBatchId);
    }
  }, [selectedBatchId, loadStudents]);

  const handleSportSelect = (sport) => {
    setSelectedSport(sport);
  };

  const handleBackToAllSports = () => {
    setSelectedSport(null);
    setBatches([]);
    setSelectedBatchId(null);
    setStudents([]);
    setAttributes([]);
    setShowAttrs(false);
  };

  const handleBatchSelect = (batchId) => {
    setSelectedBatchId(batchId);
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
          <div className="space-y-4">
            <h3 className="text-lg font-black tracking-tight">Active Sports Catalog</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sports.map((sport, index) => {
                const cleanKey = sport.name.replace(/\s+/g, '');
                const icon = SPORT_ICONS[cleanKey] || SPORT_ICONS[sport.name] || '🏆';

                return (
                  <motion.button
                    key={sport.sport_id || sport.id || sport.name || index}
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
          <button
            type="button"
            onClick={handleBackToAllSports}
            className="text-muted hover:text-accent flex items-center gap-2 text-sm font-semibold transition-colors"
          >
            <span>←</span> Back to All Sports
          </button>

          <div className="card border-accent/20 bg-accent/5 border p-6 relative">
            <div className="flex items-center justify-between">
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
                    Select a batch to view student performance metrics
                  </p>
                </div>
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAttrs(!showAttrs)}
                  className="border-accent/30 hover:border-accent hover:bg-accent/10 text-accent border rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 flex items-center gap-2"
                >
                  <span>⚙️</span>
                  View Configured Attributes
                </button>

                <AnimatePresence>
                  {showAttrs && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-full mt-2 z-50 w-80 card bg-surface border-border border shadow-xl p-4"
                    >
                      <h4 className="text-foreground text-sm font-semibold mb-3 border-b border-border/50 pb-2">
                        Active Evaluation Parameters
                      </h4>
                      {attributes.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {attributes.map((attr) => (
                            <span
                              key={attr.id || attr.name}
                              className="bg-accent/10 border-accent/30 border px-3 py-1.5 rounded-md text-xs font-medium text-foreground"
                            >
                              {attr.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted text-xs">No attributes configured for this sport.</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {loadingBatches ? (
            <div className="flex items-center justify-center py-12">
              <Loader />
            </div>
          ) : batches.length > 0 ? (
            <>
              <div className="space-y-4">
                <h3 className="text-lg font-black tracking-tight">Select Training Batch</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {batches.map((batch) => (
                    <motion.button
                      key={batch.batch_id || batch.id}
                      type="button"
                      onClick={() => handleBatchSelect(batch.batch_id || batch.id)}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className={`card border-border bg-surface-secondary p-5 text-left transition-all duration-200 ${
                        selectedBatchId === (batch.batch_id || batch.id)
                          ? 'border-accent ring-2 ring-accent/20'
                          : 'hover:border-accent/40'
                      }`}
                    >
                      <div className="text-foreground text-base font-black tracking-tight mb-2">
                        {batch.name}
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted text-xs">
                          <span className="font-medium">Students:</span> {batch.student_count || batch.students?.length || 0}
                        </div>
                        <div className="text-muted text-xs">
                          <span className="font-medium">Timings:</span> {batch.timings || batch.schedule || 'Not specified'}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {selectedBatchId && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="card bg-surface-secondary border-border space-y-4 border p-6 shadow-sm"
                >
                  <h3 className="text-foreground border-border border-b pb-3 text-lg font-black tracking-tight">
                    Student Performance Metrics
                  </h3>

                  {loadingStudents ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader />
                    </div>
                  ) : students.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-border border-b">
                            <th className="bg-surface text-left p-3 font-semibold">Student Name</th>
                            {attributes.map((attr) => (
                              <th key={attr.id || attr.name} className="bg-surface text-center p-3 font-semibold">
                                {attr.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((student) => (
                            <tr key={student.student_id || student.id} className="border-border/50 border-b hover:bg-surface/50">
                              <td className="p-3 font-medium">
                                {student.name || `${student.firstName || ''} ${student.lastName || ''}`}
                              </td>
                              {attributes.map((attr) => (
                                <td key={attr.id || attr.name} className="text-center p-3">
                                  <span className="bg-surface-secondary border-border/50 inline-block min-w-[60px] rounded border px-2 py-1 text-xs font-semibold">
                                    {student.ratings?.[attr.name] || student.performance_metrics?.[attr.name] || '-'}
                                  </span>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <tbody>
                        <tr>
                          <td colSpan={100} className="p-8 text-center">
                            <p className="text-muted border-border bg-surface/30 rounded-xl border border-dashed py-6 text-center text-sm font-medium">
                              No students enrolled in this batch yet.
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </motion.div>
              )}
            </>
          ) : (
            <div className="card bg-surface-secondary border-border border p-8 text-center">
              <p className="text-muted text-sm font-medium">
                No training batches configured for this sport yet.
              </p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}