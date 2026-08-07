import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { coachGet, coachPost, coachPatch } from '../../api/client';
import Loader from '../../components/Loader';
import { useCoachBatches } from '../../context/CoachBatchesContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Wallet, Users, Clock, AlertCircle, FileText, Check } from 'lucide-react';

export function CoachFeeCollection({ students = [] }) {
  // --- STATES ---
  const [submissions, setSubmissions] = useState([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Tab Navigation State
  const [activeTab, setActiveTab] = useState('collection'); // 'collection' or 'accounts'

  // Student Accounts States
  const [studentAccountsData, setStudentAccountsData] = useState(null);
  const [loadingStudentAccounts, setLoadingStudentAccounts] = useState(false);
  const [studentAccountsFilter, setStudentAccountsFilter] = useState('all');
  const [studentAccountsSearch, setStudentAccountsSearch] = useState('');
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [selectedBatchId, setSelectedBatchId] = useState('all');
  const [coachBatches, setCoachBatches] = useState([]);

  // Form Field States
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [remarks, setRemarks] = useState('');
  const [proofFile, setProofFile] = useState(null);

  // Fee Summary States
  const [studentFeeData, setStudentFeeData] = useState(null);
  const [loadingFeeData, setLoadingFeeData] = useState(false);

  // Proof Management States
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofFileForReplace, setProofFileForReplace] = useState(null);
  const [replacingPaymentId, setReplacingPaymentId] = useState(null);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const handleProofFileChange = (e, paymentId) => {
    const file = e.target.files[0];
    if (file) {
      setProofFileForReplace(file);
      setReplacingPaymentId(paymentId);
    }
  };

  const handleUploadProof = async (paymentId) => {
    if (!proofFileForReplace) {
      showBanner('Please select a file to upload', 'error');
      return;
    }

    setUploadingProof(true);
    try {
      const formData = new FormData();
      formData.append('proof_file', proofFileForReplace);

      const response = await coachPatch(`/coach/payments/${paymentId}/proof`, formData);

      if (response) {
        showBanner('Proof uploaded successfully!', 'success');
        setProofFileForReplace(null);
        setReplacingPaymentId(null);
        fetchRecentSubmissions();
      }
    } catch (error) {
      console.error('Error uploading proof:', error);
      showBanner('Failed to upload proof', 'error');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleViewProof = (proofUrl) => {
    if (!proofUrl) return;
    const fullUrl = proofUrl.startsWith('http') ? proofUrl : `http://localhost:5000/${proofUrl}`;
    window.open(fullUrl, '_blank');
  };

  // --- SEARCH AND FILTER FUNCTIONS ---
  const getFilteredStudents = () => {
    if (!studentSearchTerm) return students;
    const searchTerm = studentSearchTerm.toLowerCase();
    return students.filter((s) => {
      const name = s?.name || `${s?.first_name || ''} ${s?.last_name || ''}`;
      const parentName = s?.parent_name || s?.parentName || '';
      const parentEmail = s?.parent_email || s?.parentEmail || '';
      const phone = s?.phone || s?.parent_phone || '';
      const studentId = s?.id?.toString() || s?.student_id?.toString() || '';
      const batchName = s?.batch?.name || '';

      return (
        name.toLowerCase().includes(searchTerm) ||
        parentName.toLowerCase().includes(searchTerm) ||
        parentEmail.toLowerCase().includes(searchTerm) ||
        phone.includes(searchTerm) ||
        studentId.includes(searchTerm) ||
        batchName.toLowerCase().includes(searchTerm)
      );
    });
  };

  const handleStudentChange = (selectedId) => {
    if (!selectedId) {
      setSelectedStudentId('');
      setStudentSearchTerm('');
      setStudentFeeData(null);
      setAmount('');
      return;
    }
    const studentObj = students.find((s) => (s.id || s.student_id)?.toString() === selectedId.toString());
    setSelectedStudentId(selectedId);
    if (studentObj) {
      setStudentSearchTerm(studentObj.name || `${studentObj.firstName || ''} ${studentObj.lastName || ''}`);
    }
    setAmount('');
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

  // --- FETCH RECENT SUBMISSIONS ---
  const fetchRecentSubmissions = useCallback(async () => {
    setLoadingTable(true);
    try {
      const response = await coachGet('/coach/payments');
      if (response && response.success) {
        setSubmissions(response.data || []);
      } else if (response && Array.isArray(response)) {
        setSubmissions(response);
      }
    } catch (err) {
      console.error('Error fetching recent submissions:', err);
    } finally {
      setLoadingTable(false);
    }
  }, []);

  // --- FETCH COACH BATCHES ---
  const fetchCoachBatches = useCallback(async () => {
    try {
      const response = await coachGet('/coach/batches');
      if (response && response.success && response.data && response.data.batches) {
        setCoachBatches(response.data.batches);
      } else if (response && Array.isArray(response)) {
        setCoachBatches(response);
      } else if (response && Array.isArray(response?.data)) {
        setCoachBatches(response.data);
      } else {
        setCoachBatches([]);
      }
    } catch (err) {
      console.error('Error fetching coach batches:', err);
      setCoachBatches([]);
    }
  }, []);

  // --- FETCH STUDENT ACCOUNTS DATA ---
  const fetchStudentAccountsData = useCallback(async () => {
    setLoadingStudentAccounts(true);
    try {
      const batchParam = selectedBatchId !== 'all' ? `?batch_id=${selectedBatchId}` : '';
      const url = `/coach/students-fee-summary${batchParam}`;
      const response = await coachGet(url);
      const dataToSet = response?.data || response;
      setStudentAccountsData(dataToSet);
    } catch (error) {
      console.error('[fetchStudentAccountsData] Error:', error);
    } finally {
      setLoadingStudentAccounts(false);
    }
  }, [selectedBatchId]);

  useEffect(() => {
    fetchRecentSubmissions();
    fetchCoachBatches();
  }, [fetchRecentSubmissions, fetchCoachBatches]);

  useEffect(() => {
    if (activeTab === 'accounts' && !studentAccountsData) {
      fetchStudentAccountsData();
    }
  }, [activeTab, studentAccountsData, fetchStudentAccountsData]);

  useEffect(() => {
    if (activeTab === 'accounts') {
      fetchStudentAccountsData();
    }
  }, [selectedBatchId, activeTab, fetchStudentAccountsData]);

  useEffect(() => {
    const fetchStudentFeeData = async () => {
      if (!selectedStudentId) {
        setStudentFeeData(null);
        return;
      }

      setLoadingFeeData(true);
      try {
        const response = await coachGet(`/coach/student-ledger/${selectedStudentId}`);
        const feeData = response.data || response;
        setStudentFeeData(feeData);

        const totalFee = feeData?.total_fees_assigned || 0;
        const totalPaid = feeData?.total_fees_paid || 0;
        const pendingFees = feeData?.pending_fees || 0;

        if (totalPaid === 0 && totalFee > 0) {
          setAmount(totalFee.toString());
        } else if (pendingFees > 0) {
          setAmount(pendingFees.toString());
        } else {
          setAmount('0');
        }
      } catch (error) {
        console.error('Error fetching student fee data:', error);
        setStudentFeeData(null);
        setAmount('');
      } finally {
        setLoadingFeeData(false);
      }
    };

    fetchStudentFeeData();
  }, [selectedStudentId]);

  // --- FORM SUBMISSION ---
  const handleSubmitPayment = async (e) => {
    e.preventDefault();

    if (!selectedStudentId) {
      showBanner('Please select a student.', 'error');
      return;
    }
    if (!amount || amount === '') {
      showBanner('Please enter a valid amount.', 'error');
      return;
    }

    const paymentAmount = parseFloat(amount);

    if (paymentAmount < 0) {
      showBanner('Payment amount cannot be negative.', 'error');
      return;
    }

    if (paymentAmount === 0) {
      showBanner('Payment amount cannot be zero.', 'error');
      return;
    }

    const totalFee = studentFeeData?.total_fees_assigned || 0;
    const totalPaid = studentFeeData?.total_fees_paid || 0;
    const dueAmount = totalFee - totalPaid;

    if (paymentAmount > dueAmount) {
      showBanner('Payment amount cannot exceed the due amount.', 'error');
      return;
    }

    if (dueAmount <= 0) {
      showBanner('Student has no pending fees. No further payments can be accepted.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      let payload;
      
      if (proofFile) {
        payload = new FormData();
        payload.append('student_id', parseInt(selectedStudentId, 10));
        payload.append('amount', parseFloat(amount));
        payload.append('method', paymentMethod.toLowerCase());
        if (remarks) {
          payload.append('remarks', remarks);
        }
        payload.append('proof_file', proofFile);
      } else {
        payload = {
          student_id: parseInt(selectedStudentId, 10),
          amount: parseFloat(amount),
          method: paymentMethod.toLowerCase(),
          remarks: remarks,
        };
      }

      const response = await coachPost('/coach/payments', payload);

      if (response && (response.success || response.id)) {
        showBanner('Payment submitted successfully!', 'success');
        
        setSelectedStudentId('');
        setStudentSearchTerm('');
        setAmount('');
        setRemarks('');
        setPaymentMethod('UPI');
        setProofFile(null);
        setDropdownOpen(false);
        setHighlightedIndex(-1);

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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const totalPages = Math.ceil(submissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSubmissions = submissions.slice(startIndex, endIndex);

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
  }, [submissions.length]);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
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

  return (
    <div className="space-y-6 w-full text-left">
      
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Fee Collection
            </h1>
            <p className="text-muted-foreground mt-1">
              Record student payments and track outstanding fees across your batches.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-border/60 self-end sm:self-auto relative z-10 shrink-0">
          <button
            onClick={() => setActiveTab('collection')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'collection'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Record Payment
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'accounts'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Student Accounts
          </button>
        </div>
      </motion.div>

      {/* Alert Notification Banner */}
      <AnimatePresence>
        {message.text && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 rounded-xl px-6 py-4 shadow-xl border flex items-center gap-3 font-bold ${
              message.type === 'success' 
                ? 'bg-card border-l-4 border-l-emerald-500 text-emerald-500 border-y-border border-r-border' 
                : 'bg-card border-l-4 border-l-rose-500 text-rose-500 border-y-border border-r-border'
            }`}
          >
            <span className="text-xl">{message.type === 'success' ? '💳' : '⚠️'}</span>
            <span className="text-xs">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab === 'collection' ? (
        <div className="grid xl:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: PAYMENT FORM */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="xl:col-span-5 bg-card border border-border rounded-2xl shadow-sm overflow-hidden relative"
          >
            <span className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></span>
            <div className="p-5 border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/10">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                Process New Transaction
              </h3>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-6 space-y-5 bg-card text-left">
              {/* Student Lookup */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Search Student</label>
                <div className="relative">
                  <input
                    type="text"
                    className="input-field text-xs py-2 px-3 w-full"
                    placeholder="Search by name, ID, or batch..."
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
                    <div className="absolute z-50 w-full rounded-xl border border-border bg-card max-h-60 overflow-y-auto mt-1.5 shadow-xl text-left">
                      {(() => {
                        const filteredStudents = getFilteredStudents();
                        if (filteredStudents.length === 0) {
                          return <div className="px-4 py-2.5 text-xs text-muted-foreground font-bold">No students found</div>;
                        }
                        return filteredStudents.map((s, index) => {
                          const studentId = s?.id || s?.student_id;
                          const name = s?.name || `${s?.first_name || ''} ${s?.last_name || ''}`;
                          const isHighlighted = index === highlightedIndex;
                          return (
                            <div
                              key={studentId}
                              className={`cursor-pointer px-4 py-2.5 text-xs transition-colors duration-150 border-b border-border/40 last:border-0 flex items-center gap-3 ${
                                isHighlighted ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-foreground font-medium'
                              }`}
                              onMouseDown={() => {
                                setStudentSearchTerm(name);
                                setDropdownOpen(false);
                                setHighlightedIndex(-1);
                                handleStudentChange(studentId);
                              }}
                              onMouseEnter={() => setHighlightedIndex(index)}
                            >
                              <div className="flex-1 min-w-0 text-left">
                                <div className="font-bold text-xs">{name}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                  Batch: {s?.batch?.name || '—'} • Parent: {s?.parent_name || '—'}
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Fee Summary */}
              <AnimatePresence mode="wait">
                {selectedStudentId && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 pt-1">
                      {loadingFeeData ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="w-5 h-5 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                        </div>
                      ) : studentFeeData ? (
                        <div className="grid grid-cols-2 gap-2.5 text-left">
                          <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-3 border border-border">
                            <p className="text-[9px] font-black uppercase text-muted-foreground">Total Fee</p>
                            <p className="text-sm font-black text-foreground mt-0.5">₹{studentFeeData.total_fees_assigned?.toFixed(2) || '0.00'}</p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-3 border border-border">
                            <p className="text-[9px] font-black uppercase text-muted-foreground">Paid</p>
                            <p className="text-sm font-black text-emerald-600">₹{studentFeeData.total_fees_paid?.toFixed(2) || '0.00'}</p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-3 border border-border">
                            <p className="text-[9px] font-black uppercase text-muted-foreground">Pending</p>
                            <p className="text-sm font-black text-amber-600">₹{studentFeeData.pending_fees?.toFixed(2) || '0.00'}</p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-3 border border-border">
                            <p className="text-[9px] font-black uppercase text-muted-foreground">Overdue</p>
                            <p className="text-sm font-black text-rose-600">₹{studentFeeData.overdue_fees?.toFixed(2) || '0.00'}</p>
                          </div>
                          
                          {(studentFeeData.balance_outstanding > 0) && (
                            <div className="col-span-2 bg-rose-500/5 border border-rose-500/20 rounded-xl p-3 flex justify-between items-center mt-1 text-xs font-bold">
                              <span className="text-rose-600 uppercase text-[9px] font-black">Total Due Amount</span>
                              <span className="text-rose-600 text-base font-black">₹{studentFeeData.balance_outstanding?.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-center text-xs py-4 font-bold border border-dashed border-border rounded-xl">No fee data found.</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Amount */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Collection Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-foreground font-black">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input-field pl-7 py-2.5 text-sm font-black"
                    placeholder="0.00"
                    value={amount}
                    disabled={!selectedStudentId}
                    onChange={(e) => {
                      const val = e.target.value;
                      const numVal = parseFloat(val);
                      if (numVal < 0) setAmount('0');
                      else setAmount(val);
                    }}
                    required
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Payment Method</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {['Cash', 'UPI', 'Online', 'Cheque'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                        paymentMethod === method
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                          : 'bg-card text-foreground border-border hover:border-emerald-450'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Attachment Proof */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Receipt Attachment</label>
                <div className="relative border border-dashed border-border hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-900/10 rounded-xl p-3.5 text-center cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                  />
                  <span className="text-[11px] font-bold text-muted-foreground">📸 Upload transaction receipt</span>
                </div>
                {proofFile && (
                  <div className="mt-2 text-[10px] font-bold text-emerald-500 bg-emerald-500/5 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg truncate">
                    {proofFile.name}
                  </div>
                )}
              </div>

              {/* Remarks */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Remarks / Notes</label>
                <textarea
                  className="input-field text-xs py-2 px-3 bg-card resize-none"
                  rows={2}
                  placeholder="Reference number or notes..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={submitting || ((studentFeeData?.total_fees_assigned || 0) - (studentFeeData?.total_fees_paid || 0)) <= 0}
                className="btn btn-primary w-full py-3.5 text-xs uppercase tracking-wider font-black flex justify-center items-center gap-1.5"
              >
                {submitting ? 'Submitting...' : 'Submit Payment'}
              </button>
            </form>
          </motion.div>

          {/* RIGHT COLUMN: RECENT SUBMISSIONS LOG */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="xl:col-span-7 bg-card border border-border rounded-2xl shadow-sm overflow-hidden relative"
          >
            <span className="absolute top-0 left-0 w-full h-1 bg-blue-500"></span>
            <div className="p-5 border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/10">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                Live Submissions Log
              </h3>
            </div>

            <div className="p-0 min-h-[400px]">
              {loadingTable && submissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-xs font-bold text-muted-foreground">
                  <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-3"></div>
                  Syncing transactions...
                </div>
              ) : submissions.length > 0 ? (
                <>
                  <div className="overflow-x-auto min-h-[350px]">
                    <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                      <thead>
                        <tr className="border-b border-border/60 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
                          <th className="p-4">Student</th>
                          <th className="p-4">Amount</th>
                          <th className="p-4">Method</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 font-bold">
                        {paginatedSubmissions.map((sub, index) => (
                          <tr key={sub.id || index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                            <td className="p-4 text-foreground text-xs">
                              {sub.student_name || sub.Student?.name || 'Walk-in'}
                            </td>
                            <td className="p-4 text-foreground text-xs">
                              ₹{parseFloat(sub.amount || 0).toFixed(2)}
                            </td>
                            <td className="p-4">
                              <span className="bg-slate-100 dark:bg-slate-800 border border-border px-2 py-0.5 rounded text-[10px] font-bold text-muted-foreground">
                                {sub.method || 'UPI'}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase ${
                                sub.status === 'APPROVED' || sub.status === 'SUCCESS' || sub.status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              }`}>
                                {sub.status || 'PENDING'}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex flex-col items-end gap-1">
                                {sub.proof_url ? (
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => handleViewProof(sub.proof_url)}
                                      className="btn btn-secondary text-[9px] py-1 px-2.5"
                                    >
                                      View
                                    </button>
                                    <button
                                      onClick={() => {
                                        setReplacingPaymentId(sub.id);
                                        document.getElementById(`proof-input-${sub.id}`).click();
                                      }}
                                      className="btn btn-secondary text-[9px] py-1 px-2"
                                    >
                                      Replace
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setReplacingPaymentId(sub.id);
                                      document.getElementById(`proof-input-${sub.id}`).click();
                                    }}
                                    className="btn btn-secondary text-[9px] py-1 px-2.5"
                                  >
                                    Upload Proof
                                  </button>
                                )}
                                <input
                                  id={`proof-input-${sub.id}`}
                                  type="file"
                                  accept="image/*,.pdf"
                                  className="hidden"
                                  onChange={(e) => handleProofFileChange(e, sub.id)}
                                />
                                {replacingPaymentId === sub.id && proofFileForReplace && (
                                  <div className="flex gap-1.5 items-center mt-1 bg-card p-1 rounded border border-border">
                                    <span className="text-[8px] text-muted-foreground truncate max-w-[80px]">
                                      {proofFileForReplace.name}
                                    </span>
                                    <button
                                      onClick={() => handleUploadProof(sub.id)}
                                      disabled={uploadingProof}
                                      className="btn btn-primary text-[8px] py-0.5 px-1.5"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => {
                                        setProofFileForReplace(null);
                                        setReplacingPaymentId(null);
                                      }}
                                      className="text-muted-foreground text-xs p-0.5"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-border/60 bg-slate-50/50 dark:bg-slate-900/10">
                      <div className="text-xs text-muted-foreground font-bold">
                        Showing {startIndex + 1} to {Math.min(endIndex, submissions.length)} of {submissions.length} records
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="btn btn-secondary py-1 px-2.5 text-xs disabled:opacity-50"
                        >
                          Prev
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="btn btn-secondary py-1 px-2.5 text-xs disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16 px-4 bg-slate-50/30 dark:bg-slate-900/10">
                  <span className="text-4xl opacity-40 mb-3 block">📭</span>
                  <p className="text-muted-foreground text-sm font-semibold">No recent fee submissions found.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      ) : (
        <>
          {/* STUDENT ACCOUNTS LAYOUT */}
          {studentAccountsData?.summary && (
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-5 text-left">
              {[
                { label: 'Total Students', value: studentAccountsData.summary.total_students, color: 'text-foreground', theme: 'border-blue-500/20' },
                { label: 'Fully Paid', value: studentAccountsData.summary.fully_paid, color: 'text-emerald-600', theme: 'border-emerald-500/20' },
                { label: 'Partially Paid', value: studentAccountsData.summary.partially_paid, color: 'text-amber-600', theme: 'border-amber-500/20' },
                { label: 'Unpaid', value: studentAccountsData.summary.unpaid, color: 'text-rose-600', theme: 'border-rose-500/20' },
                { label: 'Outstanding Dues', value: `₹${studentAccountsData.summary.total_outstanding.toFixed(2)}`, color: 'text-rose-600', theme: 'border-rose-500/25' }
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className={`bg-card border ${stat.theme} rounded-2xl p-4 flex flex-col justify-between shadow-sm`}
                >
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                  <h3 className={`text-xl font-black mt-3 truncate ${stat.color}`}>{stat.value}</h3>
                </motion.div>
              ))}
            </div>
          )}

          {/* Student Accounts list table */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden text-left mt-6">
            <div className="p-5 border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-foreground">Athletes Accounts Directory</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-bold uppercase tracking-wider">Sync payments ledger by active filter queries</p>
              </div>
              
              {/* Batch Filter selectors */}
              <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-border/60">
                <button
                  onClick={() => setSelectedBatchId('all')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                    selectedBatchId === 'all'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All Batches
                </button>
                {(Array.isArray(coachBatches) ? coachBatches : []).map((batch) => (
                  <button
                    key={batch.batch_id}
                    onClick={() => setSelectedBatchId(batch.batch_id.toString())}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                      selectedBatchId === batch.batch_id.toString()
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {batch.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Status Sub-filters */}
            <div className="px-5 py-3 border-b border-border/40 bg-card flex flex-wrap gap-1.5">
              <button
                onClick={() => setStudentAccountsFilter('all')}
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all ${
                  studentAccountsFilter === 'all' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All ({studentAccountsData?.students?.length || 0})
              </button>
              <button
                onClick={() => setStudentAccountsFilter('paid')}
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all ${
                  studentAccountsFilter === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Paid ({studentAccountsData?.students?.filter(s => s.fee_status === 'paid').length || 0})
              </button>
              <button
                onClick={() => setStudentAccountsFilter('unpaid')}
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all ${
                  studentAccountsFilter === 'unpaid' ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Unpaid ({studentAccountsData?.students?.filter(s => s.fee_status === 'unpaid').length || 0})
              </button>
            </div>

            {/* Search and Sorting */}
            <div className="p-5 flex flex-col sm:flex-row gap-3 border-b border-border/40 bg-card">
              <input
                type="text"
                placeholder="Search student accounts..."
                value={studentAccountsSearch}
                onChange={(e) => setStudentAccountsSearch(e.target.value)}
                className="input-field flex-1 text-xs py-2 px-3 bg-card"
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input-field w-full sm:w-48 text-xs py-2 px-3 bg-card"
              >
                <option value="name">Sort by Name</option>
                <option value="highest_due">Highest Due</option>
                <option value="highest_paid">Highest Paid</option>
                <option value="recently_paid">Recently Paid</option>
              </select>
            </div>

            {/* Table */}
            {loadingStudentAccounts ? (
              <div className="py-20 text-center text-xs font-bold text-muted-foreground">
                Loading accounts ledger...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse whitespace-nowrap text-xs">
                  <thead>
                    <tr className="border-b border-border/60 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-4">Student</th>
                      <th className="px-5 py-4">Parent</th>
                      <th className="px-5 py-4">Batch</th>
                      <th className="px-5 py-4">Progress</th>
                      <th className="px-5 py-4">Amount</th>
                      <th className="px-5 py-4">Paid</th>
                      <th className="px-5 py-4">Due</th>
                      <th className="px-5 py-4">Last Paid</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-bold">
                    {(() => {
                      const studentsList = studentAccountsData?.students || [];
                      const filteredStudents = studentsList.filter((student) => {
                        const feeStatus = student.fee_status || 'unpaid';
                        if (studentAccountsFilter === 'paid' && feeStatus !== 'paid') return false;
                        if (studentAccountsFilter === 'unpaid' && feeStatus !== 'unpaid') return false;
                        
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
                            <td colSpan="10" className="px-5 py-12 text-center text-muted-foreground font-bold">
                              No students accounts found
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
                        const isOverdue = dueAmount > 0 && lastPaidDate && new Date(lastPaidDate) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                        
                        return (
                          <React.Fragment key={student.student_id || index}>
                            <tr className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors ${isOverdue ? 'bg-rose-500/5' : ''}`}>
                              <td className="px-5 py-4">
                                <div className="text-foreground text-xs">{student.name || '—'}</div>
                                <div className="text-[10px] text-muted-foreground font-semibold mt-0.5">{student.phone || '—'}</div>
                              </td>
                              <td className="px-5 py-4 text-xs text-foreground">{student.parent_name || '—'}</td>
                              <td className="px-5 py-4 text-xs text-muted-foreground">{student.batch_names || '—'}</td>
                              <td className="px-5 py-4 min-w-[120px]">
                                <div className="w-full">
                                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                      style={{ width: `${paymentProgress}%` }}
                                      className={`h-full ${paymentProgress === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-xs text-foreground">₹{parseFloat(totalAmount || 0).toFixed(2)}</td>
                              <td className="px-5 py-4 text-xs text-emerald-600">₹{parseFloat(paidAmount || 0).toFixed(2)}</td>
                              <td className="px-5 py-4 text-xs text-amber-600 font-black">₹{parseFloat(dueAmount || 0).toFixed(2)}</td>
                              <td className="px-5 py-4 text-xs text-muted-foreground">{formatDate(lastPaidDate)}</td>
                              <td className="px-5 py-4">
                                <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase ${
                                  feeStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                }`}>
                                  {feeStatus}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <button
                                  type="button"
                                  onClick={() => toggleStudentExpansion(student.student_id)}
                                  className="btn btn-secondary py-1 px-2.5 text-[10px]"
                                >
                                  {isExpanded ? 'Hide' : 'History'}
                                </button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan="10" className="px-5 py-4 bg-slate-50/50 dark:bg-slate-900/10">
                                  <div className="space-y-2 p-2">
                                    <h4 className="font-black text-foreground text-xs">Payment Receipts History</h4>
                                    {student.receipts && student.receipts.length > 0 ? (
                                      <div className="space-y-1.5">
                                        {student.receipts.map((receipt, idx) => (
                                          <div key={idx} className="flex items-center justify-between text-xs bg-card p-2.5 rounded border border-border shadow-sm">
                                            <div>
                                              <span className="font-extrabold text-foreground">₹{parseFloat(receipt.amount).toFixed(2)}</span>
                                              <span className="text-muted-foreground ml-2 text-[10px]">{formatDate(receipt.payment_date)}</span>
                                            </div>
                                            <span className="bg-slate-100 dark:bg-slate-800 text-[10px] px-2 py-0.5 rounded text-muted-foreground uppercase">{receipt.method || '—'}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-muted-foreground text-xs font-semibold italic">No historical receipts found for this student accounts record.</p>
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
    </div>
  );
}

export default function CoachFeesPage() {
  const { allStudents, loading } = useCoachBatches();

  if (loading) {
    return (
      <div className="p-2 space-y-6">
        <div className="bg-card border border-border rounded-2xl p-4 flex justify-between items-center shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-muted" />
            <div className="space-y-2">
              <div className="h-5 w-40 bg-muted rounded" />
              <div className="h-3 w-28 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-transparent font-sans p-2 space-y-6">
      <CoachFeeCollection students={allStudents} />
    </div>
  );
}