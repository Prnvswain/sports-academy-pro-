import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Settings, MapPin, Upload, X, Save, AlertTriangle, Image as ImageIcon, Navigation } from 'lucide-react';
import Loader from '../../components/Loader';
import { adminGet, adminPut } from '../../api/client';

export default function SettingsPanel() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Single form state
  const [formData, setFormData] = useState({
    logo: null,
    logoPreview: null,
    city: '',
    state: '',
    address: '',
    latitude: '',
    longitude: '',
    attendance_radius_meters: 100
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGet('/admin/settings');
      const academyData = res?.data || res;
      setSettings(academyData);

      // Initialize form with existing data
      // Add cache-busting timestamp to logo URL
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
        attendance_radius_meters: academyData?.attendance_radius_meters || 100
      });

      setHasUnsavedChanges(false);
    } catch (error) {
      setMessage({ text: error.message || 'Failed to load settings', type: 'error' });
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
      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setMessage({ text: 'Please upload a PNG, JPG, JPEG, or WEBP image', type: 'error' });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ text: 'File size must be less than 5MB', type: 'error' });
        return;
      }
      
      setFormData({ ...formData, logo: file });
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logoPreview: reader.result }));
      };
      reader.readAsDataURL(file);
      setHasUnsavedChanges(true);
    }
  };

  const handleRemoveLogo = () => {
    setFormData({
      ...formData,
      logo: null,
      logoPreview: null
    });
    setHasUnsavedChanges(true);
  };

  const handleFieldChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setHasUnsavedChanges(true);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude.toFixed(7),
            longitude: position.coords.longitude.toFixed(7)
          });
          setMessage({ text: 'Current location captured', type: 'success' });
          setTimeout(() => setMessage({ text: '', type: '' }), 3000);
          setHasUnsavedChanges(true);
        },
        (error) => {
          setMessage({ text: 'Failed to get current location. Please enable GPS.', type: 'error' });
          setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        }
      );
    } else {
      setMessage({ text: 'Geolocation is not supported by your browser', type: 'error' });
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      // Validate attendance radius
      const radius = parseInt(formData.attendance_radius_meters, 10);
      if (isNaN(radius) || radius < 100 || radius > 5000) {
        setMessage({ text: 'Attendance radius must be between 100 and 5000 meters', type: 'error' });
        setSaving(false);
        return;
      }

      // Prepare form data for academy settings
      const submitData = new FormData();

      // Add logo if changed
      if (formData.logo) {
        submitData.append('logo', formData.logo);
      }

      // Add location fields if changed
      if (formData.city !== undefined) submitData.append('city', formData.city);
      if (formData.state !== undefined) submitData.append('state', formData.state);
      if (formData.address !== undefined) submitData.append('address', formData.address);
      if (formData.latitude !== undefined) submitData.append('latitude', formData.latitude);
      if (formData.longitude !== undefined) submitData.append('longitude', formData.longitude);

      // Save academy settings (logo, location)
      await adminPut('/admin/settings', submitData);

      // Save attendance radius to GPS settings
      await adminPut('/admin/gps/settings', {
        attendance_radius_meters: radius
      });

      setMessage({ text: 'Settings saved successfully', type: 'success' });
      setHasUnsavedChanges(false);

      // Reload data to reflect changes across app
      await loadData();

      // Trigger a global event for other components to update
      window.dispatchEvent(new CustomEvent('academySettingsUpdated'));

      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      setMessage({ text: error.message || 'Failed to save settings', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetLocation = async () => {
    try {
      await adminPut('/admin/settings', {
        latitude: null,
        longitude: null,
        address: null,
        city: null,
        state: null
      });
      setMessage({ text: 'Location reset to default', type: 'success' });
      setShowResetConfirm(false);
      setHasUnsavedChanges(false);
      await loadData();
      window.dispatchEvent(new CustomEvent('academySettingsUpdated'));
    } catch (error) {
      setMessage({ text: error.message || 'Failed to reset location', type: 'error' });
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="relative min-h-screen p-6 sm:p-8">
      {/* Sticky Save Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={handleSaveAll}
          disabled={saving || !hasUnsavedChanges}
          className="btn-primary flex items-center gap-2 px-6 py-3 shadow-lg shadow-primary/30"
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
              className={`p-4 rounded-xl border ${
                message.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
              }`}
            >
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
            <Navigation className="w-5 h-5 text-primary" />
            Attendance Configuration
          </h2>

          <div className="max-w-md">
            <label className="block text-sm font-medium text-foreground mb-2">
              Attendance Radius (meters)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="100"
                max="5000"
                step="50"
                value={formData.attendance_radius_meters}
                onChange={(e) => handleFieldChange('attendance_radius_meters', e.target.value)}
                className="flex-1 h-2 bg-surface-secondary rounded-lg appearance-none cursor-pointer"
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
            <p className="text-sm text-muted-foreground mt-2">
              Current Radius: <span className="font-bold text-foreground">{formData.attendance_radius_meters} meters</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Range: 100 - 5000 meters
            </p>
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
            <div className="flex items-center justify-between p-4 bg-white dark:bg-surface rounded-xl border border-red-200 dark:border-red-800">
              <div>
                <h3 className="font-bold text-foreground">Restore Default Location</h3>
                <p className="text-sm text-muted-foreground">Reset location to default values</p>
              </div>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="btn-danger px-4 py-2"
              >
                Reset Location
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
              onClick={() => setShowResetConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold text-foreground mb-2">Confirm Reset</h3>
                <p className="text-muted-foreground mb-6">
                  Are you sure you want to reset the location to default values? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="btn-secondary px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetLocation}
                    className="btn-danger px-4 py-2"
                  >
                    Confirm Reset
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
