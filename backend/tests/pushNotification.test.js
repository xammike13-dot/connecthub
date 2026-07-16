import test from 'node:test';
import assert from 'node:assert/strict';
import { subscribePush, unsubscribePush } from '../controllers/notificationController.js';
import PushSubscription from '../models/PushSubscription.js';

test('subscribePush controller stores and upserts subscription successfully', async () => {
  const originalFindOneAndUpdate = PushSubscription.findOneAndUpdate;

  PushSubscription.findOneAndUpdate = async (query, update, options) => {
    return {
      _id: 'sub-1',
      'subscription.endpoint': query['subscription.endpoint'],
      userId: update.userId,
      role: update.role,
      deviceType: update.deviceType,
      browser: update.browser,
      notificationPermission: update.notificationPermission,
    };
  };

  const req = {
    user: { _id: 'user-1', role: 'customer' },
    body: {
      subscription: {
        endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/gAAAAAB',
        keys: {
          auth: 'auth-key-1',
          p256dh: 'p256dh-key-1'
        }
      },
      role: 'customer',
      deviceType: 'mobile',
      browser: 'Firefox',
      notificationPermission: 'granted'
    }
  };

  let responseData = null;
  let responseStatus = null;

  const res = {
    status: (code) => {
      responseStatus = code;
      return {
        json: (data) => {
          responseData = data;
        }
      };
    }
  };

  const next = () => {};

  try {
    await subscribePush(req, res, next);

    assert.equal(responseStatus, 200);
    assert.equal(responseData.success, true);
    assert.equal(responseData.message, 'Push subscription registered successfully');
    assert.equal(responseData.data._id, 'sub-1');
    assert.equal(responseData.data.role, 'customer');
    assert.equal(responseData.data.browser, 'Firefox');
  } finally {
    PushSubscription.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test('unsubscribePush controller deletes subscription successfully', async () => {
  const originalFindOneAndDelete = PushSubscription.findOneAndDelete;

  let deletedQuery = null;
  PushSubscription.findOneAndDelete = async (query) => {
    deletedQuery = query;
    return { _id: 'sub-1' };
  };

  const req = {
    body: {
      endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/gAAAAAB'
    }
  };

  let responseData = null;
  let responseStatus = null;

  const res = {
    status: (code) => {
      responseStatus = code;
      return {
        json: (data) => {
          responseData = data;
        }
      };
    }
  };

  const next = () => {};

  try {
    await unsubscribePush(req, res, next);

    assert.equal(responseStatus, 200);
    assert.equal(responseData.success, true);
    assert.equal(responseData.message, 'Push subscription removed successfully');
    assert.equal(deletedQuery['subscription.endpoint'], 'https://updates.push.services.mozilla.com/wpush/v2/gAAAAAB');
  } finally {
    PushSubscription.findOneAndDelete = originalFindOneAndDelete;
  }
});
