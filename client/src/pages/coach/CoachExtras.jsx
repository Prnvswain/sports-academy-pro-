import { useState } from 'react';
import { coachPost } from '../../api/client';

export function CoachDailyNotes({ students }) {
  const [studentId, setStudentId] = useState('');
  const [form, setForm] = useState({
    performance_notes: '',
    behaviour_notes: '',
    achievements: '',
    improvement_areas: ''
  });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentId) {
      setMessage({ text: 'Select a student.', type: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const result = await coachPost('/coach/notes', {
        student_id: parseInt(studentId, 10),
        ...form
      });
      setMessage({ text: result.message, type: 'success' });
      setForm({
        performance_notes: '',
        behaviour_notes: '',
        achievements: '',
        improvement_areas: ''
      });
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card space-y-4">
      <h3 className="font-bold">Daily Student Notes</h3>
      <p className="text-sm text-muted">Notes are emailed to parents automatically.</p>
      <select className="input-field" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
        <option value="">Select student…</option>
        {students.map((s) => (
          <option key={s.student_id} value={s.student_id}>{s.name}</option>
        ))}
      </select>
      {['performance_notes', 'behaviour_notes', 'achievements', 'improvement_areas'].map((field) => (
        <div key={field}>
          <label className="label capitalize">{field.replace(/_/g, ' ')}</label>
          <textarea
            name={field}
            className="input-field min-h-[72px]"
            value={form[field]}
            onChange={handleChange}
          />
        </div>
      ))}
      <button type="button" className="btn-primary w-full" disabled={submitting} onClick={handleSubmit}>
        {submitting ? 'Sending…' : 'Save & Email Parent'}
      </button>
      {message.text && (
        <p className={message.type === 'success' ? 'alert-success' : 'alert-error'}>{message.text}</p>
      )}
    </div>
  );
}

export function CoachFeeCollection({ students }) {
  const [form, setForm] = useState({
    student_id: '',
    amount: '',
    method: 'upi',
    remarks: '',
    proof_url: ''
  });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await coachPost('/coach/payments', {
        student_id: parseInt(form.student_id, 10),
        amount: parseFloat(form.amount),
        method: form.method,
        remarks: form.remarks || undefined,
        proof_url: form.proof_url || undefined
      });
      setMessage({ text: result.message, type: 'success' });
      setForm({ student_id: '', amount: '', method: 'upi', remarks: '', proof_url: '' });
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card space-y-4">
      <h3 className="font-bold">Record Fee Payment</h3>
      <p className="text-sm text-muted">Pending until admin approves.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <select name="student_id" className="input-field" value={form.student_id} onChange={handleChange} required>
          <option value="">Select student…</option>
          {students.map((s) => (
            <option key={s.student_id} value={s.student_id}>{s.name}</option>
          ))}
        </select>
        <input name="amount" type="number" min="0" step="0.01" className="input-field" placeholder="Amount" value={form.amount} onChange={handleChange} required />
        <select name="method" className="input-field" value={form.method} onChange={handleChange}>
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="online">Online</option>
          <option value="cheque">Cheque</option>
        </select>
        <input name="proof_url" className="input-field" placeholder="Payment proof URL (optional)" value={form.proof_url} onChange={handleChange} />
        <textarea name="remarks" className="input-field" placeholder="Remarks" value={form.remarks} onChange={handleChange} />
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Payment'}
        </button>
      </form>
      {message.text && (
        <p className={message.type === 'success' ? 'alert-success' : 'alert-error'}>{message.text}</p>
      )}
    </div>
  );
}

export function CoachSelfAttendance() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('PRESENT');
  const [remarks, setRemarks] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  const submit = async () => {
    try {
      const result = await coachPost('/coach/self-attendance', { date, status, remarks });
      setMessage({ text: result.message, type: 'success' });
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  return (
    <div className="card space-y-4">
      <h3 className="font-bold">My Attendance</h3>
      <p className="text-sm text-muted">If absent, your admin is notified automatically.</p>
      <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
      <select className="input-field" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="PRESENT">Present</option>
        <option value="ABSENT">Absent</option>
      </select>
      <input className="input-field" placeholder="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      <button type="button" className="btn-secondary w-full" onClick={submit}>
        Mark My Attendance
      </button>
      {message.text && (
        <p className={message.type === 'success' ? 'alert-success' : 'alert-error'}>{message.text}</p>
      )}
    </div>
  );
}
