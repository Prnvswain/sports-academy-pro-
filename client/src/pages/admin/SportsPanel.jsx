import { useCallback, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleMap, Autocomplete, Marker, Circle, useJsApiLoader } from '@react-google-maps/api';
import Loader from '../../components/Loader';
import { adminGet, adminPost, adminPatch, adminDelete } from '../../api/client';

const formatCurrency = (value) =>
  Number.isFinite(Number(value)) ? Number(value).toFixed(2) : '0.00';

// Fallback icons if super admin API doesn't return icon field
const FALLBACK_ICON = '🏅';

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
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // ─── Shared form fields (apply to all selected sports on submit) ────────────
  const [sharedForm, setSharedForm] = useState({
    base_fee: '',
    status: 'ACTIVE',
    sport_center: '',
    attendance_radius: '',
    latitude: '',
    longitude: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Location picker ────────────────────────────────────────────────────────
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationCaptured, setLocationCaptured] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 19.076, lng: 72.8777 });
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [autocompleteSessionToken, setAutocompleteSessionToken] = useState(null);
  const autocompleteRef = useRef(null);
  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'],
  });

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
  }, [loadSports]);

  // ─── Geolocation on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMapCenter(coords);
          setSelectedLocation(coords);
        },
        () => {},
      );
    }
  }, []);

  useEffect(() => {
    if (showLocationPicker && window.google) {
      setAutocompleteSessionToken(new window.google.maps.places.AutocompleteSessionToken());
    }
  }, [showLocationPicker]);

  useEffect(() => {
    return () => {
      autocompleteRef.current = null;
      mapRef.current = null;
    };
  }, []);

  // ─── Close dropdown on outside click ───────────────────────────────────────
  useEffect(() => {
    const handleClick = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !searchRef.current?.contains(e.target)
      ) {
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
        await adminPost('/admin/sports', {
          name: sport.name,
          icon: sport.icon,
          base_fee: parseFloat(sharedForm.base_fee || 0),
          status: sharedForm.status,
          sport_center: sharedForm.sport_center.trim() || undefined,
          attendance_radius: sharedForm.attendance_radius
            ? parseFloat(sharedForm.attendance_radius)
            : undefined,
          latitude: sharedForm.latitude ? parseFloat(sharedForm.latitude) : undefined,
          longitude: sharedForm.longitude ? parseFloat(sharedForm.longitude) : undefined,
        });
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
      });
      setLocationCaptured(false);
      setSelectedLocation(null);
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

  // ─── Location handlers (unchanged) ─────────────────────────────────────────
  const handlePlaceSelect = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setSelectedLocation({ lat, lng });
        setMapCenter({ lat, lng });
        setSelectedAddress(place.formatted_address || '');
        if (window.google) {
          setAutocompleteSessionToken(new window.google.maps.places.AutocompleteSessionToken());
        }
      }
    }
  };

  const handleMapClick = (event) => {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    setSelectedLocation({ lat, lng });
    setMapCenter({ lat, lng });
  };

  const handleMarkerDrag = (event) => {
    setSelectedLocation({ lat: event.latLng.lat(), lng: event.latLng.lng() });
  };

  const handleConfirmLocation = () => {
    if (selectedLocation) {
      setSharedForm((prev) => ({
        ...prev,
        sport_center: selectedAddress || 'Selected location',
        latitude: selectedLocation.lat.toFixed(7),
        longitude: selectedLocation.lng.toFixed(7),
      }));
      setLocationCaptured(true);
      setShowLocationPicker(false);
    }
  };

  const handleSetCurrentLocation = () => {
    if (!navigator.geolocation) return alert('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setSelectedLocation(coords);
        setMapCenter(coords);
        mapRef.current?.panTo(coords);
      },
      () => alert('Unable to retrieve your location'),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="space-y-6 w-full overflow-x-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div>
        <h2 className="text-2xl font-bold">Sports Catalog</h2>
        <p className="text-muted">Create and manage sports for your academy workspace.</p>
      </div>

      {/* ── Add Sport Form ── */}
      <form className="card" onSubmit={handleCreateSports}>
        <h3 className="mb-4 font-bold">Add Sport</h3>

        {/* Search + Browse Sports row */}
        <div className="mb-4">
          <label className="label">Search Sport</label>
          <div className="flex gap-2">
            {/* Search input with dropdown */}
            <div className="relative flex-1" ref={searchRef}>
              <input
                type="text"
                className={`input-field pr-10 ${fieldErrors.search ? 'border-red-500' : ''}`}
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground text-lg leading-none"
                  onClick={() => { setSearchQuery(''); setShowDropdown(false); }}
                >
                  ✕
                </button>
              )}

              {/* Dropdown */}
              <AnimatePresence>
                {showDropdown && (
                  <motion.div
                    ref={dropdownRef}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg"
                  >
                    {superAdminLoading ? (
                      <p className="px-4 py-3 text-sm text-muted">Loading sports…</p>
                    ) : !q ? (
                      <p className="px-4 py-3 text-sm text-muted">Start typing to search for sports…</p>
                    ) : filteredDropdown.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-muted">No sports found. Press Enter to add as custom sport.</p>
                    ) : (
                      <>
                        {filteredDropdown.map((sport) => {
                          const sel = isSelectedInDraft(sport.name);
                          return (
                            <button
                              key={sport.name}
                              type="button"
                              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface-secondary ${sel ? 'bg-accent/10' : ''}`}
                              onClick={() => { toggleDraftSport(sport); }}
                            >
                              <span className="text-xl">{sport.icon || FALLBACK_ICON}</span>
                              <span className="flex-1 font-medium">{sport.name}</span>
                              {sel && <span className="text-accent font-bold">✓</span>}
                            </button>
                          );
                        })}

                        {/* Add custom option if typed name not in list */}
                        {q && !superAdminSports.some((s) => s.name.toLowerCase() === q) && (
                          <button
                            type="button"
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-accent hover:bg-accent/10 border-t border-border"
                            onClick={addCustomSport}
                          >
                            <span className="text-xl">➕</span>
                            <span>Add "<strong>{searchQuery.trim()}</strong>" as new sport</span>
                          </button>
                        )}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Browse Sports button */}
            <button
              type="button"
              className="btn-secondary flex items-center gap-2 whitespace-nowrap"
              onClick={() => { setShowBrowseModal(true); setBrowseSearch(''); }}
            >
              <span>🏟️</span> Browse Sports
            </button>
          </div>

          {fieldErrors.search && (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.search}</p>
          )}
        </div>

        {/* Selected sports tags */}
        {selectedSports.length > 0 && (
          <div className="mb-4">
            <p className="label mb-2">Selected ({selectedSports.length})</p>
            <div className="flex flex-wrap gap-2">
              {selectedSports.map((sport) => (
                <motion.span
                  key={sport.name}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-sm font-medium text-accent"
                >
                  <span>{sport.icon}</span>
                  <span>{sport.name}</span>
                  <button
                    type="button"
                    className="ml-1 text-accent/60 hover:text-accent leading-none"
                    onClick={() => removeDraftSport(sport.name)}
                  >
                    ✕
                  </button>
                </motion.span>
              ))}
            </div>
          </div>
        )}

        {/* Shared fields: Sport Center, Radius, Fee, Status */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="relative">
            <label className="label" htmlFor="sportCenter">Sport Center</label>
            <div className="space-y-2">
              <motion.input
                id="sportCenter"
                type="text"
                className="input-field"
                value={sharedForm.sport_center}
                onClick={() => setShowLocationPicker(true)}
                onFocus={() => setShowLocationPicker(true)}
                placeholder="Click to select location"
                readOnly
                whileFocus={{ scale: 1.01 }}
              />
              {locationCaptured && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 border-2 border-emerald-600 rounded">
                  ✓ Location Captured
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="attendanceRadius">Attendance Radius (Meters)</label>
            <motion.input
              id="attendanceRadius"
              type="number"
              min={0}
              className="input-field"
              value={sharedForm.attendance_radius}
              onChange={(e) => setSharedForm({ ...sharedForm, attendance_radius: e.target.value })}
              placeholder="Enter radius in meters"
              whileFocus={{ scale: 1.01 }}
            />
          </div>

          <div>
            <label className="label" htmlFor="baseFee">Base Fee</label>
            <motion.input
              id="baseFee"
              type="number"
              min={0}
              step={0.01}
              className="input-field"
              value={sharedForm.base_fee}
              onChange={(e) => setSharedForm({ ...sharedForm, base_fee: e.target.value })}
              placeholder="0.00"
              whileFocus={{ scale: 1.01 }}
            />
          </div>

          <div>
            <label className="label" htmlFor="status">Status</label>
            <motion.select
              id="status"
              className="input-field"
              value={sharedForm.status}
              onChange={(e) => setSharedForm({ ...sharedForm, status: e.target.value })}
              whileFocus={{ scale: 1.01 }}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </motion.select>
          </div>
        </div>

        <div className="mt-4">
          <motion.button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isSubmitting
              ? 'Adding…'
              : selectedSports.length > 1
              ? `Add ${selectedSports.length} Sports`
              : 'Add Sport'}
          </motion.button>
        </div>
      </form>

      {/* ── Browse Sports Modal ── */}
      <AnimatePresence>
        {showBrowseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-surface border-border max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-xl border shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="border-border flex items-center justify-between border-b p-4">
                <div>
                  <h3 className="font-bold text-lg">Browse Sports</h3>
                  <p className="text-muted text-xs mt-0.5">Select one or more sports to add</p>
                </div>
                <button
                  type="button"
                  className="text-muted hover:text-foreground transition-colors text-xl"
                  onClick={() => setShowBrowseModal(false)}
                >
                  ✕
                </button>
              </div>

              {/* Search inside modal */}
              <div className="border-b border-border px-4 py-3">
                <input
                  type="text"
                  className="input-field"
                  placeholder="Search sports…"
                  value={browseSearch}
                  onChange={(e) => setBrowseSearch(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Grid */}
              <div className="overflow-y-auto flex-1 p-4">
                {superAdminLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader message="Loading sports…" />
                  </div>
                ) : filteredBrowse.length === 0 ? (
                  <p className="py-8 text-center text-muted text-sm">No sports found.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                    {filteredBrowse.map((sport) => {
                      const sel = isSelectedInDraft(sport.name);
                      return (
                        <button
                          key={sport.name}
                          type="button"
                          className={`relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-all hover:border-accent hover:bg-accent/10 ${
                            sel
                              ? 'border-accent bg-accent/10 ring-2 ring-accent/20'
                              : 'border-border bg-surface-secondary'
                          }`}
                          onClick={() => toggleBrowseSport(sport)}
                        >
                          {sel && (
                            <span className="absolute top-1.5 right-1.5 text-accent text-xs font-bold bg-accent/20 rounded-full w-4 h-4 flex items-center justify-center">
                              ✓
                            </span>
                          )}
                          <span className="text-3xl">{sport.icon || FALLBACK_ICON}</span>
                          <span className="text-muted text-xs text-center leading-tight">{sport.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-border p-4 flex items-center justify-between">
                <p className="text-sm text-muted">
                  {selectedSports.length > 0
                    ? `${selectedSports.length} sport${selectedSports.length > 1 ? 's' : ''} selected`
                    : 'None selected'}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => setShowBrowseModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    onClick={() => setShowBrowseModal(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Location Picker Modal (unchanged UI) ── */}
      {showLocationPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white border-2 border-zinc-950 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg shadow-[8px_8px_0_0_#09090b]">
            <div className="flex items-center justify-between border-b-2 border-zinc-950 p-4 bg-zinc-50">
              <h3 className="font-bold text-lg">Select Sport Center Location</h3>
              <button
                type="button"
                className="text-zinc-600 hover:text-zinc-900 font-bold text-xl transition-colors"
                onClick={() => setShowLocationPicker(false)}
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">Search Location</label>
                {isLoaded ? (
                  <Autocomplete
                    onLoad={(ac) => {
                      autocompleteRef.current = ac;
                      if (autocompleteSessionToken) {
                        ac.setOptions({
                          sessionToken: autocompleteSessionToken,
                          fields: ['geometry.location', 'formatted_address', 'name'],
                        });
                      }
                    }}
                    onPlaceChanged={handlePlaceSelect}
                  >
                    <input
                      type="text"
                      placeholder="Search for a location..."
                      className="w-full px-4 py-3 border-2 border-zinc-950 rounded-lg shadow-[4px_4px_0_0_#09090b] focus:outline-none focus:shadow-[2px_2px_0_0_#09090b] focus:translate-x-[2px] focus:translate-y-[2px] transition-all"
                    />
                  </Autocomplete>
                ) : (
                  <input type="text" placeholder="Loading maps..." disabled className="w-full px-4 py-3 border-2 border-zinc-300 rounded-lg bg-zinc-100" />
                )}
              </div>

              <button
                type="button"
                className="px-4 py-2.5 font-bold text-white bg-emerald-600 border-2 border-emerald-800 rounded-lg shadow-[4px_4px_0_0_#065f46] hover:shadow-[2px_2px_0_0_#065f46] hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center gap-2"
                onClick={handleSetCurrentLocation}
              >
                📍 Set Current Location
              </button>

              <div className="h-96 border-2 border-zinc-950 rounded-lg overflow-hidden shadow-[4px_4px_0_0_#09090b]">
                {isLoaded ? (
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={mapCenter}
                    zoom={15}
                    onClick={handleMapClick}
                    onLoad={(map) => { mapRef.current = map; }}
                  >
                    {selectedLocation && (
                      <>
                        <Marker position={selectedLocation} draggable onDragEnd={handleMarkerDrag} />
                        {sharedForm.attendance_radius && (
                          <Circle
                            center={selectedLocation}
                            radius={parseFloat(sharedForm.attendance_radius)}
                            options={{ fillColor: '#10b981', fillOpacity: 0.2, strokeColor: '#10b981', strokeOpacity: 0.8, strokeWeight: 2 }}
                          />
                        )}
                      </>
                    )}
                  </GoogleMap>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-100">
                    <p className="text-zinc-500">Loading map…</p>
                  </div>
                )}
              </div>

              <div className="bg-emerald-50 border-2 border-emerald-600 rounded-lg p-4 shadow-[4px_4px_0_0_#059669]">
                <h4 className="font-bold text-emerald-800 mb-3">Captured Coordinates</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-emerald-700 mb-1">Latitude</label>
                    <p className="text-emerald-900 font-mono text-sm">{selectedLocation ? selectedLocation.lat.toFixed(7) : '—'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-700 mb-1">Longitude</label>
                    <p className="text-emerald-900 font-mono text-sm">{selectedLocation ? selectedLocation.lng.toFixed(7) : '—'}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="px-6 py-2.5 font-bold text-zinc-700 bg-white border-2 border-zinc-950 rounded-lg shadow-[4px_4px_0_0_#09090b] hover:shadow-[2px_2px_0_0_#09090b] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                  onClick={() => setShowLocationPicker(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-6 py-2.5 font-bold text-white bg-emerald-600 border-2 border-emerald-800 rounded-lg shadow-[4px_4px_0_0_#065f46] hover:shadow-[2px_2px_0_0_#065f46] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleConfirmLocation}
                  disabled={!selectedLocation}
                >
                  Confirm Location
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Alert message ── */}
      {message.text && (
        <p className={message.type === 'success' ? 'alert-success' : 'alert-error'}>
          {message.text}
        </p>
      )}

      {/* ── Available Sports Table ── */}
      <div className="card overflow-x-auto">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-bold">Available Sports</h3>
            <button
              type="button"
              className={`btn-sm ${isBulkEditMode ? 'btn-primary' : 'btn-secondary'}`}
              onClick={toggleBulkEditMode}
            >
              {isBulkEditMode ? 'Exit Bulk Mode' : 'Bulk Actions'}
            </button>
          </div>
          {isBulkEditMode && selectedIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2"
            >
              <button type="button" className="btn-secondary btn-sm" onClick={() => handleBulkAction('activate', 'activated')}>
                Bulk Activate ({selectedIds.length})
              </button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => handleBulkAction('deactivate', 'deactivated')}>
                Bulk Deactivate ({selectedIds.length})
              </button>
              <button type="button" className="btn-danger btn-sm" onClick={() => handleBulkAction('delete', 'removed')}>
                Bulk Delete ({selectedIds.length})
              </button>
            </motion.div>
          )}
        </div>

        {loading ? (
          <Loader message="Loading sports catalog…" />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {isBulkEditMode && (
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === sports.length && sports.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="border-border accent-accent h-4 w-4 rounded"
                    />
                  </th>
                )}
                <th>Name</th>
                <th>Sport Center</th>
                <th>Base Fee</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sports.length > 0 ? (
                sports.map((sport, index) => (
                  <motion.tr
                    key={sport.sport_id || sport.id || sport.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                    className={`cursor-pointer border-b ${!sport.isAcademySport ? 'bg-surface-secondary/30' : ''} ${selectedIds.includes(sport.sport_id || sport.id) ? 'bg-surface-secondary/50' : ''}`}
                    onClick={() => sport.isAcademySport && handleRowClick(sport.sport_id || sport.id)}
                  >
                    {isBulkEditMode && sport.isAcademySport && (
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(sport.sport_id || sport.id)}
                          onChange={(e) => handleSelectOne(sport.sport_id || sport.id, e.target.checked)}
                          className="border-border accent-accent h-4 w-4 rounded"
                        />
                      </td>
                    )}
                    {isBulkEditMode && !sport.isAcademySport && (
                      <td className="p-3"></td>
                    )}
                    <td className="p-3 font-medium">
                      <span className="mr-2 text-lg">{sport.icon || '🏅'}</span>
                      {sport.name}
                      {!sport.isAcademySport && (
                        <span className="ml-2 text-xs text-muted bg-surface-secondary px-2 py-0.5 rounded">Available</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="text-muted text-sm">{sport.sport_center || '—'}</span>
                    </td>
                    <td className="p-3">
                      {sport.isAcademySport ? (
                        editingFeeId === (sport.sport_id || sport.id) ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              className="input-field w-24 px-2 py-1 text-sm"
                              value={editingFeeValue}
                              onChange={(e) => setEditingFeeValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveFee(sport.sport_id || sport.id);
                                if (e.key === 'Escape') handleCancelEditFee();
                              }}
                            />
                            <button type="button" className="btn-success btn-sm px-2 py-1 text-xs" onClick={(e) => { e.stopPropagation(); handleSaveFee(sport.sport_id || sport.id); }}>✓</button>
                            <button type="button" className="btn-secondary btn-sm px-2 py-1 text-xs" onClick={(e) => { e.stopPropagation(); handleCancelEditFee(); }}>✕</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <span>${formatCurrency(sport.base_fee || sport.baseFee)}</span>
                            <button
                              type="button"
                              className="text-muted hover:text-foreground"
                              onClick={(e) => { e.stopPropagation(); handleStartEditFee(sport.sport_id || sport.id, sport.base_fee || sport.baseFee); }}
                              title="Edit Fee"
                            >
                              ✏️
                            </button>
                          </div>
                        )
                      ) : (
                        <span className="text-muted text-sm">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {sport.isAcademySport ? (
                        <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${sport.status === 'ACTIVE' ? 'bg-success/10 text-success border-success/20 border' : 'bg-danger/10 text-danger border-danger/20 border'}`}>
                          {sport.status || 'ACTIVE'}
                        </span>
                      ) : (
                        <span className="text-muted text-sm">Not Added</span>
                      )}
                    </td>
                    <td className="space-x-1 p-3" onClick={(e) => e.stopPropagation()}>
                      {sport.isAcademySport ? (
                        sport.status === 'ACTIVE' ? (
                          <>
                            <button type="button" className="btn-secondary btn-sm" onClick={() => handleDeactivate(sport.sport_id || sport.id)}>Deactivate</button>
                            <button type="button" className="btn-danger btn-sm" onClick={() => handleRemoveSport(sport.sport_id || sport.id)}>Remove</button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="btn-secondary btn-sm" onClick={() => handleMarkActive(sport.sport_id || sport.id)}>Mark Active</button>
                            <button type="button" className="btn-danger btn-sm" onClick={() => handleRemoveSport(sport.sport_id || sport.id)}>Remove</button>
                          </>
                        )
                      ) : (
                        <button type="button" className="btn-primary btn-sm" onClick={() => { setSearchQuery(sport.name); setShowDropdown(true); }}>Add</button>
                      )}
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isBulkEditMode ? 6 : 5} className="text-muted-foreground py-8 text-center">
                    No sports available. Add a sport above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
}