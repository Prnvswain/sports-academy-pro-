import { useCallback, useEffect, useState } from 'react';
import Loader from '../../components/Loader';
import { adminGet, adminPatch, adminPost } from '../../api/client';

const emptyForm = {
  student_id: '',
  amount: '',
  pending_amount: 0, // Keeps track of what the student owes
  payment_date: new Date().toISOString().split('T')[0],
  due_date: '',
  method: '',
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
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  // NEW: Image Modal Preview State
  const [previewImage, setPreviewImage] = useState(null);

  // Modifying loadData to accept a background flag so loaders don't flash every 5 seconds
  const loadData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const [paymentsRes, studentsRes] = await Promise.all([
        adminGet('/admin/accounts'),
        adminGet('/admin/students'),
      ]);

      const paymentsData = paymentsRes.data?.data || paymentsRes.data || [];
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);

      const studentsData = studentsRes.data?.data || studentsRes.data || [];
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      
      if (!isBackground) setMessage({ text: '', type: '' });
    } catch (error) {
      console.error('Data load failure:', error);
      if (!isBackground) {
        setMessage({ text: error.message || 'Failed to contact backend API', type: 'error' });
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  // FIXED: Real-time update via 5-second background polling mechanism
  useEffect(() => {
    // Immediate initial load on component mount
    loadData(false);

    // Dynamic background checking every 5 seconds
    const interval = setInterval(() => {
      loadData(true);
    }, 5000);

    // Cleanup hook on unmount
    return () => clearInterval(interval);
  }, [loadData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // AUTOMATION: Triggers when a student name option is picked from the select element
  const handleStudentChange = async (selectedId) => {
    console.log('[handleStudentChange] Selected student ID:', selectedId);

    if (!selectedId) {
      setForm((prev) => ({ ...prev, student_id: '', amount: '', pending_amount: 0 }));
      setStudentFeeData(null);
      setStudentSearchTerm('');
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

    // Update search term with student name
    if (studentObj) {
      setStudentSearchTerm(studentObj.name || `${studentObj.firstName || ''} ${studentObj.lastName || ''}`);
    }

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

  const handleKeyDown = (e) => {
    const filteredStudents = getFilteredStudents();
    if (!dropdownOpen || filteredStudents.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredStudents.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredStudents.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredStudents[highlightedIndex]) {
          const student = filteredStudents[highlightedIndex];
          const studentId = student?.id || student?.student_id;
          setStudentSearchTerm(student?.name || `${student?.firstName || ''} ${student?.lastName || ''}`);
          setDropdownOpen(false);
          setHighlightedIndex(-1);
          handleStudentChange(studentId);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setDropdownOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const getFilteredStudents = () => {
    if (!studentSearchTerm) return [];
    const searchTerm = studentSearchTerm.toLowerCase();
    return students.filter((s) => {
      const name = s?.name || `${s?.firstName || ''} ${s?.lastName || ''}`;
      const parentName = s?.parent_name || s?.parentName || '';
      const mobile = s?.phone || s?.parent_phone || s?.mobile || '';
      const studentId = s?.id?.toString() || s?.student_id?.toString() || '';
      const batchName = s?.batch?.name || '';

      return (
        name.toLowerCase().includes(searchTerm) ||
        parentName.toLowerCase().includes(searchTerm) ||
        mobile.includes(searchTerm) ||
        studentId.includes(searchTerm) ||
        batchName.toLowerCase().includes(searchTerm)
      );
    });
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
      setStudentSearchTerm('');
      setStudentFeeData(null);
      loadData(false);
    } catch (error) {
      console.error('[handleSubmit] Payment creation error:', error);
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
      loadData(true); // Background refresh silently
    } catch (error) {
      setMessage({ text: error.message || 'Failed to update payment status', type: 'error' });
    }
  };

  const rejectPayment = async (paymentObj, fallbackId) => {
    const reason = window.prompt('Rejection reason (optional):');
    if (reason === null) return;
    await updateStatus(paymentObj, fallbackId, 'rejected', reason || undefined);
  };

  // Calculate collection statistics
  const calculateStats = () => {
    const total = payments.reduce((sum, p) => sum + parseFloat(p?.amount || 0), 0);
    const collected = payments
      .filter((p) => (p?.status || '').toUpperCase() === 'COMPLETED')
      .reduce((sum, p) => sum + parseFloat(p?.amount || 0), 0);
    const pending = payments
      .filter((p) => (p?.status || '').toUpperCase() === 'PENDING')
      .reduce((sum, p) => sum + parseFloat(p?.amount || 0), 0);
    const overdue = payments
      .filter((p) => {
        const status = (p?.status || '').toUpperCase();
        const dueDate = p?.due_date ? new Date(p.due_date) : null;
        const today = new Date();
        return status === 'PENDING' && dueDate && dueDate < today;
      })
      .reduce((sum, p) => sum + parseFloat(p?.amount || 0), 0);

    return { total, collected, pending, overdue };
  };

  const stats = calculateStats();

  // Filter payments
  const filteredPayments = payments.filter((payment) => {
    const status = (payment?.status || '').toUpperCase();

    if (statusFilter && status !== statusFilter.toUpperCase()) return false;

    if (methodFilter) {
      const paymentMethod = (payment?.method || '').toLowerCase();
      if (paymentMethod !== methodFilter.toLowerCase()) return false;
    }

    if (dateFrom) {
      const paymentDate = new Date(payment?.payment_date || payment?.date);
      const fromDate = new Date(dateFrom);
      if (paymentDate < fromDate) return false;
    }

    if (dateTo) {
      const paymentDate = new Date(payment?.payment_date || payment?.date);
      const toDate = new Date(dateTo);
      if (paymentDate > toDate) return false;
    }

    if (globalSearch) {
      const searchTerm = globalSearch.toLowerCase();
      const studentName = payment?.student?.name || payment?.student_name || '';
      const coachName = payment?.submittedByCoach?.name || payment?.coach_name || '';
      const parentName = payment?.student?.parent_name || payment?.student?.parentName || '';
      const paymentMethod = payment?.method || '';
      const amount = payment?.amount?.toString() || '';
      const pStatus = payment?.status || '';

      return (
        studentName?.toLowerCase()?.includes(searchTerm) ||
        coachName?.toLowerCase()?.includes(searchTerm) ||
        parentName?.toLowerCase()?.includes(searchTerm) ||
        paymentMethod?.toLowerCase()?.includes(searchTerm) ||
        amount?.includes(searchTerm) ||
        pStatus?.toLowerCase()?.includes(searchTerm)
      );
    }

    return true;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredPayments.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

  // Smart pagination page numbers generation
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, methodFilter, dateFrom, dateTo, globalSearch]);

  const clearFilters = () => {
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setMethodFilter('');
    setGlobalSearch('');
  };

  return (
    <div className="space-y-6 w-full overflow-x-hidden">
      <div>
        <h2 className="text-2xl font-bold">Fee Management</h2>
        <p className="text-muted text-sm">Track payments, due dates, and collection statistics.</p>
      </div>

      {/* Collection Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="text-2xl font-bold text-slate-800">₹{stats.total.toFixed(2)}</div>
          <div className="text-muted text-xs font-medium">Total Amount</div>
        </div>
        <div className="card bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="text-success text-2xl font-bold">₹{stats.collected.toFixed(2)}</div>
          <div className="text-muted text-xs font-medium">Collected</div>
        </div>
        <div className="card bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="text-warning text-2xl font-bold">₹{stats.pending.toFixed(2)}</div>
          <div className="text-muted text-xs font-medium">Pending</div>
        </div>
        <div className="card bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="text-danger text-2xl font-bold">₹{stats.overdue.toFixed(2)}</div>
          <div className="text-muted text-xs font-medium">Overdue</div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* RECORD PAYMENT CARD */}
        <form className="card space-y-4 bg-white p-5 rounded-xl border border-slate-100 shadow-sm" onSubmit={handleSubmit}>
          <h3 className="text-base font-bold tracking-tight">Record Payment</h3>

          <div>
            <label className="label text-xs font-semibold block mb-1" htmlFor="payStudent">
              Student
            </label>
            <div className="relative">
              <input
                id="payStudent"
                type="text"
                className="input-field text-foreground bg-[var(--color-input)] w-full p-2 border rounded-lg text-sm"
                placeholder="Search student by name, mobile or ID..."
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
                <div className="absolute z-50 w-full rounded-md border max-h-60 overflow-y-auto mt-1 shadow-lg bg-white dark:bg-[#151824] border-slate-200 dark:border-slate-800">
                  {(() => {
                    const filteredStudents = getFilteredStudents();
                    if (filteredStudents.length === 0) {
                      return (
                        <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                          No students found
                        </div>
                      );
                    }
                    return filteredStudents.map((s, index) => {
                      const name = s?.name || `${s?.firstName || ''} ${s?.lastName || ''}`;
                      const parentName = s?.parent_name || s?.parentName || '—';
                      const mobile = s?.phone || s?.parent_phone || s?.mobile || '—';
                      const batchName = s?.batch?.name || '—';
                      const isHighlighted = index === highlightedIndex;
                      return (
                        <div
                          key={s?.id || s?.student_id}
                          className={`cursor-pointer px-4 py-3 text-sm transition-colors duration-150 border-b last:border-b-0 ${
                            isHighlighted
                              ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-700/30 text-slate-700 dark:text-slate-300'
                          } border-slate-200 dark:border-slate-800`}
                          onMouseDown={() => {
                            const studentId = s?.id || s?.student_id;
                            setStudentSearchTerm(name);
                            setDropdownOpen(false);
                            setHighlightedIndex(-1);
                            handleStudentChange(studentId);
                          }}
                          onMouseEnter={() => setHighlightedIndex(index)}
                        >
                          <div className="font-medium">{name}</div>
                          <div className="text-xs mt-1 text-slate-500 dark:text-slate-400">
                            <span className="inline-block mr-3">Parent: {parentName}</span>
                            <span className="inline-block mr-3">Mobile: {mobile}</span>
                            <span className="inline-block">Batch: {batchName}</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* COMPREHENSIVE FEE BREAKDOWN */}
          {form.student_id && (
            <div className="bg-accent/10 border-accent/20 space-y-3 rounded-lg border p-4 bg-slate-50/50">
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
                  <div className="bg-surface flex items-center justify-between rounded p-2 text-sm border bg-white">
                    <span className="text-slate-600 font-bold">Pending Dues Outstanding:</span>
                    <span className="text-danger text-base font-bold">
                      ₹{studentFeeData.balance_outstanding?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted font-medium">Pending Dues Outstanding:</span>
                  <span className="text-danger text-base font-bold">
                    ₹{parseFloat(form.pending_amount || 0).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="label text-xs font-semibold block mb-1" htmlFor="payAmount">
              Amount to Pay
            </label>
            <input
              id="payAmount"
              name="amount"
              type="number"
              min="0"
              step="0.01"
              className="input-field w-full p-2 border rounded-lg text-sm"
              value={form.amount}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label text-xs font-semibold block mb-1" htmlFor="payDate">
                Payment Date
              </label>
              <input
                id="payDate"
                name="payment_date"
                type="date"
                className="input-field w-full p-2 border rounded-lg text-sm"
                value={form.payment_date}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="label text-xs font-semibold block mb-1" htmlFor="dueDate">
                Due Date (Optional)
              </label>
              <input
                id="dueDate"
                name="due_date"
                type="date"
                className="input-field w-full p-2 border rounded-lg text-sm"
                value={form.due_date}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label text-xs font-semibold block mb-1" htmlFor="payMethod">
                Method
              </label>
              <select
                id="payMethod"
                name="method"
                className="input-field text-foreground bg-[var(--color-input)] w-full p-2 border rounded-lg text-sm"
                value={form.method}
                onChange={handleChange}
                required
              >
                <option value="">Select Payment Method</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div>
              <label className="label text-xs font-semibold block mb-1" htmlFor="payStatus">
                Status
              </label>
              <select
                id="payStatus"
                name="status"
                className="input-field text-foreground bg-[var(--color-input)] w-full p-2 border rounded-lg text-sm"
                value={form.status}
                onChange={handleChange}
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn-primary mt-2 w-full bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg font-medium text-sm transition cursor-pointer">
            Create Payment
          </button>
        </form>

        {/* FILTERS CARD */}
        <div className="card space-y-4 bg-white p-5 rounded-xl border border-slate-100 shadow-sm h-fit">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-base font-bold tracking-tight">Filters</h3>
            <button type="button" className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>

          <div>
            <label className="label text-xs font-medium block mb-1" htmlFor="statusFilter">
              Status
            </label>
            <select
              id="statusFilter"
              className="input-field w-full p-2 border rounded-lg text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="label text-xs font-medium block mb-1" htmlFor="methodFilter">
              Payment Method
            </label>
            <select
              id="methodFilter"
              className="input-field text-foreground bg-[var(--color-input)] w-full p-2 border rounded-lg text-sm"
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
            >
              <option value="">All Methods</option>
              <option value="upi">UPI</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="online">Online</option>
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div>
              <label className="label text-xs font-medium block mb-1" htmlFor="dateFrom">
                From Date
              </label>
              <input
                id="dateFrom"
                type="date"
                className="input-field w-full p-2 border rounded-lg text-xs"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="label text-xs font-medium block mb-1" htmlFor="dateTo">
                To Date
              </label>
              <input
                id="dateTo"
                type="date"
                className="input-field w-full p-2 border rounded-lg text-xs"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* PAYMENT RECORDS LIST */}
      <div className="card bg-white p-5 rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h3 className="text-base font-bold tracking-tight">Payment Records</h3>
          <input
            type="text"
            className="input-field w-full sm:w-64 p-2 border rounded-lg text-xs"
            placeholder="Search payments..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
          />
        </div>
        {loading ? (
          <Loader />
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse text-left text-xs min-w-[800px] text-slate-600">
              <thead>
                <tr className="border-b text-slate-400 text-[11px] font-semibold uppercase tracking-wider bg-slate-50/70">
                  <th className="p-3">Student</th>
                  <th className="p-3">Collected By (Coach)</th> {/* FIXED: Column for tracking who sent it */}
                  <th className="p-3">Amount</th>
                  <th className="p-3">Remarks & Proof</th> {/* FIXED: Column for screenshot verification & metadata text */}
                  <th className="p-3">Payment Date</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedPayments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-muted py-8 text-center text-xs italic">
                      No payments found matching criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedPayments.map((payment, index) => {
                    const normalizedStatus = (payment?.status || '').toUpperCase();
                    const currentId = payment?.id || payment?._id || payment?.payment_id || index;
                    const isOverdue =
                      normalizedStatus === 'PENDING' &&
                      payment?.due_date &&
                      new Date(payment.due_date) < new Date();

                    return (
                      <tr
                        key={currentId}
                        className={`hover:bg-slate-50/50 transition-colors ${isOverdue ? 'bg-rose-50/30' : ''}`}
                      >
                        {/* Student Name */}
                        <td className="p-3 font-semibold text-slate-800">
                          {payment?.student?.name ||
                            payment?.student_name ||
                            `Student #${payment?.student_id}`}
                        </td>

                        {/* FIXED: Collected By Coach UI handler */}
                        <td className="p-3 font-medium text-slate-700 bg-slate-50/30">
                          {payment?.submittedByCoach?.name ? (
                            <span className="text-emerald-600 font-semibold">
                              Coach: {payment.submittedByCoach.name}
                            </span>
                          ) : payment?.coach_name ? (
                            <span className="text-emerald-600 font-semibold">Coach: {payment.coach_name}</span>
                          ) : (
                            <span className="text-slate-400 italic">Admin Direct</span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="p-3 font-bold text-slate-800">₹{parseFloat(payment?.amount || 0).toFixed(2)}</td>

                        {/* FIXED: Remarks & Document Evidence popups integrations */}
                        <td className="p-3 max-w-xs">
                          <div className="flex flex-col space-y-1">
                            {payment?.remarks && (
                              <span className="italic text-slate-500 text-[11px] block truncate">
                                "{payment.remarks}"
                              </span>
                            )}
                            {(payment?.attachmentUrl || payment?.receipt_image || payment?.proof) ? (
                              <button
                                type="button"
                                onClick={() => setPreviewImage(payment.attachmentUrl || payment.receipt_image || payment.proof)}
                                className="text-blue-500 hover:text-blue-700 font-semibold underline text-left flex items-center gap-0.5 cursor-pointer"
                              >
                                📸 View Receipt Proof
                              </button>
                            ) : (
                              <span className="text-slate-300 text-[10px] italic">No proof attached</span>
                            )}
                          </div>
                        </td>

                        {/* Dates */}
                        <td className="p-3">
                          {payment?.payment_date || payment?.date ? new Date(payment.payment_date || payment.date).toLocaleDateString('en-IN') : '-'}
                        </td>
                        <td className="p-3">
                          {payment?.due_date ? new Date(payment.due_date).toLocaleDateString('en-IN') : '-'}
                        </td>

                        {/* Method */}
                        <td className="p-3 text-xs font-semibold uppercase text-slate-500 tracking-wide">
                          {payment?.method || 'N/A'}
                        </td>

                        {/* Status badging */}
                        <td className="p-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                              isOverdue
                                ? 'bg-rose-50 text-rose-600 border-rose-200'
                                : normalizedStatus === 'COMPLETED'
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                  : normalizedStatus === 'FAILED' || normalizedStatus === 'REJECTED'
                                    ? 'bg-rose-50 text-rose-600 border-rose-200'
                                    : 'bg-amber-50 text-amber-600 border-amber-200'
                            }`}
                          >
                            {isOverdue ? 'OVERDUE' : payment?.status || 'pending'}
                          </span>
                        </td>

                        {/* Action buttons hooks */}
                        <td className="p-3 text-right whitespace-nowrap space-x-1.5">
                          {normalizedStatus !== 'COMPLETED' && (
                            <button
                              type="button"
                              className="bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer shadow-sm"
                              onClick={() => updateStatus(payment, currentId, 'completed')}
                            >
                              Mark Paid
                            </button>
                          )}
                          {normalizedStatus === 'PENDING' && (
                            <button
                              type="button"
                              className="border border-rose-200 bg-white hover:bg-rose-50 text-rose-500 px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer"
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
          </div>
        )}

        {/* Pagination Section */}
        {filteredPayments.length > 0 && (
          <div className="mt-4 flex flex-col items-center justify-between gap-4 sm:flex-row sm:gap-0 border-t pt-4 border-slate-100">
            <div className="text-slate-400 text-xs">
              Showing <span className="font-medium text-slate-700">{startIndex + 1}</span>-
              <span className="font-medium text-slate-700">{Math.min(endIndex, filteredPayments.length)}</span> of{' '}
              <span className="font-medium text-slate-700">{filteredPayments.length}</span> records
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="px-2.5 py-1 text-xs border rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                {'< Prev'}
              </button>
              {getPageNumbers().map((page, index) => (
                page === '...' ? (
                  <span key={`ellipsis-${index}`} className="text-slate-400 px-1 text-xs">
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    type="button"
                    className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition cursor-pointer ${
                      currentPage === page
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                )
              ))}
              <button
                type="button"
                className="px-2.5 py-1 text-xs border rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                {'Next >'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* GLOBAL TOAST MESSAGE POPUP */}
      {message.text && (
        <div
          className={`fixed bottom-4 right-4 z-50 rounded-lg p-4 text-sm font-medium shadow-lg border animate-fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ==================== NEW: LIGHTBOX IMAGE PREVIEW MODAL OVERLAY ==================== */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-4 relative space-y-4 shadow-2xl border">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-bold text-slate-800 text-sm">Coach Submitted Fee Proof Screenshot</h4>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1 cursor-pointer focus:outline-none"
              >
                ✕
              </button>
            </div>
            
            {/* Image viewport holder */}
            <div className="flex justify-center bg-slate-50 rounded-lg overflow-hidden border max-h-[65vh]">
              <img
                src={previewImage}
                alt="Payment Receipt Verification Document"
                className="object-contain max-w-full h-auto"
                onError={(e) => {
                  // Fallback string placeholder if server file loading returns 404
                  e.target.src = "https://placehold.co/600x400?text=Receipt+Screenshot+File+Not+Found";
                }}
              />
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="px-4 py-1.5 bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-200 transition cursor-pointer"
              >
                Close Receipt View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}