import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, Edit, X } from 'lucide-react';
import { superAdminGet, superAdminPatch } from '../../api/client';

export default function PlansPanel() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // ─── DATA FETCHING MATRIX (SUPER ADMIN CONTEXT) ───────────────────────
  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const response = await superAdminGet('/super-admin/plans');
      const plansData = response?.data || response?.plans || response || [];
      setPlans(Array.isArray(plansData) ? plansData : []);
    } catch (error) {
      console.error("Super Admin plans fetch validation error:", error);
      setMessage(error.response?.data?.message || error.message || 'Failed to fetch platform pricing tiers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const updatePlanStatus = async (planId, status) => {
    try {
      await superAdminPatch(`/super-admin/plans/${planId}/status`, { status });
      setMessage(`Plan status updated to ${status?.toUpperCase()} successfully! 🎉`);
      loadPlans();
      handleCloseDrawer(); // Smooth close operations after update sequence completes
    } catch (error) {
      setMessage(error.response?.data?.message || error.message);
    }
  };

  const handleViewPlan = (plan) => {
    setSelectedPlan(plan);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedPlan(null);
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            ACTIVE
          </span>
        );
      case 'disabled':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            DISABLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full bg-slate-50 text-slate-700 border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            {status?.toUpperCase() || 'UNKNOWN'}
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen space-y-6 p-6 w-full overflow-x-hidden">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-center justify-between gap-4 w-full"
      >
        <div>
          <h2 className="text-slate-800 text-2xl font-bold">Subscription Plans</h2>
          <p className="text-slate-400 text-sm mt-1">
            Manage SaaS platform billing packages and pricing tiers for academies
          </p>
        </div>
        <motion.button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 transition-all shadow-sm cursor-pointer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          Create New Plan
        </motion.button>
      </motion.div>

      {/* Top Banner Alert System Notifications */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-700 flex justify-between items-center"
        >
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-blue-400 hover:text-blue-600 text-xs font-bold cursor-pointer">
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Pricing Configuration Structural Container Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-slate-400 text-sm font-medium tracking-wide">
            Loading platform pricing architecture...
          </div>
        </div>
      ) : plans?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-200 bg-white/50 rounded-2xl">
          <div className="text-slate-400 text-sm">No infrastructure plans deployed yet.</div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full"
        >
          {plans.map((plan, index) => (
            <motion.div
              key={plan.plan_id || plan.id || index}
              className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col relative hover:shadow-xl hover:border-emerald-200 transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              {/* Top Meta Details bar */}
              <div className="flex items-start justify-between mb-4 gap-2">
                <div>
                  <h3 className="text-slate-800 text-xl font-bold tracking-tight">
                    {plan.name || plan.plan_name || 'Premium Package'}
                  </h3>
                  <p className="text-slate-400 text-xs mt-1 line-clamp-2 min-h-[32px]">
                    {plan.description || 'Enterprise base feature package.'}
                  </p>
                </div>
                <div className="shrink-0">{getStatusBadge(plan.status)}</div>
              </div>

              {/* Cost Center Block Metrics */}
              <div className="mb-6 bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-800">
                    ${plan.price || plan.monthly_price || 0}
                  </span>
                  <span className="text-slate-400 text-xs font-medium">
                    / {plan.billing_cycle || 'month'}
                  </span>
                </div>
                {plan.annual_price && (
                  <p className="text-emerald-600 text-xs font-semibold mt-1">
                    ${plan.annual_price} billed annually (Save corporate discount)
                  </p>
                )}
              </div>

              {/* Service Matrix Core Array Block */}
              <div className="flex-1 mb-6">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-3">
                  Included Features
                </p>
                <ul className="space-y-2.5">
                  {plan.features && Array.isArray(plan.features) && plan.features.length > 0 ? (
                    plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-600 text-sm">{feature}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-400 text-xs italic">Full platform access features configuration.</li>
                  )}
                </ul>
              </div>

              {/* Actions Interface Section */}
              <div className="border-t border-slate-100 pt-4 mt-auto">
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
                    onClick={() => handleViewPlan(plan)}
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit Context
                  </button>
                  <button
                    type="button"
                    className="flex-1 text-center px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    Manage Features
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* 🎯 FIX: Wrapped complete portal context overlay tree inside AnimatePresence */}
      <AnimatePresence>
        {isDrawerOpen && selectedPlan && (
          <>
            {/* Backdrop Mask */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
              onClick={handleCloseDrawer}
            />
            
            {/* Dynamic Drawer Sheet Core Slider Module */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl overflow-y-auto"
            >
              <div className="p-6 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
                    <h2 className="text-slate-800 text-lg font-bold">Plan Architectural Specifications</h2>
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-1.5 transition-all cursor-pointer"
                      onClick={handleCloseDrawer}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">
                        Plan Specification Label
                      </label>
                      <p className="text-slate-800 text-base font-bold mt-1">
                        {selectedPlan.name || selectedPlan.plan_name}
                      </p>
                    </div>

                    <div>
                      <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">
                        Billing Operational Cost
                      </label>
                      <p className="text-slate-800 text-base font-semibold mt-1">
                        ${selectedPlan.price || selectedPlan.monthly_price || 0} / {selectedPlan.billing_cycle || 'month'}
                      </p>
                    </div>

                    <div>
                      <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">
                        Current Cloud Provisioning Status
                      </label>
                      <div className="mt-1.5">{getStatusBadge(selectedPlan.status)}</div>
                    </div>

                    <div>
                      <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">
                        Package Scope Summary Description
                      </label>
                      <p className="text-slate-600 text-sm mt-1 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {selectedPlan.description || 'No custom runtime notes configured.'}
                      </p>
                    </div>

                    <div>
                      <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-2">
                        Platform Capabilities Enrolled
                      </label>
                      <ul className="space-y-2">
                        {selectedPlan.features?.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2 text-slate-600 text-sm">
                            <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                            {feature}
                          </li>
                        )) || <li className="text-slate-400 text-sm italic">No features configured</li>}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Status Trigger Action Matrix */}
                <div className="pt-6 border-t border-slate-100 mt-8">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="flex-1 py-2.5 text-xs font-bold text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 transition-all shadow-sm cursor-pointer"
                      onClick={() => updatePlanStatus(selectedPlan.plan_id || selectedPlan.id, 'active')}
                    >
                      Deploy Active State
                    </button>
                    <button
                      type="button"
                      className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
                      onClick={() => updatePlanStatus(selectedPlan.plan_id || selectedPlan.id, 'disabled')}
                    >
                      Suspend Package
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}