import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, X, CheckCircle, AlertCircle, Plus, MapPin, Grid, Lock, Unlock, Trash2, Edit2, Check, LayoutDashboard, Loader2, Navigation, Target } from 'lucide-react';
import Loader from '../../components/Loader';
import GPSCapture from '../../components/GPSCapture';
import { adminGet, adminPost, adminPatch, adminDelete } from '../../api/client';

// Fix for default Leaflet marker icon issue in React
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const formatCurrency = (value) =>
  Number.isFinite(Number(value)) ? Number(value).toFixed(2) : '0.00';

const FALLBACK_ICON = '🏅';
const ANIMATION_ICONS = ['⚽', '🏀', '🎾', '🏐', '🏸', '🥊', '🏏'];

// Row Animation Variants
const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

// Component to recenter map when location changes
function MapUpdater({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], 16, { animate: true, duration: 1.5 });
    }
  }, [lat, lng, map]);
  return null;
}

export default function SportsPanel() {
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);
  const [editingFeeId, setEditingFeeId] = useState(null);
  const [editingFeeValue, setEditingFeeValue] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedSports, setSelectedSports] = useState([]); 
  const [superAdminSports, setSuperAdminSports] = useState([]); 
  const [superAdminLoading, setSuperAdminLoading] = useState(false);
  const [showBrowseModal, setShowBrowseModal] = useState(false);
  const [browseSearch, setBrowseSearch] = useState('');

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

  const [academyLocation, setAcademyLocation] = useState(null);
  const [academyLocationAddress, setAcademyLocationAddress] = useState('');
  const [academyLocationMessage, setAcademyLocationMessage] = useState('');
  const [academyLocationLoading, setAcademyLocationLoading] = useState(true);
  const [academyAttendanceRadius, setAcademyAttendanceRadius] = useState(200);

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
    if (superAdminSports.length === 0) {
      loadSuperAdminSports();
    }
  }, [superAdminSports.length, loadSuperAdminSports]);

  const buildAcademyAddress = useCallback((academyData) => {
    const parts = [academyData?.address, academyData?.city, academyData?.state, academyData?.country]
      .filter(Boolean)
      .map((part) => part?.toString().trim())
      .filter(Boolean);
    return parts.join(', ');
  }, []);

  const reverseGeocodeAcademyLocation = useCallback(async (latitude, longitude) => {
    if (latitude == null || longitude == null) return;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        { headers: { 'User-Agent': 'SportsAcademyMapPicker/1.0' } }
      );
      const data = await response.json();
      if (data?.display_name) {
        setAcademyLocationAddress(data.display_name);
      }
    } catch (error) {
      console.error('Failed to reverse geocode academy location:', error);
    }
  }, []);

  const loadAcademyLocation = useCallback(async () => {
    setAcademyLocationLoading(true);
    setAcademyLocationMessage('');
    setAcademyLocationAddress('');
    try {
      const [academyResult, gpsResult] = await Promise.all([
        adminGet('/admin/academy'),
        adminGet('/admin/gps/settings')
      ]);
      const academyData = academyResult.data || academyResult;
      const gpsData = gpsResult.data || gpsResult;
      const latitude = academyData?.latitude != null ? parseFloat(academyData.latitude) : null;
      const longitude = academyData?.longitude != null ? parseFloat(academyData.longitude) : null;
      const attendanceRadius = gpsData?.attendance_radius_meters || academyData?.attendance_radius_meters || 200;

      setAcademyAttendanceRadius(attendanceRadius);

      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        setAcademyLocation({ latitude, longitude });
        const formattedAddress = buildAcademyAddress(academyData);
        if (formattedAddress) {
          setAcademyLocationAddress(formattedAddress);
        } else {
          await reverseGeocodeAcademyLocation(latitude, longitude);
        }
        setAcademyLocationMessage('');
      } else {
        setAcademyLocation(null);
        const formattedAddress = buildAcademyAddress(academyData);
        if (formattedAddress) {
          setAcademyLocationAddress(formattedAddress);
        } else {
          setAcademyLocationMessage('Academy location has not been configured yet.');
        }
      }
    } catch (error) {
      console.error('Failed to load academy location:', error);
      setAcademyLocation(null);
      setAcademyLocationAddress('');
      setAcademyLocationMessage('Academy location could not be loaded right now.');
    } finally {
      setAcademyLocationLoading(false);
    }
  }, [buildAcademyAddress, reverseGeocodeAcademyLocation]);

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
    const handleSettingsUpdate = () => loadAcademyLocation();
    window.addEventListener('academySettingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('academySettingsUpdated', handleSettingsUpdate);
  }, [loadSports, loadAcademyLocation]);

  useEffect(() => {
    const handleClick = (e) => {
      const searchInput = document.querySelector('input[placeholder="Search sport name…"]');
      if (searchInput && !searchInput.contains(e.target) && !e.target.closest('.absolute.left-0.right-0.top-full')) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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

  const bq = browseSearch.trim().toLowerCase();
  const filteredBrowse = bq
    ? superAdminSports.filter((s) => s.name.toLowerCase().includes(bq))
    : superAdminSports;

  const toggleBrowseSport = (sport) => {
    toggleDraftSport(sport);
  };

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
          attendance_radius: sharedForm.attendance_radius ? parseFloat(sharedForm.attendance_radius) : undefined,
          use_custom_location: sharedForm.use_custom_location,
        };

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

  const handleMarkActive = async (sportId) => {
    try {
      setSports((prev) => prev.map((s) => ((s.sport_id || s.id) === sportId ? { ...s, status: 'ACTIVE' } : s)));
      const result = await adminPatch(`/admin/sports/${sportId}/status`, { status: 'ACTIVE', cascade: true });
      setMessage({ text: result?.message || 'Sport marked as active successfully', type: 'success' });
      loadSports();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      loadSports();
    }
  };

  const handleDeactivate = async (sportId) => {
    try {
      setSports((prev) => prev.map((s) => ((s.sport_id || s.id) === sportId ? { ...s, status: 'INACTIVE' } : s)));
      const result = await adminPatch(`/admin/sports/${sportId}/status`, { status: 'INACTIVE', cascade: true });
      setMessage({ text: result?.message || 'Sport deactivated successfully', type: 'success' });
      loadSports();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      loadSports();
    }
  };

  const handleRemoveSport = async (sportId) => {
    if (!window.confirm('Warning: Permanently removing this sport will delete it from the catalog. Proceed?')) return;
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
    setSelectedIds((prev) => prev.includes(sportId) ? prev.filter((id) => id !== sportId) : [...prev, sportId]);
  };

  const handleBulkAction = async (action, label) => {
    if (selectedIds.length === 0) return;
    if (action === 'delete' && !window.confirm(`Permanently remove ${selectedIds.length} sports?`)) return;
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

  const handleLocationCapture = (locationData) => {
    if (locationData) {
      setSharedForm((prev) => ({
        ...prev,
        latitude: locationData.latitude.toFixed(7),
        longitude: locationData.longitude.toFixed(7),
      }));
    } else {
      setSharedForm((prev) => ({ ...prev, latitude: '', longitude: '' }));
    }
  };

  const handleLocationToggle = (useCustom) => {
    setSharedForm((prev) => ({
      ...prev,
      use_custom_location: useCustom,
      latitude: useCustom ? prev.latitude : '',
      longitude: useCustom ? prev.longitude : '',
      attendance_radius: useCustom ? prev.attendance_radius : academyAttendanceRadius.toString(),
    }));
    if (!useCustom) {
      loadAcademyLocation();
    }
  };

  // Convert custom coordinates properly
  const customLat = parseFloat(sharedForm.latitude);
  const customLng = parseFloat(sharedForm.longitude);
  const mapCenterLat = sharedForm.use_custom_location ? (!isNaN(customLat) ? customLat : null) : (academyLocation?.latitude || null);
  const mapCenterLng = sharedForm.use_custom_location ? (!isNaN(customLng) ? customLng : null) : (academyLocation?.longitude || null);
  
  const isValidMapCenter = mapCenterLat !== null && mapCenterLng !== null;

  return (
    <motion.div
      className="w-full space-y-4 font-sans pb-12 max-w-[1400px] mx-auto"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* ── Compact Header with Vibrant Gradients ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 dark:from-purple-950/50 dark:via-pink-950/50 dark:to-orange-950/50 p-4 sm:p-5 rounded-2xl shadow-sm border border-purple-200/60 dark:border-purple-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-40 h-40 bg-gradient-to-br from-pink-400/30 to-purple-500/30 blur-[40px] rounded-full pointer-events-none"></div>
        <div className="relative z-10">
          <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white mb-0.5">
            Sports <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500">Catalog</span>
          </h2>
          <p className="text-xs font-bold text-gray-600 dark:text-gray-300">
            Create, manage, and scale the sports available in your academy.
          </p>
        </div>
        <div className="hidden sm:block relative z-10">
          <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
             <TrophyIcon className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>

      {/* ── Global Alert Message ── */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            className={`flex items-center gap-3 rounded-xl p-3 shadow-sm border ${
              message.type === 'success'
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-300'
                : 'bg-rose-50/80 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-300'
            }`}
          >
            <div className={`p-1.5 rounded-lg ${message.type === 'success' ? 'bg-emerald-200/50' : 'bg-rose-200/50'}`}>
              {message.type === 'success' ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-rose-600" />}
            </div>
            <p className="text-sm font-semibold flex-1">{message.text}</p>
            <button type="button" onClick={() => setMessage({text: '', type: ''})} className="p-1 hover:bg-black/5 rounded-md transition-colors">
              <X className="h-4 w-4 opacity-70" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Sport Form Section ── */}
      <div className="rounded-2xl bg-white dark:bg-[#121418] shadow-md border border-gray-100 dark:border-gray-800 p-4 lg:p-5 overflow-hidden">
        <form onSubmit={handleCreateSports}>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 lg:gap-6">
            
            {/* Left Column: Search & Selected */}
            <div className="space-y-4">
              
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-3 w-1.5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Find & Add Sports</h3>
                </div>
                
                <div className="flex gap-2">
                  <div className="relative flex-1 group">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors" />
                    <input
                      type="text"
                      className={`w-full rounded-xl border-2 pl-10 pr-10 py-2 text-sm outline-none transition-all focus:ring-4 dark:bg-[#1a1c22] ${
                        fieldErrors.search 
                          ? 'border-rose-300 bg-rose-50 focus:border-rose-500 focus:bg-white text-gray-900' 
                          : 'border-purple-200 bg-purple-50/30 focus:bg-white focus:border-purple-500 focus:ring-purple-500/20 text-gray-900 dark:text-gray-100 dark:border-purple-900/50 dark:bg-purple-950/20'
                      }`}
                      placeholder="Search sport name…"
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500 p-1"
                        onClick={() => { setSearchQuery(''); setShowDropdown(false); }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}

                    {/* Dropdown Box */}
                    <AnimatePresence>
                      {showDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}
                          className="absolute left-0 right-0 top-full z-40 mt-1 max-h-56 overflow-y-auto rounded-xl border border-gray-100 bg-white p-1.5 shadow-2xl dark:border-gray-700 dark:bg-[#1e2128]"
                        >
                          {superAdminLoading ? (
                            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-purple-500" /></div>
                          ) : !q ? (
                            <p className="px-3 py-3 text-xs text-gray-500 text-center">Type to explore catalog…</p>
                          ) : filteredDropdown.length === 0 ? (
                            <p className="px-3 py-3 text-xs text-gray-500 text-center">Not found. Click below to add.</p>
                          ) : (
                            <>
                              {filteredDropdown.map((sport) => {
                                const sel = isSelectedInDraft(sport.name);
                                return (
                                  <button
                                    key={sport.name} type="button" onClick={() => toggleDraftSport(sport)}
                                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-all ${
                                      sel ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold shadow-sm' : 'text-gray-700 hover:bg-purple-50 dark:text-gray-300 dark:hover:bg-gray-700'
                                    }`}
                                  >
                                    <span className="text-lg bg-white/20 p-1 rounded-md">{sport.icon || FALLBACK_ICON}</span>
                                    <span className="flex-1">{sport.name}</span>
                                    {sel && <CheckCircle className="h-4 w-4 text-white" />}
                                  </button>
                                );
                              })}
                              {q && !superAdminSports.some((s) => s.name.toLowerCase() === q) && (
                                <button
                                  type="button" onClick={addCustomSport}
                                  className="mt-1 flex w-full items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-left text-xs font-bold text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  <span>Add "<strong className="text-purple-900 dark:text-purple-200">{searchQuery.trim()}</strong>"</span>
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
                    className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:bg-[#1a1c22] dark:text-gray-300 hover:text-purple-600"
                    onClick={() => { setShowBrowseModal(true); setBrowseSearch(''); }}
                  >
                    <Grid className="h-4 w-4 text-pink-500" /> Browse
                  </button>
                </div>
                {fieldErrors.search && <p className="mt-1 text-xs font-medium text-rose-500">{fieldErrors.search}</p>}
              </div>

              {/* Selected Sports Container */}
              <div
                className={`relative overflow-hidden rounded-2xl transition-all duration-300 min-h-[120px] p-4 flex flex-col ${
                  selectedSports.length > 0
                    ? "bg-gradient-to-br from-fuchsia-50/80 via-pink-50/50 to-orange-50/40 border-2 border-pink-300/50 dark:from-fuchsia-900/20 dark:to-orange-900/20 dark:border-pink-800/40"
                    : "border-2 border-dashed border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-[#1a1c22]/30"
                }`}
              >
                {selectedSports.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-black text-pink-600 dark:text-pink-400 uppercase tracking-wider flex items-center gap-1">
                        <span className="bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300 px-1.5 rounded-md">{selectedSports.length}</span> Drafted
                      </p>
                      <button type="button" onClick={() => setSelectedSports([])} className="text-[10px] text-rose-500 font-bold hover:underline bg-white/50 px-2 py-0.5 rounded-full dark:bg-black/20">Clear All</button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <AnimatePresence>
                        {selectedSports.map((sport) => (
                          <motion.span
                            key={sport.name} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white bg-white/90 px-3 py-1.5 text-xs font-bold text-gray-800 shadow-sm backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/90 dark:text-gray-100"
                          >
                            <span className="text-base">{sport.icon}</span>
                            <span>{sport.name}</span>
                            <button type="button" onClick={() => removeDraftSport(sport.name)} className="ml-1 rounded-full text-gray-400 hover:text-rose-500">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </motion.span>
                        ))}
                      </AnimatePresence>
                    </div>
                  </>
                ) : (
                  <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-around opacity-30 pointer-events-none">
                      {ANIMATION_ICONS.map((icon, i) => (
                        <motion.div key={i} className="text-2xl filter saturate-200" animate={{ y: [0, -10, 0], rotate: [0, 8, -8, 0] }} transition={{ repeat: Infinity, duration: 2.5 + i * 0.3, ease: "easeInOut" }}>{icon}</motion.div>
                      ))}
                    </div>
                    <div className="relative z-10 text-center bg-white/80 dark:bg-black/60 px-4 py-2 rounded-xl backdrop-blur-sm shadow-sm">
                      <p className="font-bold text-gray-500 dark:text-gray-300 text-xs">No sports drafted yet</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Colorful Compact Quick Guide */}
              <div className="rounded-2xl bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50 p-3 shadow-sm border border-teal-100/50 dark:from-teal-950/20 dark:via-cyan-950/10 dark:to-blue-950/20 dark:border-teal-900/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">💡</span>
                  <h4 className="font-bold text-xs text-teal-900 dark:text-teal-400 uppercase tracking-wide">Quick Guide</h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { text: "Select", icon: <Search className="h-3 w-3"/>, c: "text-purple-600 bg-purple-100" },
                    { text: "Location", icon: <MapPin className="h-3 w-3"/>, c: "text-pink-600 bg-pink-100" },
                    { text: "Set Fee", icon: <Edit2 className="h-3 w-3"/>, c: "text-amber-600 bg-amber-100" },
                    { text: "Deploy", icon: <CheckCircle className="h-3 w-3"/>, c: "text-emerald-600 bg-emerald-100" }
                  ].map((step, index) => (
                    <div key={index} className="flex items-center justify-center sm:justify-start gap-1.5 bg-white/60 dark:bg-black/20 p-1.5 rounded-lg">
                      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md font-bold ${step.c}`}>{step.icon}</div>
                      <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{step.text}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Column: Settings & Map View */}
            <div className="space-y-3 relative z-0 flex flex-col">
              
              <div className="flex items-center gap-2 mb-1">
                <div className="h-3 w-1.5 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-full"></div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Configuration & Map</h3>
              </div>

              {/* Map & Config Container */}
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden dark:border-gray-800 dark:bg-[#1a1c22]">
                
                {/* Map Header / Toggle */}
                <div className="p-3 border-b border-gray-50 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-900/40 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-cyan-500" /> 
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Ground Location</span>
                  </div>
                  <div className="flex bg-gray-200/50 p-1 rounded-lg dark:bg-gray-800 w-full sm:w-auto">
                    <button
                      type="button" onClick={() => handleLocationToggle(false)}
                      className={`flex-1 px-4 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-md transition-all ${
                        !sharedForm.use_custom_location ? 'bg-white shadow-sm text-cyan-600 dark:bg-gray-700 dark:text-cyan-400' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Default
                    </button>
                    <button
                      type="button" onClick={() => handleLocationToggle(true)}
                      className={`flex-1 px-4 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-md transition-all ${
                        sharedForm.use_custom_location ? 'bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md text-white' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Custom GPS
                    </button>
                  </div>
                </div>

                {/* ── SEPARATED GPS CAPTURE BLOCK (Only shown when Custom is toggled) ── */}
                {sharedForm.use_custom_location && (
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 border-b border-purple-100 dark:border-purple-800/30 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider">
                        Set Custom Coordinates
                      </span>
                    </div>
                    {/* Compact CSS overrides for GPSCapture */}
                    <div className="w-full [&_button]:!bg-gradient-to-r [&_button]:!from-purple-600 [&_button]:!to-indigo-600 [&_button]:!text-white [&_button]:!px-4 [&_button]:!py-2 [&_button]:!rounded-xl hover:[&_button]:!opacity-90 [&_button]:!font-bold [&_button]:!shadow-md [&_button]:!transition-all [&_button]:!ml-2">
                      <GPSCapture onCapture={handleLocationCapture} />
                    </div>
                  </div>
                )}

                {/* Map View Container - CONDITIONAL RENDERING */}
                {/* Hide map container entirely if we are in Custom mode but don't have valid coordinates */}
                {(!sharedForm.use_custom_location || isValidMapCenter) && (
                  <div className={`relative bg-gray-50 dark:bg-[#1a1c22] w-full border-b border-gray-100 dark:border-gray-800 z-10 transition-all duration-300 ${!isValidMapCenter ? 'h-[140px]' : 'h-[200px]'}`}>
                    {isValidMapCenter ? (
                      <MapContainer center={[mapCenterLat, mapCenterLng]} zoom={16} style={{ height: '100%', width: '100%', zIndex: 1 }} scrollWheelZoom={false}>
                        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                        <MapUpdater lat={mapCenterLat} lng={mapCenterLng} />
                        <Marker position={[mapCenterLat, mapCenterLng]} />
                      </MapContainer>
                    ) : (
                      /* Default state when NO location is present (Only visible for Default mode now) */
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                        <Navigation className="h-6 w-6 mb-2 opacity-30 text-cyan-500" />
                        <p className="text-xs font-semibold">Academy Location Not Set</p>
                      </div>
                    )}

                    {!sharedForm.use_custom_location && academyLocationAddress && (
                      <div className="absolute bottom-2 left-2 right-2 z-[400] bg-white/95 dark:bg-black/90 backdrop-blur-md p-2 rounded-xl shadow-sm border border-gray-100/50 dark:border-gray-800 flex items-start gap-2">
                        <div className="bg-cyan-100 dark:bg-cyan-900/30 p-1.5 rounded-lg shrink-0 mt-0.5"><MapPin className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400"/></div>
                        <p className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 leading-tight">{academyLocationAddress}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Input Grid (Vibrant Backgrounds) */}
                <div className="grid grid-cols-2 gap-3 p-4 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-[#161f28]/50 dark:to-[#1a1628]/50">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-gray-500">Center Name</label>
                    <input
                      type="text" 
                      className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-sm transition-all text-gray-900 focus:bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:text-gray-100 dark:bg-gray-900/50 dark:border-gray-700"
                      placeholder="e.g. Main Court" value={sharedForm.sport_center} onChange={(e) => setSharedForm({...sharedForm, sport_center: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-gray-500">Radius (Meters)</label>
                    <input
                      type="number" 
                      className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-sm transition-all text-gray-900 focus:bg-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 dark:text-gray-100 dark:bg-gray-900/50 dark:border-gray-700"
                      placeholder={!sharedForm.use_custom_location ? academyAttendanceRadius.toString() : "200"} value={sharedForm.attendance_radius} onChange={(e) => setSharedForm({...sharedForm, attendance_radius: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-gray-500">Base Fee ($)</label>
                    <input
                      type="number" step="0.01" 
                      className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-sm font-mono transition-all text-gray-900 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:text-gray-100 dark:bg-gray-900/50 dark:border-gray-700"
                      placeholder="0.00" value={sharedForm.base_fee} onChange={(e) => setSharedForm({...sharedForm, base_fee: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-gray-500">Status</label>
                    <select
                      className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-sm font-bold transition-all text-gray-900 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 dark:text-gray-100 dark:bg-gray-900/50 dark:border-gray-700"
                      value={sharedForm.status} onChange={(e) => setSharedForm({...sharedForm, status: e.target.value})}
                    >
                      <option value="ACTIVE">🟢 Active</option>
                      <option value="INACTIVE">⚪ Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Deploy Button */}
              <div className="pt-2 pb-1">
                <button
                  type="submit" disabled={isSubmitting || selectedSports.length === 0}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 py-3.5 text-sm font-black tracking-widest text-white shadow-lg transition-all hover:opacity-95 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                  DEPLOY {selectedSports.length > 0 ? selectedSports.length : ''} SPORTS
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* ── Compact Catalog Table Section ── */}
      <div className="rounded-2xl bg-white dark:bg-[#121418] shadow-md border border-gray-100 dark:border-gray-800 overflow-hidden">
        
        {/* Table Header Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-br from-orange-100 to-pink-100 p-2 rounded-lg dark:from-orange-900/40 dark:to-pink-900/40">
               <LayoutDashboard className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide text-gray-900 dark:text-white flex items-center gap-2">
                Active Catalog
                <span className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-2 py-0.5 text-[10px] font-black text-white">{sports.length}</span>
              </h3>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-3 sm:mt-0">
            <button
              onClick={toggleBulkEditMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isBulkEditMode ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200'
              }`}
            >
              {isBulkEditMode ? <X className="h-3.5 w-3.5" /> : <Edit2 className="h-3.5 w-3.5" />}
              {isBulkEditMode ? 'Cancel' : 'Bulk Edit'}
            </button>
            
            {isBulkEditMode && selectedIds.length > 0 && (
              <div className="flex bg-white border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-1 gap-1">
                <button onClick={() => handleBulkAction('activate', 'activated')} className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md text-[10px] uppercase font-black hover:bg-emerald-100"><Check className="h-3 w-3"/> Activate</button>
                <button onClick={() => handleBulkAction('deactivate', 'deactivated')} className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-md text-[10px] uppercase font-black hover:bg-amber-100"><Lock className="h-3 w-3"/> Pause</button>
                <button onClick={() => handleBulkAction('delete', 'deleted')} className="flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-1 rounded-md text-[10px] uppercase font-black hover:bg-rose-100"><Trash2 className="h-3 w-3"/> Delete</button>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-2" />
              <p className="text-xs font-medium text-gray-500">Loading catalog...</p>
            </div>
          ) : sports.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center">
              <LayoutDashboard className="h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Catalog is empty</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-50/80 text-[10px] uppercase tracking-wider text-gray-500 font-bold dark:bg-gray-900/80 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  {isBulkEditMode && (
                    <th className="px-4 py-3 w-10 text-center">
                      <input type="checkbox" checked={selectedIds.length === sports.length && sports.length > 0} onChange={(e) => handleSelectAll(e.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    </th>
                  )}
                  <th className="px-4 py-2.5">Sport</th>
                  <th className="px-4 py-2.5">Center</th>
                  <th className="px-4 py-2.5">Fee</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <motion.tbody initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }} className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {sports.map((sport) => {
                  const id = sport.sport_id || sport.id;
                  const isSelected = selectedIds.includes(id);
                  return (
                    <motion.tr
                      key={id} variants={rowVariants} onClick={() => handleRowClick(id)}
                      className={`group transition-all hover:bg-purple-50/30 dark:hover:bg-purple-900/10 ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''} ${isBulkEditMode ? 'cursor-pointer' : ''}`}
                    >
                      {isBulkEditMode && (
                        <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={isSelected} onChange={(e) => handleSelectOne(id, e.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        </td>
                      )}
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-lg group-hover:scale-110 transition-transform">{sport.icon || FALLBACK_ICON}</span>
                          <span className="font-bold text-gray-900 dark:text-gray-100 text-xs sm:text-sm">{sport.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{sport.sport_center || <span className="italic opacity-50">Academy Default</span>}</span>
                          {sport.use_custom_location && <span className="text-[9px] text-purple-600 dark:text-purple-400 font-black uppercase tracking-wider"><MapPin className="inline h-2.5 w-2.5 -mt-0.5"/> GPS</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        {editingFeeId === id ? (
                          <div className="flex items-center gap-1 bg-white dark:bg-gray-900 p-1 rounded-md border border-indigo-400 shadow-sm" onClick={e => e.stopPropagation()}>
                            <span className="pl-1 text-xs font-bold text-gray-400">$</span>
                            <input type="number" value={editingFeeValue} onChange={(e) => setEditingFeeValue(e.target.value)} className="w-14 bg-transparent text-xs font-bold outline-none" autoFocus />
                            <div className="flex bg-gray-100 dark:bg-gray-800 rounded p-0.5">
                              <button onClick={() => handleSaveFee(id)} className="p-0.5 rounded text-emerald-600 hover:bg-white"><Check className="h-3 w-3" /></button>
                              <button onClick={handleCancelEditFee} className="p-0.5 rounded text-gray-400 hover:bg-white hover:text-rose-500"><X className="h-3 w-3" /></button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-sm font-black text-gray-700 dark:text-gray-300">${formatCurrency(sport.base_fee)}</span>
                            {!isBulkEditMode && (
                              <button onClick={(e) => { e.stopPropagation(); handleStartEditFee(id, sport.base_fee); }} className="opacity-0 group-hover:opacity-100 p-1 bg-gray-100 rounded text-gray-500 hover:text-purple-600 hover:bg-purple-100 transition-all dark:bg-gray-800"><Edit2 className="h-3 w-3" /></button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                          sport.status === 'ACTIVE' ? 'bg-emerald-100/60 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sport.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span> {sport.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        {!isBulkEditMode && (
                          <div className="flex items-center justify-end gap-1">
                            {sport.status === 'ACTIVE' ? (
                              <button onClick={() => handleDeactivate(id)} title="Pause" className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Lock className="h-3.5 w-3.5" /></button>
                            ) : (
                              <button onClick={() => handleMarkActive(id)} title="Activate" className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><Unlock className="h-3.5 w-3.5" /></button>
                            )}
                            <button onClick={() => handleRemoveSport(id)} title="Delete" className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Compact Browse Modal ── */}
      <AnimatePresence>
        {showBrowseModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowBrowseModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#1a1c22] flex flex-col max-h-[80vh] border border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                <div className="flex items-center gap-2">
                  <div className="bg-pink-100 p-1.5 rounded-lg"><Grid className="h-4 w-4 text-pink-600"/></div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">Global Database</h3>
                </div>
                <button onClick={() => setShowBrowseModal(false)} className="rounded-full p-1.5 bg-white shadow-sm border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700"><X className="h-4 w-4" /></button>
              </div>
              <div className="p-3 border-b border-gray-50 dark:border-gray-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text" placeholder="Search sports..." value={browseSearch} onChange={e => setBrowseSearch(e.target.value)}
                    className="w-full rounded-xl border border-pink-200 bg-pink-50/50 pl-9 pr-4 py-2 text-sm focus:bg-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 dark:bg-pink-900/10 dark:border-pink-800 transition-all outline-none"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30 dark:bg-black/20">
                {superAdminLoading ? (
                  <div className="flex h-40 flex-col items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-pink-500 mb-2" />
                    <span className="text-xs font-bold text-gray-500">Loading...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
                    {filteredBrowse.map(sport => {
                      const sel = isSelectedInDraft(sport.name);
                      return (
                        <button
                          key={sport.name} onClick={() => toggleDraftSport(sport)}
                          className={`group relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center transition-all hover:-translate-y-0.5 hover:shadow-md ${
                            sel ? 'border-pink-500 bg-pink-50/50 dark:bg-pink-900/30' : 'border-white bg-white hover:border-pink-300 dark:bg-gray-800 dark:border-gray-800'
                          }`}
                        >
                          <span className="text-3xl">{sport.icon || FALLBACK_ICON}</span>
                          <span className={`text-[11px] font-black uppercase tracking-wider ${sel ? 'text-pink-700 dark:text-pink-400' : 'text-gray-700 dark:text-gray-300'}`}>{sport.name}</span>
                          {sel && <div className="absolute -top-1.5 -right-1.5 bg-pink-500 text-white rounded-full p-0.5 shadow-sm"><Check className="h-3 w-3" /></div>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="border-t border-gray-100 p-3.5 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-[#1a1c22]">
                <p className="text-[11px] font-black uppercase text-gray-500"><span className="text-pink-600">{selectedSports.length}</span> selected</p>
                <button onClick={() => setShowBrowseModal(false)} className="rounded-lg bg-gray-900 px-6 py-2 text-xs font-bold text-white shadow-md hover:bg-gray-800 transition-all dark:bg-white dark:text-gray-900">
                  DONE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Compact Trophy Icon
function TrophyIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7c0 6 6 10 6 10s6-4 6-10V2z" />
    </svg>
  )
}