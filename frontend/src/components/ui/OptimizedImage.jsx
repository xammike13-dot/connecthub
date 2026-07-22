import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getOptimizedImageUrl } from '../../utils/imageOptimizer';

/**
 * OptimizedImage Component
 *
 * Renders an image using optimised transformed URLs, lazy or priority loading,
 * an elegant skeleton loader, and fixed aspect ratio container to prevent Layout Shifts (CLS).
 *
 * @param {string} src - Original image URL
 * @param {string} alt - Alternative text
 * @param {string} [className=''] - Custom styling classes for the img tag
 * @param {boolean} [priority=false] - Whether the image is above-the-fold and should load with priority (eager)
 * @param {string} [aspectRatioClass='aspect-square'] - Tailwind class to enforce a fixed aspect ratio on the container
 * @param {number} [width=500] - Image width transformation limit
 * @param {object} [rest] - Other standard img tag attributes
 */
const OptimizedImage = ({
  src,
  alt,
  className = '',
  priority = false,
  aspectRatioClass = 'aspect-square',
  width = 500,
  ...rest
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [errorOccurred, setErrorOccurred] = useState(false);

  // Apply optimizations to Cloudinary URLs
  const optimizedSrc = getOptimizedImageUrl(src, { width });

  // Reset state when src changes
  useEffect(() => {
    setImageLoaded(false);
    setErrorOccurred(false);
  }, [src]);

  return (
    <div className={`relative ${aspectRatioClass} overflow-hidden bg-neutral-150 rounded-lg w-full`}>
      {/* Skeleton loader / pulsing placeholder */}
      {(!imageLoaded && !errorOccurred) && (
        <motion.div
          initial={{ opacity: 0.6 }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 bg-neutral-200 flex items-center justify-center"
        >
          {/* Subtle placeholder icon or pattern */}
          <div className="w-8 h-8 rounded-full border-2 border-neutral-300 border-t-blue-500 animate-spin" />
        </motion.div>
      )}

      {/* Actual image */}
      <img
        src={errorOccurred ? 'https://via.placeholder.com/400x300?text=Image+Unavailable' : optimizedSrc}
        alt={alt || 'Image'}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'low'}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        onLoad={() => setImageLoaded(true)}
        onError={() => {
          setErrorOccurred(true);
          setImageLoaded(true);
        }}
        {...rest}
      />
    </div>
  );
};

export default OptimizedImage;
