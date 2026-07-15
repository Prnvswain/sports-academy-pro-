import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IndianRupee, Receipt, Download, Share2, Calendar, CreditCard, CheckCircle2, AlertCircle, XCircle, Clock, Filter, Printer, X } from 'lucide-react';
import Loader from '../../components/Loader';
import { parentGet } from '../../api/client';

export default function ParentReceipts() {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [statusFilter, setStatusFilter] = useState('all');
  const [previewReceipt, setPreviewReceipt] = useState(null);
  const [modalReceipt, setModalReceipt] = useState(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

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

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const params = selectedChildId ? `?student_id=${selectedChildId}` : '';
      const response = await parentGet(`/parent/payments${params}`);
      const receiptData = response?.data || response || [];
      setReceipts(Array.isArray(receiptData) ? receiptData : []);
    } catch (error) {
      console.error('Failed to fetch receipts:', error);
      showBanner('Unable to load receipts right now.', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedChildId]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  useEffect(() => {
    if (selectedChildId) {
      fetchReceipts();
    }
  }, [selectedChildId, fetchReceipts]);

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
      // Log download event on backend
      await parentGet(`/parent/payments/${receiptId}/download`);
      
      // Generate receipt HTML for printing
      const response = await parentGet(`/parent/payments/${receiptId}`);
      const fullReceipt = response?.data || response;
      
      // Generate printable HTML
      const printContent = generateReceiptPDF(fullReceipt);
      
      // Create a new window for printing
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

  const generateReceiptPDF = (receipt) => {
    // This is a simplified PDF generation using print-friendly HTML
    // In production, you would use a proper PDF library like jsPDF or puppeteer
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

    const getStatusColor = (status) => {
      if (status === 'PAID' || status === 'COMPLETED' || status === 'APPROVED') {
        return '#10b981';
      } else if (status === 'REJECTED' || status === 'FAILED') {
        return '#ef4444';
      } else {
        return '#f59e0b';
      }
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
    }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: #f5f5f5; }
    .receipt-container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #3b82f6; }
    .academy-info { flex: 1; }
    .academy-info h1 { font-size: 28px; font-weight: bold; color: #1f2937; margin-bottom: 8px; }
    .academy-info p { font-size: 13px; color: #6b7280; margin-bottom: 4px; }
    .academy-logo { width: 100px; height: 100px; object-fit: contain; margin-right: 20px; }
    .receipt-number { text-align: right; min-width: 200px; }
    .receipt-number .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
    .receipt-number .value { font-size: 20px; font-weight: bold; color: #1f2937; margin-top: 4px; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 16px; font-weight: bold; color: #374151; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
    .info-item .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .info-item .value { font-size: 14px; color: #1f2937; font-weight: 500; }
    .amount-section { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 25px; border-radius: 12px; margin: 30px 0; border: 2px solid #bae6fd; }
    .amount-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
    .amount-row .label { font-size: 14px; color: #4b5563; }
    .amount-row .value { font-size: 16px; font-weight: 600; color: #1f2937; }
    .amount-row.total { margin-top: 20px; padding-top: 20px; border-top: 2px solid #3b82f6; font-weight: bold; }
    .amount-row.total .label { font-size: 16px; color: #1f2937; }
    .amount-row.total .value { font-size: 24px; color: #3b82f6; }
    .status-badge { display: inline-block; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; }
    .footer p { font-size: 13px; color: #6b7280; margin-bottom: 6px; }
    .seal-placeholder { width: 80px; height: 80px; border: 3px solid #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 20px auto; color: #3b82f6; font-weight: bold; font-size: 10px; text-align: center; text-transform: uppercase; }
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 100px; color: rgba(0,0,0,0.08); font-weight: bold; text-transform: uppercase; pointer-events: none; z-index: 1000; letter-spacing: 5px; }
  </style>
</head>
<body>
  ${receipt.status !== 'PAID' && receipt.status !== 'COMPLETED' && receipt.status !== 'APPROVED' ? '<div class="watermark">Pending Verification</div>' : ''}
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
        <div style="margin-top: 12px;">
          <div class="label">Date & Time</div>
          <div class="value" style="font-size: 14px; font-weight: 500;">${formatDateTime(receipt.created_at)}</div>
        </div>
      </div>
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
          <div class="label">Payment Date</div>
          <div class="value">${formatDate(receipt.payment_date)}</div>
        </div>
        <div class="info-item">
          <div class="label">Payment Method</div>
          <div class="value">${receipt.method ? receipt.method.toUpperCase() : '—'}</div>
        </div>
        <div class="info-item">
          <div class="label">Transaction / UTR Number</div>
          <div class="value">${receipt.transaction_number || '—'}</div>
        </div>
        <div class="info-item">
          <div class="label">Payment Status</div>
          <div class="value"><span class="status-badge" style="background-color: ${getStatusColor(receipt.status)}20; color: ${getStatusColor(receipt.status)}; border: 2px solid ${getStatusColor(receipt.status)};">${getStatusLabel(receipt.status)}</span></div>
        </div>
        <div class="info-item">
          <div class="label">Collected By</div>
          <div class="value">${receipt.collected_by?.name || receipt.approved_by?.name || '—'}</div>
        </div>
        <div class="info-item">
          <div class="label">Remarks</div>
          <div class="value">${receipt.remarks || '—'}</div>
        </div>
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
        <div class="value" style="color: #10b981;">-${formatCurrency(receipt.discount)}</div>
      </div>
      ` : ''}
      ${receipt.additional_charges > 0 ? `
      <div class="amount-row">
        <div class="label">Additional Charges</div>
        <div class="value">+${formatCurrency(receipt.additional_charges)}</div>
      </div>
      ` : ''}
      <div class="amount-row total">
        <div class="label">Total Paid</div>
        <div class="value">${formatCurrency(parseFloat(receipt.amount) - parseFloat(receipt.discount || 0) + parseFloat(receipt.additional_charges || 0))}</div>
      </div>
    </div>

    ${receipt.status === 'PAID' || receipt.status === 'COMPLETED' || receipt.status === 'APPROVED' ? `
    <div class="seal-placeholder">
      <div>Official<br/>Seal</div>
    </div>
    ` : ''}

    <div class="footer">
      <p style="font-weight: bold; color: #1f2937;">Thank you for your payment!</p>
      <p>Generated by Sports Academy Pro</p>
      <p style="font-style: italic; font-size: 11px; margin-top: 10px;">This is a digitally generated receipt. No signature required.</p>
      <p style="font-size: 11px; color: #9ca3af; margin-top: 15px;">Receipt ID: ${receipt.receipt_id || '—'} | Generated: ${formatDateTime(new Date())}</p>
    </div>
  </div>
</body>
</html>
    `;

    return html;
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
        // Fallback: copy receipt details to clipboard
        const textToCopy = `${shareData.title}\n${shareData.text}\nDate: ${formatDate(receipt.payment_date || receipt.created_at)}\nMethod: ${receipt.method?.toUpperCase() || '—'}\nTransaction ID: ${receipt.transaction_number || '—'}`;
        await navigator.clipboard.writeText(textToCopy);
        showBanner('Receipt details copied to clipboard', 'success');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      showBanner('Failed to share receipt', 'error');
    }
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

  const filteredReceipts = receipts.filter((receipt) => {
    if (statusFilter === 'all') return true;
    return receipt.status === statusFilter;
  });

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Animation variants
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
            <pattern id="receipt-icons" width="200" height="200" patternUnits="userSpaceOnUse" patternTransform="rotate(-15)">
              <g transform="translate(20, 20) scale(1.2)"><rect x="2" y="5" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M2 10h20" fill="none" stroke="currentColor" strokeWidth="1.5"/></g>
              <g transform="translate(120, 40) scale(1.2)"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M12 6v12M8 10h8M8 14h8" fill="none" stroke="currentColor" strokeWidth="1.5"/></g>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#receipt-icons)" />
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
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/50 pb-6 relative mb-8">
          <div className="absolute top-0 left-0 w-48 h-48 bg-blue-500/20 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
              <Receipt className="w-8 h-8 text-blue-500" />
              My Receipts
            </h1>
            <p className="text-muted-foreground mt-2 text-sm font-medium">
              View and download your payment receipts.
            </p>
          </div>

          {/* Child Selector */}
          <div className="flex items-center gap-3">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Student:</label>
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="bg-surface border border-border rounded-xl px-4 py-2 text-sm font-semibold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer transition-all"
            >
              {children.map((child) => (
                <option key={child.student_id} value={child.student_id}>
                  {child.name}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Filter:</span>
          </div>
          {['all', 'PAID', 'COMPLETED', 'PENDING_VERIFICATION', 'REJECTED'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all capitalize ${
                statusFilter === filter
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-surface text-foreground border border-border hover:border-blue-300'
              }`}
            >
              {filter.replace('_', ' ')}
            </button>
          ))}
        </motion.div>

        {/* Receipts Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader />
          </div>
        ) : filteredReceipts.length === 0 ? (
          <motion.div variants={itemVariants} className="flex flex-col items-center justify-center h-64 text-center px-4 bg-card border border-border rounded-2xl">
            <Receipt className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm font-semibold">No receipts found.</p>
            <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider mt-1">
              {statusFilter !== 'all' ? 'Try a different filter or' : ''} Your payment receipts will appear here.
            </p>
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredReceipts.map((receipt) => {
              const statusInfo = getStatusInfo(receipt.status);
              const StatusIcon = statusInfo.icon;
              
              return (
                <motion.div
                  key={receipt.id || receipt.receipt_id}
                  whileHover={{ y: -4 }}
                  className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-all"
                >
                  {/* Card Header */}
                  <div className={`p-4 border-b border-border/50 bg-surface/30 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-blue-500" />
                      <span className="text-sm font-black text-foreground">
                        {receipt.receipt_number || `#${receipt.id}`}
                      </span>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase border bg-${statusInfo.color}-50 text-${statusInfo.color}-600 border-${statusInfo.color}-200`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-4">
                    {/* Amount */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Amount</span>
                      <span className="text-lg font-black text-foreground flex items-center gap-1">
                        <IndianRupee className="w-4 h-4" />
                        {parseFloat(receipt.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Date</span>
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(receipt.payment_date || receipt.created_at)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Method</span>
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                          <CreditCard className="w-3 h-3" />
                          {receipt.method ? receipt.method.toUpperCase() : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Student</span>
                        <span className="text-xs font-semibold text-foreground truncate">
                          {receipt.student_name || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Transaction</span>
                        <span className="text-xs font-semibold text-foreground truncate">
                          {receipt.transaction_number || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Collected By</span>
                        <span className="text-xs font-semibold text-foreground truncate">
                          {receipt.collected_by_name || receipt.approved_by_name || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Receipt No</span>
                        <span className="text-xs font-semibold text-foreground truncate">
                          {receipt.receipt_number || '—'}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleViewReceipt(receipt)}
                        className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 px-3 py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        View
                      </button>
                      <button
                        onClick={() => handleDownloadReceipt(receipt)}
                        disabled={receipt.status !== 'PAID' && receipt.status !== 'COMPLETED' && receipt.status !== 'APPROVED'}
                        className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-3 py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </button>
                      <button
                        onClick={() => handleShareReceipt(receipt)}
                        className="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20 px-3 py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Share
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </motion.div>

      {/* Receipt Modal */}
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
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {/* Academy Header */}
                <div className="flex items-start gap-4 mb-6 pb-6 border-b border-border">
                  {modalReceipt.academy?.logo_url && (
                    <img
                      src={modalReceipt.academy.logo_url}
                      alt={modalReceipt.academy.name}
                      className="w-20 h-20 object-contain rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground">{modalReceipt.academy?.name || 'Sports Academy'}</h3>
                    <p className="text-sm text-muted-foreground">{modalReceipt.academy?.address || ''}</p>
                    <p className="text-sm text-muted-foreground">Phone: {modalReceipt.academy?.phone_number || '—'}</p>
                    <p className="text-sm text-muted-foreground">Email: {modalReceipt.academy?.email || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Receipt Number</p>
                    <p className="text-lg font-bold text-foreground">{modalReceipt.receipt_number || '—'}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-2">Date</p>
                    <p className="text-sm font-semibold text-foreground">{formatDate(modalReceipt.created_at)}</p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mb-6">
                  {(() => {
                    const statusInfo = getStatusInfo(modalReceipt.status || 'PENDING_VERIFICATION');
                    const StatusIcon = statusInfo.icon;
                    return (
                      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold uppercase ${
                        modalReceipt.status === 'PAID' || modalReceipt.status === 'COMPLETED' || modalReceipt.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                          : modalReceipt.status === 'REJECTED' || modalReceipt.status === 'FAILED'
                          ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20'
                          : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                      }`}>
                        <StatusIcon className="w-4 h-4" />
                        {statusInfo.label}
                      </span>
                    );
                  })()}
                  {modalReceipt.rejected_reason && (
                    <p className="text-sm text-red-500 mt-2 font-medium">Reason: {modalReceipt.rejected_reason}</p>
                  )}
                </div>

                {/* Student Details */}
                <div className="mb-6">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Student Details</h4>
                  <div className="grid grid-cols-2 gap-4 bg-surface p-4 rounded-xl">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Student Name</p>
                      <p className="text-sm font-semibold text-foreground">{modalReceipt.student?.name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Parent Name</p>
                      <p className="text-sm font-semibold text-foreground">{modalReceipt.student?.parent_name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sport</p>
                      <p className="text-sm font-semibold text-foreground">{modalReceipt.sport?.name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Batch</p>
                      <p className="text-sm font-semibold text-foreground">{modalReceipt.batch?.name || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="mb-6">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Payment Details</h4>
                  <div className="grid grid-cols-2 gap-4 bg-surface p-4 rounded-xl">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payment Date</p>
                      <p className="text-sm font-semibold text-foreground">{formatDate(modalReceipt.payment_date)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payment Method</p>
                      <p className="text-sm font-semibold text-foreground">{modalReceipt.method ? modalReceipt.method.toUpperCase() : '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Transaction Number</p>
                      <p className="text-sm font-semibold text-foreground">{modalReceipt.transaction_number || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Collected By</p>
                      <p className="text-sm font-semibold text-foreground">{modalReceipt.collected_by?.name || modalReceipt.approved_by?.name || '—'}</p>
                    </div>
                    {modalReceipt.remarks && (
                      <div className="col-span-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Remarks</p>
                        <p className="text-sm font-semibold text-foreground">{modalReceipt.remarks}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Amount Section */}
                <div className="bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-blue-500/10 dark:to-emerald-500/10 p-6 rounded-xl border border-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-foreground">Amount</span>
                    <span className="text-lg font-bold text-foreground">₹{parseFloat(modalReceipt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {modalReceipt.discount > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-foreground">Discount</span>
                      <span className="text-lg font-bold text-emerald-600">-₹{parseFloat(modalReceipt.discount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {modalReceipt.additional_charges > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-foreground">Additional Charges</span>
                      <span className="text-lg font-bold text-foreground">+₹{parseFloat(modalReceipt.additional_charges).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-4 border-t border-border mt-4">
                    <span className="text-sm font-bold text-foreground">Total Paid</span>
                    <span className="text-2xl font-black text-emerald-600">₹{(parseFloat(modalReceipt.amount) - parseFloat(modalReceipt.discount || 0) + parseFloat(modalReceipt.additional_charges || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-border bg-surface">
                <button
                  onClick={() => setModalReceipt(null)}
                  className="px-4 py-2 rounded-lg text-sm font-bold text-foreground border border-border hover:bg-surface transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    window.print();
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
                  disabled={modalReceipt.status !== 'PAID' && modalReceipt.status !== 'COMPLETED' && modalReceipt.status !== 'APPROVED'}
                  className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={modalReceipt.status !== 'PAID' && modalReceipt.status !== 'COMPLETED' && modalReceipt.status !== 'APPROVED' ? 'Download available only for approved payments' : 'Download receipt as PDF'}
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      <AnimatePresence>
        {loadingReceipt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <Loader />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
