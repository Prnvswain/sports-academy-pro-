import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Settings, MapPin, Upload, X, Save, AlertTriangle,
  Image as ImageIcon, Navigation, Shield, RotateCcw,
  CheckCircle2, Radio, Users, UserCheck, ToggleLeft, ToggleRight
} from 'lucide-react';
import Loader from '../../components/Loader';
import { adminGet, adminPut, adminPatch } from '../../api/client';

// Default attendance settings
const DEFAULT_GPS_SETTINGS = {
  gps_verification_enabled: true,
  attendance_radius_meters: 200,
  admin_override_enabled: true,
  require_student_gps: true,
  require_coach_gps: true,
};

export default function SettingsPanel() {
  const navigate = useNavigate();
  const location = useLocation();

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Single form state
  const [formData, setFormData] = useState({
    logo: null,
    logoPreview: null,
    city: '',
    state: '',
    address: '',
    latitude: '',
    longitude: '',
    // GPS / Attendance Config
    gps_verification_enabled: DEFAULT_GPS_SETTINGS.gps_verification_enabled,
    attendance_radius_meters: DEFAULT_GPS_SETTINGS.attendance_radius_meters,
    admin_override_enabled: DEFAULT_GPS_SETTINGS.admin_override_enabled,
    require_student_gps: DEFAULT_GPS_SETTINGS.require_student_gps,
    require_coach_gps: DEFAULT_GPS_SETTINGS.require_coach_gps,
  });

  const showToast = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch academy settings and GPS settings in parallel
      const [academyRes, gpsRes] = await Promise.all([
        adminGet('/admin/settings'),
        adminGet('/admin/gps/settings'),
      ]);

      const academyData = academyRes?.data || academyRes;
      const gpsData = gpsRes?.data || gpsRes;

      setSettings(academyData);

      const logoUrl = academyData?.logo_url;
      const logoPreview = logoUrl ? `${logoUrl}?t=${Date.now()}` : null;

      setFormData({
        logo: null,
        logoPreview,
        city: academyData?.city || '',
        state: academyData?.state || '',
        address: academyData?.address || '',
        latitude: academyData?.latitude ? String(academyData.latitude) : '',
        longitude: academyData?.longitude ? String(academyData.longitude) : '',
        // GPS settings — fall back to defaults if not present
        gps_verification_enabled: gpsData?.gps_verification_enabled ?? DEFAULT_GPS_SETTINGS.gps_verification_enabled,
        attendance_radius_meters: gpsData?.attendance_radius_meters ?? DEFAULT_GPS_SETTINGS.attendance_radius_meters,
        admin_override_enabled: gpsData?.admin_override_enabled ?? DEFAULT_GPS_SETTINGS.admin_override_enabled,
        require_student_gps: gpsData?.require_student_gps ?? DEFAULT_GPS_SETTINGS.require_student_gps,
        require_coach_gps: gpsData?.require_coach_gps ?? DEFAULT_GPS_SETTINGS.require_coach_gps,
      });

      setHasUnsavedChanges(false);
    } catch (error) {
      showToast(error.message || 'Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Unsaved changes protection
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const unblock = navigate.block?.((tx) => {
      if (hasUnsavedChanges) {
        if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
          setHasUnsavedChanges(false);
          tx.retry();
        } else {
          tx.abort();
        }
      } else {
        tx.retry();
      }
    });
    return () => unblock?.();
  }, [hasUnsavedChanges, navigate]);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        showToast('Please upload a PNG, JPG, JPEG, or WEBP image', 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast('File size must be less than 5MB', 'error');
        return;
      }
      setFormData((prev) => ({ ...prev, logo: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, logoPreview: reader.result }));
      };
      reader.readAsDataURL(file);
      setHasUnsavedChanges(true);
    }
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logo: null, logoPreview: null }));
    setHasUnsavedChanges(true);
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleToggle = (field) => {
    setFormData((prev) => ({ ...prev, [field]: !prev[field] }));
    setHasUnsavedChanges(true);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            latitude: position.coords.latitude.toFixed(7),
            longitude: position.coords.longitude.toFixed(7),
          }));
          showToast('Current location captured', 'success');
          setHasUnsavedChanges(true);
        },
        () => {
          showToast('Failed to get current location. Please enable GPS.', 'error');
        }
      );
    } else {
      showToast('Geolocation is not supported by your browser', 'error');
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const radius = parseInt(formData.attendance_radius_meters, 10);
      if (isNaN(radius) || radius < 100 || radius > 5000) {
        showToast('Attendance radius must be between 100 and 5000 meters', 'error');
        setSaving(false);
        return;
      }

      // Save academy settings (logo + location)
      const submitData = new FormData();
      if (formData.logo) submitData.append('logo', formData.logo);
      if (formData.city !== undefined) submitData.append('city', formData.city);
      if (formData.state !== undefined) submitData.append('state', formData.state);
      if (formData.address !== undefined) submitData.append('address', formData.address);
      if (formData.latitude !== undefined) submitData.append('latitude', formData.latitude);
      if (formData.longitude !== undefined) submitData.append('longitude', formData.longitude);

      // Save GPS / Attendance Configuration
      await Promise.all([
        adminPut('/admin/settings', submitData),
        adminPatch('/admin/gps/settings', {
          attendance_radius_meters: radius,
          gps_verification_enabled: formData.gps_verification_enabled,
          admin_override_enabled: formData.admin_override_enabled,
          require_student_gps: formData.require_student_gps,
          require_coach_gps: formData.require_coach_gps,
        }),
      ]);

      showToast('Settings saved successfully', 'success');
      setHasUnsavedChanges(false);
      await loadData();
      window.dispatchEvent(new CustomEvent('academySettingsUpdated'));
    } catch (error) {
      showToast(error.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    setResetting(true);
    try {
      // Reset all attendance config settings in DB to defaults
      await adminPatch('/admin/gps/settings', { ...DEFAULT_GPS_SETTINGS });

      // Also reset location to null
      await adminPut('/admin/settings', {
        latitude: null,
        longitude: null,
        address: null,
        city: null,
        state: null,
      });

      showToast('All settings reset to defaults successfully', 'success');
      setShowResetConfirm(false);
      setHasUnsavedChanges(false);
      await loadData();
      window.dispatchEvent(new CustomEvent('academySettingsUpdated'));
    } catch (error) {
      showToast(error.message || 'Failed to reset settings', 'error');
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <Loader />;

  // Helper for toggle row
  const ToggleRow = ({ icon: Icon, label, description, field, iconColor = 'text-primary' }) => (
    <div className="flex items-center justify-between p-4 bg-surface-secondary/30 rounded-xl border border-border hover:bg-surface-secondary/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={() => handleToggle(field)}
        className="relative focus:outline-none"
        aria-label={`Toggle ${label}`}
      >
        <div
          className={`w-12 h-6 rounded-full transition-colors duration-300 ${
            formData[field] ? 'bg-primary' : 'bg-border'
          }`}
        />
        <div
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${
            formData[field] ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="relative min-h-screen p-6 sm:p-8">
      {/* Sticky Save Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={handleSaveAll}
          disabled={saving || !hasUnsavedChanges}
          className="btn-primary flex items-center gap-2 px-6 py-3 shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <motion.div
        className="relative z-10 max-w-7xl mx-auto space-y-8 pb-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
              <Settings className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                Academy Settings
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage academy branding, location and attendance configuration.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Message Toast */}
        <AnimatePresence>
          {message.text && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-xl border flex items-center gap-3 ${
                message.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Section 1: Academy Branding */}
        <motion.div
          className="bg-gradient-to-br from-card to-card/50 border border-border rounded-2xl p-6 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            Academy Branding
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Logo Preview */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-foreground">Academy Logo</label>
              <div className="relative aspect-square max-w-[200px] rounded-2xl border-2 border-dashed border-border overflow-hidden bg-surface-secondary/30 flex items-center justify-center">
                {formData.logoPreview ? (
                  <img
                    src={formData.logoPreview}
                    alt="Academy Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-6">
                    <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No logo uploaded</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <label className="btn-primary cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg">
                  <Upload className="w-4 h-4" />
                  <span>Change Logo</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
                {formData.logoPreview && (
                  <button
                    onClick={handleRemoveLogo}
                    className="btn-secondary flex items-center gap-2 px-4 py-2 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Read-only Academy Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Academy Name</label>
                <input
                  type="text"
                  value={settings?.name || ''}
                  readOnly
                  className="input-field w-full bg-surface-secondary/50 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Admin Name</label>
                <input
                  type="text"
                  value={settings?.owner_name || ''}
                  readOnly
                  className="input-field w-full bg-surface-secondary/50 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Registered Email</label>
                <input
                  type="email"
                  value={settings?.email || ''}
                  readOnly
                  className="input-field w-full bg-surface-secondary/50 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section 2: Academy Location */}
        <motion.div
          className="bg-gradient-to-br from-card to-card/50 border border-border rounded-2xl p-6 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Academy Location
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleFieldChange('city', e.target.value)}
                  className="input-field w-full"
                  placeholder="Enter city"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleFieldChange('state', e.target.value)}
                  className="input-field w-full"
                  placeholder="Enter state"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Full Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  className="input-field w-full min-h-[100px] resize-y"
                  placeholder="Enter full address"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.0000001"
                  value={formData.latitude}
                  onChange={(e) => handleFieldChange('latitude', e.target.value)}
                  className="input-field w-full"
                  placeholder="e.g. 28.6139"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.0000001"
                  value={formData.longitude}
                  onChange={(e) => handleFieldChange('longitude', e.target.value)}
                  className="input-field w-full"
                  placeholder="e.g. 77.2090"
                />
              </div>

              <button
                onClick={getCurrentLocation}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <Navigation className="w-4 h-4" />
                Get Current Location
              </button>

              {formData.latitude && formData.longitude && (
                <div className="p-4 bg-surface-secondary/50 rounded-xl border border-border">
                  <p className="text-sm text-muted-foreground mb-2">Current Coordinates:</p>
                  <p className="font-mono text-sm text-foreground">
                    {formData.latitude}, {formData.longitude}
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Section 3: Attendance Configuration */}
        <motion.div
          className="bg-gradient-to-br from-card to-card/50 border border-border rounded-2xl p-6 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Attendance Configuration
          </h2>

          <div className="space-y-6">
            {/* GPS Toggle Rows */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">GPS Verification</h3>
              <ToggleRow
                icon={Radio}
                label="Enable GPS Verification"
                description="Require GPS location for all attendance marking"
                field="gps_verification_enabled"
                iconColor="text-primary"
              />
              <ToggleRow
                icon={UserCheck}
                label="Require Student GPS"
                description="Students must be within the academy radius to mark attendance"
                field="require_student_gps"
                iconColor="text-blue-500"
              />
              <ToggleRow
                icon={Users}
                label="Require Coach GPS"
                description="Coaches must be within the academy radius to start a batch"
                field="require_coach_gps"
                iconColor="text-purple-500"
              />
              <ToggleRow
                icon={Shield}
                label="Admin Override"
                description="Allow admins to manually override attendance regardless of GPS"
                field="admin_override_enabled"
                iconColor="text-amber-500"
              />
            </div>

            {/* Radius Slider */}
            <div className="pt-2 border-t border-border">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Attendance Radius</h3>
              <div className="max-w-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    GPS Attendance Radius
                  </label>
                  <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg">
                    {formData.attendance_radius_meters} m
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="100"
                    max="5000"
                    step="50"
                    value={formData.attendance_radius_meters}
                    onChange={(e) => handleFieldChange('attendance_radius_meters', e.target.value)}
                    className="flex-1 h-2 bg-surface-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <input
                    type="number"
                    min="100"
                    max="5000"
                    value={formData.attendance_radius_meters}
                    onChange={(e) => handleFieldChange('attendance_radius_meters', e.target.value)}
                    className="input-field w-24 text-center"
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>100 m (tight)</span>
                  <span>2,500 m</span>
                  <span>5,000 m (wide)</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Students and coaches must be within this radius from the academy to mark GPS-verified attendance.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section 4: Danger Zone */}
        <motion.div
          className="bg-gradient-to-br from-red-50/50 to-red-100/30 dark:from-red-900/20 dark:to-red-950/10 border border-red-200 dark:border-red-800 rounded-2xl p-6 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </h2>

          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 p-4 bg-white dark:bg-surface rounded-xl border border-red-200 dark:border-red-800">
              <div>
                <h3 className="font-bold text-foreground">Reset to Default Settings</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Reset <strong>all</strong> Attendance Configuration settings (GPS radius, GPS verification toggles,
                  override rules) and academy location back to their default values. This cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="btn-danger px-4 py-2 flex items-center gap-2 whitespace-nowrap flex-shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Defaults
              </button>
            </div>
          </div>
        </motion.div>

        {/* Reset Confirmation Modal */}
        <AnimatePresence>
          {showResetConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => !resetting && setShowResetConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <RotateCcw className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Reset to Default Settings?</h3>
                    <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
                  </div>
                </div>

                <div className="bg-surface-secondary/50 rounded-xl p-4 mb-5 space-y-2 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground mb-2">The following will be reset:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>GPS Verification → <span className="text-green-600 font-medium">Enabled</span></li>
                    <li>Attendance Radius → <span className="text-primary font-medium">200 meters</span></li>
                    <li>Admin Override → <span className="text-green-600 font-medium">Enabled</span></li>
                    <li>Require Student GPS → <span className="text-green-600 font-medium">Enabled</span></li>
                    <li>Require Coach GPS → <span className="text-green-600 font-medium">Enabled</span></li>
                    <li>Academy Location → <span className="text-red-500 font-medium">Cleared</span></li>
                  </ul>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    disabled={resetting}
                    className="btn-secondary px-4 py-2 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetToDefaults}
                    disabled={resetting}
                    className="btn-danger px-4 py-2 flex items-center gap-2 disabled:opacity-50"
                  >
                    <RotateCcw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
                    {resetting ? 'Resetting...' : 'Yes, Reset Everything'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
