import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Loader from '../../components/Loader';
import { adminGet, adminPost, adminDelete } from '../../api/client';

export default function PlansPanel() {
  const [plans, setPlans] = useState([]);
  const [planForm, setPlanForm] = useState({ name: '', duration_months: '', multiplier: '' });
  const [loading, setLoading] = useState(true);

  // Background Sports Icons (SVG Array)
  const sportIcons = ['⚽', '🏀', '🎾', '🏸', '🏏', '🏐', '🏉', '🏓'];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGet('/admin/duration-plans');
      setPlans(res?.data || res?.plans || res || []);
    } catch (e) { setPlans([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="relative min-h-screen p-8">
      {/* Background Floating Sports Icons */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] select-none flex flex-wrap justify-around items-center z-0 overflow-hidden">
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

      <motion.div 
        className="relative z-10 max-w-7xl mx-auto space-y-10"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      >
        {/* Header */}
        <div className="space-y-2">
          <h2 className="text-4xl font-extrabold text-foreground tracking-tight">Duration Plans</h2>
          <p className="text-lg text-muted-foreground">Manage your academy's subscription pricing & duration models.</p>
        </div>

        {/* Content Grid with massive gap */}
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          
          {/* Create Form */}
          <motion.form 
            className="card p-8 bg-card shadow-xl border-t-4 border-primary"
            initial={{ x: -50 }} animate={{ x: 0 }}
          >
            <h3 className="text-2xl font-bold mb-6">Create New Plan</h3>
            <div className="space-y-5">
              <input className="input-field h-12" placeholder="Plan Name (e.g. Monthly)" />
              <div className="grid grid-cols-2 gap-4">
                <input className="input-field h-12" type="number" placeholder="Duration (Months)" />
                <input className="input-field h-12" type="number" placeholder="Multiplier (e.g. 1.0x)" />
              </div>
              <button className="btn-primary w-full h-12 text-lg shadow-lg shadow-primary/30">Create Plan</button>
            </div>
          </motion.form>

          {/* Table */}
          <motion.div 
            className="card p-8 bg-card shadow-xl border-t-4 border-accent"
            initial={{ x: 50 }} animate={{ x: 0 }}
          >
            <h3 className="text-2xl font-bold mb-6">Active Plans</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-4">
                <thead>
                  <tr className="text-muted-foreground text-xs uppercase font-bold tracking-widest">
                    <th className="px-4">Plan Name</th>
                    <th className="px-4">Duration</th>
                    <th className="px-4">Multiplier</th>
                    <th className="px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {plans.map((p, i) => (
                    <tr key={i} className="bg-secondary/50 rounded-lg hover:bg-secondary transition-colors">
                      <td className="p-4 font-bold rounded-l-xl">{p.name}</td>
                      <td className="p-4 font-medium">{p.duration_months} Month(s)</td>
                      <td className="p-4"><span className="badge badge-success px-3 py-1">{p.multiplier}x</span></td>
                      <td className="p-4 text-right rounded-r-xl">
                        <button className="text-destructive hover:scale-110 transition-transform">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}