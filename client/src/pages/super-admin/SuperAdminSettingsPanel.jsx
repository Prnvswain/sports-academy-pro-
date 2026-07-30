import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Palette, RotateCcw, Save } from 'lucide-react';
import { superAdminGet, superAdminPut } from '../../api/client';

// Default theme colors
const DEFAULT_THEME_COLORS = {
  primary_color: '#84cc16',
  secondary_color: '#FFC400',
  accent_color: '#84cc16',
  background_gradient: '#FFC400',
  navbar_color: '#84cc16',
  sidebar_color: '#0f172a',
  button_primary: '#84cc16',
  button_hover: '#65a30d',
  card_accent: '#84cc16',
};

export default function SuperAdminSettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [formData, setFormData] = useState({
    primary_color: DEFAULT_THEME_COLORS.primary_color,
    secondary_color: DEFAULT_THEME_COLORS.secondary_color,
    accent_color: DEFAULT_THEME_COLORS.accent_color,
    background_gradient: DEFAULT_THEME_COLORS.background_gradient,
    navbar_color: DEFAULT_THEME_COLORS.navbar_color,
    sidebar_color: DEFAULT_THEME_COLORS.sidebar_color,
    button_primary: DEFAULT_THEME_COLORS.button_primary,
    button_hover: DEFAULT_THEME_COLORS.button_hover,
    card_accent: DEFAULT_THEME_COLORS.card_accent,
  });

  const showToast = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await superAdminGet('/super-admin/theme');
      const themeData = response?.data || response;

      setFormData({
        primary_color: themeData?.primary_color || DEFAULT_THEME_COLORS.primary_color,
        secondary_color: themeData?.secondary_color || DEFAULT_THEME_COLORS.secondary_color,
        accent_color: themeData?.accent_color || DEFAULT_THEME_COLORS.accent_color,
        background_gradient: themeData?.background_gradient || DEFAULT_THEME_COLORS.background_gradient,
        navbar_color: themeData?.navbar_color || DEFAULT_THEME_COLORS.navbar_color,
        sidebar_color: themeData?.sidebar_color || DEFAULT_THEME_COLORS.sidebar_color,
        button_primary: themeData?.button_primary || DEFAULT_THEME_COLORS.button_primary,
        button_hover: themeData?.button_hover || DEFAULT_THEME_COLORS.button_hover,
        card_accent: themeData?.card_accent || DEFAULT_THEME_COLORS.card_accent,
      });

      setHasUnsavedChanges(false);
    } catch (error) {
      showToast(error.message || 'Failed to load theme settings', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      await superAdminPut('/super-admin/theme', formData);
      showToast('Theme settings saved successfully', 'success');
      setHasUnsavedChanges(false);
      await loadData();
      // Dispatch event to notify all portals to reload theme
      window.dispatchEvent(new CustomEvent('globalThemeUpdated'));
    } catch (error) {
      showToast(error.message || 'Failed to save theme settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData(DEFAULT_THEME_COLORS);
    setHasUnsavedChanges(true);
    showToast('Theme colors reset to defaults', 'success');
  };

  // Color Picker Row Component
  function ColorPickerRow({ label, field, description }) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-sm font-medium text-foreground block">{label}</label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={formData[field]}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            className="w-10 h-10 rounded-lg cursor-pointer border-2 border-border"
          />
          <input
            type="text"
            value={formData[field]}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            className="input-field w-24 text-xs font-mono"
            placeholder="#000000"
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage global theme settings for all portals</p>
        </div>
        {hasUnsavedChanges && (
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="btn-secondary px-4 py-2 flex items-center gap-2"
              disabled={saving}
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={handleSave}
              className="btn-primary px-4 py-2 flex items-center gap-2"
              disabled={saving}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Toast Message */}
      {message.text && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Portal Theme Section */}
      <motion.div
        className="bg-gradient-to-br from-card to-card/50 border border-border rounded-2xl p-6 shadow-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          Portal Theme
        </h2>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ColorPickerRow
              label="Primary Color"
              field="primary_color"
              description="Main brand color"
            />
            <ColorPickerRow
              label="Secondary Color"
              field="secondary_color"
              description="Accent color"
            />
            <ColorPickerRow
              label="Accent Color"
              field="accent_color"
              description="Highlight color"
            />
            <ColorPickerRow
              label="Background Gradient"
              field="background_gradient"
              description="Top gradient color"
            />
            <ColorPickerRow
              label="Navbar Color"
              field="navbar_color"
              description="Header bar color"
            />
            <ColorPickerRow
              label="Sidebar Color"
              field="sidebar_color"
              description="Navigation panel"
            />
            <ColorPickerRow
              label="Button Primary"
              field="button_primary"
              description="Main button color"
            />
            <ColorPickerRow
              label="Button Hover"
              field="button_hover"
              description="Button hover state"
            />
            <ColorPickerRow
              label="Card Accent"
              field="card_accent"
              description="Card border/accent"
            />
          </div>

          {/* Theme Preview */}
          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Live Preview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className="rounded-xl p-4 border-2"
                style={{
                  backgroundColor: formData.sidebar_color,
                  borderColor: formData.card_accent,
                }}
              >
                <div
                  className="h-8 rounded-lg mb-3 flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: formData.navbar_color }}
                >
                  Navbar
                </div>
                <div
                  className="h-6 rounded mb-2 flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: formData.button_primary }}
                >
                  Primary Button
                </div>
                <div
                  className="h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: formData.button_hover }}
                >
                  Hover Button
                </div>
              </div>
              <div
                className="rounded-xl p-4 border-2 bg-slate-50 dark:bg-slate-900"
                style={{ borderColor: formData.card_accent }}
              >
                <div
                  className="h-4 rounded mb-2"
                  style={{ backgroundColor: formData.primary_color }}
                ></div>
                <div
                  className="h-4 rounded mb-2"
                  style={{ backgroundColor: formData.secondary_color }}
                ></div>
                <div
                  className="h-4 rounded mb-2"
                  style={{ backgroundColor: formData.accent_color }}
                ></div>
                <div
                  className="h-4 rounded"
                  style={{ backgroundColor: formData.background_gradient }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
