import { useEffect, useState } from 'react';
import Loader from '../../components/Loader';
import Avatar from '../../components/Avatar';
import GPSCapture from '../../components/GPSCapture';
import MapPreview from '../../components/MapPreview';
import { coachPost } from '../../api/client';
import { useCoachBatches } from '../../context/CoachBatchesContext';
import { MapPin, AlertTriangle, CheckCircle } from 'lucide-react';

export default function CoachAttendancePage() {
  const { batches, loading } = useCoachBatches();
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [remarksMap, setRemarksMap] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [gpsCoords, setGpsCoords] = useState({ latitude: null, longitude: null, accuracy: null });
  const [gpsError, setGpsError] = useState('');
  const [gpsVerified, setGpsVerified] = useState(false);
  const [distanceFromCenter, setDistanceFromCenter] = useState(null);
  const [sportCenter, setSportCenter] = useState(null);
  const [attendanceRadius, setAttendanceRadius] = useState(100);

  const selectedBatch = batches.find((b) => String(b.batch_id) === String(selectedBatchId));

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

  useEffect(() => {
    if (!selectedBatch?.students) {
      setAttendanceMap({});
      setRemarksMap({});
      return;
    }
    const initialAttendance = {};
    const initialRemarks = {};
    selectedBatch.students.forEach((student) => {
      initialAttendance[student.student_id] = 'PRESENT';
      initialRemarks[student.student_id] = '';
    });
    setAttendanceMap(initialAttendance);
    setRemarksMap(initialRemarks);
  }, [selectedBatchId, selectedBatch]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedBatch) {
      setMessage({ text: 'Please select a batch first.', type: 'error' });
      return;
    }
    if (!selectedBatch.students?.length) {
      setMessage({ text: 'This batch has no active students.', type: 'error' });
      return;
    }
    if (!gpsCoords.latitude || !gpsCoords.longitude) {
      setMessage({ text: 'Please capture your location before marking attendance.', type: 'error' });
      return;
    }
    if (!gpsVerified) {
      setMessage({ text: 'You are outside the attendance radius. Please move closer to the sport center.', type: 'error' });
      return;
    }

    setSubmitting(true);
    setMessage({ text: '', type: '' });

    const records = selectedBatch.students.map((student) => ({
      student_id: student.student_id,
      status: attendanceMap[student.student_id] || 'PRESENT',
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
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      if (error.code === 'GPS_REQUIRED') {
        setGpsError('GPS coordinates are required for attendance. Please capture your location.');
      } else if (error.code === 'LOCATION_OUT_OF_RANGE') {
        setGpsError(`Location verification failed: ${error.message}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loader message="Loading batches…" />;
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Daily Attendance</h2>
        <p className="text-muted">Parents receive automatic email notifications.</p>
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
            onChange={(e) => setSelectedBatchId(e.target.value)}
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

      {/* GPS Location Section */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold">Location Verification</h3>
        </div>
        
        {!sportCenter && selectedBatch && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 mb-4">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              Sport center location not configured. Please contact admin to set up GPS verification.
            </p>
          </div>
        )}
        
        <GPSCapture
          onLocationCapture={handleLocationCapture}
          initialLocation={gpsCoords.latitude && gpsCoords.longitude ? {
            latitude: gpsCoords.latitude,
            longitude: gpsCoords.longitude
          } : null}
          required={true}
          label="Current Location"
          placeholder="Capture your current GPS location"
        />
        
        {gpsError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 mt-4">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{gpsError}</p>
          </div>
        )}

        {gpsVerified && sportCenter && distanceFromCenter !== null && (
          <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 mt-4">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              <span className="font-medium">Location verified:</span> You are {Math.round(distanceFromCenter)}m from the sport center (within {attendanceRadius}m radius).
            </p>
          </div>
        )}

        {/* Map Preview for visual validation */}
        {gpsCoords.latitude && gpsCoords.longitude && sportCenter && (
          <div className="mt-4">
            <MapPreview
              sportCenter={sportCenter}
              currentLocation={{
                latitude: gpsCoords.latitude,
                longitude: gpsCoords.longitude
              }}
              distance={distanceFromCenter || 0}
              radius={attendanceRadius}
              verified={gpsVerified}
            />
          </div>
        )}
      </div>

      {selectedBatch && (!selectedBatch.students || selectedBatch.students.length === 0) && (
        <p className="card text-center text-muted">This batch has no active students.</p>
      )}

      {selectedBatch?.students?.length > 0 && (
        <form className="space-y-3" onSubmit={handleSubmit}>
          {selectedBatch.students.map((student) => (
            <div
              key={student.student_id}
              className="grid gap-4 rounded-xl border border-border bg-[var(--color-card)] p-4 sm:grid-cols-[1fr_auto_1fr]"
            >
              <div className="flex items-center gap-3 font-semibold">
                <Avatar
                  src={student.profile_photo}
                  name={student.name}
                  size="sm"
                />
                {student.name}
              </div>
              <div className="flex flex-wrap gap-4">
                {['PRESENT', 'ABSENT', 'LATE'].map((status) => (
                  <label key={status} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`status_${student.student_id}`}
                      value={status}
                      checked={attendanceMap[student.student_id] === status}
                      onChange={() =>
                        setAttendanceMap((prev) => ({ ...prev, [student.student_id]: status }))
                      }
                    />
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </label>
                ))}
              </div>
              <input
                type="text"
                className="input-field"
                placeholder="Optional remarks"
                value={remarksMap[student.student_id] || ''}
                onChange={(e) =>
                  setRemarksMap((prev) => ({ ...prev, [student.student_id]: e.target.value }))
                }
              />
            </div>
          ))}
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Attendance & Notify Parents'}
          </button>
          {message.text && (
            <p className={message.type === 'success' ? 'alert-success' : 'alert-error'}>
              {message.text}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
