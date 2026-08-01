import { useState, useEffect } from 'react';
import { coachPost, coachGet } from '../../api/client'; 
import { CheckCircle, AlertCircle, FileText, Send, UserCheck, CreditCard, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function CoachDailyNotes({ students = [] }) {
  const [studentId, setStudentId] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
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

  const handleStudentChange = (selectedId) => {
    if (!selectedId) {
      setStudentId('');
      setStudentSearchTerm('');
      return;
    }
    setStudentId(selectedId);
    const student = students.find(s => String(s?.id || s?.student_id) === String(selectedId));
    if (student) {
      setStudentSearchTerm(student?.name || student?.student_name || '');
    }
  };

  const handleKeyDown = (e) => {
    const filteredStudents = getFilteredStudents();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredStudents.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      const student = filteredStudents[highlightedIndex];
      const studentId = student?.id || student?.student_id;
      setStudentSearchTerm(student?.name || student?.student_name || '');
      setDropdownOpen(false);
      setHighlightedIndex(-1);
      handleStudentChange(studentId);
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const getFilteredStudents = () => {
    if (!studentSearchTerm) return students;
    const searchTerm = studentSearchTerm.toLowerCase();
    return students.filter((s) => {
      const name = s?.name || s?.student_name || '';
      return name.toLowerCase().includes(searchTerm);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentId) {
      setMessage({ text: 'Please select a student first.', type: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const result = await coachPost('/coach/notes', {
        student_id: parseInt(studentId, 10),
        ...form
      });
      setMessage({ text: result?.message || 'Notes saved successfully!', type: 'success' });
      setForm({
        performance_notes: '',
        behaviour_notes: '',
        achievements: '',
        improvement_areas: ''
      });
      setStudentId('');
      setStudentSearchTerm('');
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden relative text-left">
      <span className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></span>
      <div className="p-5 border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/10">
        <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Log Athlete Daily Progress</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5 font-bold uppercase tracking-wider">Notes written here are automatically emailed to parents</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Select Student */}
        <div className="relative">
          <label className="block text-xs font-bold text-muted-foreground mb-1">Search Athlete</label>
          <input
            type="text"
            className="input-field text-xs py-2 px-3 w-full"
            placeholder="Search student by name..."
            value={studentSearchTerm}
            onFocus={() => setDropdownOpen(true)}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 250)}
            onKeyDown={handleKeyDown}
            onChange={(e) => {
              setStudentSearchTerm(e.target.value);
              setHighlightedIndex(-1);
            }}
            required
            autoComplete="off"
          />
          {dropdownOpen && studentSearchTerm && (
            <div className="absolute z-50 w-full rounded-xl border border-border bg-card max-h-60 overflow-y-auto mt-1.5 shadow-xl text-left">
              {(() => {
                const filteredStudents = getFilteredStudents();
                if (filteredStudents.length === 0) {
                  return <div className="px-4 py-2.5 text-xs text-muted-foreground font-bold">No students found</div>;
                }
                return filteredStudents.map((s, index) => {
                  const name = s?.name || s?.student_name || 'Unknown Student';
                  const isHighlighted = index === highlightedIndex;
                  return (
                    <div
                      key={s?.id || s?.student_id || index}
                      className={`cursor-pointer px-4 py-2.5 text-xs transition-colors duration-150 border-b border-border/40 last:border-0 flex items-center gap-3 ${
                        isHighlighted ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-foreground'
                      }`}
                      onMouseDown={() => {
                        const studentId = s?.id || s?.student_id;
                        setStudentSearchTerm(name);
                        setDropdownOpen(false);
                        setHighlightedIndex(-1);
                        handleStudentChange(studentId);
                      }}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      <div>
                        <div className="font-bold text-xs">{name}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Batch: {s?.batch?.name || '—'}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>

        {/* Text Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { id: 'performance_notes', label: 'Performance Updates' },
            { id: 'behaviour_notes', label: 'Behavioral Remarks' },
            { id: 'achievements', label: 'Achievements & Milestones' },
            { id: 'improvement_areas', label: 'Areas of Improvement' }
          ].map((field) => (
            <div key={field.id} className="space-y-1">
              <label className="block text-xs font-bold text-muted-foreground mb-1">{field.label}</label>
              <textarea
                name={field.id}
                className="input-field text-xs py-2 px-3 bg-card w-full resize-none font-semibold"
                rows={3}
                placeholder={`Describe student's ${field.label.toLowerCase()}...`}
                value={form[field.id]}
                onChange={handleChange}
              />
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary w-full py-3.5 text-xs uppercase tracking-wider font-black flex justify-center items-center gap-1.5"
        >
          {submitting ? 'Sending E-mail...' : 'Save & Send to Parent'}
        </button>

        {message.text && (
          <div className={`mt-2 rounded-xl px-4 py-3 text-xs font-bold border ${
            message.type === 'success' 
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
          }`}>
            {message.text}
          </div>
        )}
      </form>
    </div>
  );
}

export function CoachFeeCollection({ students = [] }) {
  const [form, setForm] = useState({
    student_id: '',
    amount: '',
    method: 'upi', 
    remarks: ''
  });
  
  const [proofFile, setProofFile] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [submitting, setSubmitting] = useState(false);
  const [recentPayments, setRecentPayments] = useState([]);

  const paymentMethods = [
    { id: 'cash', label: '💵 Cash' },
    { id: 'upi', label: '📱 UPI' },
    { id: 'online', label: '🌐 Online' },
    { id: 'cheque', label: '📝 Cheque' }
  ];

  const fetchRecentPayments = async () => {
    try {
      const result = await coachGet('/coach/payments');
      if (result && result.payments) {
        setRecentPayments(result.payments);
      } else if (result && result.data) {
        setRecentPayments(result.data);
      } else if (Array.isArray(result)) {
        setRecentPayments(result);
      }
    } catch (err) {
      console.log("Recent collection fetch error:", err.message);
    }
  };

  useEffect(() => {
    fetchRecentPayments();
  }, [students]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMethodSelect = (methodId) => {
    setForm((prev) => ({ ...prev, method: methodId }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setProofFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const actualStudentId = form.student_id;
    if (!actualStudentId) {
      setMessage({ text: 'Please select a student first.', type: 'error' });
      return;
    }

    setSubmitting(true);
    setMessage({ text: '', type: '' });

    try {
      const formData = new FormData();
      formData.append('student_id', parseInt(actualStudentId, 10));
      formData.append('amount', parseFloat(form.amount || 0));
      formData.append('method', form.method.toLowerCase());
      if (form.remarks) {
        formData.append('remarks', form.remarks);
      }
      if (proofFile) {
        formData.append('proof_file', proofFile); 
      }

      const result = await coachPost('/coach/payments', formData);
      
      setMessage({ text: result?.message || 'Payment recorded successfully!', type: 'success' });
      setForm({ student_id: '', amount: '', method: 'upi', remarks: '' });
      setProofFile(null); 
      fetchRecentPayments();
    } catch (error) {
      setMessage({ text: error.message || 'Something went wrong.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid xl:grid-cols-12 gap-6 items-start text-left">
      {/* LEFT COLUMN: COLLECTION FORM */}
      <div className="xl:col-span-5 bg-card border border-border rounded-2xl shadow-sm overflow-hidden relative">
        <span className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></span>
        <div className="p-5 border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/10">
          <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Record Fee Collection</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-bold uppercase tracking-wider">Payments remain pending until admin confirmation</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">Select Athlete *</label>
            <select
              name="student_id"
              className="input-field text-xs py-2.5 px-3 bg-card w-full"
              value={form.student_id}
              onChange={handleChange}
              required
            >
              <option value="">Select student…</option>
              {Array.isArray(students) && students.map((s, idx) => {
                const optionId = s?.id || s?.student_id || s?._id || idx;
                const optionName = s?.name || s?.student_name || `Student #${idx + 1}`;
                return (
                  <option key={optionId} value={optionId}>
                    {optionName}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">Payment Amount *</label>
            <input
              name="amount"
              type="number"
              min="0"
              step="0.01"
              className="input-field text-xs py-2 px-3 w-full"
              placeholder="0.00"
              value={form.amount}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((m) => {
                const isSelected = form.method === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleMethodSelect(m.id)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                      isSelected
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                        : 'bg-card text-foreground border-border hover:border-emerald-450'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">Receipt Attachment Proof</label>
            <input 
              type="file" 
              accept="image/*" 
              className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-black file:bg-primary file:text-primary-foreground hover:file:opacity-90 file:transition-all cursor-pointer" 
              onChange={handleFileChange} 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">Remarks</label>
            <textarea
              name="remarks"
              className="input-field text-xs py-2 px-3 bg-card resize-none w-full"
              rows={2}
              placeholder="Notes or transaction ID..."
              value={form.remarks}
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary w-full py-3 text-xs uppercase font-black"
          >
            {submitting ? 'Submitting...' : 'Submit Payment'}
          </button>

          {message.text && (
            <div className={`mt-2 rounded-xl px-4 py-2 text-[10px] font-bold border ${
              message.type === 'success' 
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
            }`}>
              {message.text}
            </div>
          )}
        </form>
      </div>

      {/* RIGHT COLUMN: RECENT LOG */}
      <div className="xl:col-span-7 bg-card border border-border rounded-2xl shadow-sm overflow-hidden relative">
        <span className="absolute top-0 left-0 w-full h-1 bg-blue-500"></span>
        <div className="p-5 border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/10">
          <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Shift Collections Log</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-bold uppercase tracking-wider">Sync logs of payments recorded on the field</p>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-border/60 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground bg-slate-50/50 dark:bg-slate-900/10">
                <th className="p-4">Student</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Method</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-bold">
              {recentPayments && recentPayments.length > 0 ? (
                recentPayments.map((pay, idx) => {
                  const matchedStudent = Array.isArray(students) && students.find(s => String(s?.id || s?.student_id) === String(pay?.student_id));
                  const studentName = pay?.student_name || (matchedStudent ? matchedStudent.name : `ID: ${pay?.student_id}`);
                  const currentStatus = pay?.status?.toUpperCase() || 'PENDING';

                  return (
                    <tr key={pay?.id || pay?.receipt_id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="p-4 text-foreground text-xs">{studentName}</td>
                      <td className="p-4 text-foreground text-xs">₹{parseFloat(pay?.amount || 0).toFixed(2)}</td>
                      <td className="p-4">
                        <span className="bg-slate-100 dark:bg-slate-800 border border-border px-2 py-0.5 rounded text-[10px] text-muted-foreground">
                          {pay?.method || 'UPI'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase ${
                          currentStatus === 'COMPLETED' || currentStatus === 'APPROVED' || currentStatus === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        }`}>
                          {currentStatus === 'PENDING' ? 'PENDING' : currentStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-muted-foreground font-bold">
                    No recent fee submissions logged.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
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
      setMessage({ text: result?.message || 'Attendance marked successfully!', type: 'success' });
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden relative text-left">
      <span className="absolute top-0 left-0 w-full h-1 bg-primary"></span>
      <div className="p-5 border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/10">
        <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Coach Shift Attendance</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5 font-bold uppercase tracking-wider">Confirm your active on-ground shift presence</p>
      </div>

      <div className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-muted-foreground mb-1">Shift Date</label>
          <input
            type="date"
            className="input-field text-xs py-2 px-3 w-full bg-card"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-muted-foreground mb-1">Status Code</label>
          <select
            className="input-field text-xs py-2.5 px-3 bg-card w-full"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-muted-foreground mb-1">Remarks / Location details</label>
          <input
            className="input-field text-xs py-2 px-3 w-full"
            placeholder="On-field duties, delay explanations..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="btn btn-primary w-full py-3 text-xs uppercase font-black"
          onClick={submit}
        >
          Mark Shift Attendance
        </button>

        {message.text && (
          <div className={`mt-2 rounded-xl px-4 py-2.5 text-xs font-bold border ${
            message.type === 'success' 
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
          }`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}