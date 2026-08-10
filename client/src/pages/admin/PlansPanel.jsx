import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Trash2 } from 'lucide-react';
import Loader from '../../components/Loader';
import { adminGet, adminPost, adminDelete } from '../../api/client';

export default function PlansPanel() {
  const [plans, setPlans] = useState([]);
  const [planForm, setPlanForm] = useState({ name: '', duration_type: 'MONTHS', duration: '', multiplier: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Background Sports Icons (SVG Array)
  const sportIcons = ['⚽', '🏀', '🎾', '🏸', '🏏', '🏐', '🏉', '🏓'];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGet('/admin/duration-plans');
      setPlans(res?.data || res?.plans || res || []);
    } catch (e) {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getEquivalentDays = (val) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num <= 0) return 0;
    if (num === 1) return 30;
    if (num === 3) return 90;
    if (num === 6) return 180;
    if (num === 12) return 365;
    return num * 30;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        name: planForm.name.trim(),
        duration_type: planForm.duration_type,
        duration: parseInt(planForm.duration, 10),
        multiplier: parseFloat(planForm.multiplier)
      };

      if (!payload.name) throw new Error('Plan name is required');
      if (isNaN(payload.duration) || payload.duration < 1) throw new Error('Duration must be at least 1');
      if (isNaN(payload.multiplier) || payload.multiplier < 0.1) throw new Error('Multiplier must be at least 0.1');

      await adminPost('/admin/duration-plans', payload);
      setPlanForm({ name: '', duration_type: 'MONTHS', duration: '', multiplier: '' });
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to create plan');
    }
  };

  const handleDelete = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this duration plan?')) return;
    setError('');
    try {
      await adminDelete(`/admin/duration-plans/${planId}`);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to delete plan');
    }
  };

  return (
    <motion.div
      className="relative z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Background Floating Sports Icons */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] select-none flex flex-wrap justify-around items-center z-0 overflow-hidden">
        {Array.from({ length: 16 }).map((_, i) => (
          <motion.div 
            key={i} 
            initial={{ y: 0 }} animate={{ y: [0, -20, 0] }} 
            transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
            className="text-8xl p-10"
          >
            {sportIcons[i % sportIcons.length]}
          </motion.div>
        ))}
      </div>

      <div className="mx-auto max-w-7xl space-y-6 relative z-10">
        {/* Header Panel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-80 p-5 rounded-3xl shadow-sm relative overflow-hidden transition-all">
          <div>
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ rotate: 15, scale: 1.05 }}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-500 border border-emerald-100 dark:border-emerald-800/50 shadow-inner"
              >
                <Clock className="h-6 w-6" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white uppercase leading-none">Duration Plans</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1 font-semibold text-xs tracking-wide">Manage your academy's subscription pricing & duration models.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          
          {/* Create Form */}
          <motion.form 
            onSubmit={handleSubmit}
            className="card p-6 bg-card shadow-sm border border-gray-150 dark:border-gray-850"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-2xl font-bold mb-6">Create New Plan</h3>
            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm mb-4 font-semibold">
                {error}
              </div>
            )}
            <div className="space-y-5">
              <div>
                <label className="label text-sm font-semibold mb-1 block">Plan Name</label>
                <input 
                  className="input-field h-12 w-full" 
                  placeholder="Plan Name (e.g. Quarterly)"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-sm font-semibold mb-1 block">Duration Type</label>
                  <select
                    className="input-field h-12 w-full bg-white dark:bg-gray-900"
                    value={planForm.duration_type}
                    onChange={(e) => setPlanForm({ ...planForm, duration_type: e.target.value, duration: '' })}
                  >
                    <option value="MONTHS">Months</option>
                    <option value="DAYS">Days</option>
                  </select>
                </div>
                <div>
                  <label className="label text-sm font-semibold mb-1 block">Multiplier</label>
                  <input 
                    className="input-field h-12 w-full" 
                    type="number" 
                    step="0.01"
                    min="0.1"
                    placeholder="Multiplier (e.g. 1.0)"
                    value={planForm.multiplier}
                    onChange={(e) => setPlanForm({ ...planForm, multiplier: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                {planForm.duration_type === 'MONTHS' ? (
                  <div>
                    <label className="label text-sm font-semibold mb-1 block">Duration (Months)</label>
                    <input 
                      className="input-field h-12 w-full" 
                      type="number" 
                      min="1"
                      placeholder="e.g. 3" 
                      value={planForm.duration}
                      onChange={(e) => setPlanForm({ ...planForm, duration: e.target.value })}
                      required
                    />
                    {planForm.duration && (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-500 mt-1 block">
                        Equivalent to {getEquivalentDays(planForm.duration)} Days
                      </span>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="label text-sm font-semibold mb-1 block">Duration (Days)</label>
                    <input 
                      className="input-field h-12 w-full" 
                      type="number" 
                      min="1"
                      placeholder="e.g. 45" 
                      value={planForm.duration}
                      onChange={(e) => setPlanForm({ ...planForm, duration: e.target.value })}
                      required
                    />
                  </div>
                )}
              </div>

              <button type="submit" className="btn-primary w-full h-12 text-lg shadow-lg shadow-primary/30">Create Plan</button>
            </div>
          </motion.form>

          {/* Table */}
          <motion.div 
            className="card p-6 bg-card shadow-sm border border-gray-150 dark:border-gray-850"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-2xl font-bold mb-6">Active Plans</h3>
            {loading ? (
              <div className="flex justify-center p-8"><Loader /></div>
            ) : plans.length === 0 ? (
              <div className="text-center p-8 text-gray-500 font-semibold">No active plans found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-y-4">
                  <thead>
                    <tr className="text-muted-foreground text-xs uppercase font-bold tracking-widest">
                      <th className="px-4">Plan Name</th>
                      <th className="px-4">Duration</th>
                      <th className="px-4">Type</th>
                      <th className="px-4">Multiplier</th>
                      <th className="px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {plans.map((p, i) => (
                      <tr key={i} className="bg-secondary/50 rounded-lg hover:bg-secondary transition-colors">
                        <td className="p-4 font-bold rounded-l-xl">{p.name}</td>
                        <td className="p-4 font-medium">
                          {p.duration_type === 'DAYS'
                            ? `${p.duration} Days`
                            : `${getEquivalentDays(p.duration)} Days`
                          }
                        </td>
                        <td className="p-4">
                          {p.duration_type === 'DAYS' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
                              Days
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                              Months
                            </span>
                          )}
                        </td>
                        <td className="p-4"><span className="badge badge-success px-3 py-1">{p.multiplier}x</span></td>
                        <td className="p-4 text-right rounded-r-xl">
                          <button 
                            type="button"
                            onClick={() => handleDelete(p.plan_id)}
                            className="text-destructive hover:scale-110 transition-transform"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}