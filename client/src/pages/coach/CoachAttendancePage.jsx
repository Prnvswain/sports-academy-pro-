import { useEffect, useState } from 'react';
import Loader from '../../components/Loader';
import Avatar from '../../components/Avatar';
import { coachPost } from '../../api/client';
import { useCoachBatches } from '../../context/CoachBatchesContext';

export default function CoachAttendancePage() {
  const { batches, loading } = useCoachBatches();
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [remarksMap, setRemarksMap] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

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
        records
      });
      setMessage({
        text: `${result.message} Parent notifications are being sent where email is on file.`,
        type: 'success'
      });
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
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
