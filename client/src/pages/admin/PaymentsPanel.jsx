import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Loader from '../../components/Loader';
import { adminGet, adminPatch, adminPost } from '../../api/client';
import { calculateStudentFee, calculateBalance } from '../../utils/fee.util.js';
import { Wallet, TrendingUp, AlertCircle, CheckCircle, Users, DollarSign, Calendar, Filter, Search, ArrowUpDown, Bell, Zap, Clock, Phone, Settings, XCircle, Package, UserX, RefreshCw, Zap as ZapIcon, BookOpen, ChevronRight, HelpCircle, Key } from 'lucide-react';

const emptyForm = {
  student_id: '',
  amount: '',
  extra_amount: '',
  pending_amount: 0,
  payment_date: new Date().toISOString().split('T')[0],
  due_date: '',
  method: '',
  status: 'pending',
};

export default function AccountsPanel() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [collectExtra, setCollectExtra] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [studentFeeData, setStudentFeeData] = useState(null);
  const [loadingFeeData, setLoadingFeeData] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Derived state to determine if selected student is eligible for advance credit
  const selectedStudentObj = form.student_id ? students.find(s => (s.id || s.student_id)?.toString() === form.student_id.toString()) : null;
  const isInactive = !!(selectedStudentObj && selectedStudentObj.status !== 'ACTIVE');

  const isCreditEligible = (() => {
    if (!selectedStudentObj) return false;
    const isActiveStudent = !isInactive;
    const hasActivePlan = selectedStudentObj.enrollments?.some(e => e.is_active);
    const currentCyclePaid = studentFeeData ? (studentFeeData.total_fees_paid || 0) : 0;
    const currentCycleTotal = studentFeeData ? (studentFeeData.total_fees_assigned || 0) : 0;
    const currentCycleDue = studentFeeData ? (studentFeeData.balance_outstanding || 0) : 0;
    const isFullyPaid = studentFeeData && (currentCyclePaid >= currentCycleTotal) && (currentCycleDue === 0);
    return isActiveStudent && hasActivePlan && isFullyPaid;
  })();

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

  // Drawer/Modal State for Summary Cards
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState(null); // 'total' or 'collected'
  const [drawerSearch, setDrawerSearch] = useState('');
  const [drawerSort, setDrawerSort] = useState('name'); // 'name', 'amount', 'date'
  const [highlightPaymentRecords, setHighlightPaymentRecords] = useState(false);
  const [paymentType, setPaymentType] = useState('training'); // 'training' or 'kit'
  const [studentKits, setStudentKits] = useState([]);
  const [availableKits, setAvailableKits] = useState([]);
  const [loadingKits, setLoadingKits] = useState(false);
  const [selectedKitAssignment, setSelectedKitAssignment] = useState(null);
  const [newKitId, setNewKitId] = useState('');
  const [newKitQty, setNewKitQty] = useState('1');
  const [newKitDiscount, setNewKitDiscount] = useState('0');
  const [kitPaymentAmount, setKitPaymentAmount] = useState('');
  const [isKitSubmitting, setIsKitSubmitting] = useState(false);
  const [showRecordsFilter, setShowRecordsFilter] = useState(false);

  // Reactivation Modal State
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [pendingPaymentIntent, setPendingPaymentIntent] = useState(null);
  const [reactivateForm, setReactivateForm] = useState({
    action: 'continue',
    duration_plan_id: '',
    sport_id: '',
    batch_id: '',
    plan_start_date: new Date().toISOString().split('T')[0],
    additional_charges: '',
    registration_fee: '',
    discount: ''
  });
  const [reactivateBatches, setReactivateBatches] = useState([]);
  const [isReactivating, setIsReactivating] = useState(false);
  const [sports, setSports] = useState([]);
  const [durationPlans, setDurationPlans] = useState([]);

  useEffect(() => {
    const fetchBatchesForReactivate = async () => {
      if (reactivateForm.sport_id) {
        try {
          const res = await adminGet(`/admin/batches/available?sport_id=${reactivateForm.sport_id}`);
          setReactivateBatches(res.data || res || []);
        } catch (err) {
          console.error('Failed to fetch batches for reactivation:', err);
          setReactivateBatches([]);
        }
      } else {
        setReactivateBatches([]);
      }
    };
    fetchBatchesForReactivate();
  }, [reactivateForm.sport_id]);

  // Parent Password Management State
  const [showParentPasswordModal, setShowParentPasswordModal] = useState(false);
  const [passwordManageStudent, setPasswordManageStudent] = useState(null);
  const [tempPassword, setTempPassword] = useState('');
  const [isResettingParentPassword, setIsResettingParentPassword] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const fetchStudentKits = async (studentId) => {
    setLoadingKits(true);
    try {
      const res = await adminGet('/admin/inventory/kits/assignments?student_id=' + studentId);
      setStudentKits(res.data || res || []);
    } catch (err) {
      console.error('Failed to fetch student kits:', err);
      setStudentKits([]);
    } finally {
      setLoadingKits(false);
    }
  };

  const handleClearStudent = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setForm(prev => ({
      ...prev,
      student_id: '',
      amount: '',
      extra_amount: '',
      pending_amount: 0
    }));
    setStudentSearchTerm('');
    setStudentFeeData(null);
    setSelectedKitAssignment(null);
    setNewKitId('');
    setNewKitQty('1');
    setNewKitDiscount('0');
    setKitPaymentAmount('');
    setCollectExtra(false);
  };

  const loadData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const [paymentsRes, studentsRes, kitsRes, sportsRes, plansRes] = await Promise.all([
        adminGet('/admin/accounts'),
        adminGet('/admin/students'),
        adminGet('/admin/inventory/kits'),
        adminGet('/admin/sports'),
        adminGet('/admin/duration-plans')
      ]);

      const paymentsData = paymentsRes.data?.data || paymentsRes.data || [];
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);

      const studentsData = studentsRes.data?.data || studentsRes.data || [];
      setStudents(Array.isArray(studentsData) ? studentsData : []);

      setAvailableKits(kitsRes.data || kitsRes || []);
      setSports(sportsRes.data || sportsRes || []);
      setDurationPlans(plansRes.data || plansRes || []);

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

    setSelectedKitAssignment(null);
    setNewKitId('');
    setNewKitQty('1');
    setNewKitDiscount('0');
    setKitPaymentAmount('');
    fetchStudentKits(selectedId);

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
    // Show ALL students (active + inactive) in payment search
    const filtered = students;
    if (!studentSearchTerm) return filtered;
    const searchTerm = studentSearchTerm.toLowerCase();
    return filtered.filter((s) => {
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

  const handleKitBalanceSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isKitSubmitting) return;
    setIsKitSubmitting(true);
    try {
      const payload = {
        student_id: parseInt(form.student_id, 10),
        amount: parseFloat(kitPaymentAmount),
        kit_assignment_id: selectedKitAssignment.assignment_id,
        payment_date: form.payment_date,
        method: form.method || 'cash',
        status: 'completed'
      };
      const res = await adminPost('/admin/accounts', payload);
      setMessage({ text: 'Kit payment recorded successfully!', type: 'success' });
      setSelectedKitAssignment(null);
      setKitPaymentAmount('');
      loadData(true);
      loadStudentAccountsData();
      if (form.student_id) {
        fetchStudentKits(form.student_id);
      }
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setIsKitSubmitting(false);
    }
  };

  const handleNewKitAssignSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isKitSubmitting) return;
    setIsKitSubmitting(true);
    try {
      const assignRes = await adminPost(`/admin/inventory/kits/${newKitId}/assign`, {
        student_id: parseInt(form.student_id, 10),
        quantity: parseInt(newKitQty, 10),
        discount: parseFloat(newKitDiscount),
        payment_mode: 'FEE',
        issue_date: form.payment_date,
        remarks: 'Sports Kit Assigned via Accounts'
      });

      const assignmentId = assignRes.data?.assignment_id || assignRes.assignment_id;
      const payAmt = parseFloat(kitPaymentAmount || 0);

      if (payAmt > 0 && assignmentId) {
        await adminPost('/admin/accounts', {
          student_id: parseInt(form.student_id, 10),
          amount: payAmt,
          kit_assignment_id: assignmentId,
          payment_date: form.payment_date,
          method: form.method || 'cash',
          status: 'completed'
        });
      }

      setMessage({ text: 'Kit assigned and payment recorded successfully!', type: 'success' });
      setNewKitId('');
      setNewKitQty('1');
      setNewKitDiscount('0');
      setKitPaymentAmount('');
      loadData(true);
      loadStudentAccountsData();
      if (form.student_id) {
        fetchStudentKits(form.student_id);
      }
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setIsKitSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (paymentType === 'kit') {
      if (selectedKitAssignment) {
        await handleKitBalanceSubmit(event);
      } else if (newKitId) {
        await handleNewKitAssignSubmit(event);
      } else {
        setMessage({ text: 'Please select an existing kit to pay, or assign a new kit.', type: 'error' });
      }
      return;
    }

    // Prevent duplicate submissions
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    if (isCreditEligible) {
      const extraAmount = parseFloat(form.extra_amount || 0);
      if (isNaN(extraAmount) || extraAmount <= 0) {
        setMessage({ text: 'Please enter a valid extra amount', type: 'error' });
        setIsSubmitting(false);
        return;
      }

      try {
        const result = await adminPost(`/admin/accounts/students/${form.student_id}/credit`, {
          amount: extraAmount,
          reason: 'Advance Payment'
        });
        if (result?.success) {
          setMessage({ text: 'Advance Credit added to account successfully', type: 'success' });
          setForm({ ...emptyForm, payment_date: new Date().toISOString().split('T')[0] });
          setCollectExtra(false);
          setStudentSearchTerm('');
          setStudentFeeData(null);
          loadData(false);
        } else {
          setMessage({ text: result?.message || 'Failed to add credit', type: 'error' });
        }
      } catch (error) {
        setMessage({ text: error.message, type: 'error' });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Check if student is INACTIVE — intercept and show reactivation modal
    const selectedStudentObj = students.find(s => (s.id || s.student_id)?.toString() === form.student_id.toString());
    if (selectedStudentObj && selectedStudentObj.status !== 'ACTIVE') {
      // Preserve payment intent
      const amountToPay = parseFloat(form.amount || 0);
      const extraAmt = collectExtra ? parseFloat(form.extra_amount || 0) : 0;
      setPendingPaymentIntent({
        student_id: parseInt(form.student_id, 10),
        amount: amountToPay + extraAmt,
        extra_amount: extraAmt,
        amount_paid: amountToPay,
        payment_date: form.payment_date,
        method: form.method,
        status: form.status,
      });
      // Pre-fill reactivation form with student's existing enrollment data
      const enrollments = selectedStudentObj.enrollments || [];
      const latestEnrollment = enrollments[0];
      setReactivateForm({
        action: 'continue',
        duration_plan_id: latestEnrollment?.duration_plan_id?.toString() || '',
        sport_id: latestEnrollment?.sport_id?.toString() || selectedStudentObj.sport_id?.toString() || '',
        batch_id: latestEnrollment?.batch_id?.toString() || selectedStudentObj.batch_id?.toString() || '',
        plan_start_date: new Date().toISOString().split('T')[0],
        additional_charges: '',
        registration_fee: '',
        discount: ''
      });
      setShowReactivateModal(true);
      setIsSubmitting(false);
      return;
    }

    const amountToPay = parseFloat(form.amount || 0);
    const extraAmount = collectExtra ? parseFloat(form.extra_amount || 0) : 0;
    const totalAmount = amountToPay + extraAmount;

    const payload = {
      student_id: parseInt(form.student_id, 10),
      amount: totalAmount,
      extra_amount: extraAmount,
      amount_paid: amountToPay,
      payment_date: form.payment_date,
      method: form.method,
      status: form.status,
    };

    try {
      const result = await adminPost('/admin/accounts', payload);
      setMessage({ text: result.message || 'Payment recorded successfully', type: 'success' });
      setForm({ ...emptyForm, payment_date: new Date().toISOString().split('T')[0] });
      setCollectExtra(false);
      setStudentSearchTerm('');
      setStudentFeeData(null);
      loadData(false);
      loadStudentAccountsData();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivateSubmit = async (e) => {
    e.preventDefault();
    const selectedStudentObj = students.find(s => (s.id || s.student_id)?.toString() === form.student_id.toString());
    if (!selectedStudentObj) return;
    setIsReactivating(true);
    const studentId = selectedStudentObj.student_id || selectedStudentObj.id;
    try {
      const payload = {
        ...reactivateForm,
        payment: pendingPaymentIntent || undefined
      };
      await adminPost(`/admin/students/${studentId}/reactivate`, payload);
      setMessage({ text: `Student reactivated successfully${pendingPaymentIntent ? ' and payment recorded.' : '.'}`, type: 'success' });
      setShowReactivateModal(false);
      setPendingPaymentIntent(null);
      // Refresh student data and ledger
      await loadData(false);
      await loadStudentAccountsData();
      // Refresh ledger for this student
      try {
        const ledgerRes = await adminGet(`/admin/accounts/student-ledger/${form.student_id}`);
        const ledgerData = ledgerRes.data || {};
        setStudentFeeData(ledgerData);
        setForm(prev => ({
          ...prev,
          pending_amount: ledgerData.balance_outstanding || 0,
          amount: ledgerData.balance_outstanding > 0 ? ledgerData.balance_outstanding.toString() : ''
        }));
      } catch (_) { }
      // Clear form if payment was applied
      if (pendingPaymentIntent) {
        setForm({ ...emptyForm, payment_date: new Date().toISOString().split('T')[0] });
        setCollectExtra(false);
        setStudentSearchTerm('');
        setStudentFeeData(null);
      }
    } catch (error) {
      setMessage({ text: error.message || 'Reactivation failed.', type: 'error' });
    } finally {
      setIsReactivating(false);
    }
  };

  const handleMarkPaidClick = (paymentObj, fallbackId) => {
    const studentStatus = paymentObj?.student?.status;
    const isDeactivated = studentStatus && studentStatus !== 'ACTIVE';

    if (isDeactivated) {
      const targetId = paymentObj?.receipt_id || paymentObj?.id || paymentObj?.payment_id || paymentObj?.paymentId || paymentObj?.PaymentID || paymentObj?._id || paymentObj?.id_payment || fallbackId;
      setPendingPaymentIntent({
        receipt_id: targetId,
        student_id: paymentObj.student_id || paymentObj.student?.student_id || paymentObj.student?.id,
        amount: parseFloat(paymentObj.amount || 0),
        extra_amount: 0,
        amount_paid: parseFloat(paymentObj.amount || 0),
        payment_date: paymentObj.payment_date || paymentObj.date || new Date().toISOString().split('T')[0],
        method: paymentObj.method || 'cash',
        status: 'completed',
      });

      // Update reactivation modal fields with student's current info
      const studentId = paymentObj.student_id || paymentObj.student?.student_id || paymentObj.student?.id;
      setForm(prev => ({
        ...prev,
        student_id: studentId.toString()
      }));

      const selectedStudentObj = students.find(s => (s.id || s.student_id)?.toString() === studentId.toString()) || paymentObj.student;
      const enrollments = selectedStudentObj?.enrollments || [];
      const latestEnrollment = enrollments[0];

      setReactivateForm({
        action: 'continue',
        duration_plan_id: latestEnrollment?.duration_plan_id?.toString() || '',
        sport_id: latestEnrollment?.sport_id?.toString() || selectedStudentObj?.sport_id?.toString() || '',
        batch_id: latestEnrollment?.batch_id?.toString() || selectedStudentObj?.batch_id?.toString() || '',
        plan_start_date: new Date().toISOString().split('T')[0],
        additional_charges: '',
        registration_fee: '',
        discount: ''
      });
      setShowReactivateModal(true);
    } else {
      updateStatus(paymentObj, fallbackId, 'completed');
    }
  };

  const updateStatus = async (paymentObj, fallbackId, status, rejected_reason) => {
    let targetId = paymentObj?.receipt_id || paymentObj?.id || paymentObj?.payment_id || paymentObj?.paymentId || paymentObj?.PaymentID || paymentObj?._id || paymentObj?.id_payment;

    if (!targetId && targetId !== 0) {
      setMessage({ text: 'Error: Could not read payment record ID. Please refresh and try again.', type: 'error' });
      return;
    }


    try {
      const result = await adminPatch(`/admin/accounts/${targetId}/status`, { status, rejected_reason });
      setMessage({ text: result.message || 'Status updated successfully', type: 'success' });
      loadData(true);
      loadStudentAccountsData();
      // Also refresh the ledger for the currently selected student so fee totals update immediately
      if (form.student_id) {
        try {
          const ledgerRes = await adminGet(`/admin/accounts/student-ledger/${form.student_id}`);
          setStudentFeeData(ledgerRes.data || null);
        } catch (_) {
          // silently ignore ledger refresh error
        }
      }
    } catch (error) {
      setMessage({ text: error.message || 'Failed to update payment status', type: 'error' });
    }
  };

  const rejectPayment = async (paymentObj, fallbackId) => {
    const reason = window.prompt('Rejection reason (optional):');
    if (reason === null) return;
    await updateStatus(paymentObj, fallbackId, 'rejected', reason || undefined);
  };

  const handleParentPasswordManage = (studentObj) => {
    setPasswordManageStudent(studentObj);
    setTempPassword('');
    setShowResetConfirmation(false);
    setCopiedSuccess(false);
    setShowParentPasswordModal(true);
  };

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleResetAndSendPassword = async () => {
    if (!passwordManageStudent) return;
    if (!passwordManageStudent.parent_email && !passwordManageStudent.parent?.email) {
      setMessage({ text: 'Parent email not available', type: 'error' });
      return;
    }
    setShowResetConfirmation(true);
  };

  const confirmResetAndSend = async () => {
    setShowResetConfirmation(false);
    setIsResettingParentPassword(true);
    try {
      const newPwd = generateTempPassword();
      const payload = {
        student_id: passwordManageStudent.student_id,
        new_password: newPwd,
        send_email: true
      };

      await adminPost('/admin/students/reset-parent-password', payload);
      setMessage({ text: 'Temporary password generated and email sent successfully', type: 'success' });
      setShowParentPasswordModal(false);
      setPasswordManageStudent(null);
    } catch (err) {
      setMessage({ text: err.message || 'Failed to reset password', type: 'error' });
    } finally {
      setIsResettingParentPassword(false);
    }
  };

  const handleResetPasswordOnly = async () => {
    if (!passwordManageStudent) return;
    setIsResettingParentPassword(true);
    setCopiedSuccess(false);
    try {
      const newPwd = generateTempPassword();
      const payload = {
        student_id: passwordManageStudent.student_id,
        new_password: newPwd,
        send_email: false
      };

      await adminPost('/admin/students/reset-parent-password', payload);
      setTempPassword(newPwd);
      setMessage({ text: 'Password reset successfully. Please copy it below.', type: 'success' });
    } catch (err) {
      setMessage({ text: err.message || 'Failed to reset password', type: 'error' });
    } finally {
      setIsResettingParentPassword(false);
    }
  };

  const handleSendLoginDetails = async () => {
    if (!passwordManageStudent) return;
    const parentEmail = passwordManageStudent.parent_email || passwordManageStudent.parent?.email;
    if (!parentEmail) {
      setMessage({ text: 'Parent email not available', type: 'error' });
      return;
    }
    setIsResettingParentPassword(true);
    try {
      await adminPost('/admin/students/send-parent-login-details', {
        student_id: passwordManageStudent.student_id
      });
      setMessage({ text: 'Login details secure email sent successfully', type: 'success' });
      setShowParentPasswordModal(false);
      setPasswordManageStudent(null);
    } catch (err) {
      setMessage({ text: err.message || 'Failed to send login details', type: 'error' });
    } finally {
      setIsResettingParentPassword(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
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

  const [creditHistories, setCreditHistories] = useState({});
  const [creditLoading, setCreditLoading] = useState({});
  const [showAddCreditForm, setShowAddCreditForm] = useState({});
  const [showUseCreditForm, setShowUseCreditForm] = useState({});
  const [addCreditData, setAddCreditData] = useState({ amount: '', reason: '' });
  const [useCreditData, setUseCreditData] = useState({ amount: '', use_for: 'KIT', reason: '', reference_id: '' });

  const fetchCreditHistory = async (studentId) => {
    setCreditLoading(prev => ({ ...prev, [studentId]: true }));
    try {
      const res = await adminGet(`/admin/accounts/students/${studentId}/credit-history`);
      if (res?.success && res?.data) {
        setCreditHistories(prev => ({ ...prev, [studentId]: res.data }));
      }
    } catch (err) {
      console.error('Failed to fetch credit history:', err);
    } finally {
      setCreditLoading(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const handleAddCredit = async (studentId) => {
    if (!addCreditData.amount || parseFloat(addCreditData.amount) <= 0) {
      setMessage({ text: 'Please enter a valid amount', type: 'error' });
      return;
    }
    try {
      const res = await adminPost(`/admin/accounts/students/${studentId}/credit`, {
        amount: parseFloat(addCreditData.amount),
        reason: addCreditData.reason || 'Manual Credit Addition'
      });
      if (res?.success) {
        setMessage({ text: 'Credit added successfully', type: 'success' });
        setAddCreditData({ amount: '', reason: '' });
        setShowAddCreditForm(prev => ({ ...prev, [studentId]: false }));
        fetchCreditHistory(studentId);
        loadStudentAccountsData(true);
      } else {
        setMessage({ text: res?.message || 'Failed to add credit', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: err.message || 'Error adding credit', type: 'error' });
    }
  };

  const handleUseCredit = async (studentId) => {
    if (!useCreditData.amount || parseFloat(useCreditData.amount) <= 0) {
      setMessage({ text: 'Please enter a valid amount', type: 'error' });
      return;
    }
    try {
      const res = await adminPost(`/admin/accounts/students/${studentId}/use-credit`, {
        amount: parseFloat(useCreditData.amount),
        use_for: useCreditData.use_for,
        reference_id: useCreditData.reference_id ? parseInt(useCreditData.reference_id, 10) : null,
        reason: useCreditData.reason || `Used credit for ${useCreditData.use_for}`
      });
      if (res?.success) {
        setMessage({ text: 'Credit consumed successfully', type: 'success' });
        setUseCreditData({ amount: '', use_for: 'KIT', reason: '', reference_id: '' });
        setShowUseCreditForm(prev => ({ ...prev, [studentId]: false }));
        fetchCreditHistory(studentId);
        loadStudentAccountsData(true);
      } else {
        setMessage({ text: res?.message || 'Failed to consume credit', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: err.message || 'Error consuming credit', type: 'error' });
    }
  };

  const toggleStudentExpansion = (studentId) => {
    const isExpanding = expandedStudentId !== studentId;
    setExpandedStudentId(isExpanding ? studentId : null);
    if (isExpanding) {
      fetchCreditHistory(studentId);
    }
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

  // Handle summary card clicks
  const handleTotalAmountClick = () => {
    setDrawerType('total');
    setDrawerOpen(true);
    setDrawerSearch('');
    setDrawerSort('name');
  };

  const handleCollectedClick = () => {
    setDrawerType('collected');
    setDrawerOpen(true);
    setDrawerSearch('');
    setDrawerSort('date');
  };

  const handlePendingClick = () => {
    // Set status filter to pending
    setStatusFilter('pending');
    // Scroll to payment records section
    const paymentRecordsSection = document.getElementById('paymentRecordsSection');
    if (paymentRecordsSection) {
      paymentRecordsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Highlight the section for 2-3 seconds
    setHighlightPaymentRecords(true);
    setTimeout(() => {
      setHighlightPaymentRecords(false);
    }, 3000);
  };

  // Get drawer data based on type
  const getDrawerData = () => {
    if (drawerType === 'total') {
      // Return all students with their fee details
      return students.map(student => {
        const totalAmount = getStudentAmount(student);
        const paidAmount = getPaidAmount(student);
        const pendingAmount = Math.max(0, totalAmount - paidAmount);
        return {
          student,
          totalAmount,
          paidAmount,
          pendingAmount
        };
      });
    } else if (drawerType === 'collected') {
      // Return completed payments
      return payments.filter(p => (p?.status || '').toUpperCase() === 'COMPLETED').map(payment => ({
        payment,
        studentName: payment?.student?.name || payment?.student_name || '—',
        amount: parseFloat(payment?.amount || 0),
        paymentDate: payment?.payment_date || payment?.date,
        method: payment?.method || '—',
        receiptNo: payment?.receipt_number || payment?.receipt_number || '—'
      }));
    }
    return [];
  };

  // Filter and sort drawer data
  const getFilteredDrawerData = () => {
    let data = getDrawerData();

    // Apply search filter
    if (drawerSearch) {
      const searchLower = drawerSearch.toLowerCase();
      data = data.filter(item => {
        if (drawerType === 'total') {
          const name = item.student?.name || `${item.student?.first_name || ''} ${item.student?.last_name || ''}`;
          return name.toLowerCase().includes(searchLower);
        } else {
          return item.studentName.toLowerCase().includes(searchLower);
        }
      });
    }

    // Apply sorting
    data = [...data].sort((a, b) => {
      if (drawerType === 'total') {
        if (drawerSort === 'name') {
          const nameA = a.student?.name || '';
          const nameB = b.student?.name || '';
          return nameA.localeCompare(nameB);
        } else if (drawerSort === 'amount') {
          return b.totalAmount - a.totalAmount;
        }
      } else if (drawerType === 'collected') {
        if (drawerSort === 'name') {
          return a.studentName.localeCompare(b.studentName);
        } else if (drawerSort === 'amount') {
          return b.amount - a.amount;
        } else if (drawerSort === 'date') {
          const dateA = new Date(a.paymentDate || 0);
          const dateB = new Date(b.paymentDate || 0);
          return dateB - dateA;
        }
      }
      return 0;
    });

    return data;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 w-full overflow-x-hidden relative"
    >
      {/* Subtle Sports-Themed Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#84cc16]/3 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#22c55e]/3 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#a3e635]/2 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Fee Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Track payments, due dates, and collection statistics.
            </p>
          </div>
        </div>

        {/* Premium Segmented Toggle */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl p-1 border border-slate-200 dark:border-slate-700/50 shadow-sm relative z-10">
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 flex items-center gap-1.5 ${activeTab === 'payments'
              ? 'bg-white dark:bg-slate-700 text-[#84cc16] shadow-md shadow-black/5'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-slate-700/30'
              }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Payment Management
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 flex items-center gap-1.5 ${activeTab === 'students'
              ? 'bg-white dark:bg-slate-700 text-[#84cc16] shadow-md shadow-black/5'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-slate-700/30'
              }`}
          >
            <Users className="w-3.5 h-3.5" />
            Student Accounts
          </button>
        </div>
      </motion.div>

      {activeTab === 'payments' ? (
        <>
          {/* Premium Statistics Cards with Icons */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total Amount', value: stats.total, color: 'text-blue-600', bgGradient: 'from-blue-500 to-blue-600', icon: DollarSign, bgColor: 'bg-blue-50 dark:bg-blue-900/20', onClick: handleTotalAmountClick },
              { label: 'Collected', value: stats.collected, color: 'text-[#84cc16]', bgGradient: 'from-[#84cc16] to-[#65a30d]', icon: CheckCircle, bgColor: 'bg-[#84cc16]/10 dark:bg-[#84cc16]/20', onClick: handleCollectedClick },
              { label: 'Pending', value: stats.pending, color: 'text-amber-500', bgGradient: 'from-amber-500 to-amber-600', icon: Clock, bgColor: 'bg-amber-50 dark:bg-amber-900/20', onClick: handlePendingClick }
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                whileHover={{ y: -6, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={stat.onClick}
                className="relative bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg shadow-black/5 border border-slate-100 dark:border-slate-700/50 overflow-hidden group cursor-pointer hover:shadow-xl hover:shadow-black/10 transition-all duration-300 flex items-center justify-between"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity" style={{ background: `linear-gradient(135deg, ${stat.bgGradient})` }} />
                <div className={`absolute top-3 right-3 w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center shadow-md`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div className="relative z-10 flex flex-col justify-center">
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
              className="relative bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-4 shadow-lg shadow-red-500/20 border border-red-200 dark:border-red-700/50 overflow-hidden group cursor-pointer flex items-center justify-between"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shadow-md">
                <Bell className="w-4 h-4 text-white" />
              </div>
              <div className="relative z-10 flex flex-col justify-center">
                <div className="text-2xl font-black text-white tracking-tight">
                  ₹{stats.overdue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-white/80 text-[10px] font-bold uppercase tracking-wider mt-1">Overdue</div>
              </div>
            </motion.button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-4">
            {/* LEFT COLUMN: Record Payment Form */}
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-black/5 border border-slate-100 dark:border-slate-700/50 p-4 space-y-3"
              onSubmit={handleSubmit}
            >
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/50 justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#84cc16] to-[#65a30d] flex items-center justify-center shadow-md shadow-[#84cc16]/30">
                    <DollarSign className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Record Payment</h3>
                </div>
              </div>

              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl p-1 border border-slate-200 dark:border-slate-700/50 shadow-sm relative z-10">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('training');
                    setSelectedKitAssignment(null);
                    setNewKitId('');
                    setKitPaymentAmount('');
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 ${paymentType === 'training'
                    ? 'bg-white dark:bg-slate-700 text-[#84cc16] shadow-md shadow-black/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-slate-700/30'
                    }`}
                >
                  Training Fee
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('kit');
                    if (form.student_id) {
                      fetchStudentKits(form.student_id);
                    }
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 ${paymentType === 'kit'
                    ? 'bg-white dark:bg-slate-700 text-[#84cc16] shadow-md shadow-black/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-slate-700/30'
                    }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  Sports Kit Fee
                </button>
              </div>

              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="payStudent">Select Student</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="payStudent"
                    type="text"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] focus:ring-4 focus:ring-[#84cc16]/10 transition-all duration-300 text-sm"
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
                  {(form.student_id || studentSearchTerm) && (
                    <button
                      type="button"
                      onClick={handleClearStudent}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-250 flex items-center justify-center transition-all cursor-pointer z-20"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
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
                        const isHighlighted = index === highlightedIndex;
                        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                        const isActive = s?.status === 'ACTIVE';
                        // Plan / Sport / Batch info
                        const enrollments = s?.enrollments || [];
                        const activeEnr = enrollments.find(e => e.is_active);
                        const lastEnr = activeEnr || enrollments[0];
                        const planName = lastEnr?.duration_plan?.name || s?.duration_plan?.name || null;
                        const sportName = lastEnr?.sport?.name || s?.sport?.name || null;
                        const batchName = lastEnr?.batch?.name || s?.batch?.name || null;
                        return (
                          <motion.div
                            key={s?.id || s?.student_id}
                            transition={{ duration: 0.15 }}
                            className={`cursor-pointer px-3 py-2.5 text-xs transition-all duration-150 border-b border-slate-100 dark:border-slate-800/50 last:border-b-0 flex items-center gap-2.5 ${isHighlighted ? 'bg-[#84cc16]/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                            onMouseDown={() => {
                              const studentId = s?.id || s?.student_id;
                              setStudentSearchTerm(name);
                              setDropdownOpen(false);
                              setHighlightedIndex(-1);
                              handleStudentChange(studentId);
                            }}
                            onMouseEnter={() => setHighlightedIndex(index)}
                          >
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 overflow-hidden ${isActive ? 'bg-gradient-to-br from-[#84cc16] to-[#65a30d]' : 'bg-gradient-to-br from-rose-400 to-rose-600'}`}>
                              {s?.profile_photo ? (
                                <img src={s.profile_photo} alt={name} className="w-full h-full object-cover" />
                              ) : initials}
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">{name}</div>
                              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0 mt-0.5">
                                <span className={`text-[10px] font-bold flex items-center gap-0.5 ${isActive ? 'text-emerald-600' : 'text-rose-500'}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                  {isActive ? 'Active' : 'Deactivated'}
                                </span>
                                {(planName || sportName || batchName) && <span className="text-slate-300 dark:text-slate-600 text-[10px]">|</span>}
                                {planName && <span className="text-[10px] text-slate-500 dark:text-slate-400">{planName}</span>}
                                {sportName && <><span className="text-slate-300 dark:text-slate-600 text-[10px]">|</span><span className="text-[10px] text-slate-500 dark:text-slate-400">{sportName}</span></>}
                                {batchName && <><span className="text-slate-300 dark:text-slate-600 text-[10px]">|</span><span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[80px]">{batchName}</span></>}
                              </div>
                            </div>
                          </motion.div>
                        );
                      });
                    })()}
                  </motion.div>
                )}
              </div>

              {form.student_id && (() => {
                const selectedStudent = students.find(s => (s.id || s.student_id)?.toString() === form.student_id.toString());
                if (!selectedStudent) return null;
                const name = selectedStudent.name || `${selectedStudent.first_name || ''} ${selectedStudent.last_name || ''}`;
                const parentName = selectedStudent.parent_name || selectedStudent.parentName || '';
                const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

                const enrollments = selectedStudent.enrollments || [];
                const activeEnrollment = enrollments.find(e => e.is_active);
                const latestEnrollment = activeEnrollment || enrollments[0];
                const planName = latestEnrollment?.duration_plan?.name || 'No Plan';
                const sportName = latestEnrollment?.sport?.name || selectedStudent.sport?.name || 'No Sport';
                const batchName = latestEnrollment?.batch?.name || selectedStudent.batch?.name || 'No Batch';

                return (
                  <div className="bg-slate-50 dark:bg-slate-900/35 border-2 border-slate-150 dark:border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3 text-xs mt-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#84cc16] to-[#65a30d] flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-md shadow-[#84cc16]/20 overflow-hidden">
                        {selectedStudent.profile_photo ? (
                          <img
                            src={selectedStudent.profile_photo}
                            alt={name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          initials
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-850 dark:text-slate-200 text-sm">{name}</div>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                          <span className={`inline-flex items-center gap-1 font-bold ${selectedStudent.status === 'ACTIVE'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${selectedStudent.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'
                              }`} />
                            {selectedStudent.status === 'ACTIVE' ? 'Active' : 'Deactivated'}
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">|</span>
                          <span>{planName}</span>
                          <span className="text-slate-300 dark:text-slate-700">|</span>
                          <span>{sportName}</span>
                          <span className="text-slate-300 dark:text-slate-700">|</span>
                          <span>{batchName}</span>
                          {parentName && (
                            <>
                              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
                              <span className="hidden sm:inline">Parent: {parentName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

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
                  ) : (() => {
                    const selStudent = students.find(s => (s.id || s.student_id)?.toString() === form.student_id.toString());
                    const assigned = studentFeeData
                      ? (studentFeeData.total_fees_assigned || 0)
                      : parseFloat(selStudent?.total_fee || selStudent?.totalComputedFee || 0);
                    const paid = studentFeeData
                      ? (studentFeeData.total_fees_paid || 0)
                      : parseFloat(selStudent?.paid_amount || 0);
                    const pending = studentFeeData
                      ? (studentFeeData.pending_fees || 0)
                      : parseFloat(selStudent?.due_amount || 0);
                    const overdue = studentFeeData
                      ? (studentFeeData.overdue_fees || 0)
                      : 0;
                    const outstanding = studentFeeData
                      ? (studentFeeData.balance_outstanding || 0)
                      : parseFloat(form.pending_amount || 0);
                    const creditBal = parseFloat(selStudent?.advance_balance || 0);

                    return (
                      <>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                          <span className="text-slate-600 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5">
                            <DollarSign className="w-3 h-3" /> Total Fees Assigned
                          </span>
                          <span className="text-slate-900 dark:text-slate-100 font-bold text-sm">₹{assigned.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                          <span className="text-slate-600 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5">
                            <CheckCircle className="w-3 h-3 text-[#84cc16]" /> Total Fees Paid
                          </span>
                          <span className="text-[#84cc16] font-bold text-sm">₹{paid.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                          <span className="text-slate-600 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-amber-500" /> Pending Fees
                          </span>
                          <span className="text-amber-500 font-bold text-sm">₹{pending.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                          <span className="text-slate-600 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5">
                            <AlertCircle className="w-3 h-3 text-red-500" /> Overdue Fees
                          </span>
                          <span className="text-red-500 font-bold text-sm">₹{overdue.toFixed(2)}</span>
                        </div>
                        {creditBal > 0 && (
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                            <span className="text-indigo-650 dark:text-indigo-400 text-xs font-semibold flex items-center gap-1.5">
                              <Wallet className="w-3 h-3 text-indigo-500" /> Credit Balance
                            </span>
                            <span className="text-indigo-650 dark:text-indigo-400 font-bold text-sm">₹{creditBal.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between bg-white dark:bg-slate-900 border-2 border-[#84cc16] rounded-xl p-3 shadow-md shadow-[#84cc16]/10">
                          <span className="text-slate-900 dark:text-slate-100 font-bold flex items-center gap-1.5 text-xs">
                            <Wallet className="w-4 h-4 text-[#84cc16]" /> Pending Dues Outstanding
                          </span>
                          <span className="text-[#84cc16] text-lg font-black">₹{outstanding.toFixed(2)}</span>
                        </div>
                      </>
                    );
                  })()}
                </motion.div>
              )}



              {form.student_id && isInactive ? (
                // REACTIVATE STUDENT FLOW FOR INACTIVE STUDENTS
                <div className="space-y-4 pt-2">
                  <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-4 rounded-xl border border-rose-100 dark:border-rose-900/50 text-xs font-semibold space-y-2 shadow-sm">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                      <UserX className="w-4 h-4 text-rose-500" /> Student Status: Inactive
                    </div>
                    <div>This student's plan is currently inactive. You must reactivate the student before recording payments or adding credit.</div>
                  </div>

                  <motion.button
                    whileHover={{ scale: isSubmitting ? 1 : 1.02, y: isSubmitting ? 0 : -2 }}
                    whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                    type="button"
                    onClick={() => {
                      const enrollments = selectedStudentObj?.enrollments || [];
                      const latestEnrollment = enrollments[0];
                      setReactivateForm({
                        action: 'continue',
                        duration_plan_id: latestEnrollment?.duration_plan_id?.toString() || '',
                        sport_id: latestEnrollment?.sport_id?.toString() || selectedStudentObj?.sport_id?.toString() || '',
                        batch_id: latestEnrollment?.batch_id?.toString() || selectedStudentObj?.batch_id?.toString() || '',
                        plan_start_date: new Date().toISOString().split('T')[0],
                        additional_charges: '',
                        registration_fee: '',
                        discount: ''
                      });
                      setShowReactivateModal(true);
                    }}
                    className="w-full h-11 mt-3 text-sm font-bold bg-rose-600 hover:bg-rose-700 flex items-center justify-center gap-2 rounded-xl transition-all duration-300 text-white shadow-lg shadow-rose-600/20 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reactivate Student
                  </motion.button>
                </div>
              ) : paymentType === 'training' && form.student_id && isCreditEligible ? (
                // ADD IN ACCOUNT FLOW FOR FULLY PAID STUDENTS
                <div className="space-y-4 pt-2">
                  <div className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50 text-[11px] font-semibold space-y-1.5 shadow-sm">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Fee Status: Fully Paid
                    </div>
                    <div>This student has no outstanding dues. You can directly add advance credit to their account.</div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-150 dark:border-slate-800">
                    <span>Available Credit Balance:</span>
                    <span className="text-indigo-600 dark:text-indigo-400">
                      ₹{parseFloat(students.find(s => (s.id || s.student_id)?.toString() === form.student_id.toString())?.advance_balance || 0).toFixed(2)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="extraAmountInput">Extra Amount (₹)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        id="extraAmountInput"
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="e.g. 2000"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-indigo-100 dark:border-indigo-900/40 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-indigo-500 transition-all duration-300 text-sm"
                        value={form.extra_amount}
                        onChange={(e) => setForm(prev => ({ ...prev, extra_amount: e.target.value }))}
                        required
                      />
                    </div>
                    {parseFloat(form.extra_amount || 0) > 0 && (
                      <div className="mt-3 space-y-1.5 p-3 bg-indigo-50/10 dark:bg-indigo-950/5 rounded-xl border border-dashed border-indigo-150 dark:border-indigo-900/45 text-[11px] font-semibold">
                        <div className="text-indigo-600 dark:text-indigo-400 flex justify-between">
                          <span>Total Credit Added:</span>
                          <span className="font-bold">₹{parseFloat(form.extra_amount || 0).toFixed(2)}</span>
                        </div>
                        <div className="text-slate-650 dark:text-slate-400 flex justify-between border-t border-slate-100 dark:border-slate-800 pt-1.5">
                          <span>New Available Credit:</span>
                          <span className="font-bold">₹{(parseFloat(students.find(s => (s.id || s.student_id)?.toString() === form.student_id.toString())?.advance_balance || 0) + parseFloat(form.extra_amount || 0)).toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <motion.button
                    whileHover={{ scale: isSubmitting || !form.extra_amount || parseFloat(form.extra_amount) <= 0 ? 1 : 1.02, y: isSubmitting || !form.extra_amount || parseFloat(form.extra_amount) <= 0 ? 0 : -2 }}
                    whileTap={{ scale: isSubmitting || !form.extra_amount || parseFloat(form.extra_amount) <= 0 ? 1 : 0.98 }}
                    type="submit"
                    disabled={isSubmitting || !form.extra_amount || parseFloat(form.extra_amount) <= 0}
                    className="w-full h-11 mt-3 text-sm font-bold bg-indigo-650 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded-xl transition-all duration-300 text-white shadow-lg shadow-indigo-600/20"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Adding...
                      </>
                    ) : (
                      <>
                        <Wallet className="w-4 h-4" />
                        Add to Account
                      </>
                    )}
                  </motion.button>
                </div>
              ) : (paymentType === 'training' ? (
                // NORMAL FEE COLLECTION FLOW
                <>
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
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] focus:ring-4 focus:ring-[#84cc16]/10 transition-all duration-300 text-sm disabled:opacity-50"
                        value={form.amount}
                        disabled={!form.student_id}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm((prev) => ({ ...prev, amount: val }));
                        }}
                        required
                      />
                    </div>
                  </div>

                  {form.student_id && isCreditEligible && (
                    <div className="space-y-3 bg-indigo-50/20 dark:bg-indigo-950/10 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          checked={collectExtra}
                          onChange={(e) => {
                            setCollectExtra(e.target.checked);
                            if (!e.target.checked) {
                              setForm(prev => ({ ...prev, extra_amount: '' }));
                            }
                          }}
                        />
                        <span className="text-xs font-bold text-indigo-650 dark:text-indigo-400">Collect Extra Amount (Advance Credit)</span>
                      </label>

                      {collectExtra && (
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400" htmlFor="extraAmountInput">Extra Amount (₹)</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                              id="extraAmountInput"
                              type="number"
                              min="0.01"
                              step="0.01"
                              placeholder="e.g. 2000"
                              className="w-full pl-10 pr-4 py-2 rounded-xl border-2 border-indigo-100 dark:border-indigo-900/40 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-indigo-500 transition-all duration-300 text-xs"
                              value={form.extra_amount}
                              onChange={(e) => setForm(prev => ({ ...prev, extra_amount: e.target.value }))}
                              required
                            />
                          </div>
                          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center justify-between">
                            <span>Total Received from Student:</span>
                            <span className="font-bold text-xs">
                              ₹{(parseFloat(form.amount || 0) + parseFloat(form.extra_amount || 0)).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

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
                    whileHover={{ scale: isSubmitting || parseFloat(form.pending_amount || 0) <= 0 ? 1 : 1.02, y: isSubmitting || parseFloat(form.pending_amount || 0) <= 0 ? 0 : -2 }}
                    whileTap={{ scale: isSubmitting || parseFloat(form.pending_amount || 0) <= 0 ? 1 : 0.98 }}
                    type="submit"
                    disabled={isSubmitting || parseFloat(form.pending_amount || 0) <= 0}
                    className={`w-full h-11 mt-3 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded-xl transition-all duration-300 ${parseFloat(form.pending_amount || 0) <= 0
                      ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-[#84cc16] to-[#65a30d] text-white shadow-lg shadow-[#84cc16]/30 hover:shadow-[#84cc16]/50'
                      }`}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </>
                    ) : parseFloat(form.pending_amount || 0) <= 0 ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Fully Paid
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4" />
                        Create Payment
                      </>
                    )}
                  </motion.button>
                </>
              ) : (
                // SPORTS KIT FEE COLLECTION FLOW
                form.student_id && (
                  <div className="space-y-4 pt-1">
                    {/* 1. Assigned kits list */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Student's Existing Kits</label>
                      {loadingKits ? (
                        <div className="text-slate-500 dark:text-slate-400 text-xs italic py-2 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 animate-spin" /> Loading kits...
                        </div>
                      ) : studentKits.length > 0 ? (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {studentKits.map((kit) => {
                            const unpaidAmt = parseFloat(kit.due_amount || 0);
                            const isSelected = selectedKitAssignment?.assignment_id === kit.assignment_id;
                            return (
                              <div
                                key={kit.assignment_id}
                                onClick={() => {
                                  if (unpaidAmt > 0) {
                                    setSelectedKitAssignment(kit);
                                    setNewKitId('');
                                    setKitPaymentAmount(unpaidAmt.toFixed(2));
                                  }
                                }}
                                className={`p-2.5 rounded-xl border text-[11px] transition-all flex justify-between items-center cursor-pointer ${isSelected
                                  ? 'bg-[#84cc16]/10 border-[#84cc16] shadow-sm'
                                  : unpaidAmt > 0
                                    ? 'bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-955/15 dark:hover:bg-amber-955/25 border-amber-200/50 dark:border-amber-900/30'
                                    : 'bg-slate-50/50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 opacity-70'
                                  }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="font-bold text-slate-800 dark:text-slate-200">{kit.kit?.name} (Qty: {kit.quantity})</div>
                                  <div className="text-[10px] text-slate-400">Sport: {kit.kit?.sport?.name || '—'} · Date: {new Date(kit.issue_date).toLocaleDateString()}</div>
                                </div>
                                <div className="text-right space-y-0.5">
                                  <div className="font-bold">Total: ₹{parseFloat(kit.total_amount || 0).toFixed(0)}</div>
                                  <div className="text-[10px] font-semibold text-amber-600">Pending: ₹{unpaidAmt.toFixed(0)}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic py-1">No kits currently assigned to this student.</p>
                      )}
                    </div>

                    {/* 2. Select kit to assign */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Assign New Kit (Optional)</label>
                      <select
                        className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] text-xs appearance-none cursor-pointer"
                        value={newKitId}
                        onChange={(e) => {
                          setNewKitId(e.target.value);
                          setSelectedKitAssignment(null);
                          if (e.target.value) {
                            const selectedObj = availableKits.find(k => k.kit_id.toString() === e.target.value.toString());
                            const finalPrice = Math.max(0, parseFloat(selectedObj?.selling_price || 0) * parseInt(newKitQty || 1) - parseFloat(newKitDiscount || 0));
                            setKitPaymentAmount(finalPrice.toString());
                          } else {
                            setKitPaymentAmount('');
                          }
                        }}
                      >
                        <option value="">Select a kit to assign...</option>
                        {availableKits.filter(k => k.available_qty > 0).map(k => (
                          <option key={k.kit_id} value={k.kit_id}>
                            {k.name} (Sport: {k.sport?.name || '—'} · Price: ₹{parseFloat(k.selling_price).toFixed(0)} · Stock: {k.available_qty})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 3. Detailed Kit Info display for selection */}
                    {(selectedKitAssignment || newKitId) && (() => {
                      let name = '', sport = '', quantityStr = '1', totalPrice = 0, alreadyPaid = 0, pendingDues = 0, stockStr = '';
                      if (selectedKitAssignment) {
                        name = selectedKitAssignment.kit?.name;
                        sport = selectedKitAssignment.kit?.sport?.name || '—';
                        quantityStr = selectedKitAssignment.quantity?.toString() || '1';
                        totalPrice = parseFloat(selectedKitAssignment.total_amount || 0);
                        alreadyPaid = parseFloat(selectedKitAssignment.paid_amount || 0);
                        pendingDues = parseFloat(selectedKitAssignment.due_amount || 0);
                      } else {
                        const selectedObj = availableKits.find(k => k.kit_id.toString() === newKitId.toString());
                        name = selectedObj?.name;
                        sport = selectedObj?.sport?.name || '—';
                        stockStr = selectedObj?.available_qty?.toString() || '0';
                        const unitPrice = parseFloat(selectedObj?.selling_price || 0);
                        const qty = parseInt(newKitQty || 1, 10);
                        const disc = parseFloat(newKitDiscount || 0);
                        totalPrice = Math.max(0, unitPrice * qty - disc);
                        alreadyPaid = 0;
                        pendingDues = totalPrice;
                      }

                      const paymentVal = parseFloat(kitPaymentAmount || 0);
                      const remainingDuesLive = Math.max(0, pendingDues - paymentVal);

                      return (
                        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                          <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{name}</span>
                            <span className="text-[10px] bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded-md font-semibold text-slate-600 dark:text-slate-400">Sport: {sport}</span>
                          </div>

                          {newKitId && (
                            <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-150 dark:border-slate-800">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Quantity</label>
                                <input
                                  type="number"
                                  min="1"
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
                                  value={newKitQty}
                                  onChange={(e) => {
                                    setNewKitQty(e.target.value);
                                    const selectedObj = availableKits.find(k => k.kit_id.toString() === newKitId.toString());
                                    const unitPrice = parseFloat(selectedObj?.selling_price || 0);
                                    const disc = parseFloat(newKitDiscount || 0);
                                    const finalPrice = Math.max(0, unitPrice * parseInt(e.target.value || 1) - disc);
                                    setKitPaymentAmount(finalPrice.toString());
                                  }}
                                />
                                <span className="text-[9px] text-slate-400 mt-0.5 block">Stock: {stockStr} sets</span>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Discount (₹)</label>
                                <input
                                  type="number"
                                  min="0"
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
                                  value={newKitDiscount}
                                  onChange={(e) => {
                                    setNewKitDiscount(e.target.value);
                                    const selectedObj = availableKits.find(k => k.kit_id.toString() === newKitId.toString());
                                    const unitPrice = parseFloat(selectedObj?.selling_price || 0);
                                    const qty = parseInt(newKitQty || 1);
                                    const finalPrice = Math.max(0, unitPrice * qty - parseFloat(e.target.value || 0));
                                    setKitPaymentAmount(finalPrice.toString());
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          <div className="space-y-1.5 font-semibold text-slate-650 dark:text-slate-400">
                            <div className="flex justify-between">
                              <span>Total Price:</span>
                              <span className="text-slate-900 dark:text-slate-200">₹{totalPrice.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Already Paid:</span>
                              <span className="text-emerald-600">₹{alreadyPaid.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                              <span>Pending Balance:</span>
                              <span className="text-amber-600">₹{pendingDues.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between font-bold pt-0.5">
                              <span>Remaining Balance (Live):</span>
                              <span className={remainingDuesLive > 0 ? "text-amber-600" : "text-emerald-600"}>
                                ₹{remainingDuesLive.toFixed(0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 4. Payment inputs common for both modes */}
                    {(selectedKitAssignment || newKitId) && (
                      <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Payment Amount (₹)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Enter payment amount"
                            className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] text-xs"
                            value={kitPaymentAmount}
                            onChange={(e) => setKitPaymentAmount(e.target.value)}
                            required
                          />
                          <span className="text-[10px] text-slate-400 mt-1 block">Partial payments are allowed. Unpaid amount will remain as pending dues.</span>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Payment Date</label>
                            <input
                              type="date"
                              className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] text-xs"
                              value={form.payment_date}
                              onChange={(e) => setForm(prev => ({ ...prev, payment_date: e.target.value }))}
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Payment Method</label>
                            <select
                              className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] text-xs appearance-none cursor-pointer"
                              value={form.method}
                              onChange={(e) => setForm(prev => ({ ...prev, method: e.target.value }))}
                              required
                            >
                              <option value="">Select Method</option>
                              <option value="upi">UPI</option>
                              <option value="cash">Cash</option>
                              <option value="card">Card</option>
                              <option value="bank_transfer">Bank Transfer</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <motion.button
                            whileHover={{ scale: isKitSubmitting ? 1 : 1.02, y: isKitSubmitting ? 0 : -2 }}
                            whileTap={{ scale: isKitSubmitting ? 1 : 0.98 }}
                            type="submit"
                            disabled={isKitSubmitting}
                            className="flex-1 h-11 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/25 transition-all duration-300 flex items-center justify-center gap-1.5"
                          >
                            {isKitSubmitting ? (
                              <>
                                <Clock className="w-3.5 h-3.5 animate-spin" />
                                Recording Payment...
                              </>
                            ) : (
                              <>
                                <Wallet className="w-3.5 h-3.5" />
                                {selectedKitAssignment ? 'Record Kit Balance Payment' : 'Assign Kit & Record Payment'}
                              </>
                            )}
                          </motion.button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              ))}
            </motion.form>

            {/* RIGHT COLUMN: Payment Records */}
            <div className="flex flex-col gap-3">
              {/* PAYMENT RECORDS — Compact Card Panel */}
              <motion.div
                id="paymentRecordsSection"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-black/5 border border-slate-100 dark:border-slate-700/50 overflow-hidden flex flex-col transition-all duration-500 ${highlightPaymentRecords ? 'ring-4 ring-amber-500/50 shadow-2xl shadow-amber-500/20' : ''}`}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md shadow-purple-500/30">
                      <TrendingUp className="w-3.5 h-3.5 text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">Payment Records</h3>
                    {filteredPayments.length > 0 && (
                      <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full">{filteredPayments.length}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                      <input
                        type="text"
                        className="w-32 pl-7 pr-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] transition-all text-xs"
                        placeholder="Search..."
                        value={globalSearch}
                        onChange={(e) => setGlobalSearch(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowRecordsFilter(!showRecordsFilter)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${showRecordsFilter
                        ? 'bg-[#84cc16] border-[#84cc16] text-white'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                      <Filter className="w-3 h-3" />
                      Filter
                      {(statusFilter || methodFilter || dateFrom || dateTo) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Collapsible Filters */}
                <AnimatePresence>
                  {showRecordsFilter && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden flex-shrink-0"
                    >
                      <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-900/35 border-b border-slate-100 dark:border-slate-800/80">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                          <select className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#84cc16]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Method</label>
                          <select className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#84cc16]" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
                            <option value="">All Methods</option>
                            <option value="upi">UPI</option>
                            <option value="cash">Cash</option>
                            <option value="card">Card</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="cheque">Cheque</option>
                            <option value="online">Online</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">From</label>
                          <input type="date" className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#84cc16]" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">To</label>
                          <input type="date" className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#84cc16]" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                        </div>
                        <div className="col-span-2 flex justify-end">
                          <button type="button" onClick={clearFilters} className="text-[10px] font-bold text-[#84cc16] hover:text-[#65a30d] px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 cursor-pointer transition-all">Clear All</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Compact Card List with internal scroll */}
                <div className="flex-1 overflow-y-auto" style={{ maxHeight: '520px' }}>
                  {loading && payments.length === 0 ? (
                    <div className="p-8 flex items-center justify-center"><Loader /></div>
                  ) : paginatedPayments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-slate-400">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-2">
                        <Search className="w-5 h-5 text-slate-400" />
                      </div>
                      <p className="text-xs font-medium">No payments found</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {paginatedPayments.map((payment, index) => {
                        const normalizedStatus = (payment?.status || '').toUpperCase();
                        const currentId = payment?.receipt_id || payment?.id || payment?._id || payment?.payment_id || index;
                        const isOverdue = normalizedStatus === 'PENDING' && payment?.due_date && new Date(payment.due_date) < new Date();
                        const studentName = payment?.student?.name || payment?.student_name || `Student #${payment?.student_id}`;
                        const isKit = payment?.remarks && payment.remarks.includes('Sports Kit');
                        const payDate = payment?.payment_date || payment?.date;
                        const initials = studentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                        return (
                          <motion.div
                            key={currentId}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02 }}
                            className={`px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${isOverdue ? 'bg-red-50/40 dark:bg-red-950/10' : ''}`}
                          >
                            <div className="flex items-center gap-2.5">
                              {/* Avatar */}
                              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 overflow-hidden">
                                {payment?.student?.profile_photo ? (
                                  <img src={payment.student.profile_photo} alt={studentName} className="w-full h-full object-cover" />
                                ) : initials}
                              </div>
                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between gap-1">
                                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{studentName}</span>
                                  <span className="text-sm font-black text-slate-900 dark:text-slate-100 flex-shrink-0">₹{parseFloat(payment?.amount || 0).toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex items-center justify-between gap-1 mt-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${isKit ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'}`}>
                                      {isKit ? 'Kit' : 'Training'}
                                    </span>
                                    <span className="text-[9px] text-slate-400">{payDate ? new Date(payDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</span>
                                    {payment?.method && <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium capitalize">{payment.method}</span>}
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {isOverdue ? (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse">
                                        <AlertCircle className="w-2 h-2" /> OD
                                      </span>
                                    ) : normalizedStatus === 'COMPLETED' ? (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                        <CheckCircle className="w-2 h-2" /> PAID
                                      </span>
                                    ) : normalizedStatus === 'FAILED' || normalizedStatus === 'REJECTED' ? (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                        <XCircle className="w-2 h-2" /> {normalizedStatus}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                        <Clock className="w-2 h-2" /> PENDING
                                      </span>
                                    )}
                                    {normalizedStatus !== 'COMPLETED' && (
                                      <button type="button" onClick={() => handleMarkPaidClick(payment, currentId)} title="Mark Paid" className="w-5 h-5 rounded flex items-center justify-center bg-[#84cc16]/10 hover:bg-[#84cc16] text-[#84cc16] hover:text-white transition-all cursor-pointer">
                                        <CheckCircle className="w-3 h-3" />
                                      </button>
                                    )}
                                    {!['COMPLETED', 'REJECTED', 'FAILED', 'VOID'].includes(normalizedStatus) && (
                                      <button type="button" onClick={() => rejectPayment(payment, currentId)} title="Reject" className="w-5 h-5 rounded flex items-center justify-center bg-red-100 hover:bg-red-500 text-red-500 hover:text-white transition-all cursor-pointer">
                                        <XCircle className="w-3 h-3" />
                                      </button>
                                    )}
                                    {(payment?.proof_url || payment?.attachmentUrl || payment?.receipt_image || payment?.proof) && (
                                      <button type="button" onClick={() => { const p = payment.proof_url || payment.attachmentUrl || payment.receipt_image || payment.proof; setPreviewImage(p.startsWith('http') ? p : `http://localhost:5000/${p}`); }} title="View Proof" className="w-5 h-5 rounded flex items-center justify-center bg-blue-50 hover:bg-blue-500 text-blue-500 hover:text-white transition-all cursor-pointer">
                                        <Calendar className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Compact Pagination Footer */}
                {filteredPayments.length > recordsPerPage && (
                  <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/30 flex-shrink-0">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      {startIndex + 1}–{Math.min(endIndex, filteredPayments.length)} of {filteredPayments.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-2 py-1 rounded text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>‹ Prev</motion.button>
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 px-1">{currentPage} / {totalPages}</span>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-2 py-1 rounded text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>Next ›</motion.button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
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

          {/* Student Accounts Section - Full Width layout */}
          <div className="w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-black/5 border border-slate-100 dark:border-slate-700/50 overflow-hidden"
            >
              <div className="p-3 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/30">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground">Student Accounts</h3>
                      {/* Tooltip Help Circle */}
                      <div className="relative group cursor-pointer">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-600 transition-colors" />
                        <div className="absolute left-0 top-5 hidden group-hover:block w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 p-3 rounded-xl shadow-xl text-[11px] text-slate-650 dark:text-slate-400 space-y-1.5 z-40 transition-all">
                          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1 mb-1 border-b border-slate-105 dark:border-slate-700/50 pb-1">
                            <BookOpen className="w-3 h-3 text-[#84cc16]" /> Quick Guide
                          </div>
                          <div className="flex items-start gap-1">
                            <ChevronRight className="w-3 h-3 mt-0.5 text-[#84cc16] flex-shrink-0" />
                            <span>Click a student row to expand their payment history and credit details.</span>
                          </div>
                          <div className="flex items-start gap-1">
                            <ChevronRight className="w-3 h-3 mt-0.5 text-[#84cc16] flex-shrink-0" />
                            <span>Use the <strong>Collect Fee</strong> button to jump directly to the Payment tab for that student.</span>
                          </div>
                          <div className="flex items-start gap-1">
                            <ChevronRight className="w-3 h-3 mt-0.5 text-[#84cc16] flex-shrink-0" />
                            <span>Inactive students are shown with a red badge. Reactivate them from the Payment tab.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Fee status and payment history</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadStudentAccountsData}
                  className="text-[10px] font-bold text-slate-400 hover:text-[#84cc16] flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>

              {/* Filters Toolbar */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search student, parent, phone..."
                    value={studentAccountsSearch}
                    onChange={(e) => setStudentAccountsSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] text-xs"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Sort */}
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="pl-3 pr-7 py-1.5 rounded-lg border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] appearance-none cursor-pointer text-xs"
                    >
                      <option value="name">Sort: Name</option>
                      <option value="highest_due">Sort: Highest Due</option>
                      <option value="highest_paid">Sort: Highest Paid</option>
                      <option value="recently_paid">Sort: Recently Paid</option>
                    </select>
                    <ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Status Pills */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700/50">
                    {[
                      { key: 'all', label: `All (${studentAccountsData?.students?.filter(s => s.status === 'ACTIVE' && !s.is_deleted).length || 0})` },
                      { key: 'paid', label: `Paid (${studentAccountsData?.students?.filter(s => s.status === 'ACTIVE' && !s.is_deleted && s.fee_status === 'paid').length || 0})` },
                      { key: 'unpaid', label: `Unpaid (${studentAccountsData?.students?.filter(s => s.status === 'ACTIVE' && !s.is_deleted && s.fee_status === 'unpaid').length || 0})` },
                      { key: 'inactive', label: `Inactive (${studentAccountsData?.students?.filter(s => s.status !== 'ACTIVE' || s.is_deleted).length || 0})` }
                    ].map(f => (
                      <button
                        key={f.key}
                        onClick={() => setStudentAccountsFilter(f.key)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all duration-200 ${studentAccountsFilter === f.key ? 'bg-[#84cc16] text-white shadow-sm' : 'text-slate-650 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
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
                          <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">Credit</th>
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
                            const isActive = student.status === 'ACTIVE' && !student.is_deleted;

                            // Filter by tab status
                            if (studentAccountsFilter === 'inactive') {
                              if (isActive) return false;
                            } else {
                              // Tab is 'all', 'paid', or 'unpaid' -> hide inactive/deactivated students
                              if (!isActive) return false;

                              if (studentAccountsFilter === 'paid' && feeStatus !== 'paid') return false;
                              if (studentAccountsFilter === 'unpaid' && feeStatus !== 'unpaid') return false;
                            }

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
                            const isDeactivated = student.status === 'INACTIVE' || student.is_deleted;

                            // Check if student is overdue (has due amount and no recent payment)
                            const isOverdue = dueAmount > 0 && lastPaidDate && new Date(lastPaidDate) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

                            return (
                              <React.Fragment key={student.student_id || index}>
                                <motion.tr
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.03 }}
                                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isDeactivated ? 'opacity-70' : ''} ${isOverdue ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}
                                >
                                  <td className="px-4 py-3">
                                    <div className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-2">
                                      {student.name || '—'}
                                      {isDeactivated && (
                                        <span className="inline-flex items-center rounded-full bg-red-50 dark:bg-red-950/40 px-2 py-0.5 text-[8px] font-bold text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-900/50 uppercase tracking-wider">
                                          Inactive
                                        </span>
                                      )}
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
                                  <td className="px-4 py-3 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                    ₹{parseFloat(student.advance_balance || 0).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                                    {formatDate(lastPaidDate)}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${feeStatus === 'paid'
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
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      type="button"
                                      onClick={() => handleParentPasswordManage(student)}
                                      title="Manage Parent Portal Credentials"
                                      className="p-2 rounded-lg bg-purple-50 text-purple-650 hover:bg-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:hover:bg-purple-900/40 transition-all inline-flex items-center justify-center cursor-pointer"
                                    >
                                      <Key className="w-3.5 h-3.5" />
                                    </motion.button>
                                  </td>
                                </motion.tr>
                                {isExpanded && (
                                  <motion.tr
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                  >
                                    <td colSpan="10" className="px-4 py-4 bg-slate-50 dark:bg-slate-900/30">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">

                                        {/* Left Column: Fee Summary & History */}
                                        <div className="space-y-4">
                                          <div>
                                            <h4 className="font-bold text-slate-950 dark:text-white text-xs mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                                              <DollarSign className="w-3.5 h-3.5 text-[#84cc16]" /> Fee Summary
                                            </h4>
                                            <div className="grid grid-cols-3 gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                              <div className="text-center">
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Total Fee</div>
                                                <div className="font-bold text-slate-900 dark:text-slate-100 text-xs mt-0.5">₹{parseFloat(totalAmount || 0).toFixed(2)}</div>
                                              </div>
                                              <div className="text-center border-x border-slate-100 dark:border-slate-700">
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Paid</div>
                                                <div className="font-bold text-[#84cc16] text-xs mt-0.5">₹{parseFloat(paidAmount || 0).toFixed(2)}</div>
                                              </div>
                                              <div className="text-center">
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Due</div>
                                                <div className="font-bold text-amber-500 text-xs mt-0.5">₹{parseFloat(dueAmount || 0).toFixed(2)}</div>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Sports Kit Fees Summary */}
                                          <div className="mt-4">
                                            <h4 className="font-bold text-slate-950 dark:text-white text-xs mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                                              <Package className="w-3.5 h-3.5 text-amber-500" /> Sports Kit Fees Summary
                                            </h4>
                                            {student.sports_kit_assignments && student.sports_kit_assignments.length > 0 ? (
                                              <div className="space-y-2 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                                {student.sports_kit_assignments.map((assignment, idx) => (
                                                  <div key={assignment.assignment_id || idx} className="flex justify-between items-center text-xs pb-1.5 border-b last:border-b-0 border-slate-100 dark:border-slate-700/50">
                                                    <div>
                                                      <span className="font-bold text-slate-800 dark:text-slate-200">{assignment.kit?.name}</span>
                                                      <span className="text-[10px] text-slate-400 block">Qty: {assignment.quantity} · Sport: {assignment.kit?.sport?.name || '—'}</span>
                                                    </div>
                                                    <div className="text-right">
                                                      <span className="font-bold text-slate-900 dark:text-slate-100">Total: ₹{parseFloat(assignment.total_amount || 0).toFixed(2)}</span>
                                                      <div className="text-[10px] space-x-2">
                                                        <span className="text-emerald-600 font-medium">Paid: ₹{parseFloat(assignment.paid_amount || 0).toFixed(2)}</span>
                                                        <span className="text-amber-500 font-medium">Due: ₹{parseFloat(assignment.due_amount || 0).toFixed(2)}</span>
                                                      </div>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <p className="text-slate-400 dark:text-slate-500 text-[10px] italic bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">No sports kits assigned</p>
                                            )}
                                          </div>

                                          <div className="space-y-2 mt-4">
                                            <h4 className="font-bold text-slate-950 dark:text-white text-xs flex items-center gap-1.5 uppercase tracking-wider">
                                              <Calendar className="w-3.5 h-3.5 text-[#84cc16]" /> Payment History
                                            </h4>
                                            {student.receipts && student.receipts.length > 0 ? (() => {
                                              const hasCycleMeta = student.receipts.some(r => r.is_current_cycle !== undefined);
                                              const currentCycleReceipts = hasCycleMeta ? student.receipts.filter(r => r.is_current_cycle) : student.receipts;
                                              const previousCycleReceipts = hasCycleMeta ? student.receipts.filter(r => !r.is_current_cycle) : [];

                                              const renderReceipt = (receipt, idx) => (
                                                <div key={receipt.receipt_id || idx} className="flex items-center justify-between text-[10px] bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                                  <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded bg-[#84cc16]/10 flex items-center justify-center">
                                                      <DollarSign className="w-3 h-3 text-[#84cc16]" />
                                                    </div>
                                                    <div>
                                                      <span className="font-bold text-slate-900 dark:text-slate-100">₹{parseFloat(receipt.amount).toFixed(2)}</span>
                                                      {parseFloat(receipt.discount || 0) > 0 && (
                                                        <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-semibold ml-1.5">(Discount: ₹{parseFloat(receipt.discount).toFixed(0)})</span>
                                                      )}
                                                      <span className="text-slate-400 ml-1.5">{formatDate(receipt.payment_date)}</span>
                                                    </div>
                                                  </div>
                                                  <div className="text-slate-600 dark:text-slate-400 font-bold flex items-center gap-1.5">
                                                    <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase ${(receipt.status || '').toUpperCase() === 'COMPLETED'
                                                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                                      }`}>{receipt.status || 'N/A'}</span>
                                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[8px] uppercase">{receipt.method || 'cash'}</span>
                                                    {receipt.remarks && (
                                                      <span className="text-slate-400 max-w-[100px] truncate" title={receipt.remarks}>— {receipt.remarks}</span>
                                                    )}
                                                  </div>
                                                </div>
                                              );

                                              return (
                                                <div className="max-h-[280px] overflow-y-auto space-y-3 pr-1">
                                                  {/* Current Cycle */}
                                                  <div>
                                                    <div className="flex items-center gap-1.5 mb-1.5">
                                                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#84cc16]/15 text-[#65a30d] dark:text-[#84cc16] border border-[#84cc16]/30">
                                                        ✦ Current Cycle
                                                      </span>
                                                    </div>
                                                    {currentCycleReceipts.length > 0 ? (
                                                      <div className="space-y-1.5">
                                                        {currentCycleReceipts.map((r, idx) => renderReceipt(r, idx))}
                                                      </div>
                                                    ) : (
                                                      <p className="text-slate-400 dark:text-slate-500 text-[10px] italic px-2">No payments in current cycle yet</p>
                                                    )}
                                                  </div>

                                                  {/* Previous Cycles */}
                                                  {previousCycleReceipts.length > 0 && (
                                                    <div>
                                                      <div className="flex items-center gap-1.5 mb-1.5">
                                                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                          ◇ Previous Cycles
                                                        </span>
                                                      </div>
                                                      <div className="space-y-1.5 opacity-70">
                                                        {previousCycleReceipts.map((r, idx) => renderReceipt(r, idx))}
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })() : (
                                              <p className="text-slate-500 dark:text-slate-400 text-[10px] italic bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">No payment history available</p>
                                            )}
                                          </div>
                                        </div>

                                        {/* Right Column: Advance Credit */}
                                        <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 md:pl-6 pt-4 md:pt-0">
                                          <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-slate-950 dark:text-white text-xs flex items-center gap-1.5 uppercase tracking-wider">
                                              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" /> Advance Credit
                                            </h4>
                                            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                                              Available Balance: ₹{parseFloat(student.advance_balance || 0).toFixed(2)}
                                            </div>
                                          </div>

                                          <div className="flex gap-2">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setShowAddCreditForm(prev => ({ ...prev, [student.student_id]: !prev[student.student_id] }));
                                                setShowUseCreditForm(prev => ({ ...prev, [student.student_id]: false }));
                                                setAddCreditData({ amount: '', reason: '' });
                                              }}
                                              className="flex-1 py-1.5 rounded-lg text-[10px] font-bold border-2 border-indigo-100 dark:border-indigo-900/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 transition-colors"
                                            >
                                              + Add Credit
                                            </button>
                                            <button
                                              type="button"
                                              disabled={parseFloat(student.advance_balance || 0) <= 0}
                                              onClick={() => {
                                                setShowUseCreditForm(prev => ({ ...prev, [student.student_id]: !prev[student.student_id] }));
                                                setShowAddCreditForm(prev => ({ ...prev, [student.student_id]: false }));
                                                setUseCreditData({ amount: '', use_for: 'KIT', reason: '', reference_id: '' });
                                              }}
                                              className="flex-1 py-1.5 rounded-lg text-[10px] font-bold border-2 border-indigo-100 dark:border-indigo-900/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                              - Use Credit
                                            </button>
                                          </div>

                                          {/* Add Credit Form */}
                                          {showAddCreditForm[student.student_id] && (
                                            <motion.div
                                              initial={{ opacity: 0, height: 0 }}
                                              animate={{ opacity: 1, height: 'auto' }}
                                              className="bg-indigo-50/55 dark:bg-indigo-950/10 p-3 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30 space-y-3"
                                            >
                                              <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Add Advance Credit Balance</div>
                                              <div className="grid grid-cols-2 gap-2">
                                                <input
                                                  type="number"
                                                  placeholder="Amount (₹)"
                                                  className="input-field py-1 px-2.5 h-8 text-[10px] w-full bg-white dark:bg-slate-900"
                                                  value={addCreditData.amount}
                                                  onChange={(e) => setAddCreditData({ ...addCreditData, amount: e.target.value })}
                                                />
                                                <input
                                                  type="text"
                                                  placeholder="Reason/Remarks"
                                                  className="input-field py-1 px-2.5 h-8 text-[10px] w-full bg-white dark:bg-slate-900"
                                                  value={addCreditData.reason}
                                                  onChange={(e) => setAddCreditData({ ...addCreditData, reason: e.target.value })}
                                                />
                                              </div>
                                              <div className="flex gap-2 justify-end">
                                                <button
                                                  type="button"
                                                  onClick={() => setShowAddCreditForm(prev => ({ ...prev, [student.student_id]: false }))}
                                                  className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9px] font-bold"
                                                >
                                                  Cancel
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleAddCredit(student.student_id)}
                                                  className="px-2.5 py-1 rounded bg-indigo-600 text-white text-[9px] font-bold"
                                                >
                                                  Save
                                                </button>
                                              </div>
                                            </motion.div>
                                          )}

                                          {/* Use Credit Form */}
                                          {showUseCreditForm[student.student_id] && (
                                            <motion.div
                                              initial={{ opacity: 0, height: 0 }}
                                              animate={{ opacity: 1, height: 'auto' }}
                                              className="bg-indigo-50/55 dark:bg-indigo-950/10 p-3 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30 space-y-3"
                                            >
                                              <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Consume Credit Balance</div>
                                              <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                  <label className="text-[8px] font-bold text-slate-500 block mb-0.5">Use For</label>
                                                  <select
                                                    className="input-field py-1 px-1.5 h-8 text-[10px] w-full bg-white dark:bg-slate-900"
                                                    value={useCreditData.use_for}
                                                    onChange={(e) => setUseCreditData({ ...useCreditData, use_for: e.target.value, reference_id: '' })}
                                                  >
                                                    <option value="KIT">Sports Kit</option>
                                                    <option value="PLAN">Duration Plan</option>
                                                    <option value="OTHER">Other Charges</option>
                                                  </select>
                                                </div>
                                                <div>
                                                  <label className="text-[8px] font-bold text-slate-500 block mb-0.5">Amount (₹)</label>
                                                  <input
                                                    type="number"
                                                    placeholder="Amount"
                                                    className="input-field py-1 px-1.5 h-8 text-[10px] w-full bg-white dark:bg-slate-900"
                                                    value={useCreditData.amount}
                                                    onChange={(e) => setUseCreditData({ ...useCreditData, amount: e.target.value })}
                                                  />
                                                </div>
                                                <div>
                                                  <label className="text-[8px] font-bold text-slate-500 block mb-0.5">Reference ID</label>
                                                  {useCreditData.use_for === 'PLAN' ? (
                                                    <select
                                                      className="input-field py-1 px-1.5 h-8 text-[10px] w-full bg-white dark:bg-slate-900"
                                                      value={useCreditData.reference_id}
                                                      onChange={(e) => setUseCreditData({ ...useCreditData, reference_id: e.target.value })}
                                                    >
                                                      <option value="">Select Plan</option>
                                                      {(student.enrollments || []).map((enr, idx) => (
                                                        <option key={idx} value={enr.enrollment_id}>
                                                          {enr.batch?.sport?.name || 'Sport'} (Due: ₹{(enr.final_fee - enr.paid_amount).toFixed(0)})
                                                        </option>
                                                      ))}
                                                    </select>
                                                  ) : (
                                                    <input
                                                      type="text"
                                                      placeholder="ID / Code"
                                                      className="input-field py-1 px-1.5 h-8 text-[10px] w-full bg-white dark:bg-slate-900"
                                                      value={useCreditData.reference_id}
                                                      onChange={(e) => setUseCreditData({ ...useCreditData, reference_id: e.target.value })}
                                                    />
                                                  )}
                                                </div>
                                              </div>
                                              <div>
                                                <input
                                                  type="text"
                                                  placeholder="Description / Remarks"
                                                  className="input-field py-1 px-2.5 h-8 text-[10px] w-full bg-white dark:bg-slate-900"
                                                  value={useCreditData.reason}
                                                  onChange={(e) => setUseCreditData({ ...useCreditData, reason: e.target.value })}
                                                />
                                              </div>
                                              <div className="flex gap-2 justify-end">
                                                <button
                                                  type="button"
                                                  onClick={() => setShowUseCreditForm(prev => ({ ...prev, [student.student_id]: false }))}
                                                  className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9px] font-bold"
                                                >
                                                  Cancel
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleUseCredit(student.student_id)}
                                                  className="px-2.5 py-1 rounded bg-indigo-600 text-white text-[9px] font-bold"
                                                >
                                                  Apply
                                                </button>
                                              </div>
                                            </motion.div>
                                          )}

                                          {/* Credit History Table */}
                                          <div className="space-y-2">
                                            <div className="text-[10px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">Credit History</div>
                                            {creditLoading[student.student_id] ? (
                                              <div className="text-[10px] text-slate-400 py-2">Loading credit transactions...</div>
                                            ) : creditHistories[student.student_id]?.transactions && creditHistories[student.student_id].transactions.length > 0 ? (
                                              <div className="max-h-[160px] overflow-y-auto pr-1 space-y-1.5">
                                                {creditHistories[student.student_id].transactions.map((tx, idx) => (
                                                  <div key={idx} className="flex items-center justify-between text-[9px] bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                                    <div className="flex items-center gap-1.5">
                                                      <span className={`font-bold ${tx.type === 'ADD' ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                        {tx.type === 'ADD' ? '+' : '—'} ₹{parseFloat(tx.amount).toFixed(2)}
                                                      </span>
                                                      <span className="text-slate-500 dark:text-slate-400 truncate max-w-[130px] font-medium" title={tx.reason}>{tx.reason}</span>
                                                    </div>
                                                    <div className="text-slate-400 flex items-center gap-1">
                                                      {tx.reference_type && (
                                                        <span className="px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-[7px] uppercase font-bold text-slate-500">{tx.reference_type}</span>
                                                      )}
                                                      <span>{formatDate(tx.created_at)}</span>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <p className="text-slate-500 dark:text-slate-400 text-[10px] italic bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">No credit history available</p>
                                            )}
                                          </div>
                                        </div>

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
            className={`fixed bottom-6 right-6 z-50 rounded-xl p-4 text-sm font-bold shadow-2xl border ${message.type === 'success' ? 'bg-[rgb(var(--color-accent-primary))] text-white border-transparent' : 'bg-[rgb(var(--color-danger))] text-white border-transparent'
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

      {/* RIGHT-SIDE DRAWER FOR SUMMARY CARDS */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-slate-800 shadow-2xl z-50 flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {drawerType === 'total' ? 'Total Amount Breakdown' : 'Collected Payments'}
                </h3>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Search and Sort */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={drawerType === 'total' ? 'Search students...' : 'Search payments...'}
                    value={drawerSearch}
                    onChange={(e) => setDrawerSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] focus:ring-4 focus:ring-[#84cc16]/10 transition-all duration-300 text-sm"
                  />
                </div>
                <div className="relative">
                  <select
                    value={drawerSort}
                    onChange={(e) => setDrawerSort(e.target.value)}
                    className="w-full pl-4 pr-8 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] focus:ring-4 focus:ring-[#84cc16]/10 transition-all duration-300 appearance-none cursor-pointer text-sm"
                  >
                    {drawerType === 'total' ? (
                      <>
                        <option value="name">Sort by Name</option>
                        <option value="amount">Sort by Amount</option>
                      </>
                    ) : (
                      <>
                        <option value="date">Sort by Date</option>
                        <option value="name">Sort by Name</option>
                        <option value="amount">Sort by Amount</option>
                      </>
                    )}
                  </select>
                  <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {(() => {
                  const data = getFilteredDrawerData();

                  if (data.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
                        <Search className="w-12 h-12 mb-2" />
                        <p className="text-sm">No records found</p>
                      </div>
                    );
                  }

                  if (drawerType === 'total') {
                    return (
                      <div className="space-y-3">
                        {data.map((item, index) => {
                          const student = item.student;
                          const name = student?.name || `${student?.first_name || ''} ${student?.last_name || ''}`;
                          const sport = student?.sport?.name || '—';
                          const batch = student?.batch?.name || '—';

                          return (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{name}</h4>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {sport} • {batch}
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-3 text-center">
                                <div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total</div>
                                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">₹{Number(item.totalAmount || 0).toFixed(2)}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Paid</div>
                                  <div className="font-bold text-[#84cc16] text-sm">₹{Number(item.paidAmount || 0).toFixed(2)}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Pending</div>
                                  <div className="font-bold text-amber-500 text-sm">₹{Number(item.pendingAmount || 0).toFixed(2)}</div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    );
                  } else if (drawerType === 'collected') {
                    return (
                      <div className="space-y-3">
                        {data.map((item, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{item.studentName}</h4>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                  {item.paymentDate ? new Date(item.paymentDate).toLocaleDateString('en-IN') : '—'}
                                </div>
                              </div>
                              <div className="font-bold text-[#84cc16] text-sm">₹{item.amount.toFixed(2)}</div>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                                  {item.method}
                                </span>
                                <span className="text-slate-500 dark:text-slate-400">
                                  {item.receiptNo}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    );
                  }
                })()}
              </div>

              {/* Footer with Total */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                {(() => {
                  const data = getDrawerData();
                  const total = data.reduce((sum, item) => {
                    if (drawerType === 'total') {
                      return sum + item.totalAmount;
                    } else {
                      return sum + item.amount;
                    }
                  }, 0);

                  return (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                        {drawerType === 'total' ? 'Total Amount' : 'Total Collected'}
                      </span>
                      <span className="text-lg font-black text-slate-900 dark:text-slate-100">
                        ₹{total.toFixed(2)}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Parent Credentials Management Modal */}
      <AnimatePresence>
        {showParentPasswordModal && passwordManageStudent && (() => {
          const parentName = passwordManageStudent.parent_name || passwordManageStudent.parent?.name || 'N/A';
          const parentEmail = passwordManageStudent.parent_email || passwordManageStudent.parent?.email || '';
          const hasEmail = !!parentEmail;
          const parentObj = passwordManageStudent.parent;
          const statusVal = parentObj ? (parentObj.is_active ? 'Active' : 'Inactive') : 'No Account';

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => { if (e.target === e.currentTarget) setShowParentPasswordModal(false); }}
            >
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700/50 w-full max-w-md overflow-hidden"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-105 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/30">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-55 to-purple-65 text-purple-600 flex items-center justify-center shadow-md">
                      <Key className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Parent Password Management</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Manage login credentials for portal access</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowParentPasswordModal(false)}
                    className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-750 dark:hover:text-slate-200 flex items-center justify-center transition-all cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 space-y-4">
                  {/* Account Info Card */}
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                    <div className="font-bold text-[10px] uppercase text-slate-500 tracking-wider mb-1">Parent Account Details</div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Name:</span>
                      <span className="col-span-2 font-bold text-slate-900 dark:text-slate-100">{parentName}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Email:</span>
                      <span className="col-span-2 font-bold text-slate-900 dark:text-slate-100 break-all">
                        {parentEmail || <span className="text-rose-500 italic font-semibold">Parent email not available</span>}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Status:</span>
                      <span className="col-span-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${statusVal === 'Active' ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-955/35 text-red-650'
                          }`}>
                          {statusVal}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* One-Time Temporary Password Display */}
                  {tempPassword && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/15 border-2 border-emerald-500/30 p-3 rounded-xl flex items-center justify-between gap-3 shadow-md shadow-emerald-500/5 animate-pulse">
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">One-Time Temporary Password</div>
                        <div className="text-sm font-mono font-black text-slate-900 dark:text-slate-100 tracking-wider">{tempPassword}</div>
                        <div className="text-[9px] text-emerald-650 dark:text-emerald-500">Copy this password now. It will not be shown again.</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(tempPassword)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${copiedSuccess ? 'bg-emerald-600 text-white shadow-md' : 'bg-white dark:bg-slate-900 text-emerald-750 hover:bg-emerald-50 border border-emerald-300'
                          }`}
                      >
                        {copiedSuccess ? 'Copied! ✅' : '📋 Copy'}
                      </button>
                    </div>
                  )}

                  {/* Action Options */}
                  <div className="space-y-2">
                    <div className="font-bold text-[10px] uppercase text-slate-500 tracking-wider">Manage Actions</div>

                    {/* Reset & Send */}
                    <button
                      type="button"
                      disabled={isResettingParentPassword || !hasEmail}
                      onClick={handleResetAndSendPassword}
                      className="w-full p-3 rounded-xl border border-slate-250 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900/50 text-left transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        🔄
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Reset & Send Password</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Generate a new temporary password and send it to parent's email.</div>
                      </div>
                    </button>

                    {/* Reset Password (Admin View Only) */}
                    <button
                      type="button"
                      disabled={isResettingParentPassword}
                      onClick={handleResetPasswordOnly}
                      className="w-full p-3 rounded-xl border border-slate-250 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900/50 text-left transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-955/20 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        📋
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Reset Password (One-Time View)</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Reset password and show one-time temporary password. No email sent.</div>
                      </div>
                    </button>

                    {/* Send Login Details */}
                    <button
                      type="button"
                      disabled={isResettingParentPassword || !hasEmail}
                      onClick={handleSendLoginDetails}
                      className="w-full p-3 rounded-xl border border-slate-250 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900/50 text-left transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-955/20 text-purple-650 flex items-center justify-center group-hover:scale-105 transition-transform">
                        ✉️
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Send Login Details</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Resend current login email/URL information securely (password hidden).</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-3 border-t border-slate-105 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/30 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowParentPasswordModal(false)}
                    className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Reset Confirmation Dialog */}
      <AnimatePresence>
        {showResetConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-xl p-5 shadow-2xl max-w-sm w-full space-y-4"
            >
              <div className="flex items-center gap-2 text-rose-500">
                <AlertCircle className="w-5 h-5" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Reset parent password?</h4>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                A new temporary password will be generated and sent to the parent's registered email address (<strong>{passwordManageStudent.parent_email || passwordManageStudent.parent?.email}</strong>).
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowResetConfirmation(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmResetAndSend}
                  className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Reset & Send
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline Reactivate Student Plan Modal */}
      <AnimatePresence>
        {showReactivateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6"
            onClick={(e) => { if (e.target === e.currentTarget) setShowReactivateModal(false); }}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700/50 w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#84cc16] to-[#65a30d] flex items-center justify-center shadow-md shadow-[#84cc16]/30">
                    <RefreshCw className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Reactivate Student Plan</h3>
                    {pendingPaymentIntent && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                        ₹{pendingPaymentIntent.amount?.toFixed(2)} pending payment will be applied after reactivation.
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReactivateModal(false)}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-all"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleReactivateSubmit} className="p-5 space-y-4">
                {/* Student name display */}
                {(() => {
                  const sel = students.find(s => (s.id || s.student_id)?.toString() === form.student_id.toString());
                  if (!sel) return null;
                  return (
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#84cc16] to-[#65a30d] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                        {(sel.name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{sel.name}</div>
                        <div className="text-[11px] text-rose-500 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Inactive
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Action Type */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Reactivation Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'continue', label: 'Continue Existing Plan', desc: 'Keep dates, fees & overdue intact', icon: '🔄' },
                      { value: 'new_plan', label: 'Assign New Plan', desc: 'Create a fresh fee cycle', icon: '🆕' }
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setReactivateForm(prev => ({ ...prev, action: opt.value }))}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${reactivateForm.action === opt.value
                            ? 'border-[#84cc16] bg-[#84cc16]/5 dark:bg-[#84cc16]/10'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                      >
                        <div className="text-base mb-1">{opt.icon}</div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{opt.label}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 italic bg-slate-50 dark:bg-slate-900/30 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                    {reactivateForm.action === 'continue'
                      ? "Continue Existing Plan keeps the student's existing fee account and payment history."
                      : "Assign New Plan starts a new fee cycle. Previous payment history remains in the student's records."
                    }
                  </p>
                </div>

                {/* Continue Plan — Plan Start Date */}
                {reactivateForm.action === 'continue' && (() => {
                  const sel = students.find(s => (s.id || s.student_id)?.toString() === form.student_id.toString());
                  const enrollments = sel?.enrollments || [];
                  const latestEnrollment = enrollments[0];
                  if (!latestEnrollment) return <p className="text-xs text-slate-500">No previous enrollment found.</p>;
                  return (
                    <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Previous Plan Details</h4>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-500 block font-semibold">Sport</span>
                          <span className="font-medium">{latestEnrollment.sport?.name || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block font-semibold">Duration Plan</span>
                          <span className="font-medium">{latestEnrollment.duration_plan?.name || '—'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500 block font-semibold mb-1">Plan Start Date</span>
                          <input
                            type="date"
                            className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-[#84cc16]"
                            value={reactivateForm.plan_start_date}
                            onChange={e => setReactivateForm(prev => ({ ...prev, plan_start_date: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Assign New Plan fields */}
                {reactivateForm.action === 'new_plan' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Sport <span className="text-red-500">*</span></label>
                      <select
                        className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] text-xs appearance-none cursor-pointer"
                        value={reactivateForm.sport_id}
                        onChange={e => {
                          const sportId = e.target.value;
                          setReactivateForm(prev => ({ ...prev, sport_id: sportId, batch_id: '' }));
                        }}
                        required
                      >
                        <option value="">Select Sport...</option>
                        {sports.map(s => <option key={s.sport_id} value={s.sport_id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Duration Plan <span className="text-red-500">*</span></label>
                      <select
                        className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] text-xs appearance-none cursor-pointer"
                        value={reactivateForm.duration_plan_id}
                        onChange={e => setReactivateForm(prev => ({ ...prev, duration_plan_id: e.target.value }))}
                        required
                      >
                        <option value="">Select Plan...</option>
                        {durationPlans.map(p => <option key={p.plan_id} value={p.plan_id}>{p.name} (×{p.multiplier})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Batch <span className="text-red-500">*</span></label>
                      <select
                        className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] text-xs appearance-none cursor-pointer"
                        value={reactivateForm.batch_id}
                        onChange={e => setReactivateForm(prev => ({ ...prev, batch_id: e.target.value }))}
                        required
                      >
                        <option value="">Select Batch...</option>
                        {reactivateBatches.map(b => <option key={b.batch_id} value={b.batch_id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Plan Start Date <span className="text-red-500">*</span></label>
                      <input
                        type="date"
                        className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-[#84cc16]"
                        value={reactivateForm.plan_start_date}
                        onChange={e => setReactivateForm(prev => ({ ...prev, plan_start_date: e.target.value }))}
                        required
                      />
                    </div>
                    {/* Fee preview */}
                    {reactivateForm.sport_id && reactivateForm.duration_plan_id && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl space-y-1.5 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Training Fee:</span>
                          <span className="font-bold text-emerald-600">
                            ₹{(
                              (parseFloat(sports.find(s => String(s.sport_id) === String(reactivateForm.sport_id))?.base_fee || 0) *
                                parseFloat(durationPlans.find(p => String(p.plan_id) === String(reactivateForm.duration_plan_id))?.multiplier || 1)) +
                              parseFloat(reactivateForm.registration_fee || 0) +
                              parseFloat(reactivateForm.additional_charges || 0) -
                              parseFloat(reactivateForm.discount || 0)
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Pending payment preview */}
                {pendingPaymentIntent && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3 text-[11px] space-y-1">
                    <div className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5" /> Payment to Apply After Reactivation
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Amount:</span>
                      <span className="font-bold text-amber-600">₹{pendingPaymentIntent.amount?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Method:</span>
                      <span className="font-semibold">{pendingPaymentIntent.method || '—'}</span>
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowReactivateModal(false)}
                      className="flex-1 h-10 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: isReactivating ? 1 : 1.02, y: isReactivating ? 0 : -1 }}
                      whileTap={{ scale: isReactivating ? 1 : 0.98 }}
                      type="submit"
                      disabled={isReactivating}
                      className="flex-1 h-10 bg-gradient-to-r from-[#84cc16] to-[#65a30d] text-white text-xs font-bold rounded-xl shadow-md shadow-[#84cc16]/30 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                    >
                      {isReactivating ? (
                        <><svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Reactivating...</>
                      ) : (
                        <><RefreshCw className="w-3.5 h-3.5" />{pendingPaymentIntent ? (pendingPaymentIntent.receipt_id ? 'Reactivate & Mark Paid' : 'Reactivate & Apply Payment') : 'Reactivate Student'}</>
                      )}
                    </motion.button>
                  </div>
                  {pendingPaymentIntent && pendingPaymentIntent.receipt_id && (
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      type="button"
                      onClick={() => {
                        setShowReactivateModal(false);
                        updateStatus(pendingPaymentIntent, pendingPaymentIntent.receipt_id, 'completed');
                        setPendingPaymentIntent(null);
                      }}
                      className="w-full h-10 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700/80 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                    >
                      <span>💸</span> Mark Paid Only
                    </motion.button>
                  )}
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}