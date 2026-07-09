import Transaction from '../models/Transaction.js';
import Order from '../models/Order.js';
import Rental from '../models/Rental.js';
import RideRequest from '../models/RideRequest.js';
import { ResponseError } from './error.js';

/**
 * Middleware to verify that a customer has paid for an order/service
 * before they can communicate with the provider.
 * 
 * This prevents users from bypassing the platform and avoiding commission fees.
 */

/**
 * Check if customer has a paid transaction for the given entity
 */
export const hasPaidForEntity = async (customerId, entityType, entityId) => {
  // Check for completed/paid transactions
  const transaction = await Transaction.findOne({
    customer: customerId,
    relatedEntity: entityId,
    relatedEntityType: entityType,
    status: { $in: ['paid', 'completed'] },
  });

  return !!transaction;
};

/**
 * Middleware to protect communication with business owners
 * Customer must have paid for an order before they can chat/call
 */
export const protectBusinessCommunication = async (req, res, next) => {
  const customerId = req.user._id;
  const { orderId, businessId } = req.body;

  if (!orderId && !businessId) {
    return next(new ResponseError('Order ID or Business ID is required', 400));
  }

  // If we have an order ID, check payment for that specific order
  if (orderId) {
    const order = await Order.findById(orderId);
    if (!order) {
      return next(new ResponseError('Order not found', 404));
    }

    // Check if customer has paid for this order
    const hasPaid = await hasPaidForEntity(customerId, 'Order', orderId);
    if (!hasPaid) {
      return res.status(403).json({
        success: false,
        message: 'Payment required to unlock communication with this business',
        requiresPayment: true,
        action: 'complete_payment',
      });
    }

    // Verify the customer is the one who placed the order
    if (order.customer.toString() !== customerId) {
      return next(new ResponseError('Not authorized for this order', 403));
    }
  }

  // If we have a business ID, check if customer has any paid orders with that business
  if (businessId && !orderId) {
    const paidOrders = await Order.find({
      customer: customerId,
      business: businessId,
      paymentStatus: { $in: ['paid', 'completed'] },
    });

    if (paidOrders.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You must complete a purchase before contacting this business',
        requiresPayment: true,
        action: 'make_purchase',
      });
    }
  }

  req.communicationVerified = true;
  next();
};

/**
 * Middleware to protect communication with landlords
 * Customer must have a confirmed rental booking before they can chat/call
 */
export const protectLandlordCommunication = async (req, res, next) => {
  const customerId = req.user._id;
  const { rentalId, landlordId } = req.body;

  if (!rentalId && !landlordId) {
    return next(new ResponseError('Rental ID or Landlord ID is required', 400));
  }

  // If we have a rental ID, check payment for that specific rental
  if (rentalId) {
    const rental = await Rental.findById(rentalId);
    if (!rental) {
      return next(new ResponseError('Rental not found', 404));
    }

    // Check if customer has paid and booking is confirmed
    const hasPaid = await hasPaidForEntity(customerId, 'Rental', rentalId);
    if (!hasPaid) {
      return res.status(403).json({
        success: false,
        message: 'Booking confirmation required to unlock communication with this landlord',
        requiresPayment: true,
        action: 'confirm_booking',
      });
    }

    // Verify the customer is the one who made the booking
    if (rental.customer.toString() !== customerId) {
      return next(new ResponseError('Not authorized for this rental', 403));
    }
  }

  // If we have a landlord ID, check if customer has any confirmed bookings with that landlord
  if (landlordId && !rentalId) {
    const confirmedRentals = await Rental.find({
      customer: customerId,
      landlord: landlordId,
      status: { $in: ['confirmed', 'completed'] },
      paymentStatus: { $in: ['paid', 'completed'] },
    });

    if (confirmedRentals.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You must have a confirmed booking before contacting this landlord',
        requiresPayment: true,
        action: 'book_rental',
      });
    }
  }

  req.communicationVerified = true;
  next();
};

/**
 * Middleware to protect communication with riders
 * Customer must have an active/completed ride request before they can chat/call
 */
