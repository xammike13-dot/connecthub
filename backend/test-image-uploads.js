/**
 * End-to-End Image Upload Test Script
 * 
 * This script tests all image upload functionality in the ConnectHub application.
 * It performs actual uploads and verifies the complete flow.
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
// Use a real image file that exists in uploads folder (148KB PNG)
const TEST_IMAGE_PATH = path.join(__dirname, 'uploads', 'images-1779206279623-46842416.png');

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  modules: {}
};

// Helper: Get test image path and verify it exists
function getTestImagePath() {
  if (!fs.existsSync(TEST_IMAGE_PATH)) {
    throw new Error(`Test image not found at: ${TEST_IMAGE_PATH}`);
  }
  const stats = fs.statSync(TEST_IMAGE_PATH);
  console.log('Using test image:', TEST_IMAGE_PATH, `(${stats.size} bytes)`);
  return TEST_IMAGE_PATH;
}

// Helper: Register a test user and get token
async function registerAndLogin(role) {
  const email = `test_${role}_${Date.now()}@test.com`;
  const password = 'TestPassword123!';
  
  const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
    name: `Test ${role}`,
    email: email,
    phone: `07${Date.now().toString().slice(-8)}`,
    password: password,
    role: role
  });
  
  const token = registerResponse.data.token;
  const userId = registerResponse.data.user.id;
  
  console.log(`Registered ${role} user:`, { email, userId });
  
  return { token, userId, email, password };
}

// Helper: Upload single image
async function uploadSingleImage(token, imagePath) {
  const formData = new FormData();
  const file = fs.createReadStream(imagePath);
  formData.append('image', file, { filename: 'test-image.png', contentType: 'image/png' });
  
  const response = await axios.post(`${API_BASE_URL}/upload/single`, formData, {
    headers: {
      'Authorization': `Bearer ${token}`,
      ...formData.getHeaders()
    }
  });
  
  return response.data;
}

// Helper: Upload multiple images
async function uploadMultipleImages(token, imagePaths) {
  const formData = new FormData();
  imagePaths.forEach((imgPath, index) => {
    const file = fs.createReadStream(imgPath);
    formData.append('images', file, { filename: `test-image-${index}.png`, contentType: 'image/png' });
  });
  
  const response = await axios.post(`${API_BASE_URL}/upload/multiple`, formData, {
    headers: {
      'Authorization': `Bearer ${token}`,
      ...formData.getHeaders()
    }
  });
  
  return response.data;
}

// Test Module 1: Rider Profile Photo Upload
async function testRiderProfilePhoto() {
  console.log('\n=== Testing Rider Profile Photo Upload ===');
  const result = { status: 'FAIL', details: {} };
  
  try {
    const { token, userId } = await registerAndLogin('rider');
    result.details.userId = userId;
    
    const imagePath = getTestImagePath();
    console.log('Uploading image from:', imagePath);
    
    const uploadResult = await uploadSingleImage(token, imagePath);
    console.log('Upload response:', JSON.stringify(uploadResult, null, 2));
    
    result.details.uploadResponse = uploadResult;
    result.details.imageUrl = uploadResult.data?.url;
    result.details.publicId = uploadResult.data?.publicId;
    
    const updateResponse = await axios.put(
      `${API_BASE_URL}/rider/profile`,
      {
        riderProfile: {
          profilePhoto: uploadResult.data?.url,
          vehicleType: 'Motorcycle',
          vehicleNumber: 'KBA 123A',
          workingArea: 'Nairobi'
        }
      },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    console.log('Profile update response:', JSON.stringify(updateResponse.data, null, 2));
    result.details.profileUpdate = updateResponse.data;
    
    const profileResponse = await axios.get(`${API_BASE_URL}/rider/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const storedProfilePhoto = profileResponse.data.data?.user?.riderProfile?.profilePhoto;
    console.log('Stored profile photo URL:', storedProfilePhoto);
    result.details.storedProfilePhoto = storedProfilePhoto;
    
    if (storedProfilePhoto && storedProfilePhoto.includes('cloudinary.com')) {
      result.status = 'PASS';
      result.details.verified = true;
    } else {
      result.status = 'FAIL';
      result.details.error = 'Profile photo URL not stored correctly in MongoDB';
    }
    
  } catch (error) {
    result.status = 'FAIL';
    result.details.error = error.response?.data?.message || error.message;
    console.error('Test failed:', error.response?.data || error.message);
  }
  
  return result;
}

// Test Module 2: Business Logo Upload
async function testBusinessLogo() {
  console.log('\n=== Testing Business Logo Upload ===');
  const result = { status: 'FAIL', details: {} };
  
  try {
    const { token, userId } = await registerAndLogin('business');
    result.details.userId = userId;
    
    const imagePath = getTestImagePath();
    const uploadResult = await uploadSingleImage(token, imagePath);
    console.log('Upload response:', JSON.stringify(uploadResult, null, 2));
    
    result.details.uploadResponse = uploadResult;
    result.details.imageUrl = uploadResult.data?.url;
    
    const updateResponse = await axios.put(
      `${API_BASE_URL}/business/profile`,
      {
        businessName: 'Test Business',
        businessLogo: uploadResult.data?.url,
        businessDescription: 'A test business'
      },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    console.log('Business profile update response:', JSON.stringify(updateResponse.data, null, 2));
    result.details.profileUpdate = updateResponse.data;
    
    const profileResponse = await axios.get(`${API_BASE_URL}/business/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const storedLogo = profileResponse.data.data?.user?.businessProfile?.businessLogo;
    console.log('Stored business logo URL:', storedLogo);
    result.details.storedLogo = storedLogo;
    
    if (storedLogo && storedLogo.includes('cloudinary.com')) {
      result.status = 'PASS';
      result.details.verified = true;
    } else {
      result.status = 'FAIL';
      result.details.error = 'Business logo URL not stored correctly in MongoDB';
    }
    
  } catch (error) {
    result.status = 'FAIL';
    result.details.error = error.response?.data?.message || error.message;
    console.error('Test failed:', error.response?.data || error.message);
  }
  
  return result;
}

// Test Module 3: Product Image Upload
async function testProductImages() {
  console.log('\n=== Testing Product Image Upload ===');
  const result = { status: 'FAIL', details: {} };
  
  try {
    const { token, userId } = await registerAndLogin('business');
    result.details.userId = userId;
    
    const imagePath = getTestImagePath();
    const uploadResult = await uploadMultipleImages(token, [imagePath, imagePath]);
    console.log('Upload response:', JSON.stringify(uploadResult, null, 2));
    
    result.details.uploadResponse = uploadResult;
    result.details.imageUrls = uploadResult.data?.data?.map(img => img.url);
    
    const productData = {
      name: 'Test Product',
      description: 'A test product',
      price: 1000,
      category: 'food-stuffs',
      stock: 10,
      images: uploadResult.data?.data?.map(img => img.url) || []
    };
    
    const createResponse = await axios.post(
      `${API_BASE_URL}/products`,
      productData,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    console.log('Product create response:', JSON.stringify(createResponse.data, null, 2));
    result.details.productCreate = createResponse.data;
    
    const productId = createResponse.data.data._id;
    const productResponse = await axios.get(`${API_BASE_URL}/products/${productId}`);
    const storedImages = productResponse.data.data?.images;
    console.log('Stored product images:', storedImages);
    result.details.storedImages = storedImages;
    
    if (storedImages && storedImages.length > 0 && storedImages[0].includes('cloudinary.com')) {
      result.status = 'PASS';
      result.details.verified = true;
    } else {
      result.status = 'FAIL';
      result.details.error = 'Product images not stored correctly in MongoDB';
    }
    
  } catch (error) {
    result.status = 'FAIL';
    result.details.error = error.response?.data?.message || error.message;
    console.error('Test failed:', error.response?.data || error.message);
  }
  
  return result;
}

// Test Module 4: Rental Image Upload
async function testRentalImages() {
  console.log('\n=== Testing Rental Image Upload ===');
  const result = { status: 'FAIL', details: {} };
  
  try {
    const { token, userId } = await registerAndLogin('landlord');
    result.details.userId = userId;
    
    const imagePath = getTestImagePath();
    const uploadResult = await uploadMultipleImages(token, [imagePath]);
    console.log('Upload response:', JSON.stringify(uploadResult, null, 2));
    
    result.details.uploadResponse = uploadResult;
    result.details.imageUrls = uploadResult.data?.data?.map(img => img.url);
    
    const rentalData = {
      rentalName: 'Test Apartment',
      rentalType: 'bedsitter',
      monthlyPrice: 15000,
      location: 'stage',
      amenities: ['wifi', 'security'],
      description: 'A test rental property',
      images: uploadResult.data?.data?.map(img => ({
        url: img.url,
        publicId: img.publicId
      })) || []
    };
    
    const createResponse = await axios.post(
      `${API_BASE_URL}/rentals`,
      rentalData,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    console.log('Rental create response:', JSON.stringify(createResponse.data, null, 2));
    result.details.rentalCreate = createResponse.data;
    
    const rentalId = createResponse.data.data._id;
    const rentalResponse = await axios.get(`${API_BASE_URL}/rentals/${rentalId}`);
    const storedImages = rentalResponse.data.data?.images;
    console.log('Stored rental images:', storedImages);
    result.details.storedImages = storedImages;
    
    if (storedImages && storedImages.length > 0 && storedImages[0].url?.includes('cloudinary.com')) {
      result.status = 'PASS';
      result.details.verified = true;
    } else {
      result.status = 'FAIL';
      result.details.error = 'Rental images not stored correctly in MongoDB';
    }
    
  } catch (error) {
    result.status = 'FAIL';
    result.details.error = error.response?.data?.message || error.message;
    console.error('Test failed:', error.response?.data || error.message);
  }
  
  return result;
}

// Main test runner
async function runAllTests() {
  console.log('========================================');
  console.log('CONNECTHUB IMAGE UPLOAD E2E TESTS');
  console.log('========================================');
  console.log('Timestamp:', new Date().toISOString());
  console.log('API Base URL:', API_BASE_URL);
  console.log('========================================\n');
  
  try {
    await axios.get(`${API_BASE_URL}/health`);
    console.log('✓ Backend server is running');
  } catch (error) {
    console.error('✗ Backend server is not running. Please start the server first.');
    process.exit(1);
  }
  
  testResults.modules.riderProfilePhoto = await testRiderProfilePhoto();
  testResults.modules.businessLogo = await testBusinessLogo();
  testResults.modules.productImages = await testProductImages();
  testResults.modules.rentalImages = await testRentalImages();
  
  console.log('\n========================================');
  console.log('TEST SUMMARY');
  console.log('========================================');
  
  let passCount = 0;
  let failCount = 0;
  
  Object.entries(testResults.modules).forEach(([module, result]) => {
    const status = result.status === 'PASS' ? '✓ PASS' : '✗ FAIL';
    console.log(`${status}: ${module}`);
    if (result.status === 'PASS') passCount++;
    else failCount++;
  });
  
  console.log('\nTotal:', passCount, 'passed,', failCount, 'failed');
  console.log('========================================');
  
  const resultsPath = path.join(__dirname, 'test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
  console.log('\nFull test results saved to:', resultsPath);
  
  process.exit(failCount > 0 ? 1 : 0);
}

runAllTests().catch(console.error);