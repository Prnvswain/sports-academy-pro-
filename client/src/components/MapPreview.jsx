import { MapPin, Navigation, AlertTriangle } from 'lucide-react';

/**
 * MapPreview Component
 * Displays a simple visual representation of sport center vs current location
 * 
 * @param {object} props
 * @param {object} props.sportCenter - Sport center coordinates { latitude, longitude }
 * @param {object} props.currentLocation - Current GPS coordinates { latitude, longitude }
 * @param {number} props.distance - Distance in meters
 * @param {number} props.radius - Allowed radius in meters
 * @param {boolean} props.verified - Whether location is verified
 */
export default function MapPreview({
  sportCenter,
  currentLocation,
  distance,
  radius,
  verified = false
}) {
  if (!sportCenter || !currentLocation) {
    return (
      <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Location data not available</p>
        </div>
      </div>
    );
  }

  const isWithinRadius = distance <= radius;
  const distancePercentage = Math.min((distance / radius) * 100, 100);

  return (
    <div className="space-y-3">
      {/* Visual Map Representation */}
      <div className="relative w-full h-48 bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-800 dark:to-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
        {/* Sport Center (Center) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            {/* Radius Circle */}
            <div 
              className="rounded-full border-2 border-blue-400 dark:border-blue-500 opacity-30"
              style={{
                width: `${Math.min(radius * 2, 180)}px`,
                height: `${Math.min(radius * 2, 180)}px`
              }}
            />
            
            {/* Sport Center Pin */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="bg-blue-600 text-white p-2 rounded-full shadow-lg">
                <MapPin className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300 mt-1 bg-white dark:bg-gray-800 px-2 py-0.5 rounded shadow">
                Sport Center
              </span>
            </div>
          </div>
        </div>

        {/* Current Location Pin */}
        <div 
          className="absolute flex flex-col items-center transition-all duration-500"
          style={{
            top: `${50 - (Math.random() * 30 - 15)}%`,
            left: `${50 + (isWithinRadius ? 20 : 40)}%`
          }}
        >
          <div className={`p-2 rounded-full shadow-lg ${
            verified 
              ? 'bg-green-600 text-white' 
              : isWithinRadius 
                ? 'bg-yellow-500 text-white'
                : 'bg-red-600 text-white'
          }`}>
            <Navigation className="h-4 w-4" />
          </div>
          <span className={`text-xs font-medium mt-1 px-2 py-0.5 rounded shadow ${
            verified 
              ? 'text-green-700 bg-white dark:text-green-300 dark:bg-gray-800'
              : isWithinRadius
                ? 'text-yellow-700 bg-white dark:text-yellow-300 dark:bg-gray-800'
                : 'text-red-700 bg-white dark:text-red-300 dark:bg-gray-800'
          }`}>
            You
          </span>
        </div>

        {/* Status Indicator */}
        <div className="absolute top-2 right-2">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            verified
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : isWithinRadius
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            {verified ? '✓ Verified' : isWithinRadius ? 'Within Range' : 'Outside Range'}
          </div>
        </div>
      </div>

      {/* Distance Information */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-2 mb-1">
            <Navigation className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Distance</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {distance}m
          </p>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Allowed Radius</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {radius}m
          </p>
        </div>
      </div>

      {/* Distance Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>Distance from center</span>
          <span>{distancePercentage.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              verified
                ? 'bg-green-500'
                : isWithinRadius
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
            style={{ width: `${distancePercentage}%` }}
          />
        </div>
      </div>

      {/* Warning if outside radius */}
      {!isWithinRadius && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              Outside Attendance Zone
            </p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-1">
              You are {distance - radius}m beyond the allowed attendance radius.
            </p>
          </div>
        </div>
      )}

      {/* Success if verified */}
      {verified && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="bg-green-600 text-white p-1 rounded-full">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-green-800 dark:text-green-300">
            Location Verified - You can mark attendance
          </p>
        </div>
      )}
    </div>
  );
}
