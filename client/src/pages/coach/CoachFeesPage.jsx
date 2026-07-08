import { useState, useEffect, useCallback } from 'react';
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

  useEffect(() => {
    fetchRecentSubmissions();
  }, [fetchRecentSubmissions]);

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

  return (
    <div className="space-y-8 w-full max-w-7xl mx-auto">
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
        <div className="pb-8 pl-4 lg:pl-0">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Fee Collection
          </h1>
          <p className="text-muted-foreground mt-2 text-sm font-medium">
            Process on-ground payments and sync digital receipts.
          </p>
        </div>

        <CoachFeeCollection students={allStudents} />
      </motion.div>
    </div>
  );
}