/**
 * Centralized Email Service using Brevo
 * 
 * This service handles all email communications for the application:
 * - Email verification codes
 * - Password reset codes
 * - Future email notifications
 * 
 * Uses Brevo (formerly Sendinblue) for reliable email delivery.
 */

import axios from 'axios';

// Brevo API configuration
const BREVO_API_URL = 'https://api.brevo.com/v3';
const BREVO_API_KEY = process.env.BREVO_API_KEY;

// Check if Brevo is properly configured
const isBrevoConfigured = () => {
  return BREVO_API_KEY && BREVO_API_KEY !== 'your-brevo-api-key-here';
};

/**
 * Send an email using Brevo API
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML content of the email
 * @param {string} textContent - Plain text content (optional)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const sendEmail = async (to, subject, htmlContent, textContent = '') => {
  // If Brevo is not configured, log and return success for development
  if (!isBrevoConfigured()) {
    console.log('[EMAIL] Brevo not configured. Email would have been sent:');
    console.log('[EMAIL] To:', to);
    console.log('[EMAIL] Subject:', subject);
    console.log('[EMAIL] Content:', htmlContent.substring(0, 200) + '...');
    return { success: true, devMode: true };
  }

  try {
    const response = await axios.post(
      `${BREVO_API_URL}/smtp/email`,
      {
        sender: {
          name: process.env.BREVO_SENDER_NAME || 'ConnectHub',
          email: process.env.BREVO_SENDER_EMAIL || 'noreply@connecthub.com',
        },
        to: [{ email: to }],
        subject,
        htmlContent,
        textContent,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': BREVO_API_KEY,
        },
      }
    );

    console.log('[EMAIL] Email sent successfully to:', to);
    return { success: true, messageId: response.data.messageId };
  } catch (error) {
    console.error('[EMAIL] Failed to send email:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
};

/**
 * Send email verification code
 * @param {string} email - Recipient email address
 * @param {string} code - 6-digit verification code
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendVerificationEmail = async (email, code) => {
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