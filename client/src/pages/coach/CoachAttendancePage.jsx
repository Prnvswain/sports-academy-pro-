import { useEffect, useState } from 'react';
import Loader from '../../components/Loader';
import Avatar from '../../components/Avatar';
import { coachPost } from '../../api/client';
import { useCoachBatches } from '../../context/CoachBatchesContext';
import { MapPin, AlertTriangle } from 'lucide-react';

export default function CoachAttendancePage() {
  const { batches, loading } = useCoachBatches();
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [remarksMap, setRemarksMap] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [gpsCoords, setGpsCoords] = useState({ latitude: null, longitude: null });
  const [gpsError, setGpsError] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);

  const selectedBatch = batches.find((b) => String(b.batch_id) === String(selectedBatchId));

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

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setGettingLocation(false);
        setMessage({ text: 'Location captured successfully', type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      },
      (error) => {
        setGettingLocation(false);
        let errorMessage = 'Failed to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable GPS to mark attendance.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
          default:
            errorMessage = 'An unknown error occurred getting location.';
        }
        setGpsError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

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
        longitude: gpsCoords.longitude
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold">Location Verification</h3>
          </div>
          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={gettingLocation}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-gray-400 flex items-center gap-2"
          >
            {gettingLocation ? 'Getting Location...' : 'Capture Current Location'}
          </button>
        </div>
        
        {gpsError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{gpsError}</p>
          </div>
        )}

        {gpsCoords.latitude && gpsCoords.longitude && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              <span className="font-medium">Location captured:</span> 
              Lat: {gpsCoords.latitude.toFixed(7)}, Lon: {gpsCoords.longitude.toFixed(7)}
            </p>
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
