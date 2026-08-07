import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { superAdminGet, superAdminPost, superAdminPut } from '../../api/client';
import { 
  CreditCard, Settings, Ticket, Check, X, Search, Filter, 
  Loader2, Plus, QrCode, AlertCircle, Sparkles, Building, Trash2 
} from 'lucide-react';

export default function SuperAdminPaymentsPanel() {
  const [activeTab, setActiveTab] = useState('transactions');
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState({
    upi_id: '',
    merchant_name: '',
    qr_enabled: true,
    qr_image_url: '',
    coupons: []
  });
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Coupon Creation Form
  const [couponForm, setCouponForm] = useState({
    code: '',
    discount_percentage: '',
    max_discount: '',
    valid_until: '',
    is_active: true
  });

  const fetchData = async () => {
    try {
      const response = await superAdminGet('/super-admin/payments');
      if (response?.success) {
        setTransactions(response.data.transactions || []);
        setSettings(response.data.settings || {
          upi_id: '',
          merchant_name: '',
          qr_enabled: true,
          qr_image_url: '',
          coupons: []
        });
      }
    } catch (err) {
      console.error('Failed to fetch payments data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (txId, newStatus) => {
    if (!window.confirm(`Are you sure you want to set this transaction to ${newStatus}?`)) return;
    try {
      const response = await superAdminPost(`/super-admin/payments/${txId}/status`, { status: newStatus });
      if (response?.success) {
        setTransactions(prev => prev.map(tx => tx.id === txId ? { ...tx, status: newStatus } : tx));
        alert('Transaction status updated successfully.');
      }
    } catch (err) {
      alert(err.message || 'Failed to update transaction status');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      const response = await superAdminPut('/super-admin/payments/settings', settings);
      if (response?.success) {
        alert('Payment settings updated successfully.');
      }
    } catch (err) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!couponForm.code || !couponForm.discount_percentage) {
      alert('Please fill out Code and Discount Percentage');
      return;
    }
    const newCoupon = {
      code: couponForm.code.toUpperCase().trim(),
      discount_percentage: parseFloat(couponForm.discount_percentage),
      max_discount: couponForm.max_discount ? parseFloat(couponForm.max_discount) : null,
      valid_until: couponForm.valid_until || null,
      is_active: !!couponForm.is_active
    };

    const updatedCoupons = [...(settings.coupons || []), newCoupon];
    setSubmitLoading(true);
    try {
      const response = await superAdminPut('/super-admin/payments/settings', {
        ...settings,
        coupons: updatedCoupons
      });
      if (response?.success) {
        setSettings(prev => ({ ...prev, coupons: updatedCoupons }));
        setCouponForm({ code: '', discount_percentage: '', max_discount: '', valid_until: '', is_active: true });
        alert('Coupon created successfully!');
      }
    } catch (err) {
      alert(err.message || 'Failed to create coupon');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteCoupon = async (code) => {
    if (!window.confirm(`Delete coupon "${code}"?`)) return;
    const updatedCoupons = settings.coupons.filter(c => c.code !== code);
    try {
      const response = await superAdminPut('/super-admin/payments/settings', {
        ...settings,
        coupons: updatedCoupons
      });
      if (response?.success) {
        setSettings(prev => ({ ...prev, coupons: updatedCoupons }));
      }
    } catch (err) {
      alert(err.message || 'Failed to delete coupon');
    }
  };

  // Filtered transactions list
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = 
      tx.academy_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.plan_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.id?.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesFilter = statusFilter === 'ALL' || tx.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full overflow-x-hidden">
      {/* Header */}
      <div className="super-glass p-6 rounded-2xl border border-white/10 dark:border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <span className="premium-gradient-purple text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full tracking-widest shadow-lg shadow-purple-500/20">
            Billing & Invoices
          </span>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight mt-2 flex items-center gap-2">
            <CreditCard className="text-purple-500 h-6 w-6 animate-pulse" /> Platform Payments
          </h1>
          <p className="text-muted-foreground text-xs font-semibold">Approve subscription transactions, customize merchant gateway configurations, and manage promotional coupon codes.</p>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex border-b border-white/5 gap-6 text-xs font-bold uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'transactions' ? 'border-purple-500 text-purple-500' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CreditCard className="h-4 w-4" /> Transactions Log ({transactions.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'settings' ? 'border-purple-500 text-purple-500' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Settings className="h-4 w-4" /> Gateway Config
        </button>
        <button
          onClick={() => setActiveTab('coupons')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'coupons' ? 'border-purple-500 text-purple-500' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Ticket className="h-4 w-4" /> Coupon Manager ({settings.coupons?.length || 0})
        </button>
      </div>

      {/* Main View Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
          <p className="text-muted-foreground text-sm font-bold animate-pulse">Loading billing records...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tab 1: Transactions Log */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative w-full sm:flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by academy name, plan, checkout reference or transaction ID..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full super-glass border border-white/10 dark:border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:border-purple-500/50 shadow-inner"
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto shrink-0">
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="w-full sm:w-44 super-glass border border-white/10 dark:border-white/5 rounded-xl py-2.5 px-3 text-sm text-foreground focus:outline-none focus:border-purple-500/50 shadow-inner"
                  >
                    <option value="ALL" className="text-slate-900">All Statuses</option>
                    <option value="PENDING" className="text-slate-900">Pending Review</option>
                    <option value="COMPLETED" className="text-slate-900">Approved</option>
                    <option value="REJECTED" className="text-slate-900">Declined / Failed</option>
                  </select>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="super-glass rounded-2xl border border-white/10 dark:border-white/5 overflow-x-auto shadow-xl">
                <table className="w-full border-collapse text-left min-w-[800px]">
                  <thead>
                    <tr className="border-b border-white/5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider bg-white/5">
                      <th className="p-4">Academy ID / Name</th>
                      <th className="p-4">Selected Plan</th>
                      <th className="p-4">Reference & Method</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground font-semibold text-sm">
                          No transaction records found matching filters.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map(tx => (
                        <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-all text-xs font-semibold text-muted-foreground">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-purple-500" />
                              <div>
                                <h4 className="font-extrabold text-foreground leading-tight text-xs">{tx.academy_name}</h4>
                                <span className="text-[10px] text-muted-foreground/60 font-bold">ID: {tx.academy_id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="premium-gradient-purple text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase">
                              {tx.plan_name}
                            </span>
                          </td>
                          <td className="p-4">
                            <div>
                              <p className="font-bold text-foreground">{tx.transaction_id || 'N/A'}</p>
                              <p className="text-[10px] text-muted-foreground/60 font-bold">Method: {tx.payment_method} {tx.coupon_code && `• Code: ${tx.coupon_code}`}</p>
                            </div>
                          </td>
                          <td className="p-4 font-extrabold text-foreground text-sm">₹{tx.amount}</td>
                          <td className="p-4 text-muted-foreground text-xs">
                            {new Date(tx.created_at).toLocaleString()}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                              tx.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25' :
                              tx.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border-amber-500/25' :
                              'bg-red-500/10 text-red-500 border-red-500/25'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                tx.status === 'COMPLETED' ? 'bg-emerald-500' :
                                tx.status === 'PENDING' ? 'bg-amber-500' :
                                'bg-red-500'
                              }`} />
                              {tx.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {tx.status === 'PENDING' ? (
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleUpdateStatus(tx.id, 'COMPLETED')}
                                  className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg hover:bg-emerald-500/25 transition-all shadow-sm"
                                  title="Approve Transaction"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(tx.id, 'REJECTED')}
                                  className="p-1.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg hover:bg-red-500/25 transition-all shadow-sm"
                                  title="Reject Transaction"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">Verified</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Gateway Configuration Settings */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl super-glass p-6 rounded-2xl shadow-xl">
              <h2 className="text-base font-extrabold text-foreground mb-4 flex items-center gap-2">
                <QrCode className="text-purple-500 h-5 w-5 animate-pulse" /> Merchant UPI & QR Setup
              </h2>
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">UPI ID for Direct Transfers</label>
                  <input
                    type="text"
                    required
                    value={settings.upi_id}
                    onChange={e => setSettings(prev => ({ ...prev, upi_id: e.target.value }))}
                    placeholder="e.g. business@upi"
                    className="w-full bg-white/5 border border-white/10 dark:border-white/5 rounded-xl py-2.5 px-4 text-sm text-foreground focus:outline-none focus:border-purple-500 shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Merchant Name</label>
                  <input
                    type="text"
                    required
                    value={settings.merchant_name}
                    onChange={e => setSettings(prev => ({ ...prev, merchant_name: e.target.value }))}
                    placeholder="e.g. Sports Academy Pro Pvt Ltd"
                    className="w-full bg-white/5 border border-white/10 dark:border-white/5 rounded-xl py-2.5 px-4 text-sm text-foreground focus:outline-none focus:border-purple-500 shadow-inner"
                  />
                </div>
                <div className="flex items-center gap-3 py-2 border-b border-white/5">
                  <input
                    type="checkbox"
                    id="qr_enabled"
                    checked={settings.qr_enabled}
                    onChange={e => setSettings(prev => ({ ...prev, qr_enabled: e.target.checked }))}
                    className="h-4 w-4 text-purple-600 bg-white/5 border border-white/10 dark:border-white/5 rounded focus:ring-0 cursor-pointer shadow-inner"
                  />
                  <label htmlFor="qr_enabled" className="text-xs font-bold text-foreground select-none cursor-pointer">
                    Enable QR Image Display on Checkout Screen
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">QR Image URL (Optional)</label>
                  <input
                    type="text"
                    value={settings.qr_image_url}
                    onChange={e => setSettings(prev => ({ ...prev, qr_image_url: e.target.value }))}
                    placeholder="e.g. https://imagekit.io/your_merchant_qr.jpg"
                    className="w-full bg-white/5 border border-white/10 dark:border-white/5 rounded-xl py-2.5 px-4 text-sm text-foreground focus:outline-none focus:border-purple-500 shadow-inner"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="w-full py-3 bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-black/10"
                >
                  {submitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Save Gateway configuration
                </button>
              </form>
            </div>
          )}

          {/* Tab 3: Coupon Code Manager */}
          {activeTab === 'coupons' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add Coupon Form */}
              <div className="super-glass p-6 rounded-2xl shadow-xl h-fit">
                <h3 className="text-base font-extrabold text-foreground mb-4 flex items-center gap-2">
                  <Sparkles className="text-purple-500 h-5 w-5" /> Issue New Coupon
                </h3>
                <form onSubmit={handleCreateCoupon} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Promo Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. METRIC50"
                      value={couponForm.code}
                      onChange={e => setCouponForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      className="w-full bg-white/5 border border-white/10 dark:border-white/5 rounded-xl py-2.5 px-4 text-sm text-foreground focus:outline-none focus:border-purple-500 shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Discount Percentage (%)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="100"
                      placeholder="e.g. 50"
                      value={couponForm.discount_percentage}
                      onChange={e => setCouponForm(prev => ({ ...prev, discount_percentage: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 dark:border-white/5 rounded-xl py-2.5 px-4 text-sm text-foreground focus:outline-none focus:border-purple-500 shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Max Discount Cap (₹, Optional)</label>
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      value={couponForm.max_discount}
                      onChange={e => setCouponForm(prev => ({ ...prev, max_discount: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 dark:border-white/5 rounded-xl py-2.5 px-4 text-sm text-foreground focus:outline-none focus:border-purple-500 shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Valid Until (Optional)</label>
                    <input
                      type="date"
                      value={couponForm.valid_until}
                      onChange={e => setCouponForm(prev => ({ ...prev, valid_until: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 dark:border-white/5 rounded-xl py-2.5 px-4 text-sm text-foreground focus:outline-none focus:border-purple-500 shadow-inner"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="w-full py-2.5 bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-md animate-pulse-slow"
                  >
                    {submitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Create Coupon Code
                  </button>
                </form>
              </div>

              {/* Coupons List */}
              <div className="lg:col-span-2 super-glass rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-white/5 bg-white/5">
                  <h3 className="font-extrabold text-foreground text-sm">Active Promotions & Discount Coupons</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider bg-white/5">
                        <th className="p-4">Coupon Code</th>
                        <th className="p-4">Percentage</th>
                        <th className="p-4">Discount Cap</th>
                        <th className="p-4">Valid Until</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!settings.coupons || settings.coupons.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground font-semibold text-sm">
                            No coupons created yet. Apply a coupon in the checkout flow to verify!
                          </td>
                        </tr>
                      ) : (
                        settings.coupons.map((c, idx) => (
                          <tr key={idx} className="border-b border-white/5 text-xs font-semibold hover:bg-white/5 text-muted-foreground">
                            <td className="p-4 font-extrabold text-foreground tracking-wider flex items-center gap-2">
                              <Ticket className="h-4 w-4 text-purple-500 shrink-0" /> {c.code}
                            </td>
                            <td className="p-4 font-extrabold text-foreground">{c.discount_percentage}% OFF</td>
                            <td className="p-4 text-muted-foreground font-bold">{c.max_discount ? `₹${c.max_discount}` : 'No Limit'}</td>
                            <td className="p-4 text-muted-foreground font-bold text-xs">{c.valid_until ? new Date(c.valid_until).toLocaleDateString() : 'Lifetime'}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${c.is_active ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25' : 'bg-slate-200/50 text-slate-500 border-slate-300'}`}>
                                {c.is_active ? 'Active' : 'Expired'}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleDeleteCoupon(c.code)}
                                className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Remove Coupon"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
