/**
 * Centralized Email Service using Brevo
 * 
 * This service handles all email communications for the application:
 * - Email verification codes
 * - Password reset codes
 * - Future email notifications
 * 
 * Uses Brevo (formerly Sendinblue) Transactional Email API for reliable email delivery.
 * Implementation: Transactional Email API (not SMTP)
 * API Endpoint: https://api.brevo.com/v3/smtp/email
 * Authentication: API Key via 'api-key' header
 * 
 * NOTE: Environment variables are read dynamically inside functions (not at module load time)
 * to ensure they are available after dotenv.config() is called in server.js.
 * This is necessary because ES module imports are hoisted and evaluated before
 * the importing file's code runs.
 */

import axios from 'axios';

// Brevo API configuration - URL is constant
const BREVO_API_URL = 'https://api.brevo.com/v3';

// Helper function to get Brevo API key dynamically (after dotenv is loaded)
const getBrevoApiKey = () => process.env.BREVO_API_KEY;
const getBrevoSenderEmail = () => process.env.BREVO_SENDER_EMAIL;
const getBrevoSenderName = () => process.env.BREVO_SENDER_NAME;

// Check if Brevo is properly configured
const isBrevoConfigured = () => {
  const apiKey = getBrevoApiKey();
  return apiKey && apiKey !== 'your-brevo-api-key-here' && apiKey.length > 10;
};

/**
 * Send an email using Brevo Transactional Email API
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML content of the email
 * @param {string} textContent - Plain text content (optional)
 * @returns {Promise<{success: boolean, error?: string, messageId?: string, devMode?: boolean}>}
 */
const sendEmail = async (to, subject, htmlContent, textContent = '') => {
  // Get configuration values dynamically (after dotenv is loaded)
  const apiKey = getBrevoApiKey();
  const senderEmail = getBrevoSenderEmail() || 'noreply@connecthub.com';
  const senderName = getBrevoSenderName() || 'ConnectHub';

  // If Brevo is not configured, log and return success for development
  if (!isBrevoConfigured()) {
    console.log('[EMAIL] Brevo not configured. Email would have been sent:');
    console.log('[EMAIL] To:', to);
    console.log('[EMAIL] Subject:', subject);
    console.log('[EMAIL] Content:', htmlContent.substring(0, 200) + '...');
    return { success: true, devMode: true };
  }

  // Build the request payload exactly as per Brevo API specification
  const requestBody = {
    sender: {
      name: senderName,
      email: senderEmail,
    },
    to: [{ email: to }],
    subject,
    htmlContent,
    textContent: textContent || undefined, // Brevo prefers undefined over empty string
  };

  // Debug logging - log full request details
  console.log('[EMAIL] ===== BREVO EMAIL REQUEST =====');
  console.log('[EMAIL] Brevo URL:', `${BREVO_API_URL}/smtp/email`);
  console.log('[EMAIL] HTTP Method: POST');
  console.log('[EMAIL] Sender Email:', senderEmail);
  console.log('[EMAIL] Sender Name:', senderName);
  console.log('[EMAIL] Recipient:', to);
  console.log('[EMAIL] Subject:', subject);
  console.log('[EMAIL] API Key Present:', !!apiKey);
  console.log('[EMAIL] API Key Prefix:', apiKey ? apiKey.substring(0, 12) + '...' : 'None');
  
  // Log a truncated version of the content for debugging
  console.log('[EMAIL] HTML Content Length:', htmlContent.length);
  console.log('[EMAIL] Text Content Length:', (textContent || '').length);

  try {
    const response = await axios.post(
      `${BREVO_API_URL}/smtp/email`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
          'Accept': 'application/json',
        },
        // Add timeout to prevent hanging requests
        timeout: 30000, // 30 seconds
      }
    );

    // Log full response details
    console.log('[EMAIL] ===== BREVO RESPONSE =====');
    console.log('[EMAIL] Response Status:', response.status);
    console.log('[EMAIL] Response Status Text:', response.statusText);
    console.log('[EMAIL] Response Headers:', JSON.stringify(response.headers, null, 2));
    console.log('[EMAIL] Response Data:', JSON.stringify(response.data, null, 2));
    console.log('[EMAIL] Message ID:', response.data?.messageId || 'Not provided');
    console.log('[EMAIL] =================================');

    // Brevo returns 201 Created for successful email send
    // Only log success if we get the expected status code
    if (response.status === 201 || response.status === 200) {
      console.log('[EMAIL] Email sent successfully');
      console.log('[EMAIL] Recipient:', to);
      console.log('[EMAIL] Message ID:', response.data?.messageId || 'Not provided');
      return { 
        success: true, 
        messageId: response.data?.messageId,
        status: response.status 
      };
    } else {
      // Unexpected status code
      console.error('[EMAIL] Unexpected response status:', response.status);
      console.error('[EMAIL] Response body:', response.data);
      return {
        success: false,
        error: `Unexpected status code: ${response.status}`,
        status: response.status,
      };
    }
  } catch (error) {
    // Enhanced error logging
    console.error('[EMAIL] ===== BREVO REQUEST FAILED =====');
    console.error('[EMAIL] Error Type:', error.constructor.name);
    console.error('[EMAIL] Error Message:', error.message);
    
    if (error.response) {
      // Server responded with error status
      console.error('[EMAIL] Response Status:', error.response.status);
      console.error('[EMAIL] Response Status Text:', error.response.statusText);
      console.error('[EMAIL] Response Headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('[EMAIL] Response Data:', JSON.stringify(error.response.data, null, 2));
      
      // Extract specific error message from Brevo
      const brevoError = error.response.data;
      let errorMessage = 'Unknown Brevo error';
      
      if (brevoError.message) {
        errorMessage = brevoError.message;
      } else if (brevoError.code) {
        errorMessage = `Brevo error code: ${brevoError.code}`;
      }
      
      console.error('[EMAIL] Brevo Error:', errorMessage);
      console.error('[EMAIL] =================================');
      
      return {
        success: false,
        error: errorMessage,
        code: brevoError.code,
        status: error.response.status,
      };
    } else if (error.request) {
      // Request was made but no response
      console.error('[EMAIL] No response received from Brevo');
      console.error('[EMAIL] Request:', error.request);
      console.error('[EMAIL] =================================');
      
      return {
        success: false,
        error: 'No response from Brevo API. Please check your network connection and API endpoint.',
      };
    } else {
      // Something else happened
      console.error('[EMAIL] Request setup error:', error.message);
      console.error('[EMAIL] =================================');
      
      return {
        success: false,
        error: error.message,
      };
    }
  }
};

