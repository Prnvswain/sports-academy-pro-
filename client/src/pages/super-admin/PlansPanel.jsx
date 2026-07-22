import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Check, Edit, X, Trash2, ShieldAlert, Sparkles, Loader2, Save, 
  Settings, Layers, Users, Trophy, DollarSign, Calendar 
} from 'lucide-react';
import { superAdminGet, superAdminPost, superAdminPut, superAdminDelete, superAdminPatch } from '../../api/client';

export default function PlansPanel() {
  const [activeTab, setActiveTab] = useState('plans');
  const [plans, setPlans] = useState([]);
  const [trialSettings, setTrialSettings] = useState({
    enabled: true,
    duration_days: 14,
    default_plan_id: 'free',
    restrictions: {
      limit_coaches: true,
      limit_students: true
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Edit / Create Drawer State
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [planForm, setPlanForm] = useState({
    name: '',
    price: '',
    duration: 'Monthly',
    teacher_limit: '',
    student_limit: '',
    highlights: '',
    features: '',
    status: 'active'
  });

  const loadPlans = useCallback(async () => {
    try {
      const response = await superAdminGet('/super-admin/plans');
      const plansData = response?.data || response?.plans || response || [];
      setPlans(Array.isArray(plansData) ? plansData : []);
    } catch (error) {
      console.error("Super Admin plans fetch validation error:", error);
      setMessage(error.message || 'Failed to fetch platform pricing tiers.');
    }
  }, []);

  const loadTrialSettings = async () => {
    try {
      const response = await superAdminGet('/super-admin/trial-settings');
      if (response?.success) {
        setTrialSettings(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch trial settings:', err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([loadPlans(), loadTrialSettings()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleOpenCreate = () => {
    setSelectedPlan(null);
    setPlanForm({
      name: '',
      price: '',
      duration: 'Monthly',
      teacher_limit: '',
      student_limit: '',
      highlights: '',
      features: '',
      status: 'active'
    });
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (plan) => {
    setSelectedPlan(plan);
    setPlanForm({
      name: plan.name || '',
      price: plan.price !== undefined ? String(plan.price) : '',
      duration: plan.duration || 'Monthly',
      teacher_limit: plan.teacher_limit !== null && plan.teacher_limit !== undefined ? String(plan.teacher_limit) : '',
      student_limit: plan.student_limit !== null && plan.student_limit !== undefined ? String(plan.student_limit) : '',
      highlights: Array.isArray(plan.highlights) ? plan.highlights.join(', ') : '',
      features: Array.isArray(plan.features) ? plan.features.join(', ') : '',
      status: plan.status || 'active'
    });
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedPlan(null);
  };

  const handlePlanFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    
    // Parse lists
    const highlightsArr = planForm.highlights.split(',').map(s => s.trim()).filter(Boolean);
    const featuresArr = planForm.features.split(',').map(s => s.trim()).filter(Boolean);

    const payload = {
      name: planForm.name.trim(),
      price: parseFloat(planForm.price) || 0,
      duration: planForm.duration,
      teacher_limit: planForm.teacher_limit.trim() ? parseInt(planForm.teacher_limit, 10) : null,
      student_limit: planForm.student_limit.trim() ? parseInt(planForm.student_limit, 10) : null,
      highlights: highlightsArr,
      features: featuresArr,
      status: planForm.status
    };

    try {
      if (selectedPlan) {
        // Edit Mode
        const response = await superAdminPut(`/super-admin/plans/${selectedPlan.id}`, payload);
        if (response?.success) {
          alert('Plan updated successfully!');
          loadPlans();
          handleCloseDrawer();
        }
      } else {
        // Create Mode
        const response = await superAdminPost('/super-admin/plans', payload);
        if (response?.success) {
          alert('Plan created successfully!');
          loadPlans();
          handleCloseDrawer();
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to save plan');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!selectedPlan) return;
    if (!window.confirm(`Are you absolutely sure you want to delete the plan "${selectedPlan.name}"? This action cannot be undone.`)) return;
    setSubmitLoading(true);
    try {
      const response = await superAdminDelete(`/super-admin/plans/${selectedPlan.id}`);
      if (response?.success) {
        alert('Plan deleted successfully!');
        loadPlans();
        handleCloseDrawer();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete plan');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUpdateTrialSettings = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      const response = await superAdminPut('/super-admin/trial-settings', trialSettings);
      if (response?.success) {
        alert('Trial settings updated successfully!');
      }
    } catch (err) {
      alert(err.message || 'Failed to update trial settings');
    } finally {
      setSubmitLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            ACTIVE
          </span>
        );
      case 'disabled':
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
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Layers className="text-lime-400 h-6 w-6" /> Platform Pricing Matrix
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Configure subscription plans, pricing, limits, and system trial policies.</p>
        </div>
        
        {activeTab === 'plans' && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-950 bg-lime-400 rounded-xl hover:bg-lime-300 transition-all shadow-md shadow-lime-400/10 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create Plan
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-850 gap-6">
        <button
          onClick={() => setActiveTab('plans')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'plans' ? 'border-lime-400 text-lime-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="h-4 w-4" /> SaaS Subscription Plans ({plans.length})
        </button>
        <button
          onClick={() => setActiveTab('trials')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'trials' ? 'border-lime-400 text-lime-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="h-4 w-4" /> Free Trial Settings
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-lime-400" />
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Tab 1: Plans list */}
          {activeTab === 'plans' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div 
                  key={plan.id}
                  className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-750 hover:bg-slate-900/60 transition-all shadow-md shadow-slate-950/20"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="font-extrabold text-white text-lg tracking-tight">{plan.name}</h3>
                        {plan.highlights?.[0] && (
                          <span className="text-xs text-lime-400 font-semibold">{plan.highlights[0]}</span>
                        )}
                      </div>
                      {getStatusBadge(plan.status)}
                    </div>

                    <div className="py-2">
                      <p className="text-3xl font-extrabold text-white">₹{plan.price}</p>
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Billed {plan.duration}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800 text-xs">
                      <div>
                        <p className="text-slate-500 uppercase tracking-wider font-semibold">Coaches Limit</p>
                        <p className="text-white font-extrabold text-sm mt-1">{plan.teacher_limit || 'Unlimited'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 uppercase tracking-wider font-semibold">Students Limit</p>
                        <p className="text-white font-extrabold text-sm mt-1">{plan.student_limit || 'Unlimited'}</p>
                      </div>
                    </div>

                    <ul className="space-y-1.5 pt-4 border-t border-slate-800 text-xs text-slate-400">
                      {plan.features?.map((f, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-lime-400" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleOpenEdit(plan)}
                    className="w-full mt-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Modify Plan Specifications
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Tab 2: Trial Settings */}
          {activeTab === 'trials' && (
            <div className="max-w-2xl bg-slate-900/40 border border-slate-800 p-6 rounded-2xl backdrop-blur-md">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="text-lime-400 h-5 w-5 animate-pulse" /> Trial Configuration Dashboard
              </h2>
              <form onSubmit={handleUpdateTrialSettings} className="space-y-5">
                <div className="flex items-center gap-3 py-2 border-b border-slate-850">
                  <input
                    type="checkbox"
                    id="trial_enabled"
                    checked={trialSettings.enabled}
                    onChange={e => setTrialSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="h-4 w-4 text-lime-500 bg-slate-950 rounded border-slate-800 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="trial_enabled" className="text-sm font-bold text-slate-200 select-none cursor-pointer">
                    Enable Default Free Trials for New Academy Registrations
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-350 mb-1.5">Default Trial Length (Days)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={trialSettings.duration_days}
                      onChange={e => setTrialSettings(prev => ({ ...prev, duration_days: parseInt(e.target.value, 10) || '' }))}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-4 text-sm text-slate-200 focus:outline-none focus:border-lime-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-355 mb-1.5">Target Trial Plan</label>
                    <select
                      value={trialSettings.default_plan_id}
                      onChange={e => setTrialSettings(prev => ({ ...prev, default_plan_id: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-4 text-sm text-slate-200 focus:outline-none focus:border-lime-500"
                    >
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-850">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-450">Active Trial Constraints</h4>
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="limit_coaches"
                        checked={trialSettings.restrictions.limit_coaches}
                        onChange={e => setTrialSettings(prev => ({
                          ...prev,
                          restrictions: { ...prev.restrictions, limit_coaches: e.target.checked }
                        }))}
                        className="h-4 w-4 text-lime-500 bg-slate-950 rounded border-slate-800 focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor="limit_coaches" className="text-xs font-semibold text-slate-300 select-none cursor-pointer">
                        Restrict Coaches addition past active plan limit
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="limit_students"
                        checked={trialSettings.restrictions.limit_students}
                        onChange={e => setTrialSettings(prev => ({
                          ...prev,
                          restrictions: { ...prev.restrictions, limit_students: e.target.checked }
                        }))}
                        className="h-4 w-4 text-lime-500 bg-slate-950 rounded border-slate-800 focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor="limit_students" className="text-xs font-semibold text-slate-300 select-none cursor-pointer">
                        Restrict Students addition past active plan limit
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitLoading}
                  className="w-full mt-4 py-3 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {submitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Policy Configuration
                </button>
              </form>
            </div>
          )}

        </div>
      )}

      {/* Create / Edit drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-45"
              onClick={handleCloseDrawer}
            />

            {/* Slider container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-slate-900 border-l border-slate-800 p-6 shadow-2xl flex flex-col justify-between"
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-4 shrink-0">
                <div>
                  <h3 className="text-lg font-extrabold text-white">
                    {selectedPlan ? `Edit Specifications: ${selectedPlan.name}` : 'Create Platform Plan'}
                  </h3>
                  <p className="text-slate-450 text-xs mt-0.5">Customize pricing thresholds, highlights, limits, and capabilities.</p>
                </div>
                <button onClick={handleCloseDrawer} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form container */}
              <form onSubmit={planFormSubmit => handlePlanFormSubmit(planFormSubmit)} className="flex-1 overflow-y-auto py-6 space-y-4 [&::-webkit-scrollbar]:hidden">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Plan Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pro Academy Track"
                    value={planForm.name}
                    onChange={e => setPlanForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-lime-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Price (INR, ₹)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="e.g. 790"
                      value={planForm.price}
                      onChange={e => setPlanForm(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-lime-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Billing Period</label>
                    <select
                      value={planForm.duration}
                      onChange={e => setPlanForm(prev => ({ ...prev, duration: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-lime-500"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Half-Yearly">Half-Yearly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Coaches Limit</label>
                    <input
                      type="number"
                      placeholder="Leave blank for unlimited"
                      value={planForm.teacher_limit}
                      onChange={e => setPlanForm(prev => ({ ...prev, teacher_limit: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-lime-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Students Limit</label>
                    <input
                      type="number"
                      placeholder="Leave blank for unlimited"
                      value={planForm.student_limit}
                      onChange={e => setPlanForm(prev => ({ ...prev, student_limit: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-lime-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Highlights (Comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Recommended for growing academies, Save 10%"
                    value={planForm.highlights}
                    onChange={e => setPlanForm(prev => ({ ...prev, highlights: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-lime-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Features Included (Comma separated)</label>
                  <textarea
                    rows="3"
                    placeholder="e.g. Smart batch scheduling tracking, Automated email notification systems, Standard portal access support"
                    value={planForm.features}
                    onChange={e => setPlanForm(prev => ({ ...prev, features: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-lime-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Package Status</label>
                  <select
                    value={planForm.status}
                    onChange={e => setPlanForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full bg-slate-955 border border-slate-800 rounded-xl py-2 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-lime-500"
                  >
                    <option value="active">Active State</option>
                    <option value="disabled">Suspended State</option>
                  </select>
                </div>

                {/* Submit button inside overflow wrapper to avoid block */}
                <button type="submit" className="hidden" id="submit-hidden-btn" />
              </form>

              {/* Drawer Footer */}
              <div className="border-t border-slate-800 pt-4 mt-4 shrink-0 flex gap-2">
                {selectedPlan && (
                  <button
                    type="button"
                    onClick={handleDeletePlan}
                    disabled={submitLoading}
                    className="px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-505 hover:text-white hover:bg-red-500 rounded-xl font-bold text-xs transition-all shrink-0 flex items-center justify-center"
                    title="Delete Plan"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => document.getElementById('submit-hidden-btn').click()}
                  disabled={submitLoading}
                  className="flex-1 py-3 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {submitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {selectedPlan ? 'Save plan changes' : 'Create Pricing Plan'}
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}