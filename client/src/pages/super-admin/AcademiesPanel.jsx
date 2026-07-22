import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Users, Trophy, Calendar, Search, Settings, Loader2, X, Info, 
  CreditCard, ShieldAlert, History, MapPin, Send, Download, ShieldCheck, ExternalLink, LogOut
} from 'lucide-react';
import { superAdminGet, superAdminPatch, superAdminPost } from '../../api/client';

export default function AcademiesPanel() {
  const [academies, setAcademies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [message, setMessage] = useState('');

  // Inspector Drawer State
  const [selectedAcademy, setSelectedAcademy] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState('info');
  const [plans, setPlans] = useState([]);

  // Action states
  const [extendDays, setExtendDays] = useState('');
  const [upgradePlanId, setUpgradePlanId] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const loadAcademies = useCallback(async () => {
    setLoading(true);
    try {
      const response = await superAdminGet('/super-admin/academies');
      const academiesData = response?.data || [];
      setAcademies(
        academiesData.map((a) => ({
          ...a,
          _count: {
            students: a._count?.students ?? 0,
            coaches: a._count?.coaches ?? 0,
          },
        }))
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPlans = async () => {
    try {
      const response = await superAdminGet('/super-admin/plans');
      if (response?.success) {
        setPlans(response.data);
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
    }
  };

  useEffect(() => {
    loadAcademies();
    loadPlans();
  }, [loadAcademies]);

  const updateStatus = async (academyId, status) => {
    try {
      await superAdminPatch(`/super-admin/academies/${academyId}/status`, { status: status.toUpperCase() });
      setMessage(`Academy status updated to ${status}.`);
      loadAcademies();
      if (selectedAcademy && selectedAcademy.academy_id === academyId) {
        handleViewAcademy({ ...selectedAcademy, status: status.toLowerCase() });
      }
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleViewAcademy = async (academy) => {
    setSelectedAcademy(academy);
    setDetailsLoading(true);
    try {
      const response = await superAdminGet(`/super-admin/academies/${academy.academy_id}`);
      if (response?.success) {
        setDetails(response.data);
        setUpgradePlanId(response.data.academy.subscription_plan || '');
      }
    } catch (err) {
      console.error('Failed to load academy details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleExtendSubscription = async (e) => {
    e.preventDefault();
    if (!extendDays || extendDays <= 0) return;
    setActionSubmitting(true);
    try {
      const response = await superAdminPost(`/super-admin/academies/${selectedAcademy.academy_id}/extend`, {
        days: parseInt(extendDays, 10)
      });
      if (response?.success) {
        alert(`Successfully extended subscription by ${extendDays} days!`);
        setExtendDays('');
        // Reload details
        handleViewAcademy(selectedAcademy);
      }
    } catch (err) {
      alert(err.message || 'Failed to extend subscription');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleUpgradePlan = async (e) => {
    e.preventDefault();
    if (!upgradePlanId) return;
    setActionSubmitting(true);
    try {
      const response = await superAdminPost(`/super-admin/academies/${selectedAcademy.academy_id}/upgrade`, {
        plan_id: upgradePlanId
      });
      if (response?.success) {
        alert('Plan tier upgraded successfully!');
        // Reload details & list
        handleViewAcademy(selectedAcademy);
        loadAcademies();
      }
    } catch (err) {
      alert(err.message || 'Failed to upgrade plan');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleExportData = async () => {
    try {
      const response = await superAdminGet(`/super-admin/academies/${selectedAcademy.academy_id}/export`);
      if (response?.success) {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
          JSON.stringify(response.data, null, 2)
        )}`;
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', jsonString);
        downloadAnchor.setAttribute('download', `academy_${selectedAcademy.name.replace(/\s+/g, '_')}_export.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      }
    } catch (err) {
      alert(err.message || 'Failed to export academy data');
    }
  };

  const handleOpenAcademy = async (academy) => {
    try {
      const response = await superAdminPost(`/super-admin/academies/${academy.academy_id}/impersonate`);
      if (response?.success) {
        // Store impersonation token and redirect to academy admin
        localStorage.setItem('impersonation_token', response.data.impersonationToken);
        localStorage.setItem('original_super_admin_token', localStorage.getItem('super_admin_token'));
        localStorage.setItem('impersonated_academy_id', academy.academy_id);
        localStorage.setItem('impersonated_academy_name', academy.name);
        window.location.href = '/admin/dashboard';
      }
    } catch (error) {
      setMessage(error.message || 'Failed to open academy');
    }
  };

  const handleCloseDrawer = () => {
    setSelectedAcademy(null);
    setDetails(null);
    setActiveDetailTab('info');
  };

  const filteredAcademies = academies.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.academy_id.toString().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            ACTIVE
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-red-500/10 text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
            SUSPENDED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-slate-800 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            {status?.toUpperCase() || 'UNKNOWN'}
          </span>
        );
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Building2 className="text-lime-400 h-6 w-6" /> Academies Management
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Control subscriber settings, adjust subscription days, suspension state, and review login logs.</p>
        </div>
      </div>

      {message && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-blue-400 text-sm flex items-center gap-2">
          <Info className="h-4 w-4" />
          {message}
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-555" />
          <input
            type="text"
            placeholder="Search academies by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-lime-500/50"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto shrink-0 overflow-x-auto">
          {['all', 'active', 'suspended'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all uppercase tracking-wider ${
                statusFilter === filter
                  ? 'bg-lime-400 text-slate-950 shadow-md shadow-lime-400/10'
                  : 'bg-slate-800 text-slate-350 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Academy list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-lime-400" />
        </div>
      ) : filteredAcademies.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/20 rounded-2xl border border-slate-800 border-dashed">
          <Building2 className="mx-auto h-12 w-12 text-slate-700 mb-4" />
          <p className="text-slate-450 text-sm">No academies found matching filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAcademies.map((academy) => (
            <div 
              key={academy.academy_id}
              className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between hover:border-slate-750 hover:bg-slate-900/60 transition-all shadow-md shadow-slate-950/20"
            >
              <div>
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-slate-700">
                        {academy.logo_url ? (
                          <img src={academy.logo_url} alt={academy.name} className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="w-6 h-6 text-slate-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-white text-base truncate">{academy.name}</h3>
                        <p className="text-slate-500 text-xs mt-0.5">ID: #{academy.academy_id} • Plan: {academy.subscription_plan || academy.subscription_tier}</p>
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(academy.status)}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6 py-4 border-y border-slate-800/80 text-center text-xs">
                  <div>
                    <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Students</p>
                    <p className="text-white font-extrabold text-lg mt-1">{academy._count.students}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Coaches</p>
                    <p className="text-white font-extrabold text-lg mt-1">{academy._count.coaches}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2 flex gap-2">
                <button
                  onClick={() => handleViewAcademy(academy)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-200 hover:text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Manage Academy
                </button>
                <button
                  onClick={() => handleOpenAcademy(academy)}
                  disabled={academy.status !== 'active'}
                  className={`py-2 px-3 border rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    academy.status === 'active'
                      ? 'bg-lime-400/10 border-lime-400/30 text-lime-400 hover:bg-lime-400 hover:text-slate-950'
                      : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                  title={academy.status === 'active' ? 'Open Academy as Admin' : 'Academy must be active'}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inspector Drawer */}
      <AnimatePresence>
        {selectedAcademy && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-45"
              onClick={handleCloseDrawer}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-slate-900 border-l border-slate-800 p-6 shadow-2xl flex flex-col justify-between"
            >
              {/* Drawer Header */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-4 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="text-lime-400 h-5 w-5" />
                    <h2 className="text-lg font-extrabold text-white">{selectedAcademy.name}</h2>
                  </div>
                  <p className="text-slate-450 text-xs mt-0.5">Configure billing and diagnostic logs for Academy #{selectedAcademy.academy_id}.</p>
                </div>
                <button onClick={handleCloseDrawer} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Tabs */}
              <div className="flex border-b border-slate-800/80 shrink-0 mt-4 text-xs font-bold uppercase tracking-wider">
                <button 
                  onClick={() => setActiveDetailTab('info')} 
                  className={`pb-2 pr-4 border-b-2 transition-all flex items-center gap-1.5 ${
                    activeDetailTab === 'info' ? 'border-lime-400 text-lime-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Info className="h-3.5 w-3.5" /> Info
                </button>
                <button 
                  onClick={() => setActiveDetailTab('subscription')} 
                  className={`pb-2 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
                    activeDetailTab === 'subscription' ? 'border-lime-400 text-lime-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5" /> Subscription
                </button>
                <button 
                  onClick={() => setActiveDetailTab('payments')} 
                  className={`pb-2 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
                    activeDetailTab === 'payments' ? 'border-lime-400 text-lime-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <History className="h-3.5 w-3.5" /> Invoices
                </button>
                <button 
                  onClick={() => setActiveDetailTab('logs')} 
                  className={`pb-2 pl-4 border-b-2 transition-all flex items-center gap-1.5 ${
                    activeDetailTab === 'logs' ? 'border-lime-400 text-lime-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <History className="h-3.5 w-3.5" /> Audit
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto py-6 space-y-6 [&::-webkit-scrollbar]:hidden">
                {detailsLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-lime-400" />
                  </div>
                ) : details ? (
                  <>
                    {/* Tab 1: Info */}
                    {activeDetailTab === 'info' && (
                      <div className="space-y-4">
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3 text-sm text-slate-300">
                          <div>
                            <span className="text-slate-500 text-xs block">Owner Name:</span>
                            <span className="text-white font-bold">{details.academy.owner_name}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-xs block">Contact Email:</span>
                            <span className="text-white font-bold">{details.academy.email}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-xs block">Phone Number:</span>
                            <span className="text-white font-bold">{details.academy.phone_number || 'Not Provided'}</span>
                          </div>
                        </div>

                        {/* Location */}
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2 text-sm text-slate-350">
                          <p className="font-semibold text-white flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-slate-400" /> Address Details
                          </p>
                          <p>{details.academy.address || 'No Address configured'}</p>
                          {(details.academy.city || details.academy.state) && (
                            <p className="text-xs text-slate-450">{details.academy.city}, {details.academy.state}</p>
                          )}
                          <div className="flex gap-4 text-xs text-slate-400 pt-2 border-t border-slate-900">
                            <span>Lat: {details.academy.latitude || 'N/A'}</span>
                            <span>Lng: {details.academy.longitude || 'N/A'}</span>
                            <span>Radius: {details.academy.attendance_radius_meters}m</span>
                          </div>
                        </div>

                        {/* Admins Accounts */}
                        <div className="space-y-2">
                          <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">Academy Administrator</h4>
                          {details.admins.map((adm, i) => (
                            <div key={i} className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-xs flex justify-between">
                              <div>
                                <p className="font-bold text-white">{adm.name}</p>
                                <p className="text-slate-500">{adm.email}</p>
                              </div>
                              <span className="text-[10px] text-slate-450 self-end">Registered: {new Date(adm.created_at).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tab 2: Subscription status */}
                    {activeDetailTab === 'subscription' && (
                      <div className="space-y-6">
                        <div className="bg-slate-955 p-4 rounded-xl border border-slate-850 space-y-3 text-sm text-slate-300">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Plan Tier:</span>
                            <span className="bg-slate-800 text-white font-bold px-2 py-0.5 rounded text-xs">
                              {details.academy.subscription_plan || details.academy.subscription_tier}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Trial Status:</span>
                            <span className="text-white font-bold">{details.trial_status}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Expires At:</span>
                            <span className="text-white font-bold">
                              {details.academy.subscription_expires_at 
                                ? new Date(details.academy.subscription_expires_at).toLocaleDateString()
                                : 'Lifetime / Free'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Coaches Usage:</span>
                            <span className="text-white font-bold">{details.total_coaches} coaches registered</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Students Usage:</span>
                            <span className="text-white font-bold">{details.total_students} students registered</span>
                          </div>
                        </div>

                        {/* Extend Subscription Form */}
                        <form onSubmit={handleExtendSubscription} className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                          <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">Extend Trial / Subscription</h4>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              required
                              min="1"
                              placeholder="Number of days to add (e.g. 30)"
                              value={extendDays}
                              onChange={e => setExtendDays(e.target.value)}
                              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-lime-500/50"
                            />
                            <button
                              type="submit"
                              disabled={actionSubmitting}
                              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all hover:text-white shrink-0"
                            >
                              {actionSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                              Extend
                            </button>
                          </div>
                        </form>

                        {/* Upgrade Plan Form */}
                        <form onSubmit={handleUpgradePlan} className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                          <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">Modify Plan Tier</h4>
                          <div className="flex gap-2">
                            <select
                              value={upgradePlanId}
                              onChange={e => setUpgradePlanId(e.target.value)}
                              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-lime-500/50"
                            >
                              <option value="">Select Plan...</option>
                              {plans.map(p => (
                                <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              disabled={actionSubmitting}
                              className="px-4 py-2 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shrink-0"
                            >
                              {actionSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                              Apply Change
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Tab 3: Payments/Invoices */}
                    {activeDetailTab === 'payments' && (
                      <div className="space-y-3">
                        <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">Payment Invoice Receipts</h4>
                        {details.payment_history.length === 0 ? (
                          <p className="text-xs text-slate-500 py-6 text-center">No payment log history recorded yet.</p>
                        ) : (
                          details.payment_history.map((tx) => (
                            <div key={tx.id} className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2 text-xs text-slate-300">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-bold text-white">{tx.plan_name}</p>
                                  <p className="text-slate-500 text-[10px]">Reference: {tx.transaction_id || 'N/A'}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  tx.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' :
                                  tx.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400' :
                                  'bg-red-500/10 text-red-400'
                                }`}>
                                  {tx.status}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2 border-t border-slate-900">
                                <span>Date: {new Date(tx.created_at).toLocaleDateString()}</span>
                                <span className="font-bold text-white">Amount: ₹{tx.amount}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Tab 4: Audit logs */}
                    {activeDetailTab === 'logs' && (
                      <div className="space-y-3">
                        <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">Recent Login / Audit logs</h4>
                        {details.login_history.length === 0 ? (
                          <p className="text-xs text-slate-500 py-6 text-center">No diagnostic logs found.</p>
                        ) : (
                          details.login_history.map((log, idx) => (
                            <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-xs space-y-1 text-slate-350">
                              <div className="flex justify-between font-semibold text-[10px] text-slate-500">
                                <span className="text-lime-400">{log.action}</span>
                                <span>{new Date(log.created_at).toLocaleString()}</span>
                              </div>
                              <p>Actor: {log.actor_type} (ID: {log.actor_id})</p>
                              {log.ip_address && <p className="text-[10px] text-slate-550">IP: {log.ip_address}</p>}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-slate-500 text-center">Error reading details from backend.</p>
                )}
              </div>

              {/* Drawer Footer Actions */}
              <div className="border-t border-slate-800 pt-4 mt-4 shrink-0 flex gap-2">
                <button
                  type="button"
                  onClick={handleExportData}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-slate-700/65"
                >
                  <Download className="h-4 w-4" /> Export Academy (JSON)
                </button>
                {selectedAcademy.status === 'active' ? (
                  <button
                    type="button"
                    onClick={() => updateStatus(selectedAcademy.academy_id, 'suspended')}
                    className="w-28 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-xl font-bold text-xs transition-all"
                  >
                    Suspend
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => updateStatus(selectedAcademy.academy_id, 'active')}
                    className="w-28 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-xl font-bold text-xs transition-all"
                  >
                    Activate
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
