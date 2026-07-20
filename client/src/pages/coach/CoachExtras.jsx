import { useState, useEffect } from 'react';
import { coachPost } from '../../api/client'; 

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
      setMessage({ text: 'Select a student.', type: 'error' });
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
    <div className="card space-y-4 text-left">
      <h3 className="font-bold text-lg text-zinc-900">Daily Student Notes</h3>
      <p className="text-sm text-zinc-400">Notes are emailed to parents automatically.</p>
      
      <div className="relative">
        <label className="text-sm font-semibold text-zinc-700">Select Student</label>
        <input
          type="text"
          className="input-field w-full p-2.5 border rounded-lg"
          placeholder="Search student by name..."
          value={studentSearchTerm}
          onChange={(e) => {
            setStudentSearchTerm(e.target.value);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setDropdownOpen(true)}
          onBlur={() => setTimeout(() => setDropdownOpen(false), 250)}
          onKeyDown={handleKeyDown}
          required
          autoComplete="off"
        />
        {dropdownOpen && studentSearchTerm && (
          <div className="absolute z-50 w-full rounded-xl border border-zinc-200 bg-white max-h-60 overflow-y-auto mt-2 shadow-xl">
            {(() => {
              const filteredStudents = getFilteredStudents();
              if (filteredStudents.length === 0) {
                return <div className="px-4 py-3 text-sm text-zinc-400">No students found</div>;
              }
              return filteredStudents.map((s, index) => {
                const name = s?.name || s?.student_name || 'Unknown Student';
                const parentName = s?.parent_name || s?.parentName || '—';
                const phone = s?.phone || s?.parent_phone || '—';
                const isHighlighted = index === highlightedIndex;
                const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <div
                    key={s?.id || s?.student_id || index}
                    className={`cursor-pointer px-4 py-3 text-sm transition-colors duration-150 border-b border-zinc-100 last:border-b-0 flex items-center gap-3 ${
                      isHighlighted ? 'bg-zinc-100' : 'hover:bg-zinc-50'
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
                    <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-600 flex-shrink-0">
                      {s?.profile_photo ? (
                        <img src={s.profile_photo} alt={name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate text-zinc-900">{name}</div>
                      <div className="text-xs mt-1 text-zinc-400 flex flex-wrap gap-x-3 gap-y-1">
                        <span className="inline-block">Batch: {s?.batch?.name || '—'}</span>
                        {s?.sport && (
                          <span className="inline-block">
                            {s.sport.icon || '🏅'} {s.sport.name}
                          </span>
                        )}
                      </div>
                      <div className="text-xs mt-1 text-zinc-400">
                        <span className="inline-block mr-3">Parent: {parentName}</span>
                        <span className="inline-block">Phone: {phone}</span>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {['performance_notes', 'behaviour_notes', 'achievements', 'improvement_areas'].map((field) => (
        <div key={field} className="space-y-1">
          <label className="text-sm font-semibold capitalize text-zinc-700">{field.replace(/_/g, ' ')}</label>
          <textarea
            name={field}
            className="input-field w-full border rounded-lg p-2.5 min-h-[72px]"
            value={form[field]}
            onChange={handleChange}
          />
        </div>
      ))}
      <button type="button" className="btn-primary w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg transition-colors" disabled={submitting} onClick={handleSubmit}>
        {submitting ? 'Sending…' : 'Save & Email Parent'}
      </button>
      {message.text && (
        <p className={`p-3 rounded-md text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>{message.text}</p>
      )}
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

  // LOG FOR DEBUGGING - browser console me check karna kya print ho rha h
  useEffect(() => {
    console.log("=== FEE COLLECTION DEBUGLOG ===");
    console.log("Raw Students Prop:", students);
  }, [students]);

  const fetchRecentPayments = async () => {
    try {
      const result = await coachGet('/coach/payments');
      // Har tarah ke return response pattern ko intercept karne ke liye checklist
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
    
    // Custom clean variable declaration to block NaN
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
      
      // Reload table history immediately
      fetchRecentPayments();
    } catch (error) {
      setMessage({ text: error.message || 'Something went wrong.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* FEE FORM CARD */}
      <div className="card bg-white p-6 rounded-xl border border-zinc-200 shadow-sm space-y-4">
        <h3 className="font-bold text-lg text-zinc-900">Record Fee Payment</h3>
        <p className="text-xs text-zinc-400 -mt-2">Pending until admin approves.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* STUDENT DROPDOWN (Ultimate Object Checkers Integrated) */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-zinc-700">Select Student *</label>
            <select name="student_id" className="w-full border border-zinc-300 rounded-lg p-2.5 font-medium bg-white text-zinc-900" value={form.student_id} onChange={handleChange} required>
              <option value="">Select student…</option>
              {Array.isArray(students) && students.length > 0 ? (
                students.map((s, idx) => {
                  // Direct clean string extraction checking all object layers
                  const optionId = s?.id || s?.student_id || s?._id || idx;
                  const optionName = s?.name || s?.student_name || `Student #${idx + 1}`;
                  return (
                    <option key={optionId} value={optionId} className="text-zinc-900">
                      {optionName} {s?.sport ? `(${s.sport})` : ''}
                    </option>
                  );
                })
              ) : (
                <option value="" disabled>No students found. Loading from context...</option>
              )}
            </select>
          </div>
          
          {/* AMOUNT */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-zinc-700">Amount *</label>
            <input name="amount" type="number" min="0" step="0.01" className="w-full border border-zinc-300 rounded-lg p-2.5 font-medium" placeholder="0.00" value={form.amount} onChange={handleChange} required />
          </div>
          
          {/* METHOD */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 block">Select Payment Method</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {paymentMethods.map((m) => {
                const isSelected = form.method === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleMethodSelect(m.id)}
                    className={`py-3 px-4 rounded-lg font-bold border text-sm transition-all flex items-center justify-center gap-1.5 ${
                      isSelected 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* SCREENSHOT PROOF */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500 block">
              Take Receipt Photo / Upload Screenshot (Optional)
            </label>
            <input 
              type="file" 
              accept="image/*" 
              className="w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-gray-700 hover:file:bg-zinc-200 cursor-pointer" 
              onChange={handleFileChange} 
            />
          </div>

          {/* REMARKS */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-zinc-700">Remarks</label>
            <textarea name="remarks" className="w-full border border-zinc-300 rounded-lg p-2.5 text-sm" placeholder="Remarks" value={form.remarks} onChange={handleChange} />
          </div>
          
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg shadow-md transition-colors" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Payment'}
          </button>
        </form>
        {message.text && (
          <p className={`p-3 rounded-md text-sm font-semibold ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>{message.text}</p>
        )}
      </div>

      {/* RECENT RECORDS LEADERBOARD TABLE */}
      <div className="card space-y-4 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
        <h3 className="font-bold text-lg text-zinc-900">Your Recent Submissions</h3>
        <p className="text-xs text-zinc-400 -mt-2">Track the live status of fees you submitted on the ground.</p>
        
        <div className="overflow-x-auto pt-2">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-zinc-600 uppercase tracking-wider">Student</th>
                <th className="px-4 py-3 text-left font-bold text-zinc-600 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left font-bold text-zinc-600 uppercase tracking-wider">Method</th>
                <th className="px-4 py-3 text-left font-bold text-zinc-600 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-zinc-100">
              {recentPayments && recentPayments.length > 0 ? (
                recentPayments.map((pay, idx) => {
                  const matchedStudent = Array.isArray(students) && students.find(s => String(s?.id || s?.student_id) === String(pay?.student_id));
                  const studentName = pay?.student_name || (matchedStudent ? matchedStudent.name : `ID Reference: ${pay?.student_id}`);
                  const currentStatus = pay?.status?.toUpperCase() || 'PENDING';

                  return (
                    <tr key={pay?.id || pay?.receipt_id || idx} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-zinc-900">{studentName}</td>
                      <td className="px-4 py-3 font-bold text-zinc-900">₹{parseFloat(pay?.amount || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-zinc-600 uppercase font-mono text-xs">
                        <span className="bg-zinc-100 px-2 py-0.5 rounded font-bold">{pay?.method || 'UPI'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                          currentStatus === 'COMPLETED' || currentStatus === 'APPROVED' || currentStatus === 'SUCCESS'
                            ? 'bg-green-50 text-green-700 border-green-200' :
                          currentStatus === 'PENDING' 
                            ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {currentStatus === 'PENDING' ? 'PENDING APPROVAL' : currentStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-zinc-400 italic">
                    No recent fee submissions found for your shifts.
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
    <div className="card space-y-4 text-left">
      <h3 className="font-bold text-lg text-zinc-900">My Attendance</h3>
      <p className="text-sm text-zinc-400">If absent, your admin is notified automatically.</p>
      <input type="date" className="input-field w-full border rounded-lg p-2.5" value={date} onChange={(e) => setDate(e.target.value)} />
      <select className="input-field w-full border rounded-lg p-2.5 bg-white mt-2" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="PRESENT">Present</option>
        <option value="ABSENT">Absent</option>
      </select>
      <input className="input-field w-full border rounded-lg p-2.5 mt-2" placeholder="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      <button type="button" className="btn-secondary w-full bg-zinc-800 hover:bg-zinc-900 text-white font-bold py-2.5 rounded-lg transition-colors mt-3" onClick={submit}>
        Mark My Attendance
      </button>
      {message.text && (
        <p className={`p-3 rounded-md text-sm font-medium mt-2 ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>{message.text}</p>
      )}
    </div>
  );
}