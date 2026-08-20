import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Search, Filter, Loader2, Download, X, Info, CreditCard, History, Send, ShieldCheck, MapPin, ExternalLink, Settings 
} from 'lucide-react';
import { superAdminGet, superAdminPost, superAdminPatch } from '../../api/client';

export default function AcademiesPanel() {
  const [academies, setAcademies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Inspector Drawer State
  const [selectedAcademy, setSelectedAcademy] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('info');
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [plans, setPlans] = useState([]);

  // Admin Actions
  const [extendDays, setExtendDays] = useState('');
  const [upgradePlanId, setUpgradePlanId] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const loadAcademies = async () => {
    try {
      const response = await superAdminGet('/super-admin/academies');
      // Unwrap standard response mapping
      const fetched = response?.data || response?.academies || response || [];
      setAcademies(Array.isArray(fetched) ? fetched : []);
    } catch (error) {
      setMessage(error.message || 'Failed to fetch platform subscriber registry.');
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const response = await superAdminGet('/super-admin/plans');
      const plansData = response?.data || response?.plans || response || [];
      setPlans(Array.isArray(plansData) ? plansData : []);
    } catch (err) {
      console.error('Failed to load plans:', err);
    }
  };

  useEffect(() => {
    loadAcademies();
    loadPlans();
  }, []);

  const handleOpenAcademy = async (academy) => {
    try {
      const response = await superAdminPost(`/super-admin/academies/${academy.academy_id}/impersonate`);
      if (response?.success) {
        // Store impersonation token and redirect to academy admin
        localStorage.setItem('impersonation_token', response.data.impersonationToken);
        localStorage.setItem('original_super_admin_token', localStorage.getItem('sams_super_admin_token'));
        localStorage.setItem('impersonated_academy_id', academy.academy_id);
        localStorage.setItem('impersonated_academy_name', academy.name);
        window.location.href = '/admin/dashboard';
      }
    } catch (error) {
      setMessage(error.message || 'Failed to open academy');
    }
  };

  const handleViewAcademy = async (academy) => {
    setSelectedAcademy(academy);
    setDetailsLoading(true);
    setDetails(null);
    try {
      const response = await superAdminGet(`/super-admin/academies/${academy.academy_id}`);
      if (response?.success) {
        setDetails(response.data);
      }
    } catch (err) {
      console.error(err);
      setMessage('Failed to fetch detailed diagnostic logs.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const updateStatus = async (academyId, status) => {
    if (!window.confirm(`Are you sure you want to change academy status to ${status.toUpperCase()}?`)) return;
    try {
      const response = await superAdminPatch(`/super-admin/academies/${academyId}/status`, { status: status.toUpperCase() });
      if (response?.success) {
        setAcademies(prev =>
          prev.map(ac => (ac.academy_id === academyId ? { ...ac, status: status.toUpperCase() } : ac))
        );
        if (selectedAcademy && selectedAcademy.academy_id === academyId) {
          setSelectedAcademy(prev => ({ ...prev, status: status.toUpperCase() }));
        }
        setMessage(`Academy status successfully updated to ${status.toUpperCase()}.`);
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (err) {
      setMessage(err.message || 'Failed to update academy status');
    }
  };

  const handleExtendSubscription = async (e) => {
    e.preventDefault();
    if (!extendDays || parseInt(extendDays, 10) <= 0) return;
    setActionSubmitting(true);
    try {
      const response = await superAdminPost(`/super-admin/academies/${selectedAcademy.academy_id}/extend`, {
        days: parseInt(extendDays, 10)
      });
      if (response?.success) {
        alert(`Successfully extended subscription by ${extendDays} days.`);
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
        planId: upgradePlanId
      });
      if (response?.success) {
        alert('Plan tier updated successfully.');
        setUpgradePlanId('');
        // Reload details & main list
        handleViewAcademy(selectedAcademy);
        loadAcademies();
      }
    } catch (err) {
      alert(err.message || 'Failed to modify plan tier');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleExportData = () => {
    if (!details) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(details, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `academy_${selectedAcademy.academy_id}_export.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCloseDrawer = () => {
    setSelectedAcademy(null);
    setDetails(null);
    setActiveDetailTab('info');
  };

  const filteredAcademies = academies.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.academy_id.toString().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            ACTIVE
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-red-500/10 text-red-500 border border-red-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            SUSPENDED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            {status?.toUpperCase() || 'UNKNOWN'}
          </span>
        );
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full overflow-x-hidden">
      {/* Header */}
      <div className="super-glass p-6 rounded-2xl border border-white/10 dark:border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <span className="premium-gradient-purple text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full tracking-widest shadow-lg shadow-purple-500/20">
            Platform Members
          </span>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight mt-2 flex items-center gap-2">
            <Building2 className="text-purple-500 h-6 w-6" /> Academies Management
          </h1>
          <p className="text-muted-foreground text-xs font-semibold">Control subscriber settings, adjust subscription days, suspension state, and review login logs.</p>
        </div>
      </div>

      {message && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-purple-500 text-sm flex items-center gap-2 shadow-inner">
          <Info className="h-4 w-4 shrink-0" />
          <span className="font-semibold">{message}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search academies by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full super-glass border border-white/10 dark:border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:border-purple-500/50 shadow-inner"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto shrink-0 overflow-x-auto">
          {['all', 'active', 'suspended'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all uppercase tracking-wider ${
                statusFilter === filter
                  ? 'premium-gradient-purple text-white shadow-lg shadow-purple-500/25 scale-[1.02]'
                  : 'super-glass border border-white/10 dark:border-white/5 text-muted-foreground hover:text-foreground hover:scale-[1.02]'
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
          <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
        </div>
      ) : filteredAcademies.length === 0 ? (
        <div className="text-center py-20 super-glass rounded-2xl border border-white/10 dark:border-white/5 border-dashed">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4 animate-bounce-slow" />
          <p className="text-muted-foreground font-semibold text-sm">No academies found matching filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAcademies.map((academy) => (
            <div 
              key={academy.academy_id}
              className="super-glass p-5 rounded-2xl border border-white/10 dark:border-white/5 flex flex-col justify-between hover:scale-[1.02] hover:shadow-xl transition-all duration-300"
            >
              <div>
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                        {academy.logo_url ? (
                          <img src={academy.logo_url} alt={academy.name} className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-foreground text-base truncate">{academy.name}</h3>
                        <p className="text-muted-foreground font-semibold text-[10px] mt-0.5 uppercase tracking-wide">ID: #{academy.academy_id} • Plan: {academy.subscription_plan || academy.subscription_tier}</p>
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(academy.status)}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6 py-4 border-y border-white/5 text-center text-xs">
                  <div>
                    <p className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Students</p>
                    <p className="text-foreground font-extrabold text-lg mt-1">{academy._count.students}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Coaches</p>
                    <p className="text-foreground font-extrabold text-lg mt-1">{academy._count.coaches}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs font-semibold text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Contact Person:</span>
                    <span className="text-foreground font-bold">{academy.owner_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contact Email:</span>
                    <span className="text-foreground font-bold truncate max-w-[180px]">{academy.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expiry:</span>
                    <span className="text-foreground font-bold">
                      {academy.subscription_expires_at 
                        ? new Date(academy.subscription_expires_at).toLocaleDateString()
                        : 'Lifetime / Free'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-2 flex gap-2">
                <button
                  onClick={() => handleViewAcademy(academy)}
                  className="flex-1 py-2.5 bg-slate-900 text-white dark:bg-white dark:text-slate-950 rounded-xl hover:opacity-90 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-black/10 transition-all"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Manage Academy
                </button>
                <button
                  onClick={() => handleOpenAcademy(academy)}
                  disabled={academy.status?.toLowerCase() !== 'active'}
                  className={`py-2.5 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md ${
                    academy.status?.toLowerCase() === 'active'
                      ? 'bg-purple-500/10 border border-purple-500/20 text-purple-500 hover:bg-purple-500 hover:text-white'
                      : 'bg-white/5 text-muted-foreground cursor-not-allowed opacity-50'
                  }`}
                  title={academy.status?.toLowerCase() === 'active' ? 'Open Academy as Admin' : 'Academy must be active'}
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
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-45"
              onClick={handleCloseDrawer}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-slate-950/90 dark:bg-slate-900/90 backdrop-blur-3xl border-l border-white/10 p-6 shadow-2xl flex flex-col justify-between text-foreground"
            >
              {/* Drawer Header */}
              <div className="flex justify-between items-start border-b border-white/10 pb-4 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="text-purple-500 h-5 w-5 animate-pulse" />
                    <h2 className="text-lg font-extrabold text-foreground">{selectedAcademy.name}</h2>
                  </div>
                  <p className="text-muted-foreground text-xs font-semibold mt-0.5">Configure billing and diagnostic logs for Academy #{selectedAcademy.academy_id}.</p>
                </div>
                <button onClick={handleCloseDrawer} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Tabs */}
              <div className="flex border-b border-white/5 shrink-0 mt-4 text-xs font-bold uppercase tracking-wider gap-1.5">
                <button 
                  onClick={() => setActiveDetailTab('info')} 
                  className={`pb-2 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                    activeDetailTab === 'info' ? 'border-purple-500 text-purple-500' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Info className="h-3.5 w-3.5" /> Info
                </button>
                <button 
                  onClick={() => setActiveDetailTab('subscription')} 
                  className={`pb-2 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                    activeDetailTab === 'subscription' ? 'border-purple-500 text-purple-500' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5" /> Subscription
                </button>
                <button 
                  onClick={() => setActiveDetailTab('payments')} 
                  className={`pb-2 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                    activeDetailTab === 'payments' ? 'border-purple-500 text-purple-500' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <History className="h-3.5 w-3.5" /> Invoices
                </button>
                <button 
                  onClick={() => setActiveDetailTab('logs')} 
                  className={`pb-2 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                    activeDetailTab === 'logs' ? 'border-purple-500 text-purple-500' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <History className="h-3.5 w-3.5" /> Audit
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto py-6 space-y-6 [&::-webkit-scrollbar]:hidden">
                {detailsLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                  </div>
                ) : details ? (
                  <>
                    {/* Tab 1: Info */}
                    {activeDetailTab === 'info' && (
                      <div className="space-y-4">
                        <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-3 text-sm text-muted-foreground shadow-inner">
                          <div>
                            <span className="text-muted-foreground/60 text-xs block font-bold">Owner Name:</span>
                            <span className="text-foreground font-extrabold">{details.academy.owner_name}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground/60 text-xs block font-bold">Contact Email:</span>
                            <span className="text-foreground font-extrabold">{details.academy.email}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground/60 text-xs block font-bold">Phone Number:</span>
                            <span className="text-foreground font-extrabold">{details.academy.phone_number || 'Not Provided'}</span>
                          </div>
                        </div>

                        {/* Location */}
                        <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-2 text-sm text-muted-foreground shadow-inner">
                          <p className="font-extrabold text-foreground flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-purple-500" /> Address Details
                          </p>
                          <p className="font-semibold">{details.academy.address || 'No Address configured'}</p>
                          {(details.academy.city || details.academy.state) && (
                            <p className="text-xs text-muted-foreground/80 font-bold">{details.academy.city}, {details.academy.state}</p>
                          )}
                          <div className="flex gap-4 text-xs text-muted-foreground/60 font-bold pt-2 border-t border-white/5">
                            <span>Lat: {details.academy.latitude || 'N/A'}</span>
                            <span>Lng: {details.academy.longitude || 'N/A'}</span>
                            <span>Radius: {details.academy.attendance_radius_meters}m</span>
                          </div>
                        </div>

                        {/* Admins Accounts */}
                        <div className="space-y-2">
                          <h4 className="font-bold text-muted-foreground text-xs uppercase tracking-wider">Academy Administrator</h4>
                          {details.admins.map((adm, i) => (
                            <div key={i} className="bg-white/5 p-3 rounded-xl border border-white/5 text-xs flex justify-between shadow-inner">
                              <div>
                                <p className="font-extrabold text-foreground">{adm.name}</p>
                                <p className="text-muted-foreground font-semibold">{adm.email}</p>
                              </div>
                              <span className="text-[10px] text-muted-foreground/60 font-bold self-end">Registered: {new Date(adm.created_at).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tab 2: Subscription status */}
                    {activeDetailTab === 'subscription' && (
                      <div className="space-y-6">
                        <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-3 text-sm text-muted-foreground shadow-inner">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground font-semibold">Plan Tier:</span>
                            <span className="premium-gradient-purple text-white font-extrabold px-3 py-1 rounded-full text-[10px] uppercase shadow-lg shadow-purple-500/20">
                              {details.academy.subscription_plan || details.academy.subscription_tier}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground font-semibold">Trial Status:</span>
                            <span className="text-foreground font-extrabold uppercase">{details.trial_status}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground font-semibold">Expires At:</span>
                            <span className="text-foreground font-extrabold">
                              {details.academy.subscription_expires_at 
                                ? new Date(details.academy.subscription_expires_at).toLocaleDateString()
                                : 'Lifetime / Free'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground font-semibold">Coaches Usage:</span>
                            <span className="text-foreground font-extrabold">{details.total_coaches} coaches registered</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground font-semibold">Students Usage:</span>
                            <span className="text-foreground font-extrabold">{details.total_students} students registered</span>
                          </div>
                        </div>

                        {/* Extend Subscription Form */}
                        <form onSubmit={handleExtendSubscription} className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3 shadow-inner">
                          <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">Extend Trial / Subscription</h4>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              required
                              min="1"
                              placeholder="Number of days to add (e.g. 30)"
                              value={extendDays}
                              onChange={e => setExtendDays(e.target.value)}
                              className="flex-1 super-glass border border-white/10 dark:border-white/5 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-purple-500/50"
                            />
                            <button
                              type="submit"
                              disabled={actionSubmitting}
                              className="px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shrink-0 hover:opacity-90 shadow-md"
                            >
                              {actionSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                              Extend
                            </button>
                          </div>
                        </form>

                        {/* Upgrade Plan Form */}
                        <form onSubmit={handleUpgradePlan} className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3 shadow-inner">
                          <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">Modify Plan Tier</h4>
                          <div className="flex gap-2">
                            <select
                              value={upgradePlanId}
                              onChange={e => setUpgradePlanId(e.target.value)}
                              className="flex-1 super-glass border border-white/10 dark:border-white/5 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-purple-500/50"
                            >
                              <option value="" className="text-slate-900">Select Plan...</option>
                              {plans.map(p => (
                                <option key={p.id} value={p.id} className="text-slate-900">{p.name} (₹{p.price})</option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              disabled={actionSubmitting}
                              className="px-4 py-2 premium-gradient-purple text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shrink-0 hover:opacity-90 shadow-lg shadow-purple-500/20"
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
                        <h4 className="font-bold text-muted-foreground text-xs uppercase tracking-wider">Payment Invoice Receipts</h4>
                        {details.payment_history.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-6 text-center">No payment log history recorded yet.</p>
                        ) : (
                          details.payment_history.map((tx) => (
                            <div key={tx.id} className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-2 text-xs text-muted-foreground shadow-inner">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-extrabold text-foreground">{tx.plan_name}</p>
                                  <p className="text-muted-foreground/60 text-[9px] font-bold mt-0.5">Reference: {tx.transaction_id || 'N/A'}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  tx.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' :
                                  tx.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' :
                                  'bg-red-500/10 text-red-500'
                                }`}>
                                  {tx.status}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] text-muted-foreground/60 font-bold pt-2 border-t border-white/5">
                                <span>Date: {new Date(tx.created_at).toLocaleDateString()}</span>
                                <span className="font-extrabold text-foreground">Amount: ₹{tx.amount}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Tab 4: Audit logs */}
                    {activeDetailTab === 'logs' && (
                      <div className="space-y-3">
                        <h4 className="font-bold text-muted-foreground text-xs uppercase tracking-wider">Recent Login / Audit logs</h4>
                        {details.login_history.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-6 text-center">No diagnostic logs found.</p>
                        ) : (
                          details.login_history.map((log, idx) => (
                            <div key={idx} className="bg-white/5 p-3 rounded-xl border border-white/5 text-xs space-y-1 text-muted-foreground shadow-inner hover:scale-[1.01] transition-transform">
                              <div className="flex justify-between font-bold text-[10px]">
                                <span className="text-purple-500">{log.action}</span>
                                <span className="text-muted-foreground/65">{new Date(log.created_at).toLocaleString()}</span>
                              </div>
                              <p className="font-semibold text-foreground/90">Actor: {log.actor_type} (ID: {log.actor_id})</p>
                              {log.ip_address && <p className="text-[10px] text-muted-foreground/60 font-medium">IP: {log.ip_address}</p>}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground text-center font-bold">Error reading details from backend.</p>
                )}
              </div>

              {/* Drawer Footer Actions */}
              <div className="border-t border-white/10 pt-4 mt-4 shrink-0 flex gap-2">
                <button
                  type="button"
                  onClick={handleExportData}
                  className="flex-1 py-2.5 bg-slate-900 text-white dark:bg-white dark:text-slate-950 border border-white/15 dark:border-white/5 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
                >
                  <Download className="h-4 w-4" /> Export Academy (JSON)
                </button>
                {selectedAcademy.status?.toLowerCase() === 'active' ? (
                  <button
                    type="button"
                    onClick={() => updateStatus(selectedAcademy.academy_id, 'suspended')}
                    className="w-28 py-2.5 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-bold text-xs transition-all shadow-md"
                  >
                    Suspend
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => updateStatus(selectedAcademy.academy_id, 'active')}
                    className="w-28 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl font-bold text-xs transition-all shadow-md"
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
