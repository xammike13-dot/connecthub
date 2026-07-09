import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

const PhotoGallery = ({ images, isOpen, onClose, initialIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoom(1);
  }, [initialIndex, isOpen]);

  if (!isOpen || !images || images.length === 0) return null;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setZoom(1);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setZoom(1);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.5, 1));

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'ArrowLeft') handlePrevious();
    if (e.key === '+') handleZoomIn();
    if (e.key === '-') handleZoomOut();
  };

  const currentImage = images[currentIndex];
  const imageUrl = typeof currentImage === 'string' 
    ? currentImage 
    : currentImage?.url || currentImage?.secure_url || '';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
        onClick={onClose}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* Close Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
        >
          <X size={24} />
        </button>

        {/* Navigation */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrevious();
              }}
              className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
            >
              <ChevronLeft size={28} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
            >
              <ChevronRight size={28} />
            </button>
          </>
        )}

        {/* Zoom Controls */}
        <div className="absolute bottom-4 right-4 flex gap-2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleZoomOut();
            }}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            disabled={zoom <= 1}
          >
            <ZoomOut size={20} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleZoomIn();
            }}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            disabled={zoom >= 3}
          >
            <ZoomIn size={20} />
          </button>
        </div>

        {/* Photo Counter */}
        {images.length > 1 && (
          <div className="absolute top-4 left-4 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm font-medium z-10">
            Photo {currentIndex + 1} of {images.length}
          </div>
        )}

        {/* Main Image */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative max-w-full max-h-full p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={imageUrl}
            alt={`Photo ${currentIndex + 1}`}
            className="max-w-full max-h-[90vh] object-contain rounded-lg cursor-zoom-in"
            style={{ transform: `scale(${zoom})` }}
            onClick={() => zoom === 1 ? handleZoomIn() : handleZoomOut()}
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/800x600?text=Image+Error';
            }}
          />
        </motion.div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {images.map((image, index) => {
              const thumbUrl = typeof image === 'string' 
                ? image 
                : image?.url || image?.secure_url || '';
              return (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                    setZoom(1);
                  }}
                  className={`w-12 h-12 rounded overflow-hidden border-2 transition-all ${
                    index === currentIndex 
                      ? 'border-white scale-110' 
                      : 'border-white/30 hover:border-white/60'
                  }`}
                >
                  <img
                    src={thumbUrl}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default PhotoGallery;
