import { useState, useRef, useEffect } from 'react';
import { Upload, X, Loader } from 'lucide-react';
import { uploadAPI } from '../services/api';
import { useToast } from './Toast';

const ImageUpload = ({ 
  multiple = false, 
  maxFiles = 5, 
  onUpload, 
  onUploadStateChange,
  initialImages = [],
  folder = 'connecthub',
  className = ''
}) => {
  const { addToast } = useToast();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState(initialImages);
  const [previewUrls, setPreviewUrls] = useState([]);

  useEffect(() => {
    setImages(initialImages);
    // Extract URLs from image objects for preview
    const urls = (initialImages || []).map(img => {
      if (typeof img === 'string') {
        return img;
      }
      return img?.url || img?.secure_url || '';
    });
    setPreviewUrls(urls);
  }, [initialImages]);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    
    console.log('[ImageUpload] Files selected:', files.map(f => ({
      name: f.name,
      type: f.type,
      size: f.size,
    })));

    if (files.length === 0) {
      console.log('[ImageUpload] No files selected');
      return;
    }

    // Check max files limit
    if (!multiple && files.length > 1) {
      addToast('Only one file can be uploaded at a time', 'error');
      return;
    }

    if (multiple && images.length + files.length > maxFiles) {
      addToast(`Maximum ${maxFiles} files allowed`, 'error');
      return;
    }

    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      addToast('Only image files are allowed (JPEG, PNG, GIF, WebP)', 'error');
      return;
    }

    // Validate file size (10MB max)
    const oversizedFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      addToast('Files must be less than 10MB', 'error');
      return;
    }

    try {
      setUploading(true);
      if (onUploadStateChange) onUploadStateChange(true);

      const previews = files.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...previews]);

      console.log('[ImageUpload] Starting upload...');
      let uploadResult;
      if (files.length === 1 && !multiple) {
        console.log('[ImageUpload] Calling uploadSingle');
        uploadResult = await uploadAPI.uploadSingle(files[0]);
        console.log('[ImageUpload] uploadSingle response:', uploadResult.data);
        const uploadedImage = uploadResult.data?.data || uploadResult.data;
        const imageObject = {
          url: uploadedImage.url || uploadedImage.secure_url,
          publicId: uploadedImage.publicId || null,
        };
        console.log('[ImageUpload] Extracted image object:', imageObject);
        const newImages = [...images, imageObject];
        setImages(newImages);
        if (onUpload) {
          onUpload(newImages[0]);
        }
      } else {
        console.log('[ImageUpload] Calling uploadMultiple with', files.length, 'files');
        uploadResult = await uploadAPI.uploadMultiple(files);
        console.log('[ImageUpload] uploadMultiple response:', uploadResult.data);
        const uploadedImages = (uploadResult.data?.data || []).map((image) => {
          const imageObject = {
            url: image.url || image.secure_url,
            publicId: image.publicId || null,
          };
          console.log('[ImageUpload] Extracted image object:', imageObject);
          return imageObject;
        });
        const newImages = [...images, ...uploadedImages];
        setImages(newImages);
        if (onUpload) {
          onUpload(newImages);
        }
      }

      console.log('[ImageUpload] Upload successful, final images:', images);
      addToast('Images uploaded successfully', 'success');
    } catch (error) {
      console.error('[ImageUpload] Upload error:', error);
      console.error('[ImageUpload] Error response:', error.response?.data);
      addToast(error.response?.data?.message || 'Failed to upload images', 'error');
    } finally {
      setUploading(false);
      if (onUploadStateChange) onUploadStateChange(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index) => {
    const removedImage = images[index];
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = previewUrls.filter((_, i) => i !== index);
    
    setImages(newImages);
    setPreviewUrls(newPreviews);
    
    if (onUpload) {
      onUpload(multiple ? newImages : newImages[0] || null);
    }
    
    addToast('Image removed', 'info');
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        onClick={handleClick}
        className={`border-2 border-dashed rounded-lg p-6 min-h-[180px] text-center cursor-pointer transition-colors flex flex-col items-center justify-center
          ${uploading ? 'border-gold-400 bg-gold-50' : 'border-secondary-300 hover:border-gold-500 hover:bg-secondary-50'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-gold-400">
            <Loader className="w-8 h-8 animate-spin" />
            <span>Uploading...</span>
          </div>
        ) : (
          <>
            <Upload className="w-12 h-12 mx-auto text-primary-600 mb-3" />
            <p className="text-secondary-700 font-medium mb-1">
              Click to upload {multiple ? 'images' : 'image'}
            </p>
            <p className="text-sm text-secondary-500">
              PNG, JPG, GIF, WebP up to 10MB
              {multiple && ` (max ${maxFiles} files)`}
            </p>
          </>
        )}
      </div>

      {/* Image Previews */}
      {images.length > 0 && (
        <div className={`grid gap-4 ${multiple ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'}`}>
          {images.map((image, index) => {
            // Extract URL from image object or use string directly
            const imageUrl = typeof image === 'string'
              ? image
              : image?.url || image?.secure_url || '';
            const previewUrl = previewUrls[index] || imageUrl;

            return (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-secondary-100">
                  <img
                    src={previewUrl}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('[ImageUpload] Failed to load image:', { image, previewUrl, index });
                      e.target.src = 'https://via.placeholder.com/200?text=Error';
                    }}
                  />
                </div>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Image Info */}
                <div className="mt-2 text-xs text-secondary-500 truncate">
                  {typeof image === 'string' ? `Image ${index + 1}` : (image.publicId || `Image ${index + 1}`)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;