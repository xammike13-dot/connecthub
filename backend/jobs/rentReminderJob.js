import Rental from '../models/Rental.js';
import User from '../models/User.js';
import { createNotification } from '../controllers/notificationController.js';

/**
 * Monthly Rent Reminder Job
 * Runs daily at midnight (00:00)
 * Checks for active bookings where nextRentDueDate is today or past due
 * Sends notifications to customers and landlords
 * nextRentDueDate is calculated based on moveInDate, not booking date
 */

const checkRentReminders = async () => {
  console.log('[RENT REMINDER JOB] Starting rent reminder check at:', new Date().toISOString());

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all rentals with active bookings
    const rentals = await Rental.find({
      'bookings.status': 'active',
      'bookings.nextRentDueDate': { $lte: today },
    }).populate('landlord', 'name email');

    console.log('[RENT REMINDER JOB] Found rentals with due rent:', rentals.length);

    let remindersSent = 0;

    for (const rental of rentals) {
      for (const booking of rental.bookings) {
        // Skip if not active or rent not due
        if (booking.status !== 'active') continue;

        const nextRentDue = booking.nextRentDueDate ? new Date(booking.nextRentDueDate) : null;
        if (!nextRentDue) continue;

        // Check if rent is due today or past due
        nextRentDue.setHours(0, 0, 0, 0);
        if (nextRentDue > today) continue;

        // Check if reminder was already sent today
        const lastReminder = booking.lastRentReminderSent ? new Date(booking.lastRentReminderSent) : null;
        if (lastReminder) {
          lastReminder.setHours(0, 0, 0, 0);
          if (lastReminder.getTime() === today.getTime()) {
            console.log('[RENT REMINDER JOB] Reminder already sent today for booking:', booking._id);
            continue;
          }
        }

        // Calculate days overdue
        const daysOverdue = Math.floor((today - nextRentDue) / (1000 * 60 * 60 * 24));
        const isOverdue = daysOverdue > 0;

        // Create notification message
        const message = isOverdue
          ? `Your monthly rent payment for ${rental.rentalName} is ${daysOverdue} day(s) overdue. Please pay immediately to avoid penalties.`
          : `Your monthly rent payment for ${rental.rentalName} is due today. Amount: KSh ${rental.monthlyPrice?.toLocaleString()}.`;

        // Create notification for customer
        await createNotification(
          booking.customer,
          'rent_due',
          isOverdue ? 'Rent Payment Overdue' : 'Rent Payment Due',
          message,
          { rentalId: rental._id, bookingId: booking._id, amount: rental.monthlyPrice },
          '/customer/bookings',
          null // No req object in scheduled job
        );

        // Create notification for landlord if rent is overdue
        if (isOverdue) {
          const customer = await User.findById(booking.customer).select('name').lean();
          const customerName = customer?.name || 'Tenant';
          
          await createNotification(
            rental.landlord,
            'rent_overdue',
            'Rent Payment Overdue',
            `Tenant ${customerName} has not yet paid this month's rent for ${rental.rentalName}. Amount: KSh ${rental.monthlyPrice?.toLocaleString()}. Overdue by ${daysOverdue} day(s).`,
            { rentalId: rental._id, bookingId: booking._id, amount: rental.monthlyPrice, customerId: booking.customer },
            '/landlord/bookings',
            null // No req object in scheduled job
          );
          
          console.log('[RENT REMINDER JOB] Sent overdue reminder to landlord:', rental.landlord, 'for booking:', booking._id);
        }

        // Update last reminder sent
        booking.lastRentReminderSent = new Date();
        await rental.save();

        remindersSent++;
        console.log('[RENT REMINDER JOB] Sent reminder to customer:', booking.customer, 'for booking:', booking._id);
      }
    }

    console.log('[RENT REMINDER JOB] Completed. Reminders sent:', remindersSent);
  } catch (error) {
    console.error('[RENT REMINDER JOB] Error:', error);
  }
};

/**
 * Calculate time until next midnight
 */
const getTimeUntilMidnight = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0); // Next midnight
  return midnight.getTime() - now.getTime();
};

/**
 * Start the rent reminder job
 * Schedule: Daily at midnight (00:00)
 */
export const startRentReminderJob = () => {
  // Calculate initial delay until midnight
  const initialDelay = getTimeUntilMidnight();

  console.log('[RENT REMINDER JOB] Scheduled to run daily at midnight');
  console.log('[RENT REMINDER JOB] First run in:', Math.floor(initialDelay / 1000 / 60), 'minutes');

  // Schedule first run at midnight
  setTimeout(() => {
    checkRentReminders();

    // Then run every 24 hours
    setInterval(() => {
      checkRentReminders();
    }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
  }, initialDelay);

  // Also run immediately on startup for testing (comment out in production)
  // checkRentReminders();
};

/**
 * Manual trigger for testing
 */
export const triggerRentReminderJob = async () => {
  await checkRentReminders();
};

export default { startRentReminderJob, triggerRentReminderJob };
