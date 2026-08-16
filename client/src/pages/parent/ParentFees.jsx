import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { CheckCircle, Wallet, Clock, AlertCircle, FileText, Check, UploadCloud, Receipt, X, Printer, IndianRupee, CreditCard, User, Calendar, Trophy } from 'lucide-react';
import Loader from '../../components/Loader';
import { parentGet, parentPatch, parentPost } from '../../api/client';
import { useActiveStudent } from '../../context/ActiveStudentContext';

export default function ParentFees() {
  const location = useLocation();
  const { activeStudent, students, switchStudent, loading: studentLoading, reloadStudents } = useActiveStudent();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [transactionNumber, setTransactionNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofFileForReplace, setProofFileForReplace] = useState(null);
  const [replacingPaymentId, setReplacingPaymentId] = useState(null);
  const [transactionError, setTransactionError] = useState('');
  const [modalReceipt, setModalReceipt] = useState(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [showReceiptsModal, setShowReceiptsModal] = useState(false);

  // Auto-open receipts modal from notification redirect
  useEffect(() => {
    if (location.state?.openReceipts) {
      setShowReceiptsModal(true);
    }
  }, [location.state]);

  const showBanner = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: '', type: '' });
    }, 4000);
  };

  const fetchSubmissions = useCallback(async () => {
    if (!activeStudent) return;
    console.log('[ParentFees] Fetching submissions for student:', activeStudent.student_id);
    setLoading(true);
    try {
      const response = await parentGet(`/parent/payments?student_id=${activeStudent.student_id}`);
      const paymentData = response?.data || response || [];
      console.log('[ParentFees] Payments data:', paymentData);
      setSubmissions(Array.isArray(paymentData) ? paymentData : []);
    } catch (error) {
      console.error('[ParentFees] Failed to fetch payments:', error);
      showBanner('Unable to load fee history right now.', 'error');
    } finally {
      console.log('[ParentFees] Setting loading to false');
      setLoading(false);
    }
  }, [activeStudent]);

  useEffect(() => {
    console.log('[ParentFees] activeStudent changed:', activeStudent);
    fetchSubmissions();
    if (activeStudent) {
      const totalFeesAssigned = activeStudent?.total_fees_assigned || 0;
      const totalFeesPaid = activeStudent?.total_fees_paid || 0;
      const remainingFee = Math.max(0, totalFeesAssigned - totalFeesPaid);
      setAmount(remainingFee > 0 ? remainingFee.toString() : '0');
    } else {
      setAmount('');
    }
  }, [activeStudent]);

  // Keyboard accessibility listeners (ESC to close modals)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowReceiptsModal(false);
        setModalReceipt(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmitPayment = async (e) => {
    e.preventDefault();

    if (!activeStudent) {
      showBanner('No student selected.', 'error');
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      showBanner('Please enter a valid amount.', 'error');
      return;
    }

    const totalFeesAssigned = activeStudent?.total_fees_assigned || 0;
    const totalFeesPaid = activeStudent?.total_fees_paid || 0;
    const remainingFee = Math.max(0, totalFeesAssigned - totalFeesPaid);

    if (remainingFee <= 0) {
      showBanner('Student has no pending fees. No further payments can be accepted.', 'error');
      return;
    }
    
    if (parsedAmount > remainingFee) {
      showBanner(`Payment amount ₹${parsedAmount} exceeds outstanding balance of ₹${remainingFee}`, 'error');
      return;
    }

    if (!proofFile) {
      showBanner('Please upload payment receipt screenshot proof.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('student_id', activeStudent.student_id);
      formData.append('amount', amount);
      formData.append('payment_date', new Date().toISOString());
      formData.append('method', paymentMethod);
      if (transactionNumber.trim()) {
        formData.append('transaction_number', transactionNumber.trim());
      }
      formData.append('remarks', remarks);
      formData.append('proof_file', proofFile);

      const result = await parentPost('/parent/payments', formData);

      if (result) {
        showBanner('Payment logged successfully! Awaiting verification.');
        setAmount('');
        setTransactionNumber('');
        setRemarks('');
        setProofFile(null);
        fetchSubmissions();
        if (reloadStudents) {
          await reloadStudents();
        }
      }
    } catch (error) {
      console.error('Failed to submit payment:', error);
      showBanner(error?.message || 'Payment submission failed. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files?.length) {
      setProofFile(e.target.files[0]);
    }
  };

  const handleReplaceProof = async (paymentId) => {
    if (!proofFileForReplace) return;

    try {
      setUploadingProof(true);
      const formData = new FormData();
      formData.append('proof_file', proofFileForReplace);

      const token = localStorage.getItem('parent_token');
      const response = await fetch(`/api/v1/parent/payments/${paymentId}/proof`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        showBanner('Payment receipt proof screenshot replaced successfully!');
        setProofFileForReplace(null);
        setReplacingPaymentId(null);
        fetchSubmissions();
      } else {
        const errorData = await response.json();
        showBanner(errorData.message || 'Replacement failed.', 'error');
      }
    } catch (error) {
      console.error(error);
      showBanner('Something went wrong. Please try again.', 'error');
    } finally {
      setUploadingProof(false);
    }
  };

  const loadReceiptDetails = async (receiptId) => {
    try {
      setLoadingReceipt(true);
      const response = await parentGet(`/parent/payments/${receiptId}`);
      setModalReceipt(response?.data || response);
    } catch (err) {
      console.error(err);
      showBanner('Failed to load receipt information.', 'error');
    } finally {
      setLoadingReceipt(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!modalReceipt) return;
    
    const formatDate = (date) => {
      if (!date) return '—';
      return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatCurrency = (amount) => {
      return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Receipt - ${modalReceipt.receipt_number}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; background: #fff; color: #333; }
          .container { max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 30px; border-radius: 12px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid var(--theme-primary, #10b981); padding-bottom: 20px; margin-bottom: 20px; }
          .logo { font-size: 24px; font-weight: 800; color: var(--theme-primary, #10b981); }
          .title { text-align: right; }
          .title h2 { font-size: 20px; margin: 0; color: #1e293b; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
          .item label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; display: block; margin-bottom: 2px; }
          .item span { font-size: 14px; font-weight: 500; color: #1e293b; }
          .amount-box { background: #f0fdf4; border: 1px dashed var(--theme-primary, #10b981); padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .amount-box h3 { font-size: 26px; margin: 0; color: var(--theme-primary, #10b981); }
          .footer { border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">SAMS PORTAL</div>
            <div class="title">
              <h2>PAYMENT RECEIPT</h2>
              <span style="font-size:12px; color:#64748b;">${modalReceipt.receipt_number}</span>
            </div>
          </div>
          <div class="grid">
            <div class="item"><label>Student Name</label><span>${activeStudent?.name || 'Student'}</span></div>
            <div class="item"><label>Payment Date</label><span>${formatDate(modalReceipt.payment_date)}</span></div>
            <div class="item"><label>Payment Method</label><span>${(modalReceipt.method || 'UPI').toUpperCase()}</span></div>
            <div class="item"><label>Transaction No.</label><span>${modalReceipt.transaction_number || 'N/A'}</span></div>
            <div class="item"><label>Status</label><span style="color:#10b981; font-weight:bold;">${modalReceipt.status}</span></div>
          </div>
          <div class="amount-box">
            <label style="font-size: 11px; text-transform: uppercase; color: #10b981; font-weight: 700;">Amount Paid</label>
            <h3>${formatCurrency(modalReceipt.amount)}</h3>
          </div>
          <div class="footer">
            <p>Thank you for your payment. SAMS Sports Academy System.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const getInitials = (name) => {
    if (!name) return 'ST';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAge = (dob) => {
    if (!dob) return '—';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getRemainingPlanDays = (endDateStr) => {
    if (!endDateStr) return 'N/A';
    const end = new Date(endDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 0) return `${diffDays} days remaining`;
    if (diffDays === 0) return 'Ends today';
    return 'Expired';
  };

  const getDetailedPlanStatus = (student) => {
    if (!student) return 'No Plan';
    if (student.status === 'INACTIVE' && student.auto_deactivated) {
      return 'Plan Expired — Student Deactivated';
    }
    const enrollments = student.enrollments || [];
    const activeEnrollment = enrollments.find(e => e.is_active) || enrollments[0];
    if (!activeEnrollment || !activeEnrollment.plan_end_date) {
      return 'Plan Active';
    }
    const expiryTime = new Date(activeEnrollment.plan_end_date).getTime();
    const nowTime = new Date().getTime();
    const diffTime = expiryTime - nowTime;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0 && diffDays <= 10) {
      return 'Plan Expiring Soon';
    } else if (diffDays <= 0) {
      const graceEnd = expiryTime + 2 * 24 * 60 * 60 * 1000;
      if (nowTime < graceEnd) {
        return 'Plan Expired — Grace Period';
      } else {
        return 'Plan Expired — Student Deactivated';
      }
    }
    return 'Plan Active';
  };

  const getDetailedPlanStatusColor = (statusLabel) => {
    switch (statusLabel) {
      case 'Plan Active':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'Plan Expiring Soon':
        return 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 animate-pulse';
      case 'Plan Expired — Grace Period':
        return 'bg-orange-500/10 text-orange-600 border border-orange-500/20';
      case 'Plan Expired — Student Deactivated':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
  };

  const totalFeesAssigned = activeStudent?.total_fees_assigned || 0;
  const totalFeesPaid = activeStudent?.total_fees_paid || 0;
  const remainingFee = Math.max(0, totalFeesAssigned - totalFeesPaid);

  const activeEnrollments = activeStudent?.enrollments?.filter(e => e.is_active) || [];

  const displayEnrollments = activeEnrollments.length > 0
    ? activeEnrollments
    : activeStudent
      ? [{
          sport: activeStudent.sport,
          batch: activeStudent.batch,
          coach: null,
          duration_plan: null,
          plan_start_date: null,
          plan_end_date: null
        }]
      : [];

  const feeSummary = activeEnrollments.length > 0 ? activeEnrollments.reduce((acc, e) => {
    const base = parseFloat(e.sport?.base_fee || e.sports_base_fee || 0);
    const mult = parseFloat(e.duration_plan?.multiplier || e.plan_multiplier || 1);
    const assigned = base * mult;
    const reg = parseFloat(e.registration_fee || 0);
    const add = parseFloat(e.additional_charges || 0);
    const disc = parseFloat(e.discount || 0);
    
    acc.baseFee += base;
    acc.assignedFee += assigned;
    acc.regFee += reg;
    acc.addCharges += add;
    acc.discount += disc;
    acc.totalFee += (assigned + reg + add - disc);
    return acc;
  }, { baseFee: 0, assignedFee: 0, regFee: 0, addCharges: 0, discount: 0, totalFee: 0 }) : {
    baseFee: 0,
    assignedFee: 0,
    regFee: 0,
    addCharges: 0,
    discount: 0,
    totalFee: activeStudent?.total_fees_assigned || 0
  };

  if (studentLoading) return <Loader />;

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
              Fee Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Submit payment proofs and track fee status for your child.
            </p>
          </div>
        </div>

        {/* Receipts Ledger Button */}
        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowReceiptsModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 border border-border bg-card hover:bg-slate-50 dark:hover:bg-slate-800 text-foreground shadow-md shadow-black/5"
          title="View invoices and receipts history ledger"
        >
          <Receipt className="w-4 h-4 text-primary" />
          Receipts Ledger
        </motion.button>
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

      {/* Child Switcher Selector */}
      {students.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-4 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-black uppercase text-muted-foreground tracking-wider">Select Child</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Switch view to manage fees for a different child</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {students.map((student) => {
                const isSelected = student.student_id === activeStudent?.student_id;
                return (
                  <button
                    key={student.student_id}
                    type="button"
                    onClick={() => switchStudent(student)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-xs font-black transition-all ${
                      isSelected
                        ? 'bg-primary border-primary text-white shadow-md shadow-primary/25'
                        : 'bg-card text-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-200/50 flex items-center justify-center overflow-hidden shrink-0 text-[10px] font-black text-slate-700">
                      {student.profile_photo || student.photo ? (
                        <img
                          src={student.profile_photo || student.photo}
                          alt={student.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getInitials(student.name)
                      )}
                    </div>
                    <span>{student.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: STUDENT PROFILE & ENROLLMENT & FEE CONTEXT */}
        <div className="xl:col-span-7 space-y-6">
          {activeStudent && (
            <>
              {/* Student Profile Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden relative p-6"
              >
                <span className="absolute top-0 left-0 w-full h-1 bg-primary"></span>
                <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start text-center sm:text-left">
                  {/* Photo Section */}
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center shadow-md overflow-hidden shrink-0 border border-border">
                    {activeStudent.profile_photo || activeStudent.photo ? (
                      <img
                        src={activeStudent.profile_photo || activeStudent.photo}
                        alt={activeStudent.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-black text-white">{getInitials(activeStudent.name)}</span>
                    )}
                  </div>
                  
                  {/* Info Details */}
                  <div className="flex-1 space-y-2.5 w-full">
                    <div>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <h2 className="text-xl font-extrabold text-foreground tracking-tight">{activeStudent.name}</h2>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          getDetailedPlanStatusColor(getDetailedPlanStatus(activeStudent))
                        }`}>
                          {getDetailedPlanStatus(activeStudent)}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Student Profile</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-left pt-2 border-t border-border/60">
                      <div>
                        <span className="text-[9px] font-black text-muted-foreground uppercase block">Student ID</span>
                        <span className="text-xs font-bold text-foreground font-mono">#{activeStudent.student_id}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-muted-foreground uppercase block">Age</span>
                        <span className="text-xs font-bold text-foreground">{getAge(activeStudent.dob)} years</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-muted-foreground uppercase block">Parent Name</span>
                        <span className="text-xs font-bold text-foreground">{activeStudent.parent_name || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-muted-foreground uppercase block">Joining Date</span>
                        <span className="text-xs font-bold text-foreground">
                          {activeStudent.joining_date ? new Date(activeStudent.joining_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Current Enrollment Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-4"
              >
                <div>
                  <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Current Enrollment Details</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Active sports, plans, and coaches linked to this profile</p>
                </div>

                <div className="space-y-4">
                  {displayEnrollments.map((enrollment, index) => {
                    const remainingStr = getRemainingPlanDays(enrollment.plan_end_date);
                    const remainingStatusColor = remainingStr === 'Expired'
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      : remainingStr === 'Ends today'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';

                    return (
                      <div key={index} className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 border border-border space-y-3 relative overflow-hidden text-left">
                        <span className="absolute top-0 left-0 w-1 h-full bg-primary"></span>
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h4 className="text-sm font-black text-foreground">{enrollment.sport?.name || 'Sports Enrollment'}</h4>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5">Sport Plan</p>
                          </div>
                          {enrollment.plan_end_date && (
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${remainingStatusColor}`}>
                              {remainingStr}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                          <div>
                            <span className="text-[9px] font-black text-muted-foreground uppercase block">Current Batch</span>
                            <span className="font-bold text-foreground">{enrollment.batch?.name || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-muted-foreground uppercase block">Coach</span>
                            <span className="font-bold text-foreground">{enrollment.coach?.name || 'Not Assigned'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-muted-foreground uppercase block">Duration Plan</span>
                            <span className="font-bold text-foreground">
                              {enrollment.duration_plan?.name 
                                ? `${enrollment.duration_plan.name} (${enrollment.duration_plan.months || 0} Month Plan)` 
                                : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-muted-foreground uppercase block">Plan Period</span>
                            <span className="font-bold text-foreground">
                              {enrollment.plan_start_date 
                                ? `${new Date(enrollment.plan_start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} to ${new Date(enrollment.plan_end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                                : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Fee Summary Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-4"
              >
                <div>
                  <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Fee Summary Breakdown</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Calculation summary for the active fee cycle</p>
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-between items-center text-xs pb-2 border-b border-border/50">
                    <span className="text-muted-foreground font-bold">Sports Base Fee</span>
                    <span className="font-bold text-foreground">₹{feeSummary.baseFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pb-2 border-b border-border/50">
                    <span className="text-muted-foreground font-bold">Assigned Sports Fee <span className="text-[10px] text-muted-foreground/60">(Base × Plan Multiplier)</span></span>
                    <span className="font-bold text-foreground">₹{feeSummary.assignedFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pb-2 border-b border-border/50">
                    <span className="text-muted-foreground font-bold">Registration Fee</span>
                    <span className="font-bold text-foreground">₹{feeSummary.regFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pb-2 border-b border-border/50">
                    <span className="text-muted-foreground font-bold">Additional Charges</span>
                    <span className="font-bold text-foreground">₹{feeSummary.addCharges.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pb-2 border-b border-border/50">
                    <span className="text-muted-foreground font-bold">Discount Applied</span>
                    <span className="font-bold text-rose-500">-₹{feeSummary.discount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pb-2 border-b border-border/80 pt-1">
                    <span className="text-foreground font-black uppercase text-[10px]">Total Cycle Fee</span>
                    <span className="font-black text-foreground">₹{totalFeesAssigned.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pb-2 border-b border-border/50 text-emerald-600">
                    <span className="font-bold">Total Paid in Cycle</span>
                    <span className="font-extrabold">₹{totalFeesPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2 text-rose-600">
                    <span className="font-black uppercase text-[11px]">Outstanding Cycle Balance</span>
                    <span className="font-black text-base">₹{remainingFee.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 flex gap-2.5 items-start mt-2 text-left">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-amber-600 uppercase text-[9px] font-black block">Cycle Payment Status</span>
                    <span className="text-xs font-bold text-foreground mt-0.5 block">
                      This payment is specifically logged for the student's **CURRENT** active billing cycle.
                    </span>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </div>

        {/* RIGHT COLUMN: PAYMENT FORM */}
        <div className="xl:col-span-5 space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden relative"
          >
            <span className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></span>
            <div className="p-5 border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/10">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Log Offline Payment
              </h3>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-6 space-y-5 bg-card text-left">
              {activeStudent && (
                <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3 flex justify-between items-center text-xs font-bold">
                  <span className="text-rose-600 uppercase text-[9px] font-black">Outstanding Balance</span>
                  <span className="text-rose-600 text-base font-black">₹{remainingFee.toFixed(2)}</span>
                </div>
              )}

              {/* Payment Method */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Payment Method</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { value: 'upi', label: 'UPI' },
                    { value: 'bank_transfer', label: 'Bank Transfer' }
                  ].map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPaymentMethod(method.value)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                        paymentMethod === method.value
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                          : 'bg-card text-foreground border-border hover:border-emerald-450'
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

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

              {/* Transaction Number */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Transaction Reference Number</label>
                <input
                  type="text"
                  value={transactionNumber}
                  onChange={(e) => setTransactionNumber(e.target.value)}
                  placeholder="UPI Ref / IMPS UTR"
                  className="input-field text-xs py-2 px-3 bg-card font-mono"
                  maxLength={50}
                />
              </div>

              {/* Attachment Proof */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Receipt Attachment (Required)</label>
                <div className="relative border border-dashed border-border hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-900/10 rounded-xl p-3.5 text-center cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                    required={!proofFile}
                  />
                  <span className="text-[11px] font-bold text-muted-foreground">📸 Upload transaction receipt screenshot</span>
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
                disabled={submitting || remainingFee <= 0}
                className="btn btn-primary w-full py-3.5 text-xs uppercase tracking-wider font-black flex justify-center items-center gap-1.5"
              >
                {submitting ? 'Submitting...' : 'Submit Payment'}
              </button>
            </form>
          </motion.div>

          {/* RECENT SUBMISSIONS LOG */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden relative"
          >
            <span className="absolute top-0 left-0 w-full h-1 bg-blue-500"></span>
            <div className="p-5 border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/10">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Recent Submissions
              </h3>
            </div>

            <div className="p-0 min-h-[300px]">
              {loading && submissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-xs font-bold text-muted-foreground">
                  <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-3"></div>
                  Syncing transactions...
                </div>
              ) : submissions.length > 0 ? (
                <div className="p-4 space-y-3">
                  {submissions.slice(0, 5).map((sub) => (
                    <div key={sub.receipt_id} className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-3 border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-foreground">₹{parseFloat(sub.amount).toFixed(2)}</span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          sub.status === 'APPROVED' || sub.status === 'VERIFIED'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : sub.status === 'REJECTED'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        }`}>
                          {sub.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(sub.payment_date || sub.createdAt).toLocaleDateString()}
                      </div>
                      {sub.status === 'REJECTED' && (
                        <button
                          onClick={() => setReplacingPaymentId(sub.receipt_id)}
                          className="mt-2 text-[9px] font-bold text-rose-600 hover:text-rose-500 transition-colors"
                        >
                          Replace Proof
                        </button>
                      )}
                      {replacingPaymentId === sub.receipt_id && (
                        <div className="mt-2 space-y-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files?.length && setProofFileForReplace(e.target.files[0])}
                            className="text-[10px]"
                          />
                          <button
                            onClick={() => handleReplaceProof(sub.receipt_id)}
                            disabled={uploadingProof || !proofFileForReplace}
                            className="bg-emerald-500 text-white text-[9px] px-2 py-1 rounded font-bold disabled:opacity-50"
                          >
                            Upload
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {submissions.length > 5 && (
                    <button
                      onClick={() => setShowReceiptsModal(true)}
                      className="w-full text-center text-[10px] font-bold text-primary hover:underline font-bold"
                    >
                      View All {submissions.length} Payments
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-xs font-bold text-muted-foreground">
                  <FileText className="w-8 h-8 mb-2 opacity-50" />
                  No payments submitted yet
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* RECEIPTS LOG MODAL */}
      <AnimatePresence>
        {showReceiptsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4" onClick={() => setShowReceiptsModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl w-full max-w-4xl p-6 shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowReceiptsModal(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5 mb-5 pb-3.5 border-b border-border/60">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground">Payment Submissions History</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Audit log of submitted proofs and payment statuses</p>
                </div>
              </div>

              {/* Scrollable grid of submissions */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {submissions.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-12 font-bold uppercase tracking-wider">No payments submitted yet for {activeStudent?.name || 'this student'}.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border shadow-inner">
                    <table className="w-full text-left text-xs font-semibold">
                      <thead>
                        <tr className="border-b border-border/60 bg-slate-50/50 dark:bg-slate-950/40 text-muted-foreground uppercase text-[9px] tracking-widest font-black">
                          <th className="py-3 px-4">Ref Number</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4">Date logged</th>
                          <th className="py-3 px-4">Verification</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 bg-background">
                        {submissions.map((sub) => (
                          <tr key={sub.receipt_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                            <td className="py-3 px-4 font-mono font-black text-foreground">{sub.transaction_number}</td>
                            <td className="py-3 px-4 text-foreground font-black text-sm">₹{parseFloat(sub.amount).toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 text-muted-foreground">{new Date(sub.payment_date || sub.createdAt).toLocaleDateString()}</td>
                            <td className="py-3 px-4">
                              <span className={`inline-block text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                                sub.status === 'APPROVED' || sub.status === 'VERIFIED'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                  : sub.status === 'REJECTED'
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              }`}>
                                {sub.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex justify-end gap-1.5">
                                {sub.status === 'APPROVED' && (
                                  <button
                                    onClick={() => loadReceiptDetails(sub.receipt_id)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-foreground transition-all duration-200 shadow-sm border border-border/30 dark:border-border/30"
                                    title="View receipt details"
                                  >
                                    <Receipt size={12} className="text-primary" />
                                    Receipt
                                  </button>
                                )}
                                
                                {sub.status === 'REJECTED' && (
                                  <div className="flex gap-2">
                                    {replacingPaymentId === sub.receipt_id ? (
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          type="file"
                                          id={`replace-proof-${sub.receipt_id}`}
                                          accept="image/*"
                                          onChange={(e) => e.target.files?.length && setProofFileForReplace(e.target.files[0])}
                                          className="hidden"
                                        />
                                        <label
                                          htmlFor={`replace-proof-${sub.receipt_id}`}
                                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer border-2 border-dashed transition-all duration-300 ${
                                            proofFileForReplace ? 'border-primary/60 bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/50'
                                          }`}
                                        >
                                          {proofFileForReplace ? 'File selected' : 'Choose screenshot'}
                                        </label>
                                        <button
                                          onClick={() => handleReplaceProof(sub.receipt_id)}
                                          disabled={uploadingProof || !proofFileForReplace}
                                          className="bg-primary hover:bg-primary/90 text-background text-[10px] px-3 py-1.5 rounded-lg font-black uppercase tracking-wider transition-all shadow-sm disabled:opacity-50"
                                        >
                                          Upload
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setReplacingPaymentId(sub.receipt_id)}
                                        className="inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-all duration-200 shadow-sm"
                                      >
                                        Replace Proof
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SINGLE RECEIPT DETAIL POPUP */}
      <AnimatePresence>
        {modalReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4" onClick={() => setModalReceipt(null)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full relative shadow-2xl flex flex-col gap-4 text-xs font-semibold text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setModalReceipt(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5 pb-3 border-b border-border/60">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-foreground">Payment Invoice</h4>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">{modalReceipt.receipt_number}</p>
                </div>
              </div>

              <div className="space-y-3 text-xs font-semibold">
                <div className="flex justify-between border-b border-border/40 pb-2.5">
                  <span className="text-muted-foreground">Receipt Number</span>
                  <span className="font-mono font-black text-foreground">{modalReceipt.receipt_number}</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-2.5">
                  <span className="text-muted-foreground">Log Date</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{new Date(modalReceipt.payment_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-2.5">
                  <span className="text-muted-foreground">Transaction Reference</span>
                  <span className="font-mono font-bold text-foreground truncate max-w-[150px]">{modalReceipt.transaction_number}</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-2.5">
                  <span className="text-muted-foreground">Verification Status</span>
                  <span className="font-black text-emerald-500 uppercase tracking-wider">Verified</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-muted-foreground">Invoice Amount</span>
                  <span className="font-black text-foreground text-base">₹{parseFloat(modalReceipt.amount).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <button
                onClick={handlePrintReceipt}
                className="w-full py-2.5 bg-foreground hover:bg-slate-800 text-background rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <Printer size={14} />
                Print PDF Receipt
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
