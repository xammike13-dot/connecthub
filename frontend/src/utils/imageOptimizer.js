/**
 * Utility to optimize image URLs.
 * If the image is hosted on Cloudinary, applies auto-format (WebP/AVIF),
 * auto-quality, and a maximum width/cropping to minimize size.
 * If the image is not a Cloudinary URL, returns it unmodified.
 *
 * @param {string} url - The original image URL
 * @param {object} options - Optimization options
 * @param {number} [options.width=500] - Desired width of the thumbnail (default is 500px, serving between 400px and 600px range)
 * @param {number} [options.height] - Optional height of the thumbnail
 * @param {string} [options.crop='limit'] - Cloudinary crop mode
 * @returns {string} - The optimized image URL
 */
export const getOptimizedImageUrl = (url, options = {}) => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return 'https://via.placeholder.com/400x300?text=No+Image';
  }

  // Check if it's a Cloudinary URL
  if (url.includes('res.cloudinary.com')) {
    const width = options.width || 500;
    const crop = options.crop || 'limit';

    // Construct transformation string
    // e.g. w_500,c_limit,q_auto,f_auto
    let transformations = `w_${width},c_${crop},q_auto,f_auto`;
    if (options.height) {
      transformations += `,h_${options.height}`;
    }

    // Insert transformations right after '/upload/' in the URL
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex !== -1) {
      const beforeUpload = url.substring(0, uploadIndex + 8); // includes '/upload/'
      const afterUpload = url.substring(uploadIndex + 8);

      // Prevent nesting duplicate/multiple transformations if we process a URL twice or it already has some
      if (afterUpload.startsWith('w_') || afterUpload.includes('q_auto') || afterUpload.includes('f_auto')) {
        return url;
      }

      return `${beforeUpload}${transformations}/${afterUpload}`;
    }
  }

  // Fallback for non-Cloudinary images (like local uploads or placeholder URLs)
  return url;
};
