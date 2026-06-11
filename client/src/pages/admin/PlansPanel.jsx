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
        <form className="card bg-white border p-6 rounded-xl shadow-sm space-y-4" onSubmit={handlePlanSubmit}>
          <h3 className="font-bold text-lg">Create Duration Plan</h3>
          <div>
            <label className="label text-xs font-medium block mb-1" htmlFor="planName">Plan Name</label>
            <input id="planName" name="name" className="input-field border w-full p-2 rounded-lg text-sm" value={planForm.name} onChange={handlePlanChange} required placeholder="e.g. Monthly, Quarterly, Annual" />
          </div>
          <div>
            <label className="label text-xs font-medium block mb-1" htmlFor="planDuration">Duration (Months)</label>
            <input
              id="planDuration"
              name="duration_months"
              type="number"
              min={1}
              className="input-field border w-full p-2 rounded-lg text-sm"
              value={planForm.duration_months}
              onChange={handlePlanChange}
              required
              placeholder="e.g. 1, 3, 6, 12"
            />
          </div>
          <div>
            <label className="label text-xs font-medium block mb-1" htmlFor="planMultiplier">Price Multiplier</label>
            <input
              id="planMultiplier"
              name="multiplier"
              type="number"
              min={0.1}
              step={0.1}
              className="input-field border w-full p-2 rounded-lg text-sm"
              value={planForm.multiplier}
              onChange={handlePlanChange}
              required
              placeholder="e.g. 1.0 for standard, 2.7 for discount"
            />
          </div>
          <button type="submit" className="btn-primary bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2 px-4 rounded-lg transition-colors w-full">Create Plan</button>
        </form>
        <div className="card bg-white border p-6 rounded-xl shadow-sm space-y-4 overflow-x-auto">
          <h3 className="font-bold text-lg">Active Duration Plans</h3>
          {loading ? (
            <Loader />
          ) : (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b text-zinc-400 text-xs uppercase font-bold tracking-wider">
                  <th className="pb-3">Name</th>
                  <th className="pb-3 px-2">Duration (Months)</th>
                  <th className="pb-3 px-2">Multiplier</th>
                  <th className="pb-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {plans && Array.isArray(plans) && plans.length > 0 ? (
                  plans.map((plan) => (
                    <tr key={plan?.plan_id || plan?.id} className="border-b">
                      <td className="py-3 font-medium">{plan?.name}</td>
                      <td className="py-3 px-2">{plan?.duration_months} Month(s)</td>
                      <td className="py-3 px-2">{Number(plan?.multiplier || 1).toFixed(2)}x</td>
                      <td className="py-3 px-2 text-right">
                        <button
                          onClick={() => handleDeletePlan(plan?.plan_id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-zinc-400 text-xs">
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
        <div className={`p-4 rounded-xl text-sm font-semibold border ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
