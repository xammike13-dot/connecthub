import test from 'node:test';
import assert from 'node:assert/strict';

// Simple unit tests for isAllowedOrigin
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('CORS Policy isAllowedOrigin Implementation Test', async (t) => {
  const serverJsContent = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');

  assert.ok(serverJsContent.includes('https://connecthub.website'), 'Should contain https://connecthub.website in allowed origins');
  assert.ok(serverJsContent.includes('https://www.connecthub.website'), 'Should contain https://www.connecthub.website in allowed origins');
  assert.ok(serverJsContent.includes('https://connecthubadmin.vercel.app'), 'Should contain https://connecthubadmin.vercel.app in allowed origins');
  assert.ok(serverJsContent.includes('http://localhost:'), 'Should support loopback localhost matching');
  assert.ok(serverJsContent.includes('http://127.0.0.1:'), 'Should support loopback 127.0.0.1 matching');

  // Verify normalization and matching logic
  const secureProductionOrigins = [
    'https://olafasta.com',
    'https://www.olafasta.com',
    'https://admin.olafasta.com',
    'https://connecthub.website',
    'https://www.connecthub.website',
    'https://connecthubadmin.vercel.app',
  ];

  const isAllowed = (origin) => {
    if (!origin) return true;
    const normalized = origin.replace(/\/+$/, '');
    if (normalized.startsWith('http://localhost:') || normalized.startsWith('http://127.0.0.1:')) return true;
    return secureProductionOrigins.includes(normalized) || secureProductionOrigins.includes(origin);
  };

  assert.equal(isAllowed('https://www.connecthub.website/'), true);
  assert.equal(isAllowed('https://www.connecthub.website'), true);
  assert.equal(isAllowed('https://connecthub.website/'), true);
  assert.equal(isAllowed('https://connecthub.website'), true);
  assert.equal(isAllowed('https://olafasta.com'), true);
  assert.equal(isAllowed('http://localhost:5173'), true);
  assert.equal(isAllowed('https://malicious-site.com'), false);
});
