/**
 * Centralized Email Service using Brevo
 *
 * Handles all email communications for Olafasta:
 * - Email verification codes
 * - Password reset codes
 * - Welcome emails
 *
 * Uses Brevo (formerly Sendinblue) Transactional Email API.
 * API Endpoint: https://api.brevo.com/v3/smtp/email
 * Authentication: API Key via 'api-key' header
 *
 * NOTE: Environment variables are read dynamically inside functions (not at module load time)
 * to ensure they are available after dotenv.config() is called in server.js.
 */

import axios from 'axios';

const BREVO_API_URL = 'https://api.brevo.com/v3';

const getBrevoApiKey = () => process.env.BREVO_API_KEY;
const getBrevoSenderEmail = () => process.env.BREVO_SENDER_EMAIL;
const getBrevoSenderName = () => process.env.BREVO_SENDER_NAME;

const isBrevoConfigured = () => {
  const apiKey = getBrevoApiKey();
  return apiKey && apiKey !== 'your-brevo-api-key-here' && apiKey.length > 10;
};

/**
 * Send an email using Brevo Transactional Email API
 */
const sendEmail = async (to, subject, htmlContent, textContent = '') => {
  const apiKey = getBrevoApiKey();
  const senderEmail = getBrevoSenderEmail() || 'noreply@olafasta.com';
  const senderName = getBrevoSenderName() || 'Olafasta';

  if (!isBrevoConfigured()) {
    console.log('[EMAIL] Brevo not configured. Email would have been sent:');
    console.log('[EMAIL] To:', to);
    console.log('[EMAIL] Subject:', subject);
    console.log('[EMAIL] Content:', htmlContent.substring(0, 200) + '...');
    return { success: true, devMode: true };
  }

  const requestBody = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: to }],
    subject,
    htmlContent,
    textContent: textContent || undefined,
  };

  console.log('[EMAIL] ===== BREVO EMAIL REQUEST =====');
  console.log('[EMAIL] Brevo URL:', `${BREVO_API_URL}/smtp/email`);
  console.log('[EMAIL] Sender Email:', senderEmail);
  console.log('[EMAIL] Recipient:', to);
  console.log('[EMAIL] Subject:', subject);
  console.log('[EMAIL] API Key Present:', !!apiKey);

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
        timeout: 30000,
      }
    );

    console.log('[EMAIL] Response Status:', response.status);
    if (response.status === 201 || response.status === 200) {
      console.log('[EMAIL] Email sent successfully to:', to);
      return { success: true, messageId: response.data?.messageId, status: response.status };
    } else {
      console.error('[EMAIL] Unexpected response status:', response.status);
      return { success: false, error: `Unexpected status code: ${response.status}`, status: response.status };
    }
  } catch (error) {
    console.error('[EMAIL] ===== BREVO REQUEST FAILED =====');
    console.error('[EMAIL] Error Message:', error.message);
    if (error.response) {
      const brevoError = error.response.data;
      const errorMessage = brevoError.message || `Brevo error code: ${brevoError.code}` || 'Unknown Brevo error';
      console.error('[EMAIL] Brevo Error:', errorMessage);
      return { success: false, error: errorMessage, code: brevoError.code, status: error.response.status };
    } else if (error.request) {
      console.error('[EMAIL] No response received from Brevo');
      return { success: false, error: 'No response from Brevo API. Check network connection.' };
    } else {
      return { success: false, error: error.message };
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  Shared HTML wrapper
// ─────────────────────────────────────────────────────────────────────────────
const emailWrapper = (bodyHtml) => `
  <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f0f4f8;">
    <div style="background: linear-gradient(135deg, #FF5E00 0%, #E05000 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -1px;">⚡ Olafasta</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">Fasta Fasta — Everything You Need</p>
    </div>
    <div style="background: #ffffff; padding: 36px 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
      ${bodyHtml}
      <p style="color: #94a3b8; font-size: 11px; margin-top: 32px; text-align: center;">
        This is an automated message from Olafasta · <a href="https://olafasta.com" style="color: #FF5E00;">olafasta.com</a><br/>
        Support: +254 748 459757 | 0707 841 747
      </p>
    </div>
  </div>
`;

// ─────────────────────────────────────────────────────────────────────────────
//  Exported email functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send email verification code
 */
export const sendVerificationEmail = async (email, code) => {
  console.log('[EMAIL SERVICE] sendVerificationEmail called with:', { email, codeLength: code?.length, code });

  const htmlContent = emailWrapper(`
    <h2 style="color: #0f172a; margin-top: 0; font-size: 22px; font-weight: 700;">Verify Your Email 🔐</h2>
    <p style="color: #475569; line-height: 1.7;">Habari! You're almost in. Enter the code below to verify your Olafasta account and start enjoying fasta fasta service:</p>
    <div style="background: #fff7f0; border: 2px solid #FF5E00; border-radius: 10px; padding: 24px; text-align: center; margin: 24px 0;">
      <span style="font-size: 38px; font-weight: 900; color: #FF5E00; letter-spacing: 10px;">${code}</span>
    </div>
    <p style="color: #64748b; line-height: 1.7; font-size: 14px;">This code expires in <strong>15 minutes</strong>. If you didn't create an Olafasta account, ignore this email.</p>
  `);

  const textContent = `Olafasta Email Verification\n\nYour verification code is: ${code}\n\nExpires in 15 minutes. Visit https://olafasta.com\nSupport: +254 748 459757`;

  return sendEmail(email, '🔐 Verify your Olafasta account', htmlContent, textContent);
};

/**
 * Send password reset code
 */
export const sendPasswordResetEmail = async (email, code) => {
  const htmlContent = emailWrapper(`
    <h2 style="color: #0f172a; margin-top: 0; font-size: 22px; font-weight: 700;">Reset Your Password 🔑</h2>
    <p style="color: #475569; line-height: 1.7;">We received a request to reset your Olafasta password. Use the code below to proceed:</p>
    <div style="background: #fff7f0; border: 2px solid #FF5E00; border-radius: 10px; padding: 24px; text-align: center; margin: 24px 0;">
      <span style="font-size: 38px; font-weight: 900; color: #FF5E00; letter-spacing: 10px;">${code}</span>
    </div>
    <p style="color: #64748b; line-height: 1.7; font-size: 14px;">This code expires in <strong>15 minutes</strong>. If you didn't request a reset, your password remains safe — just ignore this email.</p>
  `);

  const textContent = `Olafasta Password Reset\n\nYour reset code is: ${code}\n\nExpires in 15 minutes. If you did not request this, ignore this email.`;

  return sendEmail(email, '🔑 Reset your Olafasta password', htmlContent, textContent);
};

/**
 * Send password reset confirmation
 */
export const sendPasswordResetConfirmation = async (email) => {
  const htmlContent = emailWrapper(`
    <h2 style="color: #0f172a; margin-top: 0; font-size: 22px; font-weight: 700;">Password Updated ✅</h2>
    <p style="color: #475569; line-height: 1.7;">Your Olafasta password has been successfully changed. You're all set!</p>
    <div style="background: #f0fdf4; border: 2px solid #027A2B; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0;">
      <span style="font-size: 22px; font-weight: 700; color: #027A2B;">✓ Password Changed Successfully</span>
    </div>
    <p style="color: #64748b; font-size: 14px;">If you didn't make this change, contact us immediately at <strong>+254 748 459757</strong>.</p>
  `);

  const textContent = `Olafasta — Password Changed\n\nYour password was successfully updated. If this wasn't you, contact support: +254 748 459757`;

  return sendEmail(email, '✅ Your Olafasta password was changed', htmlContent, textContent);
};

/**
 * Send welcome email after verification
 */
export const sendWelcomeEmail = async (email, name, role) => {
  const roleLabels = {
    customer: 'Comrade',
    landlord: 'Landlord',
    business: 'Business Owner',
    rider: 'Rider',
  };

  const htmlContent = emailWrapper(`
    <h2 style="color: #0f172a; margin-top: 0; font-size: 22px; font-weight: 700;">Welcome to Olafasta, ${name}! 🎉</h2>
    <p style="color: #475569; line-height: 1.7;">
      Karibu sana! You've joined as a <strong style="color: #FF5E00;">${roleLabels[role] || role}</strong>.
      Olafasta is your one-stop campus super-app — fasta fasta, everything you need is right here.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${process.env.FRONTEND_URL || 'https://olafasta.com'}"
         style="background: #FF5E00; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 700; font-size: 16px;">
        Go to Dashboard ⚡
      </a>
    </div>
    <p style="color: #64748b; font-size: 13px; text-align: center;">
      Need help? Reach us on <strong>+254 748 459757</strong> or <strong>0707 841 747</strong>
    </p>
  `);

  const textContent = `Welcome to Olafasta, ${name}!\n\nYou've joined as a ${roleLabels[role] || role}. Fasta fasta — everything you need is right here.\n\nVisit: ${process.env.FRONTEND_URL || 'https://olafasta.com'}\nSupport: +254 748 459757`;

  return sendEmail(email, `🎉 Welcome to Olafasta, ${name}!`, htmlContent, textContent);
};

export default {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordResetConfirmation,
  sendWelcomeEmail,
};
