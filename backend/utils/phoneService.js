// Phone/WhatsApp Verification Service
// This service can be configured with WhatsApp Business API, Twilio, or any SMS/WhatsApp provider
import crypto from 'crypto';

const generateVerificationCode = () => {
  // Generate secure 6-digit OTP
  return crypto.randomInt(100000, 1000000).toString();
};

const normalizePhoneNumber = (phone) => {
  if (!phone) {
    return '';
  }

  const digits = String(phone).replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  return digits.startsWith('00') ? digits.slice(2) : digits;
};

const extractPhoneNumberId = (whatsappApiUrl) => {
  try {
    const urlParts = whatsappApiUrl.split('/').filter(Boolean);
    const messagesIndex = urlParts.findIndex((part) => part === 'messages');
    if (messagesIndex > 0) {
      return urlParts[messagesIndex - 1];
    }
  } catch (err) {
    return null;
  }

  return null;
};

export const buildWhatsAppPayload = (phone, code, options = {}) => {
  const templateName = options.templateName || process.env.WHATSAPP_TEMPLATE_NAME || 'auth_code';
  const languageCode = options.languageCode || process.env.WHATSAPP_TEMPLATE_LANGUAGE_CODE || 'en_US';

  return {
    messaging_product: 'whatsapp',
    to: normalizePhoneNumber(phone),
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      components: [
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: String(code),
            },
          ],
        },
      ],
    },
  };
};

// Send WhatsApp verification code
// Configure your WhatsApp Business API or Twilio credentials in .env
export const sendWhatsAppVerification = async (phone, code) => {
  try {
    const whatsappApiUrl = process.env.WHATSAPP_API_URL;
    const whatsappApiToken = process.env.WHATSAPP_API_TOKEN;

    if (!whatsappApiUrl || !whatsappApiToken) {
      console.warn('WhatsApp API not configured. Verification code:', code);
      return { success: true, devMode: true };
    }

    const tokenPreview = whatsappApiToken ? whatsappApiToken.slice(0, 15) : '';
    const tokenExists = Boolean(whatsappApiToken);
    const phoneNumberId = extractPhoneNumberId(whatsappApiUrl);

    console.log('WhatsApp debug: Graph API URL=', whatsappApiUrl);
    console.log('WhatsApp debug: token startsWith=', tokenPreview);
    console.log('WhatsApp debug: token exists=', tokenExists);
    console.log('WhatsApp debug: phone number ID=', phoneNumberId);
    console.log('WhatsApp debug: recipient phone=', normalizePhoneNumber(phone));

    let bodyPayload = {
      to: phone,
      message: `Your ConnectHub verification code is: ${code}. This code will expire in 5 minutes.`,
    };

    if (whatsappApiUrl.includes('graph.facebook.com') || whatsappApiUrl.includes('whatsapp.com')) {
      bodyPayload = buildWhatsAppPayload(phone, code, {
        templateName: process.env.WHATSAPP_TEMPLATE_NAME || 'auth_code',
        languageCode: process.env.WHATSAPP_TEMPLATE_LANGUAGE_CODE || 'en_US',
      });
    }

    const payloadText = JSON.stringify(bodyPayload);
    console.log('WhatsApp payload (without token):', payloadText);
    console.log('WhatsApp payload verification: messaging_product=', bodyPayload.messaging_product);
    console.log('WhatsApp payload verification: recipient phone=', bodyPayload.to);
    console.log('WhatsApp payload verification: template name=', bodyPayload.template?.name);
    console.log('WhatsApp payload verification: language code=', bodyPayload.template?.language?.code);
    console.log('WhatsApp payload verification: phone number ID=', phoneNumberId);

    const response = await fetch(whatsappApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${whatsappApiToken}`,
        'Content-Type': 'application/json',
      },
      body: payloadText,
    });

    let respText = '';
    try {
      respText = await response.text();
    } catch (e) {
      respText = `<unable to read response body: ${e.message}>`;
    }

    console.log('WhatsApp response body:', respText);

    if (!response.ok) {
      console.error('WhatsApp API responded with non-OK status', response.status, respText);

      if (response.status === 401 || response.status === 400) {
        console.warn('WhatsApp authentication failed. Check WHATSAPP_API_TOKEN and WHATSAPP_API_URL in your .env.');
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Falling back to dev-mode: returning success with OTP in dev response. Do NOT enable in production.');
          return { success: true, devMode: true, devCode: code };
        }
      }

      throw new Error(`Failed to send WhatsApp message: ${response.status} ${respText}`);
    }

    return { success: true, payload: bodyPayload, responseBody: respText };
  } catch (error) {
    console.error('WhatsApp sending error:', error);
    return { success: false, error: error.message };
  }
};

// Alternative: Send SMS verification (using Twilio or similar)
export const sendSMSVerification = async (phone, code) => {
  try {
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.warn('Twilio not configured. Verification code:', code);
      // For development, return success without actually sending
      return { success: true, devMode: true };
    }
    
    // Example using Twilio SDK (install with: npm install twilio)
    // const client = require('twilio')(twilioAccountSid, twilioAuthToken);
    // await client.messages.create({
    //   body: `Your ConnectHub verification code is: ${code}. This code will expire in 15 minutes.`,
    //   from: twilioPhoneNumber,
    //   to: phone,
    // });
    
    console.warn('Twilio SDK not installed. Install with: npm install twilio');
    return { success: true, devMode: true };
  } catch (error) {
    console.error('SMS sending error:', error);
    return { success: false, error: error.message };
  }
};

export { generateVerificationCode };
