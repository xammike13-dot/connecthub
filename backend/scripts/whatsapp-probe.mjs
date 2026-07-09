import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config({ path: new URL('../.env', import.meta.url) });

const url = process.env.WHATSAPP_API_URL;
const token = process.env.WHATSAPP_API_TOKEN;
const payload = {
  messaging_product: 'whatsapp',
  recipient_type: 'individual',
  to: '15551234567',
  type: 'template',
  template: {
    name: process.env.WHATSAPP_TEMPLATE_NAME || 'auth_code',
    language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE_CODE || 'en_US' },
    components: [{ type: 'body', parameters: [{ type: 'text', text: '123456' }] }],
  },
};

const res = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
});

const body = await res.text();
console.log(JSON.stringify({ status: res.status, body }, null, 2));
