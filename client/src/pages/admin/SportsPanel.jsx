import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, CheckCircle, AlertCircle, Plus, MapPin, Grid, Lock, Unlock, Trash2, Edit2, Check, LayoutDashboard } from 'lucide-react';
import Loader from '../../components/Loader';
import GPSCapture from '../../components/GPSCapture';
import { adminGet, adminPost, adminPatch, adminDelete } from '../../api/client';

const formatCurrency = (value) =>
  Number.isFinite(Number(value)) ? Number(value).toFixed(2) : '0.00';

// Fallback icons if super admin API doesn't return icon field
const FALLBACK_ICON = '🏅';

// Array for empty state animations
const ANIMATION_ICONS = ['⚽', '🏀', '🎾', '🏐', '🏸', '🥊', '🏏'];

export default function SportsPanel() {
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);
  const [editingFeeId, setEditingFeeId] = useState(null);
  const [editingFeeValue, setEditingFeeValue] = useState('');

  // ─── Add Sport: new multi-select search state ───────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedSports, setSelectedSports] = useState([]); // [{name, icon}]
  const [superAdminSports, setSuperAdminSports] = useState([]); // from API
  const [superAdminLoading, setSuperAdminLoading] = useState(false);
  const [showBrowseModal, setShowBrowseModal] = useState(false);
  const [browseSearch, setBrowseSearch] = useState('');

  // ─── Shared form fields (apply to all selected sports on submit) ────────────
  const [sharedForm, setSharedForm] = useState({
    base_fee: '',
    status: 'ACTIVE',
    sport_center: '',
    attendance_radius: '',
    latitude: '',
    longitude: '',
    use_custom_location: false,
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Academy Location (from registration) ─────────────────────────────────
  const [academyLocation, setAcademyLocation] = useState(null);

  // ─── Fetch global sports for Browse modal ──────────────────────────────
  const loadSuperAdminSports = useCallback(async () => {
    setSuperAdminLoading(true);
    try {
      const response = await fetch('/api/v1/public/sports');
      const result = await response.json();
      const data = result.data;
      let list = [];
      if (Array.isArray(data)) list = data;
      else if (Array.isArray(data?.data)) list = data.data;
      else if (Array.isArray(data?.sports)) list = data.sports;
      setSuperAdminSports(list);
    } catch {
      setSuperAdminSports([]);
    } finally {
      setSuperAdminLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load sports when component mounts so search dropdown has data
    if (superAdminSports.length === 0) {
      loadSuperAdminSports();
    }
  }, [superAdminSports.length, loadSuperAdminSports]);

  // ─── Fetch academy location (for default sport location) ─────────────────────
  const loadAcademyLocation = useCallback(async () => {
    try {
      const result = await adminGet('/admin/academy');
      const academyData = result.data || result;
      if (academyData?.latitude && academyData?.longitude) {
        setAcademyLocation({
          latitude: parseFloat(academyData.latitude),
          longitude: parseFloat(academyData.longitude)
        });
      }
    } catch (error) {
      console.error('Failed to load academy location:', error);
    }
  }, []);

  // ─── Fetch academy sports (table) ──────────────────────────────────────────
  const loadSports = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminGet('/admin/sports');
      const responseData = result.data;
      if (Array.isArray(responseData)) setSports(responseData);
      else if (Array.isArray(responseData?.data)) setSports(responseData.data);
      else if (Array.isArray(responseData?.academy_sports)) setSports(responseData.academy_sports);
      else if (Array.isArray(responseData?.sports)) setSports(responseData.sports);
      else setSports([]);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setSports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSports();
    loadAcademyLocation();
  }, [loadSports, loadAcademyLocation]);

  // ─── Close dropdown on outside click ───────────────────────────────────────
  useEffect(() => {
    const handleClick = (e) => {
      const searchInput = document.querySelector('input[placeholder="Search or type a sport name…"]');
      if (searchInput && !searchInput.contains(e.target) && !e.target.closest('.absolute.left-0.right-0.top-full')) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ─── Filtered dropdown list ─────────────────────────────────────────────────
  const q = searchQuery.trim().toLowerCase();
  const filteredDropdown = q
    ? superAdminSports.filter((s) => s.name.toLowerCase().includes(q))
    : superAdminSports.slice(0, 8);

  const isSelectedInDraft = (name) => selectedSports.some((s) => s.name === name);

  const toggleDraftSport = (sport) => {
    const name = sport.name;
    if (isSelectedInDraft(name)) {
      setSelectedSports((prev) => prev.filter((s) => s.name !== name));
    } else {
      setSelectedSports((prev) => [...prev, { name, icon: sport.icon || FALLBACK_ICON }]);
    }
  };

  const addCustomSport = () => {
    const name = searchQuery.trim();
    if (!name || isSelectedInDraft(name)) return;
    setSelectedSports((prev) => [...prev, { name, icon: FALLBACK_ICON }]);
    setSearchQuery('');
    setShowDropdown(false);
  };

  const removeDraftSport = (name) => {
    setSelectedSports((prev) => prev.filter((s) => s.name !== name));
  };

  // ─── Browse modal: filtered ─────────────────────────────────────────────────
  const bq = browseSearch.trim().toLowerCase();
  const filteredBrowse = bq
    ? superAdminSports.filter((s) => s.name.toLowerCase().includes(bq))
    : superAdminSports;

  const toggleBrowseSport = (sport) => {
    toggleDraftSport(sport);
  };

  // ─── Submit: create one sport per selected entry ────────────────────────────
  const handleCreateSports = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    setFieldErrors({});

    if (selectedSports.length === 0) {
      setFieldErrors({ search: 'Please select at least one sport.' });
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let failCount = 0;

    for (const sport of selectedSports) {
      try {
        const payload = {
          name: sport.name,
          icon: sport.icon,
          base_fee: parseFloat(sharedForm.base_fee || 0),
          status: sharedForm.status,
          sport_center: sharedForm.sport_center.trim() || undefined,
          attendance_radius: sharedForm.attendance_radius
            ? parseFloat(sharedForm.attendance_radius)
            : undefined,
          use_custom_location: sharedForm.use_custom_location,
        };

        // Only send GPS coordinates if using custom location
        if (sharedForm.use_custom_location && sharedForm.latitude && sharedForm.longitude) {
          payload.latitude = parseFloat(sharedForm.latitude);
          payload.longitude = parseFloat(sharedForm.longitude);
        }

        await adminPost('/admin/sports', payload);
        successCount++;
      } catch {
        failCount++;
      }
    }

    setIsSubmitting(false);

    if (successCount > 0) {
      setMessage({
        text: `${successCount} sport${successCount > 1 ? 's' : ''} added successfully${failCount > 0 ? `, ${failCount} failed` : ''}.`,
        type: successCount > 0 ? 'success' : 'error',
      });
      setSelectedSports([]);
      setSearchQuery('');
      setSharedForm({
        base_fee: '',
        status: 'ACTIVE',
        sport_center: '',
        attendance_radius: '',
        latitude: '',
        longitude: '',
        use_custom_location: false,
      });
      setShowDropdown(false);
      loadSports();
    } else {
      setMessage({ text: 'All sports failed to add. Please try again.', type: 'error' });
    }
  };

  // ─── Status / Fee / Bulk handlers (unchanged) ──────────────────────────────
  const handleMarkActive = async (sportId) => {
    try {
      setSports((prev) =>
        prev.map((s) => ((s.sport_id || s.id) === sportId ? { ...s, status: 'ACTIVE' } : s)),
      );
      const result = await adminPatch(`/admin/sports/${sportId}/status`, {
        status: 'ACTIVE',
        cascade: true,
      });
      setMessage({ text: result?.message || 'Sport marked as active successfully', type: 'success' });
      loadSports();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      loadSports();
    }
  };

  const handleDeactivate = async (sportId) => {
    try {
      setSports((prev) =>
        prev.map((s) =>
          (s.sport_id || s.id) === sportId ? { ...s, status: 'INACTIVE' } : s,
        ),
      );
      const result = await adminPatch(`/admin/sports/${sportId}/status`, {
        status: 'INACTIVE',
        cascade: true,
      });
      setMessage({ text: result?.message || 'Sport deactivated successfully', type: 'success' });
      loadSports();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      loadSports();
    }
  };

  const handleRemoveSport = async (sportId) => {
    if (!window.confirm('Warning: Permanently removing this sport will delete it from the catalog. Proceed?')) return;
    setMessage({ text: '', type: '' });
    try {
      setSports((prev) => prev.filter((s) => (s.sport_id || s.id) !== sportId));
      const result = await adminDelete(`/admin/sports/${sportId}`);
      setMessage({ text: result?.message || 'Sport removed successfully', type: 'success' });
      loadSports();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      loadSports();
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) setSelectedIds(sports.map((s) => s.sport_id || s.id));
    else setSelectedIds([]);
  };

  const toggleBulkEditMode = () => {
    setIsBulkEditMode((prev) => !prev);
    setSelectedIds([]);
  };

  const handleSelectOne = (sportId, checked) => {
    if (checked) setSelectedIds((prev) => [...prev, sportId]);
    else setSelectedIds((prev) => prev.filter((id) => id !== sportId));
  };

  const handleRowClick = (sportId) => {
    if (!isBulkEditMode) return;
    setSelectedIds((prev) =>
      prev.includes(sportId) ? prev.filter((id) => id !== sportId) : [...prev, sportId],
    );
  };

  const handleBulkAction = async (action, label) => {
    if (selectedIds.length === 0) return;
    if (action === 'delete' && !window.confirm(`Permanently remove ${selectedIds.length} sports?`)) return;
    setMessage({ text: '', type: '' });
    try {
      await adminPost('/admin/sports/bulk-action', { action, sport_ids: selectedIds });
      setMessage({ text: `Sports ${label} successfully`, type: 'success' });
      setSelectedIds([]);
      setIsBulkEditMode(false);
      loadSports();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const handleStartEditFee = (sportId, currentFee) => {
    setEditingFeeId(sportId);
    setEditingFeeValue(currentFee?.toString() || '0');
  };

  const handleCancelEditFee = () => {
    setEditingFeeId(null);
    setEditingFeeValue('');
  };

  const handleSaveFee = async (sportId) => {
    setMessage({ text: '', type: '' });
    try {
      const newFee = parseFloat(editingFeeValue);
      if (isNaN(newFee) || newFee < 0) {
        setMessage({ text: 'Please enter a valid fee amount', type: 'error' });
        return;
      }
      await adminPatch(`/admin/sports/${sportId}`, { base_fee: newFee });
      setMessage({ text: 'Base fee updated successfully', type: 'success' });
      setEditingFeeId(null);
      setEditingFeeValue('');
      loadSports();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  // ─── Handle GPS location capture from GPSCapture component ─────────────────────
  const handleLocationCapture = (locationData) => {
    if (locationData) {
      setSharedForm((prev) => ({
        ...prev,
        latitude: locationData.latitude.toFixed(7),
        longitude: locationData.longitude.toFixed(7),
      }));
    } else {
      setSharedForm((prev) => ({
        ...prev,
        latitude: '',
        longitude: '',
      }));
    }
  };

  // ─── Toggle between default academy location and custom location ───────────────
  const handleLocationToggle = (useCustom) => {
    setSharedForm((prev) => ({
      ...prev,
      use_custom_location: useCustom,
      // If switching to default, clear custom coordinates
      latitude: useCustom ? prev.latitude : '',
      longitude: useCustom ? prev.longitude : '',
    }));
  };

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="w-full space-y-6 font-sans"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-[#111814] p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] ring-1 ring-gray-100 dark:ring-gray-800/60">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            Sports <span className="text-emerald-600 dark:text-emerald-400">Catalog</span>
          </h2>
          <p className="mt-1 text-sm font-semibold text-gray-400 dark:text-gray-500">
            Create and manage sports available in your academy workspace.
          </p>
        </div>
      </div>

      {/* ── Global Alert Message ── */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex items-center gap-3 rounded-2xl p-4 shadow-sm ring-1 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-900/50'
                : 'bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-900/50'
            }`}
          >
            {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <p className="text-sm font-medium">{message.text}</p>
            <button type="button" onClick={() => setMessage({text: '', type: ''})} className="ml-auto opacity-70 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Sport Form Section ── */}
      <div className="rounded-3xl bg-white dark:bg-[#111814] shadow-[0_4px_20px_rgb(0,0,0,0.02)] ring-1 ring-gray-100 dark:ring-gray-800/60 overflow-visible p-6 lg:p-8">
        {/* <div className="mb-6 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800/60 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <Plus className="h-5 w-5 stroke-[3]" />
          </div>
          <h3 className="font-bold text-xl text-gray-900 dark:text-white">Add New Sports</h3>
        </div> */}

        <form onSubmit={handleCreateSports}>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 lg:gap-12">
            
            {/* Left Column: Search & Select */}
            <div className="space-y-6">
              <div className="relative">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Search Sport</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search Input with Dropdown */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      className={`w-full rounded-xl border pl-10 pr-10 py-3 text-sm outline-none transition-all focus:ring-4 dark:bg-gray-900/50 ${
                        fieldErrors.search 
                          ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/10' 
                          : 'border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/10 dark:border-gray-800'
                      }`}
                      placeholder="Search or type a sport name…"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowDropdown(true);
                        if (superAdminSports.length === 0) loadSuperAdminSports();
                      }}
                      onFocus={() => {
                        setShowDropdown(true);
                        if (superAdminSports.length === 0) loadSuperAdminSports();
                      }}
                      autoComplete="off"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        onClick={() => { setSearchQuery(''); setShowDropdown(false); }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}

                    {/* Dropdown Box */}
                    <AnimatePresence>
                      {showDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-0 right-0 top-full z-30 mt-2 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-gray-700 dark:bg-[#161f19]"
                        >
                          {superAdminLoading ? (
                            <p className="px-4 py-3 text-sm text-gray-500">Loading sports catalog…</p>
                          ) : !q ? (
                            <p className="px-4 py-3 text-sm text-gray-500">Start typing to search for sports…</p>
                          ) : filteredDropdown.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-gray-500">No sports found. Press Enter to add as custom sport.</p>
                          ) : (
                            <>
                              {filteredDropdown.map((sport) => {
                                const sel = isSelectedInDraft(sport.name);
                                return (
                                  <button
                                    key={sport.name}
                                    type="button"
                                    className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm transition-colors ${
                                      sel 
                                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 font-bold' 
                                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                                    }`}
                                    onClick={() => toggleDraftSport(sport)}
                                  >
                                    <span className="text-xl">{sport.icon || FALLBACK_ICON}</span>
                                    <span className="flex-1">{sport.name}</span>
                                    {sel && <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />}
                                  </button>
                                );
                              })}

                              {q && !superAdminSports.some((s) => s.name.toLowerCase() === q) && (
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 border-t border-gray-100 dark:border-gray-800 mt-1"
                                  onClick={addCustomSport}
                                >
                                  <Plus className="h-4 w-4" />
                                  <span>Add "<strong className="text-indigo-700 dark:text-indigo-300">{searchQuery.trim()}</strong>" as new custom sport</span>
                                </button>
                              )}
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Browse Button */}
                  <button
                    type="button"
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-[#111814] dark:text-gray-300 dark:hover:bg-gray-800"
                    onClick={() => { setShowBrowseModal(true); setBrowseSearch(''); }}
                  >
                    <Grid className="h-4 w-4" /> Browse Catalog
                  </button>
                </div>
                {fieldErrors.search && <p className="mt-1.5 text-xs font-medium text-rose-500">{fieldErrors.search}</p>}
              </div>

  {/* Selected Sports / Empty State */}
  <div
    className={`relative overflow-hidden rounded-2xl transition-all ${
      selectedSports.length > 0
        ? "border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/40"
        : "border border-dashed border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-[#161f19]/30"
    }`}
  >

    {selectedSports.length > 0 ? (
      <>
        <p className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-500">
          Selected Sports ({selectedSports.length})
        </p>

        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {selectedSports.map((sport) => (
              <motion.span
                key={sport.name}
                initial={{ opacity: 0, scale: .9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: .9 }}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"
              >
                <span>{sport.icon}</span>

                <span>{sport.name}</span>

                <button
                  type="button"
                  onClick={() => removeDraftSport(sport.name)}
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </>
    ) : (
      <div className="relative flex min-h-[170px] flex-col items-center justify-center overflow-hidden">

        {/* Animation */}
        <div className="absolute inset-0 flex items-center justify-around opacity-20 pointer-events-none">

          {ANIMATION_ICONS.map((icon, i) => (
            <motion.div
              key={i}
              className="text-3xl"
              animate={{
                y:[0,-15,0],
                rotate:[0,10,-10,0]
              }}
              transition={{
                repeat:Infinity,
                duration:3+i*.3
              }}
            >
              {icon}
            </motion.div>
          ))}

        </div>

        {/* Content */}
        <div className="relative z-10 text-center">

          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow">
            <Grid className="h-5 w-5 text-gray-400"/>
          </div>

          <p className="font-bold">
            No sports selected yet
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Search or browse sports to start.
          </p>

        </div>

      </div>
    )}

  </div>

  {/* Quick Guide */}
  <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-[#111814]">

    <div className="flex justify-between gap-6">

      <div className="flex-1">

        <div className="mb-4 flex items-center gap-2">
          💡
          <h4 className="font-bold">
            Quick Guide
          </h4>
        </div>

        <div className="space-y-3">

          {[
            "Search or Browse sports.",
            "Fetch Sport Center Location.",
            "Enter Attendance radius & fee.",
            "Click Deploy Sport."
          ].map((step,index)=>(
            <div
              key={index}
              className="flex items-center gap-3"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                {index+1}
              </div>

              <span className="text-sm text-gray-600 dark:text-gray-300">
                {step}
              </span>

            </div>
          ))}

        </div>

      </div>

      <div className="hidden md:flex items-center">

        <div className="relative">

          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/20">
            <MapPin className="h-10 w-10 text-emerald-600"/>
          </div>

          <div className="absolute inset-0 animate-ping rounded-full border-2 border-emerald-300 opacity-30"/>

        </div>

      </div>

    </div>

  </div>

</div>
            {/* Right Column: Settings */}
            <div className="space-y-6 relative z-0">
              
              {/* Location Selection Card */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-[#111814] relative overflow-hidden group">
                <div className="absolute right-0 top-0 opacity-5 pointer-events-none transition-transform group-hover:scale-110">
                   <MapPin className="h-32 w-32 -mr-8 -mt-8 text-emerald-600" />
                </div>
                <h4 className="mb-3 text-sm font-bold text-gray-900 dark:text-white relative z-10">Sport Center Location</h4>
                
                {/* Location Type Toggle */}
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => handleLocationToggle(false)}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                      !sharedForm.use_custom_location
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    Default Academy Location
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLocationToggle(true)}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                      sharedForm.use_custom_location
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    Custom Location
                  </button>
                </div>

                {/* Default Academy Location Display */}
                {!sharedForm.use_custom_location && (
                  <div className="relative z-10 rounded-xl bg-blue-50 border border-blue-100 p-3.5 dark:bg-blue-900/20 dark:border-blue-800/50">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <p className="text-blue-800 dark:text-blue-300 font-bold text-xs uppercase tracking-wider">Using Academy Location</p>
                    </div>
                    {academyLocation ? (
                      <p className="text-blue-700 dark:text-blue-400 text-xs font-mono bg-white/50 dark:bg-black/20 p-2 rounded-lg inline-block">
                        Lat: {academyLocation.latitude.toFixed(7)} <br/>
                        Lon: {academyLocation.longitude.toFixed(7)}
                      </p>
                    ) : (
                      <p className="text-blue-700 dark:text-blue-400 text-xs">
                        Academy location not set during registration. Please contact admin.
                      </p>
                    )}
                  </div>
                )}

                {/* Custom Location Capture */}
                {sharedForm.use_custom_location && (
                  <div className="relative z-10">
                    <GPSCapture
                      onLocationCapture={handleLocationCapture}
                      initialLocation={sharedForm.latitude && sharedForm.longitude ? {
                        latitude: parseFloat(sharedForm.latitude),
                        longitude: parseFloat(sharedForm.longitude)
                      } : null}
                      required={false}
                      label="Custom Sport Center Location"
                      placeholder="Capture custom GPS coordinates"
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400" htmlFor="attendanceRadius">Radius (Meters)</label>
                  <input
                    id="attendanceRadius"
                    type="number"
                    min={0}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-800 dark:bg-gray-900/50 dark:focus:border-emerald-500"
                    value={sharedForm.attendance_radius}
                    onChange={(e) => setSharedForm({ ...sharedForm, attendance_radius: e.target.value })}
                    placeholder="e.g. 50"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400" htmlFor="baseFee">Base Fee</label>
                  <input
                    id="baseFee"
                    type="number"
                    min={0}
                    step={0.01}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-800 dark:bg-gray-900/50 dark:focus:border-emerald-500"
                    value={sharedForm.base_fee}
                    onChange={(e) => setSharedForm({ ...sharedForm, base_fee: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400" htmlFor="status">Initial Status</label>
                  <select
                    id="status"
                    className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-800 dark:bg-gray-900/50 dark:focus:border-emerald-500"
                    value={sharedForm.status}
                    onChange={(e) => setSharedForm({ ...sharedForm, status: e.target.value })}
                  >
                    <option value="ACTIVE">Active (Live Immediately)</option>
                    <option value="INACTIVE">Inactive (Draft/Hidden)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_14px_0_rgb(16,185,129,0.39)] transition-all hover:bg-emerald-700 hover:shadow-[0_6px_20px_rgb(16,185,129,0.23)] disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? <Loader message="" />
                    : selectedSports.length > 1
                    ? `Deploy ${selectedSports.length} Sports`
                    : 'Deploy Sport'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* ── Browse Sports Full Modal ── */}
      <AnimatePresence>
        {showBrowseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowBrowseModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", bounce: 0.3 }}
              className="relative w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-gray-200 dark:bg-[#111814] dark:ring-gray-800"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-6 py-4 dark:border-gray-800/60 dark:bg-gray-900/50 shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Global Sports Catalog</h3>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">Select multiple sports to import to your academy</p>
                </div>
                <button type="button" className="rounded-xl p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white transition-colors" onClick={() => setShowBrowseModal(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Search */}
              <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800/60 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-4 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-800 dark:bg-gray-900/50 dark:text-white dark:focus:border-emerald-500"
                    placeholder="Search the global catalog…"
                    value={browseSearch}
                    onChange={(e) => setBrowseSearch(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              {/* Modal Grid Content */}
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                {superAdminLoading ? (
                  <div className="flex justify-center py-20"><Loader message="Loading catalog…" /></div>
                ) : filteredBrowse.length === 0 ? (
                  <p className="py-20 text-center text-gray-500 font-medium">No sports found matching your search.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {filteredBrowse.map((sport) => {
                      const sel = isSelectedInDraft(sport.name);
                      return (
                        <button
                          key={sport.name}
                          type="button"
                          className={`group relative flex flex-col items-center justify-center gap-3 rounded-2xl border p-4 transition-all ${
                            sel
                              ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20 dark:border-emerald-500/50 dark:bg-emerald-900/20'
                              : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-gray-800 dark:bg-[#111814] dark:hover:border-emerald-700/50 dark:hover:bg-emerald-900/10'
                          }`}
                          onClick={() => toggleBrowseSport(sport)}
                        >
                          {sel && (
                            <div className="absolute right-2 top-2 rounded-full bg-emerald-500 text-white p-0.5">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                          <span className="text-4xl transition-transform group-hover:scale-110">{sport.icon || FALLBACK_ICON}</span>
                          <span className={`text-xs font-bold leading-tight text-center ${sel ? 'text-emerald-800 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'}`}>
                            {sport.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-100 bg-gray-50/80 px-6 py-4 backdrop-blur-md dark:border-gray-800/60 dark:bg-gray-900/80 flex items-center justify-between shrink-0">
                <p className="text-sm font-bold text-gray-500">
                  {selectedSports.length > 0 ? <span className="text-emerald-600 dark:text-emerald-400">{selectedSports.length} selected</span> : 'No sports selected'}
                </p>
                <div className="flex gap-3">
                  <button type="button" className="rounded-xl px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors" onClick={() => setShowBrowseModal(false)}>
                    Close
                  </button>
                  <button type="button" className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors" onClick={() => setShowBrowseModal(false)}>
                    Confirm Selection
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Active Sports Table Section ── */}
      <div className="rounded-3xl bg-white dark:bg-[#111814] shadow-[0_4px_20px_rgb(0,0,0,0.02)] ring-1 ring-gray-100 dark:ring-gray-800/60 overflow-hidden">
        
        <div className="flex flex-col sm:flex-row items-center justify-between border-b border-gray-100 dark:border-gray-800/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white">Active Academy Sports</h3>
          </div>
          
          <div className="mt-4 sm:mt-0">
             <button
              type="button"
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all shadow-sm ${
                isBulkEditMode 
                  ? 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900' 
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-[#111814] dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800/50'
              }`}
              onClick={toggleBulkEditMode}
            >
              {isBulkEditMode ? <><X className="h-4 w-4" /> Cancel Bulk</> : <><CheckCircle className="h-4 w-4" /> Bulk Actions</>}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isBulkEditMode && selectedIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-indigo-50/50 dark:bg-indigo-900/10 border-b border-indigo-100 dark:border-indigo-800/30 px-6 py-3 flex flex-wrap items-center gap-3"
            >
              <span className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mr-2">{selectedIds.length} selected</span>
              <button type="button" className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700" onClick={() => handleBulkAction('activate', 'activated')}>
                <Unlock className="mr-1.5 h-3.5 w-3.5" /> Activate
              </button>
              <button type="button" className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700" onClick={() => handleBulkAction('deactivate', 'deactivated')}>
                <Lock className="mr-1.5 h-3.5 w-3.5" /> Deactivate
              </button>
              <button type="button" className="inline-flex items-center justify-center rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:ring-rose-800/50" onClick={() => handleBulkAction('delete', 'removed')}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 flex justify-center"><Loader /></div>
          ) : (
            <table className="min-w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800/60">
                <tr className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {isBulkEditMode && (
                    <th className="px-6 py-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === sports.filter(s=>s.isAcademySport).length && sports.filter(s=>s.isAcademySport).length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-600 dark:border-gray-600 dark:bg-gray-700 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="px-6 py-4">Sport Details</th>
                  <th className="px-6 py-4">Location Center</th>
                  <th className="px-6 py-4">Base Fee</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                {sports.filter((sport) => sport.isAcademySport).length > 0 ? (
                  sports
                    .filter((sport) => sport.isAcademySport)
                    .map((sport, index) => {
                      const isSelected = selectedIds.includes(sport.sport_id || sport.id);
                      const isInactive = sport.status !== 'ACTIVE';
                      return (
                        <motion.tr
                          key={sport.sport_id || sport.id || sport.name}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.2) }}
                          className={`group transition-colors duration-200 hover:bg-gray-50/80 dark:hover:bg-gray-800/30 ${
                            isSelected ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''
                          } ${isInactive ? 'opacity-60 grayscale-[0.2]' : ''}`}
                          onClick={() => handleRowClick(sport.sport_id || sport.id)}
                        >
                          {isBulkEditMode && (
                            <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => handleSelectOne(sport.sport_id || sport.id, e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-600 dark:border-gray-600 dark:bg-gray-700 cursor-pointer"
                              />
                            </td>
                          )}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                {sport.icon || FALLBACK_ICON}
                              </div>
                              <span className="font-bold text-gray-900 dark:text-white">{sport.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-medium text-gray-600 dark:text-gray-400">{sport.sport_center || '—'}</span>
                          </td>
                          <td className="px-6 py-4">
                            {editingFeeId === (sport.sport_id || sport.id) ? (
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="number"
                                  min={0} step={0.01}
                                  className="w-24 rounded-lg border border-emerald-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-emerald-700 dark:bg-gray-900 dark:text-white"
                                  value={editingFeeValue}
                                  onChange={(e) => setEditingFeeValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveFee(sport.sport_id || sport.id);
                                    if (e.key === 'Escape') handleCancelEditFee();
                                  }}
                                  autoFocus
                                />
                                <button type="button" className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors" onClick={() => handleSaveFee(sport.sport_id || sport.id)}>
                                  <Check className="h-4 w-4" />
                                </button>
                                <button type="button" className="rounded-lg bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors" onClick={handleCancelEditFee}>
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 font-bold text-gray-900 dark:text-white">
                                ${formatCurrency(sport.base_fee || sport.baseFee)}
                                <button
                                  type="button"
                                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all p-1"
                                  onClick={(e) => { e.stopPropagation(); handleStartEditFee(sport.sport_id || sport.id, sport.base_fee || sport.baseFee); }}
                                  title="Edit Base Fee"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                             <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide ${
                                !isInactive 
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${!isInactive ? 'bg-emerald-500' : 'bg-gray-500'}`}></span>
                                {!isInactive ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                          </td>
                          <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                             <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                {!isInactive ? (
                                  <button
                                    type="button"
                                    className="rounded-lg p-2 text-gray-400 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/30 dark:hover:text-orange-400 transition-colors"
                                    onClick={() => handleDeactivate(sport.sport_id || sport.id)}
                                    title="Deactivate Sport"
                                  >
                                    <Unlock className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="rounded-lg p-2 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-colors"
                                    onClick={() => handleMarkActive(sport.sport_id || sport.id)}
                                    title="Activate Sport"
                                  >
                                    <Lock className="h-4 w-4" />
                                  </button>
                                )}

                                <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

                                <button
                                  type="button"
                                  className="rounded-lg p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400 transition-colors"
                                  onClick={() => handleRemoveSport(sport.sport_id || sport.id)}
                                  title="Delete Sport"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                             </div>
                          </td>
                        </motion.tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan={isBulkEditMode ? 6 : 5} className="py-16 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center justify-center">
                        <Grid className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="font-bold text-lg text-gray-900 dark:text-white">No active sports.</p>
                        <p className="mt-1 text-sm">Add a sport from the catalog above to get started.</p>
                      </div>
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