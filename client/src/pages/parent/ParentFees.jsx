import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { IndianRupee, UploadCloud, CheckCircle2, AlertCircle, XCircle, CreditCard, Receipt, Check, Clock, Download, Share2, Printer, X, Sparkles } from 'lucide-react';
import Loader from '../../components/Loader';
import { parentGet, parentPatch, parentPost } from '../../api/client';

export default function ParentFees() {
  const location = useLocation();
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
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

  const fetchChildren = useCallback(async () => {
    try {
      const response = await parentGet('/parent/children');
      const childData = response?.data || response || [];
      const childrenList = Array.isArray(childData) ? childData : [];
      setChildren(childrenList);
      if (childrenList.length > 0 && !selectedChildId) {
        setSelectedChildId(String(childrenList[0].student_id));
      }
    } catch (error) {
      console.error('Failed to fetch children:', error);
      showBanner('Unable to load your children right now.', 'error');
    }
  }, [selectedChildId]);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = selectedChildId ? `?student_id=${selectedChildId}` : '';
      const response = await parentGet(`/parent/payments${params}`);
      const paymentData = response?.data || response || [];
      setSubmissions(Array.isArray(paymentData) ? paymentData : []);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      showBanner('Unable to load fee history right now.', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedChildId]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  useEffect(() => {
    if (selectedChildId) {
      fetchSubmissions();
    }
  }, [selectedChildId, fetchSubmissions]);

  const handleSubmitPayment = async (e) => {
    e.preventDefault();

    if (!selectedChildId) {
      showBanner('Please select a child.', 'error');
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      showBanner('Please enter a valid amount.', 'error');
      return;
    }

    // Validate transaction number
    const trimmedTransaction = transactionNumber.trim();
    if (trimmedTransaction.length < 12) {
      setTransactionError('Transaction number must be at least 12 characters');
      showBanner('Please enter a valid transaction number (min 12 characters).', 'error');
      return;
    }
    if (trimmedTransaction.length > 50) {
      setTransactionError('Transaction number must not exceed 50 characters');
      showBanner('Transaction number is too long (max 50 characters).', 'error');
      return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(trimmedTransaction)) {
      setTransactionError('Transaction number can only contain letters and numbers');
      showBanner('Transaction number can only contain letters and numbers.', 'error');
      return;
    }

    // Validate payment screenshot is mandatory
    if (!proofFile) {
      showBanner('Payment screenshot is required.', 'error');
      return;
    }

    setSubmitting(true);
    setTransactionError('');
    try {
      const payload = new FormData();
      payload.append('student_id', selectedChildId);
      payload.append('amount', parsedAmount.toString());
      payload.append('method', paymentMethod);
      payload.append('transaction_number', trimmedTransaction);
      payload.append('payment_date', new Date().toISOString().split('T')[0]);
      if (remarks.trim()) {
        payload.append('remarks', remarks.trim());
      }
      if (proofFile) {
        payload.append('proof_file', proofFile);
      }

      await parentPost('/parent/payments', payload);
      showBanner('Your payment has been submitted successfully and is awaiting academy verification.', 'success');
      setAmount('');
      setTransactionNumber('');
      setRemarks('');
      setProofFile(null);
      fetchSubmissions();
    } catch (error) {
      console.error('Payment submission failed:', error);
      showBanner(error.message || 'Failed to submit payment.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadProof = async (receiptId) => {
    if (!proofFileForReplace) {
      showBanner('Please choose a proof file first.', 'error');
      return;
    }

    setUploadingProof(true);
    try {
      const payload = new FormData();
      payload.append('proof_file', proofFileForReplace);
      await parentPatch(`/parent/payments/${receiptId}/proof`, payload);
      showBanner('Proof uploaded successfully.', 'success');
      setProofFileForReplace(null);
      setReplacingPaymentId(null);
      fetchSubmissions();
    } catch (error) {
      console.error('Failed to upload proof:', error);
      showBanner(error.message || 'Unable to upload proof.', 'error');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleViewReceipt = async (receipt) => {
    const receiptId = receipt.receipt_id || receipt.id;
    if (!receiptId) {
      console.error('Receipt ID is missing:', receipt);
      showBanner('Unable to load receipt details. Invalid receipt ID.', 'error');
      return;
    }

    setLoadingReceipt(true);
    try {
      const response = await parentGet(`/parent/payments/${receiptId}`);
      const fullReceipt = response?.data || response;
      setModalReceipt(fullReceipt);
    } catch (error) {
      console.error('Failed to fetch receipt details:', error);
      showBanner('Unable to load receipt details.', 'error');
    } finally {
      setLoadingReceipt(false);
    }
  };

  const handleDownloadReceipt = async (receipt) => {
    const receiptId = receipt.receipt_id || receipt.id;
    if (!receiptId) {
      console.error('Receipt ID is missing:', receipt);
      showBanner('Unable to download receipt. Invalid receipt ID.', 'error');
      return;
    }

    setLoadingReceipt(true);
    try {
      await parentGet(`/parent/payments/${receiptId}/download`);
      const response = await parentGet(`/parent/payments/${receiptId}`);
      const fullReceipt = response?.data || response;
      const printContent = generateReceiptPDF(fullReceipt);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
          showBanner('Receipt download started. Please save as PDF from print dialog.', 'success');
        };
      } else {
        showBanner('Please allow popups to download receipt.', 'error');
      }
    } catch (error) {
      console.error('Failed to download receipt:', error);
      showBanner('Unable to download receipt.', 'error');
    } finally {
      setLoadingReceipt(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const approvedReceipts = submissions.filter((payment) => {
    return payment.status === 'COMPLETED' || payment.status === 'APPROVED' || payment.status === 'PAID';
  });

  const generateReceiptPDF = (receipt) => {
    const formatDate = (date) => {
      if (!date) return '—';
      return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };
    const formatDateTime = (date) => {
      if (!date) return '—';
      return new Date(date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };
    const formatCurrency = (amount) => {
      return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${receipt.receipt_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @media print {
      body { background: white !important; }
      .no-print { display: none !important; }
      @page { margin: 10mm; size: A4; }
    }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 15px; background: #f5f5f5; }
    .receipt-container { max-width: 750px; margin: 0 auto; background: white; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border: 2px solid #10b981; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #10b981; }
    .academy-info { flex: 1; }
    .academy-info h1 { font-size: 24px; font-weight: bold; color: #1e3a5f; margin-bottom: 6px; }
    .academy-info p { font-size: 12px; color: #64748b; margin-bottom: 3px; }
    .academy-logo { width: 90px; height: 90px; object-fit: contain; margin-right: 15px; }
    .receipt-number { text-align: right; min-width: 180px; }
    .receipt-number .label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
    .receipt-number .value { font-size: 18px; font-weight: bold; color: #1e3a5f; margin-top: 3px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 14px; font-weight: bold; color: #1e3a5f; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.5px; background: #f8fafc; padding: 6px 10px; border-radius: 4px; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
    .info-item .label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
    .info-item .value { font-size: 13px; color: #1e293b; font-weight: 500; }
    .amount-section { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #10b981; }
    .amount-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .amount-row .label { font-size: 13px; color: #475569; }
    .amount-row .value { font-size: 15px; font-weight: 600; color: #1e293b; }
    .amount-row.total { margin-top: 15px; padding-top: 15px; border-top: 2px solid #10b981; font-weight: bold; }
    .amount-row.total .label { font-size: 15px; color: #1e293b; }
    .amount-row.total .value { font-size: 22px; color: #10b981; }
    .footer { margin-top: 25px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; }
    .footer p { font-size: 12px; color: #64748b; margin-bottom: 4px; }
    .verified-badge { background: #dcfce7; color: #16a34a; border: 2px solid #16a34a; padding: 6px 14px; border-radius: 6px; font-weight: bold; text-transform: uppercase; font-size: 11px; display: inline-flex; align-items: center; gap: 6px; }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div style="display: flex; align-items: center; flex: 1;">
        ${receipt.academy?.logo_url ? `<img src="${receipt.academy.logo_url}" alt="${receipt.academy.name}" class="academy-logo">` : ''}
        <div class="academy-info">
          <h1>${receipt.academy?.name || 'Sports Academy'}</h1>
          <p>${receipt.academy?.address || ''}</p>
          <p>Phone: ${receipt.academy?.phone_number || '—'}</p>
          <p>Email: ${receipt.academy?.email || '—'}</p>
        </div>
      </div>
      <div class="receipt-number">
        <div class="label">Receipt Number</div>
        <div class="value">${receipt.receipt_number || '—'}</div>
        <div style="margin-top: 10px;">
          <div class="label">Issue Date</div>
          <div class="value" style="font-size: 13px; font-weight: 500;">${formatDate(receipt.created_at)}</div>
        </div>
      </div>
    </div>
    <div class="verified-badge" style="margin: 15px 0;">✓ Payment Verified & Completed</div>
    <div class="section">
      <div class="section-title">Student Details</div>
      <div class="info-grid">
        <div class="info-item"><div class="label">Student Name</div><div class="value">${receipt.student?.name || '—'}</div></div>
        <div class="info-item"><div class="label">Parent Name</div><div class="value">${receipt.student?.parent_name || '—'}</div></div>
        <div class="info-item"><div class="label">Sport</div><div class="value">${receipt.sport?.name || '—'}</div></div>
        <div class="info-item"><div class="label">Batch</div><div class="value">${receipt.batch?.name || '—'}</div></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Payment Details</div>
      <div class="info-grid">
        <div class="info-item"><div class="label">Payment Date & Time</div><div class="value">${formatDateTime(receipt.payment_date)}</div></div>
        <div class="info-item"><div class="label">Payment Method</div><div class="value">${receipt.method ? receipt.method.toUpperCase() : '—'}</div></div>
        <div class="info-item"><div class="label">Transaction ID / UTR</div><div class="value">${receipt.transaction_number || '—'}</div></div>
        <div class="info-item"><div class="label">Fee Type</div><div class="value">${receipt.fee_type || 'General Fee'}</div></div>
        <div class="info-item"><div class="label">Verified By</div><div class="value">${receipt.collected_by?.name || receipt.approved_by?.name || '—'}</div></div>
        ${(receipt.status === 'COMPLETED' || receipt.status === 'APPROVED' || receipt.status === 'PAID') ? `
        <div class="info-item"><div class="label">Verification Time</div><div class="value">${formatDateTime(receipt.updated_at)}</div></div>
        ` : ''}
      </div>
    </div>
    <div class="amount-section">
      <div class="amount-row"><div class="label">Amount</div><div class="value">${formatCurrency(receipt.amount)}</div></div>
      ${receipt.discount > 0 ? `<div class="amount-row"><div class="label">Discount</div><div class="value" style="color: #16a34a;">-${formatCurrency(receipt.discount)}</div></div>` : ''}
      ${receipt.remaining_balance !== undefined && receipt.remaining_balance > 0 ? `<div class="amount-row"><div class="label">Remaining Balance</div><div class="value" style="color: #dc2626;">${formatCurrency(receipt.remaining_balance)}</div></div>` : ''}
      <div class="amount-row total"><div class="label">Total Paid</div><div class="value">${formatCurrency(parseFloat(receipt.amount) - parseFloat(receipt.discount || 0))}</div></div>
    </div>
    ${receipt.remarks ? `<div class="section"><div class="section-title">Remarks</div><div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;"><p style="font-size: 13px; color: #1e293b;">${receipt.remarks}</p></div></div>` : ''}
    <div class="footer">
      <p style="font-size: 13px; font-weight: 500; color: #475569;">Thank you for your payment.</p>
      <p style="font-size: 11px; color: #94a3b8;">Generated by Sports Academy Pro</p>
    </div>
  </div>
</body>
</html>`;

    return html;
  };

  // --- Animation Variants ---
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="relative min-h-screen w-full bg-transparent p-4 sm:p-6 lg:p-8 space-y-8 font-sans overflow-hidden">
      
      {/* 🌟 Colorful Background Decorative Orbs 🌟 */}
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-emerald-400/10 dark:bg-emerald-500/10 rounded-full blur-[120px] -z-10 pointer-events-none mix-blend-multiply dark:mix-blend-lighten"></div>
      <div className="absolute bottom-0 left-0 w-[30vw] h-[30vw] bg-slate-400/10 dark:bg-slate-600/10 rounded-full blur-[100px] -z-10 pointer-events-none mix-blend-multiply dark:mix-blend-lighten"></div>
      
      {/* Background Pattern */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-[0.03] dark:opacity-[0.02]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="finance-icons" width="200" height="200" patternUnits="userSpaceOnUse" patternTransform="rotate(-15)">
              <g transform="translate(20, 20) scale(1.2)"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M12 6v12M8 10h8M8 14h8" fill="none" stroke="currentColor" strokeWidth="1.5"/></g>
              <g transform="translate(120, 40) scale(1.2)"><rect x="2" y="5" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M2 10h20" fill="none" stroke="currentColor" strokeWidth="1.5"/></g>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#finance-icons)" />
        </svg>
      </div>

      <motion.div className="relative z-10 w-full max-w-7xl mx-auto" initial="hidden" animate="show" variants={containerVariants}>
        
        {/* Global Alert Notification */}
        <AnimatePresence>
          {message.text && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`fixed top-6 right-6 z-50 rounded-2xl px-6 py-4 shadow-2xl border flex items-center gap-3 font-bold ${
                message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/90 dark:border-emerald-700 dark:text-emerald-300' : 
                message.type === 'info' ? 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-900/90 dark:border-slate-700 dark:text-slate-300' : 
                'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/90 dark:border-red-700 dark:text-red-300'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 drop-shadow-sm" /> : message.type === 'info' ? <AlertCircle className="w-5 h-5 drop-shadow-sm" /> : <XCircle className="w-5 h-5 drop-shadow-sm" />}
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🌟 Header Section 🌟 */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 relative mb-8">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 flex items-center gap-3">
              Fee Collection <Sparkles className="w-8 h-8 text-emerald-500 hidden sm:block" />
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base font-medium">
              Submit payment records and effortlessly track fee status for your children.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowReceiptsModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white font-bold text-sm rounded-xl shadow-md transition-all border border-slate-800"
          >
            <Receipt className="w-5 h-5" />
            View Receipts
          </motion.button>
        </motion.div>

        <div className="grid xl:grid-cols-12 gap-8 items-start">
          
          {/* =========================================
              LEFT COLUMN: PAYMENT FORM
              ========================================= */}
          <motion.div variants={itemVariants} className="xl:col-span-5 bg-card/80 backdrop-blur-md border border-border/60 rounded-3xl shadow-xl shadow-emerald-500/5 overflow-hidden relative group">
            {/* Top Gradient Border */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500"></div>
            
            <div className="p-6 border-b border-border/50 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center gap-4">
              <div className="bg-emerald-500 text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <IndianRupee className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight text-foreground">
                  Record Payment
                </h3>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">Securely upload your transaction details</p>
              </div>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-6 space-y-6">
              
              {/* Child Selection */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-2">Search/Select Student *</label>
                <select
                  value={selectedChildId}
                  onChange={(e) => setSelectedChildId(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl p-3.5 text-sm font-semibold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none cursor-pointer transition-all appearance-none hover:border-emerald-300 dark:hover:border-emerald-700"
                >
                  <option value="" disabled>-- Select your child --</option>
                  {children.map((child) => (
                    <option key={child.student_id} value={child.student_id}>
                      {child.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount Input */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-2">Collection Amount *</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-lg group-focus-within:text-emerald-600 transition-colors">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl py-3.5 pl-10 pr-4 text-lg font-black focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:font-medium placeholder:text-muted-foreground/40 hover:border-emerald-300 dark:hover:border-emerald-700"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Custom Payment Method Buttons */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-2">Payment Method *</label>
                <div className="grid grid-cols-2 gap-3">
                  {['upi', 'bank_transfer'].map((method) => {
                    const isSelected = paymentMethod === method;
                    return (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`py-3.5 px-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border capitalize ${
                          isSelected
                            ? 'bg-emerald-500 border-transparent text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-500/30'
                            : 'bg-background text-foreground border-border hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                        }`}
                      >
                        {method === 'upi' ? <span className="text-lg">📱</span> : <span className="text-lg">🏦</span>}
                        {method === 'upi' ? 'UPI' : 'Bank Transfer'}
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* Transaction Number */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-2">
                  Transaction / UTR / Reference Number *
                </label>
                <input
                  type="text"
                  value={transactionNumber}
                  onChange={(e) => {
                    setTransactionNumber(e.target.value);
                    setTransactionError('');
                  }}
                  placeholder="Enter 12-50 character transaction number"
                  className={`w-full bg-background border rounded-xl p-3.5 text-sm font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:font-medium placeholder:text-muted-foreground/40 hover:border-emerald-300 dark:hover:border-emerald-700 ${
                    transactionError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-border'
                  }`}
                />
                {transactionError && (
                  <p className="text-[11px] font-bold text-red-500 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {transactionError}</p>
                )}
                <p className="text-[10px] font-medium text-muted-foreground mt-1.5">Only letters and numbers allowed (12-50 characters)</p>
              </div>

              {/* Attach Proof (Mandatory) */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-2 flex items-center justify-between">
                  <span>Payment Screenshot * <span className="text-red-500">(Required)</span></span>
                </label>
                <div className={`relative w-full border-2 border-dashed rounded-2xl p-8 transition-all duration-300 text-center cursor-pointer group flex flex-col items-center justify-center min-h-[140px] ${
                  proofFile 
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20 shadow-inner' 
                    : 'border-emerald-200 dark:border-emerald-800/50 hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 bg-background/50'
                }`}>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          showBanner('File size must not exceed 5MB', 'error');
                          return;
                        }
                        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
                        if (!allowedTypes.includes(file.type)) {
                          showBanner('Only JPG, JPEG, PNG, and PDF files are allowed', 'error');
                          return;
                        }
                        setProofFile(file);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center justify-center gap-3 relative z-0 pointer-events-none">
                    {proofFile ? (
                      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                        <div className="bg-emerald-100 dark:bg-emerald-800/50 p-3 rounded-full mb-2 shadow-sm">
                          <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300 truncate max-w-[200px]">{proofFile.name}</span>
                        <span className="text-[11px] font-medium text-emerald-600/70 dark:text-emerald-400/70 mt-1">Tap to change file</span>
                      </motion.div>
                    ) : (
                      <>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-full mb-1 group-hover:scale-110 transition-transform duration-300 group-hover:shadow-md">
                          <UploadCloud className="w-8 h-8 text-emerald-500" />
                        </div>
                        <span className="text-sm font-bold text-foreground">Tap or Drag to upload screenshot</span>
                        <span className="text-[11px] font-medium text-muted-foreground bg-background px-3 py-1 rounded-full border border-border/50">JPG, PNG, or PDF (Max 5MB)</span>
                      </>
                    )}
                  </div>
                </div>
                {proofFile && (
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => setProofFile(null)}
                      className="text-[11px] font-bold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Remove file
                    </button>
                  </div>
                )}
              </div>

              {/* Remarks Textarea */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-2">Remarks (Optional)</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows="2"
                  className="w-full bg-background border border-border rounded-xl p-3.5 text-sm font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all resize-none placeholder:text-muted-foreground/40 hover:border-emerald-300 dark:hover:border-emerald-700"
                  placeholder="Any extra details about this payment..."
                />
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-base py-4 rounded-xl shadow-xl shadow-emerald-500/30 transition-all disabled:opacity-70 flex justify-center items-center gap-3 border border-emerald-400/20 relative overflow-hidden"
              >
                {/* Shine effect overlay */}
                <div className="absolute inset-0 bg-white/20 -skew-x-12 -translate-x-full hover:animate-[shimmer_1s_forwards]"></div>
                
                {submitting ? (
                 <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Processing...</>
                ) : (
                  <>Submit Payment <CheckCircle2 className="w-5 h-5" /></>
                )}
              </motion.button>
            </form>
          </motion.div>

          {/* =========================================
              RIGHT COLUMN: LIVE SUBMISSIONS TABLE
              ========================================= */}
          <motion.div variants={itemVariants} className="xl:col-span-7 bg-card/80 backdrop-blur-md border border-border/60 rounded-3xl shadow-xl shadow-slate-500/5 overflow-hidden relative group flex flex-col h-full min-h-[500px]">
            {/* Top Gradient Border */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-800 dark:bg-slate-500"></div>
            
            <div className="p-6 border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/20">
              <div className="flex items-center gap-4">
                <div className="bg-slate-800 dark:bg-slate-700 text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-slate-500/20">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight text-foreground">
                    Recent Payments
                  </h3>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mt-1">
                    Tracking history for <span className="text-foreground">{children.find(c => c.student_id == selectedChildId)?.name || 'student'}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto custom-scrollbar bg-background/30">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader />
                </div>
              ) : submissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-4 bg-gradient-to-b from-transparent to-slate-50/30 dark:to-slate-900/10">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-inner">
                    <span className="text-4xl block">📭</span>
                  </div>
                  <p className="text-foreground text-lg font-bold">No recent submissions</p>
                  <p className="text-muted-foreground text-sm font-medium mt-1 max-w-xs">Payments recorded for this student will dynamically appear here.</p>
                </div>
              ) : (
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-surface/80 border-b border-border">
                    <tr className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <th className="p-4 pl-6 text-slate-800 dark:text-slate-200">Student Info</th>
                      <th className="p-4 text-slate-800 dark:text-slate-200">Amount</th>
                      <th className="p-4 text-center text-slate-800 dark:text-slate-200">Method</th>
                      <th className="p-4 text-center text-slate-800 dark:text-slate-200">Status</th>
                      <th className="p-4 pr-6 text-right text-slate-800 dark:text-slate-200">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {submissions.map((payment) => {
                      const isCompleted = payment.status === 'COMPLETED' || payment.status === 'APPROVED' || payment.status === 'PAID';
                      const isPending = payment.status === 'PENDING' || payment.status === 'PENDING_VERIFICATION';
                      const isRejected = payment.status === 'REJECTED';
                      
                      return (
                        <tr key={payment.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-colors group/row">
                          <td className="p-4 pl-6">
                            <div className="font-bold text-foreground text-sm flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] text-slate-700 dark:text-slate-300 font-bold uppercase">
                                {payment.student_name?.[0] || 'S'}
                              </div>
                              {payment.student_name}
                            </div>
                            {payment.remarks && <p className="text-[10px] font-medium text-muted-foreground mt-1 truncate max-w-[140px] italic pl-8">"{payment.remarks}"</p>}
                          </td>
                          <td className="p-4">
                            <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-100 dark:border-emerald-500/20">
                              ₹{Number(payment.amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="bg-background border border-border shadow-sm text-foreground/80 px-3 py-1 rounded-lg text-[11px] font-bold capitalize inline-flex items-center gap-1.5">
                              {payment.method === 'upi' ? '📱' : '🏦'} {payment.method || '—'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider uppercase border shadow-sm ${
                              isCompleted 
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/30' 
                                : isRejected
                                ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-500/30'
                                : isPending
                                ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-500/30'
                                : 'bg-surface text-muted-foreground border-border'
                            }`}>
                              {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                              {isRejected && <XCircle className="w-3.5 h-3.5" />}
                              {isPending && <Clock className="w-3.5 h-3.5" />}
                              {payment.status}
                            </span>
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <div className="flex flex-col items-end gap-2">
                              {isRejected && payment.rejected_reason && (
                                <p className="text-[10px] text-red-500 font-bold max-w-[150px] text-right bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded-md">Note: {payment.rejected_reason}</p>
                              )}
                              
                              {/* Action Buttons */}
                              {payment.pdf_url || payment.proof_url ? (
                                <div className="flex items-center gap-2">
                                  {isCompleted && (
                                    <motion.button
                                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                      onClick={() => handleViewReceipt(payment)}
                                      className="text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white shadow-sm px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
                                    >
                                      <Receipt className="w-3.5 h-3.5" /> Receipt
                                    </motion.button>
                                  )}
                                  {isPending && (
                                    <label className="cursor-pointer text-[11px] font-bold bg-background shadow-sm border border-border text-foreground px-3 py-1.5 rounded-lg hover:border-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1">
                                      <UploadCloud className="w-3.5 h-3.5" /> Replace
                                      <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            setProofFileForReplace(file);
                                            setReplacingPaymentId(payment.id);
                                          }
                                        }}
                                      />
                                    </label>
                                  )}
                                </div>
                              ) : isPending ? (
                                <label className="cursor-pointer text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm px-4 py-2 rounded-lg transition-all flex items-center gap-1.5">
                                  <UploadCloud className="w-3.5 h-3.5" /> Upload Proof
                                  <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        setProofFileForReplace(file);
                                        setReplacingPaymentId(payment.id);
                                      }
                                    }}
                                  />
                                </label>
                              ) : null}

                              {/* Active Replacement File State */}
                              <AnimatePresence>
                                {replacingPaymentId === payment.id && proofFileForReplace && (
                                  <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col gap-2 items-end mt-2 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 w-full justify-end shadow-inner">
                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                                      📄 {proofFileForReplace.name}
                                    </span>
                                    <div className="flex gap-2 w-full justify-end">
                                      <button onClick={() => { setProofFileForReplace(null); setReplacingPaymentId(null); }} className="text-[10px] font-bold text-muted-foreground hover:text-red-500 bg-background px-2 py-1 rounded border border-border">Cancel</button>
                                      <motion.button
                                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                        onClick={() => handleUploadProof(payment.id)}
                                        disabled={uploadingProof}
                                        className="text-[10px] font-bold bg-slate-900 text-white px-3 py-1 rounded border border-slate-800 shadow-sm disabled:opacity-50 flex items-center gap-1"
                                      >
                                        {uploadingProof ? 'Uploading...' : 'Save File'}
                                      </motion.button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>

        </div>
      </motion.div>

      {/* 🌟 Receipts List Modal 🌟 */}
      <AnimatePresence>
        {showReceiptsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setShowReceiptsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-card border border-border rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-900 dark:bg-slate-800 text-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/10">
                    <Receipt className="w-6 h-6 text-white drop-shadow-md" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black drop-shadow-sm">Approved Receipts</h2>
                    <p className="text-xs font-medium text-slate-300 uppercase tracking-wider mt-0.5">Your payment history</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReceiptsModal(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-background/50">
                {loadingReceipt ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader />
                  </div>
                ) : approvedReceipts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                    <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                      <span className="text-5xl block">📄</span>
                    </div>
                    <p className="text-foreground text-lg font-bold">No approved receipts yet.</p>
                    <p className="text-muted-foreground text-xs font-medium mt-1">Once your payments are verified, receipts will appear here.</p>
                  </div>
                ) : (
                  <div className="grid gap-5 md:grid-cols-2">
                    {approvedReceipts.map((receipt) => (
                      <motion.div
                        key={receipt.id || receipt.receipt_id}
                        whileHover={{ y: -4, scale: 1.01 }}
                        className="bg-card border border-border/80 rounded-2xl p-0 shadow-lg hover:shadow-xl transition-all overflow-hidden relative group"
                      >
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-800 dark:bg-slate-600"></div>
                        <div className="p-5 pl-7">
                          <div className="flex items-start justify-between mb-5 border-b border-border/50 pb-4">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Receipt No.</span>
                              <span className="text-base font-black text-foreground">
                                {receipt.receipt_number || `#${receipt.id}`}
                              </span>
                            </div>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm">
                              <CheckCircle2 className="w-3 h-3" /> Approved
                            </span>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="flex justify-between items-end bg-surface p-3 rounded-xl border border-border/50">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Amount Paid</span>
                                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <IndianRupee className="w-5 h-5" />
                                  {parseFloat(receipt.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Date</span>
                                <span className="font-bold text-foreground text-sm bg-background px-2 py-1 rounded-md border border-border shadow-sm">{formatDate(receipt.payment_date || receipt.created_at)}</span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 text-xs pl-1">
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">Method</span>
                                <span className="font-bold text-foreground flex items-center gap-1.5">
                                  {receipt.method === 'upi' ? '📱' : '🏦'} {receipt.method?.toUpperCase() || '—'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">Student</span>
                                <span className="font-bold text-foreground truncate block pr-2">{receipt.student_name || '—'}</span>
                              </div>
                            </div>
                            
                            <div className="flex gap-3 pt-3 mt-2 border-t border-border/50">
                              <button
                                onClick={() => handleViewReceipt(receipt)}
                                className="flex-1 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                              >
                                <Receipt className="w-4 h-4" /> View Details
                              </button>
                              <button
                                onClick={() => handleDownloadReceipt(receipt)}
                                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white shadow-md py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                              >
                                <Download className="w-4 h-4" /> Download
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🌟 Single Receipt Preview Modal 🌟 */}
      <AnimatePresence>
        {modalReceipt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setModalReceipt(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-card border border-border rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-border bg-slate-900 dark:bg-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-white/10 p-2 rounded-xl border border-white/10">
                    <Receipt className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-black text-white">Digital Receipt</h2>
                </div>
                <button
                  onClick={() => setModalReceipt(null)}
                  className="p-2 bg-white/10 hover:bg-red-500 hover:text-white text-slate-300 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content - Styled like a premium ticket */}
              <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 bg-background/50">
                <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm">
                  {/* Academy Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-8 pb-6 border-b border-border/80 border-dashed">
                    <div className="flex items-center gap-4">
                      {modalReceipt.academy?.logo_url && (
                        <div className="w-16 h-16 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                          <img
                            src={modalReceipt.academy.logo_url}
                            alt={modalReceipt.academy.name}
                            className="w-full h-full object-contain rounded-lg"
                          />
                        </div>
                      )}
                      <div>
                        <h3 className="text-xl font-black text-foreground">{modalReceipt.academy?.name || 'Sports Academy'}</h3>
                        <p className="text-xs font-semibold text-muted-foreground mt-1">{modalReceipt.academy?.address || 'Address not provided'}</p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right bg-surface px-4 py-3 rounded-xl border border-border">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Receipt Number</p>
                      <p className="text-lg font-black text-foreground mb-1">{modalReceipt.receipt_number || '—'}</p>
                      <p className="text-xs font-semibold text-muted-foreground">{formatDate(modalReceipt.created_at)}</p>
                    </div>
                  </div>

                  {/* Verified Badge */}
                  <div className="mb-8 flex justify-center">
                    <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/50 font-black text-sm uppercase shadow-sm">
                      <CheckCircle2 className="w-5 h-5" />
                      Payment Verified Successfully
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid sm:grid-cols-2 gap-6 mb-8">
                    {/* Student Details */}
                    <div>
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> Student Details
                      </h4>
                      <div className="bg-surface p-4 rounded-xl border border-border space-y-3">
                        <div className="flex justify-between border-b border-border/50 pb-2">
                          <span className="text-xs font-bold text-muted-foreground">Name</span>
                          <span className="text-xs font-black text-foreground">{modalReceipt.student?.name || '—'}</span>
                        </div>
                        <div className="flex justify-between border-b border-border/50 pb-2">
                          <span className="text-xs font-bold text-muted-foreground">Sport</span>
                          <span className="text-xs font-black text-foreground">{modalReceipt.sport?.name || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs font-bold text-muted-foreground">Batch</span>
                          <span className="text-xs font-black text-foreground">{modalReceipt.batch?.name || '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Details */}
                    <div>
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> Transaction Info
                      </h4>
                      <div className="bg-surface p-4 rounded-xl border border-border space-y-3">
                        <div className="flex justify-between border-b border-border/50 pb-2">
                          <span className="text-xs font-bold text-muted-foreground">Date & Time</span>
                          <span className="text-xs font-black text-foreground">{formatDateTime(modalReceipt.payment_date)}</span>
                        </div>
                        <div className="flex justify-between border-b border-border/50 pb-2">
                          <span className="text-xs font-bold text-muted-foreground">Method</span>
                          <span className="text-xs font-black text-foreground uppercase">{modalReceipt.method || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs font-bold text-muted-foreground">Ref / UTR</span>
                          <span className="text-xs font-black text-foreground">{modalReceipt.transaction_number || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Amount Section */}
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-800 mb-6 shadow-inner">
                    <div className="space-y-3 mb-4 border-b border-emerald-200/50 dark:border-emerald-800/50 pb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Base Amount</span>
                        <span className="text-base font-black text-foreground">{formatCurrency(modalReceipt.amount)}</span>
                      </div>
                      {modalReceipt.discount > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Discount Applied</span>
                          <span className="text-base font-black text-emerald-600 bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded">-{formatCurrency(modalReceipt.discount)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-base font-black text-foreground uppercase tracking-wider">Total Paid</span>
                      <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 drop-shadow-sm">{formatCurrency(parseFloat(modalReceipt.amount) - parseFloat(modalReceipt.discount || 0))}</span>
                    </div>
                  </div>

                  {modalReceipt.remarks && (
                    <div className="mb-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Remarks / Notes</h4>
                      <div className="bg-slate-50 dark:bg-slate-900/10 p-4 rounded-xl border border-slate-200 dark:border-slate-800/50">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 italic">"{modalReceipt.remarks}"</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-5 border-t border-border bg-surface shrink-0">
                <button
                  onClick={() => {
                    const printContent = generateReceiptPDF(modalReceipt);
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(printContent);
                      printWindow.document.close();
                      printWindow.onload = () => {
                        printWindow.print();
                      };
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-800 bg-white border border-slate-300 shadow-sm hover:bg-slate-100 transition-all flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={() => {
                    handleDownloadReceipt(modalReceipt);
                    setModalReceipt(null);
                  }}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Save PDF
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}