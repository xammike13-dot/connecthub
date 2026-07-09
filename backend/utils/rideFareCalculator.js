/**
 * Ride Fare Calculation Service
 * 
 * Centralized service for calculating bodaboda ride fares.
 * All fare calculations MUST use this service.
 * 
 * FARE RULES:
 * 
 * 1. MINIMUM FARE (CONSTANT):
 *    - If distance < 1 km, customer ALWAYS pays KSh 50
 *    - This minimum fare does NOT depend on the rider's configured km rate
 *    - Examples: 0.001 km -> 50, 0.1 km -> 50, 0.3 km -> 50, 0.7 km -> 50, 0.9 km -> 50, 0.999 km -> 50
 * 
 * 2. NORMAL FARE:
 *    - If distance >= 1 km: Base Fare = distance_in_km × rider_rate
 *    - Examples (at 60 KSh/km): 1 km -> 60, 2 km -> 120, 5.5 km -> 330, 10 km -> 600
 *    - Round to nearest whole Kenya Shilling
 * 
 * 3. PLATFORM FEE:
 *    - Platform Fee = 10% of Base Fare
 *    - Customer Share = Platform Fee / 2 (5% of Base Fare)
 *    - Rider Share = Platform Fee / 2 (5% of Base Fare)
 * 
 * 4. FINAL PAYMENT:
 *    - Customer Pays = Base Fare + Customer Share
 *    - Rider Receives = Base Fare - Rider Share
 *    - Platform Receives = Platform Fee
 * 
 * CONSTANTS:
 */

/**
 * Minimum fare constant (KSh)
 * Applied when distance < 1 km
 */
export const MINIMUM_FARE = 50;

/**
 * Minimum distance threshold in meters (1 km)
 */
export const MINIMUM_DISTANCE_METERS = 1000;

/**
 * Platform fee percentage (10% of base fare)
 */
export const PLATFORM_FEE_PERCENTAGE = 0.10;

/**
 * Default day rate per km (KSh)
 * Used when rider rate is not specified
 */
export const DEFAULT_DAY_RATE = 60;

/**
 * Default night rate per km (KSh)
 * Used when rider rate is not specified
 */
export const DEFAULT_NIGHT_RATE = 80;

/**
 * Determine if current time is night rate
 * Night hours: 8:00 PM (20:00) to 4:59 AM (04:59)
 * Day hours: 5:00 AM (05:00) to 7:59 PM (19:59)
 * 
 * @param {Date} date - Date to check (defaults to now)
 * @returns {boolean} True if night rate applies
 */
export const isNightRate = (date = new Date()) => {
  const hour = date.getHours();
  // Night: 20:00 (8 PM) to 04:59 (4:59 AM)
  return hour >= 20 || hour < 5;
};

/**
 * Calculate complete fare breakdown including platform fees
 * 
 * @param {number} distanceInMeters - Distance in meters (from routing API)
 * @param {number} ratePerKm - Rider's rate per kilometer (KSh/km) - MUST be provided
 * @param {Object} options - Additional options
 * @param {Date} options.time - Time of ride (for day/night determination)
 * @returns {Object} Complete fare breakdown with all details
 * @throws {Error} If ratePerKm is not provided or invalid
 */
export const calculateFare = (distanceInMeters, ratePerKm, options = {}) => {
  // Validate inputs
  if (distanceInMeters === null || distanceInMeters === undefined || isNaN(distanceInMeters)) {
    throw new Error('Distance in meters is required and must be a valid number');
  }
  
  if (distanceInMeters < 0 || !isFinite(distanceInMeters)) {
    throw new Error('Distance must be a non-negative finite number');
  }

  // Validate that ratePerKm is provided and valid
  if (ratePerKm === null || ratePerKm === undefined || isNaN(ratePerKm)) {
    throw new Error('Rider has not configured day/night rates.');
  }

  if (ratePerKm <= 0) {
    throw new Error('Rider rate per km must be a positive number');
  }

  // Use the provided rider rate (already determined as day or night rate by caller)
  const effectiveRate = ratePerKm;

  // Convert distance to kilometers for calculation
  const distanceInKm = distanceInMeters / 1000;

  // Calculate Base Fare
  let baseFare;
  let appliedRule;

  if (distanceInMeters < MINIMUM_DISTANCE_METERS) {
    // Apply minimum fare
    baseFare = MINIMUM_FARE;
    appliedRule = 'minimum_fare';
  } else {
    // Calculate based on distance and rate
    baseFare = Math.round(distanceInKm * effectiveRate);
    appliedRule = 'distance_rate';
  }

  // Calculate Platform Fee (10% of Base Fare)
  const platformFee = Math.round(baseFare * PLATFORM_FEE_PERCENTAGE * 100) / 100;
  
  // Split platform fee equally between customer and rider
  const customerShare = Math.round((platformFee / 2) * 100) / 100;
  const riderShare = Math.round((platformFee / 2) * 100) / 100;

  // Calculate final amounts
  const customerPays = Math.round((baseFare + customerShare) * 100) / 100;
  const riderReceives = Math.round((baseFare - riderShare) * 100) / 100;

  // Debug logging - matches the exact format specified in requirements
  console.log('Fare Calculation', {
    distanceInKm: Math.round(distanceInKm * 100) / 100,
    isNight: isNightRate(options.time || new Date()),
    dayRate: options.dayRate !== undefined ? options.dayRate : null,
    nightRate: options.nightRate !== undefined ? options.nightRate : null,
    selectedRate: effectiveRate,
    baseFare,
    platformFee,
    customerPays,
    riderReceives,
  });

  return {
    // Input values
    distanceInMeters: Math.round(distanceInMeters),
    distanceInKm: Math.round(distanceInKm * 100) / 100,
    ratePerKm: effectiveRate,
    
    // Fare breakdown
    baseFare,
    distanceFare: appliedRule === 'distance_rate' ? baseFare : 0,
    minimumFareApplied: appliedRule === 'minimum_fare' ? MINIMUM_FARE : 0,
    
    // Platform fee breakdown
    platformFee,
    customerShare,
    riderShare,
    
    // Final amounts
    totalFare: customerPays,  // What customer pays (total)
    customerPays,             // Same as totalFare
    riderReceives,            // What rider receives after commission
    
    // Applied rule
    appliedRule,
    appliedRuleDescription: appliedRule === 'minimum_fare' 
      ? 'Minimum Fare' 
      : `${effectiveRate} KSh/km`,
    
    // Time info
    isNightRate: isNightRate(options.time || new Date()),
  };
};

