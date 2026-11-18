/**
 * Centralized Fixed Fare Calculator for OLAFasta Boda Boda Rides
 *
 * Implements the official fixed-location fare system for campus & local areas:
 * - Approved Pickup Locations: Stage, Mabs, Cheba, Kesses (or "Around Stage", etc.)
 * - Approved Destination Areas: Around Stage, Around Mabs, Around Cheba, Around Kesses
 *
 * FARE MATRIX (Daytime):
 * - Stage ↔️ Around Stage:  KSh 40
 * - Stage ↔️ Around Mabs:   KSh 50
 * - Stage ↔️ Around Cheba:  KSh 60
 * - Stage ↔️ Around Kesses: KSh 80
 * - Mabs ↔️ Around Mabs:    KSh 40
 * - Cheba ↔️ Around Cheba:  KSh 40
 * - Kesses ↔️ Around Kesses: KSh 40
 * - Kesses ↔️ Around Cheba:  KSh 30
 *
 * NIGHT SURCHARGE:
 * - Applies from 8:00 PM to 4:59 AM (Africa/Nairobi timezone)
 * - Exactly +KSh 20 on all applicable fares (including reverse routes)
 */

export const APPROVED_PICKUPS = ['Stage', 'Mabs', 'Cheba', 'Kesses'];

export const APPROVED_DESTINATIONS = [
  'Around Stage',
  'Around Mabs',
  'Around Cheba',
  'Around Kesses',
];

export const NIGHT_SURCHARGE = 20;

/**
 * Normalizes an area name to one of the 4 canonical area keys:
 * 'Stage' | 'Mabs' | 'Cheba' | 'Kesses'
 *
 * @param {string|object} location - Location string or object with address/name
 * @returns {string|null} Canonical area or null if unsupported
 */
export const normalizeArea = (location) => {
  if (!location) return null;

  let raw = '';
  if (typeof location === 'string') {
    raw = location;
  } else if (typeof location === 'object') {
    raw = location.address || location.name || location.pickup || location.destination || '';
  }

  const cleaned = raw.toLowerCase().trim();
  if (!cleaned) return null;

  // Check matching patterns
  if (cleaned.includes('stage')) return 'Stage';
  if (cleaned.includes('mab')) return 'Mabs';
  if (cleaned.includes('cheba') || cleaned.includes('chebaiywa')) return 'Cheba';
  if (cleaned.includes('kesses')) return 'Kesses';

  return null;
};

/**
 * Format standard pickup display label
 */
export const formatPickupLabel = (area) => {
  const canonical = normalizeArea(area);
  return canonical || area;
};

/**
 * Format standard destination display label
 */
export const formatDestinationLabel = (area) => {
  const canonical = normalizeArea(area);
  if (!canonical) return area;
  return `Around ${canonical}`;
};

/**
 * Creates an unordered canonical key for bidirectional route matching
 */
const getRouteKey = (areaA, areaB) => {
  const canonicalA = normalizeArea(areaA);
  const canonicalB = normalizeArea(areaB);
  if (!canonicalA || !canonicalB) return null;

  return [canonicalA, canonicalB].sort().join('<->');
};

/**
 * Base daytime fare table keyed by canonical route pairs
 */
const BASE_FARE_TABLE = {
  // Same area routes (KSh 40)
  'Stage<->Stage': 40,
  'Mabs<->Mabs': 40,
  'Cheba<->Cheba': 40,
  'Kesses<->Kesses': 40,

  // Cross-corridor routes
  'Mabs<->Stage': 50,
  'Cheba<->Stage': 60,
  'Kesses<->Stage': 80,
  'Cheba<->Kesses': 30,
};

/**
 * Check whether a route is defined in the official fare matrix
 *
 * @param {string|object} pickup - Pickup location
 * @param {string|object} destination - Destination area
 * @returns {boolean} True if route combination is supported
 */
export const isRouteSupported = (pickup, destination) => {
  const routeKey = getRouteKey(pickup, destination);
  if (!routeKey) return false;
  return Object.prototype.hasOwnProperty.call(BASE_FARE_TABLE, routeKey);
};

/**
 * Determine if night rate applies based on Kenyan local time (Africa/Nairobi)
 * Night: 8:00 PM (20:00) to 4:59 AM (04:59)
 * Day: 5:00 AM (05:00) to 7:59 PM (19:59)
 *
 * @param {Date} date - Optional date instance (defaults to now)
 * @returns {boolean}
 */
export const isNightRateInNairobi = (date = new Date()) => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Nairobi',
      hour: 'numeric',
      hourCycle: 'h23',
    });
    const hour = parseInt(formatter.format(date), 10);
    return hour >= 20 || hour < 5;
  } catch (err) {
    // Fallback: Africa/Nairobi is UTC+3 with no daylight saving
    const utcHour = date.getUTCHours();
    const nairobiHour = (utcHour + 3) % 24;
    return nairobiHour >= 20 || nairobiHour < 5;
  }
};

/**
 * Legacy compatibility alias
 */
export const isNightRate = isNightRateInNairobi;

/**
 * Calculate fixed fare for a boda boda ride
 *
 * @param {string|object} pickup - Pickup location ('Stage', 'Mabs', etc.)
 * @param {string|object} destination - Destination area ('Around Cheba', etc.)
 * @param {Object} options - Optional parameters: { time: Date, isNight: boolean }
 * @returns {Object} Structured fare breakdown
 * @throws {Error} If pickup/destination is invalid or route combination is unsupported
 */
