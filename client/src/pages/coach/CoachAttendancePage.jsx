import { useEffect, useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';

import Loader from '../../components/Loader';

import SessionCard from '../../components/attendance/SessionCard';

import CoachAttendanceCard from '../../components/attendance/CoachAttendanceCard';

import GPSVerificationCard from '../../components/attendance/GPSVerificationCard';

import StudentAttendanceCard from '../../components/attendance/StudentAttendanceCard';

import AttendanceSummaryCard from '../../components/attendance/AttendanceSummaryCard';

import AttendanceLockedCard from '../../components/attendance/AttendanceLockedCard';

import LiveBatchSession from '../../components/attendance/LiveBatchSession';

import { coachGet, coachPost } from '../../api/client';

import { useCoachBatches } from '../../context/CoachBatchesContext';

import { AlertCircle } from 'lucide-react';



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
  const [sessionTimer, setSessionTimer] = useState({});
  const [showLiveSession, setShowLiveSession] = useState(false);
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

        // If location was previously verified, restore GPS verification state
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

        // Reset GPS verification state when no attendance exists
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

        // Reset GPS verification state when no attendance exists
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

    // Reset GPS verification state when switching batches
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

    const phi1 = lat1 * Math.PI / 180;

    const phi2 = lat2 * Math.PI / 180;

    const deltaPhi = (lat2 - lat1) * Math.PI / 180;

    const deltaLambda = (lon2 - lon1) * Math.PI / 180;



    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +

              Math.cos(phi1) * Math.cos(phi2) *

              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));



    return R * c;

  };



  const checkAttendanceWindow = () => {

    if (!selectedBatch?.timing) {

      setAttendanceWindow({ active: true, reason: '' });

      return;

    }



    const [startTime, endTime] = selectedBatch.timing.split('-').map(t => t.trim());

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

    setAttendanceMap(prev => ({ ...prev, [studentId]: status }));

  };



  const handleStudentRemarksChange = (studentId, remarks) => {

    setRemarksMap(prev => ({ ...prev, [studentId]: remarks }));

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
      
      // Initialize all students as PRESENT by default
      selectedBatch?.students?.forEach(student => {
        initialAttendance[student.student_id] = 'PRESENT';
        initialRemarks[student.student_id] = '';
      });
      
      // Override with existing records
      existingRecords.forEach(record => {
        if (record.student_id) {
          initialAttendance[record.student_id] = record.status || 'PRESENT';
          initialRemarks[record.student_id] = record.remarks || '';
        }
      });
      
      // Check if attendance is locked
      const locked = existingRecords.some(r => r.locked);
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

  // Fetch active batch sessions
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

  // Start batch session
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
      await fetchActiveSessions(); // Wait for active sessions to update
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    } finally {
      setSessionLoading(false);
    }
  };

  // End batch session
  const handleEndBatch = async () => {
    if (!selectedBatch) return;
    
    setSessionLoading(true);
    setMessage({ text: '', type: '' });
    
    try {
      // 1. Bulk save all student attendance records to ensure final state is persisted
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

      // 2. Call backend to end session and lock attendance
      await coachPost('/coach/batch-session/end', { batch_id: selectedBatch.batch_id });
      setMessage({ text: 'Batch session ended and attendance locked successfully', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
      
      // 3. Clear selected batch to reset view and hide the student list
      setSelectedBatchId('');
      
      // 4. Reload active sessions
      await fetchActiveSessions();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    } finally {
      setSessionLoading(false);
    }
  };

  // Check batch session states
  const hasActiveSession = activeSessions.some(s => s.batch_id === selectedBatch?.batch_id && (s.status === 'LIVE' || s.status === 'LATE_START'));
  const currentActiveSession = activeSessions.find(s => s.batch_id === selectedBatch?.batch_id && (s.status === 'LIVE' || s.status === 'LATE_START'));
  const hasCompletedSession = activeSessions.some(s => s.batch_id === selectedBatch?.batch_id && s.status === 'COMPLETED');

  // Update session timer every second when session is active
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

  // Fetch student attendance when selected batch or active session status changes
  useEffect(() => {
    if (selectedBatchId && selectedBatch) {
      const activeSession = activeSessions.find(s => String(s.batch_id) === String(selectedBatchId) && (s.status === 'LIVE' || s.status === 'LATE_START'));
      if (activeSession) {
        fetchTodayStudentAttendance();
      }
    }
  }, [activeSessions, selectedBatchId, selectedBatch]);



  // Framer Motion Variants for views

  const viewVariants = {

    initial: { opacity: 0, x: 20 },

    animate: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },

    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }

  };



  if (loading) {

    return <Loader message="Loading batchesâ€¦" />;

  }



  return (

    <div className="relative min-h-full w-full bg-transparent p-4 sm:p-6 lg:p-8">

      

      {/* Floating Alert Notification */}

      <AnimatePresence>

        {message.text && (

          <motion.div 

            initial={{ opacity: 0, y: -20, scale: 0.95 }} 

            animate={{ opacity: 1, y: 0, scale: 1 }} 

            exit={{ opacity: 0, y: -20, scale: 0.95 }}

            className={`fixed top-6 right-6 z-50 rounded-xl px-6 py-4 shadow-xl border flex items-center gap-3 font-bold ${

              message.type === 'success' 

                ? 'bg-white dark:bg-card border-l-4 border-l-emerald-500 text-emerald-600 dark:text-emerald-400 border-y-border border-r-border' 

                : 'bg-white dark:bg-card border-l-4 border-l-red-500 text-red-600 dark:text-red-400 border-y-border border-r-border'

            }`}

          >

            <AlertCircle className="w-6 h-6 flex-shrink-0" />

            {message.text}

          </motion.div>

        )}

      </AnimatePresence>



      <AnimatePresence mode="wait">

        {!selectedBatch ? (

          /* =========================================

             VIEW 1: BATCH SELECTION & QUICK GUIDE

             ========================================= */

          <motion.div 

            key="selection-view"

            variants={viewVariants}

            initial="initial"

            animate="animate"

            exit="exit"

            className="space-y-8 max-w-7xl mx-auto"

          >

            <div>

              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">

                Attendance Register

              </h1>

              <p className="text-muted-foreground mt-2 text-sm font-medium">

                Select a date and choose a batch to enter the attendance module.

              </p>

            </div>



            <div className="grid lg:grid-cols-3 gap-6 items-start">

              

              {/* Batch Grid Selection */}

              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm relative overflow-hidden group col-span-1 lg:col-span-3">

                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>

                <h3 className="text-lg font-black tracking-tight mb-5 text-foreground flex items-center gap-2">

                  <span className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 w-8 h-8 rounded-lg flex items-center justify-center text-sm">2</span> 

                  Choose Training Batch

                </h3>



                {batches.length > 0 ? (

                  <div className="grid sm:grid-cols-2 gap-4">

                    {batches.map((batch) => (

                      <motion.button

                        key={batch.batch_id}

                        whileHover={{ y: -3, scale: 1.02 }}

                        whileTap={{ scale: 0.98 }}

                        onClick={() => {

                          setSelectedBatchId(batch.batch_id);

                          setCoachAttendanceMarked(false);

                          setCoachAttendanceStatus(null);

                          setSelectedCoachStatus('PRESENT');

                          setAttendanceMap({});

                          setRemarksMap({});

                        }}

                        className="bg-surface border border-border hover:border-blue-400 dark:hover:border-blue-600 rounded-xl p-5 text-left transition-all shadow-sm hover:shadow-md group"

                      >

                        <h4 className="font-black text-lg text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">

                          {batch.name}

                        </h4>

                        <div className="flex flex-wrap gap-2 mt-3">

                          {batch.sport && (

                            <span className="text-[10px] font-bold uppercase tracking-wider bg-background border border-border px-2 py-1 rounded text-muted-foreground">

                              ðŸ… {batch.sport.name}

                            </span>

                          )}

                          {(batch.start_time || batch.timing) && (

                            <span className="text-[10px] font-bold uppercase tracking-wider bg-background border border-border px-2 py-1 rounded text-muted-foreground">

                              ðŸ•’ {batch.timing || `${batch.start_time}${batch.end_time ? ' - ' + batch.end_time : ''}`}

                            </span>

                          )}

                          <span className="text-[10px] font-bold uppercase tracking-wider bg-background border border-border px-2 py-1 rounded text-muted-foreground">

                            ðŸ‘¥ {batch.students_count || batch.students?.length || 0} Students

                          </span>

                        </div>

                      </motion.button>

                    ))}

                  </div>

                ) : (

                  <div className="py-12 text-center bg-surface rounded-xl border border-dashed border-border">

                    <p className="text-muted-foreground text-sm font-bold">No training batches assigned.</p>

                  </div>

                )}

              </div>

            </div>



            {/* Quick How to Use Guide */}

            <div className="bg-gradient-to-br from-surface to-surface-secondary border border-border rounded-2xl p-8 shadow-sm mt-8 relative overflow-hidden">

              {/* Decorative background element for the guide */}

              <div className="absolute -right-20 -bottom-20 opacity-5 text-9xl">ðŸ’¡</div>

              

              <h3 className="text-xl font-black mb-6 flex items-center gap-2 text-foreground">

                <span className="text-2xl">ðŸ’¡</span> Quick How-to-Use Guide

              </h3>

              

              <div className="grid md:grid-cols-4 gap-6 relative z-10">

                <div className="space-y-3">

                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-lg border border-primary/20">1</div>

                  <h4 className="font-bold text-foreground">Select Details</h4>

                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">

                    Pick the date and click on the specific training batch from the grid above to open its module.

                  </p>

                </div>

                <div className="space-y-3">

                  <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-lg border border-amber-500/20">2</div>

                  <h4 className="font-bold text-foreground">GPS Verification</h4>

                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">

                    Capture your live location coordinates to prove you are within the academy radius.

                  </p>

                </div>

                <div className="space-y-3">

                  <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-lg border border-blue-500/20">3</div>

                  <h4 className="font-bold text-foreground">Coach Check-in</h4>

                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">

                    Mark your own attendance as Present or Absent before managing the students.

                  </p>

                </div>

                <div className="space-y-3">

                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-lg border border-emerald-500/20">4</div>

                  <h4 className="font-bold text-foreground">Student Roll Call</h4>

                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">

                    Review the list, optionally auto-mark unselected as absent, and submit the final ledger.

                  </p>

                </div>

              </div>

            </div>

          </motion.div>



        ) : (

          /* =========================================

             VIEW 2: DEDICATED ATTENDANCE MODULE

             ========================================= */

          <motion.div 

            key="module-view"

            variants={viewVariants}

            initial="initial"

            animate="animate"

            exit="exit"

            className="max-w-4xl mx-auto space-y-6"

          >

            {/* Module Header & Back Button */}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-4 rounded-2xl shadow-sm">

              <div className="flex items-center gap-4">

                <motion.button

                  whileHover={{ scale: 1.05 }}

                  whileTap={{ scale: 0.95 }}

                  onClick={() => setSelectedBatchId('')}

                  className="bg-surface hover:bg-surface-secondary border border-border text-foreground w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm"

                  title="Back to Selection"

                >

                  â†

                </motion.button>

                <div>

                  <h2 className="text-xl font-black tracking-tight text-foreground">

                    {selectedBatch.name}

                  </h2>

                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {selectedBatch.sport?.name || 'Sport'}
                    </p>
                    <span className="text-muted-foreground">â€¢</span>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {selectedBatch.timing || 'Timing not set'}
                    </p>
                    <span className="text-muted-foreground">â€¢</span>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {selectedBatch.students?.length || 0} Students
                    </p>
                  </div>

                </div>

              </div>

            </div>



            {/* Batch Session Controls - Visible after coach self-attendance is marked */}
            {coachAttendanceMarked && !isAttendanceLocked && !hasCompletedSession && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card shadow-sm rounded-2xl border border-border overflow-hidden relative"
              >
                <div className={`absolute top-0 left-0 w-full h-1 ${hasActiveSession ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {hasActiveSession && currentActiveSession && (
                        <div className="relative">
                          <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </div>
                      )}
                      <div>
                        {hasActiveSession && currentActiveSession ? (
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                              ðŸŸ¢ LIVE Session Active
                              <span className="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                                LIVE
                              </span>
                            </h3>
                          </div>
                        ) : (
                          <h3 className="font-bold text-lg text-foreground">Start Batch Session</h3>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          {hasActiveSession && currentActiveSession 
                            ? `Session in progress â€¢ Elapsed Time: ${formatTime(elapsedTime)}`
                            : 'GPS verified - Ready to start batch session'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {hasActiveSession ? (
                        <div className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 font-black px-6 py-3 rounded-xl border border-emerald-200 dark:border-emerald-800 text-sm flex items-center gap-2">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                          Batch Started
                        </div>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleStartBatch}
                          disabled={sessionLoading || !coachAttendanceMarked || coachAttendanceStatus?.status === 'ABSENT'}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <span className="text-xl">â–¶</span>
                          Start Batch Session
                        </motion.button>
                      )}
                    </div>
                  </div>
                  {!gpsVerified && !hasActiveSession && (
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        âš ï¸ GPS verification required before starting session. Please verify your location below.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Batch Session Completed Card */}
            {coachAttendanceMarked && hasCompletedSession && (
              <div className="bg-card shadow-sm rounded-2xl border border-border p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                <span className="text-4xl block mb-3">ðŸ”’</span>
                <h3 className="font-black text-lg text-foreground">Batch Session Completed</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Today's session for this batch has been completed. Student attendance is locked and cannot be modified.
                </p>
              </div>
            )}



            {/* Session Details Card */}

            <div className="bg-card shadow-sm rounded-2xl border border-border overflow-hidden">

              <SessionCard 
                batch={selectedBatch} 
                academy={selectedBatch.academy} 
                activeSession={currentActiveSession}
              />

            </div>



            {/* Attendance Window Locked - Only for student attendance */}

            <AnimatePresence>

              {!attendanceWindow.active && coachAttendanceMarked && (

                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>

                  <AttendanceLockedCard 

                    reason={attendanceWindow.reason}

                    canUnlock={false}

                  />

                </motion.div>

              )}

            </AnimatePresence>



            {/* Coach Attendance Section */}

            {!coachAttendanceMarked && (

              <div className="space-y-4">

                {!attendanceWindow.active && (

                  <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border-l-4 border-l-amber-500 border-y border-r border-amber-200 dark:border-amber-500/20 rounded-xl text-amber-800 dark:text-amber-400">

                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />

                    <p className="text-sm font-semibold">

                      Attendance window is closed. You can only mark yourself as Absent.

                    </p>

                  </div>

                )}

                

                <div className="bg-card shadow-sm rounded-2xl border border-border overflow-hidden relative">

                  <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>

                  <div className="p-1">

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



                {/* GPS Verification Wrapper */}

                <AnimatePresence>

                  {selectedCoachStatus === 'PRESENT' && attendanceWindow.active && !hasActiveSession && (

                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-card shadow-sm rounded-2xl border border-border overflow-hidden relative">

                      <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>

                      {gpsVerified ? (
                        // Show verified state instead of verification form
                        <div className="p-6">
                          <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                            <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                              <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-emerald-900 dark:text-emerald-100">Location Verified âœ“</p>
                              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                                Your location has been verified for {selectedBatch.sport?.name || 'this batch'} today.
                              </p>
                              {distanceFromCenter !== null && (
                                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                  Distance from center: {distanceFromCenter.toFixed(1)}m
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Show verification form
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

                    </motion.div>

                  )}

                </AnimatePresence>



                {/* Closed Window Error Wrapper */}

                <AnimatePresence>

                  {selectedCoachStatus === 'PRESENT' && !attendanceWindow.active && (

                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/10 border-l-4 border-l-red-500 border-y border-r border-red-200 dark:border-red-500/20 rounded-xl text-red-800 dark:text-red-400">

                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />

                      <p className="text-sm font-bold">

                        You cannot mark yourself as Present after the attendance window closes. Please switch to Absent.

                      </p>

                    </motion.div>

                  )}

                </AnimatePresence>

              </div>

            )}



            {coachAttendanceMarked && (

              <div className="bg-card shadow-sm rounded-2xl border border-border overflow-hidden relative">

                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>

                <div className="p-1">

                  <CoachAttendanceCard
                    onMarkAttendance={handleCoachAttendance}
                    disabled={false}
                    alreadyMarked={true}
                    existingAttendance={coachAttendanceStatus}
                  />
                </div>
              </div>
            )}

            {/* Student Attendance Section */}
            {coachAttendanceMarked && hasActiveSession && !isAttendanceLocked && (
              <div className="space-y-6">
                
                {selectedBatch.students?.length > 0 ? (
                  <>
                    <div className="bg-card shadow-sm rounded-2xl border border-border overflow-hidden">
                      <AttendanceSummaryCard 
                        attendanceMap={attendanceMap} 
                        students={selectedBatch.students} 
                      />
                    </div>

                    <div className="bg-card shadow-sm rounded-2xl border border-border overflow-hidden relative">
                      <div className="absolute top-0 left-0 w-full h-1 bg-purple-500"></div>
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
                  <div className="bg-card border border-dashed border-border shadow-sm rounded-2xl p-12 text-center">
                    <span className="text-4xl opacity-50 block mb-4">👥</span>
                    <h4 className="text-lg font-bold text-foreground mb-1">No Active Trainees</h4>
                    <p className="text-muted-foreground text-sm font-medium">This batch currently has no active student enrollments.</p>
                  </div>
                )}

                {/* Submit Controls Block */}
                <div className="bg-card shadow-sm rounded-2xl border border-border overflow-hidden p-6 relative">
                  <h3 className="text-lg font-black tracking-tight mb-3 text-foreground flex items-center gap-2">
                    <span className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 w-8 h-8 rounded-lg flex items-center justify-center text-sm">✓</span> 
                    Finalize Attendance
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    End the batch training session and submit final roll call. This will lock student records.
                  </p>
                  
                  <div className="flex gap-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleEndBatch}
                      disabled={sessionLoading}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white shadow-[0_4px_15px_rgba(239,68,68,0.3)] py-4 rounded-xl font-black text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="text-xl">⏹</span>
                      {sessionLoading ? 'Finalizing...' : 'End Batch & Submit Attendance'}
                    </motion.button>
                  </div>
                </div>
              </div>
            )}

            {/* Empty Students Fallback (Only when session is not active) */}
            <AnimatePresence>
              {coachAttendanceMarked && !hasActiveSession && (!selectedBatch.students || selectedBatch.students.length === 0) && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border border-dashed border-border shadow-sm rounded-2xl p-12 text-center">
                  <span className="text-4xl opacity-50 block mb-4">👥</span>
                  <h4 className="text-lg font-bold text-foreground mb-1">No Active Trainees</h4>
                  <p className="text-muted-foreground text-sm font-medium">This batch currently has no active student enrollments.</p>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>

        )}

      </AnimatePresence>

    </div>
  );
}
