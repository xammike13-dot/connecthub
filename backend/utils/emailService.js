// backend/utils/emailService.js
// Enterprise Non-Blocking Automated Email Dispatcher for Olafasta
// Supports Brevo Transactional Email API with Nodemailer SMTP fallback

import axios from 'axios';
import nodemailer from 'nodemailer';
import { getWelcomeEmailTemplate, getVerificationEmailTemplate } from './emailTemplates.js';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const getBrevoApiKey = () => process.env.BREVO_API_KEY?.trim();
const getSenderEmail = () => process.env.BREVO_SENDER_EMAIL?.trim() || process.env.SMTP_USER?.trim() || 'support@olafasta.com';
const getSenderName = () => process.env.BREVO_SENDER_NAME?.trim() || 'Olafasta';

/**
 * Creates SMTP transporter if credentials are configured
 */
const getSmtpTransporter = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

/**
 * Core sendEmail function
 * Prioritizes Brevo API, falls back to SMTP, and gracefully logs in dev mode
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  const senderEmail = getSenderEmail();
  const senderName = getSenderName();
  const brevoKey = getBrevoApiKey();

  if (!to || !/^\S+@\S+\.\S+$/.test(String(to).trim())) {
    console.warn('[EMAIL] Skipping dispatch: invalid recipient email:', to);
    return { success: false, error: 'Invalid recipient email' };
  }

  // 1. Attempt Brevo API if key is present
  if (brevoKey && brevoKey !== 'your-brevo-api-key-here' && brevoKey.length > 10) {
    try {
      const response = await axios.post(
        BREVO_API_URL,
        {
          sender: { name: senderName, email: senderEmail },
          to: [{ email: to.trim() }],
          subject,
          htmlContent: html,
          textContent: text || undefined,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'api-key': brevoKey,
            'Accept': 'application/json',
          },
          timeout: 15000,
        }
      );

      if (response.status === 200 || response.status === 201) {
        console.log(`[EMAIL] Dispatched via Brevo to ${to} (MessageId: ${response.data?.messageId || 'OK'})`);
        return { success: true, provider: 'brevo', messageId: response.data?.messageId };
      }
    } catch (brevoErr) {
      console.warn('[EMAIL] Brevo API attempt failed, attempting fallback:', brevoErr.response?.data?.message || brevoErr.message);
    }
  }

  // 2. Attempt SMTP Transporter fallback
  const transporter = getSmtpTransporter();
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: to.trim(),
        subject,
        html,
        text,
      });
      console.log(`[EMAIL] Dispatched via SMTP to ${to} (MessageId: ${info.messageId})`);
      return { success: true, provider: 'smtp', messageId: info.messageId };
    } catch (smtpErr) {
      console.warn('[EMAIL] SMTP attempt failed:', smtpErr.message);
    }
  }

  // 3. Fallback / Dev Mode
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`[EMAIL DEV MODE] Simulated Email to: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log('════════════════════════════════════════════════════════════════');
  return { success: true, provider: 'devMode', devMode: true };
};

/**
 * Non-Blocking Welcome Email Dispatcher
 * @param {string} email
 * @param {string} name
 * @param {Object} [options]
 */
export const sendWelcomeEmail = async (email, name = '', options = {}) => {
  try {
    const template = getWelcomeEmailTemplate({ name, dashboardUrl: options.dashboardUrl });
    return await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  } catch (err) {
    // Non-blocking: never let email failure interrupt user signup
    console.error('[EMAIL ERROR] Failed to send welcome email:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Non-Blocking Email Verification Code Dispatcher
 * @param {string} email
 * @param {string} code
 * @param {Object} [options]
 */
export const sendVerificationEmail = async (email, code, options = {}) => {
  try {
    const template = getVerificationEmailTemplate({ name: options.name || '', code });
    return await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  } catch (err) {
    console.error('[EMAIL ERROR] Failed to send verification email:', err.message);
    return { success: false, error: err.message };
  }
};

export default {
  sendEmail,
  sendWelcomeEmail,
  sendVerificationEmail,
};
