import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Loader from '../components/Loader';
import ThemeToggle from '../components/ThemeToggle';
import { clearSuperAdminToken, superAdminGet, superAdminPatch } from '../api/client';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [academies, setAcademies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, academiesRes] = await Promise.all([
        superAdminGet('/super-admin/stats'),
        superAdminGet('/super-admin/academies')
      ]);
      const statsData = statsRes?.data || {};
      const academiesData = academiesRes?.data || [];
      
      // Ensure stats has all required fields with default values
      setStats({
        total_academies: statsData.total_academies ?? 0,
        active_academies: statsData.active_academies ?? 0,
        total_students: statsData.total_students ?? 0,
        total_coaches: statsData.total_coaches ?? 0
      });
      
      // Ensure academies have _count with default values
      setAcademies(academiesData.map(a => ({
        ...a,
        _count: {
          students: a._count?.students ?? 0,
          coaches: a._count?.coaches ?? 0
        }
      })));
    } catch (error) {
      setMessage(error.message);
      // Set default values on error
      setStats({
        total_academies: 0,
        active_academies: 0,
        total_students: 0,
        total_coaches: 0
      });
      setAcademies([]);
      if (error.status === 401) {
        clearSuperAdminToken();
        navigate('/super-admin-login');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (academyId, status) => {
    try {
      await superAdminPatch(`/super-admin/academies/${academyId}/status`, { status });
      setMessage(`Academy #${academyId} set to ${status}`);
      load();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const logout = () => {
    clearSuperAdminToken();
    navigate('/super-admin-login');
  };

  if (loading) {
    return <Loader message="Loading platform dashboard…" />;
  }

  return (
    <div className="bg-slate-50 min-h-screen space-y-6 p-6 w-full overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-center justify-between gap-4 w-full"
      >
        <div>
          <h2 className="text-slate-800 text-2xl font-bold">Platform Overview</h2>
          <p className="text-slate-400 text-sm">
            Super Admin dashboard for managing all academies across the platform.
          </p>
        </div>
        <motion.button
          type="button"
          className="px-4 py-2 text-sm font-medium text-slate-600 bg-white/70 border border-slate-200/60 rounded-lg hover:bg-slate-100/70 hover:border-slate-300 transition-all"
          onClick={load}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Refresh
        </motion.button>
      </motion.div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-700"
        >
          {message}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 w-full"
      >
        <motion.div
          className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-xl shadow-sm p-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-emerald-200/80 hover:scale-[1.01] transition-all duration-300 cursor-pointer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total Academies</span>
          <span className="text-slate-800 text-2xl font-bold block mt-2">
            {stats?.total_academies ?? 0}
          </span>
          <span className="text-slate-400 text-xs mt-1">All registered academies</span>
        </motion.div>

        <motion.div
          className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-xl shadow-sm p-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-emerald-200/80 hover:scale-[1.01] transition-all duration-300 cursor-pointer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Active Academies</span>
          <span className="text-emerald-600 text-2xl font-bold block mt-2">
            {stats?.active_academies ?? 0}
          </span>
          <span className="text-slate-400 text-xs mt-1">Currently operational</span>
        </motion.div>

        <motion.div
          className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-xl shadow-sm p-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-emerald-200/80 hover:scale-[1.01] transition-all duration-300 cursor-pointer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total Students</span>
          <span className="text-slate-800 text-2xl font-bold block mt-2">
            {stats?.total_students ?? 0}
          </span>
          <span className="text-slate-400 text-xs mt-1">Across all academies</span>
        </motion.div>

        <motion.div
          className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-xl shadow-sm p-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-emerald-200/80 hover:scale-[1.01] transition-all duration-300 cursor-pointer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total Coaches</span>
          <span className="text-slate-800 text-2xl font-bold block mt-2">
            {stats?.total_coaches ?? 0}
          </span>
          <span className="text-slate-400 text-xs mt-1">Active instructors</span>
        </motion.div>
      </motion.div>

      <motion.div
        className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-xl shadow-sm p-6 overflow-x-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <h2 className="text-slate-800 text-xl font-bold mb-4">Academies</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200/60">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Plan</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Students</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Coaches</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {academies.map((a) => (
              <tr key={a.academy_id} className="border-b border-slate-200/40 hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 text-sm text-slate-600">{a.academy_id}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-800">{a.name}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{a.subscription_plan || '—'}</td>
                <td className="px-4 py-3">
                  {a.status === 'active' ? (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      ACTIVE
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      {a.status?.toUpperCase() || 'SUSPENDED'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{a._count?.students ?? 0}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{a._count?.coaches ?? 0}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <motion.button
                      type="button"
                      className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-all"
                      onClick={() => updateStatus(a.academy_id, 'active')}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Activate
                    </motion.button>
                    <motion.button
                      type="button"
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-all"
                      onClick={() => updateStatus(a.academy_id, 'suspended')}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Suspend
                    </motion.button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
