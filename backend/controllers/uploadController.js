import { v2 as cloudinary } from 'cloudinary';
import { asyncHandler, ResponseError } from '../middleware/error.js';
import fs from 'fs';
import path from 'path';

// Configure Cloudinary - this will be called lazily when needed
let cloudinaryConfigured = false;

function ensureCloudinaryConfigured() {
  if (!cloudinaryConfigured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    console.log('[UploadController] Cloudinary configured:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING',
      api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING',
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING',
    });
    cloudinaryConfigured = true;
  }
}

/**
 * Get upload signature for direct Cloudinary upload
 */
export const getUploadSignature = asyncHandler(async (req, res) => {
  ensureCloudinaryConfigured();
  
  const { folder = 'connecthub', public_id } = req.body;
  
  if (!folder) {
    throw new ResponseError('Folder name is required', 400);
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder, public_id },
    process.env.CLOUDINARY_API_SECRET
  );

  res.status(200).json({
    success: true,
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
    uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`,
  });
});

/**
 * Upload multiple images
 */
export const uploadImages = asyncHandler(async (req, res) => {
  ensureCloudinaryConfigured();
  
  console.log('[uploadImages] Received request');
  console.log('[uploadImages] req.files:', req.files ? req.files.length : 'UNDEFINED');
  console.log('[uploadImages] req.body:', req.body);

  if (!req.files || req.files.length === 0) {
    console.log('[uploadImages] No files uploaded');
    throw new ResponseError('No files uploaded', 400);
  }

  console.log('[uploadImages] Files received:', req.files.map(f => ({
    fieldname: f.fieldname,
    originalname: f.originalname,
    mimetype: f.mimetype,
    size: f.size,
    path: f.path,
  })));

  const uploadPromises = req.files.map(file => {
    console.log('[uploadImages] Uploading to Cloudinary:', file.path);
    return cloudinary.uploader.upload(file.path, {
      folder: 'connecthub',
      resource_type: 'auto',
    });
  });

  const results = await Promise.all(uploadPromises);
  console.log('[uploadImages] Cloudinary upload results:', results.map(r => ({
    public_id: r.public_id,
    secure_url: r.secure_url,
    format: r.format,
  })));

  const uploadedImages = results.map(result => ({
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
  }));

  // Clean up local files after successful Cloudinary upload
  req.files.forEach(file => {
    fs.unlink(file.path, (err) => {
      if (err) {
        console.log('[uploadImages] Error deleting local file:', file.path, err.message);
      } else {
        console.log('[uploadImages] Deleted local file:', file.path);
      }
    });
  });

  res.status(200).json({
    success: true,
    count: uploadedImages.length,
    data: uploadedImages,
  });
});

/**
 * Delete image from Cloudinary
 */
export const deleteImage = asyncHandler(async (req, res) => {
  ensureCloudinaryConfigured();
  
  const { publicId } = req.body;

  if (!publicId) {
    throw new ResponseError('Public ID is required', 400);
  }

  const result = await cloudinary.uploader.destroy(publicId);

  res.status(200).json({
    success: true,
    message: 'Image deleted successfully',
    data: result,
  });
});

/**
 * Upload single image
 */
export const uploadImage = asyncHandler(async (req, res) => {
  ensureCloudinaryConfigured();
  
  console.log('[uploadImage] ========== UPLOAD REQUEST START ==========');
  console.log('[uploadImage] Received request');
  console.log('[uploadImage] req.file:', req.file ? {
    fieldname: req.file.fieldname,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    path: req.file.path,
  } : 'UNDEFINED');
  console.log('[uploadImage] User ID:', req.user?._id);
  console.log('[uploadImage] User Role:', req.user?.role);

  if (!req.file) {
    console.error('[uploadImage] ERROR: No file uploaded');
    throw new ResponseError('No file uploaded', 400);
  }

  console.log('[uploadImage] Starting Cloudinary upload...');
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'connecthub',
      resource_type: 'auto',
    });

    console.log('[uploadImage] Cloudinary upload SUCCESS:', {
      public_id: result.public_id,
      secure_url: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
    });

    // Clean up local file after successful Cloudinary upload
    fs.unlink(req.file.path, (err) => {
      if (err) {
        console.error('[uploadImage] Error deleting local file:', req.file.path, err.message);
      } else {
        console.log('[uploadImage] Deleted local file:', req.file.path);
      }
    });

    console.log('[uploadImage] Sending response to client');
    res.status(200).json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
      },
    });
    console.log('[uploadImage] ========== UPLOAD REQUEST COMPLETE ==========');
  } catch (error) {
    console.error('[uploadImage] Cloudinary upload FAILED:', error);
    console.error('[uploadImage] Error details:', {
      message: error.message,
      code: error.code,
      http_code: error.http_code,
    });
    throw new ResponseError('Cloudinary upload failed: ' + error.message, 500);
  }
});