/**
 * Calculate fare with default rate (when rider rate is unknown)
 * This is used for estimate purposes only, not for actual ride creation.
 * 
 * @param {number} distanceInMeters - Distance in meters
 * @param {Object} options - Options (time)
 * @returns {Object} Fare breakdown
 */
export const calculateFareWithDefaultRate = (distanceInMeters, options = {}) => {
  const { time = new Date() } = options;
  
  // Use default rates based on time of day
  const rate = isNightRate(time) ? DEFAULT_NIGHT_RATE : DEFAULT_DAY_RATE;
  
  return calculateFare(distanceInMeters, rate, options);
};

/**
 * Calculate fare with specific rider's rate
 * 
 * @param {number} distanceInMeters - Distance in meters
 * @param {number} dayRate - Rider's day rate per km
 * @param {number} nightRate - Rider's night rate per km
 * @param {Object} options - Options (time)
 * @returns {Object} Fare breakdown
 */
export const calculateFareWithRiderRate = (distanceInMeters, dayRate, nightRate, options = {}) => {
  const { time = new Date() } = options;
  
  const rate = isNightRate(time) ? nightRate : dayRate;
  
  // Pass dayRate and nightRate in options for logging
  return calculateFare(distanceInMeters, rate, { ...options, dayRate, nightRate });
};

/**
 * Validate fare calculation inputs
 * 
 * @param {Object} fareData - Fare data to validate
 * @returns {Object} Validation result with isValid and errors
 */
export const validateFareCalculation = (fareData) => {
  const errors = [];

  if (!fareData || typeof fareData !== 'object') {
    errors.push('Fare data is required');
    return { isValid: false, errors };
  }

  const { distanceInMeters, ratePerKm, baseFare, platformFee, customerShare, riderShare, customerPays, riderReceives } = fareData;

  // Validate distance
  if (distanceInMeters === null || distanceInMeters === undefined || isNaN(distanceInMeters)) {
    errors.push('Distance in meters is required');
  } else if (distanceInMeters < 0) {
    errors.push('Distance cannot be negative');
  }

  // Validate rate
  if (ratePerKm !== null && ratePerKm !== undefined && (isNaN(ratePerKm) || ratePerKm < 0)) {
    errors.push('Rate per km must be a non-negative number');
  }

  // Validate base fare
  if (baseFare === null || baseFare === undefined || isNaN(baseFare)) {
    errors.push('Base fare is required');
  } else if (baseFare < MINIMUM_FARE) {
    errors.push(`Base fare cannot be less than minimum fare (KSh ${MINIMUM_FARE})`);
  }

  // Validate platform fee
  if (platformFee === null || platformFee === undefined || isNaN(platformFee)) {
    errors.push('Platform fee is required');
  }

  // Validate customer pays
  if (customerPays === null || customerPays === undefined || isNaN(customerPays)) {
    errors.push('Customer pays amount is required');
  }

  // Validate rider receives
  if (riderReceives === null || riderReceives === undefined || isNaN(riderReceives)) {
    errors.push('Rider receives amount is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export default {
  calculateFare,
  calculateFareWithDefaultRate,
  calculateFareWithRiderRate,
  validateFareCalculation,
  isNightRate,
  MINIMUM_FARE,
  MINIMUM_DISTANCE_METERS,
  PLATFORM_FEE_PERCENTAGE,
  DEFAULT_DAY_RATE,
  DEFAULT_NIGHT_RATE,
};