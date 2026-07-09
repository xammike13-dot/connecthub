import axios from 'axios';

/**
 * MPesa Daraja API Service
 * Handles all M-Pesa STK Push interactions using Safaricom Daraja API
 * 
 * This service directly integrates with Safaricom's Daraja API for:
 * - Access token generation
 * - STK Push initiation
 * - Payment status queries
 */

class MpesaService {
  constructor() {
    // Token cache
    this.accessToken = null;
    this.tokenExpiresAt = null;
  }

  /**
   * Get current M-Pesa configuration from environment
   * Reads from process.env each time to ensure latest values
   */
  getConfig() {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
    
    // Build callback URL - handle both full URL and path-only formats
    const callbackBase = process.env.MPESA_CALLBACK_URL || '';
    let callbackUrl;
    if (callbackBase.includes('/api/payments/mpesa/callback')) {
      callbackUrl = callbackBase;
    } else {
      callbackUrl = `${callbackBase}/api/payments/mpesa/callback`;
    }
    
    console.log('[MPESA CALLBACK URL]', callbackUrl);
    
    // Daraja API endpoints
    const baseUrl = environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
    
    return {
      consumerKey,
      consumerSecret,
      shortcode,
      passkey,
      callbackUrl,
      environment,
      baseUrl,
    };
  }

  /**
   * Log M-Pesa configuration on startup (without exposing secrets)
   */
  logConfig() {
    console.log('[MPESA CONFIG]');
    console.log(`  Shortcode: ${this.shortcode ? 'SET' : 'MISSING'}`);
    console.log(`  Consumer Key: ${this.consumerKey ? 'SET' : 'MISSING'}`);
    console.log(`  Consumer Secret: ${this.consumerSecret ? 'SET' : 'MISSING'}`);
    console.log(`  Passkey: ${this.passkey ? 'SET' : 'MISSING'}`);
    console.log(`  Callback URL: ${this.callbackUrl ? 'SET' : 'MISSING'}`);
    console.log(`  Environment: ${this.environment}`);
    console.log(`  Base URL: ${this.baseUrl}`);

    // Validate required configuration
    const missingConfig = [];
    if (!this.shortcode) missingConfig.push('MPESA_SHORTCODE');
    if (!this.consumerKey) missingConfig.push('MPESA_CONSUMER_KEY');
    if (!this.consumerSecret) missingConfig.push('MPESA_CONSUMER_SECRET');
    if (!this.passkey) missingConfig.push('MPESA_PASSKEY');
    if (!this.callbackUrl) missingConfig.push('MPESA_CALLBACK_URL');

    if (missingConfig.length > 0) {
      console.error('[MPESA CONFIG] ERROR: Missing required configuration:');
      missingConfig.forEach(key => console.error(`  - ${key}`));
      console.error('[MPESA CONFIG] M-Pesa payments will NOT work until these are configured.');
    } else {
      console.log('[MPESA CONFIG] All required configuration is set.');
    }
  }

