/**
 * Centralized Payment Calculation Service
 * 
 * All payment calculations across the platform MUST use this service.
 * 
 * BUSINESS RULES:
 * - Platform Fee = 10% of BASE PRICE (product/room/ride fare only)
 * - Platform Fee is shared equally: Customer pays 5%, Provider pays 5%
 * - Provider's 5% share is deducted ONLY from BASE PRICE
 * - Delivery fee is NEVER deducted - it belongs entirely to the business
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

  // Platform fee is 10% of BASE PRICE ONLY (not including delivery)
  const platformFee = Math.round(basePrice * 0.10);
  
  // Platform fee is shared equally (5% each)
  const customerShare = Math.round(platformFee / 2); // 5% of base price
  const providerShare = Math.round(platformFee / 2); // 5% of base price

  // Customer pays: base price + their share of platform fee + delivery fee
  const customerPays = basePrice + customerShare + deliveryFee;

  // Provider receives: base price - their share of platform fee + full delivery fee
  const providerReceives = basePrice - providerShare + deliveryFee;

  // Platform receives: total platform fee (10% of base price)
  const platformReceives = platformFee;

  return {
    // Input values
    basePrice: Math.round(basePrice),
    deliveryFee: Math.round(deliveryFee),
    
    // Platform fee breakdown
    platformFee,
    customerShare,    // 5% of base price (customer's portion)
    providerShare,    // 5% of base price (provider's portion)
    
    // Final amounts
    customerPays,     // What customer pays total
    providerReceives, // What provider receives after commission
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