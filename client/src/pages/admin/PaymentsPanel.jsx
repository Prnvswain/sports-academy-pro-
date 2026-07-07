import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Loader from '../../components/Loader';
import { adminGet, adminPatch, adminPost } from '../../api/client';

const emptyForm = {
  student_id: '',
  amount: '',
  pending_amount: 0, 
  payment_date: new Date().toISOString().split('T')[0],
  due_date: '',
  method: '',
  status: 'pending',
};

export default function AccountsPanel() {
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

  // Image Modal Preview State
  const [previewImage, setPreviewImage] = useState(null);

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

  useEffect(() => {
    loadData(false);
    const interval = setInterval(() => {
      loadData(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleStudentChange = async (selectedId) => {
    if (!selectedId) {
      setForm((prev) => ({ ...prev, student_id: '', amount: '', pending_amount: 0 }));
      setStudentFeeData(null);
      setStudentSearchTerm('');
      return;
    }

    const studentObj = students.find((s) => (s.id || s.student_id)?.toString() === selectedId.toString());
    setForm((prev) => ({ ...prev, student_id: selectedId }));

    if (studentObj) {
      setStudentSearchTerm(studentObj.name || `${studentObj.firstName || ''} ${studentObj.lastName || ''}`);
    }

    setLoadingFeeData(true);
    try {
      const ledgerRes = await adminGet(`/admin/accounts/student-ledger/${selectedId}`);
      const ledgerData = ledgerRes.data || {};
      setStudentFeeData(ledgerData);

      const pendingAmount = ledgerData.balance_outstanding || 0;
      setForm((prev) => ({
        ...prev,
        pending_amount: pendingAmount,
        amount: pendingAmount > 0 ? pendingAmount.toString() : '',
      }));
    } catch (error) {
      console.error('Failed to fetch student ledger:', error);
      setStudentFeeData(null);
      if (studentObj) {
        const regFee = parseFloat(studentObj.registration_fee || studentObj.registrationFee || 0);
        const additionalCharges = parseFloat(studentObj.additional_charges || studentObj.additionalCharges || 0);
        const discount = parseFloat(studentObj.discount || 0);
        const pendingAmount = Math.max(0, regFee + additionalCharges - discount);

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

    try {
      const result = await adminPost('/admin/accounts', payload);
      setMessage({ text: result.message || 'Payment recorded successfully', type: 'success' });
      setForm({ ...emptyForm, payment_date: new Date().toISOString().split('T')[0] });
      setStudentSearchTerm('');
      setStudentFeeData(null);
      loadData(false);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const updateStatus = async (paymentObj, fallbackId, status, rejected_reason) => {
    let targetId = paymentObj?.id || paymentObj?.payment_id || paymentObj?.paymentId || paymentObj?.PaymentID || paymentObj?._id || paymentObj?.id_payment;

    if (!targetId && targetId !== 0) {
      const keys = Object.keys(paymentObj || {});
      const idKey = keys.find((k) => k.toLowerCase().includes('id'));
      if (idKey) targetId = paymentObj[idKey];
    }

    if ((!targetId && targetId !== 0) || targetId === fallbackId) {
      setMessage({ text: 'Error: Frontend could not read your database Primary Key ID field.', type: 'error' });
      return;
    }

    try {
      const result = await adminPatch(`/admin/accounts/${targetId}/status`, { status, rejected_reason });
      setMessage({ text: result.message || 'Status updated successfully', type: 'success' });
      loadData(true);
    } catch (error) {
      setMessage({ text: error.message || 'Failed to update payment status', type: 'error' });
    }
  };

  const rejectPayment = async (paymentObj, fallbackId) => {
    const reason = window.prompt('Rejection reason (optional):');
    if (reason === null) return;
    await updateStatus(paymentObj, fallbackId, 'rejected', reason || undefined);
  };

  const calculateStats = () => {
    // Calculate total expected fees from all students' Total Computed Fee (Decided)
    const totalExpectedFees = students.reduce((sum, student) => {
      if (student.enrollments && Array.isArray(student.enrollments) && student.enrollments.length > 0) {
        // Get latest enrollment
        const latestEnrollment = student.enrollments[student.enrollments.length - 1];
        
        // Calculate multiplier
        const dynamicMultiplier = parseFloat(
          latestEnrollment?.duration_plan?.multiplier ||
            latestEnrollment?.plan_multiplier ||
            latestEnrollment?.planMultiplier ||
            1,
        );

        // Calculate sports fee with multiplier
        const rawBaseSportsFee = parseFloat(
          latestEnrollment?.sports_base_fee ||
            latestEnrollment?.sportsBaseFee ||
            latestEnrollment?.sports_fee ||
            0,
        );
        const totalMultipliedSportsFee = rawBaseSportsFee * dynamicMultiplier;

        // Get other fee components
        const regFeeAmount = parseFloat(latestEnrollment?.registration_fee || 0);
        const additionalSurchargesAmount = parseFloat(latestEnrollment?.additional_charges || 0);
        const appliedDiscountAmount = parseFloat(latestEnrollment?.discount || 0);

        // Calculate Total Computed Fee (Decided)
        const accurateTotalComputedFee =
          totalMultipliedSportsFee +
          regFeeAmount +
          additionalSurchargesAmount -
          appliedDiscountAmount;

        return sum + accurateTotalComputedFee;
      }
      return sum;
    }, 0);

    const collected = payments.filter((p) => (p?.status || '').toUpperCase() === 'COMPLETED').reduce((sum, p) => sum + parseFloat(p?.amount || 0), 0);
    const pending = payments.filter((p) => (p?.status || '').toUpperCase() === 'PENDING').reduce((sum, p) => sum + parseFloat(p?.amount || 0), 0);
    const overdue = payments.filter((p) => {
      const status = (p?.status || '').toUpperCase();
      const dueDate = p?.due_date ? new Date(p.due_date) : null;
      const today = new Date();
      return status === 'PENDING' && dueDate && dueDate < today;
    }).reduce((sum, p) => sum + parseFloat(p?.amount || 0), 0);

    return { total: totalExpectedFees, collected, pending, overdue };
  };

  const stats = calculateStats();

  const filteredPayments = payments.filter((payment) => {
    const status = (payment?.status || '').toUpperCase();
    if (statusFilter && status !== statusFilter.toUpperCase()) return false;
    if (methodFilter) {
      const paymentMethod = (payment?.method || '').toLowerCase();
      if (paymentMethod !== methodFilter.toLowerCase()) return false;
    }
    if (dateFrom) {
      const paymentDate = new Date(payment?.payment_date || payment?.date);
      if (paymentDate < new Date(dateFrom)) return false;
    }
    if (dateTo) {
      const paymentDate = new Date(payment?.payment_date || payment?.date);
      if (paymentDate > new Date(dateTo)) return false;
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

  const totalPages = Math.ceil(filteredPayments.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

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
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6 w-full max-w-7xl mx-auto overflow-x-hidden"
    >
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Fee Management</h2>
        <p className="text-base text-muted-foreground mt-1">Track payments, due dates, and collection statistics.</p>
      </div>

      {/* Modern KPI Statistics */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Amount', value: stats.total, color: 'text-foreground', bgLine: 'rgb(var(--color-blue-primary))' },
          { label: 'Collected', value: stats.collected, color: 'text-[rgb(var(--color-accent-primary))]', bgLine: 'rgb(var(--color-accent-primary))' },
          { label: 'Pending', value: stats.pending, color: 'text-[rgb(var(--color-amber-primary))]', bgLine: 'rgb(var(--color-amber-primary))' },
          { label: 'Overdue', value: stats.overdue, color: 'text-[rgb(var(--color-danger))]', bgLine: 'rgb(var(--color-danger))' }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
            whileHover={{ y: -4 }}
            className="card flex flex-col justify-center relative overflow-hidden"
            style={{ borderTopWidth: '4px', borderTopColor: stat.bgLine }}
          >
            <div className="relative z-10">
              <div className={`text-3xl font-extrabold ${stat.color}`}>
                ₹{stat.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1.5">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* RECORD PAYMENT FORM */}
        <form className="card space-y-5" onSubmit={handleSubmit}>
          <div className="border-b border-border/50 pb-3">
            <h3 className="text-xl font-bold text-foreground">Record Payment</h3>
          </div>

          <div className="relative">
            <label className="label" htmlFor="payStudent">Select Student</label>
            <input
              id="payStudent"
              type="text"
              className="input-field"
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
              <div className="absolute z-50 w-full rounded-xl border border-border bg-card max-h-60 overflow-y-auto mt-2 shadow-xl">
                {(() => {
                  const filteredStudents = getFilteredStudents();
                  if (filteredStudents.length === 0) {
                    return <div className="px-4 py-3 text-sm text-muted-foreground">No students found</div>;
                  }
                  return filteredStudents.map((s, index) => {
                    const name = s?.name || `${s?.firstName || ''} ${s?.lastName || ''}`;
                    const parentName = s?.parent_name || s?.parentName || '—';
                    const mobile = s?.phone || s?.parent_phone || s?.mobile || '—';
                    const isHighlighted = index === highlightedIndex;
                    return (
                      <div
                        key={s?.id || s?.student_id}
                        className={`cursor-pointer px-4 py-3 text-sm transition-colors duration-150 border-b border-border/50 last:border-b-0 ${
                          isHighlighted ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-foreground'
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
                        <div className="font-semibold">{name}</div>
                        <div className="text-xs mt-1 text-muted-foreground">
                          <span className="inline-block mr-3">Parent: {parentName}</span>
                          <span className="inline-block mr-3">Mobile: {mobile}</span>
                          <span className="inline-block">Batch: {s?.batch?.name || '—'}</span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          {/* Comprehensive Fee Breakdown */}
          {form.student_id && (
            <div className="bg-secondary border border-border/60 rounded-xl p-5 space-y-3 shadow-sm">
              {loadingFeeData ? (
                <div className="text-muted-foreground text-center text-sm font-medium animate-pulse">Fetching ledger data...</div>
              ) : studentFeeData ? (
                <>
                  <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                    <span className="text-muted-foreground text-sm font-semibold">Total Fees Assigned:</span>
                    <span className="text-foreground font-bold text-sm">₹{studentFeeData.total_fees_assigned?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                    <span className="text-muted-foreground text-sm font-semibold">Total Fees Paid:</span>
                    <span className="text-[rgb(var(--color-accent-primary))] font-bold text-sm">₹{studentFeeData.total_fees_paid?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                    <span className="text-muted-foreground text-sm font-semibold">Pending Fees:</span>
                    <span className="text-[rgb(var(--color-amber-primary))] font-bold text-sm">₹{studentFeeData.pending_fees?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                    <span className="text-muted-foreground text-sm font-semibold">Overdue Fees:</span>
                    <span className="text-[rgb(var(--color-danger))] font-bold text-sm">₹{studentFeeData.overdue_fees?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex items-center justify-between bg-background border border-border rounded-lg p-3 mt-2 shadow-inner">
                    <span className="text-foreground font-bold">Pending Dues Outstanding:</span>
                    <span className="text-[rgb(var(--color-danger))] text-lg font-black">₹{studentFeeData.balance_outstanding?.toFixed(2) || '0.00'}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between bg-background border border-border rounded-lg p-3 shadow-inner">
                  <span className="text-foreground font-bold">Pending Dues Outstanding:</span>
                  <span className="text-[rgb(var(--color-danger))] text-lg font-black">₹{parseFloat(form.pending_amount || 0).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="label" htmlFor="payAmount">Amount to Pay (₹)</label>
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

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="payDate">Payment Date</label>
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
              <label className="label" htmlFor="dueDate">Due Date (Optional)</label>
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

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="payMethod">Payment Method</label>
              <select
                id="payMethod"
                name="method"
                className="input-field"
                value={form.method}
                onChange={handleChange}
                required
              >
                <option value="">Select Method</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="payStatus">Status</label>
              <select
                id="payStatus"
                name="status"
                className="input-field"
                value={form.status}
                onChange={handleChange}
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit" className="btn-primary w-full h-12 mt-2 text-base">
            Create Payment
          </motion.button>
        </form>

        {/* FILTERS CARD */}
        <div className="card h-fit space-y-5">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="text-xl font-bold text-foreground">Filters</h3>
            <button type="button" className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>

          <div>
            <label className="label" htmlFor="statusFilter">Status</label>
            <select id="statusFilter" className="input-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor="methodFilter">Payment Method</label>
            <select id="methodFilter" className="input-field" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
              <option value="">All Methods</option>
              <option value="upi">UPI</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="online">Online</option>
            </select>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="dateFrom">From Date</label>
              <input id="dateFrom" type="date" className="input-field" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="dateTo">To Date</label>
              <input id="dateTo" type="date" className="input-field" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* FIX: FIXED PAYMENT RECORDS TABLE LAYOUT */}
      <div className="card mt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-border/50 pb-4">
          <h3 className="text-xl font-bold text-foreground">Payment Records</h3>
          <input
            type="text"
            className="input-field w-full sm:w-64 !py-2 !text-xs"
            placeholder="Search records globally..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
          />
        </div>

        {loading && payments.length === 0 ? (
          <Loader />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
            <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
              <thead className="bg-secondary text-muted-foreground text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-4 border-b border-border">Student</th>
                  <th className="px-5 py-4 border-b border-border">Source</th>
                  <th className="px-5 py-4 border-b border-border">Amount</th>
                  <th className="px-5 py-4 border-b border-border">Remarks & Proof</th>
                  <th className="px-5 py-4 border-b border-border">Payment Date</th>
                  <th className="px-5 py-4 border-b border-border">Due Date</th>
                  <th className="px-5 py-4 border-b border-border">Method</th>
                  <th className="px-5 py-4 border-b border-border">Status</th>
                  <th className="px-5 py-4 border-b border-border text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {paginatedPayments.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-5 py-8 text-center text-muted-foreground font-medium italic">
                      No payments found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedPayments.map((payment, index) => {
                    const normalizedStatus = (payment?.status || '').toUpperCase();
                    const currentId = payment?.id || payment?._id || payment?.payment_id || index;
                    const isOverdue = normalizedStatus === 'PENDING' && payment?.due_date && new Date(payment.due_date) < new Date();

                    return (
                      <tr key={currentId} className="hover:bg-secondary/40 transition-colors">
                        <td className="px-5 py-4 font-bold text-foreground">
                          {payment?.student?.name || payment?.student_name || `Student #${payment?.student_id}`}
                        </td>
                        <td className="px-5 py-4">
                          {payment?.collected_by?.name ? (
                            <span className="badge badge-info inline-flex items-center">👤 Coach - {payment.collected_by.name}</span>
                          ) : (
                            <span className="badge border-border text-muted-foreground bg-secondary inline-flex items-center">⚙️ Admin</span>
                          )}
                        </td>
                        <td className="px-5 py-4 font-bold text-foreground">₹{parseFloat(payment?.amount || 0).toFixed(2)}</td>
                        <td className="px-5 py-4 max-w-[200px] truncate">
                          <div className="flex flex-col space-y-1">
                            {payment?.remarks && <span className="text-xs text-muted-foreground italic truncate">"{payment.remarks}"</span>}
                            {(payment?.proof_url || payment?.attachmentUrl || payment?.receipt_image || payment?.proof) ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const proofUrl = payment.proof_url || payment.attachmentUrl || payment.receipt_image || payment.proof;
                                  // Prepend backend URL if proof_url is a relative path
                                  const fullUrl = proofUrl.startsWith('http') ? proofUrl : `http://localhost:5000/${proofUrl}`;
                                  setPreviewImage(fullUrl);
                                }}
                                className="text-primary hover:text-[rgb(var(--color-blue-primary))] font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors w-fit"
                              >
                                📸 View Proof
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No proof</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground">{payment?.payment_date || payment?.date ? new Date(payment.payment_date || payment.date).toLocaleDateString('en-IN') : '-'}</td>
                        <td className={`px-5 py-4 ${isOverdue ? 'text-[rgb(var(--color-danger))] font-semibold' : 'text-muted-foreground'}`}>
                          {payment?.due_date ? new Date(payment.due_date).toLocaleDateString('en-IN') : '-'}
                        </td>
                        <td className="px-5 py-4">
                          <span className="badge badge-warning inline-flex">{payment?.method || 'N/A'}</span>
                        </td>
                        <td className="px-5 py-4">
                          {isOverdue ? (
                            <span className="badge badge-danger animate-pulse inline-flex">OVERDUE</span>
                          ) : normalizedStatus === 'COMPLETED' ? (
                            <span className="badge badge-success inline-flex">COMPLETED</span>
                          ) : normalizedStatus === 'FAILED' || normalizedStatus === 'REJECTED' ? (
                            <span className="badge badge-danger inline-flex">{normalizedStatus}</span>
                          ) : (
                            <span className="badge border-amber-200 bg-amber-50 text-amber-600 inline-flex">{payment?.status || 'PENDING'}</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right space-x-2">
                          {normalizedStatus !== 'COMPLETED' && (
                            <button
                              type="button"
                              className="btn btn-success btn-sm inline-flex"
                              onClick={() => updateStatus(payment, currentId, 'completed')}
                            >
                              Mark Paid
                            </button>
                          )}
                          {normalizedStatus === 'PENDING' && (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm inline-flex"
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
          <div className="mt-5 flex flex-col items-center justify-between gap-4 sm:flex-row pt-4 border-t border-border/50">
            <div className="text-sm text-muted-foreground font-medium">
              Showing <span className="text-foreground font-bold">{startIndex + 1}</span> to <span className="text-foreground font-bold">{Math.min(endIndex, filteredPayments.length)}</span> of <span className="text-foreground font-bold">{filteredPayments.length}</span> records
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn-secondary btn-sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </button>
              {getPageNumbers().map((page, index) => (
                page === '...' ? (
                  <span key={`ellipsis-${index}`} className="text-muted-foreground px-2">...</span>
                ) : (
                  <button
                    key={page}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      currentPage === page ? 'bg-primary text-primary-foreground shadow-md' : 'bg-secondary text-foreground hover:bg-border/80'
                    }`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                )
              ))}
              <button
                className="btn-secondary btn-sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* GLOBAL TOAST MESSAGE POPUP */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-50 rounded-xl p-4 text-sm font-bold shadow-2xl border ${
              message.type === 'success' ? 'bg-[rgb(var(--color-accent-primary))] text-white border-transparent' : 'bg-[rgb(var(--color-danger))] text-white border-transparent'
            }`}
          >
            {message.type === 'success' ? '✅ ' : '⚠️ '}{message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* LIGHTBOX IMAGE PREVIEW MODAL */}
      <AnimatePresence>
        {previewImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card max-w-3xl w-full p-6 relative shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border/50 pb-4 mb-4">
                <h4 className="text-lg font-bold text-foreground">Coach Verification Proof</h4>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-border transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
              
              <div className="flex justify-center bg-secondary/30 rounded-xl border border-border/50 max-h-[65vh] overflow-hidden p-2">
                <img
                  src={previewImage}
                  alt="Payment Receipt Proof"
                  className="object-contain w-full h-full rounded-lg"
                  onError={(e) => {
                    e.target.src = "https://placehold.co/600x400?text=Receipt+Screenshot+File+Not+Found";
                  }}
                />
              </div>

              <div className="mt-5 text-right">
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="btn-secondary"
                >
                  Close View
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}