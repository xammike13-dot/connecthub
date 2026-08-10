import axios from 'axios';

/**
 * Reusable helper to get the Daraja API base URL based on MPESA_ENVIRONMENT
 * @returns {string} The base URL for Daraja API
 */
export function getDarajaBaseUrl() {
  const mpesaEnv = process.env.MPESA_ENVIRONMENT || 'sandbox';
  const baseUrl = mpesaEnv.trim().toLowerCase() === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';

  console.log('[DARAJA BASE URL LOGS]');
  console.log(`- MPESA_ENVIRONMENT: ${process.env.MPESA_ENVIRONMENT || 'NOT SET'}`);
  console.log(`- Selected Base URL: ${baseUrl}`);
  console.log(`- OAuth URL: ${baseUrl}/oauth/v1/generate?grant_type=client_credentials`);
  console.log(`- STK Push URL: ${baseUrl}/mpesa/stkpush/v1/processrequest`);

  return baseUrl;
}

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
    this.b2cAccessToken = null;
    this.b2cTokenExpiresAt = null;
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
    const baseUrl = getDarajaBaseUrl();
    
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
   * Supports separating STK (default) and B2C token streams
   */
  async getAccessToken(isB2C = false) {
    const cacheKey = isB2C ? 'b2cAccessToken' : 'accessToken';
    const expiresKey = isB2C ? 'b2cTokenExpiresAt' : 'tokenExpiresAt';

    // Return cached token if still valid (with 1 minute buffer)
    if (this[cacheKey] && this[expiresKey] && Date.now() < this[expiresKey] - 60000) {
      return this[cacheKey];
    }

    try {
      console.log(`[MPESA] Generating new ${isB2C ? 'B2C ' : ''}access token...`);
      
      // Read config fresh from environment each time
      const config = this.getConfig();
      
      // Separate STK vs B2C OAuth credentials
      const consumerKey = isB2C
        ? (process.env.MPESA_B2C_CONSUMER_KEY || config.consumerKey)
        : config.consumerKey;
      const consumerSecret = isB2C
        ? (process.env.MPESA_B2C_CONSUMER_SECRET || config.consumerSecret)
        : config.consumerSecret;

      console.log(`[MPESA] ${isB2C ? 'B2C ' : ''}Consumer Key:`, consumerKey ? 'SET' : 'MISSING');
      console.log(`[MPESA] ${isB2C ? 'B2C ' : ''}Consumer Secret:`, consumerSecret ? 'SET' : 'MISSING');
      
      if (!consumerKey || !consumerSecret) {
        throw new Error(isB2C
          ? 'MPESA_B2C_CONSUMER_KEY or MPESA_B2C_CONSUMER_SECRET is not configured'
          : 'MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET is not configured'
        );
      }
      
      // Trim whitespace from credentials to prevent encoding issues
      const cleanKey = consumerKey.trim();
      const cleanSecret = consumerSecret.trim();
      const auth = Buffer.from(`${cleanKey}:${cleanSecret}`).toString('base64');
      
      console.log(`[MPESA] Requesting ${isB2C ? 'B2C ' : ''}token from:`, config.baseUrl);
      console.log(`[MPESA] Auth header (first 30 chars):`, `Basic ${auth.substring(0, 30)}...`);
      
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
        console.error(`[MPESA] No ${isB2C ? 'B2C ' : ''}access_token in response:`, response.data);
        throw new Error('Daraja API did not return an access_token');
      }

      this[cacheKey] = response.data.access_token;
      // Token expires in ~3599 seconds, cache for 3500 seconds
      this[expiresKey] = Date.now() + 3500000;

      console.log(`[MPESA] ${isB2C ? 'B2C ' : ''}Access Token Generated successfully (length:`, this[cacheKey].length, ')');
      
      return this[cacheKey];
    } catch (error) {
      console.error(`[MPESA] ${isB2C ? 'B2C ' : ''}Access Token generation failed:`, error.response?.data || error.message);
      throw new Error(`MPesa ${isB2C ? 'B2C ' : ''}token generation failed: ${error.response?.data?.error_description || error.message}`);
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
        transactionDesc = 'Payment',
      } = paymentData;

      // Get config fresh from environment
      const config = this.getConfig();

      // Get access token
      const accessToken = await this.getAccessToken();

      // Format phone number
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      // Generate timestamp and password
      const timestamp = this.formatTimestamp();
      const password = this.generatePassword(timestamp);

      // 1. Format AccountReference: Ensure it is 12 characters or fewer and compliant (e.g. TXN823C6B85)
      let finalAccountReference = accountReference || transactionRef || 'TXN';
      if (finalAccountReference.includes('-')) {
        const parts = finalAccountReference.split('-');
        const suffix = parts[parts.length - 1];
        finalAccountReference = `TXN${suffix}`;
      }
      finalAccountReference = finalAccountReference.replace(/\s+/g, '').substring(0, 12);

      // 2. Format TransactionDesc: Limit to exactly 13 characters or fewer
      let finalTransactionDesc = transactionDesc || 'Payment';
      finalTransactionDesc = finalTransactionDesc.substring(0, 13);

      // 3. Dynamic Shortcode/Till configuration
      let transactionType = 'CustomerPayBillOnline';
      let partyB = config.shortcode;

      // Check if Safaricom authorized production Buy Goods configuration is present
      if (config.shortcode === '4342025') {
        transactionType = 'CustomerBuyGoodsOnline';
        partyB = process.env.MPESA_TILL || '3011302';
      } else if (process.env.MPESA_TRANSACTION_TYPE === 'CustomerBuyGoodsOnline') {
        transactionType = 'CustomerBuyGoodsOnline';
        partyB = process.env.MPESA_TILL || config.shortcode;
      }

      // Prepare STK Push payload
      const payload = {
        BusinessShortCode: config.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: transactionType,
        Amount: Math.round(amount),
        PartyA: formattedPhone,
        PartyB: partyB,
        PhoneNumber: formattedPhone,
        CallBackURL: config.callbackUrl,
        AccountReference: finalAccountReference,
        TransactionDesc: finalTransactionDesc,
      };

      // Safe Diagnostic Logging
      console.log('════════════════ [MPESA DIAGNOSTIC LOG - STK PUSH REQUEST] ════════════════');
      console.log(`- MPESA_ENVIRONMENT: ${config.environment}`);
      console.log(`- BusinessShortCode: ${config.shortcode}`);
      console.log(`- TransactionType: ${transactionType}`);
      console.log(`- PartyB: ${partyB}`);
      console.log(`- Amount: ${payload.Amount}`);
      console.log(`- AccountReference length: ${finalAccountReference.length} (${finalAccountReference})`);
      console.log(`- TransactionDesc length: ${finalTransactionDesc.length} (${finalTransactionDesc})`);
      console.log(`- OAuth URL: ${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`);
      console.log(`- STK URL: ${config.baseUrl}/mpesa/stkpush/v1/processrequest`);
      console.log('══════════════════════════════════════════════════════════════════════════');

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

      console.log('════════════════ [MPESA DIAGNOSTIC LOG - STK PUSH RESPONSE] ════════════════');
      console.log(`- ResponseCode: ${response.data?.ResponseCode}`);
      console.log(`- ResponseDescription: ${response.data?.ResponseDescription}`);
      console.log(`- CheckoutRequestID: ${response.data?.CheckoutRequestID}`);
      console.log(`- MerchantRequestID: ${response.data?.MerchantRequestID}`);
      console.log('═══════════════════════════════════════════════════════════════════════════');

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
  /**
   * Initiate M-Pesa B2C (Business to Customer) payment request (Payouts)
   *
   * @param {Object} b2cData - B2C request details
   * @param {string} b2cData.phoneNumber - Recipient's phone number
   * @param {number} b2cData.amount - Amount to disburse
   * @param {string} b2cData.originatorConversationId - Unique identifier for tracing
   * @returns {Promise<Object>} B2C transaction result
   */
  async initiateB2C(b2cData) {
    try {
      const { phoneNumber, amount, originatorConversationId } = b2cData;

      // Validate inputs
      if (!phoneNumber) {
        throw new Error('B2C phone number is required');
      }
      if (!amount || isNaN(amount) || amount <= 0) {
        throw new Error('B2C valid numeric amount is required');
      }

      // Read M-Pesa config
      const config = this.getConfig();

      // Ensure required environment variables for B2C are loaded
      const initiatorName = process.env.MPESA_B2C_INITIATOR_NAME || 'testapi';
      const securityCredential = process.env.MPESA_B2C_SECURITY_CREDENTIAL; // Must be encrypted
      const commandId = process.env.MPESA_B2C_COMMAND_ID || 'BusinessPayment';
      const partyA = process.env.MPESA_B2C_SHORTCODE || config.shortcode; // Paying organization shortcode

      // Check for mandatory configurations
      if (!securityCredential) {
        throw new Error('MPESA_B2C_SECURITY_CREDENTIAL environment variable is missing or empty');
      }
      if (!partyA) {
        throw new Error('MPESA_B2C_SHORTCODE or MPESA_SHORTCODE environment variable is required');
      }

      // Build timeout & result webhook callback URLs safely (resolving nested path issue)
      const callbackBase = process.env.MPESA_CALLBACK_URL || '';
      let baseUrl = callbackBase;
      try {
        if (callbackBase.startsWith('http')) {
          const urlObj = new URL(callbackBase);
          baseUrl = urlObj.origin;
        }
      } catch (e) {
        console.error('[B2C] Error parsing MPESA_CALLBACK_URL, using raw value:', e.message);
      }

      const queueTimeOutUrl = process.env.MPESA_B2C_TIMEOUT_URL ||
        (baseUrl.includes('/api/withdrawals/b2c/timeout')
          ? baseUrl
          : `${baseUrl}/api/withdrawals/b2c/timeout`);

      const resultUrl = process.env.MPESA_B2C_RESULT_URL ||
        (baseUrl.includes('/api/withdrawals/b2c/callback')
          ? baseUrl
          : `${baseUrl}/api/withdrawals/b2c/callback`);

      // Format recipient phone number
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      // Get bearer authorization token specifically for B2C stream
      const accessToken = await this.getAccessToken(true);

      // Payload building
      const payload = {
        InitiatorName: initiatorName,
        SecurityCredential: securityCredential,
        CommandID: commandId,
        Amount: Math.round(amount),
        PartyA: partyA,
        PartyB: formattedPhone,
        Remarks: 'ConnectHub Withdrawal',
        QueueTimeOutURL: queueTimeOutUrl,
        ResultURL: resultUrl,
        Occasion: 'Wallet Withdrawal',
        OriginatorConversationID: originatorConversationId,
      };

      // Explicitly verify B2C payload contains all required production fields
      const requiredFields = [
        { name: 'InitiatorName', value: payload.InitiatorName },
        { name: 'SecurityCredential', value: payload.SecurityCredential },
        { name: 'CommandID', value: payload.CommandID },
        { name: 'Amount', value: payload.Amount },
        { name: 'PartyA', value: payload.PartyA },
        { name: 'PartyB', value: payload.PartyB },
        { name: 'Remarks', value: payload.Remarks },
        { name: 'QueueTimeOutURL', value: payload.QueueTimeOutURL },
        { name: 'ResultURL', value: payload.ResultURL },
        { name: 'Occasion', value: payload.Occasion },
      ];

      for (const field of requiredFields) {
        if (field.value === undefined || field.value === null || field.value === '') {
          throw new Error(`B2C payout error: Required field "${field.name}" is missing or empty`);
        }
      }

      // Secure Diagnostic Logging (excluding consumer secrets, credentials, tokens, etc.)
      console.log('════════════════ [B2C] WITHDRAWAL INITIATED ════════════════');
      console.log(`- Amount: ${payload.Amount}`);
      console.log(`- PartyB: ${payload.PartyB}`);
      console.log(`- PartyA: ${payload.PartyA}`);
      console.log(`- CommandID: ${payload.CommandID}`);
      console.log(`- Environment: ${config.environment === 'production' ? 'Production' : 'Sandbox'}`);
      console.log(`- ResultURL: ${payload.ResultURL}`);
      console.log(`- TimeoutURL: ${payload.QueueTimeOutURL}`);
      console.log(`- OriginatorConversationID: ${payload.OriginatorConversationID}`);
      console.log(`- MPESA_B2C_SECURITY_CREDENTIAL Loaded: ${process.env.MPESA_B2C_SECURITY_CREDENTIAL ? 'YES' : 'NO'}`);
      console.log(`- MPESA_B2C_CONSUMER_KEY Loaded: ${process.env.MPESA_B2C_CONSUMER_KEY ? 'YES' : 'NO (Using general key)'}`);
      console.log(`- MPESA_B2C_CONSUMER_SECRET Loaded: ${process.env.MPESA_B2C_CONSUMER_SECRET ? 'YES' : 'NO (Using general secret)'}`);
      console.log('════════════════════════════════════════════════════════════');

      // Make B2C post request to Daraja
      const endpoint = `${config.baseUrl}/mpesa/b2c/v1/paymentrequest`;
      console.log(`[B2C] Sending request to Daraja API: ${endpoint}`);

      const response = await axios.post(
        endpoint,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('════════════════ [B2C] DARAJA RESPONSE ════════════════');
      console.log(`- ResponseCode: ${response.data?.ResponseCode}`);
      console.log(`- ResponseDescription: ${response.data?.ResponseDescription}`);
      console.log(`- ConversationID: ${response.data?.ConversationID}`);
      console.log(`- OriginatorConversationID: ${response.data?.OriginatorConversationID}`);
      console.log('════════════════════════════════════════════════════════');

      // Check if Safaricom accepted the request
      const responseCode = response.data?.ResponseCode;
      if (responseCode !== '0' && responseCode !== 0) {
        throw new Error(response.data?.ResponseDescription || `Safaricom Daraja B2C payout request failed with code ${responseCode}`);
      }

      return {
        success: true,
        data: response.data,
        message: 'B2C payout request initiated successfully',
      };
    } catch (error) {
      console.error('[B2C] ========== B2C PAYOUT ERROR ==========');
      console.error('[B2C] ERROR DETAILS:', error.response?.data || error.message);
      console.error('[B2C] Error status:', error.response?.status);
      console.error('[B2C] ========== B2C PAYOUT ERROR END ==========');
      return {
        success: false,
        message: error.response?.data?.errorMessage || error.response?.data?.errorDescription || error.message,
        error: error.response?.data || error.message,
      };
    }
  }

  processCallback(callbackData) {
    console.log('[MPESA] Processing callback:', callbackData);

    if (!callbackData || !callbackData.Body) {
      return {
        isValid: false,
        success: false,
        message: 'Invalid callback format: Body is missing',
      };
    }

    const { stkCallback } = callbackData.Body;
    if (!stkCallback) {
      return {
        isValid: false,
        success: false,
        message: 'Invalid callback format: stkCallback is missing',
      };
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback;

    if (ResultCode === undefined || ResultCode === null) {
      return {
        isValid: false,
        success: false,
        message: 'Invalid callback format: ResultCode is missing',
      };
    }

    const isSuccess = Number(ResultCode) === 0;

    // Log callback success check with type information
    console.log('[CALLBACK SUCCESS CHECK]', {
      rawResultCode: ResultCode,
      type: typeof ResultCode,
      numericResult: Number(ResultCode),
      isSuccess
    });

    // Safe Diagnostic Logging
    console.log('════════════════ [MPESA DIAGNOSTIC LOG - CALLBACK RECEIVED] ════════════════');
    console.log(`- ResultCode: ${ResultCode}`);
    console.log(`- ResultDesc: ${ResultDesc}`);
    console.log(`- CheckoutRequestID: ${CheckoutRequestID}`);
    console.log(`- MerchantRequestID: ${MerchantRequestID}`);
    console.log('════════════════════════════════════════════════════════════════════════════');

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
      isValid: true,
      success: isSuccess,
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
      isValid: true,
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