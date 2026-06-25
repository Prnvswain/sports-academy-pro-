/**
 * GPS Utility Service
 * Provides distance calculation and GPS verification functions using Haversine formula
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Distance in meters
  return distance;
}

/**
 * Verify if a location is within allowed radius
 * @param {number} currentLat - Current latitude
 * @param {number} currentLon - Current longitude
 * @param {number} targetLat - Target location latitude
 * @param {number} targetLon - Target location longitude
 * @param {number} radiusMeters - Allowed radius in meters
 * @returns {object} Verification result with distance and status
 */
function verifyLocation(currentLat, currentLon, targetLat, targetLon, radiusMeters) {
  if (!currentLat || !currentLon || !targetLat || !targetLon) {
    return {
      valid: false,
      distance: null,
      error: 'Missing coordinates'
    };
  }

  const distance = calculateDistance(
    parseFloat(currentLat),
    parseFloat(currentLon),
    parseFloat(targetLat),
    parseFloat(targetLon)
  );

  return {
    valid: distance <= radiusMeters,
    distance: Math.round(distance),
    radius: radiusMeters
  };
}

/**
 * Get attendance location for a batch/sport
 * Returns either custom sport location or academy location
 * @param {object} sport - Sport object with GPS data
 * @param {object} academy - Academy object with GPS data
 * @returns {object} Location coordinates
 */
function getAttendanceLocation(sport, academy) {
  if (sport?.use_custom_location && sport?.latitude && sport?.longitude) {
    return {
      latitude: sport.latitude,
      longitude: sport.longitude,
      source: 'sport'
    };
  }

  if (academy?.latitude && academy?.longitude) {
    return {
      latitude: academy.latitude,
      longitude: academy.longitude,
      source: 'academy'
    };
  }

  return null;
}

/**
 * Validate GPS coordinates format
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {boolean} Valid or not
 */
function validateCoordinates(lat, lon) {
  if (lat === null || lon === null || lat === undefined || lon === undefined) {
    return false;
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export {
  calculateDistance,
  verifyLocation,
  getAttendanceLocation,
  validateCoordinates
};