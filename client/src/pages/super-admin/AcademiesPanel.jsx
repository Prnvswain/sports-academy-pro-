import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Settings, Building2, Users, Calendar, MoreVertical } from 'lucide-react';
import { superAdminGet, superAdminPatch, superAdminPost } from '../../api/client';

export default function AcademiesPanel() {
  const [academies, setAcademies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAcademy, setSelectedAcademy] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [message, setMessage] = useState('');

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

  useEffect(() => {
    loadAcademies();
  }, [loadAcademies]);

  const updateStatus = async (academyId, status) => {
    try {
      await superAdminPatch(`/super-admin/academies/${academyId}/status`, { status });
      setMessage(`Academy #${academyId} set to ${status}`);
      loadAcademies();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const filteredAcademies = academies.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.academy_id.toString().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleViewAcademy = (academy) => {
    setSelectedAcademy(academy);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedAcademy(null);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            ACTIVE
          </span>
        );
      case 'trial':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            TRIAL
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            SUSPENDED
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
          <h2 className="text-slate-800 text-2xl font-bold">Academies Directory</h2>
          <p className="text-slate-400 text-sm mt-1">
            Manage and monitor all registered academies across the platform
          </p>
        </div>
        <motion.button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 transition-all shadow-sm"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          Add New Academy
        </motion.button>
      </motion.div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-700"
        >
          {message}
        </motion.div>
      )}

      {/* Search and Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-wrap items-center gap-4 w-full"
      >
        {/* Search Bar */}
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search academies by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/90 border border-slate-200/80 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all"
            />
          </div>
        </div>

        {/* Pill-Shaped Filters */}
        <div className="flex flex-wrap gap-2">
          {['all', 'active', 'trial', 'suspended'].map((filter) => (
            <motion.button
              key={filter}
              type="button"
              className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${
                statusFilter === filter
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 font-semibold'
                  : 'bg-white/50 text-slate-500 border border-slate-200/60 hover:bg-slate-100/70'
              }`}
              onClick={() => setStatusFilter(filter)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Horizontal List Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-400 text-sm">Loading academies...</div>
        </div>
      ) : filteredAcademies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-slate-400 text-sm">No academies found</div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-4 w-full"
        >
          {filteredAcademies.map((academy, index) => (
            <motion.div
              key={academy.academy_id}
              className="bg-white/75 backdrop-blur-md border border-slate-200/60 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:scale-[1.005] hover:shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:border-emerald-200"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <div className="flex items-center gap-6">
                {/* Left Section - Thumbnail & Info */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-slate-800 text-base font-semibold truncate">
                      {academy.name}
                    </h3>
                    <p className="text-slate-400 text-xs mt-0.5">
                      ID: #{academy.academy_id}
                    </p>
                  </div>
                </div>

                {/* Center Section - Metrics Tags */}
                <div className="flex items-center gap-6 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <div className="text-right">
                      <p className="text-slate-800 text-sm font-semibold">
                        {academy._count?.students ?? 0}
                      </p>
                      <p className="text-slate-400 text-xs font-medium">Students</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <div className="text-right">
                      <p className="text-slate-800 text-sm font-semibold">
                        {academy._count?.coaches ?? 0}
                      </p>
                      <p className="text-slate-400 text-xs font-medium">Coaches</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-800 text-sm font-semibold">
                      {academy.subscription_plan || '—'}
                    </p>
                    <p className="text-slate-400 text-xs font-medium">Plan</p>
                  </div>
                </div>

                {/* Right Section - Status & Action */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  {getStatusBadge(academy.status)}
                  <motion.button
                    type="button"
                    className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-all"
                    onClick={() => handleViewAcademy(academy)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5" />
                      Manage
                    </div>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Drawer Sheet */}
      <AnimatePresence>
        {isDrawerOpen && selectedAcademy && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-900/10 backdrop-blur-sm"
              onClick={handleCloseDrawer}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white border-l border-slate-200 shadow-2xl overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-slate-800 text-xl font-bold">Academy Details</h2>
                  <motion.button
                    type="button"
                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-2 transition-all"
                    onClick={handleCloseDrawer}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <MoreVertical className="w-5 h-5" />
                  </motion.button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                      Academy Name
                    </label>
                    <p className="text-slate-800 text-lg font-semibold mt-1">
                      {selectedAcademy.name}
                    </p>
                  </div>

                  <div>
                    <label className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                      Academy ID
                    </label>
                    <p className="text-slate-800 text-sm font-medium mt-1">
                      #{selectedAcademy.academy_id}
                    </p>
                  </div>

                  <div>
                    <label className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                      Status
                    </label>
                    <div className="mt-2">{getStatusBadge(selectedAcademy.status)}</div>
                  </div>

                  <div>
                    <label className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                      Subscription Plan
                    </label>
                    <p className="text-slate-800 text-sm font-medium mt-1">
                      {selectedAcademy.subscription_plan || '—'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                        Students
                      </label>
                      <p className="text-slate-800 text-lg font-bold mt-1">
                        {selectedAcademy._count?.students ?? 0}
                      </p>
                    </div>
                    <div>
                      <label className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                        Coaches
                      </label>
                      <p className="text-slate-800 text-lg font-bold mt-1">
                        {selectedAcademy._count?.coaches ?? 0}
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-200/60">
                    <div className="flex gap-3">
                      <motion.button
                        type="button"
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-all"
                        onClick={() => updateStatus(selectedAcademy.academy_id, 'active')}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Activate
                      </motion.button>
                      <motion.button
                        type="button"
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-all"
                        onClick={() => updateStatus(selectedAcademy.academy_id, 'suspended')}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Suspend
                      </motion.button>
                    </div>
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
