/**
 * Frontend Distance Formatting Service
 * 
 * This is a frontend mirror of the backend distance formatter.
 * It should ONLY be used for display purposes.
 * The backend is the single source of truth for all calculations.
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
 * Format fare for display
 * @param {number} amount - Amount in KSh
 * @returns {string} Formatted currency string
 */
export const formatFare = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'N/A';
  }
  
  if (!isFinite(amount) || amount < 0) {
    return 'N/A';
  }
  
  return `KSh ${Math.round(amount).toLocaleString('en-KE')}`;
};

export default {
  formatDistance,
  distanceToKm,
  formatFare,
};