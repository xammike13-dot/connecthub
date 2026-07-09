import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWhatsAppPayload } from '../utils/phoneService.js';

test('builds a Meta authentication template payload for WhatsApp', () => {
  const payload = buildWhatsAppPayload('+254712345678', '123456');

  assert.deepEqual(payload, {
    messaging_product: 'whatsapp',
    to: '254712345678',
    type: 'template',
    template: {
      name: 'auth_code',
      language: { code: 'en_US' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: '123456' }
          ]
        }
      ]
    }
  });
});
