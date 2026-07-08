import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { coachGet, coachPost, coachPatch } from '../../api/client';
import Loader from '../../components/Loader';
import { useCoachBatches } from '../../context/CoachBatchesContext';
import { motion, AnimatePresence } from 'framer-motion';

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

  const handleStudentChange = (selectedId) => {
    if (!selectedId) {
      setSelectedStudentId('');
      setStudentSearchTerm('');
      setStudentFeeData(null);
      return;
    }
    const studentObj = students.find((s) => (s.id || s.student_id)?.toString() === selectedId.toString());
    setSelectedStudentId(selectedId);
    if (studentObj) {
      setStudentSearchTerm(studentObj.name || `${studentObj.firstName || ''} ${studentObj.lastName || ''}`);
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
      console.log('[fetchCoachBatches] Response:', response);
      console.log('[fetchCoachBatches] Type:', typeof response);
      console.log('[fetchCoachBatches] Is Array:', Array.isArray(response));
      console.log('[fetchCoachBatches] response.data:', response?.data);
      console.log('[fetchCoachBatches] response.data is Array:', Array.isArray(response?.data));
      console.log('[fetchCoachBatches] response.data.batches:', response?.data?.batches);
      console.log('[fetchCoachBatches] response.data.batches is Array:', Array.isArray(response?.data?.batches));
      
      // Backend returns { success: true, data: { coach_context: {...}, batches: [...] } }
      if (response && response.success && response.data && response.data.batches) {
        setCoachBatches(response.data.batches);
      } else if (response && Array.isArray(response)) {
        setCoachBatches(response);
      } else if (response && Array.isArray(response?.data)) {
        setCoachBatches(response.data);
      } else {
        console.log('[fetchCoachBatches] Unexpected response shape, setting empty array');
        setCoachBatches([]);
      }
    } catch (err) {
      console.error('Error fetching coach batches:', err);
      setCoachBatches([]);
    }
  }, []);

  // --- FETCH STUDENT ACCOUNTS DATA ---
  const fetchStudentAccountsData = useCallback(async () => {
    console.log('[fetchStudentAccountsData] === START ===');
    console.log('[fetchStudentAccountsData] selectedBatchId:', selectedBatchId);
    setLoadingStudentAccounts(true);
    try {
      const batchParam = selectedBatchId !== 'all' ? `?batch_id=${selectedBatchId}` : '';
      const url = `/coach/students-fee-summary${batchParam}`;
      console.log('[fetchStudentAccountsData] Request URL:', url);
      
      const response = await coachGet(url);
      console.log('[fetchStudentAccountsData] Full API Response:', response);
      console.log('[fetchStudentAccountsData] Response type:', typeof response);
      console.log('[fetchStudentAccountsData] Response.success:', response?.success);
      console.log('[fetchStudentAccountsData] Response.data:', response?.data);
      console.log('[fetchStudentAccountsData] Response.data.students:', response?.data?.students);
      console.log('[fetchStudentAccountsData] Response.data.summary:', response?.data?.summary);
      console.log('[fetchStudentAccountsData] Array.isArray(response.data.students):', Array.isArray(response?.data?.students));
      
      const dataToSet = response?.data || response;
      console.log('[fetchStudentAccountsData] Data to set to state:', dataToSet);
      console.log('[fetchStudentAccountsData] Setting studentAccountsData state...');
      setStudentAccountsData(dataToSet);
      console.log('[fetchStudentAccountsData] State updated');
    } catch (error) {
      console.error('[fetchStudentAccountsData] Error:', error);
      console.error('[fetchStudentAccountsData] Error message:', error.message);
      console.error('[fetchStudentAccountsData] Error status:', error.status);
    } finally {
      console.log('[fetchStudentAccountsData] Setting loadingStudentAccounts to false');
      setLoadingStudentAccounts(false);
      console.log('[fetchStudentAccountsData] === END ===');
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
        setStudentFeeData(response.data || response);
      } catch (error) {
        console.error('Error fetching student fee data:', error);
        setStudentFeeData(null);
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
    if (!amount || parseFloat(amount) <= 0) {
      showBanner('Please enter a valid amount.', 'error');
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

  // Framer Motion Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  // --- PAGINATION LOGIC ---
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

  // Reset to page 1 when submissions change
  useEffect(() => {
    setCurrentPage(1);
  }, [submissions.length]);

  // --- HELPER FUNCTIONS ---
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
    <div className="space-y-8 w-full max-w-7xl mx-auto">
      {/* Page Header with Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Fee Collection</h2>
          <p className="text-base text-muted-foreground mt-1">Record payments and track student fee status</p>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-2 bg-surface rounded-lg p-1 border border-border">
          <button
            onClick={() => setActiveTab('collection')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
              activeTab === 'collection'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Record Payment
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
              activeTab === 'accounts'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Student Accounts
          </button>
        </div>
      </div>

      {/* Alert Notification Banner */}
      <AnimatePresence>
        {message.text && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 rounded-xl px-6 py-4 shadow-xl border flex items-center gap-3 font-bold ${
              message.type === 'success' 
                ? 'bg-white dark:bg-card border-l-4 border-l-emerald-500 text-emerald-600 dark:text-emerald-400 border-y-border border-r-border' 
                : 'bg-white dark:bg-card border-l-4 border-l-red-500 text-red-600 dark:text-red-400 border-y-border border-r-border'
            }`}
          >
            <span className="text-xl">{message.type === 'success' ? '💳' : '⚠️'}</span>
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab === 'collection' ? (
        <>
          <div className="grid xl:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: FEE COLLECTION INPUT FORM CARD */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="xl:col-span-5 bg-card border border-border rounded-2xl shadow-sm overflow-hidden relative group hover:shadow-md transition-shadow"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
            <div className="p-6 border-b border-border/50 bg-surface/30">
              <h3 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
                <span className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 w-8 h-8 rounded-lg flex items-center justify-center text-sm">₹</span>
                Record Payment
              </h3>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-6 space-y-6 bg-background/30">
            
            {/* 1. Student Search Input */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">Search Student *</label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full bg-surface border border-border rounded-xl p-3.5 text-sm font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="Search by name, mobile, ID, or batch..."
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
                        const studentId = s?.id || s?.student_id;
                        const name = s?.name || `${s?.firstName || ''} ${s?.lastName || ''}`;
                        const parentName = s?.parent_name || s?.parentName || '—';
                        const mobile = s?.phone || s?.parent_phone || s?.mobile || '—';
                        const isHighlighted = index === highlightedIndex;
                        return (
                          <div
                            key={studentId}
                            className={`cursor-pointer px-4 py-3 text-sm transition-colors duration-150 border-b border-border/50 last:border-b-0 ${
                              isHighlighted ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-foreground'
                            }`}
                            onMouseDown={() => {
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
            </div>

            {/* Fee Summary Panel (Inspired by first screenshot) */}
            <AnimatePresence mode="wait">
              {selectedStudentId && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 pt-2">
                    {loadingFeeData ? (
                      <div className="flex items-center justify-center py-6">
                        <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                      </div>
                    ) : studentFeeData ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-surface rounded-xl p-3.5 border border-border shadow-sm border-t-2 border-t-blue-500">
                          <p className="text-[10px] font-extrabold uppercase text-muted-foreground mb-1">Total Fee</p>
                          <p className="text-lg font-black text-foreground">₹{studentFeeData.total_fees_assigned?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div className="bg-surface rounded-xl p-3.5 border border-border shadow-sm border-t-2 border-t-emerald-500">
                          <p className="text-[10px] font-extrabold uppercase text-muted-foreground mb-1">Paid</p>
                          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">₹{studentFeeData.total_fees_paid?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div className="bg-surface rounded-xl p-3.5 border border-border shadow-sm border-t-2 border-t-amber-500">
                          <p className="text-[10px] font-extrabold uppercase text-muted-foreground mb-1">Pending</p>
                          <p className="text-lg font-black text-amber-600 dark:text-amber-500">₹{studentFeeData.pending_fees?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div className="bg-surface rounded-xl p-3.5 border border-border shadow-sm border-t-2 border-t-red-500">
                          <p className="text-[10px] font-extrabold uppercase text-muted-foreground mb-1">Overdue</p>
                          <p className="text-lg font-black text-red-600 dark:text-red-500">₹{studentFeeData.overdue_fees?.toFixed(2) || '0.00'}</p>
                        </div>
                        
                        {(studentFeeData.balance_outstanding > 0) && (
                          <div className="col-span-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-3 flex justify-between items-center mt-1">
                            <span className="text-red-800 dark:text-red-400 text-xs font-bold uppercase tracking-wider">Total Due</span>
                            <span className="text-red-600 dark:text-red-400 text-xl font-black">₹{studentFeeData.balance_outstanding?.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-center text-xs py-4 italic border border-dashed border-border rounded-xl">No fee data mapped for this student.</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 2. Amount Input */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">Collection Amount *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground font-black">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full bg-surface border border-border rounded-xl py-3.5 pl-8 pr-4 text-base font-black focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:font-medium placeholder:text-muted-foreground/50"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* 3. Custom Designed Payment Method Selectors */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">Payment Method *</label>
              <div className="grid grid-cols-2 gap-3">
                {['Cash', 'UPI', 'Online', 'Cheque'].map((method) => (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-3 px-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border ${
                      paymentMethod === method
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)]'
                        : 'bg-surface text-foreground border-border hover:border-emerald-300 shadow-sm'
                    }`}
                  >
                    {method === 'Cash' && '💵'}
                    {method === 'UPI' && '📲'}
                    {method === 'Online' && '🌐'}
                    {method === 'Cheque' && '📝'}
                    {method}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* 4. Receipt Photo / Screenshot Upload */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                Attach Proof (Optional)
              </label>
              <div className="relative w-full border-2 border-dashed border-border hover:border-emerald-400 bg-surface rounded-xl p-4 transition-colors text-center cursor-pointer">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                />
                <div className="flex flex-col items-center justify-center gap-1">
                  <span className="text-xl">📸</span>
                  <span className="text-xs font-semibold text-foreground">Tap to upload receipt</span>
                </div>
              </div>
              {proofFile && (
                <div className="mt-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-3 py-2 rounded-lg flex items-center gap-2">
                  <span>✓</span> {proofFile.name}
                </div>
              )}
            </div>

            {/* 5. Remarks Text Area */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">Remarks (Optional)</label>
              <textarea
                className="w-full bg-surface border border-border rounded-xl p-3.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all resize-none placeholder:text-muted-foreground/50"
                rows={2}
                placeholder="Internal notes or transaction ID..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            {/* Submit Trigger */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm py-4 rounded-xl shadow-[0_4px_15px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {submitting ? (
                 <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Submitting...</>
              ) : 'Submit Payment'}
            </motion.button>
          </form>
        </motion.div>

        {/* RIGHT COLUMN: LIVE RECENT SUBMISSIONS TABLE CARD */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="xl:col-span-7 bg-card border border-border rounded-2xl shadow-sm overflow-hidden relative group hover:shadow-md transition-shadow"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
          <div className="p-6 border-b border-border/50 bg-surface/30 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
                <span className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 w-8 h-8 rounded-lg flex items-center justify-center text-sm">📋</span>
                Live Submissions
              </h3>
              <p className="text-xs font-semibold text-muted-foreground mt-1">Track status of fees collected today.</p>
            </div>
          </div>

          <div className="p-0 min-h-[400px]">
            {loadingTable && submissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-sm font-semibold text-muted-foreground">
                <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                Syncing ledger...
              </div>
            ) : submissions.length > 0 ? (
              <>
                <div className="overflow-x-auto custom-scrollbar min-h-[350px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-secondary/50 border-b border-border text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                        <th className="p-4">Student</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4">Method</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <motion.tbody variants={containerVariants} initial="hidden" animate="show">
                      {paginatedSubmissions.map((sub, index) => (
                        <motion.tr variants={itemVariants} key={sub.id || index} className="border-b border-border/50 hover:bg-surface-secondary/40 transition-colors">
                          <td className="p-4 font-bold text-foreground text-sm">
                            {sub.student_name || sub.Student?.name || 'Walk-in / General'}
                          </td>
                          <td className="p-4 font-black text-foreground">
                            ₹{parseFloat(sub.amount || 0).toFixed(2)}
                          </td>
                          <td className="p-4">
                            <span className="bg-surface border border-border text-foreground/80 px-2.5 py-1 rounded-md text-[11px] font-bold">
                              {sub.method || 'UPI'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase border ${
                              sub.status === 'APPROVED' || sub.status === 'SUCCESS' || sub.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                                : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                            }`}>
                              {sub.status || 'PENDING'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex flex-col items-end gap-1.5">
                              {sub.proof_url ? (
                                <div className="flex gap-2">
                                  <motion.button
                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    onClick={() => handleViewProof(sub.proof_url)}
                                    className="text-[11px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 px-3 py-1.5 rounded-md hover:bg-blue-100 transition-colors"
                                  >
                                    View
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                      setReplacingPaymentId(sub.id);
                                      document.getElementById(`proof-input-${sub.id}`).click();
                                    }}
                                    className="text-[11px] font-bold bg-surface border border-border text-muted-foreground px-3 py-1.5 rounded-md hover:text-foreground transition-colors"
                                  >
                                    Replace
                                  </motion.button>
                                </div>
                              ) : (
                                <motion.button
                                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                  onClick={() => {
                                    setReplacingPaymentId(sub.id);
                                    document.getElementById(`proof-input-${sub.id}`).click();
                                  }}
                                  className="text-[11px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-3 py-1.5 rounded-md hover:bg-emerald-100 transition-colors"
                                >
                                  Upload Proof
                                </motion.button>
                              )}
                              <input
                                id={`proof-input-${sub.id}`}
                                type="file"
                                accept="image/*,.pdf"
                                className="hidden"
                                onChange={(e) => handleProofFileChange(e, sub.id)}
                              />
                              {replacingPaymentId === sub.id && proofFileForReplace && (
                                <div className="flex gap-2 items-center mt-1 bg-surface p-1.5 rounded-lg border border-border">
                                  <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[80px]">
                                    {proofFileForReplace.name}
                                  </span>
                                  <motion.button
                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    onClick={() => handleUploadProof(sub.id)}
                                    disabled={uploadingProof}
                                    className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-1 rounded shadow-sm disabled:opacity-50"
                                  >
                                    {uploadingProof ? '...' : 'Save'}
                                  </motion.button>
                                  <button
                                    onClick={() => {
                                      setProofFileForReplace(null);
                                      setReplacingPaymentId(null);
                                    }}
                                    className="text-muted-foreground hover:text-foreground p-0.5"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </motion.tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface/30">
                    <div className="text-xs text-muted-foreground">
                      Showing {startIndex + 1} to {Math.min(endIndex, submissions.length)} of {submissions.length} records
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-surface hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      {getPageNumbers().map((page, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => typeof page === 'number' && setCurrentPage(page)}
                          disabled={page === '...'}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                            page === currentPage
                              ? 'bg-emerald-500 text-white border-emerald-500'
                              : page === '...'
                              ? 'bg-transparent text-muted-foreground border-transparent cursor-default'
                              : 'bg-surface border-border hover:bg-surface-secondary'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-surface hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16 px-4 bg-surface-secondary/20">
                <span className="text-4xl opacity-40 mb-3 block">📭</span>
                <p className="text-muted-foreground text-sm font-semibold">No recent fee submissions found.</p>
                <p className="text-muted-foreground text-xs mt-1">Payments recorded today will appear here.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
      </>
      ) : (
        <>
          {/* STUDENT ACCOUNTS SECTION */}
          {/* Dashboard Summary Cards */}
          {studentAccountsData?.summary && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
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
                <p className="text-sm text-muted-foreground mt-1">View fee status for students in your batches</p>
              </div>
              
              {/* Batch Filter */}
              <div className="flex gap-2 bg-surface rounded-lg p-1 border border-border">
                <button
                  onClick={() => setSelectedBatchId('all')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    selectedBatchId === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All Batches ({studentAccountsData?.students?.length || 0})
                </button>
                {(Array.isArray(coachBatches) ? coachBatches : []).map((batch) => (
                  <button
                    key={batch.batch_id}
                    onClick={() => setSelectedBatchId(batch.batch_id.toString())}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                      selectedBatchId === batch.batch_id.toString()
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {batch.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Toggle */}
            <div className="flex gap-2 bg-surface rounded-lg p-1 border border-border mb-4">
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
                      <th className="px-5 py-4 border-b border-border">Batch</th>
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
                            <td colSpan="10" className="px-5 py-8 text-center text-muted-foreground font-medium italic">
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
                        
                        // Check if student is overdue
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
                              <td className="px-5 py-4 text-sm text-muted-foreground">
                                {student.batch_names || '—'}
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
                                  onClick={() => toggleStudentExpansion(student.student_id)}
                                  className="btn btn-secondary btn-sm inline-flex"
                                >
                                  {isExpanded ? 'Hide' : 'History'}
                                </button>
                              </td>
                            </motion.tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan="10" className="px-5 py-4 bg-secondary/30">
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
    </div>
  );
}

export default function CoachFeesPage() {
  const { allStudents, loading } = useCoachBatches();

  if (loading) {
    return <Loader message="Loading student directory..." />;
  }

  return (
    <div className="relative min-h-full w-full">
      {/* Background SVG - Similar to previous pages for consistency */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-[0.04] dark:opacity-[0.03]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="sports-icons" width="200" height="200" patternUnits="userSpaceOnUse" patternTransform="rotate(-15)">
              <g transform="translate(20, 20) scale(1.2)"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M12 7l-3 4h6z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M12 7V2m-3 9l-4 3m10-3l4 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></g>
              <g transform="translate(120, 40) scale(1.2)"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M12 2v20M2 12h20M4.93 4.93c3.9 3.9 3.9 10.24 0 14.14M19.07 4.93c-3.9 3.9-3.9 10.24 0 14.14" fill="none" stroke="currentColor" strokeWidth="1.5" /></g>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#sports-icons)" />
        </svg>
      </div>

      <motion.div 
        className="relative z-10 w-full overflow-x-hidden bg-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header Section */}
        {/* <div className="pb-8 pl-4 lg:pl-0">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Fee Collection
          </h1>
          <p className="text-muted-foreground mt-2 text-sm font-medium">
            Process on-ground payments and sync digital receipts.
          </p>
        </div> */}

        <CoachFeeCollection students={allStudents} />
      </motion.div>
    </div>
  );
}