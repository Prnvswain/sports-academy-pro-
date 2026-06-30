import { useState, useEffect, useCallback } from 'react';
import { coachGet, coachPost } from '../../api/client';
import Loader from '../../components/Loader';
import { useCoachBatches } from '../../context/CoachBatchesContext';

export function CoachFeeCollection({ students = [] }) {
  // --- STATES ---
  const [submissions, setSubmissions] = useState([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Form Field States
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI'); // Default selected as per UI
  const [remarks, setRemarks] = useState('');
  const [proofFile, setProofFile] = useState(null);

  // --- SHOW BANNER TIMEOUT ---
  const showBanner = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProofFile(file);
    }
  };

  // --- FETCH RECENT SUBMISSIONS ---
  const fetchRecentSubmissions = useCallback(async () => {
    setLoadingTable(true);
    try {
      // Backend api route to get logged-in coach's submissions
      const response = await coachGet('/payments');
      if (response && response.success) {
        setSubmissions(response.data || []);
      } else if (response && Array.isArray(response)) {
        // Fallback agar direct array aa rahi ho response me
        setSubmissions(response);
      }
    } catch (err) {
      console.error('Error fetching recent submissions:', err);
    } finally {
      setLoadingTable(false);
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    fetchRecentSubmissions();
  }, [fetchRecentSubmissions]);

  // --- FORM SUBMISSION ---
  const handleSubmitPayment = async (e) => {
    e.preventDefault();

    if (!selectedStudentId) {
      showBanner('Please select a student.', 'error');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      showBanner('Please enter a valid amount.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      let payload;
      
      if (proofFile) {
        // Use FormData if file is present
        payload = new FormData();
        payload.append('student_id', parseInt(selectedStudentId, 10));
        payload.append('amount', parseFloat(amount));
        payload.append('method', paymentMethod.toLowerCase());
        if (remarks) {
          payload.append('remarks', remarks);
        }
        payload.append('proof_file', proofFile);
      } else {
        // Use JSON if no file
        payload = {
          student_id: parseInt(selectedStudentId, 10),
          amount: parseFloat(amount),
          method: paymentMethod.toLowerCase(),
          remarks: remarks,
        };
      }

      const response = await coachPost('/payments', payload);

      if (response && (response.success || response.id)) {
        showBanner('Payment submitted successfully!', 'success');
        
        // Clear input form fields on success
        setSelectedStudentId('');
        setAmount('');
        setRemarks('');
        setPaymentMethod('UPI');
        setProofFile(null);

        // IMMEDIATELY RE-FETCH: Isse table bina page reload kiye live update hogi
        fetchRecentSubmissions();
      } else {
        showBanner(response.message || 'Failed to record payment.', 'error');
      }
    } catch (err) {
      console.error('Error submitting fee:', err);
      showBanner('Server error while saving transaction.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Alert Notification Banner */}
      {message.text && (
        <div className={`p-4 rounded-lg font-bold border-2 transition-all ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-400' : 'bg-rose-50 text-rose-800 border-rose-400'
        }`}>
          {message.type === 'success' ? '🚀 ' : '⚠️ '} {message.text}
        </div>
      )}

      {/* FEE COLLECTION INPUT FORM CARD */}
      <div className="bg-white p-6 border border-zinc-200 rounded-xl shadow-sm space-y-5">
        <form onSubmit={handleSubmitPayment} className="space-y-5">
          
          {/* 1. Student Selection Dropdown populated via props */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Select Student *</label>
            <select
              className="w-full border border-zinc-300 rounded-lg p-2.5 font-medium bg-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              required
            >
              <option value="">-- Choose Student from Batches --</option>
              {Array.isArray(students) && students.map((student, idx) => {
                const studentId = student?.id || student?.student_id || student?._id || idx;
                const studentName = student?.name || student?.student_name || `Student #${idx + 1}`;
                return (
                  <option key={studentId} value={studentId}>
                    {studentName} {student?.sport ? `(${student.sport})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* 2. Amount Input */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Amount ($) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full border border-zinc-300 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {/* 3. Custom Designed Payment Method Selectors */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-2">Select Payment Method</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {['Cash', 'UPI', 'Online', 'Cheque'].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`p-3 rounded-lg font-bold border text-sm flex items-center justify-center gap-2 transition-all ${
                    paymentMethod === method
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  {method === 'Cash' && '💵'}
                  {method === 'UPI' && '📲'}
                  {method === 'Online' && '🌐'}
                  {method === 'Cheque' && '📝'}
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Receipt Photo / Screenshot Upload */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">
              Receipt Photo / Screenshot (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              className="w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer"
              onChange={handleFileChange}
            />
            {proofFile && (
              <p className="text-xs text-emerald-600 font-medium mt-1">
                ✓ Ready to upload: {proofFile.name}
              </p>
            )}
          </div>

          {/* 5. Remarks Text Area */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Remarks (Optional)</label>
            <textarea
              className="w-full border border-zinc-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              rows={3}
              placeholder="Add any internal transaction notes here..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          {/* Submit Trigger */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg shadow-md transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting Payment File...' : 'Submit Payment'}
          </button>
        </form>
      </div>

      {/* LIVE RECENT SUBMISSIONS TABLE CARD */}
      <div className="bg-white p-6 border border-zinc-200 rounded-xl shadow-sm">
        <div>
          <h3 className="font-bold text-lg text-zinc-900">Your Recent Submissions</h3>
          <p className="text-xs text-zinc-400 mb-4">Track the live status of fees you submitted on the ground.</p>
        </div>

        {loadingTable && submissions.length === 0 ? (
          <Loader message="Loading submission ledger..." />
        ) : submissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="p-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Student</th>
                  <th className="p-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Amount</th>
                  <th className="p-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Method</th>
                  <th className="p-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub, index) => (
                  <tr key={sub.id || index} className="border-b border-zinc-100 hover:bg-zinc-50/40 transition-colors">
                    <td className="p-3 font-semibold text-zinc-900">
                      {sub.student_name || sub.Student?.name || 'Walk-in / General'}
                    </td>
                    <td className="p-3 font-bold text-zinc-900">
                      ${parseFloat(sub.amount || 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-xs font-bold">
                      <span className="bg-zinc-100 text-zinc-700 px-2 py-1 rounded">{sub.method || 'UPI'}</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-extrabold border ${
                        sub.status === 'APPROVED' || sub.status === 'SUCCESS' || sub.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {sub.status || 'PENDING'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-zinc-400 text-sm italic border border-dashed border-zinc-200 rounded-lg">
            No recent fee submissions found for your operations.
          </div>
        )}
      </div>
    </div>
  );
}

export default function CoachFeesPage() {
  const { allStudents, loading } = useCoachBatches();

  if (loading) {
    return <Loader message="Loading students…" />;
  }

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Fee Collection</h2>
      <CoachFeeCollection students={allStudents} />
    </div>
  );
}
