import { useState, useEffect, useCallback } from 'react';
import { MapPin, Loader2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

/**
 * GPSCapture Component
 * Reusable component for capturing GPS coordinates with validation
 * 
 * @param {object} props
 * @param {function} props.onLocationCapture - Callback when location is captured (lat, lng, accuracy)
 * @param {object} props.initialLocation - Initial location { latitude, longitude }
 * @param {boolean} props.required - Whether location is required
 * @param {string} props.label - Label for the location field
 * @param {string} props.placeholder - Placeholder text
 */
export default function GPSCapture({
  onLocationCapture,
  initialLocation = null,
  required = false,
  label = 'Location',
  placeholder = 'Capture GPS coordinates'
}) {
  const [location, setLocation] = useState(initialLocation);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accuracy, setAccuracy] = useState(null);

  const captureLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy: gpsAccuracy } = position.coords;
        
        setLocation({ latitude, longitude });
        setAccuracy(gpsAccuracy);
        
        if (onLocationCapture) {
          onLocationCapture({
            latitude,
            longitude,
            accuracy: gpsAccuracy
          });
        }
        
        setLoading(false);
      },
      (err) => {
        let errorMessage = 'Failed to capture location';
        
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case err.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
          default:
            errorMessage = 'An unknown error occurred while capturing location.';
        }
        
        setError(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [onLocationCapture]);

  // Capture location on mount if initialLocation is provided
  useEffect(() => {
    if (initialLocation) {
      setLocation(initialLocation);
    }
  }, [initialLocation]);

  const clearLocation = () => {
    setLocation(null);
    setAccuracy(null);
    setError(null);
    if (onLocationCapture) {
      onLocationCapture(null);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              readOnly
              value={location 
                ? `${location.latitude.toFixed(7)}, ${location.longitude.toFixed(7)}`
                : placeholder
              }
              className={`w-full px-4 py-2.5 pr-10 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 ${
                error ? 'border-red-300 dark:border-red-700' : 'border-gray-300'
              }`}
              placeholder={placeholder}
            />
            
            {location && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            )}
            
            {error && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
            )}
          </div>
          
          <button
            type="button"
            onClick={captureLocation}
            disabled={loading}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : location ? (
              <RefreshCw className="h-5 w-5" />
            ) : (
              <MapPin className="h-5 w-5" />
            )}
            <span className="hidden sm:inline">
              {loading ? 'Capturing...' : location ? 'Refresh' : 'Capture'}
            </span>
          </button>
          
          {location && (
            <button
              type="button"
              onClick={clearLocation}
              className="px-3 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              title="Clear location"
            >
              ✕
            </button>
          )}
        </div>
        
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}
        
        {location && accuracy && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            GPS Accuracy: ±{Math.round(accuracy)} meters
          </p>
        )}
        
        {location && !accuracy && (
          <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            GPS accuracy not available
          </p>
        )}
      </div>
    </div>
  );
}
