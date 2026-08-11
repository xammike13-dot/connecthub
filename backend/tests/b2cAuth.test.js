import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import mpesaService from '../services/mpesaService.js';

// Stub axios
const originalGet = axios.get;

test('B2C Access Token Authentication and Validation Suite', async (t) => {
  // Save current environment variables
  const origMpesaEnv = process.env.MPESA_ENVIRONMENT;
  const origConsumerKey = process.env.MPESA_CONSUMER_KEY;
  const origConsumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const origB2CConsumerKey = process.env.MPESA_B2C_CONSUMER_KEY;
  const origB2CConsumerSecret = process.env.MPESA_B2C_CONSUMER_SECRET;

  t.afterEach(() => {
    // Restore original variables
    process.env.MPESA_ENVIRONMENT = origMpesaEnv;
    process.env.MPESA_CONSUMER_KEY = origConsumerKey;
    process.env.MPESA_CONSUMER_SECRET = origConsumerSecret;
    process.env.MPESA_B2C_CONSUMER_KEY = origB2CConsumerKey;
    process.env.MPESA_B2C_CONSUMER_SECRET = origB2CConsumerSecret;
    axios.get = originalGet;
  });

  await t.test('Should throw error if B2C credentials are not set when calling getAccessToken(true)', async () => {
    process.env.MPESA_ENVIRONMENT = 'production';
    process.env.MPESA_CONSUMER_KEY = 'stk_key';
    process.env.MPESA_CONSUMER_SECRET = 'stk_secret';

    // Explicitly delete B2C keys
    delete process.env.MPESA_B2C_CONSUMER_KEY;
    delete process.env.MPESA_B2C_CONSUMER_SECRET;

    await assert.rejects(
      () => mpesaService.getAccessToken(true),
      /MPESA_B2C_CONSUMER_KEY or MPESA_B2C_CONSUMER_SECRET is not configured/
    );
  });

  await t.test('Should throw configuration error on initiateB2C if B2C credentials are not set', async () => {
    process.env.MPESA_ENVIRONMENT = 'production';
    process.env.MPESA_CONSUMER_KEY = 'stk_key';
    process.env.MPESA_CONSUMER_SECRET = 'stk_secret';
    process.env.MPESA_B2C_INITIATOR_NAME = 'initiator';
    process.env.MPESA_B2C_SECURITY_CREDENTIAL = 'cred';
    process.env.MPESA_B2C_SHORTCODE = '123456';
    process.env.MPESA_CALLBACK_URL = 'https://connecthub-60j4.onrender.com/api/withdrawals/b2c/callback';

    delete process.env.MPESA_B2C_CONSUMER_KEY;
    delete process.env.MPESA_B2C_CONSUMER_SECRET;

    const res = await mpesaService.initiateB2C({
      phoneNumber: '0712345678',
      amount: 500,
      originatorConversationId: 'test_conv_id'
    });

    assert.equal(res.success, false);
    assert.match(res.message || res.error, /MPESA_B2C_CONSUMER_KEY or MPESA_B2C_CONSUMER_SECRET is not configured/);
  });

  await t.test('Should cache STK and B2C tokens separately without cross-contamination', async () => {
    process.env.MPESA_ENVIRONMENT = 'sandbox';
    process.env.MPESA_CONSUMER_KEY = 'stk_key';
    process.env.MPESA_CONSUMER_SECRET = 'stk_secret';
    process.env.MPESA_B2C_CONSUMER_KEY = 'b2c_key';
    process.env.MPESA_B2C_CONSUMER_SECRET = 'b2c_secret';

    // Clear service cache first
    mpesaService.accessToken = null;
    mpesaService.tokenExpiresAt = null;
    mpesaService.b2cAccessToken = null;
    mpesaService.b2cTokenExpiresAt = null;

    let getCount = 0;
    axios.get = async (url, config) => {
      getCount++;
      const authHeader = config.headers.Authorization;
      if (authHeader.includes(Buffer.from('stk_key:stk_secret').toString('base64'))) {
        return { data: { access_token: 'stk_token_123', expires_in: '3599' } };
      } else if (authHeader.includes(Buffer.from('b2c_key:b2c_secret').toString('base64'))) {
        return { data: { access_token: 'b2c_token_456', expires_in: '3599' } };
      }
      throw new Error('Mismatched auth credentials in axios get');
    };

    const stkToken = await mpesaService.getAccessToken(false);
    assert.equal(stkToken, 'stk_token_123');
    assert.equal(mpesaService.accessToken, 'stk_token_123');

    const b2cToken = await mpesaService.getAccessToken(true);
    assert.equal(b2cToken, 'b2c_token_456');
    assert.equal(mpesaService.b2cAccessToken, 'b2c_token_456');

    // Subsequent calls must return cached values without calling axios again
    const stkTokenCached = await mpesaService.getAccessToken(false);
    assert.equal(stkTokenCached, 'stk_token_123');

    const b2cTokenCached = await mpesaService.getAccessToken(true);
    assert.equal(b2cTokenCached, 'b2c_token_456');

    assert.equal(getCount, 2, 'Should only call the API twice (one for STK, one for B2C)');
  });
});
