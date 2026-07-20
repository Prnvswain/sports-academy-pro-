import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminGet, adminPost } from '../../api/client';
import { 
  CreditCard, Check, AlertTriangle, HelpCircle, Loader2, 
  QrCode, Clipboard, Gift, Clock, Sparkles, ShieldCheck, RefreshCw 
} from 'lucide-react';

export default function AdminSubscriptionPanel() {
  const [details, setDetails] = useState(null);
  const [plans, setPlans] = useState([]);
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false); // Demo flag for testing
  const [submittingCheckout, setSubmittingCheckout] = useState(false);

  const fetchSubscriptionData = async () => {
    try {
      const [detailsRes, plansRes, settingsRes] = await Promise.all([
        adminGet('/admin/subscription'),
        adminGet('/admin/subscription/plans'),
        adminGet('/admin/subscription/payment-settings')
      ]);

      if (detailsRes?.success) setDetails(detailsRes.data);
      if (plansRes?.success) setPlans(plansRes.data);
      if (settingsRes?.success) setPaymentSettings(settingsRes.data);
    } catch (err) {
      console.error('Failed to fetch subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    const codeUpper = couponCode.toUpperCase().trim();
    
    // Look up coupon details in dynamic settings.coupons if available
    const couponsList = paymentSettings?.coupons || [];
    const matched = couponsList.find(c => c.code === codeUpper && c.is_active);
    
    if (matched) {
      setCouponDiscount(matched.discount_percentage);
      setCouponApplied(true);
      alert(`Success: ${matched.discount_percentage}% discount applied!`);
    } else {
      // Fallback local mock coupons if none configured
      if (codeUpper === 'WELCOME10') {
        setCouponDiscount(10);
        setCouponApplied(true);
        alert('Promo Applied: 10% OFF Welcome Discount');
      } else if (codeUpper === 'ACADEMY25') {
        setCouponDiscount(25);
        setCouponApplied(true);
        alert('Promo Applied: 25% OFF Upgrade Special');
      } else {
        alert('Invalid or expired coupon code');
      }
    }
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(paymentSettings?.upi_id || 'merchant@upi');
    alert('UPI ID copied to clipboard!');
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!transactionId.trim()) {
      alert('Please enter your Transaction Reference Number / UTR');
      return;
    }

    setSubmittingCheckout(true);
    const finalAmount = Math.max(0, checkoutPlan.price - (checkoutPlan.price * couponDiscount) / 100);

    try {
      const payload = {
        plan_id: checkoutPlan.id,
        amount: finalAmount,
        transaction_id: transactionId,
        coupon_code: couponApplied ? couponCode.toUpperCase().trim() : null,
        auto_approve: autoApprove // Sends query parameter to process instant success
      };

      const response = await adminPost('/admin/subscription/purchase', payload);
      if (response?.success) {
        alert(autoApprove 
          ? 'Demo Mode: Subscription activated instantly!' 
          : 'Payment receipt submitted successfully! Pending verification by Super Admin.'
        );
        setCheckoutPlan(null);
        setTransactionId('');
        setCouponCode('');
        setCouponApplied(false);
        setCouponDiscount(0);
        
        // Refresh values
        setLoading(true);
        fetchSubscriptionData();
      }
    } catch (err) {
      alert(err.message || 'Checkout submission failed');
    } finally {
      setSubmittingCheckout(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] py-20 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-lime-400" />
        <p className="text-slate-400 text-sm">Synchronizing plan usage metrics...</p>
      </div>
    );
  }

  const coachProgress = details ? (details.teacher_limit ? (details.teacher_usage / details.teacher_limit) * 100 : 0) : 0;
  const studentProgress = details ? (details.student_limit ? (details.student_usage / details.student_limit) * 100 : 0) : 0;

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Current Subscription Status Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20 border border-emerald-900/30 p-6 rounded-2xl relative overflow-hidden backdrop-blur-md">
          <div className="flex justify-between items-start gap-4">
            <div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                details?.trial_status.includes('Trial') ? 'bg-amber-500/10 text-amber-400' : 'bg-lime-400/10 text-lime-400'
              }`}>
                {details?.trial_status}
              </span>
              <h2 className="text-3xl font-extrabold text-white mt-3">{details?.current_plan}</h2>
              <p className="text-slate-400 text-sm mt-1">
                {details?.expiry_date 
                  ? `Active subscription until ${new Date(details.expiry_date).toLocaleDateString()}`
                  : 'Free Trial Plan. Limits applied.'}
              </p>
            </div>
            {details?.days_remaining !== null && (
              <div className="text-right shrink-0">
                <p className="text-4xl font-extrabold text-white tracking-tight">{details.days_remaining}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">Days remaining</p>
              </div>
            )}
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-800/80 pt-6">
            {/* Coach Limit */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-450 font-semibold">Coaches Enrolled</span>
                <span className="text-white font-bold">{details?.teacher_usage} / {details?.teacher_limit || 'Unlimited'}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${coachProgress >= 90 ? 'bg-red-500' : 'bg-lime-400'}`} 
                  style={{ width: `${Math.min(100, coachProgress)}%` }} 
                />
              </div>
            </div>
            
            {/* Student Limit */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-450 font-semibold">Active Students</span>
                <span className="text-white font-bold">{details?.student_usage} / {details?.student_limit || 'Unlimited'}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${studentProgress >= 90 ? 'bg-red-500' : 'bg-lime-400'}`} 
                  style={{ width: `${Math.min(100, studentProgress)}%` }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Support Card / Actions */}
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between backdrop-blur-md">
          <div className="space-y-3">
            <h3 className="font-extrabold text-white text-lg">Limits Checklist</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              If your academy exceeds your active plan's student or coach limits, you won't be able to register new accounts. Upgrade your tier below for immediate access.
            </p>
            {details?.plan_features && (
              <ul className="space-y-1.5 text-xs text-slate-350">
                {details.plan_features.slice(0, 3).map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-lime-400" /> {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button 
            onClick={() => {
              const el = document.getElementById('plans-grid');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full mt-4 py-2.5 bg-slate-850 hover:bg-slate-800 text-white font-semibold rounded-xl text-center transition-all border border-slate-700/60"
          >
            Upgrade Plan Tier
          </button>
        </div>
      </div>

      {/* Pricing Table / Available Plans */}
      <div id="plans-grid" className="space-y-4">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Available Subscription Plans</h2>
          <p className="text-slate-450 text-sm">Select the best plan that matches your sports program. Upgrade anytime dynamically.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isCurrent = p.id === details?.plan_id;
            return (
              <div 
                key={p.id} 
                className={`bg-slate-905 border rounded-2xl p-6 flex flex-col justify-between relative transition-all ${
                  isCurrent 
                    ? 'border-lime-400 shadow-lg shadow-lime-400/5 ring-1 ring-lime-500/20' 
                    : 'border-slate-800 hover:border-slate-750 bg-slate-900/30'
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-lime-400 text-slate-950 font-bold px-3 py-0.5 rounded-full text-xs uppercase tracking-wider">
                    Current Plan
                  </span>
                )}
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-extrabold text-white text-lg">{p.name}</h3>
                    {p.highlights?.[0] && (
                      <p className="text-lime-400/90 text-xs font-semibold mt-1">{p.highlights[0]}</p>
                    )}
                  </div>

                  <div className="py-2">
                    <p className="text-3xl font-extrabold text-white">₹{p.price}</p>
                    <p className="text-xs text-slate-500 mt-1 font-semibold uppercase tracking-wider">Billed {p.duration}</p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Coaches Limit:</span>
                      <span className="text-slate-200 font-bold">{p.teacher_limit || 'Unlimited'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Students Limit:</span>
                      <span className="text-slate-200 font-bold">{p.student_limit || 'Unlimited'}</span>
                    </div>
                  </div>

                  <ul className="space-y-2 pt-4 border-t border-slate-800 text-xs text-slate-400">
                    {p.features?.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-lime-400 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  disabled={isCurrent && p.price === 0}
                  onClick={() => setCheckoutPlan(p)}
                  className={`w-full mt-6 py-2.5 rounded-xl font-bold transition-all text-center ${
                    isCurrent 
                      ? 'bg-slate-800 text-slate-350 border border-slate-700 cursor-default hover:text-white' 
                      : p.price === 0 
                        ? 'bg-slate-800 hover:bg-slate-750 text-slate-250 border border-slate-700'
                        : 'bg-lime-400 hover:bg-lime-300 text-slate-950 hover:shadow-[0_4px_15px_rgba(163,230,53,0.2)]'
                  }`}
                >
                  {isCurrent ? 'Renew Current Plan' : 'Select Plan'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Billing Ledger Log */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Clock className="text-lime-400 h-5 w-5" /> Subscription Payment Logs
        </h3>
        <div className="bg-slate-900/40 rounded-2xl border border-slate-800 overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-900/20">
                <th className="p-4">Billing Plan</th>
                <th className="p-4">Reference UTR ID</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Date</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {!details?.payment_history || details.payment_history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 text-sm">
                    No billing transactions found. Verify transactions in checkout modal.
                  </td>
                </tr>
              ) : (
                details.payment_history.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-850 text-sm text-slate-300 hover:bg-slate-900/10">
                    <td className="p-4">
                      <p className="font-semibold text-white">{tx.plan_name}</p>
                      <p className="text-xs text-slate-500">Method: {tx.payment_method} {tx.coupon_code && `• Coupon: ${tx.coupon_code}`}</p>
                    </td>
                    <td className="p-4 font-mono text-xs">{tx.transaction_id || 'N/A'}</td>
                    <td className="p-4 font-bold text-white">₹{tx.amount}</td>
                    <td className="p-4 text-xs text-slate-400">{new Date(tx.created_at).toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        tx.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' :
                        tx.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Checkout Modal Dialog */}
      <AnimatePresence>
        {checkoutPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
              onClick={() => setCheckoutPlan(null)}
            />

            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg relative z-10 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden"
            >
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                    <Sparkles className="text-lime-400 h-5 w-5 animate-pulse" /> Complete Subscription
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">Transfer funds and enter checkout verification ID.</p>
                </div>
                <button 
                  onClick={() => setCheckoutPlan(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Order Summary */}
              <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Order:</span>
                  <span className="text-white font-bold">{checkoutPlan.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Amount:</span>
                  <span className="text-white font-bold">₹{checkoutPlan.price}</span>
                </div>
                {couponApplied && (
                  <div className="flex justify-between text-sm text-emerald-400">
                    <span>Discount Coupon ({couponDiscount}%):</span>
                    <span>-₹{(checkoutPlan.price * couponDiscount) / 100}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold border-t border-slate-800 pt-2 text-white">
                  <span>Total Due:</span>
                  <span className="text-lime-400">₹{Math.max(0, checkoutPlan.price - (checkoutPlan.price * couponDiscount) / 100)}</span>
                </div>
              </div>

              {/* QR Gate & Details */}
              {paymentSettings?.qr_enabled && (
                <div className="flex flex-col items-center gap-2 p-3 bg-slate-950 rounded-xl border border-slate-850">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Scan to pay instantly</p>
                  <div className="p-2 bg-white rounded-lg">
                    {paymentSettings?.qr_image_url ? (
                      <img src={paymentSettings.qr_image_url} alt="Merchant QR code" className="h-40 w-40 object-contain" />
                    ) : (
                      <QrCode className="h-40 w-40 text-slate-950" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500">Supported by all standard UPI Apps</p>
                </div>
              )}

              {/* UPI & Transfer Info */}
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-955 rounded-xl border border-slate-850 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-500 text-xs">UPI Address:</p>
                    <p className="font-bold text-slate-200 truncate">{paymentSettings?.upi_id || 'merchant@upi'}</p>
                    {paymentSettings?.merchant_name && (
                      <p className="text-[10px] text-slate-500 font-semibold">{paymentSettings.merchant_name}</p>
                    )}
                  </div>
                  <button 
                    onClick={handleCopyUpi}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
                    title="Copy UPI Address"
                  >
                    <Clipboard className="h-4 w-4" />
                  </button>
                </div>

                {/* Coupon Apply */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Enter promo coupon code..."
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-200 focus:outline-none focus:border-lime-500/50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-xl text-xs font-bold transition-all hover:text-white shrink-0 border border-slate-700/60"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Checkout Form */}
              <form onSubmit={handleCheckoutSubmit} className="space-y-4 border-t border-slate-800 pt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Transaction Reference Number (UTR / Reference ID)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter the 12-digit transaction ID or reference number..."
                    value={transactionId}
                    onChange={e => setTransactionId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-slate-200 focus:outline-none focus:border-lime-500"
                  />
                </div>

                {/* Demo Auto Approve Toggle */}
                <div className="flex items-center gap-2.5 py-1">
                  <input
                    type="checkbox"
                    id="auto_approve"
                    checked={autoApprove}
                    onChange={e => setAutoApprove(e.target.checked)}
                    className="h-3.5 w-3.5 text-lime-500 bg-slate-950 rounded border-slate-800 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="auto_approve" className="text-xs font-bold text-lime-400 select-none cursor-pointer flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                    Demo Mode (Skip review queue, activate plan instantly!)
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submittingCheckout}
                  className="w-full py-3 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-lime-400/10 transition-all disabled:opacity-50"
                >
                  {submittingCheckout ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Submit Payment Verification Reference
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function X({ className, ...props }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