  /**
   * Generate OAuth access token from Daraja API
   * Token is cached and reused until expiration
   */
  async getAccessToken() {
    // Return cached token if still valid (with 1 minute buffer)
    if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    try {
      console.log('[MPESA] Generating new access token...');
      
      // Read config fresh from environment each time
      const config = this.getConfig();
      
      console.log('[MPESA] Consumer Key:', config.consumerKey ? 'SET' : 'MISSING');
      console.log('[MPESA] Consumer Secret:', config.consumerSecret ? 'SET' : 'MISSING');
      
      if (!config.consumerKey || !config.consumerSecret) {
        throw new Error('MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET is not configured');
      }
      
      // Trim whitespace from credentials to prevent encoding issues
      const cleanKey = config.consumerKey.trim();
      const cleanSecret = config.consumerSecret.trim();
      const auth = Buffer.from(`${cleanKey}:${cleanSecret}`).toString('base64');
      
      console.log('[MPESA] Requesting token from:', config.baseUrl);
      console.log('[MPESA] Auth header (first 30 chars):', `Basic ${auth.substring(0, 30)}...`);
      
      const response = await axios.get(
        `${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data.access_token) {
        console.error('[MPESA] No access_token in response:', response.data);
        throw new Error('Daraja API did not return an access_token');
      }

      this.accessToken = response.data.access_token;
      // Token expires in ~3599 seconds, cache for 3500 seconds
      this.tokenExpiresAt = Date.now() + 3500000;

      console.log('[MPESA] Access Token Generated successfully (length:', this.accessToken.length, ')');
      
      return this.accessToken;
    } catch (error) {
      console.error('[MPESA] Access Token generation failed:', error.response?.data || error.message);
      throw new Error(`MPesa token generation failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Generate password for STK Push
   * Password = base64(Shortcode + Passkey + Timestamp)
   */
  generatePassword(timestamp) {
    const config = this.getConfig();
    const data = `${config.shortcode}${config.passkey}${timestamp}`;
    return Buffer.from(data).toString('base64');
  }

  /**
   * Format timestamp as YYYYMMDDHHmmss
   */
  formatTimestamp(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hour}${minute}${second}`;
  }

  /**
   * Format phone number to 254XXXXXXXXX format
   */
  formatPhoneNumber(phoneNumber) {
    // Remove all non-numeric characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // If starts with 0, replace with 254
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    }
    // If starts with 7, 8, or 9 and is 9 digits, add 254
    else if (cleaned.length === 9 && /^[789]/.test(cleaned)) {
      cleaned = '254' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Initiate STK Push payment
   * 
   * @param {Object} paymentData - Payment details
   * @param {string} paymentData.phoneNumber - Customer's M-Pesa phone number
   * @param {number} paymentData.amount - Amount to pay
   * @param {string} paymentData.transactionRef - Unique transaction reference
   * @param {string} [paymentData.accountReference] - Account reference (defaults to transactionRef)
   * @param {string} [paymentData.transactionDesc] - Transaction description
   * @returns {Promise<Object>} STK Push response with CheckoutRequestID
   */
  async initiateSTKPush(paymentData) {
    try {
      const {
        phoneNumber,
        amount,
        transactionRef,
        accountReference,
        transactionDesc = 'Payment for ConnectHub service',
      } = paymentData;

      // Get config fresh from environment
      const config = this.getConfig();

      console.log('[MPESA] ========== STK PUSH INITIATED ==========');
      console.log('[MPESA] SENDING STK PUSH', {
        phoneNumber,
        amount,
        transactionRef,
        accountReference,
        transactionDesc,
      });

      // Log STK Push details before sending
      console.log('[MPESA] STK PUSH DETAILS:');
      console.log(`  Phone Number: ${phoneNumber}`);
      console.log(`  Amount: KSh ${amount}`);
      console.log(`  Shortcode: ${config.shortcode}`);
      console.log(`  Callback URL: ${config.callbackUrl}`);
      console.log(`  Environment: ${config.environment}`);
      console.log(`  Base URL: ${config.baseUrl}`);

      // Get access token
      const accessToken = await this.getAccessToken();
      console.log('[MPESA] Access token obtained:', accessToken ? '***REDACTED***' : 'FAILED');

      // Format phone number
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      console.log('[MPESA] Formatted phone:', formattedPhone);

      // Generate timestamp and password
      const timestamp = this.formatTimestamp();
      const password = this.generatePassword(timestamp);

      // Prepare STK Push payload
      const payload = {
        BusinessShortCode: config.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount),
        PartyA: formattedPhone,
        PartyB: config.shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: config.callbackUrl,
        AccountReference: accountReference || transactionRef,
        TransactionDesc: transactionDesc,
      };

      console.log('[MPESA] STK Push Payload:', {
        BusinessShortCode: payload.BusinessShortCode,
        Timestamp: payload.Timestamp,
        TransactionType: payload.TransactionType,
        Amount: payload.Amount,
        PartyA: payload.PartyA,
        PartyB: payload.PartyB,
        PhoneNumber: payload.PhoneNumber,
        CallBackURL: payload.CallBackURL,
        AccountReference: payload.AccountReference,
        TransactionDesc: payload.TransactionDesc,
        Password: '***REDACTED***',
      });

      // Make STK Push request
      console.log('[MPESA] Sending request to Daraja API...');
      const response = await axios.post(
        `${config.baseUrl}/mpesa/stkpush/v1/processrequest`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('[MPESA] DARAJA RESPONSE:', response.data);
      console.log('[MPESA] Response Code:', response.data?.ResponseCode);
      console.log('[MPESA] Response Description:', response.data?.ResponseDescription);
      console.log('[MPESA] CheckoutRequestID:', response.data?.CheckoutRequestID);
      console.log('[MPESA] MerchantRequestID:', response.data?.MerchantRequestID);
      console.log('[MPESA] ========== STK PUSH COMPLETED ==========');

      return {
        success: true,
        data: response.data,
        message: 'STK Push initiated successfully',
      };
    } catch (error) {
      console.error('[MPESA] ========== STK PUSH ERROR ==========');
      console.error('[MPESA] MPESA ERROR', error.response?.data || error.message);
      console.error('[MPESA] Error status:', error.response?.status);
      console.error('[MPESA] Error data:', JSON.stringify(error.response?.data, null, 2));
      console.error('[MPESA] ========== STK PUSH ERROR END ==========');
      return {
        success: false,
        message: error.response?.data?.errorMessage || error.response?.data?.errorDescription || error.message,
        error: error.response?.data,
      };
    }
  }

  /**
   * Check STK Push payment status
   * 
   * @param {string} checkoutRequestID - The CheckoutRequestID from STK Push response
   * @returns {Promise<Object>} Payment status
   */
  async checkSTKStatus(checkoutRequestID) {
    try {
      console.log('[MPESA] Checking STK status for:', checkoutRequestID);

      // Get config fresh from environment
      const config = this.getConfig();

      // Get access token
      const accessToken = await this.getAccessToken();

      // Generate timestamp and password
      const timestamp = this.formatTimestamp();
      const password = this.generatePassword(timestamp);

      // Prepare status check payload
      const payload = {
        BusinessShortCode: config.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID,
      };

      const response = await axios.post(
        `${config.baseUrl}/mpesa/stkpushquery/v1/query`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('[MPESA] STK Status check response:', response.data);

      return {
        success: true,
        data: response.data,
        message: 'Status retrieved successfully',
      };
    } catch (error) {
      console.error('[MPESA] STK Status check error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.errorMessage || error.response?.data?.errorDescription || error.message,
        error: error.response?.data,
      };
    }
  }

  /**
   * Process Daraja callback webhook
   * 
   * @param {Object} callbackData - The callback payload from Daraja
   * @returns {Object} Processed callback data
   */
  processCallback(callbackData) {
    console.log('[MPESA] Processing callback:', callbackData);

    const { Body } = callbackData;
    const { stkCallback } = Body;

    if (!stkCallback) {
      return {
        success: false,
        message: 'Invalid callback format',
      };
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback;

    // ResultCode 0 means success - use Number() conversion because Daraja often returns "0" as string
    const isSuccess = Number(ResultCode) === 0;

    // Log callback success check with type information
    console.log('[CALLBACK SUCCESS CHECK]', {
      rawResultCode: ResultCode,
      type: typeof ResultCode,
      numericResult: Number(ResultCode),
      isSuccess
    });

    let mpesaReceiptNumber = null;
    let transactionDate = null;
    let phoneNumber = null;
    let amount = null;

    if (isSuccess && CallbackMetadata && CallbackMetadata.Item) {
      // Extract callback metadata
      const items = CallbackMetadata.Item;
      
      for (const item of items) {
        if (item.Name === 'MpesaReceiptNumber') {
          mpesaReceiptNumber = item.Value;
        } else if (item.Name === 'TransactionDate') {
          transactionDate = item.Value;
        } else if (item.Name === 'PhoneNumber') {
          phoneNumber = item.Value;
        } else if (item.Name === 'Amount') {
          amount = item.Value;
        }
      }
    }

    console.log('[MPESA] Callback processed:', {
      isSuccess,
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      mpesaReceiptNumber,
      transactionDate,
      phoneNumber,
      amount,
    });

    return {
      success: isSuccess,
      data: {
        merchantRequestID: MerchantRequestID,
        checkoutRequestID: CheckoutRequestID,
        resultCode: ResultCode,
        resultDesc: ResultDesc,
        mpesaReceiptNumber,
        transactionDate,
        phoneNumber,
        amount,
      },
      message: isSuccess ? 'Payment successful' : ResultDesc,
    };
  }
}

// Export singleton instance
export default new MpesaService();