import { useCallback, useEffect, useState } from 'react';
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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const plansRes = await adminGet('/admin/duration-plans');
      const plansData = plansRes?.data?.data || plansRes?.data || [];
      setPlans(Array.isArray(plansData) ? plansData : []);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
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

  const handlePlanSubmit = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });
    try {
      const result = await adminPost('/admin/duration-plans', {
        name: planForm.name?.trim(),
        duration_months: parseInt(planForm.duration_months, 10),
        multiplier: parseFloat(planForm.multiplier)
      });
      setMessage({ text: result?.message || 'Duration plan created successfully', type: 'success' });
      setPlanForm(emptyPlanForm);
      loadData();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const handleDeletePlan = async (plan_id) => {
    if (!confirm('Are you sure you want to delete this duration plan?')) return;
    setMessage({ text: '', type: '' });
    try {
      await adminDelete(`/admin/duration-plans/${plan_id}`);
      setMessage({ text: 'Duration plan deleted successfully', type: 'success' });
      loadData();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Duration Plans</h2>
        <p className="text-muted">Configure pricing multipliers and duration periods for enrollment plans.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <form className="card space-y-4" onSubmit={handlePlanSubmit}>
          <h3 className="font-bold text-lg">Create Duration Plan</h3>
          <div>
            <label className="label" htmlFor="planName">Plan Name</label>
            <input id="planName" name="name" className="input-field" value={planForm.name} onChange={handlePlanChange} required placeholder="e.g. Monthly, Quarterly, Annual" />
          </div>
          <div>
            <label className="label" htmlFor="planDuration">Duration (Months)</label>
            <input
              id="planDuration"
              name="duration_months"
              type="number"
              min={1}
              className="input-field"
              value={planForm.duration_months}
              onChange={handlePlanChange}
              required
              placeholder="e.g. 1, 3, 6, 12"
            />
          </div>
          <div>
            <label className="label" htmlFor="planMultiplier">Price Multiplier</label>
            <input
              id="planMultiplier"
              name="multiplier"
              type="number"
              min={0.1}
              step={0.1}
              className="input-field"
              value={planForm.multiplier}
              onChange={handlePlanChange}
              required
              placeholder="e.g. 1.0 for standard, 2.7 for discount"
            />
          </div>
          <button type="submit" className="btn-primary w-full cursor-pointer">Create Plan</button>
        </form>
        <div className="card space-y-4 overflow-x-auto">
          <h3 className="font-bold text-lg">Active Duration Plans</h3>
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
                  plans.map((plan) => (
                    <tr key={plan?.plan_id || plan?.id} className="text-foreground">
                      <td className="py-3 font-medium">{plan?.name}</td>
                      <td className="py-3 px-2 text-muted">{plan?.duration_months} Month(s)</td>
                      <td className="py-3 px-2">{Number(plan?.multiplier || 1).toFixed(2)}x</td>
                      <td className="py-3 px-2 text-right">
                        <button
                          onClick={() => handleDeletePlan(plan?.plan_id)}
                          className="text-danger hover:text-danger/80 text-sm font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted text-xs">
                      No duration plans configured yet. Create one on the left.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {message?.text && (
        <div className={message.type === 'success' ? 'alert-success' : 'alert-error'}>
          {message.text}
        </div>
      )}
    </div>
  );
}
