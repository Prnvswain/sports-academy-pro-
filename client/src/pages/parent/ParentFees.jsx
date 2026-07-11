import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IndianRupee, UploadCloud, CheckCircle2, AlertCircle, XCircle, CreditCard, Receipt, FileText, Check } from 'lucide-react';
import Loader from '../../components/Loader';
import { parentGet, parentPatch, parentPost } from '../../api/client';

export default function ParentFees() {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [remarks, setRemarks] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofFileForReplace, setProofFileForReplace] = useState(null);
  const [replacingPaymentId, setReplacingPaymentId] = useState(null);

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

    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('student_id', selectedChildId);
      payload.append('amount', parsedAmount.toString());
      payload.append('method', paymentMethod);
      if (remarks.trim()) {
        payload.append('remarks', remarks.trim());
      }
      if (proofFile) {
        payload.append('proof_file', proofFile);
      }

      await parentPost('/parent/payments', payload);
      showBanner('Payment submitted successfully and is pending admin approval.', 'success');
      setAmount('');
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

  const handleOpenReceipt = (payment) => {
    const fileUrl = payment.pdf_url || payment.proof_url;
    if (!fileUrl) {
      showBanner('Receipt will be available here once the payment is approved.', 'info');
      return;
    }

    const fullUrl = fileUrl.startsWith('http') ? fileUrl : `http://localhost:5000/${fileUrl}`;
    window.open(fullUrl, '_blank');
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
                  {['cash', 'upi', 'online', 'cheque'].map((method) => {
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
                        {method === 'cash' && '💵'}
                        {method === 'upi' && '📲'}
                        {method === 'online' && '🌐'}
                        {method === 'cheque' && '📝'}
                        {method}
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* Attach Proof (Dashed Dropzone) */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                  Attach Proof (Optional)
                </label>
                <div className="relative w-full border-2 border-dashed border-border hover:border-emerald-400 bg-surface rounded-xl p-6 transition-colors text-center cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    <UploadCloud className="w-8 h-8 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                    <span className="text-xs font-bold text-foreground">Tap to upload receipt</span>
                    <span className="text-[10px] font-medium text-muted-foreground">Images or PDFs</span>
                  </div>
                </div>
                {proofFile && (
                  <div className="mt-3 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-3 py-2 rounded-lg flex items-center justify-between">
                    <span className="flex items-center gap-2 truncate"><FileText className="w-3.5 h-3.5" /> {proofFile.name}</span>
                    <button type="button" onClick={() => setProofFile(null)} className="text-emerald-600 hover:text-emerald-800">✕</button>
                  </div>
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
                    Live Submissions
                  </h3>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Track status of fees recorded for {children.find(c => c.student_id == selectedChildId)?.name || 'student'}</p>
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
                      const isCompleted = payment.status === 'COMPLETED';
                      const isPending = payment.status === 'PENDING';
                      
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
                                : isPending
                                ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                                : 'bg-surface text-muted-foreground border-border'
                            }`}>
                              {isCompleted && <Check className="w-3 h-3" />}
                              {payment.status}
                            </span>
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <div className="flex flex-col items-end gap-1.5">
                              {/* Open Receipt / Upload Proof Buttons */}
                              {payment.pdf_url || payment.proof_url ? (
                                <div className="flex items-center gap-2">
                                  <motion.button
                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    onClick={() => handleOpenReceipt(payment)}
                                    className="text-[11px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 px-3 py-1.5 rounded-md hover:bg-blue-100 transition-colors"
                                  >
                                    View
                                  </motion.button>
                                  
                                  {/* Only allow replacing if it's PENDING (Standard logic, though coach side allows anytime. I'll keep it available) */}
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
                                </div>
                              ) : (
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
                              )}

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
    </div>
  );
}