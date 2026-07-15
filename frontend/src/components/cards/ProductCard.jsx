import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  Heart,
  Star,
  Eye,
  BadgeCheck,
  Zap,
  Truck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../Toast';
import { productAPI } from '../../services/api';
import Avatar from '../ui/Avatar';

const ProductCard = ({
  product,
  onAddToCart,
  onFavorite,
  isFavorite = false,
  onView,
  isViewed = false,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [imageLoaded, setImageLoaded] = useState(false);

  const {
    _id,
    name,
    price,
    originalPrice,
    images,
    category,
    business,
    rating,
    reviewCount,
    stock,
    isVerified,
    discount,
    deliveryFee = 0,
    views = 0,
    favoritesCount = 0,
  } = product;

  const mainImage = (images?.[0] && typeof images[0] === 'string' && images[0].trim() !== '')
    ? images[0]
    : (images?.[0]?.url && typeof images[0].url === 'string' && images[0].url.trim() !== '')
      ? images[0].url
      : 'https://via.placeholder.com/300x300?text=No+Image';

  const discountPercent = discount || (originalPrice && originalPrice > price
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0);

  const isOutOfStock = stock === 0;

  const { isInCart, addToCart } = useCart();
  const { success: toastSuccess, error: toastError } = useToast();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddClick = async (e) => {
    e.preventDefault();
    if (isAdding) return;

    setIsAdding(true);
    try {
      // Query backend to confirm the product exists and has stock
      const response = await productAPI.getById(_id);
      const fetchedProduct = response.data?.data;

      if (!fetchedProduct) {
        toastError('Failed to add product to cart. Product not found.');
        return;
      }

      if (!fetchedProduct.isActive) {
        toastError('Failed to add product to cart. Product is no longer active.');
        return;
      }

      if (fetchedProduct.stock <= 0) {
        toastError('Failed to add product to cart. Product is out of stock.');
        return;
      }

      // Add to cart
      addToCart(product);
      toastSuccess('✓ Product added to cart successfully.');
    } catch (err) {
      console.error('[ADD TO CART ERROR]', err);
      toastError('Failed to add product to cart. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group bg-white rounded-xl shadow-sm hover:shadow-md border border-neutral-250/70 hover:border-blue-400 transition-all duration-300 flex flex-col h-full overflow-hidden"
    >
      {/* Image Container with standard ratio */}
      <div className="relative aspect-square overflow-hidden bg-neutral-100">
        <img
          src={mainImage}
          alt={name}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
        />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {discountPercent > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow">
              -{discountPercent}%
            </span>
          )}
          {isVerified && (
            <span className="bg-green-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow">
              <BadgeCheck size={10} /> Verified
            </span>
          )}
          {isOutOfStock && (
            <span className="bg-neutral-800 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow">
              Out of Stock
            </span>
          )}
        </div>

        {/* Favorite Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.preventDefault();
            console.log('[FAVORITE CLICK] Product:', _id, 'Is Favorite:', isFavorite);
            onFavorite?.(_id);
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full transition-all duration-200 backdrop-blur-sm shadow bg-white/90 text-neutral-500 hover:bg-white hover:text-red-500 z-10"
        >
          <Heart
            size={14}
            fill={isFavorite ? 'currentColor' : 'none'}
            className={isFavorite ? 'text-red-500' : ''}
          />
        </motion.button>
      </div>

      {/* Content area: takes remaining vertical space */}
      <div className="p-3 sm:p-4 flex flex-col flex-grow">
        {/* Category */}
        <p className="text-[10px] sm:text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">
          {category}
        </p>

        {/* Product Name (clamped & with exact line height minimums to align the card bodies perfectly) */}
        <Link to={`/marketplace/${_id}`} onClick={() => onView?.(_id)} className="block mb-2 flex-grow">
          <h3 className="font-semibold text-neutral-900 line-clamp-2 hover:text-blue-600 transition-colors text-xs sm:text-sm md:text-base leading-snug min-h-[2.5rem]">
            {name}
          </h3>
        </Link>

        {/* Ratings, Views & Favorites Stats */}
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-neutral-50">
          {rating ? (
            <div className="flex items-center gap-0.5">
              <Star size={12} className="text-yellow-500 fill-current" />
              <span className="text-xs font-bold text-neutral-800">
                {rating.toFixed(1)}
              </span>
              {reviewCount > 0 && (
                <span className="text-[10px] text-neutral-400 font-medium">({reviewCount})</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-0.5">
              <Star size={12} className="text-neutral-200" />
              <span className="text-[10px] text-neutral-400">No reviews</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-semibold">
            <span className="flex items-center gap-0.5">
              <Eye size={11} /> {views || 0}
            </span>
            <span className="flex items-center gap-0.5">
              <Heart size={11} className={favoritesCount > 0 ? 'text-red-400 fill-current' : ''} /> {favoritesCount || 0}
            </span>
          </div>
        </div>

        {/* Pricing & Delivery Details */}
        <div className="flex flex-col gap-1 mb-2">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-sm sm:text-base md:text-lg font-extrabold text-blue-600">
              KSh {price?.toLocaleString() || '0'}
            </span>
            {originalPrice && originalPrice > price && (
              <span className="text-[10px] sm:text-xs text-neutral-400 line-through font-medium">
                KSh {originalPrice?.toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-neutral-500 font-medium">
            <Truck size={11} className="text-neutral-450" />
            <span>Delivery: {deliveryFee === 0 ? <span className="text-green-600 font-semibold">FREE</span> : `KSh ${deliveryFee}`}</span>
          </div>
        </div>

        {/* Business Partner Info */}
        {business && (
          <div className="flex items-center gap-1.5 mt-1 mb-3">
            <Avatar
              src={business.businessProfile?.businessLogo || business.avatar}
              alt={business.businessProfile?.businessName || business.name}
              size="xs"
              className="border border-neutral-100"
            />
            <p className="text-[10px] text-neutral-400 font-medium truncate max-w-[120px] sm:max-w-[150px]">
              by {business.businessProfile?.businessName || business.name}
            </p>
          </div>
        )}

        {/* Persistent Action Buttons (Touch friendly & beautifully spaced) */}
        <div className="grid grid-cols-3 gap-1 sm:gap-2 mt-auto">
          <button
            onClick={() => onView?.(_id)}
            className={`py-2 px-1 sm:px-1.5 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 border transition-all ${
              isViewed
                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100 hover:text-neutral-800'
            }`}
            title="View details"
          >
            <Eye size={12} />
            <span>View</span>
          </button>
          {isInCart(_id) ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                navigate('/cart');
              }}
              className="py-2 px-1 sm:px-1.5 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 hover:text-green-700 transition-all"
              title="View Cart"
            >
              <ShoppingCart size={12} />
              <span>View Cart</span>
            </button>
          ) : (
            <button
              disabled={isOutOfStock || isAdding}
              onClick={handleAddClick}
              className="py-2 px-1 sm:px-1.5 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 hover:text-blue-700 transition-all disabled:opacity-50 disabled:pointer-events-none"
              title="Add to cart"
            >
              {isAdding ? (
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
              ) : (
                <ShoppingCart size={12} />
              )}
              <span>{isAdding ? 'Adding...' : 'Add'}</span>
            </button>
          )}
          <button
            disabled={isOutOfStock}
            onClick={() => {
              if (!user) {
                navigate('/login', { state: { from: `/marketplace/${_id}` } });
                return;
              }
              if (!isInCart(_id)) {
                addToCart(product);
              }
              navigate('/checkout');
            }}
            className="py-2 px-1 sm:px-1.5 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50 disabled:pointer-events-none"
            title="Buy now"
          >
            <Zap size={12} />
            <span>Buy</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;