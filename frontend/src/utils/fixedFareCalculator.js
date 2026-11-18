/**
 * OLAFasta Client-Side Fixed Fare Utility
 * Mirrors backend/utils/rideFareCalculator.js for instant UI previews
 */

export const PICKUP_OPTIONS = [
  { id: 'Stage', label: 'Stage', description: 'Main stage & campus entrance hub', icon: 'MapPin' },
  { id: 'Mabs', label: 'Mabs', description: 'Mabs hostels & shopping area', icon: 'Building' },
  { id: 'Cheba', label: 'Cheba', description: 'Chebaiywa / Cheba hostel zone', icon: 'Home' },
  { id: 'Kesses', label: 'Kesses', description: 'Kesses center & market corridor', icon: 'Navigation' },
];

export const DESTINATION_OPTIONS = [
  { id: 'Around Stage', label: 'Around Stage', area: 'Stage', description: 'Dropoff around campus main stage' },
  { id: 'Around Mabs', label: 'Around Mabs', area: 'Mabs', description: 'Dropoff around Mabs & environs' },
  { id: 'Around Cheba', label: 'Around Cheba', area: 'Cheba', description: 'Dropoff around Chebaiywa zone' },
  { id: 'Around Kesses', label: 'Around Kesses', area: 'Kesses', description: 'Dropoff around Kesses center' },
];

export const normalizeArea = (location) => {
  if (!location) return null;
  const raw = typeof location === 'string' ? location : (location.address || location.name || '');
  const cleaned = raw.toLowerCase().trim();
  if (cleaned.includes('stage')) return 'Stage';
  if (cleaned.includes('mab')) return 'Mabs';
  if (cleaned.includes('cheba') || cleaned.includes('chebaiywa')) return 'Cheba';
  if (cleaned.includes('kesses')) return 'Kesses';
  return null;
};

const BASE_FARE_TABLE = {
  'Stage<->Stage': 40,
  'Mabs<->Mabs': 40,
  'Cheba<->Cheba': 40,
  'Kesses<->Kesses': 40,
  'Mabs<->Stage': 50,
  'Cheba<->Stage': 60,
  'Kesses<->Stage': 80,
  'Cheba<->Kesses': 30,
};

export const isNightInNairobi = (date = new Date()) => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Nairobi',
      hour: 'numeric',
      hourCycle: 'h23',
    });
    const hour = parseInt(formatter.format(date), 10);
    return hour >= 20 || hour < 5;
  } catch (err) {
    const utcHour = date.getUTCHours();
    const nairobiHour = (utcHour + 3) % 24;
    return nairobiHour >= 20 || nairobiHour < 5;
  }
};

export const getRouteFixedFare = (pickup, destination, options = {}) => {
  const normPickup = normalizeArea(pickup);
  const normDestination = normalizeArea(destination);

  if (!normPickup || !normDestination) return null;

  const key = [normPickup, normDestination].sort().join('<->');
  const baseFare = BASE_FARE_TABLE[key];
  if (baseFare === undefined) return null;

  const isNight = typeof options.isNight === 'boolean'
    ? options.isNight
    : (options.time ? isNightInNairobi(options.time) : isNightInNairobi());

  const nightSurcharge = isNight ? 20 : 0;
  const totalFare = baseFare + nightSurcharge;

  return {
    pickup: normPickup,
    destination: `Around ${normDestination}`,
    fareType: isNight ? 'night' : 'day',
    baseFare,
    nightSurcharge,
    totalFare,
    currency: 'KES',
    isFixedFare: true,
  };
};

export const isDestinationValidForPickup = (pickup, destination) => {
  const normPickup = normalizeArea(pickup);
  const normDestination = normalizeArea(destination);
  if (!normPickup || !normDestination) return false;
  const key = [normPickup, normDestination].sort().join('<->');
  return Object.prototype.hasOwnProperty.call(BASE_FARE_TABLE, key);
};
