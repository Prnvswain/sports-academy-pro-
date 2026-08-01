import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { IndianRupee, UploadCloud, CheckCircle2, AlertCircle, XCircle, CreditCard, Receipt, Check, Clock, Download, Share2, Printer, X, Search, DollarSign } from 'lucide-react';
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

    if (!selectedChildId) {
      showBanner('Please select a child.', 'error');
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      showBanner('Please enter a valid amount.', 'error');
      return;
    }

    const selectedChild = children.find(c => String(c.student_id) === selectedChildId);
    const totalFeesAssigned = selectedChild?.total_fees_assigned || 0;
    const totalFeesPaid = selectedChild?.total_fees_paid || 0;
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
      formData.append('student_id', selectedChildId);
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
            <div class="item"><label>Student Name</label><span>${children.find(c => String(c.student_id) === selectedChildId)?.name || 'Student'}</span></div>
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

  const selectedChild = children.find(c => String(c.student_id) === selectedChildId);
  const totalFeesAssigned = selectedChild?.total_fees_assigned || 0;
  const totalFeesPaid = selectedChild?.total_fees_paid || 0;
  const remainingFee = Math.max(0, totalFeesAssigned - totalFeesPaid);

  if (loading && children.length === 0) return <Loader />;

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto font-sans p-4 lg:p-8">
      
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Plans & Payments
          </h1>
          <p className="text-xs font-bold text-muted-foreground mt-0.5 uppercase tracking-wider">
            Submit payment proofs and audit receipt ledgers
          </p>
        </div>

        <div className="flex gap-2 self-start sm:self-center">
          {children.length > 1 && (
            <div className="bg-muted/40 p-1.5 rounded-xl border border-border shadow-inner flex items-center gap-1">
              {children.map(child => (
                <button
                  key={child.student_id}
                  onClick={() => setSelectedChildId(String(child.student_id))}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    selectedChildId === String(child.student_id)
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {child.name}
                </button>
              ))}
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowReceiptsModal(true)}
            className="btn btn-secondary text-xs flex items-center gap-1.5"
            title="View invoices and receipts history ledger"
          >
            <Receipt className="w-3.5 h-3.5 text-primary" />
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
            className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm border ${
              message.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {message.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Log Payment Form (2/3 width) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-5"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-border/40">
            <CreditCard className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-extrabold text-foreground">Log Offline Payment</h3>
          </div>

          <form onSubmit={handleSubmitPayment} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full input-field py-2.5 px-3 text-xs appearance-none outline-none cursor-pointer"
                >
                  <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="bank_transfer">Bank Transfer (NEFT / IMPS)</option>
                </select>
              </div>

              {/* Amount Paid */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block">Amount Paid (₹)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground">₹</span>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount paid"
                    className="pl-7 pr-4 py-2.5 w-full input-field text-xs"
                    min="1"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Transaction Code */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block">Transaction Reference Number</label>
                <input
                  type="text"
                  required
                  value={transactionNumber}
                  onChange={(e) => setTransactionNumber(e.target.value)}
                  placeholder="Min 12 digit UPI Ref / IMPS UTR"
                  className="input-field py-2.5 text-xs font-mono"
                  minLength={12}
                  maxLength={50}
                />
              </div>

              {/* Upload Proof */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block">Upload Screenshot Proof</label>
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
                    className={`w-full flex items-center justify-center gap-2 border border-dashed rounded-xl py-2.5 px-4 text-xs font-bold cursor-pointer transition-all ${
                      proofFile
                        ? 'border-primary/40 bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/50 text-muted-foreground'
                    }`}
                  >
                    {proofFile ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-primary" />
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
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block">Payment Remarks (Optional)</label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add bank accounts detail or invoice codes..."
                className="input-field py-2.5 text-xs resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full btn btn-primary py-3 text-xs font-bold shadow-sm"
            >
              {submitting ? 'Submitting payment log...' : 'Log Offline Payment'}
            </button>
          </form>
        </motion.div>

        {/* Right Column: Active Plan Overview (1/3 width) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-border/40">
            <Receipt className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-extrabold text-foreground">Outstanding Plan Dues</h3>
          </div>

          {selectedChild ? (
            <div className="space-y-4 text-xs font-semibold text-foreground">
              <div>
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">Active Batch</p>
                <p className="text-sm font-bold text-foreground mt-0.5">
                  {selectedChild.batch?.name || 'Assigning Batch'} ({selectedChild.sport?.name || 'General'})
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/40">
                <div>
                  <span className="text-muted-foreground block text-[9px] uppercase font-black tracking-wider">Assigned Fees</span>
                  <span className="text-foreground block mt-0.5">₹{totalFeesAssigned.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[9px] uppercase font-black tracking-wider">Verified Paid</span>
                  <span className="text-emerald-500 block mt-0.5">₹{totalFeesPaid.toLocaleString()}</span>
                </div>
              </div>

              <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl flex items-center justify-between text-xs pt-3 mt-2">
                <div>
                  <span className="text-rose-500 block text-[10px] font-black uppercase tracking-wider">Outstanding Dues</span>
                  <span className="text-rose-600 block mt-1 font-black text-xl">₹{remainingFee.toLocaleString()}</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">Select child to view plan.</div>
          )}
        </motion.div>
      </div>

      {/* RECEIPTS LOG MODAL */}
      <AnimatePresence>
        {showReceiptsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl w-full max-w-4xl p-5 shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowReceiptsModal(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
                <Receipt className="w-5 h-5 text-primary" />
                <h3 className="text-md font-bold text-foreground">Payment Submissions History</h3>
              </div>

              {/* Scrollable grid of submissions */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
                {submissions.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-10 font-bold">No payments submitted yet for {selectedChild?.name || 'this student'}.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border/50">
                    <table className="w-full text-left text-xs font-semibold">
                      <thead>
                        <tr className="border-b border-border bg-muted/20 text-muted-foreground uppercase text-[10px] tracking-wider">
                          <th className="py-3 px-4">Ref Number</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4">Date logged</th>
                          <th className="py-3 px-4">Verification</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {submissions.map((sub) => (
                          <tr key={sub.payment_id} className="hover:bg-muted/10 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-foreground">{sub.transaction_number}</td>
                            <td className="py-3 px-4 text-foreground font-black">₹{parseFloat(sub.amount).toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4">{new Date(sub.payment_date || sub.createdAt).toLocaleDateString()}</td>
                            <td className="py-3 px-4">
                              <span className={`inline-block text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                sub.status === 'APPROVED' || sub.status === 'VERIFIED'
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : sub.status === 'REJECTED'
                                    ? 'bg-red-500/10 text-red-500'
                                    : 'bg-amber-500/10 text-amber-500'
                              }`}>
                                {sub.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex justify-end gap-1.5">
                                {sub.status === 'APPROVED' && (
                                  <button
                                    onClick={() => loadReceiptDetails(sub.payment_id)}
                                    className="btn btn-secondary text-[10px] py-1 px-2.5 flex items-center gap-1 shadow-sm"
                                    title="View receipt metrics"
                                  >
                                    <Receipt size={12} className="text-primary" />
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
                                          className={`px-2 py-1 rounded text-[10px] cursor-pointer font-bold border ${
                                            proofFileForReplace ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50 text-muted-foreground'
                                          }`}
                                        >
                                          {proofFileForReplace ? 'File selected' : 'Choose screenshot'}
                                        </label>
                                        <button
                                          onClick={() => handleReplaceProof(sub.payment_id)}
                                          disabled={uploadingProof || !proofFileForReplace}
                                          className="bg-primary text-white text-[10px] px-2 py-1 rounded font-bold hover:bg-emerald-600 disabled:opacity-50"
                                        >
                                          Upload
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setReplacingPaymentId(sub.payment_id)}
                                        className="btn btn-secondary text-[10px] py-1 px-2 text-rose-500 border-rose-500/30"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onClick={() => setModalReceipt(null)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-5 max-w-sm w-full relative shadow-2xl flex flex-col gap-4 text-xs font-semibold text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setModalReceipt(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                <Receipt className="w-5 h-5 text-primary" />
                <div>
                  <h4 className="font-bold">Payment Invoice</h4>
                  <p className="text-[9px] text-muted-foreground">{modalReceipt.receipt_number}</p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs font-semibold">
                <div className="flex justify-between border-b border-border/40 pb-2">
                  <span className="text-muted-foreground">Receipt Number</span>
                  <span className="font-mono font-bold text-foreground">{modalReceipt.receipt_number}</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-2">
                  <span className="text-muted-foreground">Log Date</span>
                  <span className="font-bold">{new Date(modalReceipt.payment_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-2">
                  <span className="text-muted-foreground">Transaction Reference</span>
                  <span className="font-mono font-bold text-foreground truncate max-w-[150px]">{modalReceipt.transaction_number}</span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-2">
                  <span className="text-muted-foreground">Verification status</span>
                  <span className="font-black text-emerald-500 uppercase">{modalReceipt.status}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-muted-foreground">Invoice Amount</span>
                  <span className="font-black text-foreground text-sm">₹{parseFloat(modalReceipt.amount).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <button
                onClick={handlePrintReceipt}
                className="w-full btn btn-primary flex items-center justify-center gap-1.5 py-2.5 text-xs"
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