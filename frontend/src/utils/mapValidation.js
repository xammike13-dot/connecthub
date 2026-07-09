/**
 * Map Coordinate Validation Utilities
 * 
 * These utilities ensure all coordinates passed to Leaflet are valid
 * to prevent "Invalid LatLng object: (NaN, NaN)" errors.
 */

/**
 * Check if a coordinate value is valid (finite number)
 * @param {*} value - The coordinate value to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidCoordinate = (value) => {
  return typeof value === 'number' && Number.isFinite(value);
};

/**
 * Check if a lat/lng pair is valid
 * @param {*} lat - Latitude value
 * @param {*} lng - Longitude value
 * @returns {boolean} - True if both are valid
 */
export const isValidLatLng = (lat, lng) => {
  return isValidCoordinate(lat) && isValidCoordinate(lng);
};

/**
 * Check if a coordinate object has valid lat/lng
 * @param {Object} coord - Object with lat and lng properties
 * @returns {boolean} - True if valid
 */
export const isValidCoordObject = (coord) => {
  if (!coord || typeof coord !== 'object') return false;
  return isValidLatLng(coord.lat, coord.lng);
};

/**
 * Validate and sanitize a coordinate value
 * Returns the value if valid, or a fallback if invalid
 * @param {*} value - The coordinate value
 * @param {*} fallback - Fallback value if invalid
 * @returns {*} - Valid coordinate or fallback
 */
export const sanitizeCoordinate = (value, fallback = null) => {
  return isValidCoordinate(value) ? value : fallback;
};

/**
 * Validate a location object and return sanitized version
 * @param {Object} location - Location object with lat/lng
 * @param {Array} fallback - Fallback coordinates [lat, lng]
 * @returns {Object|null} - Sanitized location or null if invalid
 */
export const sanitizeLocation = (location, fallback = null) => {
  if (!location) return fallback;
  
  const lat = sanitizeCoordinate(location.lat);
  const lng = sanitizeCoordinate(location.lng);
  
  if (lat === null || lng === null) {
    return fallback;
  }
  
  return {
    ...location,
    lat,
    lng,
  };
};

/**
 * Validate an array of coordinates (for polylines)
 * @param {Array} coordinates - Array of [lat, lng] pairs
 * @returns {Array} - Filtered array with only valid coordinates
 */
export const validateRouteCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates)) return [];
  
  return coordinates.filter(coord => {
    if (!Array.isArray(coord) || coord.length < 2) return false;
    return isValidLatLng(coord[0], coord[1]);
  });
};

/**
 * Validate markers array and filter out invalid ones
 * @param {Array} markers - Array of marker objects with lat/lng
 * @returns {Array} - Filtered array with only valid markers
 */
export const validateMarkers = (markers) => {
  if (!Array.isArray(markers)) return [];
  
  return markers.filter(marker => {
    // Check for lat/lng directly on marker
    if (isValidLatLng(marker.lat, marker.lng)) {
      return true;
    }
    // Check for nested location object
    if (marker.location && isValidLatLng(marker.location.lat, marker.location.lng)) {
      return true;
    }
    return false;
  });
};

/**
 * Get valid center coordinates for map
 * @param {Array} center - [lat, lng] array
 * @param {Array} fallback - Fallback coordinates
 * @returns {Array} - Valid center coordinates
 */
export const getValidCenter = (center, fallback = [-1.2921, 36.8219]) => {
  if (Array.isArray(center) && center.length >= 2) {
    if (isValidLatLng(center[0], center[1])) {
      return [center[0], center[1]];
    }
  }
  return fallback;
};

/**
 * Parse coordinate from various formats (string, number, etc.)
 * @param {*} value - Value to parse
 * @returns {number|null} - Parsed number or null if invalid
 */
export const parseCoordinate = (value) => {
  if (value === undefined || value === null) return null;
  
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  
  if (typeof parsed === 'number' && Number.isFinite(parsed)) {
    return parsed;
  }
  
  return null;
};

/**
 * Debug function to log coordinate issues
 * @param {string} label - Label for debugging
 * @param {*} coord - Coordinate to check
 */
export const debugCoordinate = (label, coord) => {
  if (process.env.NODE_ENV === 'development') {
    if (coord === null || coord === undefined) {
      console.warn(`[MapValidation] ${label}: ${label} is ${coord}`);
    } else if (typeof coord === 'object' && coord !== null) {
      if (!isValidCoordObject(coord)) {
        console.warn(`[MapValidation] ${label}: Invalid coordinates`, coord);
      }
    } else if (Array.isArray(coord)) {
      if (coord.length >= 2 && !isValidLatLng(coord[0], coord[1])) {
        console.warn(`[MapValidation] ${label}: Invalid array coordinates`, coord);
      }
    } else if (!Number.isFinite(coord)) {
      console.warn(`[MapValidation] ${label}: Invalid number ${coord}`);
    }
  }
};