// backend/utils/emailTemplates.js
// High-Converting, Mobile-Responsive Branded Email Templates for Olafasta

/**
 * Generates the HTML and Plain Text Welcome Email for new Olafasta users
 * @param {Object} params
 * @param {string} params.name - Full name of the user
 * @param {string} [params.dashboardUrl] - Optional target URL (defaults to ${CLIENT_URL}/customer/dashboard)
 * @returns {{ subject: string, html: string, text: string }}
 */
export const getWelcomeEmailTemplate = ({ name = '', dashboardUrl }) => {
  const firstName = name.trim().split(' ')[0] || 'Comrade';
  const clientUrl = (process.env.CLIENT_URL || process.env.FRONTEND_URL || 'https://olafasta.com').replace(/\/$/, '');
  const targetUrl = dashboardUrl || `${clientUrl}/customer/dashboard`;

  const subject = `Welcome to Olafasta, ${firstName}! ⚡ Your campus plug is ready`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Olafasta</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F8FAFC; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); border: 1px solid #E2E8F0;">
          
          <!-- Brand Header -->
          <tr>
            <td style="background-color: #FF5E00; background: linear-gradient(135deg, #FF5E00 0%, #E65500 100%); padding: 36px 30px; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 32px; font-weight: 900; letter-spacing: -0.5px;">
                Olafasta
              </h1>
              <p style="margin: 6px 0 0 0; color: #FFF0E5; font-size: 14px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">
                FASTA FASTA ⚡
              </p>
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="margin: 0 0 16px 0; color: #0F172A; font-size: 22px; font-weight: 800;">
                Hey ${firstName},
              </h2>

              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.7; color: #334155;">
                Welcome to <strong>Olafasta</strong> — your ultimate campus plug for hot food, gas refills, boda rides, mitumba, and hostels around Moi University.
              </p>

              <!-- Feature Highlights Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FFF0E5; border-radius: 12px; margin: 24px 0; border: 1px solid #FFE4CC;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 800; color: #FF5E00; text-transform: uppercase; letter-spacing: 0.5px;">
                      What you can do right now:
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #334155; line-height: 1.5;">
                          🍔 <strong>Hot Food & Snacks:</strong> Order from your favorite campus kibandas & joints fast.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #334155; line-height: 1.5;">
                          ⚡ <strong>Gas Refills:</strong> Seamless cylinder refill deliveries right to your room.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #334155; line-height: 1.5;">
                          🏍️ <strong>Boda Rides:</strong> Fixed, transparent rates with verified riders in Stage & Kesses.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #334155; line-height: 1.5;">
                          👗 <strong>Mitumba & Tech:</strong> Thrift drip and campus essentials delivered fast.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Primary Call To Action Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${targetUrl}" target="_blank" style="background-color: #FF5E00; color: #FFFFFF; font-size: 15px; font-weight: 800; text-decoration: none; padding: 14px 34px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 12px rgba(255, 94, 0, 0.35); text-align: center;">
                      Explore My Dashboard →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.6; color: #64748B;">
                Need anything delivered to your hostel or room? We've got you covered 24/7.
              </p>
            </td>
          </tr>

          <!-- Footer Information -->
          <tr>
            <td style="background-color: #F1F5F9; padding: 24px 30px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #475569;">
                Need help or have questions?
              </p>
              <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748B;">
                <a href="mailto:support@olafasta.com" style="color: #FF5E00; text-decoration: none; font-weight: 600;">support@olafasta.com</a> · 
                <a href="tel:+254748459757" style="color: #FF5E00; text-decoration: none; font-weight: 600;">+254 748 459757</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                © 2026 Olafasta Technologies. All rights reserved.<br>
                Empowering students across Moi University & beyond.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Hey ${firstName},

Welcome to Olafasta — your ultimate campus plug for hot food, gas refills, boda rides, mitumba, and hostels around Moi University.

Here is what you can do on Olafasta right now:
- Hot Food & Snacks: Order from your favorite campus joints fast.
- Gas Refills: Swift cylinder refill deliveries right to your door.
- Boda Rides: Fixed-rate rides with verified riders in Stage & Kesses.
- Mitumba & Tech: Thrift fashion and student essentials delivered.

Go to your dashboard: ${targetUrl}

Need support? Reach out anytime:
Email: support@olafasta.com
Phone: +254 748 459757

© 2026 Olafasta Technologies. All rights reserved.`;

  return { subject, html, text };
};

/**
 * Generates email verification template with 6-digit PIN code
 */
export const getVerificationEmailTemplate = ({ name = '', code }) => {
  const firstName = name.trim().split(' ')[0] || 'Comrade';
  const subject = `${code} is your Olafasta verification code 🔐`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your Olafasta Account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F8FAFC; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 580px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); border: 1px solid #E2E8F0;">
          <tr>
            <td style="background-color: #FF5E00; padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 30px; font-weight: 900;">Olafasta</h1>
              <p style="margin: 4px 0 0 0; color: #FFF0E5; font-size: 13px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">FASTA FASTA ⚡</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 30px; text-align: center;">
              <h2 style="margin: 0 0 12px 0; color: #0F172A; font-size: 22px; font-weight: 800;">Verify Your Email</h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Hey ${firstName}, use the verification code below to confirm your account:
              </p>
              <div style="background-color: #FFF0E5; border: 2px solid #FF5E00; border-radius: 12px; padding: 20px; margin: 20px auto; max-width: 260px;">
                <span style="font-size: 36px; font-weight: 900; color: #FF5E00; letter-spacing: 8px; font-family: monospace;">${code}</span>
              </div>
              <p style="margin: 20px 0 0 0; font-size: 13px; color: #64748B;">
                This code expires in <strong>15 minutes</strong>. Never share this code with anyone.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F1F5F9; padding: 20px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                Support: <a href="mailto:support@olafasta.com" style="color: #FF5E00; text-decoration: none;">support@olafasta.com</a> | +254 748 459757<br>
                © 2026 Olafasta Technologies.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Hey ${firstName},\n\nYour Olafasta verification code is: ${code}\n\nThis code expires in 15 minutes. Never share this code with anyone.\n\nSupport: support@olafasta.com | +254 748 459757\n© 2026 Olafasta Technologies.`;

  return { subject, html, text };
};
