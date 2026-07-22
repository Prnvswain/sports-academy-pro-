import { useEffect, useState } from 'react';

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

import { AlertCircle } from 'lucide-react';



export default function CoachAttendancePage() {

  const { batches, loading } = useCoachBatches();

  const [selectedBatchId, setSelectedBatchId] = useState('');

  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

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

      } else {

        setCoachAttendanceMarked(false);

        setCoachAttendanceStatus(null);

        setSelectedCoachStatus('PRESENT');

      }

    } catch (error) {

      if (error.message.includes('No attendance record found')) {

        setCoachAttendanceMarked(false);

        setCoachAttendanceStatus(null);

        setSelectedCoachStatus('PRESENT');

      } else {

        console.error('Error fetching coach attendance:', error);

      }

    } finally {

      setLoadingCoachAttendance(false);

    }

  };



  useEffect(() => {

    fetchTodayCoachAttendance();

  }, [attendanceDate, selectedBatchId]);



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

      setAttendanceRadius(selectedBatch.sport.attendance_radius_meters || selectedBatch.academy.attendance_radius_meters || 100);

    }

  }, [selectedBatch]);



  useEffect(() => {

    if (gpsCoords.latitude && gpsCoords.longitude && sportCenter) {

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

    const φ1 = lat1 * Math.PI / 180;

    const φ2 = lat2 * Math.PI / 180;

    const Δφ = (lat2 - lat1) * Math.PI / 180;

    const Δλ = (lon2 - lon1) * Math.PI / 180;



    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +

              Math.cos(φ1) * Math.cos(φ2) *

              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

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

  }, [selectedBatch, attendanceDate]);



  // Fetch active batch sessions
  const fetchActiveSessions = async () => {
    setSessionLoading(true);
    try {
      const response = await coachGet('/coach/batch-session/active');
      setActiveSessions(response.data || []);
      
      // Initialize timer for each active session
      const timers = {};
      response.data?.forEach(session => {
        timers[session.session_id] = session.duration_minutes;
      });
      setSessionTimer(timers);
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
      await coachPost('/coach/batch-session/start', { batch_id: selectedBatch.batch_id });
      setMessage({ text: 'Batch session started successfully', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      fetchActiveSessions();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
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
      await coachPost('/coach/batch-session/end', { batch_id: selectedBatch.batch_id });
      setMessage({ text: 'Batch session ended successfully', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      fetchActiveSessions();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setSessionLoading(false);
    }
  };



  // Check if current batch has an active session
  const hasActiveSession = activeSessions.some(s => s.batch_id === selectedBatch?.batch_id);
  const currentActiveSession = activeSessions.find(s => s.batch_id === selectedBatch?.batch_id);



  // Update session timer every minute
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeSessions.length > 0) {
        fetchActiveSessions();
      }
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [activeSessions]);



  useEffect(() => {
    fetchActiveSessions();
  }, []);



  // Framer Motion Variants for views

  const viewVariants = {

    initial: { opacity: 0, x: 20 },

    animate: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },

    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }

  };



  if (loading) {

    return <Loader message="Loading batches…" />;

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

              

              {/* Date & Filters Selection */}

              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm relative overflow-hidden group">

                <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>

                <h3 className="text-lg font-black tracking-tight mb-5 text-foreground flex items-center gap-2">

                  <span className="bg-primary/10 text-primary w-8 h-8 rounded-lg flex items-center justify-center text-sm">1</span> 

                  Select Date

                </h3>

                <div className="space-y-2">

                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block" htmlFor="attendanceDate">

                    Attendance Date

                  </label>

                  <input

                    id="attendanceDate"

                    type="date"

                    className="w-full bg-surface border border-border rounded-xl p-3.5 text-sm font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"

                    value={attendanceDate}

                    onChange={(e) => setAttendanceDate(e.target.value)}

                    required

                  />

                </div>

              </div>



              {/* Batch Grid Selection */}

              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm relative overflow-hidden group lg:col-span-2">

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

                              🏅 {batch.sport.name}

                            </span>

                          )}

                          {(batch.start_time || batch.timing) && (

                            <span className="text-[10px] font-bold uppercase tracking-wider bg-background border border-border px-2 py-1 rounded text-muted-foreground">

                              🕒 {batch.timing || `${batch.start_time}${batch.end_time ? ' - ' + batch.end_time : ''}`}

                            </span>

                          )}

                          <span className="text-[10px] font-bold uppercase tracking-wider bg-background border border-border px-2 py-1 rounded text-muted-foreground">

                            👥 {batch.students_count || batch.students?.length || 0} Students

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

              <div className="absolute -right-20 -bottom-20 opacity-5 text-9xl">💡</div>

              

              <h3 className="text-xl font-black mb-6 flex items-center gap-2 text-foreground">

                <span className="text-2xl">💡</span> Quick How-to-Use Guide

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

                  ←

                </motion.button>

                <div>

                  <h2 className="text-xl font-black tracking-tight text-foreground">

                    Module: {selectedBatch.name}

                  </h2>

                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">

                    {attendanceDate}

                  </p>

                </div>

              </div>



              {/* Allow date change inside the module too */}

              <div className="flex items-center gap-2">

                 <label className="text-[10px] font-bold uppercase text-muted-foreground">Date:</label>

                 <input

                  type="date"

                  className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"

                  value={attendanceDate}

                  onChange={(e) => setAttendanceDate(e.target.value)}

                  required

                />

              </div>

            </div>



            {/* Session Details Card */}

            <div className="bg-card shadow-sm rounded-2xl border border-border overflow-hidden">

              <SessionCard batch={selectedBatch} academy={selectedBatch.academy} />

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



                {/* Batch Session Controls */}
                {coachAttendanceMarked && !hasActiveSession && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card shadow-sm rounded-2xl border border-border overflow-hidden relative"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-lg text-foreground">Start Batch Session</h3>
                          <p className="text-sm text-muted-foreground mt-1">Begin tracking your training session time</p>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleStartBatch}
                          disabled={sessionLoading}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <span className="text-xl">▶</span>
                          Start Batch
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {hasActiveSession && currentActiveSession && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card shadow-sm rounded-2xl border border-border overflow-hidden relative"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-lg text-foreground">LIVE Session</h3>
                              <span className="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold px-2 py-1 rounded-full">
                                LIVE
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Duration: {currentActiveSession.duration_minutes} min
                            </p>
                          </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleEndBatch}
                          disabled={sessionLoading}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <span className="text-xl">⏹</span>
                          End Batch
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}



                {/* GPS Verification Wrapper */}

                <AnimatePresence>

                  {selectedCoachStatus === 'PRESENT' && attendanceWindow.active && (

                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-card shadow-sm rounded-2xl border border-border overflow-hidden relative">

                      <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>

                      <GPSVerificationCard

                        onLocationCapture={handleLocationCapture}

                        gpsCoords={gpsCoords}

                        gpsVerified={gpsVerified}

                        gpsError={gpsError}

                        distanceFromCenter={distanceFromCenter}

                        sportCenter={sportCenter}

                        attendanceRadius={attendanceRadius}

                        required={true}

                        disabled={false}

                      />

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

            {coachAttendanceMarked && attendanceWindow.active && selectedBatch.students?.length > 0 && (

              <div className="space-y-6">

                

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

                    disabled={submitting}

                    readOnly={!attendanceWindow.active}

                  />

                </div>



                {/* Submit Controls Block */}

                <div className="bg-card shadow-sm rounded-2xl border border-border overflow-hidden p-6 relative">

                  <h3 className="text-lg font-black tracking-tight mb-5 text-foreground flex items-center gap-2">

                    <span className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 w-8 h-8 rounded-lg flex items-center justify-center text-sm">✓</span> 

                    Finalize & Submit

                  </h3>

                  

                  <div className="flex flex-col sm:flex-row gap-4">

                    <motion.button

                      whileHover={{ scale: 1.02 }}

                      whileTap={{ scale: 0.98 }}

                      onClick={() => handleStudentAttendanceSubmit(false)}

                      disabled={submitting}

                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_4px_15px_rgba(16,185,129,0.3)] py-4 rounded-xl font-black text-sm transition-colors"

                    >

                      {submitting ? 'Submitting…' : 'Submit Selected Attendance'}

                    </motion.button>

                    

                    <motion.button

                      whileHover={{ scale: 1.02 }}

                      whileTap={{ scale: 0.98 }}

                      onClick={() => setShowAutoMarkConfirm(true)}

                      disabled={submitting}

                      className="px-6 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors font-black text-sm shadow-[0_4px_15px_rgba(245,158,11,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"

                    >

                      Auto-mark Unselected as Absent

                    </motion.button>

                  </div>



                  {/* Auto-mark Confirmation Modal */}

                  <AnimatePresence>

                    {showAutoMarkConfirm && (

                      <motion.div 

                        initial={{ opacity: 0, height: 0, marginTop: 0 }} 

                        animate={{ opacity: 1, height: 'auto', marginTop: '1.5rem' }} 

                        exit={{ opacity: 0, height: 0, marginTop: 0 }}

                        className="overflow-hidden"

                      >

                        <div className="p-5 bg-amber-50 dark:bg-amber-900/10 border-l-4 border-l-amber-500 border-y border-r border-amber-200 dark:border-amber-500/20 rounded-xl">

                          <p className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-4">

                            ⚠️ This will mark all remaining unmarked students as Absent. Are you absolutely sure?

                          </p>

                          <div className="flex flex-wrap gap-3">

                            <motion.button

                              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}

                              onClick={() => handleStudentAttendanceSubmit(true)}

                              disabled={submitting}

                              className="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-bold shadow-md"

                            >

                              Yes, Auto-mark & Submit

                            </motion.button>

                            <motion.button

                              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}

                              onClick={() => setShowAutoMarkConfirm(false)}

                              className="px-5 py-2.5 bg-surface border border-border text-foreground rounded-lg hover:bg-surface-secondary transition-colors text-sm font-bold shadow-sm"

                            >

                              Cancel

                            </motion.button>

                          </div>

                        </div>

                      </motion.div>

                    )}

                  </AnimatePresence>

                </div>

              </div>

            )}



            {/* Empty Students Fallback */}

            <AnimatePresence>

              {coachAttendanceMarked && (!selectedBatch.students || selectedBatch.students.length === 0) && (

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

// import { useEffect, useState } from 'react';

// import { motion, AnimatePresence } from 'framer-motion';

// import Loader from '../../components/Loader';

// import SessionCard from '../../components/attendance/SessionCard';

// import CoachAttendanceCard from '../../components/attendance/CoachAttendanceCard';

// import GPSVerificationCard from '../../components/attendance/GPSVerificationCard';

// import StudentAttendanceCard from '../../components/attendance/StudentAttendanceCard';

// import AttendanceSummaryCard from '../../components/attendance/AttendanceSummaryCard';

// import AttendanceLockedCard from '../../components/attendance/AttendanceLockedCard';

// import { coachGet, coachPost } from '../../api/client';

// import { useCoachBatches } from '../../context/CoachBatchesContext';

// import { AlertCircle } from 'lucide-react';



// export default function CoachAttendancePage() {

//   const { batches, loading } = useCoachBatches();

//   const [selectedBatchId, setSelectedBatchId] = useState('');

//   const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

//   const [attendanceMap, setAttendanceMap] = useState({});

//   const [remarksMap, setRemarksMap] = useState({});

//   const [submitting, setSubmitting] = useState(false);

//   const [message, setMessage] = useState({ text: '', type: '' });

  

//   // Coach attendance state

//   const [coachAttendanceStatus, setCoachAttendanceStatus] = useState(null);

//   const [selectedCoachStatus, setSelectedCoachStatus] = useState('PRESENT');

//   const [coachAttendanceMarked, setCoachAttendanceMarked] = useState(false);

//   const [coachAttendanceLoading, setCoachAttendanceLoading] = useState(false);

//   const [loadingCoachAttendance, setLoadingCoachAttendance] = useState(false);

  

//   // GPS state

//   const [gpsCoords, setGpsCoords] = useState({ latitude: null, longitude: null, accuracy: null });

//   const [gpsError, setGpsError] = useState('');

//   const [gpsVerified, setGpsVerified] = useState(false);

//   const [distanceFromCenter, setDistanceFromCenter] = useState(null);

//   const [sportCenter, setSportCenter] = useState(null);

//   const [attendanceRadius, setAttendanceRadius] = useState(100);

  

//   // Attendance window state

//   const [attendanceWindow, setAttendanceWindow] = useState({ active: false, reason: '' });

//   const [showAutoMarkConfirm, setShowAutoMarkConfirm] = useState(false);



//   const selectedBatch = batches.find((b) => String(b.batch_id) === String(selectedBatchId));



//   // Fetch today's coach attendance for the selected batch

//   const fetchTodayCoachAttendance = async () => {

//     if (!attendanceDate || !selectedBatchId) return;

    

//     setLoadingCoachAttendance(true);

//     try {

//       const response = await coachGet(`/coach/self-attendance?date=${attendanceDate}&batch_id=${selectedBatchId}`);

//       const attendance = response.data;

      

//       if (attendance) {

//         setCoachAttendanceMarked(true);

//         setCoachAttendanceStatus({

//           status: attendance.status,

//           remarks: attendance.remarks,

//           date: attendance.date

//         });

//         setSelectedCoachStatus(attendance.status);

//       } else {

//         setCoachAttendanceMarked(false);

//         setCoachAttendanceStatus(null);

//         setSelectedCoachStatus('PRESENT');

//       }

//     } catch (error) {

//       // If no attendance found, that's expected

//       if (error.message.includes('No attendance record found')) {

//         setCoachAttendanceMarked(false);

//         setCoachAttendanceStatus(null);

//         setSelectedCoachStatus('PRESENT');

//       } else {

//         console.error('Error fetching coach attendance:', error);

//       }

//     } finally {

//       setLoadingCoachAttendance(false);

//     }

//   };



//   // Fetch coach attendance when date or batch changes

//   useEffect(() => {

//     fetchTodayCoachAttendance();

//   }, [attendanceDate, selectedBatchId]);



//   // Load sport center location when batch is selected

//   useEffect(() => {

//     if (selectedBatch?.sport) {

//       // Use sport location if custom, otherwise use academy location

//       if (selectedBatch.sport.use_custom_location && selectedBatch.sport.latitude && selectedBatch.sport.longitude) {

//         setSportCenter({

//           latitude: parseFloat(selectedBatch.sport.latitude),

//           longitude: parseFloat(selectedBatch.sport.longitude)

//         });

//       } else if (selectedBatch.academy?.latitude && selectedBatch.academy?.longitude) {

//         setSportCenter({

//           latitude: parseFloat(selectedBatch.academy.latitude),

//           longitude: parseFloat(selectedBatch.academy.longitude)

//         });

//       } else {

//         setSportCenter(null);

//       }

      

//       // Set attendance radius (sport-specific or academy default)

//       setAttendanceRadius(selectedBatch.sport.attendance_radius_meters || selectedBatch.academy.attendance_radius_meters || 100);

//     }

//   }, [selectedBatch]);



//   // Calculate distance when GPS coordinates are captured

//   useEffect(() => {

//     if (gpsCoords.latitude && gpsCoords.longitude && sportCenter) {

//       const distance = calculateDistance(

//         gpsCoords.latitude,

//         gpsCoords.longitude,

//         sportCenter.latitude,

//         sportCenter.longitude

//       );

//       setDistanceFromCenter(distance);

      

//       // Verify if within radius

//       const isWithinRadius = distance <= attendanceRadius;

//       setGpsVerified(isWithinRadius);

      

//       if (!isWithinRadius) {

//         setGpsError(`You are ${Math.round(distance)}m from the sport center. Attendance requires being within ${attendanceRadius}m.`);

//       } else {

//         setGpsError('');

//       }

//     }

//   }, [gpsCoords, sportCenter, attendanceRadius]);



//   // Haversine formula for distance calculation

//   const calculateDistance = (lat1, lon1, lat2, lon2) => {

//     const R = 6371e3; // Earth's radius in meters

//     const φ1 = lat1 * Math.PI / 180;

//     const φ2 = lat2 * Math.PI / 180;

//     const Δφ = (lat2 - lat1) * Math.PI / 180;

//     const Δλ = (lon2 - lon1) * Math.PI / 180;



//     const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +

//               Math.cos(φ1) * Math.cos(φ2) *

//               Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));



//     return R * c;

//   };



//   // Check attendance window based on batch timing

//   const checkAttendanceWindow = () => {

//     if (!selectedBatch?.timing) {

//       setAttendanceWindow({ active: true, reason: '' });

//       return;

//     }



//     // Parse batch timing (assuming format like "09:00-10:00")

//     const [startTime, endTime] = selectedBatch.timing.split('-').map(t => t.trim());

//     if (!startTime || !endTime) {

//       setAttendanceWindow({ active: true, reason: '' });

//       return;

//     }



//     const now = new Date();

//     const currentDate = attendanceDate ? new Date(attendanceDate) : now;

    

//     const [startHour, startMin] = startTime.split(':').map(Number);

//     const [endHour, endMin] = endTime.split(':').map(Number);

    

//     const batchStart = new Date(currentDate);

//     batchStart.setHours(startHour, startMin, 0, 0);

    

//     const batchEnd = new Date(currentDate);

//     batchEnd.setHours(endHour, endMin, 0, 0);



//     // Add grace periods (10 min before, 15 min after)

//     const graceBefore = 10 * 60 * 1000; // 10 minutes in ms

//     const graceAfter = 15 * 60 * 1000; // 15 minutes in ms



//     const windowStart = new Date(batchStart.getTime() - graceBefore);

//     const windowEnd = new Date(batchEnd.getTime() + graceAfter);



//     const isActive = now >= windowStart && now <= windowEnd;

    

//     if (!isActive) {

//       if (now < windowStart) {

//         setAttendanceWindow({ 

//           active: false, 

//           reason: `Attendance window opens at ${windowStart.toLocaleTimeString()}` 

//         });

//       } else {

//         setAttendanceWindow({ 

//           active: false, 

//           reason: `Attendance window closed at ${windowEnd.toLocaleTimeString()}` 

//         });

//       }

//     } else {

//       setAttendanceWindow({ active: true, reason: '' });

//     }

//   };



//   // Handle GPS location capture from GPSCapture component

//   const handleLocationCapture = (locationData) => {

//     if (locationData) {

//       setGpsCoords({

//         latitude: locationData.latitude,

//         longitude: locationData.longitude,

//         accuracy: locationData.accuracy

//       });

//       setMessage({ text: 'Location captured successfully', type: 'success' });

//       setTimeout(() => setMessage({ text: '', type: '' }), 3000);

//     } else {

//       setGpsCoords({ latitude: null, longitude: null, accuracy: null });

//       setGpsVerified(false);

//       setDistanceFromCenter(null);

//     }

//   };



//   // Handle coach attendance marking

//   const handleCoachAttendance = async ({ status, remarks }) => {

//     // Prevent marking Present when window is closed

//     if (status === 'PRESENT' && !attendanceWindow.active) {

//       setMessage({ text: 'You cannot mark yourself as Present after the attendance window closes. Please mark yourself as Absent instead.', type: 'error' });

//       return;

//     }

    

//     // Require GPS verification for Present

//     if (status === 'PRESENT' && !gpsVerified) {

//       setMessage({ text: 'Please verify your location before marking attendance as Present.', type: 'error' });

//       return;

//     }



//     setCoachAttendanceLoading(true);

//     setMessage({ text: '', type: '' });



//     try {

//       const payload = {

//         batch_id: selectedBatch.batch_id,

//         date: attendanceDate,

//         status,

//         remarks

//       };



//       // Include GPS data if present

//       if (status === 'PRESENT' && gpsCoords.latitude && gpsCoords.longitude) {

//         payload.latitude = gpsCoords.latitude;

//         payload.longitude = gpsCoords.longitude;

//         payload.accuracy = gpsCoords.accuracy;

//       }



//       const result = await coachPost('/coach/self-attendance', payload);

      

//       setCoachAttendanceMarked(true);

//       setCoachAttendanceStatus({ status, remarks, date: attendanceDate });

//       setMessage({ text: result.message || 'Coach attendance marked successfully', type: 'success' });

//       setTimeout(() => setMessage({ text: '', type: '' }), 4000);

      

//       // Initialize student attendance after coach attendance

//       if (selectedBatch.students) {

//         const initialAttendance = {};

//         const initialRemarks = {};

//         selectedBatch.students.forEach((student) => {

//           initialAttendance[student.student_id] = 'PRESENT';

//           initialRemarks[student.student_id] = '';

//         });

//         setAttendanceMap(initialAttendance);

//         setRemarksMap(initialRemarks);

//       }

//     } catch (error) {

//       setMessage({ text: error.message, type: 'error' });

//     } finally {

//       setCoachAttendanceLoading(false);

//     }

//   };



//   // Handle student attendance change

//   const handleStudentAttendanceChange = (studentId, status) => {

//     setAttendanceMap(prev => ({ ...prev, [studentId]: status }));

//   };



//   // Handle student remarks change

//   const handleStudentRemarksChange = (studentId, remarks) => {

//     setRemarksMap(prev => ({ ...prev, [studentId]: remarks }));

//   };



//   // Handle student attendance submission

//   const handleStudentAttendanceSubmit = async (autoMarkAbsent = false) => {

//     if (!selectedBatch) {

//       setMessage({ text: 'Please select a batch first.', type: 'error' });

//       return;

//     }

//     if (!selectedBatch.students?.length) {

//       setMessage({ text: 'This batch has no active students.', type: 'error' });

//       return;

//     }

//     if (!coachAttendanceMarked) {

//       setMessage({ text: 'Please mark your attendance first.', type: 'error' });

//       return;

//     }



//     // Auto-mark remaining students as absent if requested

//     let finalAttendanceMap = { ...attendanceMap };

//     if (autoMarkAbsent) {

//       selectedBatch.students.forEach((student) => {

//         if (!finalAttendanceMap[student.student_id]) {

//           finalAttendanceMap[student.student_id] = 'ABSENT';

//         }

//       });

//     }



//     setSubmitting(true);

//     setMessage({ text: '', type: '' });



//     const records = selectedBatch.students.map((student) => ({

//       student_id: student.student_id,

//       status: finalAttendanceMap[student.student_id] || 'PRESENT',

//       remarks: remarksMap[student.student_id] || ''

//     }));



//     try {

//       const result = await coachPost('/coach/attendance', {

//         batch_id: selectedBatch.batch_id,

//         date: attendanceDate,

//         records,

//         latitude: gpsCoords.latitude,

//         longitude: gpsCoords.longitude,

//         accuracy: gpsCoords.accuracy

//       });

//       setMessage({

//         text: `${result.message} Parent notifications are being sent where email is on file.`,

//         type: 'success'

//       });

//       setShowAutoMarkConfirm(false);

//       setTimeout(() => setMessage({ text: '', type: '' }), 5000);

//     } catch (error) {

//       setMessage({ text: error.message, type: 'error' });

//     } finally {

//       setSubmitting(false);

//     }

//   };



//   useEffect(() => {

//     if (!selectedBatch?.students) {

//       setAttendanceMap({});

//       setRemarksMap({});

//       return;

//     }

//     // Only initialize student attendance after coach attendance is marked

//     if (coachAttendanceMarked) {

//       const initialAttendance = {};

//       const initialRemarks = {};

//       selectedBatch.students.forEach((student) => {

//         initialAttendance[student.student_id] = 'PRESENT';

//         initialRemarks[student.student_id] = '';

//       });

//       setAttendanceMap(initialAttendance);

//       setRemarksMap(initialRemarks);

//     }

//   }, [selectedBatchId, selectedBatch, coachAttendanceMarked]);



//   // Check attendance window when batch or date changes

//   useEffect(() => {

//     checkAttendanceWindow();

//   }, [selectedBatch, attendanceDate]);



//   // Framer Motion Variants

//   const containerVariants = {

//     hidden: { opacity: 0 },

//     show: { opacity: 1, transition: { staggerChildren: 0.1 } }

//   };



//   const itemVariants = {

//     hidden: { opacity: 0, y: 20 },

//     show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }

//   };



//   if (loading) {

//     return <Loader message="Loading batches…" />;

//   }



//   return (

//     <div className="relative min-h-full w-full">

//       {/* Background SVG Pattern */}

//       <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-[0.04] dark:opacity-[0.03]">

//         <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">

//           <defs>

//             <pattern id="sports-icons" width="200" height="200" patternUnits="userSpaceOnUse" patternTransform="rotate(-15)">

//               <g transform="translate(20, 20) scale(1.2)"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M12 7l-3 4h6z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M12 7V2m-3 9l-4 3m10-3l4 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></g>

//               <g transform="translate(120, 40) scale(1.2)"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M12 2v20M2 12h20M4.93 4.93c3.9 3.9 3.9 10.24 0 14.14M19.07 4.93c-3.9 3.9-3.9 10.24 0 14.14" fill="none" stroke="currentColor" strokeWidth="1.5" /></g>

//             </pattern>

//           </defs>

//           <rect width="100%" height="100%" fill="url(#sports-icons)" />

//         </svg>

//       </div>



//       <motion.section 

//         className="relative z-10 space-y-8 w-full max-w-6xl mx-auto"

//         initial="hidden"

//         animate="show"

//         variants={containerVariants}

//       >

//         {/* Header Section */}

//         <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/50 pb-6 relative">

//           <div className="absolute top-0 left-0 w-48 h-48 bg-primary/20 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

//           <div>

//             <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground flex items-center gap-3">

//               Attendance Register

//               <span className="flex h-3 w-3 relative ml-2">

//                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>

//                 <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>

//               </span>

//             </h1>

//             <p className="text-muted-foreground mt-2 text-sm font-medium">

//               Verify your presence via GPS, then mark your students.

//             </p>

//           </div>

//         </motion.div>



//         {/* Floating Alert Notification */}

//         <AnimatePresence>

//           {message.text && (

//             <motion.div 

//               initial={{ opacity: 0, y: -20, scale: 0.95 }} 

//               animate={{ opacity: 1, y: 0, scale: 1 }} 

//               exit={{ opacity: 0, y: -20, scale: 0.95 }}

//               className={`fixed top-6 right-6 z-50 rounded-xl px-6 py-4 shadow-xl border flex items-center gap-3 font-bold ${

//                 message.type === 'success' 

//                   ? 'bg-white dark:bg-card border-l-4 border-l-emerald-500 text-emerald-600 dark:text-emerald-400 border-y-border border-r-border' 

//                   : 'bg-white dark:bg-card border-l-4 border-l-red-500 text-red-600 dark:text-red-400 border-y-border border-r-border'

//               }`}

//             >

//               <AlertCircle className="w-6 h-6 flex-shrink-0" />

//               {message.text}

//             </motion.div>

//           )}

//         </AnimatePresence>



//         {/* Configuration Panel */}

//         <motion.div variants={itemVariants} className="bg-card border border-border shadow-sm rounded-2xl p-6 relative overflow-hidden group hover:shadow-md transition-shadow">

//           <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>

//           <h3 className="text-lg font-black tracking-tight mb-5 text-foreground flex items-center gap-2">

//             <span className="bg-primary/10 text-primary w-8 h-8 rounded-lg flex items-center justify-center text-sm">1</span> 

//             Session Setup

//           </h3>



//           <div className="grid gap-6 sm:grid-cols-2">

//             <div>

//               <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2" htmlFor="attendanceBatch">

//                 Select Training Batch

//               </label>

//               <select

//                 id="attendanceBatch"

//                 className="w-full bg-surface border border-border rounded-xl p-3.5 text-sm font-semibold focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer transition-all"

//                 value={selectedBatchId}

//                 onChange={(e) => {

//                   setSelectedBatchId(e.target.value);

//                   setCoachAttendanceMarked(false);

//                   setCoachAttendanceStatus(null);

//                   setSelectedCoachStatus('PRESENT');

//                   setAttendanceMap({});

//                   setRemarksMap({});

//                 }}

//               >

//                 <option value="" className="text-muted-foreground">-- Choose a batch --</option>

//                 {batches.map((batch) => (

//                   <option key={batch.batch_id} value={batch.batch_id}>

//                     {batch.name} {batch.timing ? `(${batch.timing})` : ''}

//                   </option>

//                 ))}

//               </select>

//             </div>

//             <div>

//               <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2" htmlFor="attendanceDate">

//                 Attendance Date

//               </label>

//               <input

//                 id="attendanceDate"

//                 type="date"

//                 className="w-full bg-surface border border-border rounded-xl p-3.5 text-sm font-semibold focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"

//                 value={attendanceDate}

//                 onChange={(e) => setAttendanceDate(e.target.value)}

//                 required

//               />

//             </div>

//           </div>

//         </motion.div>



//         {selectedBatch && (

//           <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">

            

//             {/* Session Info Wrapper */}

//             <motion.div variants={itemVariants} className="bg-card shadow-sm rounded-2xl border border-border overflow-hidden">

//               <SessionCard batch={selectedBatch} academy={selectedBatch.academy} />

//             </motion.div>



//             {/* Attendance Window Locked Alert */}

//             <AnimatePresence>

//               {!attendanceWindow.active && coachAttendanceMarked && (

//                 <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>

//                   <AttendanceLockedCard 

//                     reason={attendanceWindow.reason}

//                     canUnlock={false}

//                   />

//                 </motion.div>

//               )}

//             </AnimatePresence>



//             {/* Coach Attendance Section */}

//             {!coachAttendanceMarked && (

//               <motion.div variants={itemVariants} className="space-y-4">

//                 {!attendanceWindow.active && (

//                   <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border-l-4 border-l-amber-500 border-y border-r border-amber-200 dark:border-amber-500/20 rounded-xl text-amber-800 dark:text-amber-400">

//                     <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />

//                     <p className="text-sm font-semibold">

//                       Attendance window is closed. You can only mark yourself as Absent.

//                     </p>

//                   </div>

//                 )}

                

//                 <div className="bg-card shadow-sm rounded-2xl border border-border overflow-hidden relative">

//                   <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>

//                   <div className="p-1">

//                     <CoachAttendanceCard

//                       onMarkAttendance={handleCoachAttendance}

//                       disabled={coachAttendanceLoading}

//                       alreadyMarked={false}

//                       initialStatus={selectedCoachStatus}

//                       onStatusChange={setSelectedCoachStatus}

//                       windowClosed={!attendanceWindow.active}

//                     />

//                   </div>

//                 </div>



//                 {/* GPS Verification Wrapper */}

//                 <AnimatePresence>

//                   {selectedCoachStatus === 'PRESENT' && attendanceWindow.active && (

//                     <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-card shadow-sm rounded-2xl border border-border overflow-hidden">

//                       <GPSVerificationCard

//                         onLocationCapture={handleLocationCapture}

//                         gpsCoords={gpsCoords}

//                         gpsVerified={gpsVerified}

//                         gpsError={gpsError}

//                         distanceFromCenter={distanceFromCenter}

//                         sportCenter={sportCenter}

//                         attendanceRadius={attendanceRadius}

//                         required={true}

//                         disabled={false}

//                       />

//                     </motion.div>

//                   )}

//                 </AnimatePresence>



//                 {/* Closed Window Error Wrapper */}

//                 <AnimatePresence>

//                   {selectedCoachStatus === 'PRESENT' && !attendanceWindow.active && (

//                     <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/10 border-l-4 border-l-red-500 border-y border-r border-red-200 dark:border-red-500/20 rounded-xl text-red-800 dark:text-red-400 mt-4">

//                       <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />

//                       <p className="text-sm font-bold">

//                         You cannot mark yourself as Present after the attendance window closes. Please switch to Absent.

//                       </p>

//                     </motion.div>

//                   )}

//                 </AnimatePresence>

//               </motion.div>

//             )}



//             {coachAttendanceMarked && (

//               <motion.div variants={itemVariants} className="bg-card shadow-sm rounded-2xl border border-border overflow-hidden relative">

//                 <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>

//                 <div className="p-1">

//                   <CoachAttendanceCard

//                     onMarkAttendance={handleCoachAttendance}

//                     disabled={false}

//                     alreadyMarked={true}

//                     existingAttendance={coachAttendanceStatus}

//                   />

//                 </div>

//               </motion.div>

//             )}



//             {/* Student Attendance Section */}

//             {coachAttendanceMarked && attendanceWindow.active && selectedBatch.students?.length > 0 && (

//               <motion.div variants={itemVariants} className="space-y-6">

                

//                 <div className="bg-card shadow-sm rounded-2xl border border-border overflow-hidden">

//                   <AttendanceSummaryCard 

//                     attendanceMap={attendanceMap} 

//                     students={selectedBatch.students} 

//                   />

//                 </div>



//                 <div className="bg-card shadow-sm rounded-2xl border border-border overflow-hidden relative">

//                   <div className="absolute top-0 left-0 w-full h-1 bg-purple-500"></div>

//                   <StudentAttendanceCard

//                     students={selectedBatch.students}

//                     attendanceMap={attendanceMap}

//                     remarksMap={remarksMap}

//                     onAttendanceChange={handleStudentAttendanceChange}

//                     onRemarksChange={handleStudentRemarksChange}

//                     disabled={submitting}

//                     readOnly={!attendanceWindow.active}

//                   />

//                 </div>



//                 {/* Submit Controls Block */}

//                 <div className="bg-card shadow-sm rounded-2xl border border-border overflow-hidden p-6 relative">

//                   <h3 className="text-lg font-black tracking-tight mb-5 text-foreground flex items-center gap-2">

//                     <span className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 w-8 h-8 rounded-lg flex items-center justify-center text-sm">✓</span> 

//                     Finalize & Submit

//                   </h3>

                  

//                   <div className="flex flex-col sm:flex-row gap-4">

//                     <motion.button

//                       whileHover={{ scale: 1.02 }}

//                       whileTap={{ scale: 0.98 }}

//                       onClick={() => handleStudentAttendanceSubmit(false)}

//                       disabled={submitting}

//                       className="btn-primary flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-[0_4px_15px_rgba(16,185,129,0.3)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.4)] py-4 rounded-xl font-black text-sm"

//                     >

//                       {submitting ? 'Submitting…' : 'Submit Selected Attendance'}

//                     </motion.button>

                    

//                     <motion.button

//                       whileHover={{ scale: 1.02 }}

//                       whileTap={{ scale: 0.98 }}

//                       onClick={() => setShowAutoMarkConfirm(true)}

//                       disabled={submitting}

//                       className="px-6 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors font-black text-sm shadow-[0_4px_15px_rgba(245,158,11,0.3)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"

//                     >

//                       Auto-mark Unselected as Absent

//                     </motion.button>

//                   </div>



//                   {/* Auto-mark Confirmation Modal */}

//                   <AnimatePresence>

//                     {showAutoMarkConfirm && (

//                       <motion.div 

//                         initial={{ opacity: 0, height: 0, marginTop: 0 }} 

//                         animate={{ opacity: 1, height: 'auto', marginTop: '1.5rem' }} 

//                         exit={{ opacity: 0, height: 0, marginTop: 0 }}

//                         className="overflow-hidden"

//                       >

//                         <div className="p-5 bg-amber-50 dark:bg-amber-900/10 border-l-4 border-l-amber-500 border-y border-r border-amber-200 dark:border-amber-500/20 rounded-xl">

//                           <p className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-4">

//                             ⚠️ This will mark all remaining unmarked students as Absent. Are you absolutely sure?

//                           </p>

//                           <div className="flex flex-wrap gap-3">

//                             <motion.button

//                               whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}

//                               onClick={() => handleStudentAttendanceSubmit(true)}

//                               disabled={submitting}

//                               className="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-bold shadow-md"

//                             >

//                               Yes, Auto-mark & Submit

//                             </motion.button>

//                             <motion.button

//                               whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}

//                               onClick={() => setShowAutoMarkConfirm(false)}

//                               className="px-5 py-2.5 bg-surface border border-border text-foreground rounded-lg hover:bg-surface-secondary transition-colors text-sm font-bold shadow-sm"

//                             >

//                               Cancel

//                             </motion.button>

//                           </div>

//                         </div>

//                       </motion.div>

//                     )}

//                   </AnimatePresence>

//                 </div>

//               </motion.div>

//             )}



//             {/* Empty Students Fallback */}

//             <AnimatePresence>

//               {coachAttendanceMarked && (!selectedBatch.students || selectedBatch.students.length === 0) && (

//                 <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border border-dashed border-border shadow-sm rounded-2xl p-12 text-center">

//                   <span className="text-4xl opacity-50 block mb-4">👥</span>

//                   <h4 className="text-lg font-bold text-foreground mb-1">No Active Trainees</h4>

//                   <p className="text-muted-foreground text-sm font-medium">This batch currently has no active student enrollments.</p>

//                 </motion.div>

//               )}

//             </AnimatePresence>

            

//           </motion.div>

//         )}

//       </motion.section>

//     </div>

//   );

// }