import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Users, CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react';
import { coachPost, coachGet } from '../../api/client';

export default function LiveBatchSession({ 
  batch, 
  activeSession, 
  students, 
  onClose, 
  onEndSession 
}) {
  const [attendanceMap, setAttendanceMap] = useState({});
  const [remarksMap, setRemarksMap] = useState({});
  const [saving, setSaving] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Load existing attendance when session is active
  useEffect(() => {
    const loadExistingAttendance = async () => {
      if (!activeSession || !batch) return;
      
      setLoadingAttendance(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const result = await coachGet(`/coach/attendance?batch_id=${batch.batch_id}&date=${today}`);
        const existingAttendance = result.data || [];
        
        const initialAttendance = {};
        const initialRemarks = {};
        
        // Initialize all students as ABSENT by default
        students?.forEach(student => {
          initialAttendance[student.student_id] = 'ABSENT';
          initialRemarks[student.student_id] = '';
        });
        
        // Override with existing attendance
        existingAttendance.forEach(record => {
          if (record.student_id) {
            initialAttendance[record.student_id] = record.status || 'ABSENT';
            initialRemarks[record.student_id] = record.remarks || '';
          }
        });
        
        setAttendanceMap(initialAttendance);
        setRemarksMap(initialRemarks);
      } catch (error) {
        console.error('Failed to load existing attendance:', error);
        // Fallback to default initialization
        const initialAttendance = {};
        const initialRemarks = {};
        students?.forEach(student => {
          initialAttendance[student.student_id] = 'ABSENT';
          initialRemarks[student.student_id] = '';
        });
        setAttendanceMap(initialAttendance);
        setRemarksMap(initialRemarks);
      } finally {
        setLoadingAttendance(false);
      }
    };
    
    loadExistingAttendance();
  }, [activeSession, batch, students]);

  // Update elapsed time
  useEffect(() => {
    if (activeSession?.start_time) {
      const startTime = new Date(activeSession.start_time);
      const interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeSession]);

  // Auto-save attendance every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (Object.keys(attendanceMap).length > 0) {
        saveAttendance(true);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [attendanceMap, remarksMap]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAttendanceChange = (studentId, status) => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleRemarksChange = (studentId, remarks) => {
    setRemarksMap(prev => ({
      ...prev,
      [studentId]: remarks
    }));
  };

  const saveAttendance = async (silent = false) => {
    if (!batch || !activeSession) return;

    const records = Object.entries(attendanceMap).map(([studentId, status]) => ({
      student_id: parseInt(studentId),
      status,
      remarks: remarksMap[studentId] || null
    }));

    if (records.length === 0) return;

    setSaving(true);
    try {
      await coachPost('/coach/attendance', {
        batch_id: batch.batch_id,
        date: new Date().toISOString().split('T')[0],
        records
      });
      if (!silent) {
        // Show success notification
      }
    } catch (error) {
      console.error('Failed to save attendance:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEndSession = async () => {
    await saveAttendance();
    
    // Calculate summary
    const summary = {
      present: getAttendanceCount('PRESENT'),
      absent: getAttendanceCount('ABSENT'),
      late: getAttendanceCount('LATE'),
      total: students?.length || 0,
      duration: formatTime(elapsedTime),
      durationMinutes: Math.floor(elapsedTime / 60)
    };
    
    setSessionSummary(summary);
    setShowSummary(true);
  };

  const confirmEndSession = async () => {
    await onEndSession();
    setShowSummary(false);
  };

  const getAttendanceCount = (status) => {
    return Object.values(attendanceMap).filter(s => s === status).length;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
                  LIVE: {batch?.name}
                </h2>
                <p className="text-blue-100 mt-1">{batch?.sport?.name} • {batch?.timing}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
                  <Clock className="w-5 h-5" />
                  <span className="font-mono font-bold">{formatTime(elapsedTime)}</span>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="bg-surface border-b border-border p-4">
            <div className="flex items-center justify-around">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold">{students?.length || 0} Students</span>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">{getAttendanceCount('PRESENT')} Present</span>
              </div>
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">{getAttendanceCount('LATE')} Late</span>
              </div>
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5" />
                <span className="font-semibold">{getAttendanceCount('ABSENT')} Absent</span>
              </div>
            </div>
          </div>

          {/* Students List */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid gap-3">
              {students?.map(student => (
                <div
                  key={student.student_id}
                  className="bg-surface border border-border rounded-xl p-4 hover:border-primary transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                        {student.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{student.name}</p>
                        <p className="text-sm text-muted-foreground">ID: {student.student_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {['PRESENT', 'ABSENT', 'LATE'].map(status => (
                        <button
                          key={status}
                          onClick={() => handleAttendanceChange(student.student_id, status)}
                          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                            attendanceMap[student.student_id] === status
                              ? status === 'PRESENT'
                                ? 'bg-green-500 text-white'
                                : status === 'ABSENT'
                                ? 'bg-red-500 text-white'
                                : 'bg-amber-500 text-white'
                              : 'bg-surface border border-border hover:border-primary'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Add remarks..."
                    value={remarksMap[student.student_id] || ''}
                    onChange={(e) => handleRemarksChange(student.student_id, e.target.value)}
                    className="mt-3 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-surface border-t border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {saving && (
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    Auto-saving...
                  </span>
                )}
              </div>
              <button
                onClick={handleEndSession}
                className="bg-red-500 hover:bg-red-600 text-white font-bold px-6 py-3 rounded-xl transition-colors flex items-center gap-2"
              >
                <span className="text-xl">⏹</span>
                End Batch Session
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Session Summary Modal */}
      <AnimatePresence>
        {showSummary && sessionSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <FileText className="w-6 h-6" />
                  Session Summary
                </h3>
                <p className="text-blue-100 mt-1">{batch?.name}</p>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">{sessionSummary.present}</p>
                    <p className="text-sm text-muted-foreground">Present</p>
                  </div>
                  <div className="bg-surface rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-red-600">{sessionSummary.absent}</p>
                    <p className="text-sm text-muted-foreground">Absent</p>
                  </div>
                  <div className="bg-surface rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-amber-600">{sessionSummary.late}</p>
                    <p className="text-sm text-muted-foreground">Late</p>
                  </div>
                  <div className="bg-surface rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-foreground">{sessionSummary.total}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                </div>
                
                <div className="bg-surface rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Session Duration</span>
                    <span className="font-bold text-foreground">{sessionSummary.duration}</span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSummary(false)}
                    className="flex-1 bg-surface border border-border hover:border-primary text-foreground font-bold py-3 rounded-xl transition-colors"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={confirmEndSession}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    Confirm End
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
