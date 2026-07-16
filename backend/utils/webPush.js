import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';

// VAPID Keys - loaded from env if present, with reliable fallbacks
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 'BGixtKJV9Uh2ov9bXcNo-9IanofbeUOJcIV2pZ6R4fBk478mbbZwYd5DNowJ-GExxlBUQaCt9Ba1Ybv74zALyvE';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '27udMCopf2g1kFEtuRN2C2svLOpvqJf0sbFsCf9BzTg';
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:connecthub387@gmail.com';

webpush.setVapidDetails(
  vapidEmail,
  vapidPublicKey,
  vapidPrivateKey
);

console.log('[WebPush] Initialized with public key:', vapidPublicKey.slice(0, 10) + '...');

/**
 * Send Web Push Notification to a specific subscription
 * @param {object} subDoc - Mongoose subscription document
 * @param {object} payload - Notification payload (title, body, url, etc.)
 * @returns {Promise<boolean>} - Success state
 */
export const sendPushToSubscription = async (subDoc, payload) => {
  try {
    const payloadString = JSON.stringify({
      title: payload.title || 'ConnectHub',
      body: payload.body || payload.message || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: {
        url: payload.url || payload.navigationTarget || '/',
        createdAt: new Date().toISOString(),
        ...payload.data
      }
    });

    await webpush.sendNotification(subDoc.subscription, payloadString);

    // Update lastSeen
    subDoc.lastSeen = new Date();
    await subDoc.save();
    return true;
  } catch (error) {
    console.error(`[WebPush] Failed for endpoint: ${subDoc.subscription?.endpoint}. Status: ${error.statusCode}`);

    // If subscription is expired, revoked, or gone (410 Gone or 404 Not Found), delete it
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log(`[WebPush] Subscription expired/revoked. Removing from DB.`);
      await PushSubscription.findByIdAndDelete(subDoc._id);
    }
    return false;
  }
};

/**
 * Send Web Push Notification to all subscriptions of a specific user
 * @param {string} userId - User ID
 * @param {object} payload - Notification payload
 */
export const sendPushToUser = async (userId, payload) => {
  try {
    if (!userId) return;

    const subscriptions = await PushSubscription.find({ userId });
    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    console.log(`[WebPush] Sending push to ${subscriptions.length} devices for user ${userId}`);

    const sendPromises = subscriptions.map((subDoc) =>
      sendPushToSubscription(subDoc, payload)
    );

    await Promise.all(sendPromises);
  } catch (error) {
    console.error(`[WebPush] Error sending push to user ${userId}:`, error);
  }
};

export default {
  vapidPublicKey,
  sendPushToSubscription,
  sendPushToUser,
};