export const protectRiderCommunication = async (req, res, next) => {
  const customerId = req.user._id;
  const { rideId, riderId } = req.body;

  if (!rideId && !riderId) {
    return next(new ResponseError('Ride ID or Rider ID is required', 400));
  }

  // If we have a ride ID, check if customer has an active ride
  if (rideId) {
    const ride = await RideRequest.findById(rideId);
    if (!ride) {
      return next(new ResponseError('Ride not found', 404));
    }

    // Check if customer has a paid/active ride
    const hasPaid = await hasPaidForEntity(customerId, 'RideRequest', rideId);
    if (!hasPaid) {
      return res.status(403).json({
        success: false,
        message: 'You must book and pay for a ride before contacting the rider',
        requiresPayment: true,
        action: 'book_ride',
      });
    }

    // Verify the customer is the one who requested the ride
    if (ride.customer.toString() !== customerId) {
      return next(new ResponseError('Not authorized for this ride', 403));
    }
  }

  // If we have a rider ID, check if customer has any active rides with that rider
  if (riderId && !rideId) {
    const activeRides = await RideRequest.find({
      customer: customerId,
      rider: riderId,
      status: { $in: ['accepted', 'in_progress', 'completed'] },
      paymentStatus: { $in: ['paid', 'completed'] },
    });

    if (activeRides.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You must have an active or completed ride with this rider to contact them',
        requiresPayment: true,
        action: 'book_ride',
      });
    }
  }

  req.communicationVerified = true;
  next();
};

/**
 * Generic middleware to check communication access for any provider type
 */
export const checkCommunicationAccess = async (req, res, next) => {
  const customerId = req.user._id;
  const { providerId, entityType, entityId } = req.query || req.body;

  if (!providerId || !entityType) {
    return next(new ResponseError('Provider ID and entity type are required', 400));
  }

  let hasAccess = false;

  switch (entityType) {
    case 'business':
      if (entityId) {
        hasAccess = await hasPaidForEntity(customerId, 'Order', entityId);
      } else {
        const paidOrders = await Order.countDocuments({
          customer: customerId,
          business: providerId,
          paymentStatus: { $in: ['paid', 'completed'] },
        });
        hasAccess = paidOrders > 0;
      }
      break;

    case 'landlord':
      if (entityId) {
        hasAccess = await hasPaidForEntity(customerId, 'Rental', entityId);
      } else {
        const confirmedRentals = await Rental.countDocuments({
          customer: customerId,
          landlord: providerId,
          status: { $in: ['confirmed', 'completed'] },
          paymentStatus: { $in: ['paid', 'completed'] },
        });
        hasAccess = confirmedRentals > 0;
      }
      break;

    case 'rider':
      if (entityId) {
        hasAccess = await hasPaidForEntity(customerId, 'RideRequest', entityId);
      } else {
        const activeRides = await RideRequest.countDocuments({
          customer: customerId,
          rider: providerId,
          status: { $in: ['accepted', 'in_progress', 'completed'] },
          paymentStatus: { $in: ['paid', 'completed'] },
        });
        hasAccess = activeRides > 0;
      }
      break;

    default:
      return next(new ResponseError('Invalid entity type', 400));
  }

  if (!hasAccess) {
    return res.status(403).json({
      success: false,
      message: 'Communication access denied. Complete a payment to unlock contact.',
      requiresPayment: true,
      accessGranted: false,
    });
  }

  req.communicationVerified = true;
  req.accessGranted = true;
  next();
};

/**
 * Middleware to hide sensitive provider information until payment
 */
export const filterProviderContactInfo = (entityType) => (req, res, next) => {
  const originalSend = res.send.bind(res);
  const customerId = req.user?._id;

  res.send = async function (body) {
    try {
      const parsed = JSON.parse(body);

      // If this is a provider detail response and customer hasn't paid
      if (parsed.data && (parsed.data.role === 'business' || parsed.data.role === 'landlord' || parsed.data.role === 'rider')) {
        // Check if customer has paid for any service with this provider
        let hasPaid = false;

        if (entityType === 'business' && parsed.data._id) {
          hasPaid = await Order.exists({
            customer: customerId,
            business: parsed.data._id,
            paymentStatus: { $in: ['paid', 'completed'] },
          });
        } else if (entityType === 'landlord' && parsed.data._id) {
          hasPaid = await Rental.exists({
            customer: customerId,
            landlord: parsed.data._id,
            status: { $in: ['confirmed', 'completed'] },
            paymentStatus: { $in: ['paid', 'completed'] },
          });
        } else if (entityType === 'rider' && parsed.data._id) {
          hasPaid = await RideRequest.exists({
            customer: customerId,
            rider: parsed.data._id,
            status: { $in: ['accepted', 'in_progress', 'completed'] },
            paymentStatus: { $in: ['paid', 'completed'] },
          });
        }

        // Hide contact info if no payment
        if (!hasPaid) {
          if (parsed.data.phone) {
            parsed.data.phone = '***-***';
            parsed.data.phoneHidden = true;
          }
          if (parsed.data.email) {
            parsed.data.email = 'hidden@example.com';
            parsed.data.emailHidden = true;
          }
          parsed.data.contactRequiresPayment = true;
        }
      }

      return originalSend(JSON.stringify(parsed));
    } catch (e) {
      return originalSend(body);
    }
  };

  next();
};