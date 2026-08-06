import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { IndianRupee, UploadCloud, CheckCircle2, AlertCircle, XCircle, CreditCard, Receipt, Check, Clock, Download, Share2, Printer, X, Search, DollarSign } from 'lucide-react';
import Loader from '../../components/Loader';
import { parentGet, parentPatch, parentPost } from '../../api/client';
import { useActiveStudent } from '../../context/ActiveStudentContext';

export default function ParentFees() {
  const location = useLocation();
  const { activeStudent, loading: studentLoading } = useActiveStudent();
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
    window.setTimeout(() => setMessage({ text: '', type: '' }), 4000);
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
    
    if (parsedAmount > remainingFee) {
      showBanner(`Payment amount ₹${parsedAmount} exceeds outstanding balance of ₹${remainingFee}`, 'error');
      return;
    }

    if (!transactionNumber.trim()) {
      showBanner('Please enter transaction reference number.', 'error');
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
      formData.append('transaction_number', transactionNumber);
      formData.append('remarks', remarks);
      formData.append('proof_file', proofFile);

      const token = localStorage.getItem('parent_token');
      const response = await fetch('/api/v1/parent/payments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        showBanner('Payment logged successfully! Awaiting verification.');
        setAmount('');
        setTransactionNumber('');
        setRemarks('');
        setProofFile(null);
        fetchSubmissions();
        fetchChildren();
      } else {
        const errorData = await response.json();
        showBanner(errorData.message || 'Payment submission failed.', 'error');
      }
    } catch (error) {
      console.error('Failed to submit payment:', error);
      showBanner('Unable to connect to server. Please try again.', 'error');
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

  const totalFeesAssigned = activeStudent?.total_fees_assigned || 0;
  const totalFeesPaid = activeStudent?.total_fees_paid || 0;
  const remainingFee = Math.max(0, totalFeesAssigned - totalFeesPaid);

  if (studentLoading) return <Loader />;

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto font-sans p-4 lg:p-8">
      
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/50 dark:border-slate-800/50 pb-5"
      >
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-display">
            Plans & Payments
          </h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
            Submit payment proofs and audit receipt ledgers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowReceiptsModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 border border-slate-200 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-md shadow-black/5"
            title="View invoices and receipts history ledger"
          >
            <Receipt className="w-4 h-4 text-[#84cc16]" />
            Receipts Ledger
          </motion.button>
        </div>
      </motion.div>

      {/* Alert Banners */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 shadow-md border transition-all ${
              message.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {message.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Log Payment Form (2/3 width) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl space-y-6"
        >
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800/60">
            <div className="p-2 rounded-lg bg-[#84cc16]/10 text-[#84cc16]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Log Offline Payment</h3>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">Submit offline transaction confirmation receipt details</p>
            </div>
          </div>

          <form onSubmit={handleSubmitPayment} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {/* Payment Method */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest block">Payment Method</label>
                <div className="relative">
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] focus:ring-4 focus:ring-[#84cc16]/10 transition-all duration-300 text-sm py-2.5 pl-3 pr-8 appearance-none cursor-pointer"
                  >
                    <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="bank_transfer">Bank Transfer (NEFT / IMPS)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              {/* Amount Paid */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest block">Amount Paid (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">₹</span>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount paid"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] focus:ring-4 focus:ring-[#84cc16]/10 transition-all duration-300 text-sm"
                    min="1"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {/* Transaction Code */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest block">Transaction Reference Number</label>
                <input
                  type="text"
                  required
                  value={transactionNumber}
                  onChange={(e) => setTransactionNumber(e.target.value)}
                  placeholder="Min 12 digit UPI Ref / IMPS UTR"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-[#84cc16] focus:ring-4 focus:ring-[#84cc16]/10 transition-all duration-300 text-sm font-mono"
                  minLength={12}
                  maxLength={50}
                />
              </div>

              {/* Upload Proof */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest block">Upload Screenshot Proof</label>
                <div className="relative">
                  <input
                    type="file"
                    id="proof-upload"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    required={!proofFile}
                  />
                  <label
                    htmlFor="proof-upload"
                    className={`w-full flex items-center justify-center gap-2 border-2 border-dashed rounded-xl py-2.5 px-4 text-xs font-black uppercase tracking-wider cursor-pointer transition-all duration-300 ${
                      proofFile
                        ? 'border-[#84cc16]/60 bg-[#84cc16]/5 text-[#84cc16]'
                        : 'border-slate-200 dark:border-slate-700 hover:border-[#84cc16]/50 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {proofFile ? (
                      <>
                        <Check className="w-4 h-4 text-[#84cc16]" />
                        <span className="truncate max-w-[200px]">{proofFile.name}</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>Choose screenshot file</span>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest block">Payment Remarks (Optional)</label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add bank details, sports kit adjustments or invoice codes..."
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#84cc16] focus:ring-4 focus:ring-[#84cc16]/10 transition-all duration-300 text-sm resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-slate-950 dark:bg-lime-400 hover:bg-slate-800 dark:hover:bg-lime-500 text-white dark:text-slate-950 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-md shadow-black/10 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting payment log...' : 'Log Offline Payment'}
            </button>
          </form>
        </motion.div>

        {/* Right Column: Active Plan Overview (1/3 width) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl space-y-5"
        >
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800/60">
            <div className="p-2 rounded-lg bg-[#84cc16]/10 text-[#84cc16]">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Plan Dues</h3>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">Billing summary breakdown</p>
            </div>
          </div>

          {activeStudent ? (
            <div className="space-y-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/40">
                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest">Active Batch</span>
                <p className="text-sm font-black text-slate-900 dark:text-white mt-1">
                  {activeStudent.batch?.name || 'Assigning Batch'}
                </p>
                <div className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-lime-400/10 text-lime-600 dark:text-lime-400 border border-lime-500/20">
                  {activeStudent.sport?.name || 'General Sport'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[9px] uppercase font-black tracking-widest">Assigned Fees</span>
                  <span className="text-slate-900 dark:text-slate-100 font-extrabold text-base block mt-1">₹{totalFeesAssigned.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[9px] uppercase font-black tracking-widest">Verified Paid</span>
                  <span className="text-emerald-500 font-extrabold text-base block mt-1">₹{totalFeesPaid.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="p-4 bg-rose-500/5 dark:bg-rose-500/10 border-2 border-rose-500/10 rounded-xl flex items-center justify-between text-xs pt-3 mt-2">
                <div>
                  <span className="text-rose-500 dark:text-rose-400 block text-[10px] font-black uppercase tracking-widest">Outstanding Dues</span>
                  <span className="text-rose-600 dark:text-rose-400 block mt-1.5 font-black text-2xl">₹{remainingFee.toLocaleString('en-IN')}</span>
                </div>
                <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">Select child to view plan.</div>
          )}
        </motion.div>
      </div>

      {/* RECEIPTS LOG MODAL */}
      <AnimatePresence>
        {showReceiptsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4" onClick={() => setShowReceiptsModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-2xl w-full max-w-4xl p-6 shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowReceiptsModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-950 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5 mb-5 pb-3.5 border-b border-slate-100 dark:border-slate-800/60">
                <div className="p-2 rounded-lg bg-[#84cc16]/10 text-[#84cc16]">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Payment Submissions History</h3>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">Audit log of submitted proofs and payment statuses</p>
                </div>
              </div>

              {/* Scrollable grid of submissions */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {submissions.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-12 font-bold uppercase tracking-wider">No payments submitted yet for {activeStudent?.name || 'this student'}.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200/50 dark:border-slate-800/50 shadow-inner">
                    <table className="w-full text-left text-xs font-semibold">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 uppercase text-[9px] tracking-widest font-black">
                          <th className="py-3 px-4">Ref Number</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4">Date logged</th>
                          <th className="py-3 px-4">Verification</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900/30">
                        {submissions.map((sub) => (
                          <tr key={sub.payment_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                            <td className="py-3 px-4 font-mono font-black text-slate-900 dark:text-white">{sub.transaction_number}</td>
                            <td className="py-3 px-4 text-slate-900 dark:text-white font-black text-sm">₹{parseFloat(sub.amount).toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{new Date(sub.payment_date || sub.createdAt).toLocaleDateString()}</td>
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
                                    onClick={() => loadReceiptDetails(sub.payment_id)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 transition-all duration-200 shadow-sm border border-slate-200/50 dark:border-slate-800/30"
                                    title="View receipt details"
                                  >
                                    <Receipt size={12} className="text-[#84cc16]" />
                                    Receipt
                                  </button>
                                )}
                                
                                {sub.status === 'REJECTED' && (
                                  <div className="flex gap-2">
                                    {replacingPaymentId === sub.payment_id ? (
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          type="file"
                                          id={`replace-proof-${sub.payment_id}`}
                                          accept="image/*"
                                          onChange={(e) => e.target.files?.length && setProofFileForReplace(e.target.files[0])}
                                          className="hidden"
                                        />
                                        <label
                                          htmlFor={`replace-proof-${sub.payment_id}`}
                                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer border-2 border-dashed transition-all duration-300 ${
                                            proofFileForReplace ? 'border-[#84cc16]/60 bg-[#84cc16]/5 text-[#84cc16]' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-[#84cc16]/50'
                                          }`}
                                        >
                                          {proofFileForReplace ? 'File selected' : 'Choose screenshot'}
                                        </label>
                                        <button
                                          onClick={() => handleReplaceProof(sub.payment_id)}
                                          disabled={uploadingProof || !proofFileForReplace}
                                          className="bg-[#84cc16] hover:bg-[#84cc16]/90 text-slate-950 text-[10px] px-3 py-1.5 rounded-lg font-black uppercase tracking-wider transition-all shadow-sm disabled:opacity-50"
                                        >
                                          Upload
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setReplacingPaymentId(sub.payment_id)}
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
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full relative shadow-2xl flex flex-col gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setModalReceipt(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/60">
                <div className="p-2 rounded-lg bg-[#84cc16]/10 text-[#84cc16]">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white">Payment Invoice</h4>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">{modalReceipt.receipt_number}</p>
                </div>
              </div>

              <div className="space-y-3 text-xs font-semibold">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/40 pb-2.5">
                  <span className="text-slate-400 dark:text-slate-500">Receipt Number</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white">{modalReceipt.receipt_number}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/40 pb-2.5">
                  <span className="text-slate-400 dark:text-slate-500">Log Date</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{new Date(modalReceipt.payment_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/40 pb-2.5">
                  <span className="text-slate-400 dark:text-slate-500">Transaction Reference</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{modalReceipt.transaction_number}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/40 pb-2.5">
                  <span className="text-slate-400 dark:text-slate-500">Verification Status</span>
                  <span className="font-black text-emerald-500 uppercase tracking-wider">Verified</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-400 dark:text-slate-500">Invoice Amount</span>
                  <span className="font-black text-slate-900 dark:text-white text-base">₹{parseFloat(modalReceipt.amount).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <button
                onClick={handlePrintReceipt}
                className="w-full py-2.5 bg-slate-950 dark:bg-lime-400 hover:bg-slate-800 dark:hover:bg-lime-500 text-white dark:text-slate-950 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
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