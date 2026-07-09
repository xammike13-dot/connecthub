/**
 * Distance Formatting Service
 * 
 * Centralized service for formatting distances for display.
 * All distance display formatting MUST use this service.
 * 
 * FORMATTING RULES:
 * - Less than 10 m: "Less than 10 m"
 * - 10 m to 999 m: Display in meters (e.g., "25 m", "120 m", "650 m", "999 m")
 * - Exactly 1000 m: "1.0 km"
 * - Above 1000 m: Display in km with one decimal place (e.g., "1.2 km", "3.7 km", "15.4 km")
 * 
 * NEVER display: NaN, 0.00 km, undefined, Infinity, null
 */

/**
 * Format distance for display
 * @param {number} distanceInMeters - Distance in meters (must be a valid number)
 * @returns {string} Formatted distance string
 */
export const formatDistance = (distanceInMeters) => {
  // Handle invalid inputs
  if (distanceInMeters === null || distanceInMeters === undefined || isNaN(distanceInMeters)) {
    return 'N/A';
  }

  // Handle non-finite values
  if (!isFinite(distanceInMeters)) {
    return 'N/A';
  }

  // Handle negative distances
  if (distanceInMeters < 0) {
    return 'N/A';
  }

  // Less than 10 meters
  if (distanceInMeters < 10) {
    return 'Less than 10 m';
  }

  // 10 m to 999 m - display in meters
  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)} m`;
  }

  // 1000 m and above - display in km
  const distanceInKm = distanceInMeters / 1000;
  
  // Format to 1 decimal place
  const formatted = distanceInKm.toFixed(1);
  
  return `${formatted} km`;
};

/**
 * Format distance as raw km value for calculations
 * @param {number} distanceInMeters - Distance in meters
 * @returns {number} Distance in kilometers (rounded to 2 decimal places)
 */
export const distanceToKm = (distanceInMeters) => {
  if (distanceInMeters === null || distanceInMeters === undefined || isNaN(distanceInMeters)) {
    return 0;
  }
  if (!isFinite(distanceInMeters) || distanceInMeters < 0) {
    return 0;
  }
  return Math.round((distanceInMeters / 1000) * 100) / 100;
};

/**
 * Parse distance string back to meters (for validation)
 * @param {string} distanceString - Formatted distance string
 * @returns {number|null} Distance in meters, or null if invalid
 */
export const parseDistance = (distanceString) => {
  if (!distanceString || typeof distanceString !== 'string') {
    return null;
  }

  const str = distanceString.trim().toLowerCase();

  if (str === 'less than 10 m' || str === 'n/a') {
    return str === 'less than 10 m' ? 5 : null; // Return midpoint for "less than 10 m"
  }

  // Parse meters
  const metersMatch = str.match(/^(\d+)\s*m$/);
  if (metersMatch) {
    return parseInt(metersMatch[1], 10);
  }

  // Parse kilometers
  const kmMatch = str.match(/^(\d+(?:\.\d+)?)\s*km$/);
  if (kmMatch) {
    return Math.round(parseFloat(kmMatch[1]) * 1000);
  }

  return null;
};

export default {
  formatDistance,
  distanceToKm,
  parseDistance,
};