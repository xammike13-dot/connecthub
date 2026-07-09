/**
 * MPESA Credentials Test Script
 * Run this to verify your Daraja API credentials
 * Usage: node test-mpesa-credentials.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('═══════════════════════════════════════════════════════════');
console.log('  MPESA Credentials Test');
console.log('═══════════════════════════════════════════════════════════\n');

const consumerKey = process.env.MPESA_CONSUMER_KEY;
const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
const shortcode = process.env.MPESA_SHORTCODE;
const passkey = process.env.MPESA_PASSKEY;
const environment = process.env.MPESA_ENVIRONMENT || 'sandbox';

console.log('Configuration:');
console.log(`  Consumer Key: ${consumerKey ? consumerKey.substring(0, 10) + '...' : 'MISSING'}`);
console.log(`  Consumer Secret: ${consumerSecret ? consumerSecret.substring(0, 10) + '...' : 'MISSING'}`);
console.log(`  Shortcode: ${shortcode || 'MISSING'}`);
console.log(`  Passkey: ${passkey ? passkey.substring(0, 10) + '...' : 'MISSING'}`);
console.log(`  Environment: ${environment}\n`);

// Validate required fields
const missing = [];
if (!consumerKey) missing.push('MPESA_CONSUMER_KEY');
if (!consumerSecret) missing.push('MPESA_CONSUMER_SECRET');
if (!shortcode) missing.push('MPESA_SHORTCODE');
if (!passkey) missing.push('MPESA_PASSKEY');

if (missing.length > 0) {
  console.error('❌ ERROR: Missing required configuration:');
  missing.forEach(key => console.error(`   - ${key}`));
  console.error('\nPlease update backend/.env with valid credentials.');
  process.exit(1);
}

console.log('✓ All required configuration is present.\n');

// Test OAuth token generation
console.log('Testing OAuth token generation...');
console.log(`  Endpoint: https://${environment === 'production' ? 'api' : 'sandbox'}.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials\n`);

const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

fetch(`https://${environment === 'production' ? 'api' : 'sandbox'}.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`, {
  method: 'GET',
  headers: {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
  },
})
.then(response => {
  console.log(`  Response Status: ${response.status} ${response.statusText}`);
  
  if (response.status === 200) {
    return response.json().then(data => {
      console.log('\n✅ SUCCESS! Access token generated.');
      console.log(`  Token: ${data.access_token.substring(0, 20)}...`);
      console.log(`  Length: ${data.access_token.length} characters`);
      console.log('\nYour MPESA credentials are valid!');
    });
  } else if (response.status === 400) {
    console.log('\n❌ ERROR 400: Bad Request');
    console.log('  This usually means your Consumer Key or Consumer Secret is invalid.');
    console.log('  Possible causes:');
    console.log('    1. Credentials are expired or revoked');
    console.log('    2. Credentials are from production but using sandbox URL (or vice versa)');
    console.log('    3. There\'s a typo in the credentials');
    console.log('\n  Solution: Get fresh credentials from https://developer.safaricom.co.ke/');
    console.log('    - Go to My Apps');
    console.log('    - Select your sandbox app');
    console.log('    - Click "Show Consumer Secret" to get new credentials');
    console.log('    - Update backend/.env with the new values');
  } else if (response.status === 401) {
    console.log('\n❌ ERROR 401: Unauthorized');
    console.log('  Your Consumer Key or Consumer Secret is incorrect.');
    console.log('  Solution: Get fresh credentials from https://developer.safaricom.co.ke/');
  } else {
    return response.text().then(text => {
      console.log(`\n❌ ERROR ${response.status}: ${text}`);
    });
  }
})
.catch(error => {
  console.log(`\n❌ ERROR: ${error.message}`);
  console.log('  Could not connect to Safaricom Daraja API.');
  console.log('  Check your internet connection.');
});