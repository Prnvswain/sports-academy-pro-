import { useCallback, useEffect, useState } from 'react';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Loader from '../../components/Loader';
import { adminGet, adminPatch, adminPost } from '../../api/client';
import { calculateStudentFee, calculateBalance } from '../../utils/fee.util.js';
import { Wallet, TrendingUp, AlertCircle, CheckCircle, Users, DollarSign, Calendar, Filter, Search, ArrowUpDown, Bell, Zap, Clock, Phone, Settings, XCircle } from 'lucide-react';

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

  // Form submission state to prevent duplicate submissions
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    
    // Prevent duplicate submissions
    if (isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
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

  const handleSendOverdueReminders = async () => {
    if (!window.confirm('Are you sure you want to send overdue fee reminders to all parents?')) return;
    setMessage({ text: 'Sending overdue reminders...', type: '' });
    try {
      const result = await adminPost('/admin/fees/send-reminders');
      setMessage({ text: result.message || 'Overdue reminders sent successfully', type: 'success' });
    } catch (error) {
      setMessage({ text: error.message || 'Failed to send reminders', type: 'error' });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-4 w-full overflow-x-hidden relative px-4 sm:px-6 -mt-4"
    >
      {/* Subtle Sports-Themed Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#84cc16]/3 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#22c55e]/3 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#a3e635]/2 rounded-full blur-3xl" />
      </div>

      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#84cc16] to-[#65a30d] flex items-center justify-center shadow-lg shadow-[#84cc16]/30">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Fee Management</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Track payments, due dates, and collection statistics.</p>
            </div>
          </div>
        </div>
        
        {/* Premium Segmented Toggle */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl p-1 border border-slate-200 dark:border-slate-700/50 shadow-sm">
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 flex items-center gap-1.5 ${
              activeTab === 'payments'
                ? 'bg-white dark:bg-slate-700 text-[#84cc16] shadow-md shadow-black/5'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-slate-700/30'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Payment Management
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 flex items-center gap-1.5 ${
              activeTab === 'students'
                ? 'bg-white dark:bg-slate-700 text-[#84cc16] shadow-md shadow-black/5'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-slate-700/30'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Student Accounts
          </button>
        </div>
      </div>

      {activeTab === 'payments' ? (
        <>
          {/* Premium Statistics Cards with Icons */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Amount', value: stats.total, color: 'text-blue-600', bgGradient: 'from-blue-500 to-blue-600', icon: DollarSign, bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Collected', value: stats.collected, color: 'text-[#84cc16]', bgGradient: 'from-[#84cc16] to-[#65a30d]', icon: CheckCircle, bgColor: 'bg-[#84cc16]/10 dark:bg-[#84cc16]/20' },
          { label: 'Pending', value: stats.pending, color: 'text-amber-500', bgGradient: 'from-amber-500 to-amber-600', icon: Clock, bgColor: 'bg-amber-50 dark:bg-amber-900/20' }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg shadow-black/5 border border-slate-100 dark:border-slate-700/50 overflow-hidden group cursor-default"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity" style={{ background: `linear-gradient(135deg, ${stat.bgGradient})` }} />
            <div className={`absolute top-3 right-3 w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center shadow-md`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className="relative z-10">
              <div className={`text-2xl font-black ${stat.color} tracking-tight`}>
                ₹{stat.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1">{stat.label}</div>
            </div>
          </motion.div>
        ))}
        <motion.button
          key="overdue"
          type="button"
          onClick={handleSendOverdueReminders}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          whileHover={{ y: -6, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="relative bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-4 shadow-lg shadow-red-500/20 border border-red-200 dark:border-red-700/50 overflow-hidden group cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shadow-md">
            <Bell className="w-4 h-4 text-white" />
          </div>
          <div className="relative z-10">
            <div className="text-2xl font-black text-white tracking-tight">
              ₹{stats.overdue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-white/80 text-[10px] font-bold uppercase tracking-wider mt-1">Overdue</div>
            <div className="mt-2 flex items-center gap-1.5 text-white text-xs font-bold bg-white/20 rounded-lg px-2.5 py-1 w-fit">
              <Zap className="w-3 h-3" />
              Send Reminders
            </div>
          </div>
        </motion.button>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* RECORD PAYMENT FORM - Premium Card */}
        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-black/5 border border-slate-100 dark:border-slate-700/50 p-5 space-y-4"
          onSubmit={handleSubmit}
        >
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/50">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#84cc16] to-[#65a30d] flex items-center justify-center shadow-md shadow-[#84cc16]/30">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Record Payment</h3>
          </div>

          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="payStudent">Select Student</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="payStudent"
                type="text"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] focus:ring-4 focus:ring-[#84cc16]/10 transition-all duration-300 text-sm"
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
            </div>
            {dropdownOpen && studentSearchTerm && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-50 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 max-h-72 overflow-y-auto mt-2 shadow-xl shadow-black/10"
              >
                {(() => {
                  const filteredStudents = getFilteredStudents();
                  if (filteredStudents.length === 0) {
                    return <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">No students found</div>;
                  }
                  return filteredStudents.map((s, index) => {
                    const name = s?.name || `${s?.first_name || ''} ${s?.last_name || ''}`;
                    const parentName = s?.parent_name || s?.parentName || '—';
                    const phone = s?.phone || s?.parent_phone || '—';
                    const isHighlighted = index === highlightedIndex;
                    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    return (
                      <motion.div
                        key={s?.id || s?.student_id}
                        whileHover={{ scale: 1.02, x: 4 }}
                        transition={{ duration: 0.15 }}
                        className={`cursor-pointer px-4 py-3 text-xs transition-all duration-150 border-b border-slate-100 dark:border-slate-800/50 last:border-b-0 flex items-center gap-3 ${
                          isHighlighted ? 'bg-[#84cc16]/10 text-[#84cc16]' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-900 dark:text-slate-100'
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
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#84cc16] to-[#65a30d] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 shadow-md shadow-[#84cc16]/30">
                          {s?.profile_photo ? (
                            <img src={s.profile_photo} alt={name} className="w-full h-full rounded-2xl object-cover" />
                          ) : (
                            initials
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm truncate">{name}</div>
                          <div className="text-[10px] mt-1 text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5">
                            <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" /> Parent: {parentName}</span>
                            <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" /> Phone: {phone}</span>
                            <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" /> Batch: {s?.batch?.name || '—'}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  });
                })()}
              </motion.div>
            )}
          </div>

          {/* Comprehensive Fee Breakdown - Premium Card */}
          {form.student_id && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3 shadow-md"
            >
              {loadingFeeData ? (
                <div className="text-slate-500 dark:text-slate-400 text-center text-xs font-medium animate-pulse flex items-center justify-center gap-2">
                  <Clock className="w-3 h-3 animate-spin" />
                  Fetching ledger data...
                </div>
              ) : studentFeeData ? (
                <>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5">
                      <DollarSign className="w-3 h-3" /> Total Fees Assigned
                    </span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold text-sm">₹{studentFeeData.total_fees_assigned?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5">
                      <CheckCircle className="w-3 h-3 text-[#84cc16]" /> Total Fees Paid
                    </span>
                    <span className="text-[#84cc16] font-bold text-sm">₹{studentFeeData.total_fees_paid?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-amber-500" /> Pending Fees
                    </span>
                    <span className="text-amber-500 font-bold text-sm">₹{studentFeeData.pending_fees?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3 text-red-500" /> Overdue Fees
                    </span>
                    <span className="text-red-500 font-bold text-sm">₹{studentFeeData.overdue_fees?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 border-2 border-[#84cc16] rounded-xl p-3 shadow-md shadow-[#84cc16]/10">
                    <span className="text-slate-900 dark:text-slate-100 font-bold flex items-center gap-1.5 text-xs">
                      <Wallet className="w-4 h-4 text-[#84cc16]" /> Pending Dues Outstanding
                    </span>
                    <span className="text-[#84cc16] text-lg font-black">₹{studentFeeData.balance_outstanding?.toFixed(2) || '0.00'}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between bg-white dark:bg-slate-900 border-2 border-[#84cc16] rounded-xl p-3 shadow-md shadow-[#84cc16]/10">
                  <span className="text-slate-900 dark:text-slate-100 font-bold flex items-center gap-1.5 text-xs">
                    <Wallet className="w-4 h-4 text-[#84cc16]" /> Pending Dues Outstanding
                  </span>
                  <span className="text-[#84cc16] text-lg font-black">₹{parseFloat(form.pending_amount || 0).toFixed(2)}</span>
                </div>
              )}
            </motion.div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="payAmount">Amount to Pay (₹)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="payAmount"
                name="amount"
                type="number"
                min="0"
                step="0.01"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] focus:ring-4 focus:ring-[#84cc16]/10 transition-all duration-300 text-sm"
                value={form.amount}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="payDate">Payment Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="payDate"
                  name="payment_date"
                  type="date"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] focus:ring-4 focus:ring-[#84cc16]/10 transition-all duration-300 text-sm"
                  value={form.payment_date}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="dueDate">Due Date (Optional)</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="dueDate"
                  name="due_date"
                  type="date"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] focus:ring-4 focus:ring-[#84cc16]/10 transition-all duration-300 text-sm"
                  value={form.due_date}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="payMethod">Payment Method</label>
              <div className="relative">
                <select
                  id="payMethod"
                  name="method"
                  className="w-full pl-4 pr-8 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] focus:ring-4 focus:ring-[#84cc16]/10 transition-all duration-300 appearance-none cursor-pointer text-sm"
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
                <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="payStatus">Status</label>
              <div className="relative">
                <select
                  id="payStatus"
                  name="status"
                  className="w-full pl-4 pr-8 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] focus:ring-4 focus:ring-[#84cc16]/10 transition-all duration-300 appearance-none cursor-pointer text-sm"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
                <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <motion.button 
            whileHover={{ scale: isSubmitting ? 1 : 1.02, y: isSubmitting ? 0 : -2 }}
            whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
            type="submit" 
            disabled={isSubmitting} 
            className="w-full h-11 mt-3 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-gradient-to-r from-[#84cc16] to-[#65a30d] text-white rounded-xl shadow-lg shadow-[#84cc16]/30 hover:shadow-[#84cc16]/50 transition-all duration-300"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4" />
                Create Payment
              </>
            )}
          </motion.button>
        </motion.form>

        {/* FILTERS CARD - Premium Design */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-black/5 border border-slate-100 dark:border-slate-700/50 p-5 space-y-4 h-fit"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/30">
                <Filter className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Filters</h3>
            </div>
            <button type="button" className="text-[10px] font-bold text-slate-500 hover:text-[#84cc16] transition-colors cursor-pointer flex items-center gap-1" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="statusFilter">Status</label>
            <select id="statusFilter" className="w-full pl-4 pr-8 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] focus:ring-4 focus:ring-[#84cc16]/10 transition-all duration-300 appearance-none cursor-pointer text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="methodFilter">Payment Method</label>
            <select id="methodFilter" className="w-full pl-4 pr-8 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] focus:ring-4 focus:ring-[#84cc16]/10 transition-all duration-300 appearance-none cursor-pointer text-sm" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
              <option value="">All Methods</option>
              <option value="upi">UPI</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="online">Online</option>
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="dateFrom">From Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input id="dateFrom" type="date" className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] focus:ring-4 focus:ring-[#84cc16]/10 transition-all duration-300 text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="dateTo">To Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input id="dateTo" type="date" className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] focus:ring-4 focus:ring-[#84cc16]/10 transition-all duration-300 text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* PAYMENT RECORDS TABLE - Premium Design */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-black/5 border border-slate-100 dark:border-slate-700/50 mt-4 overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 pb-3 border-b border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md shadow-purple-500/30">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Payment Records</h3>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] focus:ring-4 focus:ring-[#84cc16]/10 transition-all duration-300 text-sm"
              placeholder="Search records globally..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
            />
          </div>
        </div>

        {loading && payments.length === 0 ? (
          <div className="p-8 flex items-center justify-center">
            <Loader />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-full">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider sticky top-0">
                  <tr>
                    <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">Student</th>
                    <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">Source</th>
                    <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">Amount</th>
                    <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">Remarks & Proof</th>
                    <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">Payment Date</th>
                    <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">Due Date</th>
                    <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">Method</th>
                    <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">Status</th>
                    <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {paginatedPayments.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 font-medium">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <Search className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-xs">No payments found matching your criteria.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedPayments.map((payment, index) => {
                    const normalizedStatus = (payment?.status || '').toUpperCase();
                    const currentId = payment?.id || payment?._id || payment?.payment_id || index;
                    const isOverdue = normalizedStatus === 'PENDING' && payment?.due_date && new Date(payment.due_date) < new Date();

                    return (
                      <motion.tr 
                        key={currentId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isOverdue ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                            {payment?.student?.name || payment?.student_name || `Student #${payment?.student_id}`}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {payment?.collected_by?.name ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                              <Users className="w-2.5 h-2.5" /> Coach - {payment.collected_by.name}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              <Settings className="w-2.5 h-2.5" /> Admin
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100 text-sm">₹{parseFloat(payment?.amount || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 max-w-[150px]">
                          <div className="flex flex-col gap-0.5">
                            {payment?.remarks && <span className="text-[10px] text-slate-500 dark:text-slate-400 italic truncate">"{payment.remarks}"</span>}
                            {(payment?.proof_url || payment?.attachmentUrl || payment?.receipt_image || payment?.proof) ? (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                type="button"
                                onClick={() => {
                                  const proofUrl = payment.proof_url || payment.attachmentUrl || payment.receipt_image || payment.proof;
                                  const fullUrl = proofUrl.startsWith('http') ? proofUrl : `http://localhost:5000/${proofUrl}`;
                                  setPreviewImage(fullUrl);
                                }}
                                className="text-[#84cc16] hover:text-[#65a30d] font-bold text-[10px] flex items-center gap-0.5 cursor-pointer transition-colors w-fit"
                              >
                                <Calendar className="w-2.5 h-2.5" /> View Proof
                              </motion.button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">No proof</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-[10px]">{payment?.payment_date || payment?.date ? new Date(payment.payment_date || payment.date).toLocaleDateString('en-IN') : '-'}</td>
                        <td className={`px-4 py-3 text-[10px] ${isOverdue ? 'text-red-500 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                          {payment?.due_date ? new Date(payment.due_date).toLocaleDateString('en-IN') : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                            {payment?.method || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {isOverdue ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 animate-pulse">
                              <AlertCircle className="w-2.5 h-2.5" /> OVERDUE
                            </span>
                          ) : normalizedStatus === 'COMPLETED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                              <CheckCircle className="w-2.5 h-2.5" /> COMPLETED
                            </span>
                          ) : normalizedStatus === 'FAILED' || normalizedStatus === 'REJECTED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                              <XCircle className="w-2.5 h-2.5" /> {normalizedStatus}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                              <Clock className="w-2.5 h-2.5" /> {payment?.status || 'PENDING'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right space-x-1.5">
                          {normalizedStatus !== 'COMPLETED' && (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              type="button"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-gradient-to-r from-[#84cc16] to-[#65a30d] text-white shadow-md shadow-[#84cc16]/30 hover:shadow-[#84cc16]/50 transition-all"
                              onClick={() => updateStatus(payment, currentId, 'completed')}
                            >
                              <CheckCircle className="w-2.5 h-2.5" /> Mark Paid
                            </motion.button>
                          )}
                          {normalizedStatus === 'PENDING' && (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              type="button"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md shadow-red-500/30 hover:shadow-red-500/50 transition-all"
                              onClick={() => rejectPayment(payment, currentId)}
                            >
                              <XCircle className="w-2.5 h-2.5" /> Reject
                            </motion.button>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* Pagination Section - Premium Design */}
        {filteredPayments.length > 0 && (
          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row px-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
            <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
              Showing <span className="text-slate-900 dark:text-slate-100 font-bold">{startIndex + 1}</span> to <span className="text-slate-900 dark:text-slate-100 font-bold">{Math.min(endIndex, filteredPayments.length)}</span> of <span className="text-slate-900 dark:text-slate-100 font-bold">{filteredPayments.length}</span> records
            </div>
            <div className="flex items-center gap-1.5">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </motion.button>
              {getPageNumbers().map((page, index) => (
                page === '...' ? (
                  <span key={`ellipsis-${index}`} className="text-slate-400 px-1.5 text-[10px]">...</span>
                ) : (
                  <motion.button
                    key={page}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      currentPage === page 
                        ? 'bg-gradient-to-r from-[#84cc16] to-[#65a30d] text-white shadow-md shadow-[#84cc16]/30' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    onClick={() => setCurrentPage(page)}
                    >
                    {page}
                  </motion.button>
                )
              ))}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
        </>
      ) : (
        <>
          {/* STUDENT ACCOUNTS SECTION - Premium Design */}
          {/* Dashboard Summary Cards */}
          {studentAccountsData?.summary && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
            >
              {[
                { label: 'Total Students', value: studentAccountsData.summary.total_students, color: 'text-blue-600', bgGradient: 'from-blue-500 to-blue-600', icon: Users, bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
                { label: 'Fully Paid', value: studentAccountsData.summary.fully_paid, color: 'text-[#84cc16]', bgGradient: 'from-[#84cc16] to-[#65a30d]', icon: CheckCircle, bgColor: 'bg-[#84cc16]/10 dark:bg-[#84cc16]/20' },
                { label: 'Partially Paid', value: studentAccountsData.summary.partially_paid, color: 'text-amber-500', bgGradient: 'from-amber-500 to-amber-600', icon: TrendingUp, bgColor: 'bg-amber-50 dark:bg-amber-900/20' },
                { label: 'Unpaid', value: studentAccountsData.summary.unpaid, color: 'text-red-500', bgGradient: 'from-red-500 to-red-600', icon: AlertCircle, bgColor: 'bg-red-50 dark:bg-red-900/20' },
                { label: 'Outstanding', value: `₹${studentAccountsData.summary.total_outstanding.toFixed(2)}`, color: 'text-purple-600', bgGradient: 'from-purple-500 to-purple-600', icon: DollarSign, bgColor: 'bg-purple-50 dark:bg-purple-900/20' }
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg shadow-black/5 border border-slate-100 dark:border-slate-700/50 overflow-hidden group cursor-default"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity" style={{ background: `linear-gradient(135deg, ${stat.bgGradient})` }} />
                  <div className={`absolute top-3 right-3 w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center shadow-md`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <div className="relative z-10">
                    <div className={`text-2xl font-black ${stat.color} tracking-tight`}>
                      {stat.value}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1">{stat.label}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Student Accounts Section - Premium Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-black/5 border border-slate-100 dark:border-slate-700/50 mt-4 overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 pb-3 border-b border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/30">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Student Accounts</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">View student fee status and payment history</p>
                </div>
              </div>
              
              {/* Premium Filter Toggle */}
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl p-1 border border-slate-200 dark:border-slate-700/50 shadow-sm">
                <button
                  onClick={() => setStudentAccountsFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-300 ${
                    studentAccountsFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-[#84cc16] shadow-md shadow-black/5'
                      : 'text-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-white/50 dark:hover:bg-slate-700/30'
                  }`}
                >
                  All ({studentAccountsData?.students?.length || 0})
                </button>
                <button
                  onClick={() => setStudentAccountsFilter('paid')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-300 ${
                    studentAccountsFilter === 'paid'
                      ? 'bg-white dark:bg-slate-700 text-[#84cc16] shadow-md shadow-black/5'
                      : 'text-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-white/50 dark:hover:bg-slate-700/30'
                  }`}
                >
                  Paid ({studentAccountsData?.students?.filter(s => s.fee_status === 'paid').length || 0})
                </button>
                <button
                  onClick={() => setStudentAccountsFilter('unpaid')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-300 ${
                    studentAccountsFilter === 'unpaid'
                      ? 'bg-white dark:bg-slate-700 text-[#84cc16] shadow-md shadow-black/5'
                      : 'text-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-white/50 dark:hover:bg-slate-700/30'
                  }`}
                >
                  Unpaid ({studentAccountsData?.students?.filter(s => s.fee_status === 'unpaid').length || 0})
                </button>
              </div>
            </div>

            {/* Search and Sort - Premium Design */}
            <div className="flex flex-col sm:flex-row gap-3 p-4 pb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by student name, parent name, or phone..."
                  value={studentAccountsSearch}
                  onChange={(e) => setStudentAccountsSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] focus:ring-4 focus:ring-[#84cc16]/10 transition-all duration-300 text-sm"
                />
              </div>
              <div className="relative w-full sm:w-40">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full pl-4 pr-8 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] focus:ring-4 focus:ring-[#84cc16]/10 transition-all duration-300 appearance-none cursor-pointer text-sm"
                >
                  <option value="name">Sort by Name</option>
                  <option value="highest_due">Highest Due</option>
                  <option value="highest_paid">Highest Paid</option>
                  <option value="recently_paid">Recently Paid</option>
                </select>
                <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Student Accounts Table - Premium Design */}
            {loadingStudentAccounts ? (
              <div className="p-8 flex items-center justify-center">
                <Loader message="Loading student accounts..." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-full">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider sticky top-0">
                      <tr>
                        <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">Student</th>
                        <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">Parent</th>
                        <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">Progress</th>
                        <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">Amount</th>
                        <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">Paid</th>
                        <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">Due</th>
                        <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">Last Paid</th>
                        <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">Status</th>
                        <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
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
                            <td colSpan="9" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 font-medium">
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                  <Search className="w-6 h-6 text-slate-400" />
                                </div>
                                <p className="text-xs">No students found</p>
                              </div>
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
                              transition={{ delay: index * 0.03 }}
                              className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isOverdue ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}
                            >
                              <td className="px-4 py-3">
                                <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                  {student.name || '—'}
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                  {student.phone || '—'}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300">
                                {student.parent_name || '—'}
                              </td>
                              <td className="px-4 py-3">
                                <div className="w-full">
                                  <div className="flex items-center justify-between text-[10px] mb-1">
                                    <span className="text-slate-600 dark:text-slate-400 font-bold">{paymentProgress.toFixed(0)}%</span>
                                  </div>
                                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${paymentProgress}%` }}
                                      transition={{ duration: 0.5, delay: index * 0.05 }}
                                      className={`h-full rounded-full ${paymentProgress === 100 ? 'bg-gradient-to-r from-[#84cc16] to-[#65a30d]' : 'bg-gradient-to-r from-amber-500 to-amber-600'}`}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-xs font-bold text-slate-900 dark:text-slate-100">
                                ₹{parseFloat(totalAmount || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-xs font-bold text-[#84cc16]">
                                ₹{parseFloat(paidAmount || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-xs font-bold text-amber-500">
                                ₹{parseFloat(dueAmount || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                                {formatDate(lastPaidDate)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                    feeStatus === 'paid'
                                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                  }`}
                                >
                                  {feeStatus === 'paid' ? <CheckCircle className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                                  {feeStatus}
                                </span>
                              </td>
                              <td className="px-4 py-3 space-x-1.5">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  type="button"
                                  onClick={() => quickCollectFee(student)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-gradient-to-r from-[#84cc16] to-[#65a30d] text-white shadow-md shadow-[#84cc16]/30 hover:shadow-[#84cc16]/50 transition-all"
                                >
                                  <DollarSign className="w-2.5 h-2.5" /> Quick Collect
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  type="button"
                                  onClick={() => toggleStudentExpansion(student.student_id)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                >
                                  {isExpanded ? <XCircle className="w-2.5 h-2.5" /> : <Calendar className="w-2.5 h-2.5" />}
                                  {isExpanded ? 'Hide' : 'History'}
                                </motion.button>
                              </td>
                            </motion.tr>
                            {isExpanded && (
                              <motion.tr
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                              >
                                <td colSpan="9" className="px-4 py-4 bg-slate-50 dark:bg-slate-900/30">
                                  <div className="space-y-2">
                                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                                      <Calendar className="w-3 h-3 text-[#84cc16]" /> Payment History
                                    </h4>
                                    {student.receipts && student.receipts.length > 0 ? (
                                      <div className="space-y-1.5">
                                        {student.receipts.map((receipt, idx) => (
                                          <div key={idx} className="flex items-center justify-between text-[10px] bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                            <div className="flex items-center gap-2">
                                              <div className="w-6 h-6 rounded bg-[#84cc16]/10 flex items-center justify-center">
                                                <DollarSign className="w-3 h-3 text-[#84cc16]" />
                                              </div>
                                              <div>
                                                <span className="font-bold text-slate-900 dark:text-slate-100">₹{parseFloat(receipt.amount).toFixed(2)}</span>
                                                <span className="text-slate-500 dark:text-slate-400 ml-1.5">{formatDate(receipt.payment_date)}</span>
                                              </div>
                                            </div>
                                            <div className="text-slate-600 dark:text-slate-400 font-medium">
                                              {receipt.method || '—'}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-slate-500 dark:text-slate-400 text-[10px] italic">No payment history available</p>
                                    )}
                                  </div>
                                </td>
                              </motion.tr>
                            )}
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </motion.div>
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