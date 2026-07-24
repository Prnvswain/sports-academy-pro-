import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Loader from '../../components/Loader';
import SessionCard from '../../components/attendance/SessionCard';
import CoachAttendanceCard from '../../components/attendance/CoachAttendanceCard';
import GPSVerificationCard from '../../components/attendance/GPSVerificationCard';
import StudentAttendanceCard from '../../components/attendance/StudentAttendanceCard';
import AttendanceSummaryCard from '../../components/attendance/AttendanceSummaryCard';
import AttendanceLockedCard from '../../components/attendance/AttendanceLockedCard';
import { coachGet, coachPost } from '../../api/client';
import { useCoachBatches } from '../../context/CoachBatchesContext';
import { 
  AlertCircle, 
  MapPin, 
  Clock, 
  Users, 
  Play, 
  Square, 
  CheckCircle, 
  Navigation, 
  Compass,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Sparkles
} from 'lucide-react';

const formatTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function CoachAttendancePage() {
  const { batches, loading } = useCoachBatches();
  const [selectedBatchId, setSelectedBatchId] = useState('');

  // Always use today's date
  const attendanceDate = new Date().toISOString().split('T')[0];

  const [attendanceMap, setAttendanceMap] = useState({});
  const [remarksMap, setRemarksMap] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const flashMessage = useCallback((text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  }, []);

  // Coach attendance state
  const [coachAttendanceStatus, setCoachAttendanceStatus] = useState(null);
  const [selectedCoachStatus, setSelectedCoachStatus] = useState('PRESENT');
  const [coachAttendanceMarked, setCoachAttendanceMarked] = useState(false);
  const [coachAttendanceLoading, setCoachAttendanceLoading] = useState(false);
  const [loadingCoachAttendance, setLoadingCoachAttendance] = useState(false);

  // GPS state
  const [gpsCoords, setGpsCoords] = useState({ latitude: null, longitude: null, accuracy: null });
  const [gpsError, setGpsError] = useState('');
  const [gpsVerified, setGpsVerified] = useState(false);
  const [distanceFromCenter, setDistanceFromCenter] = useState(null);
  const [sportCenter, setSportCenter] = useState(null);
  const [attendanceRadius, setAttendanceRadius] = useState(100);

  // Attendance window state
  const [attendanceWindow, setAttendanceWindow] = useState({ active: false, reason: '' });
  const [showAutoMarkConfirm, setShowAutoMarkConfirm] = useState(false);

  // Batch session state
  const [activeSessions, setActiveSessions] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [isAttendanceLocked, setIsAttendanceLocked] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const selectedBatch = batches.find((b) => String(b.batch_id) === String(selectedBatchId));

  // Fetch today's coach attendance for the selected batch
  const fetchTodayCoachAttendance = async () => {
    if (!attendanceDate || !selectedBatchId) return;
    setLoadingCoachAttendance(true);
    try {
      const response = await coachGet(`/coach/self-attendance?date=${attendanceDate}&batch_id=${selectedBatchId}`);
      const attendance = response.data;

      if (attendance) {
        setCoachAttendanceMarked(true);
        setCoachAttendanceStatus({
          status: attendance.status,
          remarks: attendance.remarks,
          date: attendance.date
        });
        setSelectedCoachStatus(attendance.status);
        if (attendance.location_verified && attendance.latitude && attendance.longitude) {
          setGpsVerified(true);
          setGpsCoords({
            latitude: parseFloat(attendance.latitude),
            longitude: parseFloat(attendance.longitude),
            accuracy: null
          });
          setDistanceFromCenter(attendance.distance_from_location_meters);
          setGpsError('');
        }
      } else {
        setCoachAttendanceMarked(false);
        setCoachAttendanceStatus(null);
        setSelectedCoachStatus('PRESENT');
        setGpsVerified(false);
        setGpsCoords({ latitude: null, longitude: null, accuracy: null });
        setDistanceFromCenter(null);
        setGpsError('');
      }
    } catch (error) {
      if (error.message.includes('No attendance record found')) {
        setCoachAttendanceMarked(false);
        setCoachAttendanceStatus(null);
        setSelectedCoachStatus('PRESENT');
        setGpsVerified(false);
        setGpsCoords({ latitude: null, longitude: null, accuracy: null });
        setDistanceFromCenter(null);
        setGpsError('');
      } else {
        console.error('Error fetching coach attendance:', error);
      }
    } finally {
      setLoadingCoachAttendance(false);
    }
  };

  useEffect(() => {
    setGpsVerified(false);
    setGpsCoords({ latitude: null, longitude: null, accuracy: null });
    setDistanceFromCenter(null);
    setGpsError('');
    setIsAttendanceLocked(false);
    fetchTodayCoachAttendance();
  }, [selectedBatchId]);

  useEffect(() => {
    if (selectedBatch?.sport) {
      if (selectedBatch.sport.use_custom_location && selectedBatch.sport.latitude && selectedBatch.sport.longitude) {
        setSportCenter({
          latitude: parseFloat(selectedBatch.sport.latitude),
          longitude: parseFloat(selectedBatch.sport.longitude)
        });
      } else if (selectedBatch.academy?.latitude && selectedBatch.academy?.longitude) {
        setSportCenter({
          latitude: parseFloat(selectedBatch.academy.latitude),
          longitude: parseFloat(selectedBatch.academy.longitude)
        });
      } else {
        setSportCenter(null);
      }

      if (selectedBatch.sport?.attendance_radius_meters !== null && selectedBatch.sport?.attendance_radius_meters !== undefined) {
        setAttendanceRadius(selectedBatch.sport.attendance_radius_meters);
        console.log('Attendance radius set for sport:', selectedBatch.sport.name, selectedBatch.sport.attendance_radius_meters);
      } else {
        setAttendanceRadius(null);
        setMessage({ 
          text: `Attendance radius not configured for sport: ${selectedBatch.sport?.name || 'Unknown'}. Please contact admin to configure sport settings.`, 
          type: 'error' 
        });
      }
    }
  }, [selectedBatch]);

  useEffect(() => {
    if (gpsCoords.latitude && gpsCoords.longitude && sportCenter) {
      if (attendanceRadius === null) {
        setGpsVerified(false);
        setGpsError('Attendance radius not configured for this sport. Please contact admin.');
        return;
      }
      const distance = calculateDistance(
        gpsCoords.latitude,
        gpsCoords.longitude,
        sportCenter.latitude,
        sportCenter.longitude
      );
      setDistanceFromCenter(distance);
      const isWithinRadius = distance <= attendanceRadius;
      setGpsVerified(isWithinRadius);

      if (!isWithinRadius) {
        setGpsError(`You are ${Math.round(distance)}m from the sport center. Attendance requires being within ${attendanceRadius}m.`);
      } else {
        setGpsError('');
      }
    }
  }, [gpsCoords, sportCenter, attendanceRadius]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; 
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const checkAttendanceWindow = () => {
    if (!selectedBatch?.timing) {
      setAttendanceWindow({ active: true, reason: '' });
      return;
    }

    const [startTime, endTime] = selectedBatch.timing.split('-').map((t) => t.trim());
    if (!startTime || !endTime) {
      setAttendanceWindow({ active: true, reason: '' });
      return;
    }

    const now = new Date();
    const currentDate = attendanceDate ? new Date(attendanceDate) : now;
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const batchStart = new Date(currentDate);
    batchStart.setHours(startHour, startMin, 0, 0);
    
    const batchEnd = new Date(currentDate);
    batchEnd.setHours(endHour, endMin, 0, 0);

    const graceBefore = 10 * 60 * 1000; 
    const graceAfter = 15 * 60 * 1000; 

    const windowStart = new Date(batchStart.getTime() - graceBefore);
    const windowEnd = new Date(batchEnd.getTime() + graceAfter);

    const isActive = now >= windowStart && now <= windowEnd;
    
    if (!isActive) {
      if (now < windowStart) {
        setAttendanceWindow({ 
          active: false, 
          reason: `Attendance window opens at ${windowStart.toLocaleTimeString()}` 
        });
      } else {
        setAttendanceWindow({ 
          active: false, 
          reason: `Attendance window closed at ${windowEnd.toLocaleTimeString()}` 
        });
      }
    } else {
      setAttendanceWindow({ active: true, reason: '' });
    }
  };

  const handleLocationCapture = (locationData) => {
    if (locationData) {
      setGpsCoords({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy
      });
      setMessage({ text: 'Location captured successfully', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } else {
      setGpsCoords({ latitude: null, longitude: null, accuracy: null });
      setGpsVerified(false);
      setDistanceFromCenter(null);
    }
  };

  const handleCoachAttendance = async ({ status, remarks }) => {
    if (status === 'PRESENT' && !attendanceWindow.active) {
      setMessage({ text: 'You cannot mark yourself as Present after the attendance window closes. Please mark yourself as Absent instead.', type: 'error' });
      return;
    }
    
    if (status === 'PRESENT' && !gpsVerified) {
      setMessage({ text: 'Please verify your location before marking attendance as Present.', type: 'error' });
      return;
    }

    setCoachAttendanceLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const payload = {
        batch_id: selectedBatch.batch_id,
        date: attendanceDate,
        status,
        remarks
      };

      if (status === 'PRESENT' && gpsCoords.latitude && gpsCoords.longitude) {
        payload.latitude = gpsCoords.latitude;
        payload.longitude = gpsCoords.longitude;
        payload.accuracy = gpsCoords.accuracy;
      }

      const result = await coachPost('/coach/self-attendance', payload);
      
      setCoachAttendanceMarked(true);
      setCoachAttendanceStatus({ status, remarks, date: attendanceDate });
      setMessage({ text: result.message || 'Coach attendance marked successfully', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
      
      if (selectedBatch.students) {
        const initialAttendance = {};
        const initialRemarks = {};
        selectedBatch.students.forEach((student) => {
          initialAttendance[student.student_id] = 'PRESENT';
          initialRemarks[student.student_id] = '';
        });
        setAttendanceMap(initialAttendance);
        setRemarksMap(initialRemarks);
      }
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setCoachAttendanceLoading(false);
    }
  };

  const handleStudentAttendanceChange = (studentId, status) => {
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleStudentRemarksChange = (studentId, remarks) => {
    setRemarksMap((prev) => ({ ...prev, [studentId]: remarks }));
  };

  const handleStudentAttendanceSubmit = async (autoMarkAbsent = false) => {
    if (!selectedBatch) {
      setMessage({ text: 'Please select a batch first.', type: 'error' });
      return;
    }
    if (!selectedBatch.students?.length) {
      setMessage({ text: 'This batch has no active students.', type: 'error' });
      return;
    }
    if (!coachAttendanceMarked) {
      setMessage({ text: 'Please mark your attendance first.', type: 'error' });
      return;
    }

    let finalAttendanceMap = { ...attendanceMap };
    if (autoMarkAbsent) {
      selectedBatch.students.forEach((student) => {
        if (!finalAttendanceMap[student.student_id]) {
          finalAttendanceMap[student.student_id] = 'ABSENT';
        }
      });
    }

    setSubmitting(true);
    setMessage({ text: '', type: '' });

    const records = selectedBatch.students.map((student) => ({
      student_id: student.student_id,
      status: finalAttendanceMap[student.student_id] || 'PRESENT',
      remarks: remarksMap[student.student_id] || ''
    }));

    try {
      const result = await coachPost('/coach/attendance', {
        batch_id: selectedBatch.batch_id,
        date: attendanceDate,
        records,
        latitude: gpsCoords.latitude,
        longitude: gpsCoords.longitude,
        accuracy: gpsCoords.accuracy
      });
      setMessage({
        text: `${result.message} Parent notifications are being sent where email is on file.`,
        type: 'success'
      });
      setShowAutoMarkConfirm(false);
      setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!selectedBatch?.students) {
      setAttendanceMap({});
      setRemarksMap({});
      return;
    }
    if (coachAttendanceMarked) {
      const initialAttendance = {};
      const initialRemarks = {};
      selectedBatch.students.forEach((student) => {
        initialAttendance[student.student_id] = 'PRESENT';
        initialRemarks[student.student_id] = '';
      });
      setAttendanceMap(initialAttendance);
      setRemarksMap(initialRemarks);
    }
  }, [selectedBatchId, selectedBatch, coachAttendanceMarked]);

  useEffect(() => {
    checkAttendanceWindow();
  }, [selectedBatch]);

  const fetchTodayStudentAttendance = async () => {
    if (!selectedBatchId || !attendanceDate) return;
    try {
      const result = await coachGet(`/coach/attendance?batch_id=${selectedBatchId}&date=${attendanceDate}`);
      const existingRecords = result.data || [];
      
      const initialAttendance = {};
      const initialRemarks = {};
      
      selectedBatch?.students?.forEach((student) => {
        initialAttendance[student.student_id] = 'PRESENT';
        initialRemarks[student.student_id] = '';
      });
      
      existingRecords.forEach((record) => {
        if (record.student_id) {
          initialAttendance[record.student_id] = record.status || 'PRESENT';
          initialRemarks[record.student_id] = record.remarks || '';
        }
      });
      
      const locked = existingRecords.some((r) => r.locked);
      setIsAttendanceLocked(locked);
      
      setAttendanceMap(initialAttendance);
      setRemarksMap(initialRemarks);
    } catch (error) {
      console.error('Error fetching student attendance:', error);
    }
  };

  const saveSingleStudentAttendance = async (studentId, status, remarks) => {
    if (!selectedBatch) return;
    try {
      await coachPost('/coach/attendance', {
        batch_id: selectedBatch.batch_id,
        date: attendanceDate,
        records: [{
          student_id: parseInt(studentId, 10),
          status: status || 'PRESENT',
          remarks: remarks || ''
        }]
      });
    } catch (error) {
      console.error('Failed to save student attendance:', error);
      setMessage({ text: `Failed to save attendance: ${error.message}`, type: 'error' });
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    }
  };

  const handleStudentRemarksBlur = async (studentId) => {
    const status = attendanceMap[studentId] || 'PRESENT';
    const remarks = remarksMap[studentId] || '';
    await saveSingleStudentAttendance(studentId, status, remarks);
  };

  const fetchActiveSessions = async () => {
    setSessionLoading(true);
    try {
      const response = await coachGet('/coach/batch-session/active');
      setActiveSessions(response.data || []);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
    } finally {
      setSessionLoading(false);
    }
  };

  const handleStartBatch = async () => {
    if (!selectedBatch) return;
    
    setSessionLoading(true);
    setMessage({ text: '', type: '' });
    
    try {
      await coachPost('/coach/batch-session/start', { 
        batch_id: selectedBatch.batch_id
      });
      setMessage({ text: 'Batch session started successfully', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      await fetchActiveSessions();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    } finally {
      setSessionLoading(false);
    }
  };

  const handleEndBatch = async () => {
    if (!selectedBatch) return;
    if (!window.confirm('Are you sure you want to finalize trainee attendance and end the session? This will lock all records.')) return;
    
    setSessionLoading(true);
    setMessage({ text: '', type: '' });
    
    try {
      const records = selectedBatch.students.map((student) => ({
        student_id: student.student_id,
        status: attendanceMap[student.student_id] || 'PRESENT',
        remarks: remarksMap[student.student_id] || ''
      }));

      if (records.length > 0) {
        await coachPost('/coach/attendance', {
          batch_id: selectedBatch.batch_id,
          date: attendanceDate,
          records
        });
      }

      await coachPost('/coach/batch-session/end', { batch_id: selectedBatch.batch_id });
      setMessage({ text: 'Batch session ended and attendance locked successfully', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
      
      await fetchActiveSessions();
      await fetchTodayStudentAttendance();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    } finally {
      setSessionLoading(false);
    }
  };

  const hasActiveSession = activeSessions.some((s) => s.batch_id === selectedBatch?.batch_id && (s.status === 'LIVE' || s.status === 'LATE_START'));
  const currentActiveSession = activeSessions.find((s) => s.batch_id === selectedBatch?.batch_id && (s.status === 'LIVE' || s.status === 'LATE_START'));
  const hasCompletedSession = activeSessions.some((s) => s.batch_id === selectedBatch?.batch_id && s.status === 'COMPLETED');

  const completedSession = activeSessions.find(s => s.batch_id === selectedBatch?.batch_id && s.status === 'COMPLETED');
  const isCompleted = !!completedSession || isAttendanceLocked;

  const totalStudents = selectedBatch?.students?.length || 0;
  const presentStudents = (selectedBatch?.students || []).filter(s => attendanceMap[s.student_id] === 'PRESENT');
  const lateStudents = (selectedBatch?.students || []).filter(s => attendanceMap[s.student_id] === 'LATE');
  const absentStudents = (selectedBatch?.students || []).filter(s => attendanceMap[s.student_id] === 'ABSENT');

  const presentCount = presentStudents.length;
  const lateCount = lateStudents.length;
  const absentCount = absentStudents.length;
  const attendancePct = totalStudents > 0 ? Math.round(((presentCount + lateCount) / totalStudents) * 100) : 0;

  const sessionInfoForCompleted = completedSession || activeSessions.find(s => s.batch_id === selectedBatch?.batch_id);
  const startTimeStr = sessionInfoForCompleted?.start_time ? new Date(sessionInfoForCompleted.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
  const endTimeStr = sessionInfoForCompleted?.end_time ? new Date(sessionInfoForCompleted.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
  const durationStr = sessionInfoForCompleted?.duration_minutes ? `${sessionInfoForCompleted.duration_minutes} mins` : 'N/A';

  useEffect(() => {
    if (currentActiveSession?.start_time) {
      const startTime = new Date(currentActiveSession.start_time);
      const updateTimer = () => {
        const now = new Date();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [currentActiveSession]);

  useEffect(() => {
    fetchActiveSessions();
  }, []);

  useEffect(() => {
    if (selectedBatchId && selectedBatch) {
      fetchTodayStudentAttendance();
    }
  }, [selectedBatchId, selectedBatch]);

  const viewVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, y: -15, transition: { duration: 0.2 } }
  };

  if (loading) {
    return <Loader message="Loading batches..." />;
  }

  // Helper variables for step progression state
  const step1Complete = coachAttendanceMarked && (selectedCoachStatus === 'ABSENT' || gpsVerified);
  const step2Complete = hasActiveSession || hasCompletedSession;
  const step3Complete = isAttendanceLocked || hasCompletedSession;

  return (
    <div className="relative min-h-screen w-full bg-slate-50 dark:bg-slate-950 pb-20 p-4 sm:p-6 lg:p-8 transition-colors">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {message.text && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 rounded-xl px-5 py-4 shadow-xl border flex items-center gap-3 font-semibold text-sm max-w-sm ${
              message.type === 'success' 
                ? 'bg-emerald-50 border-emerald-250 text-emerald-805 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400' 
                : 'bg-rose-50 border-rose-250 text-rose-805 dark:bg-rose-955/20 dark:border-rose-900/40 dark:text-rose-455'
            }`}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!selectedBatch ? (
          /* =========================================
             VIEW 1: BATCH SELECTION
             ========================================= */
          <motion.div 
            key="selection-view"
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-8 max-w-6xl mx-auto"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Coach Attendance Registers
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">
                  Select an active batch card below to capture your coordinates, check-in, and start trainee rolls.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 px-4 rounded-2xl shadow-sm text-sm font-bold text-slate-655">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Today: {new Date().toDateString()}</span>
              </div>
            </div>

            {/* Batch Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {batches.length > 0 ? (
                batches.map((batch) => {
                  const isLiveSession = activeSessions.some((s) => s.batch_id === batch.batch_id && (s.status === 'LIVE' || s.status === 'LATE_START'));
                  const isCompletedSession = activeSessions.some((s) => s.batch_id === batch.batch_id && s.status === 'COMPLETED');

                  return (
                    <motion.button
                      key={batch.batch_id}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedBatchId(batch.batch_id);
                        setCoachAttendanceMarked(false);
                        setCoachAttendanceStatus(null);
                        setSelectedCoachStatus('PRESENT');
                        setAttendanceMap({});
                        setRemarksMap({});
                      }}
                      className="bg-white dark:bg-slate-900 border border-slate-250 hover:border-emerald-500 dark:border-slate-800 dark:hover:border-emerald-500 rounded-2xl p-5 text-left transition shadow-sm hover:shadow-md flex flex-col justify-between h-48 relative overflow-hidden group"
                    >
                      {/* Status bar */}
                      <span className={`absolute top-0 left-0 w-full h-1.5 ${
                        isLiveSession ? 'bg-red-500 animate-pulse' :
                        isCompletedSession ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-850'
                      }`}></span>

                      <div className="w-full">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition truncate max-w-[70%]">
                            {batch.name}
                          </h4>

                          {/* Status Badge */}
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-extrabold shadow-sm ${
                            isLiveSession ? 'bg-red-150 text-red-700 animate-pulse border border-red-200' :
                            isCompletedSession ? 'bg-emerald-100 text-emerald-805 border border-emerald-200' :
                            'bg-slate-100 text-slate-500 border border-slate-200/60 dark:bg-slate-800 dark:text-slate-450 dark:border-slate-700'
                          }`}>
                            {isLiveSession ? '● Live Now' : isCompletedSession ? 'Completed' : 'Upcoming'}
                          </span>
                        </div>

                        {batch.sport?.name && (
                          <span className="inline-block bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs px-2 py-0.5 rounded-lg mt-1 font-semibold">
                            🏆 {batch.sport.name}
                          </span>
                        )}
                      </div>

                      <div className="w-full flex items-center justify-between text-xs text-slate-450 font-semibold border-t border-slate-100 dark:border-slate-800 pt-3 mt-4">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{batch.timing || 'Timings N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{batch.students_count || batch.students?.length || 0} Trainees</span>
                        </div>
                      </div>
                    </motion.button>
                  );
                })
              ) : (
                <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 shadow-inner">
                  <p className="text-slate-400 text-sm font-bold">No active training batches assigned to you.</p>
                </div>
              )}
            </div>

            {/* Steps guidelines panel */}
            <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm relative overflow-hidden">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-amber-500" /> How Attendance Capture Works
              </h3>
              <div className="grid md:grid-cols-4 gap-6">
                {[
                  { step: '1', title: 'GPS Location Pin', body: 'Capture GPS coordinates on your phone. Requires being within the sport center bounds.' },
                  { step: '2', title: 'Mark Check-In', body: 'Select Present/Absent to record your self-attendance logs.' },
                  { step: '3', title: 'Start Training Timer', body: 'Initiate batch session which triggers trainee roll list.' },
                  { step: '4', title: 'Trainee Roll Call', body: 'Submit and end session to lock and notify parents automatically.' }
                ].map((item, idx) => (
                  <div key={idx} className="space-y-2 relative">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                      {item.step}
                    </span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{item.title}</h4>
                    <p className="text-xs text-slate-450 leading-relaxed font-semibold">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          /* =========================================
             VIEW 2: BATCH ATTENDANCE FLOW
             ========================================= */
          <motion.div 
            key="module-view"
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="max-w-4xl mx-auto space-y-6"
          >
            {/* Header section with back triggers */}
            <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center gap-4">
              <button
                onClick={() => setSelectedBatchId('')}
                className="w-10 h-10 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-750 dark:text-white rounded-xl flex items-center justify-center transition shadow-sm"
                title="Back to grid"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedBatch.name}</h2>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500">
                    🏆 {selectedBatch.sport?.name}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-450 mt-1 font-semibold">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Timings: {selectedBatch.timing}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Total: {selectedBatch.students?.length || 0} enrolled</span>
                </div>
              </div>
            </div>

            {/* STEP PROGRESSION BAR */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-450 select-none">
              <div className={`p-2 rounded-xl flex items-center justify-center gap-1.5 ${
                step1Complete ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-slate-50 text-slate-500 dark:bg-slate-950'
              }`}>
                <span className="w-5 h-5 rounded-full bg-current text-white dark:text-slate-950 flex items-center justify-center text-[10px] font-bold">1</span>
                <span>Self Check-in</span>
              </div>
              <div className={`p-2 rounded-xl flex items-center justify-center gap-1.5 ${
                step2Complete ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400' : 
                step1Complete ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400 animate-pulse' : 'bg-slate-50 text-slate-500 dark:bg-slate-950'
              }`}>
                <span className="w-5 h-5 rounded-full bg-current text-white dark:text-slate-950 flex items-center justify-center text-[10px] font-bold">2</span>
                <span>Session Active</span>
              </div>
              <div className={`p-2 rounded-xl flex items-center justify-center gap-1.5 ${
                step3Complete ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400' : 
                step2Complete ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400 animate-pulse' : 'bg-slate-50 text-slate-500 dark:bg-slate-950'
              }`}>
                <span className="w-5 h-5 rounded-full bg-current text-white dark:text-slate-950 flex items-center justify-center text-[10px] font-bold">3</span>
                <span>Trainee Roll</span>
              </div>
            </div>

            {/* STEP 1: Coach Self Attendance Check-in Card */}
            {!coachAttendanceMarked && (
              <div className="space-y-6">
                {!attendanceWindow.active && (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-250 dark:bg-amber-955/20 dark:border-amber-900/50 rounded-xl text-amber-800 dark:text-amber-400 text-xs font-semibold shadow-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-605" />
                    <p>Attendance window is currently closed. You can only mark yourself as Absent today.</p>
                  </div>
                )}

                {/* Mark Coach Attendance Card wrapper */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden relative">
                  <span className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></span>
                  <div className="p-4">
                    <CoachAttendanceCard
                      onMarkAttendance={handleCoachAttendance}
                      disabled={coachAttendanceLoading}
                      alreadyMarked={false}
                      initialStatus={selectedCoachStatus}
                      onStatusChange={setSelectedCoachStatus}
                      windowClosed={!attendanceWindow.active}
                    />
                  </div>
                </div>

                {/* GPS Capture panel */}
                {selectedCoachStatus === 'PRESENT' && attendanceWindow.active && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden relative">
                    <span className="absolute top-0 left-0 w-full h-1 bg-amber-500"></span>
                    <div className="p-1">
                      {gpsVerified ? (
                        <div className="p-6 text-center space-y-3">
                          <div className="w-12 h-12 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-xl shadow-inner">✓</div>
                          <h4 className="font-bold text-slate-900 dark:text-white">GPS Coordinates Verified</h4>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto">You are verified inside the sports center area bounds.</p>
                          {distanceFromCenter !== null && (
                            <span className="inline-block px-3 py-1 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold rounded-lg">
                              Distance from center: {distanceFromCenter.toFixed(1)}m (Allowed: {attendanceRadius}m)
                            </span>
                          )}
                        </div>
                      ) : (
                        <GPSVerificationCard
                          onLocationCapture={handleLocationCapture}
                          gpsCoords={gpsCoords}
                          gpsVerified={gpsVerified}
                          gpsError={gpsError}
                          distanceFromCenter={distanceFromCenter}
                          sportCenter={sportCenter}
                          attendanceRadius={attendanceRadius}
                          sportName={selectedBatch.sport?.name}
                          required={true}
                          disabled={false}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: Live training session manager */}
            {coachAttendanceMarked && !isAttendanceLocked && !hasCompletedSession && (
              <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden relative">
                <span className={`absolute top-0 left-0 w-full h-1 ${hasActiveSession ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {hasActiveSession ? (
                        <>
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                          <span>LIVE Training Session Active</span>
                        </>
                      ) : (
                        <span>Start Batch Session</span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-450 mt-1">
                      {hasActiveSession 
                        ? `Timer started. Trainee attendance list is active below. • Elapsed: ${formatTime(elapsedTime)}`
                        : 'Your check-in is complete. GPS location is locked. Click below to start timer.'
                      }
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {hasActiveSession ? (
                      <span className="px-4 py-2 bg-emerald-50 border border-emerald-250 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-1.5">
                        <Play className="w-3.5 h-3.5 fill-current animate-pulse text-emerald-500" /> Active Session
                      </span>
                    ) : (
                      <button
                        onClick={handleStartBatch}
                        disabled={sessionLoading || !gpsVerified || coachAttendanceStatus?.status === 'ABSENT'}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition active:scale-95"
                      >
                        <Play className="w-4 h-4 fill-current" /> Start Training Session
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Completed Session Summary Card */}
            {isCompleted && (
              <div className="bg-card shadow-lg rounded-[2rem] border border-border p-6 relative overflow-hidden transition-all text-left">
                <span className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500"></span>
                
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center text-xl">
                      📊
                    </div>
                    <div>
                      <h3 className="font-extrabold text-lg text-foreground">Session Summary</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 font-bold">Today's training log is finalized and locked</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                    Locked
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-surface p-4 rounded-2xl border border-border/60">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">✅ Total Students</span>
                    <strong className="text-xl font-black text-foreground">{totalStudents}</strong>
                  </div>
                  <div className="bg-surface p-4 rounded-2xl border border-border/60">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">🟢 Present Count</span>
                    <strong className="text-xl font-black text-emerald-600 dark:text-emerald-400">{presentCount}</strong>
                  </div>
                  <div className="bg-surface p-4 rounded-2xl border border-border/60">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">🔴 Absent Count</span>
                    <strong className="text-xl font-black text-rose-600 dark:text-rose-455">{absentCount}</strong>
                  </div>
                  <div className="bg-surface p-4 rounded-2xl border border-border/60">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">🟡 Late Count</span>
                    <strong className="text-xl font-black text-amber-600 dark:text-amber-400">{lateCount}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-surface/50 border border-border/60 p-4 rounded-2xl text-xs">
                  <div>
                    <span className="text-muted-foreground block mb-0.5 font-bold uppercase tracking-wider text-[10px]">📊 Attendance Pct</span>
                    <strong className="text-sm text-foreground font-extrabold">{attendancePct}%</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-0.5 font-bold uppercase tracking-wider text-[10px]">⏱️ Start Time</span>
                    <strong className="text-sm text-foreground font-extrabold">{startTimeStr}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-0.5 font-bold uppercase tracking-wider text-[10px]">🏁 End Time</span>
                    <strong className="text-sm text-foreground font-extrabold">{endTimeStr}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-0.5 font-bold uppercase tracking-wider text-[10px]">⌛ Duration</span>
                    <strong className="text-sm text-foreground font-extrabold">{durationStr}</strong>
                  </div>
                </div>

                <div className="text-left border-t border-border pt-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Trainee Roster Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <div className="flex items-center justify-between border-b border-border pb-1.5 mb-2">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-450">Present</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500">{presentCount}</span>
                      </div>
                      {presentStudents.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {presentStudents.map(s => (
                            <span key={s.student_id} className="inline-block px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs border border-emerald-100 dark:border-emerald-900/30 font-medium">
                              {s.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No students present</p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between border-b border-border pb-1.5 mb-2">
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-405">Late</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500">{lateCount}</span>
                      </div>
                      {lateStudents.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {lateStudents.map(s => (
                            <span key={s.student_id} className="inline-block px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 rounded-lg text-xs border border-amber-100 dark:border-amber-900/30 font-medium">
                              {s.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No students late</p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between border-b border-border pb-1.5 mb-2">
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-455">Absent</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-500">{absentCount}</span>
                      </div>
                      {absentStudents.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {absentStudents.map(s => (
                            <span key={s.student_id} className="inline-block px-2.5 py-1 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded-lg text-xs border border-rose-100 dark:border-rose-900/30 font-medium">
                              {s.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No students absent</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Selected batch summary details card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
              <SessionCard 
                batch={selectedBatch} 
                academy={selectedBatch.academy} 
                activeSession={currentActiveSession}
              />
            </div>

            {/* Verified state summary display */}
            {coachAttendanceMarked && (
              <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden relative">
                <span className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></span>
                <div className="p-4 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Your Status</span>
                    <strong className="text-slate-850 dark:text-white">{coachAttendanceStatus?.status}</strong>
                  </div>
                  {gpsCoords.latitude && (
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Capture Location</span>
                      <span className="font-mono font-bold text-slate-655">{gpsCoords.latitude.toFixed(4)}, {gpsCoords.longitude.toFixed(4)}</span>
                    </div>
                  )}
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-805 font-bold uppercase tracking-wider rounded text-[9px] shadow-sm">
                    Verified Check-in
                  </span>
                </div>
              </div>
            )}

            {/* STEP 3: Trainee Roll Call list card */}
            {coachAttendanceMarked && hasActiveSession && !isAttendanceLocked && (
              <div className="space-y-6">
                {selectedBatch.students?.length > 0 ? (
                  <>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
                      <AttendanceSummaryCard 
                        attendanceMap={attendanceMap} 
                        students={selectedBatch.students} 
                      />
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden relative">
                      <span className="absolute top-0 left-0 w-full h-1 bg-purple-500"></span>
                      <StudentAttendanceCard
                        students={selectedBatch.students}
                        attendanceMap={attendanceMap}
                        remarksMap={remarksMap}
                        onAttendanceChange={handleStudentAttendanceChange}
                        onRemarksChange={handleStudentRemarksChange}
                        onRemarksBlur={handleStudentRemarksBlur}
                        disabled={sessionLoading}
                        readOnly={false}
                      />
                    </div>
                  </>
                ) : (
                  <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-12 text-center">
                    <span className="text-4xl opacity-50 block mb-4">👥</span>
                    <h4 className="text-lg font-bold text-slate-850 dark:text-white mb-1">No Trainees Registered</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Trainee accounts need to be enrolled in this batch by admins.</p>
                  </div>
                )}

                {/* Finalize submit actions card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 shadow-sm rounded-2xl p-6 relative overflow-hidden">
                  <span className="absolute top-0 left-0 w-full h-1.5 bg-red-500"></span>
                  <h3 className="text-lg font-extrabold tracking-tight mb-2 text-slate-900 dark:text-white flex items-center gap-2">
                    🛡 Finish Session & Finalize Attendance
                  </h3>
                  <p className="text-xs text-slate-450 mb-4 font-semibold">
                    Submit the training roster to notify parents and close the timer logs. This will lock records permanently.
                  </p>
                  
                  <div className="flex gap-4">
                    <button
                      onClick={handleEndBatch}
                      disabled={sessionLoading}
                      className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-sm transition shadow flex items-center justify-center gap-1.5"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      {sessionLoading ? 'Submitting...' : 'End Batch & Submit Attendance'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* STICKY ACTION BAR FLOAT (Mobile/Desktop on-the-field helper) */}
      <AnimatePresence>
        {selectedBatch && !isAttendanceLocked && !hasCompletedSession && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 w-full p-4 bg-white/90 dark:bg-slate-900/90 border-t border-slate-250 dark:border-slate-800 shadow-2xl z-40 backdrop-blur"
          >
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
              <div className="text-xs font-semibold text-slate-500">
                <span className="block font-bold text-slate-800 dark:text-white truncate max-w-[150px] sm:max-w-none">{selectedBatch.name}</span>
                <span>Active Step: {!coachAttendanceMarked ? '1. Self Check-in' : !hasActiveSession ? '2. Ready to Start' : '3. Trainee Roll Call'}</span>
              </div>

              <div className="flex gap-2">
                {!coachAttendanceMarked ? (
                  <button
                    onClick={() => {
                      // Scroll to top or trigger form focus
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      flashMessage('Please capture your location and mark check-in above first!');
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition"
                  >
                    Check-in Required
                  </button>
                ) : !hasActiveSession ? (
                  <button
                    onClick={handleStartBatch}
                    disabled={sessionLoading || !gpsVerified || coachAttendanceStatus?.status === 'ABSENT'}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl transition shadow flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Start Batch
                  </button>
                ) : (
                  <button
                    onClick={handleEndBatch}
                    disabled={sessionLoading}
                    className="px-4 py-2.5 bg-red-650 hover:bg-red-750 text-white text-xs font-extrabold rounded-xl transition shadow flex items-center gap-1.5"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" /> End Session
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
