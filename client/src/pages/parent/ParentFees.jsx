import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { IndianRupee, UploadCloud, CheckCircle2, AlertCircle, XCircle, CreditCard, Receipt, Check, Clock, Download, Share2, Printer, X } from 'lucide-react';
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

  const handleShareReceipt = async (receipt) => {
    try {
      const shareData = {
        title: `Receipt ${receipt.receipt_number || receipt.id}`,
        text: `Payment receipt for ₹${parseFloat(receipt.amount).toLocaleString('en-IN')} - ${receipt.student_name || 'Student'}`,
      };

      if (navigator.share) {
        await navigator.share(shareData);
        showBanner('Receipt shared successfully', 'success');
      } else {
        const textToCopy = `${shareData.title}\n${shareData.text}\nDate: ${formatDate(receipt.payment_date || receipt.created_at)}\nMethod: ${receipt.method?.toUpperCase() || '—'}\nTransaction ID: ${receipt.transaction_number || '—'}`;
        await navigator.clipboard.writeText(textToCopy);
        showBanner('Receipt details copied to clipboard', 'success');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      showBanner('Failed to share receipt', 'error');
    }
  };

  const handleOpenReceipt = (payment) => {
    const fileUrl = payment.pdf_url || payment.proof_url;
    if (!fileUrl) {
      showBanner('Receipt will be available here once the payment is approved.', 'info');
      return;
    }

    const fullUrl = fileUrl.startsWith('http') ? fileUrl : `http://localhost:5000/${fileUrl}`;
    window.open(fullUrl, '_blank');
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

  const getStatusInfo = (status) => {
    const statusMap = {
      'PENDING_VERIFICATION': { label: 'Pending Verification', color: 'amber', icon: Clock },
      'APPROVED': { label: 'Approved', color: 'emerald', icon: CheckCircle2 },
      'REJECTED': { label: 'Rejected', color: 'red', icon: XCircle },
      'NEED_REUPLOAD': { label: 'Re-upload Required', color: 'orange', icon: AlertCircle },
      'PAID': { label: 'Paid', color: 'blue', icon: CheckCircle2 },
      'COMPLETED': { label: 'Completed', color: 'green', icon: CheckCircle2 },
      'FAILED': { label: 'Failed', color: 'red', icon: XCircle },
      'VOID': { label: 'Void', color: 'gray', icon: XCircle },
      'PENDING': { label: 'Pending', color: 'amber', icon: Clock },
    };
    return statusMap[status] || { label: status, color: 'gray', icon: Clock };
  };

  const approvedReceipts = submissions.filter((payment) => {
    return payment.status === 'COMPLETED' || payment.status === 'APPROVED' || payment.status === 'PAID';
  });

  const generateReceiptPDF = (receipt) => {
    const formatDate = (date) => {
      if (!date) return '—';
      return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    };

    const formatDateTime = (date) => {
      if (!date) return '—';
      return new Date(date).toLocaleString('en-IN', {
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

    const getStatusLabel = (status) => {
      const statusMap = {
        'PENDING_VERIFICATION': 'Pending Verification',
        'APPROVED': 'Approved',
        'REJECTED': 'Rejected',
        'NEED_REUPLOAD': 'Re-upload Required',
        'PAID': 'Paid',
        'COMPLETED': 'Completed',
        'FAILED': 'Failed',
        'VOID': 'Void',
      };
      return statusMap[status] || status;
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

    <div class="verified-badge" style="margin: 15px 0;">
      ✓ Payment Verified & Completed
    </div>

    <div class="section">
      <div class="section-title">Student Details</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="label">Student Name</div>
          <div class="value">${receipt.student?.name || '—'}</div>
        </div>
        <div class="info-item">
          <div class="label">Parent Name</div>
          <div class="value">${receipt.student?.parent_name || '—'}</div>
        </div>
        <div class="info-item">
          <div class="label">Sport</div>
          <div class="value">${receipt.sport?.name || '—'}</div>
        </div>
        <div class="info-item">
          <div class="label">Batch</div>
          <div class="value">${receipt.batch?.name || '—'}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Payment Details</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="label">Payment Date & Time</div>
          <div class="value">${formatDateTime(receipt.payment_date)}</div>
        </div>
        <div class="info-item">
          <div class="label">Payment Method</div>
          <div class="value">${receipt.method ? receipt.method.toUpperCase() : '—'}</div>
        </div>
        <div class="info-item">
          <div class="label">Transaction ID / UTR</div>
          <div class="value">${receipt.transaction_number || '—'}</div>
        </div>
        <div class="info-item">
          <div class="label">Fee Type</div>
          <div class="value">${receipt.fee_type || 'General Fee'}</div>
        </div>
        <div class="info-item">
          <div class="label">Verified By</div>
          <div class="value">${receipt.collected_by?.name || receipt.approved_by?.name || '—'}</div>
        </div>
        ${(receipt.status === 'COMPLETED' || receipt.status === 'APPROVED' || receipt.status === 'PAID') ? `
        <div class="info-item">
          <div class="label">Verification Time</div>
          <div class="value">${formatDateTime(receipt.updated_at)}</div>
        </div>
        ` : ''}
      </div>
    </div>

    <div class="amount-section">
      <div class="amount-row">
        <div class="label">Amount</div>
        <div class="value">${formatCurrency(receipt.amount)}</div>
      </div>
      ${receipt.discount > 0 ? `
      <div class="amount-row">
        <div class="label">Discount</div>
        <div class="value" style="color: #16a34a;">-${formatCurrency(receipt.discount)}</div>
      </div>
      ` : ''}
      ${receipt.remaining_balance !== undefined && receipt.remaining_balance > 0 ? `
      <div class="amount-row">
        <div class="label">Remaining Balance</div>
        <div class="value" style="color: #dc2626;">${formatCurrency(receipt.remaining_balance)}</div>
      </div>
      ` : ''}
      <div class="amount-row total">
        <div class="label">Total Paid</div>
        <div class="value">${formatCurrency(parseFloat(receipt.amount) - parseFloat(receipt.discount || 0))}</div>
      </div>
    </div>

    ${receipt.remarks ? `
    <div class="section">
      <div class="section-title">Remarks</div>
      <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
        <p style="font-size: 13px; color: #1e293b;">${receipt.remarks}</p>
      </div>
    </div>
    ` : ''}

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
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="relative min-h-screen w-full bg-transparent p-4 sm:p-6 lg:p-8 space-y-8 font-sans">
      
      {/* Background Decorators */}
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
              className={`fixed top-6 right-6 z-50 rounded-xl px-6 py-4 shadow-xl border flex items-center gap-3 font-bold ${
                message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/90 dark:border-emerald-700 dark:text-emerald-300' : 
                message.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/90 dark:border-blue-700 dark:text-blue-300' : 
                'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/90 dark:border-rose-700 dark:text-rose-300'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : message.type === 'info' ? <AlertCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/50 pb-6 relative mb-8">
          <div className="absolute top-0 left-0 w-48 h-48 bg-emerald-500/20 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
              Fee Collection
            </h1>
            <p className="text-muted-foreground mt-2 text-sm font-medium">
              Submit payment records and track fee status for your children.
            </p>
          </div>
          <button
            onClick={() => setShowReceiptsModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm rounded-xl shadow-md transition-all"
          >
            <Receipt className="w-4 h-4" />
            View Receipts
          </button>
        </motion.div>

        <div className="grid xl:grid-cols-12 gap-8 items-start">
          
          {/* =========================================
              LEFT COLUMN: PAYMENT FORM
              ========================================= */}
          <motion.div variants={itemVariants} className="xl:col-span-5 bg-card border border-border rounded-2xl shadow-sm overflow-hidden relative group">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
            
            <div className="p-6 border-b border-border/50 bg-surface/30 flex items-center gap-3">
              <div className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm border border-emerald-200 dark:border-emerald-800">
                <IndianRupee className="w-4 h-4" />
              </div>
              <h3 className="text-xl font-black tracking-tight text-foreground">
                Record Payment
              </h3>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-6 space-y-6 bg-background/30">
              
              {/* Child Selection */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">Search/Select Student *</label>
                <select
                  value={selectedChildId}
                  onChange={(e) => setSelectedChildId(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl p-3.5 text-sm font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer transition-all appearance-none"
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
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">Collection Amount *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground font-black">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl py-3.5 pl-9 pr-4 text-base font-black focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:font-medium placeholder:text-muted-foreground/50"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Custom Payment Method Buttons */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">Payment Method *</label>
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
                        className={`py-3 px-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border capitalize ${
                          isSelected
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)]'
                            : 'bg-surface text-foreground border-border hover:border-emerald-300 shadow-sm'
                        }`}
                      >
                        {method === 'upi' && '�'}
                        {method === 'bank_transfer' && '🏦'}
                        {method === 'upi' ? 'UPI' : 'Bank Transfer'}
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* Transaction Number */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
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
                  className={`w-full bg-surface border rounded-xl p-3.5 text-sm font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-muted-foreground/50 ${
                    transactionError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-border'
                  }`}
                />
                {transactionError && (
                  <p className="text-[10px] font-bold text-red-500 mt-1">{transactionError}</p>
                )}
                <p className="text-[10px] font-medium text-muted-foreground mt-1">Only letters and numbers allowed (12-50 characters)</p>
              </div>

              {/* Attach Proof (Mandatory) */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                  Payment Screenshot * <span className="text-red-500">(Required)</span>
                </label>
                <div className={`relative w-full border-2 border-dashed rounded-xl p-6 transition-colors text-center cursor-pointer group ${
                  proofFile 
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' 
                    : 'border-border hover:border-emerald-400 bg-surface'
                }`}>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Validate file size (5MB max)
                        if (file.size > 5 * 1024 * 1024) {
                          showBanner('File size must not exceed 5MB', 'error');
                          return;
                        }
                        // Validate file type
                        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
                        if (!allowedTypes.includes(file.type)) {
                          showBanner('Only JPG, JPEG, PNG, and PDF files are allowed', 'error');
                          return;
                        }
                        setProofFile(file);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    {proofFile ? (
                      <>
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{proofFile.name}</span>
                        <span className="text-[10px] font-medium text-muted-foreground">Click to change</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-8 h-8 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                        <span className="text-xs font-bold text-foreground">Tap to upload screenshot</span>
                        <span className="text-[10px] font-medium text-muted-foreground">JPG, JPEG, PNG, or PDF (Max 5MB)</span>
                      </>
                    )}
                  </div>
                </div>
                {proofFile && (
                  <button
                    type="button"
                    onClick={() => setProofFile(null)}
                    className="mt-2 text-[10px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1"
                  >
                    <XCircle className="w-3 h-3" /> Remove file
                  </button>
                )}
              </div>

              {/* Remarks Textarea */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">Remarks (Optional)</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows="2"
                  className="w-full bg-surface border border-border rounded-xl p-3.5 text-sm font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all resize-none placeholder:text-muted-foreground/50"
                  placeholder="Internal notes or transaction ID..."
                />
              </div>

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

          {/* =========================================
              RIGHT COLUMN: LIVE SUBMISSIONS TABLE
              ========================================= */}
          <motion.div variants={itemVariants} className="xl:col-span-7 bg-card border border-border rounded-2xl shadow-sm overflow-hidden relative group flex flex-col h-full min-h-[500px]">
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
            
            <div className="p-6 border-b border-border/50 bg-surface/30">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm border border-blue-200 dark:border-blue-800">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight text-foreground">
                    Recent Payments
                  </h3>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
                    Track status of fees recorded for {children.find(c => c.student_id == selectedChildId)?.name || 'student'}
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
                <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                  <span className="text-4xl opacity-40 mb-3 block">📭</span>
                  <p className="text-muted-foreground text-sm font-semibold">No recent fee submissions found.</p>
                  <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider mt-1">Payments recorded will appear here.</p>
                </div>
              ) : (
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-surface-secondary/80 border-b border-border">
                    <tr className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      <th className="p-4 pl-6">Student</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4 text-center">Method</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {submissions.map((payment) => {
                      const isCompleted = payment.status === 'COMPLETED' || payment.status === 'APPROVED' || payment.status === 'PAID';
                      const isPending = payment.status === 'PENDING' || payment.status === 'PENDING_VERIFICATION';
                      const isRejected = payment.status === 'REJECTED';
                      
                      return (
                        <tr key={payment.id} className="hover:bg-surface-secondary/40 transition-colors">
                          <td className="p-4 pl-6 font-bold text-foreground text-sm">
                            {payment.student_name}
                            {payment.remarks && <p className="text-[10px] font-medium text-muted-foreground mt-0.5 truncate max-w-[120px] italic">"{payment.remarks}"</p>}
                          </td>
                          <td className="p-4 font-black text-foreground">
                            ₹{Number(payment.amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                          </td>
                          <td className="p-4 text-center">
                            <span className="bg-surface border border-border text-foreground/80 px-2.5 py-1 rounded-md text-[11px] font-bold capitalize">
                              {payment.method || '—'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase border ${
                              isCompleted 
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                                : isRejected
                                ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                                : isPending
                                ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                                : 'bg-surface text-muted-foreground border-border'
                            }`}>
                              {isCompleted && <Check className="w-3 h-3" />}
                              {isRejected && <XCircle className="w-3 h-3" />}
                              {isPending && <Clock className="w-3 h-3" />}
                              {payment.status}
                            </span>
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <div className="flex flex-col items-end gap-1.5">
                              {isRejected && payment.rejected_reason && (
                                <p className="text-[10px] text-red-500 font-medium max-w-[150px] text-right">{payment.rejected_reason}</p>
                              )}
                              {/* Open Receipt / Upload Proof Buttons */}
                              {payment.pdf_url || payment.proof_url ? (
                                <div className="flex items-center gap-2">
                                  {isCompleted && (
                                    <motion.button
                                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                      onClick={() => handleViewReceipt(payment)}
                                      className="text-[11px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 px-3 py-1.5 rounded-md hover:bg-blue-100 transition-colors"
                                    >
                                      View Receipt
                                    </motion.button>
                                  )}
                                  {isPending && (
                                    <label className="cursor-pointer text-[11px] font-bold bg-surface border border-border text-muted-foreground px-3 py-1.5 rounded-md hover:text-foreground hover:border-foreground/30 transition-colors">
                                      Replace
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
                                <label className="cursor-pointer text-[11px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-3 py-1.5 rounded-md hover:bg-emerald-100 transition-colors">
                                  Upload Proof
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
                                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="flex gap-2 items-center mt-1 bg-surface p-1.5 rounded-lg border border-border w-full justify-end">
                                    <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[80px]">
                                      {proofFileForReplace.name}
                                    </span>
                                    <motion.button
                                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                      onClick={() => handleUploadProof(payment.id)}
                                      disabled={uploadingProof}
                                      className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-1 rounded shadow-sm disabled:opacity-50"
                                    >
                                      {uploadingProof ? '...' : 'Save'}
                                    </motion.button>
                                    <button onClick={() => { setProofFileForReplace(null); setReplacingPaymentId(null); }} className="text-muted-foreground hover:text-foreground p-0.5">✕</button>
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

      {/* Receipts List Modal */}
      <AnimatePresence>
        {showReceiptsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowReceiptsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-border bg-surface">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-500" />
                  <h2 className="text-lg font-bold text-foreground">Approved Receipts</h2>
                </div>
                <button
                  onClick={() => setShowReceiptsModal(false)}
                  className="p-2 hover:bg-surface rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {loadingReceipt ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader />
                  </div>
                ) : approvedReceipts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                    <span className="text-4xl opacity-40 mb-3 block">📄</span>
                    <p className="text-muted-foreground text-sm font-semibold">No approved receipts found.</p>
                    <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider mt-1">Approved payments will appear here.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {approvedReceipts.map((receipt) => (
                      <motion.div
                        key={receipt.id || receipt.receipt_id}
                        whileHover={{ y: -4 }}
                        className="bg-surface border border-border rounded-xl p-5 hover:shadow-lg transition-all"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Receipt className="w-5 h-5 text-blue-500" />
                            <span className="text-sm font-black text-foreground">
                              {receipt.receipt_number || `#${receipt.id}`}
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase border bg-emerald-50 text-emerald-600 border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Approved
                          </span>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Amount</span>
                            <span className="text-lg font-black text-foreground flex items-center gap-1">
                              <IndianRupee className="w-4 h-4" />
                              {parseFloat(receipt.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Date</span>
                              <span className="font-semibold text-foreground">{formatDate(receipt.payment_date || receipt.created_at)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Method</span>
                              <span className="font-semibold text-foreground">{receipt.method?.toUpperCase() || '—'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Student</span>
                              <span className="font-semibold text-foreground">{receipt.student_name || '—'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Status</span>
                              <span className="font-semibold text-emerald-600">Completed</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => handleViewReceipt(receipt)}
                              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-600 px-3 py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              View
                            </button>
                            <button
                              onClick={() => handleDownloadReceipt(receipt)}
                              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-600 px-3 py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download
                            </button>
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

      {/* Single Receipt Preview Modal */}
      <AnimatePresence>
        {modalReceipt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setModalReceipt(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-border bg-surface">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-500" />
                  <h2 className="text-lg font-bold text-foreground">Receipt Details</h2>
                </div>
                <button
                  onClick={() => setModalReceipt(null)}
                  className="p-2 hover:bg-surface rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)]">
                {/* Academy Header */}
                <div className="flex items-start gap-5 mb-8 pb-6 border-b border-border">
                  {modalReceipt.academy?.logo_url && (
                    <img
                      src={modalReceipt.academy.logo_url}
                      alt={modalReceipt.academy.name}
                      className="w-24 h-24 object-contain rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-foreground mb-2">{modalReceipt.academy?.name || 'Sports Academy'}</h3>
                    <p className="text-sm text-muted-foreground mb-1">{modalReceipt.academy?.address || ''}</p>
                    <p className="text-sm text-muted-foreground mb-1">Phone: {modalReceipt.academy?.phone_number || '—'}</p>
                    <p className="text-sm text-muted-foreground">Email: {modalReceipt.academy?.email || '—'}</p>
                  </div>
                  <div className="text-right min-w-[180px]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Receipt Number</p>
                    <p className="text-xl font-bold text-foreground mb-3">{modalReceipt.receipt_number || '—'}</p>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Issue Date</p>
                    <p className="text-sm font-semibold text-foreground">{formatDate(modalReceipt.created_at)}</p>
                  </div>
                </div>

                {/* Verified Badge */}
                <div className="mb-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-bold text-sm uppercase">
                  <CheckCircle2 className="w-4 h-4" />
                  Payment Verified & Completed
                </div>

                {/* Student Details */}
                <div className="mb-8">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Student Details</h4>
                  <div className="grid grid-cols-2 gap-5 bg-surface p-5 rounded-xl">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Student Name</p>
                      <p className="text-sm font-semibold text-foreground">{modalReceipt.student?.name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Parent Name</p>
                      <p className="text-sm font-semibold text-foreground">{modalReceipt.student?.parent_name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Sport</p>
                      <p className="text-sm font-semibold text-foreground">{modalReceipt.sport?.name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Batch</p>
                      <p className="text-sm font-semibold text-foreground">{modalReceipt.batch?.name || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="mb-8">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Payment Details</h4>
                  <div className="grid grid-cols-2 gap-5 bg-surface p-5 rounded-xl">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Payment Date & Time</p>
                      <p className="text-sm font-semibold text-foreground">{formatDateTime(modalReceipt.payment_date)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Payment Method</p>
                      <p className="text-sm font-semibold text-foreground">{modalReceipt.method ? modalReceipt.method.toUpperCase() : '—'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Transaction ID / UTR</p>
                      <p className="text-sm font-semibold text-foreground">{modalReceipt.transaction_number || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Fee Type</p>
                      <p className="text-sm font-semibold text-foreground">{modalReceipt.fee_type || 'General Fee'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Verified By</p>
                      <p className="text-sm font-semibold text-foreground">{modalReceipt.collected_by?.name || modalReceipt.approved_by?.name || '—'}</p>
                    </div>
                    {(modalReceipt.status === 'COMPLETED' || modalReceipt.status === 'APPROVED' || modalReceipt.status === 'PAID') && (
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Verification Time</p>
                        <p className="text-sm font-semibold text-foreground">{formatDateTime(modalReceipt.updated_at)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Amount Section */}
                <div className="bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-blue-500/10 dark:to-emerald-500/10 p-6 rounded-xl border border-border mb-8">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-bold text-muted-foreground">Amount</span>
                    <span className="text-lg font-black text-foreground">{formatCurrency(modalReceipt.amount)}</span>
                  </div>
                  {modalReceipt.discount > 0 && (
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-bold text-muted-foreground">Discount</span>
                      <span className="text-lg font-black text-emerald-600">-{formatCurrency(modalReceipt.discount)}</span>
                    </div>
                  )}
                  {modalReceipt.remaining_balance !== undefined && modalReceipt.remaining_balance > 0 && (
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-bold text-muted-foreground">Remaining Balance</span>
                      <span className="text-lg font-black text-red-600">{formatCurrency(modalReceipt.remaining_balance)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-3 border-t border-border mt-3">
                    <span className="text-sm font-bold text-foreground">Total Paid</span>
                    <span className="text-2xl font-black text-emerald-600">{formatCurrency(parseFloat(modalReceipt.amount) - parseFloat(modalReceipt.discount || 0))}</span>
                  </div>
                </div>

                {modalReceipt.remarks && (
                  <div className="mb-8">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Remarks</h4>
                    <div className="bg-surface p-4 rounded-xl border border-border">
                      <p className="text-sm font-semibold text-foreground">{modalReceipt.remarks}</p>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="text-center pt-6 border-t border-border">
                  <p className="text-sm font-semibold text-muted-foreground mb-2">Thank you for your payment.</p>
                  <p className="text-xs text-muted-foreground">Generated by Sports Academy Pro</p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-border bg-surface">
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
                  className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={() => {
                    handleDownloadReceipt(modalReceipt);
                    setModalReceipt(null);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}