export const calculateFixedFare = (pickup, destination, options = {}) => {
  const normPickup = normalizeArea(pickup);
  const normDestination = normalizeArea(destination);

  if (!normPickup) {
    throw new Error(
      `Invalid pickup location "${typeof pickup === 'object' ? JSON.stringify(pickup) : pickup}". Approved pickups: ${APPROVED_PICKUPS.join(', ')}`
    );
  }

  if (!normDestination) {
    throw new Error(
      `Invalid destination area "${typeof destination === 'object' ? JSON.stringify(destination) : destination}". Approved destinations: ${APPROVED_DESTINATIONS.join(', ')}`
    );
  }

  const routeKey = getRouteKey(normPickup, normDestination);
  const baseFare = BASE_FARE_TABLE[routeKey];

  if (baseFare === undefined) {
    throw new Error(
      `Route between ${formatPickupLabel(normPickup)} and ${formatDestinationLabel(normDestination)} is not supported.`
    );
  }

  // Determine if night rate applies
  let isNight = false;
  if (typeof options.isNight === 'boolean') {
    isNight = options.isNight;
  } else if (options.time instanceof Date) {
    isNight = isNightRateInNairobi(options.time);
  } else {
    isNight = isNightRateInNairobi();
  }

  const fareType = isNight ? 'night' : 'day';
  const nightSurcharge = isNight ? NIGHT_SURCHARGE : 0;
  const totalFare = baseFare + nightSurcharge;

  const displayPickup = formatPickupLabel(normPickup);
  const displayDestination = formatDestinationLabel(normDestination);

  return {
    pickup: displayPickup,
    destination: displayDestination,
    fareType,
    baseFare,
    nightSurcharge,
    totalFare,
    currency: 'KES',
    isFixedFare: true,

    // Platform fee & escrow compatibility fields
    platformFee: 0,
    customerShare: 0,
    riderShare: 0,
    customerPays: totalFare,
    riderReceives: totalFare,
    appliedRule: isNight ? 'fixed_fare_night' : 'fixed_fare_day',
    appliedRuleDescription: `Fixed ${fareType} fare`,
  };
};

/**
 * Universal calculation adapter supporting both new fixed fare arguments
 * and legacy arguments (where distance/rate were passed).
 */
export const calculateFare = (firstArg, secondArg, options = {}) => {
  // If firstArg and secondArg look like pickup & destination (strings or location objects)
  const isFixedStyle =
    (typeof firstArg === 'string' && isNaN(Number(firstArg))) ||
    (typeof firstArg === 'object' && firstArg !== null && !Array.isArray(firstArg) && (firstArg.address || firstArg.name)) ||
    (typeof secondArg === 'string' && isNaN(Number(secondArg))) ||
    (typeof secondArg === 'object' && secondArg !== null && !Array.isArray(secondArg) && (secondArg.address || secondArg.name));

  if (isFixedStyle) {
    return calculateFixedFare(firstArg, secondArg, options);
  }

  // Legacy fallback if distance in meters is passed
  // (Provides graceful fallback if historical distance calculations are triggered)
  const distanceInMeters = Number(firstArg) || 0;
  const ratePerKm = Number(secondArg) || 50;
  const distanceInKm = distanceInMeters / 1000;
  const isNight = options.time ? isNightRateInNairobi(options.time) : isNightRateInNairobi();
  const baseFare = Math.max(30, Math.round(distanceInKm * ratePerKm) || 40);
  const nightSurcharge = isNight ? 20 : 0;
  const totalFare = baseFare + nightSurcharge;

  return {
    pickup: options.pickup || 'Pickup',
    destination: options.destination || 'Destination',
    fareType: isNight ? 'night' : 'day',
    baseFare,
    nightSurcharge,
    totalFare,
    currency: 'KES',
    isFixedFare: false,
    distanceInMeters,
    distanceInKm: Math.round(distanceInKm * 10) / 10,
    platformFee: 0,
    customerShare: 0,
    riderShare: 0,
    customerPays: totalFare,
    riderReceives: totalFare,
    appliedRule: 'legacy_distance',
  };
};

/**
 * Legacy compatibility functions
 */
export const calculateFareWithRiderRate = (pickupOrDistance, destinationOrDayRate, nightRateOrOptions, options = {}) => {
  if (
    typeof pickupOrDistance === 'string' ||
    (typeof pickupOrDistance === 'object' && pickupOrDistance !== null && (pickupOrDistance.address || pickupOrDistance.name))
  ) {
    const opts = typeof nightRateOrOptions === 'object' ? nightRateOrOptions : options;
    return calculateFixedFare(pickupOrDistance, destinationOrDayRate, opts);
  }

  const opts = typeof nightRateOrOptions === 'object' ? nightRateOrOptions : options;
  const rate = isNightRateInNairobi() ? (Number(nightRateOrOptions) || 50) : (Number(destinationOrDayRate) || 40);
  return calculateFare(pickupOrDistance, rate, opts);
};

export const calculateFareWithDefaultRate = (pickup, destination, options = {}) => {
  return calculateFare(pickup, destination, options);
};

export const validateFareCalculation = (fareData) => {
  if (!fareData || typeof fareData !== 'object') {
    return { isValid: false, errors: ['Fare data is required'] };
  }
  const errors = [];
  if (!fareData.pickup) errors.push('Pickup location is required');
  if (!fareData.destination) errors.push('Destination area is required');
  if (!fareData.totalFare || fareData.totalFare <= 0) errors.push('Valid total fare is required');
  return {
    isValid: errors.length === 0,
    errors,
  };
};

export default {
  APPROVED_PICKUPS,
  APPROVED_DESTINATIONS,
  NIGHT_SURCHARGE,
  normalizeArea,
  formatPickupLabel,
  formatDestinationLabel,
  isRouteSupported,
  isNightRateInNairobi,
  isNightRate,
  calculateFixedFare,
  calculateFare,
  calculateFareWithRiderRate,
  calculateFareWithDefaultRate,
  validateFareCalculation,
};