/**
 * Send email verification code
 * @param {string} email - Recipient email address
 * @param {string} code - 6-digit verification code
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendVerificationEmail = async (email, code) => {
  console.log('[EMAIL SERVICE] sendVerificationEmail called with:', { email, codeLength: code?.length, code });
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">ConnectHub</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Verify Your Email</h2>
        <p style="color: #666; line-height: 1.6;">Thank you for signing up for ConnectHub. Please use the verification code below to verify your email address:</p>
        <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px;">${code}</span>
        </div>
        <p style="color: #666; line-height: 1.6;">This code will expire in 15 minutes. If you didn't request this verification, please ignore this email.</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">This is an automated email. Please do not reply.</p>
      </div>
    </div>
  `;

  const textContent = `ConnectHub Email Verification\n\nYour verification code is: ${code}\n\nThis code will expire in 15 minutes. If you didn't request this verification, please ignore this email.`;

  return sendEmail(email, 'Verify Your ConnectHub Email', htmlContent, textContent);
};

/**
 * Send password reset code
 * @param {string} email - Recipient email address
 * @param {string} code - 6-digit reset code
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendPasswordResetEmail = async (email, code) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">ConnectHub</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
        <p style="color: #666; line-height: 1.6;">You requested to reset your password. Please use the code below to proceed:</p>
        <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px;">${code}</span>
        </div>
        <p style="color: #666; line-height: 1.6;">This code will expire in 15 minutes. If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">This is an automated email. Please do not reply.</p>
      </div>
    </div>
  `;

  const textContent = `ConnectHub Password Reset\n\nYour password reset code is: ${code}\n\nThis code will expire in 15 minutes. If you didn't request a password reset, please ignore this email.`;

  return sendEmail(email, 'Reset Your ConnectHub Password', htmlContent, textContent);
};

/**
 * Send password reset confirmation
 * @param {string} email - Recipient email address
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendPasswordResetConfirmation = async (email) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">ConnectHub</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Password Changed Successfully</h2>
        <p style="color: #666; line-height: 1.6;">Your password has been successfully updated. If you didn't make this change, please contact our support team immediately.</p>
        <div style="background: white; border: 2px solid #22c55e; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 24px; font-weight: bold; color: #22c55e;">✓ Password Updated</span>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">This is an automated email. Please do not reply.</p>
      </div>
    </div>
  `;

  const textContent = `ConnectHub Password Update\n\nYour password has been successfully changed. If you didn't make this change, please contact our support team.`;

  return sendEmail(email, 'Password Changed Successfully', htmlContent, textContent);
};

/**
 * Send welcome email after verification
 * @param {string} email - Recipient email address
 * @param {string} name - User's name
 * @param {string} role - User's role
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendWelcomeEmail = async (email, name, role) => {
  const roleLabels = {
    customer: 'Customer',
    landlord: 'Landlord',
    business: 'Business Owner',
    rider: 'Rider',
  };

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">ConnectHub</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Welcome to ConnectHub, ${name}!</h2>
        <p style="color: #666; line-height: 1.6;">Your email has been verified successfully. You're now ready to start using ConnectHub as a <strong>${roleLabels[role] || role}</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Go to Dashboard
          </a>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">This is an automated email. Please do not reply.</p>
      </div>
    </div>
  `;

  const textContent = `Welcome to ConnectHub, ${name}!\n\nYour email has been verified. You're now ready to start using ConnectHub as a ${roleLabels[role] || role}.\n\nVisit: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`;

  return sendEmail(email, 'Welcome to ConnectHub!', htmlContent, textContent);
};

export default {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordResetConfirmation,
  sendWelcomeEmail,
};