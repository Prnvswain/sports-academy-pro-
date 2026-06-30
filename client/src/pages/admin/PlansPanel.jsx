import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Loader from '../../components/Loader';
import { adminGet, adminPost, adminDelete } from '../../api/client';

const emptyPlanForm = {
  name: '',
  duration_months: '',
  multiplier: ''
};

export default function PlansPanel() {
  const [plans, setPlans] = useState([]);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  // ─── 1. CORRECTED ACADEMY DATA FETCHING LOOP ───────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage({ text: '', type: '' }); // Purane alerts clear blocks
    try {
      // 🎯 ACADEMY SCOPE: Strictly hitting internal academy sports durations
      const plansRes = await adminGet('/admin/duration-plans');
      
      // Response payload extraction
      const plansData = plansRes?.data || plansRes?.plans || plansRes || [];
      
      setPlans(Array.isArray(plansData) ? plansData : []);
    } catch (error) {
      console.error("Fetch academy duration plans failure:", error);
      setMessage({ 
        text: error.response?.data?.message || error.message || 'Session expired or unauthorized academy token.', 
        type: 'error' 
      });
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePlanChange = (event) => {
    const { name, value } = event.target;
    setPlanForm((prev) => ({ ...prev, [name]: value }));
  };

  // ─── 2. CORRECTED SUBMIT FLOW ──────────────────────────────────────────
  const handlePlanSubmit = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });
    try {
      // 🎯 ACADEMY SCOPE: Save dynamic sport multiplier structure
      const result = await adminPost('/admin/duration-plans', {
        name: planForm.name?.trim(),
        duration_months: parseInt(planForm.duration_months, 10),
        multiplier: parseFloat(planForm.multiplier)
      });
      
      setMessage({ text: result?.message || 'Sport duration plan created successfully! 🎉', type: 'success' });
      setPlanForm(emptyPlanForm);
      loadData(); // Soft refresh list sequence
    } catch (error) {
      setMessage({ text: error.response?.data?.message || error.message || 'Failed to create duration plan.', type: 'error' });
    }
  };

  // ─── 3. CORRECTED DELETE BLOCK ─────────────────────────────────────────
  const handleDeletePlan = async (plan_id) => {
    const targetId = plan_id;
    if (!targetId) return;

    if (!confirm('Are you sure you want to delete this sport duration plan?')) return;
    setMessage({ text: '', type: '' });
    try {
      await adminDelete(`/admin/duration-plans/${targetId}`);
      setMessage({ text: 'Sport duration plan deleted successfully', type: 'success' });
      loadData();
    } catch (error) {
      setMessage({ text: error.response?.data?.message || error.message || 'Delete operation failed.', type: 'error' });
    }
  };

  return (
    <motion.div
      className="space-y-6 w-full overflow-x-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div>
        <h2 className="text-2xl font-bold">Sport Duration Plans</h2>
        <p className="text-muted">Configure pricing multipliers and duration periods for student sport enrollments.</p>
      </div>

      {message?.text && (
        <div className={message.type === 'success' ? 'alert-success flex justify-between items-center p-4 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-sm' : 'alert-error flex justify-between items-center p-4 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl text-sm'}>
          <span>{message.text}</span>
          <button 
            type="button"
            onClick={() => setMessage({ text: '', type: '' })}
            className="text-xs font-bold hover:opacity-70 transition-opacity cursor-pointer ml-4 px-2 py-1 bg-background rounded border border-border"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Creation Form block */}
        <form className="card space-y-4 bg-surface p-6 border border-border rounded-2xl" onSubmit={handlePlanSubmit}>
          <h3 className="font-bold text-lg">Create Sport Duration Plan</h3>
          <div>
            <label className="label block text-sm font-medium mb-1" htmlFor="planName">Plan Name</label>
            <motion.input 
              id="planName" 
              name="name" 
              className="input-field w-full p-2 border border-border rounded-lg bg-background text-foreground" 
              value={planForm.name} 
              onChange={handlePlanChange} 
              required 
              placeholder="e.g. Monthly, Quarterly, Annual"
              whileFocus={{ scale: 1.01 }}
            />
          </div>
          <div>
            <label className="label block text-sm font-medium mb-1" htmlFor="planDuration">Duration (Months)</label>
            <motion.input
              id="planDuration"
              name="duration_months"
              type="number"
              min={1}
              className="input-field w-full p-2 border border-border rounded-lg bg-background text-foreground"
              value={planForm.duration_months}
              onChange={handlePlanChange}
              required
              placeholder="e.g. 1, 3, 6, 12"
              whileFocus={{ scale: 1.01 }}
            />
          </div>
          <div>
            <label className="label block text-sm font-medium mb-1" htmlFor="planMultiplier">Price Multiplier</label>
            <motion.input
              id="planMultiplier"
              name="multiplier"
              type="number"
              min={0.1}
              step={0.1}
              className="input-field w-full p-2 border border-border rounded-lg bg-background text-foreground"
              value={planForm.multiplier}
              onChange={handlePlanChange}
              required
              placeholder="e.g. 1.0 for standard, 2.7 for multiple months discount"
              whileFocus={{ scale: 1.01 }}
            />
          </div>
          <motion.button 
            type="submit" 
            className="btn-primary w-full p-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Create Plan
          </motion.button>
        </form>

        {/* Dynamic List Data Matrix Table */}
        <div className="card space-y-4 overflow-x-auto bg-surface p-6 border border-border rounded-2xl">
          <h3 className="font-bold text-lg">Active Sport Duration Plans</h3>
          {loading ? (
            <Loader />
          ) : (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted text-xs uppercase font-bold tracking-wider">
                  <th className="pb-3">Name</th>
                  <th className="pb-3 px-2">Duration (Months)</th>
                  <th className="pb-3 px-2">Multiplier</th>
                  <th className="pb-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {plans && Array.isArray(plans) && plans.length > 0 ? (
                  plans.map((plan, index) => {
                    const currentId = plan?.plan_id || plan?.id;
                    return (
                      <motion.tr
                        key={currentId || index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ backgroundColor: 'rgba(0,0,0,0.01)' }}
                        className="text-foreground"
                      >
                        <td className="py-3 font-medium">{plan?.name}</td>
                        <td className="py-3 px-2 text-muted">{plan?.duration_months} Month(s)</td>
                        <td className="py-3 px-2">{Number.isFinite(Number(plan?.multiplier || 1)) ? Number(plan?.multiplier || 1).toFixed(2) : '1.00'}x</td>
                        <td className="py-3 px-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeletePlan(currentId)}
                            className="text-rose-500 hover:text-rose-400 text-sm font-medium transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted text-xs">
                      No sport duration plans configured yet. Create one on the left.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </motion.div>
  );
}