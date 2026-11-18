import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPin,
  Home,
  Heart,
  Eye,
  Zap,
  ArrowLeft,
  Calendar,
  User,
  Check,
  X,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  MessageSquare,
  ShieldCheck,
  Bed,
  Bath,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import PhotoGallery from '../components/ui/PhotoGallery';
import Avatar from '../components/ui/Avatar';
import OptimizedImage from '../components/ui/OptimizedImage';
import { rentalAPI } from '../services/api';
import { useToast } from '../components/Toast';

const RentalDetailPage = () => {
  const { id: rentalId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { error: toastError, success: toastSuccess } = useToast();
  
  const [rental, setRental] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Swipe handling for mobile gallery
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  useEffect(() => {
    fetchRental();
  }, [rentalId]);

  const fetchRental = async () => {
    try {
      setLoading(true);
      const response = await rentalAPI.getById(rentalId);
      const rentalData = response.data?.data;
      setRental(rentalData);
      setIsFavorite(rentalData?.isFavorited || false);
      setActiveImageIndex(0);

      // Track view
      rentalAPI.trackView(rentalId).catch(() => {});
    } catch (err) {
      console.error('Failed to fetch rental:', err);
      setError('Failed to load rental details');
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/rentals/detail/${rentalId}` } });
      return;
    }

    try {
      const response = await rentalAPI.toggleFavorite(rentalId);
      const isFav = response.data?.isFavorite;
      setIsFavorite(isFav);
      await toggleWishlist(rentalId, 'rental');
      
      // Update local rental data
      if (response.data?.data) {
        setRental(prev => ({
          ...prev,
          isFavorited: isFav,
          favoritesCount: response.data.data.favoritesCount
        }));
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      toastError('Failed to update favorite. Please try again.');
    }
  };

  const handleBook = () => {
    if (!user) {
      navigate('/login', { state: { from: `/rentals/detail/${rentalId}` } });
      return;
    }
    navigate(`/checkout/rental/${rentalId}`);
  };

  const handleOpenGallery = (index = 0) => {
    setGalleryIndex(index);
    setShowGallery(true);
  };

  // Image swipe handlers
  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45;

    if (diff > minSwipeDistance && imagesList.length > 1) {
      // Swiped left -> next image
      setActiveImageIndex((prev) => (prev + 1) % imagesList.length);
    } else if (diff < -minSwipeDistance && imagesList.length > 1) {
      // Swiped right -> prev image
      setActiveImageIndex((prev) => (prev - 1 + imagesList.length) % imagesList.length);
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !rental) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center p-6 bg-white rounded-2xl shadow-sm border border-neutral-100 max-w-sm">
          <p className="text-red-500 font-semibold mb-4">{error || 'Rental not found'}</p>
          <Button onClick={() => navigate('/rentals')}>Back to Rentals</Button>
        </div>
      </div>
    );
  }

  // Normalize image URLs
  const rawImages = rental.images || [];
  const imagesList = rawImages.map((img) => {
    if (typeof img === 'string') return img;
    return img?.url || img?.secure_url || '';
  }).filter(Boolean);

  const photoCount = imagesList.length;
  const currentImage = imagesList[activeImageIndex] || 'https://via.placeholder.com/800x600?text=Rental';
  const hasMultiplePhotos = photoCount > 1;

  // Rental period label
  const period = rental.rentalPeriod || 'month';
  const periodLabel = period === 'night'
    ? 'per night'
    : period === 'semester'
      ? 'per semester'
      : period === 'year'
        ? 'per year'
        : period === 'day'
          ? 'per day'
          : 'per month';

  // Format property type nicely
  const formatRentalType = (type) => {
    if (!type) return 'Rental Unit';
    const map = {
      'single': 'Single Room',
      'bedsitter': 'Bedsitter / Studio',
      'one-bedroom': '1 Bedroom',
      'two-bedroom': '2 Bedrooms',
      'three-bedroom': '3 Bedrooms',
      'apartment': 'Apartment',
      'hostel': 'Hostel Room',
      'commercial': 'Commercial Space',
    };
    return map[type.toLowerCase()] || type.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  // Determine bedroom count display
  const getBedroomsDisplay = () => {
    if (rental.bedrooms !== undefined && rental.bedrooms !== null) {
      return `${rental.bedrooms} Bedroom${rental.bedrooms !== 1 ? 's' : ''}`;
    }
    const type = rental.rentalType?.toLowerCase() || '';
    if (type === 'single') return '1 Bed (Single Room)';
    if (type === 'bedsitter') return 'Studio (Bedsitter)';
    if (type === 'one-bedroom') return '1 Bedroom';
    if (type === 'two-bedroom') return '2 Bedrooms';
    if (type === 'three-bedroom') return '3 Bedrooms';
    if (type === 'hostel') return 'Hostel Bed';
    if (type === 'apartment') return 'Apartment Unit';
    return null;
  };

  // Determine bathroom count display
  const getBathroomsDisplay = () => {
    if (rental.bathrooms !== undefined && rental.bathrooms !== null) {
      return `${rental.bathrooms} Bathroom${rental.bathrooms !== 1 ? 's' : ''}`;
    }
    if (rental.specifications?.bathrooms) {
      return `${rental.specifications.bathrooms} Bathroom(s)`;
    }
    return null;
  };

  const bedroomsInfo = getBedroomsDisplay();
  const bathroomsInfo = getBathroomsDisplay();

  const landlordName = rental.landlord?.name || 'Verified Landlord';
  const landlordAvatar = rental.landlord?.avatar || rental.landlord?.landlordProfile?.propertyLogo;
  const landlordPhone = rental.landlord?.phone;
  const landlordEmail = rental.landlord?.email;
  const landlordPropertyName = rental.landlord?.landlordProfile?.propertyName;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-10">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/rentals')}
            className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors font-medium text-sm"
          >
            <ArrowLeft size={18} />
            <span>Back to Rentals</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleFavorite}
              className={`p-2.5 rounded-full border transition-all ${
                isFavorite
                  ? 'border-red-200 bg-red-50 text-red-500'
                  : 'border-neutral-200 bg-white text-neutral-400 hover:text-red-500'
              }`}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart
                size={20}
                fill={isFavorite ? '#ef4444' : 'none'}
                className={isFavorite ? 'text-red-500' : ''}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content (Left Column) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* ── Image Gallery (Mobile swipeable & Desktop nav) ──────── */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl overflow-hidden border border-neutral-200 shadow-sm p-2 md:p-3"
            >
              {/* Main Image Container */}
              <div
                className="relative aspect-[16/10] md:aspect-[16/9] w-full rounded-xl overflow-hidden bg-neutral-100 select-none touch-pan-y"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <img
                  src={currentImage}
                  alt={rental.rentalName}
                  className="w-full h-full object-cover"
                />

                {/* Nav Arrows */}
                {hasMultiplePhotos && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveImageIndex((prev) => (prev - 1 + photoCount) % photoCount)}
                      aria-label="Previous image"
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/75 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-xs z-10"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveImageIndex((prev) => (prev + 1) % photoCount)}
                      aria-label="Next image"
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/75 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-xs z-10"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}

                {/* Image Counter & Fullscreen trigger */}
                <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                  {hasMultiplePhotos && (
                    <div className="bg-black/60 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-xs shadow-xs">
                      {activeImageIndex + 1} / {photoCount}
                    </div>
                  )}
                  {hasMultiplePhotos && (
                    <button
                      onClick={() => handleOpenGallery(activeImageIndex)}
                      className="bg-black/60 hover:bg-black/80 text-white px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-xs flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <ImageIcon size={14} />
                      View All
                    </button>
                  )}
                </div>

                {/* Availability Badge */}
                <div className="absolute top-3 left-3 z-10">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5 ${
                      rental.isAvailable
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    {rental.isAvailable ? 'Available for Rent' : 'Occupied'}
                  </span>
                </div>
              </div>

              {/* Thumbnails Strip */}
              {hasMultiplePhotos && (
                <div className="flex gap-2.5 mt-3 overflow-x-auto pb-1 no-scrollbar">
                  {imagesList.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`flex-shrink-0 w-20 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                        idx === activeImageIndex
                          ? 'border-[#FF5E00] ring-2 ring-orange-200'
                          : 'border-transparent opacity-70 hover:opacity-100 hover:border-neutral-300'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* ── Rental Info Card ────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm space-y-6"
            >
              {/* Title & Location Header */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-100">
                    {formatRentalType(rental.rentalType)}
                  </span>
                  <span className="bg-neutral-100 text-neutral-700 text-xs font-semibold px-3 py-1 rounded-full">
                    Campus Zone: {rental.location?.toUpperCase()}
                  </span>
                </div>

                <h1 className="text-2xl md:text-3xl font-black text-neutral-900 leading-tight">
                  {rental.rentalName}
                </h1>

                <div className="flex items-center gap-2 text-neutral-500 mt-2 text-sm font-medium">
                  <MapPin size={16} className="text-[#FF5E00] flex-shrink-0" />
                  <span className="capitalize">{rental.location} Campus Location</span>
                </div>
              </div>

              {/* Key Specs Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-neutral-100">
                <div className="bg-slate-50 rounded-xl p-3 border border-neutral-100">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
                    <Home size={14} className="text-blue-500" />
                    <span>Type</span>
                  </div>
                  <p className="text-sm font-bold text-neutral-800 truncate">
                    {formatRentalType(rental.rentalType)}
                  </p>
                </div>

                {bedroomsInfo && (
                  <div className="bg-slate-50 rounded-xl p-3 border border-neutral-100">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
                      <Bed size={14} className="text-indigo-500" />
                      <span>Bedrooms</span>
                    </div>
                    <p className="text-sm font-bold text-neutral-800 truncate">
                      {bedroomsInfo}
                    </p>
                  </div>
                )}

                {bathroomsInfo && (
                  <div className="bg-slate-50 rounded-xl p-3 border border-neutral-100">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
                      <Bath size={14} className="text-cyan-500" />
                      <span>Bathrooms</span>
                    </div>
                    <p className="text-sm font-bold text-neutral-800 truncate">
                      {bathroomsInfo}
                    </p>
                  </div>
                )}

                <div className="bg-slate-50 rounded-xl p-3 border border-neutral-100">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
                    <Calendar size={14} className="text-emerald-500" />
                    <span>Payment</span>
                  </div>
                  <p className="text-sm font-bold text-neutral-800 capitalize truncate">
                    {periodLabel}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-base font-bold text-neutral-900 mb-2">About this Property</h3>
                <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-wrap">
                  {rental.description || 'No description provided for this rental.'}
                </p>
              </div>

              {/* Amenities */}
              {rental.amenities?.length > 0 && (
                <div>
                  <h3 className="text-base font-bold text-neutral-900 mb-3">Amenities & Facilities</h3>
                  <div className="flex flex-wrap gap-2.5">
                    {rental.amenities.map((amenity, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 bg-neutral-50 text-neutral-800 text-xs font-semibold px-3 py-2 rounded-xl border border-neutral-200 capitalize"
                      >
                        <Check size={14} className="text-emerald-600" />
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats Bar */}
              <div className="flex items-center gap-6 pt-4 border-t border-neutral-100 text-xs text-neutral-500">
                <div className="flex items-center gap-1.5">
                  <Eye size={14} />
                  <span>{rental.views || 0} views</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Heart size={14} className={isFavorite ? 'text-red-500 fill-red-500' : ''} />
                  <span>{rental.favoritesCount || 0} favorites</span>
                </div>
              </div>
            </motion.div>

            {/* ── Landlord & Caretaker Info Card ───────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm space-y-4"
            >
              <h3 className="text-base font-bold text-neutral-900">Property Host & Management</h3>
              
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <Avatar
                    src={landlordAvatar}
                    alt={landlordName}
                    size="lg"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-neutral-900 text-base">{landlordName}</p>
                      <ShieldCheck size={16} className="text-blue-500" />
                    </div>
                    {landlordPropertyName && (
                      <p className="text-xs text-neutral-500">{landlordPropertyName}</p>
                    )}
                    <span className="inline-block mt-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      Verified Host
                    </span>
                  </div>
                </div>

                {/* Contact buttons */}
                <div className="flex items-center gap-2">
                  {user && (
                    <Link
                      to={`/customer/chat?recipient=${rental.landlord?._id || ''}`}
                      className="p-2.5 rounded-xl border border-neutral-200 hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                      title="Chat with host"
                    >
                      <MessageSquare size={16} />
                      <span className="hidden sm:inline">Message</span>
                    </Link>
                  )}
                  {landlordPhone && (
                    <a
                      href={`tel:${landlordPhone}`}
                      className="p-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                      title="Call host"
                    >
                      <Phone size={16} />
                      <span className="hidden sm:inline">Call</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Caretaker if attached */}
              {rental.caretaker && (
                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-neutral-400" />
                    <span>Caretaker: <strong className="text-neutral-800">{rental.caretaker.name}</strong></span>
                  </div>
                  {rental.caretaker.phone && (
                    <a href={`tel:${rental.caretaker.phone}`} className="text-blue-600 hover:underline font-semibold">
                      {rental.caretaker.phone}
                    </a>
                  )}
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar / Price Card (Right Column) */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm sticky top-20"
            >
              {/* Price section */}
              <div className="mb-6 pb-6 border-b border-neutral-100">
                <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider block mb-1">
                  Rental Price
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-neutral-900">
                    KSh {rental.monthlyPrice?.toLocaleString()}
                  </span>
                  <span className="text-sm font-semibold text-neutral-500">
                    / {periodLabel}
                  </span>
                </div>
              </div>

              {/* Trust signals */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2.5 text-xs text-neutral-600 font-medium">
                  <Check size={16} className="text-emerald-600 flex-shrink-0" />
                  <span>Escrow-protected rental booking</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-neutral-600 font-medium">
                  <Check size={16} className="text-emerald-600 flex-shrink-0" />
                  <span>Physical move-in inspection verification</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-neutral-600 font-medium">
                  <Check size={16} className="text-emerald-600 flex-shrink-0" />
                  <span>Direct landlord/caretaker handover</span>
                </div>
              </div>

              {/* Booking CTA */}
              {rental.isAvailable ? (
                <Button
                  fullWidth
                  onClick={handleBook}
                  className="w-full py-4 text-base font-black bg-[#FF5E00] hover:bg-orange-600 shadow-sm text-white rounded-xl"
                >
                  <Zap size={18} className="mr-2" />
                  Book Now · KSh {rental.monthlyPrice?.toLocaleString()}
                </Button>
              ) : (
                <Button
                  fullWidth
                  variant="outline"
                  disabled
                  className="w-full py-4 text-sm font-bold opacity-60 cursor-not-allowed rounded-xl"
                >
                  <X size={18} className="mr-2" />
                  Currently Occupied
                </Button>
              )}

              <p className="mt-4 text-center text-xs text-neutral-400 leading-relaxed">
                Your payment is held safely until you confirm move-in at the property.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Fullscreen Photo Gallery Modal */}
      <PhotoGallery
        images={rental.images}
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        initialIndex={galleryIndex}
      />
    </div>
  );
};

export default RentalDetailPage;
