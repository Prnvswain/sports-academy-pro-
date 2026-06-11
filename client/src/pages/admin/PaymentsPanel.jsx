import { useCallback, useEffect, useState } from 'react';
import Loader from '../../components/Loader';
import { adminGet, adminPatch, adminPost } from '../../api/client';

const emptyForm = {
  student_id: '',
  amount: '',
  pending_amount: 0, // Keeps track of what the student owes
  payment_date: new Date().toISOString().split('T')[0],
  method: 'upi',
  status: 'pending'
};

export default function PaymentsPanel() {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [paymentsRes, studentsRes] = await Promise.all([
        adminGet('/admin/accounts'),
        adminGet('/admin/students')
      ]);
      
      const paymentsData = paymentsRes.data?.data || paymentsRes.data || [];
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);

      const studentsData = studentsRes.data?.data || studentsRes.data || [];
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setMessage({ text: '', type: '' });
    } catch (error) {
      console.error("Data load failure:", error);
      setMessage({ text: error.message || "Failed to contact backend API", type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // AUTOMATION: Triggers when a student name option is picked from the select element
  const handleStudentChange = (event) => {
    const selectedId = event.target.value;
    
    if (!selectedId) {
      setForm((prev) => ({ ...prev, student_id: '', amount: '', pending_amount: 0 }));
      return;
    }

    // Find the student object match in our loaded students list
    const studentObj = students.find(s => (s.id || s.student_id)?.toString() === selectedId.toString());

    if (studentObj) {
      // Parse fee factors safely (defaulting to 0 if null or undefined)
      const regFee = parseFloat(studentObj.registration_fee || studentObj.registrationFee || 0);
      const additionalCharges = parseFloat(studentObj.additional_charges || studentObj.additionalCharges || 0);
      const discount = parseFloat(studentObj.discount || 0);

      // Formula: Total Dues = (Registration + Additional) - Discounts
      const pendingAmount = Math.max(0, (regFee + additionalCharges) - discount);

      setForm((prev) => ({
        ...prev,
        student_id: selectedId,
        pending_amount: pendingAmount,
        amount: pendingAmount.toString() // Autofills your payment field with what they owe!
      }));
    } else {
      setForm((prev) => ({ ...prev, student_id: selectedId, amount: '', pending_amount: 0 }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });
    try {
      const result = await adminPost('/admin/accounts', {
        student_id: parseInt(form.student_id, 10),
        amount: parseFloat(form.amount),
        payment_date: form.payment_date,
        method: form.method,
        status: form.status
      });
      
      setMessage({ text: result.message || 'Payment recorded successfully', type: 'success' });
      setForm({ ...emptyForm, payment_date: new Date().toISOString().split('T')[0] });
      loadData();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const updateStatus = async (paymentObj, fallbackId, status, rejected_reason) => {
    let targetId = paymentObj?.id || 
                   paymentObj?.payment_id || 
                   paymentObj?.paymentId ||
                   paymentObj?.PaymentID ||
                   paymentObj?._id ||
                   paymentObj?.id_payment;

    if (!targetId && targetId !== 0) {
      const keys = Object.keys(paymentObj || {});
      const idKey = keys.find(k => k.toLowerCase().includes('id'));
      if (idKey) targetId = paymentObj[idKey];
    }

    if ((!targetId && targetId !== 0) || targetId === fallbackId) {
      setMessage({ text: 'Error: Frontend could not read your database Primary Key ID field.', type: 'error' });
      return;
    }

    try {
      const result = await adminPatch(`/admin/accounts/${targetId}/status`, {
        status,
        rejected_reason
      });
      setMessage({ text: result.message || 'Status updated successfully', type: 'success' });
      loadData();
    } catch (error) {
      setMessage({ text: error.message || 'Failed to update payment status', type: 'error' });
    }
  };

  const rejectPayment = async (paymentObj, fallbackId) => {
    const reason = window.prompt('Rejection reason (optional):');
    if (reason === null) return;
    await updateStatus(paymentObj, fallbackId, 'FAILED', reason || undefined);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        
        {/* RECORD PAYMENT CARD */}
        <form className="card bg-white border p-6 rounded-xl shadow-sm space-y-4" onSubmit={handleSubmit}>
          <h3 className="font-bold text-base tracking-tight text-zinc-900">Record Payment</h3>
          
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1" htmlFor="payStudent">Student</label>
            <select id="payStudent" name="student_id" className="w-full border rounded-lg p-2 text-sm bg-transparent" value={form.student_id} onChange={handleStudentChange} required>
              <option value="">Select student…</option>
              {students.map((s) => (
                <option key={s.id || s.student_id} value={s.id || s.student_id}>
                  {s.name} (ID: {s.id || s.student_id})
                </option>
              ))}
            </select>
          </div>

          {/* NEW: PENDING AMOUNT DISPLAY READONLY BOX */}
          {form.student_id && (
            <div className="bg-zinc-50 border border-dashed rounded-lg p-3 flex justify-between items-center text-sm">
              <span className="text-zinc-500 font-medium">Pending Dues Outstanding:</span>
              <span className="text-red-600 font-bold text-base">${form.pending_amount.toFixed(2)}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1" htmlFor="payAmount">Amount to Pay</label>
            <input id="payAmount" name="amount" type="number" min="0" step="0.01" className="w-full border rounded-lg p-2 text-sm bg-transparent" value={form.amount} onChange={handleChange} required />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1" htmlFor="payDate">Payment Date</label>
            <input id="payDate" name="payment_date" type="date" className="w-full border rounded-lg p-2 text-sm bg-transparent" value={form.payment_date} onChange={handleChange} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1" htmlFor="payMethod">Method</label>
              <select id="payMethod" name="method" className="w-full border rounded-lg p-2 text-sm bg-transparent" value={form.method} onChange={handleChange} required>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1" htmlFor="payStatus">Status</label>
              <select id="payStatus" name="status" className="w-full border rounded-lg p-2 text-sm bg-transparent" value={form.status} onChange={handleChange}>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
          
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2 px-4 rounded-lg transition-colors mt-2">
            Create Payment
          </button>
        </form>

        {/* PAYMENT RECORDS LIST */}
        <div className="card bg-white border rounded-xl shadow-sm p-6 overflow-x-auto">
          <h3 className="font-bold text-base tracking-tight text-zinc-900 mb-4">Payment Records</h3>
          {loading ? (
            <Loader />
          ) : (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b text-zinc-400 font-medium text-xs uppercase tracking-wider">
                  <th className="pb-3 pr-2">Student</th>
                  <th className="pb-3 px-2">Amount</th>
                  <th className="pb-3 px-2">Date</th>
                  <th className="pb-3 px-2">Method</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 pl-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-zinc-400">No payments recorded.</td>
                  </tr>
                ) : (
                  payments.map((payment, index) => {
                    const normalizedStatus = (payment.status || '').toUpperCase();
                    const currentId = payment.id || payment.payment_id || index;

                    return (
                      <tr key={currentId} className="text-zinc-700">
                        <td className="py-3 pr-2 font-medium">{payment.student?.name || payment.student_name || `Student #${payment.student_id}`}</td>
                        <td className="py-3 px-2">${parseFloat(payment.amount || 0).toFixed(2)}</td>
                        <td className="py-3 px-2">{new Date(payment.payment_date || payment.date).toLocaleDateString()}</td>
                        <td className="py-3 px-2 uppercase text-xs font-semibold">{payment.method}</td>
                        <td className="py-3 px-2">
                          <span className={`text-xs uppercase font-bold tracking-wide px-2 py-0.5 rounded ${
                            normalizedStatus === 'COMPLETED' ? 'bg-green-50 text-green-700' :
                            normalizedStatus === 'FAILED' || normalizedStatus === 'REJECTED' ? 'bg-red-50 text-red-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="py-3 pl-2 text-right space-x-1">
                          {normalizedStatus !== 'COMPLETED' && (
                            <button 
                              type="button" 
                              className="bg-green-700 text-white hover:bg-green-800 text-xs font-medium py-1 px-2 rounded transition-colors" 
                              onClick={() => updateStatus(payment, currentId, 'completed')}
                            >
                              Mark Paid
                            </button>
                          )}
                          {normalizedStatus === 'PENDING' && (
                            <button 
                              type="button" 
                              className="bg-red-600 text-white hover:bg-red-700 text-xs font-medium py-1 px-2 rounded transition-colors" 
                              onClick={() => rejectPayment(payment, currentId)}
                            >
                              Reject
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg text-sm font-medium ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
}