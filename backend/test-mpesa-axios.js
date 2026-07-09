/**
 * MPESA Credentials Test using Axios (matches server implementation)
 * Run this to verify your Daraja API credentials with axios
 * Usage: node test-mpesa-axios.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('═══════════════════════════════════════════════════════════');
console.log('  MPESA Credentials Test (using Axios)');
console.log('═══════════════════════════════════════════════════════════\n');

const consumerKey = process.env.MPESA_CONSUMER_KEY;
const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
const environment = process.env.MPESA_ENVIRONMENT || 'sandbox';

console.log('Configuration:');
console.log(`  Consumer Key: ${consumerKey ? consumerKey.substring(0, 10) + '...' : 'MISSING'}`);
console.log(`  Consumer Secret: ${consumerSecret ? consumerSecret.substring(0, 10) + '...' : 'MISSING'}`);
console.log(`  Environment: ${environment}\n`);

if (!consumerKey || !consumerSecret) {
  console.error('❌ ERROR: Missing credentials');
  process.exit(1);
}

console.log('Testing OAuth token generation with axios...');
const baseUrl = environment === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

console.log(`  URL: ${baseUrl}/oauth/v1/generate?grant_type=client_credentials`);
console.log(`  Auth: Basic ${auth.substring(0, 20)}...\n`);

axios.get(
  `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
  {
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
  }
)
.then(response => {
  console.log(`  Response Status: ${response.status} ${response.statusText}`);
  console.log(`  Response Data:`, JSON.stringify(response.data).substring(0, 100) + '...');
  
  if (response.data.access_token) {
    console.log('\n✅ SUCCESS! Access token generated using axios.');
    console.log(`  Token: ${response.data.access_token.substring(0, 20)}...`);
    console.log(`  Length: ${response.data.access_token.length} characters`);
    console.log('\nYour MPESA credentials are valid and axios is working correctly!');
  } else {
    console.log('\n❌ ERROR: No access_token in response');
  }
})
.catch(error => {
  console.log(`\n❌ ERROR: ${error.message}`);
  if (error.response) {
    console.log(`  Status: ${error.response.status}`);
    console.log(`  Data: ${JSON.stringify(error.response.data)}`);
    console.log(`  Headers: ${JSON.stringify(error.response.headers)}`);
  } else if (error.request) {
    console.log('  No response received from server');
  }
});