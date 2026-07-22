import { useCallback, useEffect, useState } from 'react';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Loader from '../../components/Loader';
import { adminGet, adminPatch, adminPost } from '../../api/client';
import { calculateStudentFee, calculateBalance } from '../../utils/fee.util.js';

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

  // Student Accounts Filter
  const [studentAccountsFilter, setStudentAccountsFilter] = useState('all');
  const [studentAccountsSearch, setStudentAccountsSearch] = useState('');
  const [studentAccountsData, setStudentAccountsData] = useState(null);
  const [loadingStudentAccounts, setLoadingStudentAccounts] = useState(false);
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [sortBy, setSortBy] = useState('name'); // name, highest_due, highest_paid, recently_paid
  const [activeTab, setActiveTab] = useState('payments'); // 'payments' or 'students'

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

  const loadStudentAccountsData = useCallback(async () => {
    setLoadingStudentAccounts(true);
    try {
      const result = await adminGet('/admin/accounts/students-fee-summary');
      console.log('[loadStudentAccountsData] Full API Response:', result);
      console.log('[loadStudentAccountsData] result type:', typeof result);
      console.log('[loadStudentAccountsData] result.success:', result?.success);
      console.log('[loadStudentAccountsData] result.data:', result?.data);
      console.log('[loadStudentAccountsData] result.data.students:', result?.data?.students);
      console.log('[loadStudentAccountsData] result.data.summary:', result?.data?.summary);
      console.log('[loadStudentAccountsData] result.students:', result?.students);
      console.log('[loadStudentAccountsData] result.summary:', result?.summary);
      console.log('[loadStudentAccountsData] Array.isArray(result.students):', Array.isArray(result?.students));
      console.log('[loadStudentAccountsData] Array.isArray(result.data.students):', Array.isArray(result?.data?.students));
      
      // adminGet uses unwrap which returns response.data
      // Backend returns { success: true, message: "...", data: { students: [...], summary: {...} } }
      // So result should be { success: true, message: "...", data: { students: [...], summary: {...} } }
      // We need to extract result.data
      const dataToSet = result?.data || result;
      console.log('[loadStudentAccountsData] Setting state to:', dataToSet);
      setStudentAccountsData(dataToSet);
    } catch (error) {
      console.error('[loadStudentAccountsData] Failed to load student accounts data:', error);
    } finally {
      setLoadingStudentAccounts(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
    const interval = setInterval(() => {
      loadData(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    if (activeTab === 'students' && !studentAccountsData) {
      loadStudentAccountsData();
    }
  }, [activeTab, studentAccountsData, loadStudentAccountsData]);

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
      setStudentSearchTerm(studentObj.name || `${studentObj.first_name || ''} ${studentObj.last_name || ''}`);
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
        // Use the centralized fee calculation utility for fallback
        const feeBreakdown = calculateStudentFee(studentObj);
        const pendingAmount = Math.max(0, feeBreakdown.totalComputedFee - (studentObj.paid_amount || 0));

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
          setStudentSearchTerm(student?.name || `${student?.first_name || ''} ${student?.last_name || ''}`);
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
    if (!studentSearchTerm) return students;
    const searchTerm = studentSearchTerm.toLowerCase();
    return students.filter((s) => {
      const name = s?.name || `${s?.first_name || ''} ${s?.last_name || ''}`;
      const parentName = s?.parent_name || s?.parentName || '';
      const phone = s?.phone || s?.parent_phone || '';
      const studentId = s?.id?.toString() || s?.student_id?.toString() || '';
      const batchName = s?.batch?.name || '';

      return (
        name.toLowerCase().includes(searchTerm) ||
        parentName.toLowerCase().includes(searchTerm) ||
        phone.includes(searchTerm) ||
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
        
        // Use the centralized fee calculation utility
        const feeBreakdown = calculateStudentFee(latestEnrollment);
        return sum + feeBreakdown.totalComputedFee;
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

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStudentAmount = (student) => {
    if (student?.enrollments && student.enrollments.length > 0) {
      const latestEnrollment = student.enrollments[student.enrollments.length - 1];
      // Use the centralized fee calculation utility
      const feeBreakdown = calculateStudentFee(latestEnrollment);
      return feeBreakdown.totalComputedFee;
    }
    return 0;
  };

  const getLastPaidDate = (student) => {
    if (student?.receipts && student.receipts.length > 0) {
      const latestReceipt = student.receipts[0];
      return latestReceipt.payment_date || latestReceipt.created_at;
    }
    if (student?.enrollments && student.enrollments.length > 0) {
      const latestEnrollment = student.enrollments[student.enrollments.length - 1];
      return latestEnrollment.created_at;
    }
    return null;
  };

  const getPaidAmount = (student) => {
    if (student?.enrollments && student.enrollments.length > 0) {
      const latestEnrollment = student.enrollments[student.enrollments.length - 1];
      return latestEnrollment.paid_amount || 0;
    }
    return 0;
  };

  const quickCollectFee = (student) => {
    const studentId = student.student_id || student.id;
    setStudentSearchTerm(student.name);
    setForm((prev) => ({ ...prev, student_id: studentId }));
    handleStudentChange(studentId);
    setActiveTab('payments');
    // Scroll to payment form
    document.getElementById('payStudent')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const toggleStudentExpansion = (studentId) => {
    setExpandedStudentId(expandedStudentId === studentId ? null : studentId);
  };

  const getSortedStudents = (students) => {
    const sorted = [...students];
    switch (sortBy) {
      case 'highest_due':
        return sorted.sort((a, b) => (b.due_amount || 0) - (a.due_amount || 0));
      case 'highest_paid':
        return sorted.sort((a, b) => (b.paid_amount || 0) - (a.paid_amount || 0));
      case 'recently_paid':
        return sorted.sort((a, b) => {
          const dateA = a.last_paid_date ? new Date(a.last_paid_date).getTime() : 0;
          const dateB = b.last_paid_date ? new Date(b.last_paid_date).getTime() : 0;
          return dateB - dateA;
        });
      case 'name':
      default:
        return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
  };

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
      className="space-y-5 w-full max-w-7xl mx-auto overflow-x-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Fee Management</h2>
          <p className="text-sm text-muted-foreground mt-1">Track payments, due dates, and collection statistics.</p>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-2 bg-surface rounded-lg p-1 border border-border">
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
              activeTab === 'payments'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Payment Management
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
              activeTab === 'students'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Student Accounts
          </button>
        </div>
      </div>

      {activeTab === 'payments' ? (
        <>
          {/* Modern KPI Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="grid gap-5 xl:grid-cols-2">
        {/* RECORD PAYMENT FORM */}
        <form className="card space-y-4" onSubmit={handleSubmit}>
          <div className="border-b border-border/50 pb-2.5">
            <h3 className="text-lg font-bold text-foreground">Record Payment</h3>
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
                    const name = s?.name || `${s?.first_name || ''} ${s?.last_name || ''}`;
                    const parentName = s?.parent_name || s?.parentName || '—';
                    const phone = s?.phone || s?.parent_phone || '—';
                    const isHighlighted = index === highlightedIndex;
                    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    return (
                      <div
                        key={s?.id || s?.student_id}
                        className={`cursor-pointer px-4 py-3 text-sm transition-colors duration-150 border-b border-border/50 last:border-b-0 flex items-center gap-3 ${
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
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                          {s?.profile_photo ? (
                            <img src={s.profile_photo} alt={name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            initials
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{name}</div>
                          <div className="text-xs mt-1 text-muted-foreground">
                            <span className="inline-block mr-3">Parent: {parentName}</span>
                            <span className="inline-block mr-3">Phone: {phone}</span>
                            <span className="inline-block">Batch: {s?.batch?.name || '—'}</span>
                          </div>
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
            <div className="bg-secondary border border-border/60 rounded-xl p-4 space-y-2.5 shadow-sm">
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
                  <div className="flex items-center justify-between bg-background border border-border rounded-lg p-2.5 mt-2 shadow-inner">
                    <span className="text-foreground font-bold">Pending Dues Outstanding:</span>
                    <span className="text-[rgb(var(--color-danger))] text-base font-black">₹{studentFeeData.balance_outstanding?.toFixed(2) || '0.00'}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between bg-background border border-border rounded-lg p-2.5 shadow-inner">
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
        <div className="card h-fit space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
            <h3 className="text-lg font-bold text-foreground">Filters</h3>
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
          <h3 className="text-lg font-bold text-foreground">Payment Records</h3>
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
                          <div className="flex flex-col space-y-0.5">
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
          <div className="mt-4 flex flex-col items-center justify-between gap-4 sm:flex-row pt-3.5 border-t border-border/50">
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
        </>
      ) : (
        <>
          {/* STUDENT ACCOUNTS SECTION */}
          {/* Dashboard Summary Cards */}
          {studentAccountsData?.summary && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { label: 'Total Students', value: studentAccountsData.summary.total_students, color: 'text-foreground', bgLine: 'rgb(var(--color-blue-primary))' },
                { label: 'Fully Paid', value: studentAccountsData.summary.fully_paid, color: 'text-[rgb(var(--color-accent-primary))]', bgLine: 'rgb(var(--color-accent-primary))' },
                { label: 'Partially Paid', value: studentAccountsData.summary.partially_paid, color: 'text-[rgb(var(--color-amber-primary))]', bgLine: 'rgb(var(--color-amber-primary))' },
                { label: 'Unpaid', value: studentAccountsData.summary.unpaid, color: 'text-[rgb(var(--color-danger))]', bgLine: 'rgb(var(--color-danger))' },
                { label: 'Outstanding', value: `₹${studentAccountsData.summary.total_outstanding.toFixed(2)}`, color: 'text-[rgb(var(--color-purple-primary))]', bgLine: 'rgb(var(--color-purple-primary))' }
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
                      {stat.value}
                    </div>
                    <div className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1.5">{stat.label}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Student Accounts Section */}
          <div className="card mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-border/50 pb-4">
              <div>
                <h3 className="text-xl font-bold text-foreground">Student Accounts</h3>
                <p className="text-sm text-muted-foreground mt-1">View student fee status and payment history</p>
              </div>
              
              {/* Filter Toggle */}
              <div className="flex gap-2 bg-surface rounded-lg p-1 border border-border">
                <button
                  onClick={() => setStudentAccountsFilter('all')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    studentAccountsFilter === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All ({studentAccountsData?.students?.length || 0})
                </button>
                <button
                  onClick={() => setStudentAccountsFilter('paid')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    studentAccountsFilter === 'paid'
                      ? 'bg-emerald-500 text-white'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Paid ({studentAccountsData?.students?.filter(s => s.fee_status === 'paid').length || 0})
                </button>
                <button
                  onClick={() => setStudentAccountsFilter('unpaid')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    studentAccountsFilter === 'unpaid'
                      ? 'bg-amber-500 text-white'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Unpaid ({studentAccountsData?.students?.filter(s => s.fee_status === 'unpaid').length || 0})
                </button>
              </div>
            </div>

            {/* Search and Sort */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <input
                type="text"
                placeholder="Search by student name, parent name, or phone..."
                value={studentAccountsSearch}
                onChange={(e) => setStudentAccountsSearch(e.target.value)}
                className="input-field flex-1 max-w-md !py-2 !text-xs"
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input-field w-full sm:w-48 !py-2 !text-xs"
              >
                <option value="name">Sort by Name</option>
                <option value="highest_due">Highest Due</option>
                <option value="highest_paid">Highest Paid</option>
                <option value="recently_paid">Recently Paid</option>
              </select>
            </div>

            {/* Student Accounts Table */}
            {loadingStudentAccounts ? (
              <Loader message="Loading student accounts..." />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
                <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                  <thead className="bg-secondary text-muted-foreground text-xs uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-5 py-4 border-b border-border">Student</th>
                      <th className="px-5 py-4 border-b border-border">Parent</th>
                      <th className="px-5 py-4 border-b border-border">Progress</th>
                      <th className="px-5 py-4 border-b border-border">Amount</th>
                      <th className="px-5 py-4 border-b border-border">Paid</th>
                      <th className="px-5 py-4 border-b border-border">Due</th>
                      <th className="px-5 py-4 border-b border-border">Last Paid</th>
                      <th className="px-5 py-4 border-b border-border">Status</th>
                      <th className="px-5 py-4 border-b border-border">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {(() => {
                      console.log('[StudentAccounts Render] studentAccountsData:', studentAccountsData);
                      console.log('[StudentAccounts Render] studentAccountsData.students:', studentAccountsData?.students);
                      console.log('[StudentAccounts Render] Array.isArray(studentAccountsData.students):', Array.isArray(studentAccountsData?.students));
                      
                      const studentsList = studentAccountsData?.students || [];
                      const filteredStudents = studentsList.filter((student) => {
                        const feeStatus = student.fee_status || 'unpaid';
                        
                        // Filter by payment status
                        if (studentAccountsFilter === 'paid' && feeStatus !== 'paid') return false;
                        if (studentAccountsFilter === 'unpaid' && feeStatus !== 'unpaid') return false;
                        
                        // Filter by search term
                        if (studentAccountsSearch) {
                          const searchLower = studentAccountsSearch.toLowerCase();
                          const name = student.name || '';
                          const parentName = student.parent_name || '';
                          const phone = student.phone || '';
                          
                          return (
                            name.toLowerCase().includes(searchLower) ||
                            parentName.toLowerCase().includes(searchLower) ||
                            phone.includes(searchLower)
                          );
                        }
                        
                        return true;
                      });

                      const sortedStudents = getSortedStudents(filteredStudents);

                      if (sortedStudents.length === 0) {
                        return (
                          <tr>
                            <td colSpan="9" className="px-5 py-8 text-center text-muted-foreground font-medium italic">
                              No students found
                            </td>
                          </tr>
                        );
                      }

                      return sortedStudents.map((student, index) => {
                        const totalAmount = student.total_fee || 0;
                        const paidAmount = student.paid_amount || 0;
                        const dueAmount = student.due_amount || 0;
                        const lastPaidDate = student.last_paid_date;
                        const feeStatus = student.fee_status || 'unpaid';
                        const paymentProgress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
                        const isExpanded = expandedStudentId === student.student_id;
                        
                        // Check if student is overdue (has due amount and no recent payment)
                        const isOverdue = dueAmount > 0 && lastPaidDate && new Date(lastPaidDate) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                        
                        return (
                          <React.Fragment key={student.student_id || index}>
                            <motion.tr
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.02 }}
                              className={`hover:bg-secondary/40 transition-colors ${isOverdue ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}
                            >
                              <td className="px-5 py-4">
                                <div className="font-bold text-foreground">
                                  {student.name || '—'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {student.phone || '—'}
                                </div>
                              </td>
                              <td className="px-5 py-4 text-sm text-foreground">
                                {student.parent_name || '—'}
                              </td>
                              <td className="px-5 py-4">
                                <div className="w-full">
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-muted-foreground">{paymentProgress.toFixed(0)}%</span>
                                  </div>
                                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${paymentProgress}%` }}
                                      transition={{ duration: 0.5, delay: index * 0.05 }}
                                      className={`h-full ${paymentProgress === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-sm font-bold text-foreground">
                                ₹{parseFloat(totalAmount || 0).toFixed(2)}
                              </td>
                              <td className="px-5 py-4 text-sm text-emerald-600 font-bold">
                                ₹{parseFloat(paidAmount || 0).toFixed(2)}
                              </td>
                              <td className="px-5 py-4 text-sm text-amber-600 font-bold">
                                ₹{parseFloat(dueAmount || 0).toFixed(2)}
                              </td>
                              <td className="px-5 py-4 text-sm text-muted-foreground">
                                {formatDate(lastPaidDate)}
                              </td>
                              <td className="px-5 py-4">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                    feeStatus === 'paid'
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                                      : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                                  }`}
                                >
                                  {feeStatus}
                                </span>
                              </td>
                              <td className="px-5 py-4 space-x-2">
                                <button
                                  type="button"
                                  onClick={() => quickCollectFee(student)}
                                  className="btn btn-primary btn-sm inline-flex"
                                >
                                  Quick Collect
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleStudentExpansion(student.student_id)}
                                  className="btn btn-secondary btn-sm inline-flex"
                                >
                                  {isExpanded ? 'Hide' : 'History'}
                                </button>
                              </td>
                            </motion.tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan="9" className="px-5 py-4 bg-secondary/30">
                                  <div className="space-y-2">
                                    <h4 className="font-bold text-foreground text-sm">Payment History</h4>
                                    {student.receipts && student.receipts.length > 0 ? (
                                      <div className="space-y-2">
                                        {student.receipts.map((receipt, idx) => (
                                          <div key={idx} className="flex items-center justify-between text-xs bg-card p-2 rounded border border-border">
                                            <div>
                                              <span className="font-semibold">₹{parseFloat(receipt.amount).toFixed(2)}</span>
                                              <span className="text-muted-foreground ml-2">{formatDate(receipt.payment_date)}</span>
                                            </div>
                                            <div className="text-muted-foreground">
                                              {receipt.method || '—'}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-muted-foreground text-xs">No payment history available</p>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

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