import { useEffect, useState } from 'react';
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
      // If no attendance found, that's expected
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

  // Fetch coach attendance when date or batch changes
  useEffect(() => {
    fetchTodayCoachAttendance();
  }, [attendanceDate, selectedBatchId]);

  // Load sport center location when batch is selected
  useEffect(() => {
    if (selectedBatch?.sport) {
      // Use sport location if custom, otherwise use academy location
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
      
      // Set attendance radius (sport-specific or academy default)
      setAttendanceRadius(selectedBatch.sport.attendance_radius_meters || selectedBatch.academy.attendance_radius_meters || 100);
    }
  }, [selectedBatch]);

  // Calculate distance when GPS coordinates are captured
  useEffect(() => {
    if (gpsCoords.latitude && gpsCoords.longitude && sportCenter) {
      const distance = calculateDistance(
        gpsCoords.latitude,
        gpsCoords.longitude,
        sportCenter.latitude,
        sportCenter.longitude
      );
      setDistanceFromCenter(distance);
      
      // Verify if within radius
      const isWithinRadius = distance <= attendanceRadius;
      setGpsVerified(isWithinRadius);
      
      if (!isWithinRadius) {
        setGpsError(`You are ${Math.round(distance)}m from the sport center. Attendance requires being within ${attendanceRadius}m.`);
      } else {
        setGpsError('');
      }
    }
  }, [gpsCoords, sportCenter, attendanceRadius]);

  // Haversine formula for distance calculation
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
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

  // Check attendance window based on batch timing
  const checkAttendanceWindow = () => {
    if (!selectedBatch?.timing) {
      setAttendanceWindow({ active: true, reason: '' });
      return;
    }

    // Parse batch timing (assuming format like "09:00-10:00")
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

    // Add grace periods (10 min before, 15 min after)
    const graceBefore = 10 * 60 * 1000; // 10 minutes in ms
    const graceAfter = 15 * 60 * 1000; // 15 minutes in ms

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

  // Handle GPS location capture from GPSCapture component
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

  // Handle coach attendance marking
  const handleCoachAttendance = async ({ status, remarks }) => {
    // Prevent marking Present when window is closed
    if (status === 'PRESENT' && !attendanceWindow.active) {
      setMessage({ text: 'You cannot mark yourself as Present after the attendance window closes. Please mark yourself as Absent instead.', type: 'error' });
      return;
    }
    
    // Require GPS verification for Present
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

      // Include GPS data if present
      if (status === 'PRESENT' && gpsCoords.latitude && gpsCoords.longitude) {
        payload.latitude = gpsCoords.latitude;
        payload.longitude = gpsCoords.longitude;
        payload.accuracy = gpsCoords.accuracy;
      }

      const result = await coachPost('/coach/self-attendance', payload);
      
      setCoachAttendanceMarked(true);
      setCoachAttendanceStatus({ status, remarks, date: attendanceDate });
      setMessage({ text: result.message || 'Coach attendance marked successfully', type: 'success' });
      
      // Initialize student attendance after coach attendance
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

  // Handle student attendance change
  const handleStudentAttendanceChange = (studentId, status) => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
  };

  // Handle student remarks change
  const handleStudentRemarksChange = (studentId, remarks) => {
    setRemarksMap(prev => ({ ...prev, [studentId]: remarks }));
  };

  // Handle student attendance submission
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

    // Auto-mark remaining students as absent if requested
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
    // Only initialize student attendance after coach attendance is marked
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

  // Check attendance window when batch or date changes
  useEffect(() => {
    checkAttendanceWindow();
  }, [selectedBatch, attendanceDate]);

  if (loading) {
    return <Loader message="Loading batches…" />;
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Daily Attendance</h2>
        <p className="text-muted">Mark your attendance first, then mark student attendance.</p>
      </div>

      <div className="card grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="attendanceBatch">
            Select Batch
          </label>
          <select
            id="attendanceBatch"
            className="input-field"
            value={selectedBatchId}
            onChange={(e) => {
              setSelectedBatchId(e.target.value);
              // Reset coach attendance state when switching batches (attendance is now per-batch)
              setCoachAttendanceMarked(false);
              setCoachAttendanceStatus(null);
              setSelectedCoachStatus('PRESENT');
              setAttendanceMap({});
              setRemarksMap({});
            }}
          >
            <option value="">Select a batch…</option>
            {batches.map((batch) => (
              <option key={batch.batch_id} value={batch.batch_id}>
                {batch.name} ({batch.timing || 'no time'})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="attendanceDate">
            Date
          </label>
          <input
            id="attendanceDate"
            type="date"
            className="input-field"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
            required
          />
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400' 
            : 'bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
        }`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {selectedBatch && (
        <>
          {/* Session Details Card */}
          <SessionCard batch={selectedBatch} academy={selectedBatch.academy} />

          {/* Attendance Window Locked - Only for student attendance */}
          {!attendanceWindow.active && coachAttendanceMarked && (
            <AttendanceLockedCard 
              reason={attendanceWindow.reason}
              canUnlock={false}
            />
          )}

          {/* Coach Attendance - Always available for marking absence, even after window closes */}
          {!coachAttendanceMarked && (
            <>
              {!attendanceWindow.active && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-400 mb-4">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">
                    Attendance window is closed. You can only mark yourself as Absent.
                  </p>
                </div>
              )}
              
              <CoachAttendanceCard
                onMarkAttendance={handleCoachAttendance}
                disabled={coachAttendanceLoading}
                alreadyMarked={false}
                initialStatus={selectedCoachStatus}
                onStatusChange={setSelectedCoachStatus}
                windowClosed={!attendanceWindow.active}
              />

              {/* GPS Verification Card - Only shown when coach selects Present and window is active */}
              {selectedCoachStatus === 'PRESENT' && attendanceWindow.active && (
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
              )}

              {/* Show error if trying to mark Present when window is closed */}
              {selectedCoachStatus === 'PRESENT' && !attendanceWindow.active && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">
                    You cannot mark yourself as Present after the attendance window closes. Please mark yourself as Absent instead.
                  </p>
                </div>
              )}
            </>
          )}

          {coachAttendanceMarked && (
            <CoachAttendanceCard
              onMarkAttendance={handleCoachAttendance}
              disabled={false}
              alreadyMarked={true}
              existingAttendance={coachAttendanceStatus}
            />
          )}

          {/* Student Attendance Section - Only unlocked after coach attendance AND window is active */}
          {coachAttendanceMarked && attendanceWindow.active && selectedBatch.students?.length > 0 && (
            <>
              <AttendanceSummaryCard 
                attendanceMap={attendanceMap} 
                students={selectedBatch.students} 
              />

              <StudentAttendanceCard
                students={selectedBatch.students}
                attendanceMap={attendanceMap}
                remarksMap={remarksMap}
                onAttendanceChange={handleStudentAttendanceChange}
                onRemarksChange={handleStudentRemarksChange}
                disabled={submitting}
                readOnly={!attendanceWindow.active}
              />

              {/* Submit Button with Auto-mark Option */}
              <div className="card">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => handleStudentAttendanceSubmit(false)}
                    disabled={submitting}
                    className="btn-primary flex-1"
                  >
                    {submitting ? 'Submitting…' : 'Submit Attendance'}
                  </button>
                  
                  <button
                    onClick={() => setShowAutoMarkConfirm(true)}
                    disabled={submitting}
                    className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Auto-mark Absent & Submit
                  </button>
                </div>

                {showAutoMarkConfirm && (
                  <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-400 mb-3">
                      This will mark all unmarked students as Absent. Are you sure?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStudentAttendanceSubmit(true)}
                        disabled={submitting}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                      >
                        Yes, Auto-mark & Submit
                      </button>
                      <button
                        onClick={() => setShowAutoMarkConfirm(false)}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Show message when student attendance is locked due to window closure */}
          {coachAttendanceMarked && !attendanceWindow.active && selectedBatch.students?.length > 0 && (
            <AttendanceLockedCard 
              reason={attendanceWindow.reason}
              canUnlock={false}
            />
          )}

          {coachAttendanceMarked && (!selectedBatch.students || selectedBatch.students.length === 0) && (
            <div className="card text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">This batch has no active students.</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
