import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader';
import SessionCard from '../../components/attendance/SessionCard';
import CoachAttendanceCard from '../../components/attendance/CoachAttendanceCard';
import GPSVerificationCard from '../../components/attendance/GPSVerificationCard';
import StudentAttendanceCard from '../../components/attendance/StudentAttendanceCard';
import AttendanceSummaryCard from '../../components/attendance/AttendanceSummaryCard';
import AttendanceLockedCard from '../../components/attendance/AttendanceLockedCard';
import StickyWorkflowBar from '../../components/attendance/StickyWorkflowBar';
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
  const navigate = useNavigate();
  const { batches, loading } = useCoachBatches();
  const [selectedBatchId, setSelectedBatchId] = useState('');

  // Always use today's date
  const attendanceDate = new Date().toISOString().split('T')[0];

  const [isCalendarHoliday, setIsCalendarHoliday] = useState(false);
  const [holidayMessage, setHolidayMessage] = useState('');
  const [gpsSettings, setGpsSettings] = useState(null);

  useEffect(() => {
    const checkCalendarStatus = async () => {
      try {
        const res = await coachGet('/coach/calendar/dashboard');
        if (res?.success && res.data) {
          const status = res.data.todayStatus;
          if (status.includes('Holiday') || status.includes('Weekly Off') || status.includes('Parent Meeting')) {
            setIsCalendarHoliday(true);
            setHolidayMessage(`This date is marked as a ${status.split(' ').slice(1).join(' ')}. Attendance and Performance operations are disabled.`);
          }
        }
      } catch (err) {
        console.error('Failed to check calendar status:', err);
      }
    };
    
    const fetchGpsSettings = async () => {
      try {
        const res = await coachGet('/coach/gps-settings');
        if (res?.success && res.data) {
          setGpsSettings(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch GPS settings:', err);
      }
    };

    checkCalendarStatus();
    fetchGpsSettings();
  }, []);

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

  // 4-step workflow state
  const [step1GpsVerified, setStep1GpsVerified] = useState(false);
  const [step1GpsLoading, setStep1GpsLoading] = useState(false);
  const [step1TriggeredFromWorkflow, setStep1TriggeredFromWorkflow] = useState(false);
  const [step2AttendanceMarked, setStep2AttendanceMarked] = useState(false);
  const [step2AttendanceLoading, setStep2AttendanceLoading] = useState(false);
  const [step3BatchStarted, setStep3BatchStarted] = useState(false);
  const [step4BatchEnded, setStep4BatchEnded] = useState(false);

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

  const isGpsEnabledGlobally = gpsSettings?.gps_verification_enabled ?? true;
  const isGpsRequiredForCoach = isGpsEnabledGlobally && (gpsSettings?.require_coach_gps ?? true);
  const isGpsRequiredForSport = selectedBatch?.sport?.require_gps !== false;
  const gpsRequired = isGpsRequiredForCoach && isGpsRequiredForSport;

  // Ref for GPS capture to trigger programmatically
  const gpsCaptureRef = useRef(null);

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
    setAttendanceMap({});
    setRemarksMap({});
    fetchTodayCoachAttendance();
  }, [selectedBatchId]);

  useEffect(() => {
    if (selectedBatch?.sport) {
      // GPS Priority: Sport Custom GPS > Academy GPS
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
        if (gpsRequired) {
          setMessage({
            text: 'Location not configured. Please contact admin to configure GPS settings.',
            type: 'error'
          });
        }
      }

      // Attendance Radius Priority: Sport > Academy
      if (selectedBatch.sport?.attendance_radius_meters !== null && selectedBatch.sport?.attendance_radius_meters !== undefined) {
        setAttendanceRadius(selectedBatch.sport.attendance_radius_meters);
      } else if (selectedBatch.academy?.attendance_radius_meters) {
        setAttendanceRadius(selectedBatch.academy.attendance_radius_meters);
      } else {
        setAttendanceRadius(null);
        if (gpsRequired) {
          setMessage({
            text: 'Attendance radius not configured. Please contact admin to configure settings.',
            type: 'error'
          });
        }
      }
    }
  }, [selectedBatch, gpsSettings]);

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
      const roundedDistance = Math.round(distance);
      const roundedRadius = Math.round(attendanceRadius);
      setDistanceFromCenter(roundedDistance);
      const isWithinRadius = roundedDistance <= roundedRadius;
      setGpsVerified(isWithinRadius);

      if (!isWithinRadius) {
        setGpsError(`You are ${roundedDistance}m from the sport center. Attendance requires being within ${roundedRadius}m.`);
      } else {
        setGpsError('');
      }
    }
  }, [gpsCoords, sportCenter, attendanceRadius]);

  // Auto-complete Step 1 when GPS verification succeeds after being triggered from workflow
  useEffect(() => {
    if (step1TriggeredFromWorkflow && gpsVerified && gpsCoords.latitude && gpsCoords.longitude) {
      setStep1GpsVerified(true);
      setStep1GpsLoading(false);
      setStep1TriggeredFromWorkflow(false);
      setMessage({ text: 'GPS Verified Successfully', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      
      // Smooth scroll to Step 2
      setTimeout(() => {
        const step2Element = document.getElementById('section-mark-attendance');
        if (step2Element) {
          step2Element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [step1TriggeredFromWorkflow, gpsVerified, gpsCoords]);

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
      setStep1GpsVerified(false);
      setDistanceFromCenter(null);
      
      // If triggered from workflow and failed, stop loading
      if (step1TriggeredFromWorkflow) {
        setStep1GpsLoading(false);
        setStep1TriggeredFromWorkflow(false);
      }
    }
  };

  // Step 1: GPS Verification handler
  const handleStep1GpsVerify = async () => {
    setStep1GpsLoading(true);
    setStep1TriggeredFromWorkflow(true);
    setMessage({ text: 'Capturing Location...', type: '' });

    // Trigger GPS capture programmatically
    if (gpsCaptureRef.current && gpsCaptureRef.current.captureLocation) {
      gpsCaptureRef.current.captureLocation();
    } else {
      setStep1GpsLoading(false);
      setStep1TriggeredFromWorkflow(false);
      setMessage({ text: 'GPS capture not available. Please refresh the page.', type: 'error' });
    }
  };

  // Step 2: Mark Attendance handler
  const handleStep2MarkAttendance = async () => {
    if (!step1GpsVerified) {
      setMessage({ text: 'Please complete GPS verification first.', type: 'error' });
      return;
    }

    if (!attendanceWindow.active) {
      setMessage({ text: 'You cannot mark yourself as Present after the attendance window closes.', type: 'error' });
      return;
    }

    setStep2AttendanceLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const payload = {
        batch_id: selectedBatch.batch_id,
        date: attendanceDate,
        status: 'PRESENT',
        remarks: ''
      };

      if (gpsCoords.latitude && gpsCoords.longitude) {
        payload.latitude = gpsCoords.latitude;
        payload.longitude = gpsCoords.longitude;
        payload.accuracy = gpsCoords.accuracy;
      }

      const result = await coachPost('/coach/self-attendance', payload);

      setCoachAttendanceMarked(true);
      setCoachAttendanceStatus({ status: 'PRESENT', remarks: '', date: attendanceDate });
      setStep2AttendanceMarked(true);
      setMessage({ text: result.message || 'Attendance marked successfully', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);

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
      setStep2AttendanceLoading(false);
    }
  };

  // Step 3: Batch Check-in handler (uses existing handleStartBatch)
  const handleStep3BatchCheckIn = () => {
    if (!step2AttendanceMarked) {
      setMessage({ text: 'Please mark your attendance first.', type: 'error' });
      return;
    }
    // Use existing handleStartBatch logic
    handleStartBatch();
  };

  // Step 4: Batch Check-out handler (uses existing handleEndBatch)
  const handleStep4BatchCheckOut = () => {
    if (!step3BatchStarted) {
      setMessage({ text: 'Please start the batch session first.', type: 'error' });
      return;
    }
    // Use existing handleEndBatch logic
    handleEndBatch();
  };

  // Reset workflow when batch changes
  useEffect(() => {
    const isGpsEnabledGlobally = gpsSettings?.gps_verification_enabled ?? true;
    const isGpsRequiredForCoach = isGpsEnabledGlobally && (gpsSettings?.require_coach_gps ?? true);
    const isGpsRequiredForSport = selectedBatch?.sport?.require_gps !== false;
    const gpsRequired = isGpsRequiredForCoach && isGpsRequiredForSport;

    setStep1GpsVerified(!gpsRequired);
    setStep1GpsLoading(false);
    setStep2AttendanceMarked(false);
    setStep2AttendanceLoading(false);
    setStep3BatchStarted(false);
    setStep4BatchEnded(false);
  }, [selectedBatchId, selectedBatch, gpsSettings]);

  const handleCoachAttendance = async ({ status, remarks }) => {
    if (status === 'PRESENT' && !attendanceWindow.active) {
      setMessage({ text: 'You cannot mark yourself as Present after the attendance window closes. Please mark yourself as Absent instead.', type: 'error' });
      return;
    }

    const gpsRequired = selectedBatch?.sport?.require_gps !== false;
    if (status === 'PRESENT' && gpsRequired && !gpsVerified) {
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

      // Only load DRAFT attendance, ignore FINAL (locked) records
      existingRecords.forEach((record) => {
        if (record.student_id && record.submission_status === 'DRAFT') {
          initialAttendance[record.student_id] = record.status || 'PRESENT';
          initialRemarks[record.student_id] = record.remarks || '';
        }
      });

      const locked = existingRecords.some((r) => r.locked || r.submission_status === 'FINAL');
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
      setStep3BatchStarted(true);
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
      setStep4BatchEnded(true);
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

  if (isCalendarHoliday) {
    return (
      <div className="p-4 md:p-6 max-w-lg mx-auto mt-12 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl shadow-xl p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/20 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Attendance Locked</h2>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
          {holidayMessage || 'This date is marked as a Holiday. Attendance and Performance operations are disabled.'}
        </p>
        <button
          onClick={() => navigate('/coach/calendar')}
          className="w-full btn btn-primary py-3 font-bold text-xs uppercase tracking-wider"
        >
          View Calendar
        </button>
      </div>
    );
  }

  if (loading) {
    return <Loader message="Loading batches..." />;
  }

  // gpsRequired is computed at component body level
  // Helper variables for step progression state
  const step1Complete = coachAttendanceMarked && (selectedCoachStatus === 'ABSENT' || !gpsRequired || gpsVerified);
  const step2Complete = hasActiveSession || hasCompletedSession;
  const step3Complete = isAttendanceLocked || hasCompletedSession;

  return (
    <div className="w-full bg-transparent font-sans p-2 pb-24 space-y-6">

      {/* Toast Notification */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 rounded-xl px-5 py-4 shadow-xl border flex items-center gap-3 font-semibold text-sm max-w-sm ${message.type === 'success'
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
            className="space-y-6 max-w-6xl mx-auto"
          >
            {/* Header */}
            <motion.div
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                    Coach Attendance
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Today: {new Date().toDateString()} • Verify coordinates, check-in, and start trainee roll calls
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Batch Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {batches.length > 0 ? (
                batches.map((batch) => {
                  const isLiveSession = activeSessions.some((s) => s.batch_id === batch.batch_id && (s.status === 'LIVE' || s.status === 'LATE_START'));
                  const isCompletedSession = activeSessions.some((s) => s.batch_id === batch.batch_id && s.status === 'COMPLETED');

                  return (
                    <motion.div
                      key={batch.batch_id}
                      whileHover={{ y: -3, scale: 1.01 }}
                      onClick={() => {
                        setSelectedBatchId(batch.batch_id);
                        setCoachAttendanceMarked(false);
                        setCoachAttendanceStatus(null);
                        setSelectedCoachStatus('PRESENT');
                        setAttendanceMap({});
                        setRemarksMap({});
                      }}
                      className="card cursor-pointer border border-border bg-card p-5 rounded-2xl flex flex-col justify-between h-44 hover:shadow-md transition-all group relative overflow-hidden text-left"
                    >
                      {/* Status bar */}
                      <span className={`absolute top-0 left-0 w-full h-1.5 ${isLiveSession ? 'bg-red-500 animate-pulse' :
                          isCompletedSession ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
                        }`}></span>

                      <div className="w-full">
                        <div className="flex justify-between items-start">
                          <h4 className="font-extrabold text-lg text-slate-900 dark:text-white group-hover:text-primary transition truncate max-w-[70%]">
                            {batch.name}
                          </h4>

                          {/* Status Badge */}
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-extrabold shadow-sm ${isLiveSession ? 'bg-red-150 text-red-700 animate-pulse border border-red-200' :
                              isCompletedSession ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-250/50' :
                                'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                            {isLiveSession ? '● Live Now' : isCompletedSession ? 'Completed' : 'Upcoming'}
                          </span>
                        </div>

                        {batch.sport?.name && (
                          <span className="inline-block bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs px-2 py-0.5 rounded-lg mt-2 font-bold">
                            🏆 {batch.sport.name}
                          </span>
                        )}
                      </div>

                      <div className="w-full flex items-center justify-between text-xs text-muted-foreground font-bold border-t border-slate-100 dark:border-slate-800 pt-3 mt-4">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{batch.timing || 'Timings N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{batch.students_count || batch.students?.length || 0} Trainees</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="col-span-full py-16 text-center card border border-dashed border-border bg-card shadow-inner">
                  <p className="text-muted-foreground text-sm font-bold">No active training batches assigned to you.</p>
                </div>
              )}
            </div>

            {/* Steps guidelines panel */}
            <div className="card p-6 border border-border bg-card shadow-sm relative overflow-hidden text-left">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-yellow-500" /> How Attendance Capture Works
              </h3>
              <div className="grid md:grid-cols-4 gap-6">
                {[
                  { step: '1', title: 'GPS Location Pin', body: 'Capture GPS coordinates on your phone. Requires being within the sport center bounds.' },
                  { step: '2', title: 'Mark Check-In', body: 'Select Present/Absent to record your self-attendance logs.' },
                  { step: '3', title: 'Start Training Timer', body: 'Initiate batch session which triggers trainee roll list.' },
                  { step: '4', title: 'Trainee Roll Call', body: 'Submit and end session to lock and notify parents automatically.' }
                ].map((item, idx) => (
                  <div key={idx} className="space-y-2 relative">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
                      {item.step}
                    </span>
                    <h4 className="font-extrabold text-foreground text-sm">{item.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed font-bold">{item.body}</p>
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
            <div className="bg-card border border-border p-4 rounded-2xl shadow-sm flex items-center gap-4 text-left">
              <button
                onClick={() => setSelectedBatchId('')}
                className="btn btn-secondary w-10 h-10 p-0 flex items-center justify-center transition shadow-sm"
                title="Back to grid"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black text-foreground">{selectedBatch.name}</h2>
                  <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500">
                    🏆 {selectedBatch.sport?.name}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1 font-bold">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Timings: {selectedBatch.timing}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Total: {selectedBatch.students?.length || 0} enrolled</span>
                </div>
              </div>
            </div>

            {/* STEP PROGRESSION BAR */}
            <div className="bg-card border border-border p-4 rounded-2xl shadow-sm grid grid-cols-3 gap-2 text-center text-xs font-black text-muted-foreground select-none">
              <div className={`p-2 rounded-xl flex items-center justify-center gap-1.5 ${step1Complete ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-surface text-slate-500'
                }`}>
                <span className="w-5 h-5 rounded-full bg-current text-white dark:text-slate-950 flex items-center justify-center text-[10px] font-black">1</span>
                <span>Self Check-in</span>
              </div>
              <div className={`p-2 rounded-xl flex items-center justify-center gap-1.5 ${step2Complete ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                  step1Complete ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20 animate-pulse' : 'bg-surface text-slate-500'
                }`}>
                <span className="w-5 h-5 rounded-full bg-current text-white dark:text-slate-950 flex items-center justify-center text-[10px] font-black">2</span>
                <span>Session Active</span>
              </div>
              <div className={`p-2 rounded-xl flex items-center justify-center gap-1.5 ${step3Complete ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                  step2Complete ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20 animate-pulse' : 'bg-surface text-slate-500'
                }`}>
                <span className="w-5 h-5 rounded-full bg-current text-white dark:text-slate-950 flex items-center justify-center text-[10px] font-black">3</span>
                <span>Trainee Roll</span>
              </div>
            </div>

            {/* STEP 1: Coach Self Attendance Check-in Card */}
            {!coachAttendanceMarked && (
              <div className="space-y-6">
                {!attendanceWindow.active && (
                  <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400 text-xs font-bold shadow-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>Attendance window is currently closed. You can only mark yourself as Absent today.</p>
                  </div>
                )}

                {/* Mark Coach Attendance Card wrapper */}
                <div id="section-gps-verify" className="card border border-border bg-card overflow-hidden relative p-4">
                  <span className="absolute top-0 left-0 w-full h-1 bg-primary"></span>
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

                {/* GPS Capture panel */}
                {gpsRequired && selectedCoachStatus === 'PRESENT' && attendanceWindow.active && (
                  <div className="card border border-border bg-card overflow-hidden relative p-2">
                    <span className="absolute top-0 left-0 w-full h-1 bg-yellow-500"></span>
                    <div className="p-1">
                      {gpsVerified ? (
                        <div className="p-6 text-center space-y-3 font-sans">
                          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto text-xl shadow-inner">✓</div>
                          <h4 className="font-extrabold text-foreground">GPS Coordinates Verified</h4>
                          <p className="text-xs text-muted-foreground max-w-sm mx-auto font-bold">You are verified inside the sports center area bounds.</p>
                          {distanceFromCenter !== null && (
                            <span className="inline-block px-3 py-1 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold rounded-lg">
                              Distance from center: {distanceFromCenter.toFixed(1)}m (Allowed: {attendanceRadius}m)
                            </span>
                          )}
                        </div>
                      ) : (
                        <GPSVerificationCard
                          ref={gpsCaptureRef}
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
                      {/* 4-Step Workflow */}
                <div className="sticky top-4 z-40 space-y-4 bg-card/95 backdrop-blur-sm p-4 rounded-2xl border border-border shadow-sm">
                  {gpsRequired && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${step1GpsVerified
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                          : 'border-border bg-card'
                        }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${step1GpsVerified ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                        {step1GpsVerified ? '✓' : '1'}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-extrabold text-foreground text-sm">Step 1: GPS Verification</h4>
                        {step1GpsVerified && (
                          <div className="mt-2 space-y-1 text-xs text-muted-foreground font-bold">
                            <p>📍 Capture your current GPS location</p>
                            <p>Latitude: {gpsCoords.latitude?.toFixed(6)}</p>
                            <p>Longitude: {gpsCoords.longitude?.toFixed(6)}</p>
                            <p>Accuracy: {gpsCoords.accuracy}m</p>
                            <p className="text-emerald-600 dark:text-emerald-450 font-black">✅ GPS Verified Successfully</p>
                          </div>
                        )}
                      </div>
                      {!step1GpsVerified ? (
                        <button
                          onClick={handleStep1GpsVerify}
                          disabled={step1GpsLoading || !gpsVerified}
                          className="btn btn-primary text-xs flex-shrink-0"
                        >
                          {step1GpsLoading ? 'Verifying...' : 'Verify GPS'}
                        </button>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-450 font-black text-xs flex-shrink-0">Completed</span>
                      )}
                    </motion.div>
                  )}

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: step1GpsVerified ? 1 : 0.5, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${step2AttendanceMarked
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                        : step1GpsVerified
                          ? 'border-border bg-card'
                          : 'border-border bg-card/50 opacity-50'
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${step2AttendanceMarked ? 'bg-emerald-500 text-white' :
                        step1GpsVerified ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                      {step2AttendanceMarked ? '✓' : gpsRequired ? '2' : '1'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-extrabold text-foreground text-sm">Step {gpsRequired ? '2' : '1'}: Mark Your Attendance</h4>
                      {step2AttendanceMarked && (
                        <p className="mt-2 text-xs text-emerald-605 dark:text-emerald-455 font-black">✅ Attendance Marked Successfully</p>
                      )}
                    </div>
                    {!step2AttendanceMarked && step1GpsVerified ? (
                      <button
                        onClick={handleStep2MarkAttendance}
                        disabled={step2AttendanceLoading}
                        className="btn btn-primary text-xs flex-shrink-0"
                      >
                        {step2AttendanceLoading ? 'Marking...' : 'Mark Attendance'}
                      </button>
                    ) : step2AttendanceMarked ? (
                      <span className="text-emerald-600 dark:text-emerald-455 font-black text-xs flex-shrink-0">Completed</span>
                    ) : (
                      <span className="text-muted-foreground text-xs flex-shrink-0 font-bold">Locked</span>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: step2AttendanceMarked ? 1 : 0.5, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${step3BatchStarted
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                        : step2AttendanceMarked
                          ? 'border-border bg-card'
                          : 'border-border bg-card/50 opacity-50'
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${step3BatchStarted ? 'bg-emerald-500 text-white' :
                        step2AttendanceMarked ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                      {step3BatchStarted ? '✓' : gpsRequired ? '3' : '2'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-extrabold text-foreground text-sm">Step {gpsRequired ? '3' : '2'}: Batch Check-in</h4>
                      {step3BatchStarted && (
                        <p className="mt-2 text-xs text-emerald-605 dark:text-emerald-455 font-black">✅ Batch Started Successfully</p>
                      )}
                    </div>
                    {!step3BatchStarted && step2AttendanceMarked ? (
                      <button
                        onClick={handleStep3BatchCheckIn}
                        disabled={sessionLoading}
                        className="btn btn-primary text-xs flex-shrink-0"
                      >
                        {sessionLoading ? 'Starting...' : 'Start Batch'}
                      </button>
                    ) : step3BatchStarted ? (
                      <span className="text-emerald-600 dark:text-emerald-455 font-black text-xs flex-shrink-0">Completed</span>
                    ) : (
                      <span className="text-muted-foreground text-xs flex-shrink-0 font-bold">Locked</span>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: step3BatchStarted ? 1 : 0.5, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${step4BatchEnded
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                        : step3BatchStarted
                          ? 'border-border bg-card'
                          : 'border-border bg-card/50 opacity-50'
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${step4BatchEnded ? 'bg-emerald-500 text-white' :
                        step3BatchStarted ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                      {step4BatchEnded ? '✓' : gpsRequired ? '4' : '3'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-extrabold text-foreground text-sm">Step {gpsRequired ? '4' : '3'}: Batch Check-out</h4>
                      {step4BatchEnded && (
                        <p className="mt-2 text-xs text-emerald-605 dark:text-emerald-455 font-black">✅ Batch Ended Successfully</p>
                      )}
                    </div>
                    {!step4BatchEnded && step3BatchStarted ? (
                      <button
                        onClick={handleStep4BatchCheckOut}
                        disabled={sessionLoading}
                        className="btn btn-primary text-xs flex-shrink-0"
                      >
                        {sessionLoading ? 'Ending...' : 'End Batch'}
                      </button>
                    ) : step4BatchEnded ? (
                      <span className="text-emerald-600 dark:text-emerald-455 font-black text-xs flex-shrink-0">Completed</span>
                    ) : (
                      <span className="text-muted-foreground text-xs flex-shrink-0 font-bold">Locked</span>
                    )}
                  </motion.div>
                </div>
              </div>
            )}

            {/* STEP 2: Live training session manager */}
            {coachAttendanceMarked && !isAttendanceLocked && !hasCompletedSession && (
              <div id="section-mark-attendance" className="card border border-border bg-card shadow-sm rounded-2xl overflow-hidden relative text-left">
                <span className={`absolute top-0 left-0 w-full h-1 ${hasActiveSession ? 'bg-rose-500' : 'bg-primary'}`}></span>
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h3 className="font-extrabold text-foreground flex items-center gap-2">
                      {hasActiveSession ? (
                        <>
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                          <span>LIVE Training Session Active</span>
                        </>
                      ) : (
                        <span>Start Batch Session</span>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground font-bold mt-1">
                      {hasActiveSession
                        ? `Timer started. Trainee attendance list is active below. • Elapsed: ${formatTime(elapsedTime)}`
                        : 'Your check-in is complete. GPS location is locked. Click below to start timer.'
                      }
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {hasActiveSession ? (
                      <span className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold rounded-xl flex items-center gap-1.5">
                        <Play className="w-3.5 h-3.5 fill-current animate-pulse text-emerald-500" /> Active Session
                      </span>
                    ) : (
                      <button
                        onClick={handleStartBatch}
                        disabled={sessionLoading || !gpsVerified || coachAttendanceStatus?.status === 'ABSENT'}
                        className="btn btn-primary text-xs flex items-center gap-1.5"
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
            <div className="card border border-border bg-card shadow-sm rounded-2xl overflow-hidden">
              <SessionCard
                batch={selectedBatch}
                academy={selectedBatch.academy}
                activeSession={currentActiveSession}
              />
            </div>

            {/* Verified state summary display */}
            {coachAttendanceMarked && (
              <div className="card border border-border bg-card shadow-sm rounded-2xl overflow-hidden relative text-left">
                <span className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></span>
                <div className="p-4 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase block">Your Status</span>
                    <strong className="text-foreground">{coachAttendanceStatus?.status}</strong>
                  </div>
                  {gpsCoords.latitude && (
                    <div>
                      <span className="text-[10px] text-muted-foreground font-bold uppercase block">Capture Location</span>
                      <span className="font-mono font-bold text-muted-foreground">{gpsCoords.latitude.toFixed(4)}, {gpsCoords.longitude.toFixed(4)}</span>
                    </div>
                  )}
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold uppercase tracking-wider rounded text-[9px] shadow-sm">
                    Verified Check-in
                  </span>
                </div>
              </div>
            )}

            {/* STEP 3: Trainee Roll Call list card */}
            {coachAttendanceMarked && hasActiveSession && !isAttendanceLocked && (
              <div id="section-batch-checkin" className="space-y-6">
                {selectedBatch.students?.length > 0 ? (
                  <>
                    <div className="card border border-border bg-card shadow-sm rounded-2xl overflow-hidden">
                      <AttendanceSummaryCard
                        attendanceMap={attendanceMap}
                        students={selectedBatch.students}
                      />
                    </div>

                    <div className="card border border-border bg-card shadow-sm rounded-2xl overflow-hidden relative text-left">
                      <span className="absolute top-0 left-0 w-full h-1 bg-purple-550"></span>
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
                  <div className="card border border-dashed border-border bg-card shadow-sm rounded-2xl p-12 text-center">
                    <span className="text-4xl opacity-50 block mb-4">👥</span>
                    <h4 className="text-lg font-bold text-foreground mb-1">No Trainees Registered</h4>
                    <p className="text-muted-foreground text-xs font-semibold">Trainee accounts need to be enrolled in this batch by admins.</p>
                  </div>
                )}

                {/* Finalize submit actions card */}
                <div id="section-batch-checkout" className="card border border-border bg-card shadow-sm rounded-2xl p-6 relative overflow-hidden text-left">
                  <span className="absolute top-0 left-0 w-full h-1.5 bg-red-500"></span>
                  <h3 className="text-lg font-extrabold tracking-tight mb-2 text-foreground flex items-center gap-2">
                    🛡 Finish Session & Finalize Attendance
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4 font-bold">
                    Submit the training roster to notify parents and close the timer logs. This will lock records permanently.
                  </p>

                  <div className="flex gap-4">
                    <button
                      onClick={handleEndBatch}
                      disabled={sessionLoading}
                      className="btn btn-danger w-full flex items-center justify-center gap-1.5"
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

      {/* ══════════════════════════════════════════════════════════
           STICKY WORKFLOW BAR — 4-Step Interactive Progress Panel
          ══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedBatch && (
          <StickyWorkflowBar
            batchName={selectedBatch.name}
            /* Step state derived entirely from existing API/state — no new logic */
            step1Done={gpsVerified && step1GpsVerified}
            step1Loading={step1GpsLoading}
            step1Active={!step1GpsVerified}
            onStep1={handleStep1GpsVerify}
            step1Disabled={step1GpsLoading}

            step2Done={coachAttendanceMarked}
            step2Loading={step2AttendanceLoading}
            step2Active={step1GpsVerified && !coachAttendanceMarked}
            onStep2={handleStep2MarkAttendance}
            step2Disabled={step2AttendanceLoading || !step1GpsVerified}

            step3Done={step3BatchStarted || hasActiveSession || hasCompletedSession}
            step3Loading={sessionLoading && !step3BatchStarted && !hasActiveSession}
            step3Active={coachAttendanceMarked && !step3BatchStarted && !hasActiveSession && !hasCompletedSession}
            onStep3={handleStep3BatchCheckIn}
            step3Disabled={sessionLoading || !coachAttendanceMarked}

            step4Done={step4BatchEnded || hasCompletedSession || isAttendanceLocked}
            step4Loading={sessionLoading && (step3BatchStarted || hasActiveSession) && !step4BatchEnded && !hasCompletedSession}
            step4Active={(step3BatchStarted || hasActiveSession) && !step4BatchEnded && !hasCompletedSession && !isAttendanceLocked}
            onStep4={handleStep4BatchCheckOut}
            step4Disabled={sessionLoading || (!step3BatchStarted && !hasActiveSession)}

            allDone={step4BatchEnded || hasCompletedSession || isAttendanceLocked}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
