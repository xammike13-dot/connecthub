/**
 * Centralized Payment Calculation Service
 * 
 * All payment calculations across the platform MUST use this service.
 * 
 * BUSINESS RULES:
 * - No platform commission charged to customers
 * - Customer pays: basePrice + deliveryFee (no added fees)
 * - Provider receives: basePrice + deliveryFee (full amount)
 * - Delivery fee belongs entirely to the business
 * - NO VAT, NO taxes, NO hidden fees
 */

/**
 * Calculate payment breakdown for a transaction
 * 
 * @param {number} basePrice - The base price of the product/service (before any fees)
 * @param {number} deliveryFee - Delivery fee (default: 0, only applies to shopping)
 * @returns {object} Payment breakdown with all amounts
 */
export const calculatePayment = (basePrice, deliveryFee = 0) => {
  // Validate inputs
  if (basePrice < 0) throw new Error('Base price cannot be negative');
  if (deliveryFee < 0) throw new Error('Delivery fee cannot be negative');

  // No platform commission — fee is 0
  const platformFee = 0;
  
  // No commission shares
  const customerShare = 0;
  const providerShare = 0;

  // Customer pays: base price + delivery fee (no commission)
  const customerPays = basePrice + deliveryFee;

  // Provider receives: full base price + delivery fee (no deduction)
  const providerReceives = basePrice + deliveryFee;

  // Platform receives: 0 (no commission)
  const platformReceives = 0;

  return {
    // Input values
    basePrice: Math.round(basePrice),
    deliveryFee: Math.round(deliveryFee),
    
    // Platform fee breakdown
    platformFee,
    customerShare,
    providerShare,
    
    // Final amounts
    customerPays,     // What customer pays total
    providerReceives,
    platformReceives, // What platform earns
    
    // Total transaction value
    totalTransaction: customerPays,
  };
};

/**
 * Calculate payment for shopping/order
 * @param {number} productTotal - Total price of products
 * @param {number} deliveryFee - Delivery fee
 */
export const calculateShoppingPayment = (productTotal, deliveryFee = 0) => {
  return calculatePayment(productTotal, deliveryFee);
};

/**
 * Calculate payment for rental
 * @param {number} monthlyRent - Monthly rent amount
 * @param {number} months - Number of months (default: 1)
 */
export const calculateRentalPayment = (monthlyRent, months = 1) => {
  const totalRent = monthlyRent * months;
  return calculatePayment(totalRent, 0); // No delivery fee for rentals
};

/**
 * Calculate payment for bodaboda ride
 * @param {number} fare - Ride fare
 */
export const calculateRidePayment = (fare) => {
  return calculatePayment(fare, 0); // No delivery fee for rides
};

/**
 * Legacy compatibility function (deprecated - use calculatePayment instead)
 * @deprecated Use calculatePayment instead
 */
export const calculateCommission = (amount) => {
  // This is the OLD incorrect implementation for reference
  // const totalCommission = amount * 0.10;
  // const customerShare = totalCommission / 2;
  // const providerShare = totalCommission / 2;
  // return {
  //   totalCommission,
  //   customerShare,
  //   providerShare,
  //   providerReceives: amount - providerShare,
  // };
  
  // For backward compatibility, treat amount as base price with no delivery
  return calculatePayment(amount, 0);
};

export default {
  calculatePayment,
  calculateShoppingPayment,
  calculateRentalPayment,
  calculateRidePayment,
  calculateCommission,
};