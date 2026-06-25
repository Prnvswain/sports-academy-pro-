import { useState, useEffect } from 'react';
import { MapPin, Navigation, Shield, Settings, AlertTriangle } from 'lucide-react';

export default function GpsSettingsPanel() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [academyLocation, setAcademyLocation] = useState({ latitude: '', longitude: '' });
  const [sports, setSports] = useState([]);
  const [locationLogs, setLocationLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchGpsSettings();
    fetchSports();
  }, []);

  const fetchGpsSettings = async () => {
    try {
      const response = await fetch('/api/v1/admin/gps/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setSettings(data.data);
      } else {
        setError(data.message || 'Failed to fetch GPS settings');
      }
    } catch (err) {
      setError('Failed to fetch GPS settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchSports = async () => {
    try {
      const response = await fetch('/api/v1/admin/sports', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setSports(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch sports:', err);
    }
  };

  const fetchLocationLogs = async () => {
    try {
      const response = await fetch('/api/v1/admin/gps/location-logs?limit=20', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setLocationLogs(data.data || []);
        setShowLogs(true);
      }
    } catch (err) {
      console.error('Failed to fetch location logs:', err);
    }
  };

  const handleSettingsUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/v1/admin/gps/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      const data = await response.json();
      if (response.ok) {
        setSettings(data.data);
        setSuccess('GPS settings updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to update GPS settings');
      }
    } catch (err) {
      setError('Failed to update GPS settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAcademyLocationUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/v1/admin/gps/academy-location', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(academyLocation)
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess('Academy location updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to update academy location');
      }
    } catch (err) {
      setError('Failed to update academy location');
    } finally {
      setSaving(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setAcademyLocation({
            latitude: position.coords.latitude.toFixed(7),
            longitude: position.coords.longitude.toFixed(7)
          });
          setSuccess('Current location captured');
          setTimeout(() => setSuccess(''), 3000);
        },
        (error) => {
          setError('Failed to get current location. Please enable GPS.');
          setTimeout(() => setError(''), 3000);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSportLocationUpdate = async (sportId, locationData) => {
    try {
      const response = await fetch(`/api/v1/admin/gps/sports/${sportId}/location`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(locationData)
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess('Sport location updated successfully');
        fetchSports();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to update sport location');
      }
    } catch (err) {
      setError('Failed to update sport location');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GPS Attendance Settings</h1>
          <p className="text-gray-600 mt-1">Configure location-based attendance verification</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* GPS Verification Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Settings className="w-6 h-6 text-emerald-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Verification Settings</h2>
        </div>

        <form onSubmit={handleSettingsUpdate} className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="font-medium text-gray-900">Enable GPS Verification</label>
              <p className="text-sm text-gray-600 mt-1">Require GPS coordinates for attendance marking</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings?.gps_verification_enabled || false}
                onChange={(e) => setSettings({ ...settings, gps_verification_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <label className="font-medium text-gray-900 block mb-2">Attendance Radius (meters)</label>
            <input
              type="number"
              min="50"
              max="5000"
              value={settings?.attendance_radius_meters || 200}
              onChange={(e) => setSettings({ ...settings, attendance_radius_meters: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <p className="text-sm text-gray-600 mt-1">Maximum allowed distance from attendance location (50-5000m)</p>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="font-medium text-gray-900">Admin Override</label>
              <p className="text-sm text-gray-600 mt-1">Allow admins to bypass GPS verification</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings?.admin_override_enabled || false}
                onChange={(e) => setSettings({ ...settings, admin_override_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="font-medium text-gray-900">Require Student GPS</label>
              <p className="text-sm text-gray-600 mt-1">Require GPS for student attendance (if applicable)</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings?.require_student_gps || false}
                onChange={(e) => setSettings({ ...settings, require_student_gps: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="font-medium text-gray-900">Require Coach GPS</label>
              <p className="text-sm text-gray-600 mt-1">Require GPS for coach attendance marking</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings?.require_coach_gps || false}
                onChange={(e) => setSettings({ ...settings, require_coach_gps: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-gray-400"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>

      {/* Academy Location */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MapPin className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Academy Location</h2>
        </div>

        <form onSubmit={handleAcademyLocationUpdate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
              <input
                type="number"
                step="0.0000001"
                min="-90"
                max="90"
                value={academyLocation.latitude}
                onChange={(e) => setAcademyLocation({ ...academyLocation, latitude: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="e.g., 19.0760"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
              <input
                type="number"
                step="0.0000001"
                min="-180"
                max="180"
                value={academyLocation.longitude}
                onChange={(e) => setAcademyLocation({ ...academyLocation, longitude: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="e.g., 72.8777"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={getCurrentLocation}
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <Navigation className="w-4 h-4" />
              Get Current Location
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              {saving ? 'Saving...' : 'Update Location'}
            </button>
          </div>
        </form>
      </div>

      {/* Sport Custom Locations */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Navigation className="w-6 h-6 text-purple-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Sport Custom Locations</h2>
        </div>

        <div className="space-y-4">
          {sports.map((sport) => (
            <div key={sport.sport_id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium text-gray-900">{sport.name}</h3>
                  <p className="text-sm text-gray-600">
                    {sport.use_custom_location ? 'Using custom location' : 'Using academy location'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sport.use_custom_location || false}
                    onChange={(e) => handleSportLocationUpdate(sport.sport_id, { use_custom_location: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {sport.use_custom_location && (
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="0.0000001"
                    placeholder="Latitude"
                    defaultValue={sport.latitude || ''}
                    onBlur={(e) => handleSportLocationUpdate(sport.sport_id, { latitude: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <input
                    type="number"
                    step="0.0000001"
                    placeholder="Longitude"
                    defaultValue={sport.longitude || ''}
                    onBlur={(e) => handleSportLocationUpdate(sport.sport_id, { longitude: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Location Logs */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Shield className="w-6 h-6 text-yellow-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Attendance Location Logs</h2>
          </div>
          <button
            onClick={fetchLocationLogs}
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            {showLogs ? 'Refresh' : 'View Logs'}
          </button>
        </div>

        {showLogs && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {locationLogs.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No location logs available</p>
            ) : (
              locationLogs.map((log) => (
                <div key={log.attendance_id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{log.student?.name || 'Unknown'}</p>
                      <p className="text-sm text-gray-600">
                        {log.batch?.name} - {log.batch?.sport?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">{new Date(log.date).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-600">
                        {log.location_verified ? (
                          <span className="text-green-600">✓ Verified</span>
                        ) : (
                          <span className="text-red-600">✗ Not Verified</span>
                        )}
                        {log.distance_from_location_meters && (
                          <span className="ml-2">{log.distance_from_location_meters}m</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {log.latitude && log.longitude && (
                    <p className="text-xs text-gray-500 mt-2">
                      Lat: {log.latitude}, Lon: {log.longitude}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
