import { useState } from 'react';

const Avatar = ({
  src,
  alt = 'Avatar',
  fallback,
  size = 'md',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  // Get fallback text (initials or provided fallback)
  const getFallbackText = () => {
    if (fallback) return fallback;
    if (alt) {
      // Get initials from alt text
      const words = alt.split(' ');
      if (words.length >= 2) {
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
      }
      return alt[0].toUpperCase();
    }
    return '?';
  };

  return (
    <div
      className={`relative rounded-full overflow-hidden bg-neutral-200 flex items-center justify-center ${sizeClass} ${className}`}
    >
      {src && !imageError ? (
        <>
          <img
            src={src}
            alt={alt}
            className={`w-full h-full object-cover ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
          {!imageLoaded && (
            <span className="absolute inset-0 flex items-center justify-center text-neutral-500 font-semibold">
              {getFallbackText()}
            </span>
          )}
        </>
      ) : (
        <span className="text-neutral-600 font-semibold">
          {getFallbackText()}
        </span>
      )}
    </div>
  );
};

export default Avatar;
