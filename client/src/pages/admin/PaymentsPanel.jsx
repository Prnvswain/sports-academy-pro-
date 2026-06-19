import { useCallback, useEffect, useState } from 'react';
import Loader from '../../components/Loader';
import { adminGet, adminPatch, adminPost } from '../../api/client';

const emptyForm = {
  student_id: '',
  amount: '',
  pending_amount: 0, // Keeps track of what the student owes
  payment_date: new Date().toISOString().split('T')[0],
  due_date: '',
  method: 'upi',
  status: 'pending',
};

export default function PaymentsPanel() {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [studentFeeData, setStudentFeeData] = useState(null);
  const [loadingFeeData, setLoadingFeeData] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [paymentsRes, studentsRes] = await Promise.all([
        adminGet('/admin/accounts'),
        adminGet('/admin/students'),
      ]);

      const paymentsData = paymentsRes.data?.data || paymentsRes.data || [];
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);

      const studentsData = studentsRes.data?.data || studentsRes.data || [];
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setMessage({ text: '', type: '' });
    } catch (error) {
      console.error('Data load failure:', error);
      setMessage({ text: error.message || 'Failed to contact backend API', type: 'error' });
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
  const handleStudentChange = async (event) => {
    const selectedId = event.target.value;
    console.log('[handleStudentChange] Selected student ID:', selectedId);

    if (!selectedId) {
      setForm((prev) => ({ ...prev, student_id: '', amount: '', pending_amount: 0 }));
      setStudentFeeData(null);
      return;
    }

    // Find the student object match in our loaded students list
    const studentObj = students.find(
      (s) => (s.id || s.student_id)?.toString() === selectedId.toString(),
    );
    console.log('[handleStudentChange] Student object found:', studentObj);

    setForm((prev) => ({
      ...prev,
      student_id: selectedId,
    }));

    // Fetch fee data from backend
    setLoadingFeeData(true);
    try {
      console.log('[handleStudentChange] Fetching fee data from API for student ID:', selectedId);
      const ledgerRes = await adminGet(`/admin/accounts/student-ledger/${selectedId}`);
      console.log('[handleStudentChange] API response:', ledgerRes);
      const ledgerData = ledgerRes.data || {};
      console.log('[handleStudentChange] Ledger data:', ledgerData);

      setStudentFeeData(ledgerData);

      const pendingAmount = ledgerData.balance_outstanding || 0;
      console.log('[handleStudentChange] Calculated pending amount:', pendingAmount);

      setForm((prev) => ({
        ...prev,
        pending_amount: pendingAmount,
        amount: pendingAmount > 0 ? pendingAmount.toString() : '',
      }));
    } catch (error) {
      console.error('[handleStudentChange] Failed to fetch student ledger:', error);
      setStudentFeeData(null);

      // Fallback to local calculation if API fails
      if (studentObj) {
        const regFee = parseFloat(studentObj.registration_fee || studentObj.registrationFee || 0);
        const additionalCharges = parseFloat(
          studentObj.additional_charges || studentObj.additionalCharges || 0,
        );
        const discount = parseFloat(studentObj.discount || 0);
        const pendingAmount = Math.max(0, regFee + additionalCharges - discount);
        console.log(
          '[handleStudentChange] Fallback calculation - regFee:',
          regFee,
          'additionalCharges:',
          additionalCharges,
          'discount:',
          discount,
          'pendingAmount:',
          pendingAmount,
        );

        setForm((prev) => ({
          ...prev,
          pending_amount: pendingAmount,
          amount: pendingAmount > 0 ? pendingAmount.toString() : '',
        }));
      } else {
        setForm((prev) => ({ ...prev, amount: '', pending_amount: 0 }));
      }
    } finally {
      setLoadingFeeData(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });

    const payload = {
      student_id: parseInt(form.student_id, 10),
      amount: parseFloat(form.amount),
      payment_date: form.payment_date,
      method: form.method,
      status: form.status,
    };

    console.log('[handleSubmit] Sending payment payload:', payload);

    try {
      const result = await adminPost('/admin/accounts', payload);
      console.log('[handleSubmit] Payment creation response:', result);
      setMessage({ text: result.message || 'Payment recorded successfully', type: 'success' });
      setForm({ ...emptyForm, payment_date: new Date().toISOString().split('T')[0] });
      loadData();
    } catch (error) {
      console.error('[handleSubmit] Payment creation error:', error);
      console.error('[handleSubmit] Error stack:', error.stack);
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const updateStatus = async (paymentObj, fallbackId, status, rejected_reason) => {
    let targetId =
      paymentObj?.id ||
      paymentObj?.payment_id ||
      paymentObj?.paymentId ||
      paymentObj?.PaymentID ||
      paymentObj?._id ||
      paymentObj?.id_payment;

    if (!targetId && targetId !== 0) {
      const keys = Object.keys(paymentObj || {});
      const idKey = keys.find((k) => k.toLowerCase().includes('id'));
      if (idKey) targetId = paymentObj[idKey];
    }

    if ((!targetId && targetId !== 0) || targetId === fallbackId) {
      setMessage({
        text: 'Error: Frontend could not read your database Primary Key ID field.',
        type: 'error',
      });
      return;
    }

    try {
      const result = await adminPatch(`/admin/accounts/${targetId}/status`, {
        status,
        rejected_reason,
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

  // Calculate collection statistics
  const calculateStats = () => {
    const total = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const collected = payments
      .filter((p) => (p.status || '').toUpperCase() === 'COMPLETED')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const pending = payments
      .filter((p) => (p.status || '').toUpperCase() === 'PENDING')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const overdue = payments
      .filter((p) => {
        const status = (p.status || '').toUpperCase();
        const dueDate = p.due_date ? new Date(p.due_date) : null;
        const today = new Date();
        return status === 'PENDING' && dueDate && dueDate < today;
      })
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    return { total, collected, pending, overdue };
  };

  const stats = calculateStats();

  // Filter payments
  const filteredPayments = payments.filter((payment) => {
    const status = (payment.status || '').toUpperCase();

    if (statusFilter && status !== statusFilter.toUpperCase()) return false;

    if (dateFrom) {
      const paymentDate = new Date(payment.payment_date || payment.date);
      const fromDate = new Date(dateFrom);
      if (paymentDate < fromDate) return false;
    }

    if (dateTo) {
      const paymentDate = new Date(payment.payment_date || payment.date);
      const toDate = new Date(dateTo);
      if (paymentDate > toDate) return false;
    }

    return true;
  });

  const clearFilters = () => {
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Fee Management</h2>
        <p className="text-muted">Track payments, due dates, and collection statistics.</p>
      </div>

      {/* Collection Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="text-2xl font-bold">₹{stats.total.toFixed(2)}</div>
          <div className="text-muted text-sm">Total Amount</div>
        </div>
        <div className="card">
          <div className="text-success text-2xl font-bold">₹{stats.collected.toFixed(2)}</div>
          <div className="text-muted text-sm">Collected</div>
        </div>
        <div className="card">
          <div className="text-warning text-2xl font-bold">₹{stats.pending.toFixed(2)}</div>
          <div className="text-muted text-sm">Pending</div>
        </div>
        <div className="card">
          <div className="text-danger text-2xl font-bold">₹{stats.overdue.toFixed(2)}</div>
          <div className="text-muted text-sm">Overdue</div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* RECORD PAYMENT CARD */}
        <form className="card space-y-4" onSubmit={handleSubmit}>
          <h3 className="text-base font-bold tracking-tight">Record Payment</h3>

          <div>
            <label className="label" htmlFor="payStudent">
              Student
            </label>
            <select
              id="payStudent"
              name="student_id"
              className="input-field text-foreground bg-[var(--color-input)]"
              value={form.student_id}
              onChange={handleStudentChange}
              required
            >
              <option value="">Select student…</option>
              {students.map((s) => (
                <option key={s.id || s.student_id} value={s.id || s.student_id}>
                  {s.name} (ID: {s.id || s.student_id})
                </option>
              ))}
            </select>
          </div>

          {/* COMPREHENSIVE FEE BREAKDOWN */}
          {form.student_id && (
            <div className="bg-accent/10 border-accent/20 space-y-3 rounded-lg border p-4">
              {loadingFeeData ? (
                <div className="text-muted text-center text-sm">Loading fee data...</div>
              ) : studentFeeData ? (
                <>
                  <div className="border-accent/20 flex items-center justify-between border-b pb-2 text-sm">
                    <span className="text-muted font-medium">Total Fees Assigned:</span>
                    <span className="font-bold">
                      ₹{studentFeeData.total_fees_assigned?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="border-accent/20 flex items-center justify-between border-b pb-2 text-sm">
                    <span className="text-muted font-medium">Total Fees Paid:</span>
                    <span className="text-success font-bold">
                      ₹{studentFeeData.total_fees_paid?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="border-accent/20 flex items-center justify-between border-b pb-2 text-sm">
                    <span className="text-muted font-medium">Pending Fees:</span>
                    <span className="text-warning font-bold">
                      ₹{studentFeeData.pending_fees?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="border-accent/20 flex items-center justify-between border-b pb-2 text-sm">
                    <span className="text-muted font-medium">Overdue Fees:</span>
                    <span className="text-danger font-bold">
                      ₹{studentFeeData.overdue_fees?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="bg-surface flex items-center justify-between rounded p-2 text-sm">
                    <span className="text-muted font-bold">Pending Dues Outstanding:</span>
                    <span className="text-danger text-base font-bold">
                      ₹{studentFeeData.balance_outstanding?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted font-medium">Pending Dues Outstanding:</span>
                  <span className="text-danger text-base font-bold">
                    ₹{form.pending_amount.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="label" htmlFor="payAmount">
              Amount to Pay
            </label>
            <input
              id="payAmount"
              name="amount"
              type="number"
              min="0"
              step="0.01"
              className="input-field"
              value={form.amount}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="payDate">
                Payment Date
              </label>
              <input
                id="payDate"
                name="payment_date"
                type="date"
                className="input-field"
                value={form.payment_date}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="dueDate">
                Due Date (Optional)
              </label>
              <input
                id="dueDate"
                name="due_date"
                type="date"
                className="input-field"
                value={form.due_date}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="payMethod">
                Method
              </label>
              <select
                id="payMethod"
                name="method"
                className="input-field text-foreground bg-[var(--color-input)]"
                value={form.method}
                onChange={handleChange}
                required
              >
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="payStatus">
                Status
              </label>
              <select
                id="payStatus"
                name="status"
                className="input-field text-foreground bg-[var(--color-input)]"
                value={form.status}
                onChange={handleChange}
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn-primary mt-2 w-full cursor-pointer">
            Create Payment
          </button>
        </form>

        {/* FILTERS CARD */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold tracking-tight">Filters</h3>
            <button type="button" className="btn-secondary text-sm" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>

          <div>
            <label className="label" htmlFor="statusFilter">
              Status
            </label>
            <select
              id="statusFilter"
              className="input-field"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="dateFrom">
                From Date
              </label>
              <input
                id="dateFrom"
                type="date"
                className="input-field"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="dateTo">
                To Date
              </label>
              <input
                id="dateTo"
                type="date"
                className="input-field"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* PAYMENT RECORDS LIST */}
      <div className="card overflow-x-auto">
        <h3 className="mb-4 text-base font-bold tracking-tight">Payment Records</h3>
        {loading ? (
          <Loader />
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-border text-muted border-b text-xs font-medium uppercase tracking-wider">
                <th className="pb-3 pr-2">Student</th>
                <th className="px-2 pb-3">Amount</th>
                <th className="px-2 pb-3">Payment Date</th>
                <th className="px-2 pb-3">Due Date</th>
                <th className="px-2 pb-3">Method</th>
                <th className="px-2 pb-3">Status</th>
                <th className="pb-3 pl-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-muted py-8 text-center text-xs">
                    No payments found.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment, index) => {
                  const normalizedStatus = (payment.status || '').toUpperCase();
                  const currentId = payment.id || payment.payment_id || index;
                  const isOverdue =
                    normalizedStatus === 'PENDING' &&
                    payment.due_date &&
                    new Date(payment.due_date) < new Date();

                  return (
                    <tr
                      key={currentId}
                      className={`text-foreground ${isOverdue ? 'bg-danger/10' : ''}`}
                    >
                      <td className="py-3 pr-2 font-medium">
                        {payment.student?.name ||
                          payment.student_name ||
                          `Student #${payment.student_id}`}
                      </td>
                      <td className="px-2 py-3">₹{parseFloat(payment.amount || 0).toFixed(2)}</td>
                      <td className="px-2 py-3">
                        {new Date(payment.payment_date || payment.date).toLocaleDateString()}
                      </td>
                      <td className="px-2 py-3">
                        {payment.due_date ? new Date(payment.due_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-2 py-3 text-xs font-semibold uppercase">
                        {payment.method}
                      </td>
                      <td className="px-2 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${
                            isOverdue
                              ? 'bg-danger/10 text-danger border-danger/20 border'
                              : normalizedStatus === 'COMPLETED'
                                ? 'bg-success/10 text-success border-success/20 border'
                                : normalizedStatus === 'FAILED' || normalizedStatus === 'REJECTED'
                                  ? 'bg-danger/10 text-danger border-danger/20 border'
                                  : 'bg-warning/10 text-warning border-warning/20 border'
                          }`}
                        >
                          {isOverdue ? 'OVERDUE' : payment.status}
                        </span>
                      </td>
                      <td className="space-x-1 py-3 pl-2 text-right">
                        {normalizedStatus !== 'COMPLETED' && (
                          <button
                            type="button"
                            className="btn-success btn-sm"
                            onClick={() => updateStatus(payment, currentId, 'completed')}
                          >
                            Mark Paid
                          </button>
                        )}
                        {normalizedStatus === 'PENDING' && (
                          <button
                            type="button"
                            className="btn-danger btn-sm"
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

      {message.text && (
        <div
          className={`rounded-lg p-4 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-success/10 text-success border-success/20 border'
              : 'bg-danger/10 text-danger border-danger/20 border'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
