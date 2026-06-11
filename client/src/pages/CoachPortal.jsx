import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar, { NavbarActions } from '../components/Navbar';
import Loader from '../components/Loader';
import { clearCoachToken, coachGet, coachPost } from '../api/client';
import { CoachDailyNotes, CoachFeeCollection, CoachSelfAttendance } from './coach/CoachExtras';

export default function CoachPortal() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [remarksMap, setRemarksMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const selectedBatch = batches.find((b) => String(b.batch_id) === String(selectedBatchId));
  const allStudents = batches.flatMap((b) => b.students || []);

  const loadBatches = useCallback(async () => {
    setLoading(true);
    try {
      const [batchRes, dashRes] = await Promise.all([
        coachGet('/coach/batches'),
        coachGet('/coach/dashboard')
      ]);
      const batchPayload = batchRes.data || {};
      setBatches(batchPayload.batches || batchPayload || []);
      setDashboard(dashRes.data || null);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      if (error.status === 401) {
        clearCoachToken();
        navigate('/coach/login');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  useEffect(() => {
    if (!selectedBatch || !selectedBatch.students) {
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

  const handleStatusChange = (studentId, status) => {
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleRemarksChange = (studentId, value) => {
    setRemarksMap((prev) => ({ ...prev, [studentId]: value }));
  };

  const handleLogout = () => {
    clearCoachToken();
    navigate('/coach/login');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedBatch) {
      setMessage({ text: 'Please select a batch first.', type: 'error' });
      return;
    }
    if (!selectedBatch.students || selectedBatch.students.length === 0) {
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

  return (
    <div className="min-h-screen bg-surface">
      <Navbar brandTo="/coach">
        <NavbarActions>
          <button type="button" className="btn-secondary" onClick={handleLogout}>
            Sign Out
          </button>
        </NavbarActions>
      </Navbar>

      <main className="mx-auto max-w-4xl px-4 py-8 lg:px-6">
        {dashboard && (
          <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="kpi-card">
              <span className="kpi-label">Coach</span>
              <span className="kpi-value text-base">{dashboard.coach_name}</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Academy</span>
              <span className="kpi-value text-base">{dashboard.academy_name}</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Today&apos;s Students</span>
              <span className="kpi-value">{dashboard.todays_students ?? 0}</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Pending Fees</span>
              <span className="kpi-value text-warning">{dashboard.pending_fees_count ?? 0}</span>
            </div>
          </section>
        )}
        <section className="mb-10">
          <h2 className="text-2xl font-bold">Your Assigned Training Blocks</h2>
          <p className="text-muted">
            Select a batch below to mark daily attendance. Parents receive automatic email notifications.
          </p>
          {loading ? (
            <div className="mt-6">
              <Loader message="Loading assigned batches…" />
            </div>
          ) : batches.length === 0 ? (
            <p className="card mt-6 text-center text-muted">No batches assigned to you yet.</p>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {batches.map((batch) => (
                <article key={batch.batch_id} className="card">
                  <h3 className="font-bold">{batch.name}</h3>
                  <p className="mt-1 text-sm text-muted">
                    Timing: {batch.timing || '—'} · Sport: {batch.sport?.name || '—'} · Students:{' '}
                    {batch.students?.length ?? 0}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-bold">Daily Attendance</h2>
          <div className="card mt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="attendanceBatch">Select Batch</label>
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
                <label className="label" htmlFor="attendanceDate">Date</label>
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
            {selectedBatch && (
              <p className="mt-4 text-sm text-muted">
                Marking attendance for: <strong>{selectedBatch.name}</strong> —{' '}
                {selectedBatch.students?.length ?? 0} students
              </p>
            )}
          </div>

          {selectedBatch && (!selectedBatch.students || selectedBatch.students.length === 0) && (
            <p className="card mt-4 text-center text-muted">This batch has no active students enrolled.</p>
          )}

          {selectedBatch && selectedBatch.students && selectedBatch.students.length > 0 && (
            <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
              {selectedBatch.students.map((student) => (
                <div
                  key={student.student_id}
                  className="grid gap-4 rounded-xl border border-border bg-[var(--color-card)] p-4 sm:grid-cols-[1fr_auto_1fr]"
                >
                  <div className="font-semibold">{student.name}</div>
                  <div className="flex gap-4" role="radiogroup" aria-label={`Attendance for ${student.name}`}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                      <input
                        type="radio"
                        name={`status_${student.student_id}`}
                        value="PRESENT"
                        checked={attendanceMap[student.student_id] === 'PRESENT'}
                        onChange={() => handleStatusChange(student.student_id, 'PRESENT')}
                      />
                      Present
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                      <input
                        type="radio"
                        name={`status_${student.student_id}`}
                        value="ABSENT"
                        checked={attendanceMap[student.student_id] === 'ABSENT'}
                        onChange={() => handleStatusChange(student.student_id, 'ABSENT')}
                      />
                      Absent
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                      <input
                        type="radio"
                        name={`status_${student.student_id}`}
                        value="LATE"
                        checked={attendanceMap[student.student_id] === 'LATE'}
                        onChange={() => handleStatusChange(student.student_id, 'LATE')}
                      />
                      Late
                    </label>
                  </div>
                  <div>
                    <label className="sr-only" htmlFor={`remarks_${student.student_id}`}>
                      Remarks for {student.name}
                    </label>
                    <input
                      id={`remarks_${student.student_id}`}
                      type="text"
                      className="input-field"
                      placeholder="Optional remarks"
                      value={remarksMap[student.student_id] || ''}
                      onChange={(e) => handleRemarksChange(student.student_id, e.target.value)}
                    />
                  </div>
                </div>
              ))}
              <button type="submit" className="btn-primary w-full" disabled={submitting}>
                {submitting ? 'Submitting attendance…' : 'Submit Attendance & Notify Parents'}
              </button>
              {message.text && (
                <p className={message.type === 'success' ? 'alert-success' : 'alert-error'} role="alert">
                  {message.text}
                </p>
              )}
            </form>
          )}
        </section>

        <CoachSelfAttendance />
        <CoachFeeCollection students={allStudents} />
        <CoachDailyNotes students={allStudents} />
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted">
        SAMS Coach Portal — Attendance triggers instant parent email confirmations.
      </footer>
    </div>
  );
}
