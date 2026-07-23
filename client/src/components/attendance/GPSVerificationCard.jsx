import GPSCapture from '../GPSCapture';
import MapPreview from '../MapPreview';
import { MapPin, AlertTriangle, CheckCircle, Lock } from 'lucide-react';

export default function GPSVerificationCard({
  onLocationCapture,
  gpsCoords,
  gpsVerified,
  gpsError,
  distanceFromCenter,
  sportCenter,
  attendanceRadius,
  sportName,
  required = true,
  disabled = false
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Location Verification</h3>
        {required && (
          <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold rounded-full">
            Required
          </span>
        )}
      </div>

      {!sportCenter && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400 mb-4">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">
            Sport center location not configured. Please contact admin to set up GPS verification.
          </p>
        </div>
      )}

      {attendanceRadius === null && sportCenter && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400 mb-4">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">
            Attendance radius not configured for {sportName || 'this sport'}. Please contact admin to configure sport settings.
          </p>
        </div>
      )}

      {attendanceRadius !== null && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400 mb-4">
          <MapPin className="w-5 h-5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Configured Sport: {sportName || 'Unknown'}</p>
            <p>Allowed Radius: {attendanceRadius}m</p>
          </div>
        </div>
      )}

      {disabled && (
        <div className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 dark:bg-gray-900/20 dark:border-gray-800 dark:text-gray-400 mb-4">
          <Lock className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">
            Location verification is locked. Complete coach attendance first.
          </p>
        </div>
      )}

      <GPSCapture
        onLocationCapture={onLocationCapture}
        initialLocation={gpsCoords?.latitude && gpsCoords?.longitude ? {
          latitude: gpsCoords.latitude,
          longitude: gpsCoords.longitude
        } : null}
        required={required}
        label="Current Location"
        placeholder="Capture your current GPS location"
        disabled={disabled}
      />

      {gpsError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 mt-4">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{gpsError}</p>
        </div>
      )}

      {gpsVerified && sportCenter && distanceFromCenter !== null && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 mt-4">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">
            <span className="font-medium">Location verified:</span> You are {Math.round(distanceFromCenter)}m from the sport center (within {attendanceRadius}m radius).
          </p>
        </div>
      )}

      {gpsCoords?.latitude && gpsCoords?.longitude && sportCenter && (
        <div className="mt-4">
          <MapPreview
            sportCenter={sportCenter}
            currentLocation={{
              latitude: gpsCoords.latitude,
              longitude: gpsCoords.longitude
            }}
            distance={distanceFromCenter || 0}
            radius={attendanceRadius}
            verified={gpsVerified}
          />
        </div>
      )}
    </div>
  );
}
