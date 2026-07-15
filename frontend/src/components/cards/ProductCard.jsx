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
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';

const ProductCard = ({
  product,
  onAddToCart,
  onFavorite,
  isFavorite = false,
  showQuickView = true,
  onView,
  isViewed = false,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [isHovered, setIsHovered] = useState(false);
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group bg-white rounded-xl shadow-md overflow-hidden border border-neutral-200 hover:border-blue-400 hover:shadow-xl transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-neutral-100">
        <img
          src={mainImage}
          alt={name}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          onLoad={() => setImageLoaded(true)}
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {discountPercent > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-md">
              -{discountPercent}%
            </span>
          )}
          {isVerified && (
            <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1 shadow-md">
              <BadgeCheck size={12} /> Verified
            </span>
          )}
          {isOutOfStock && (
            <span className="bg-neutral-800 text-white text-xs font-bold px-2 py-1 rounded shadow-md">
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
          className="absolute top-3 right-3 p-2 rounded-full transition-all duration-200 backdrop-blur-sm shadow-md bg-white/90 text-neutral-500 hover:bg-white hover:text-red-500"
        >
          <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} className={isFavorite ? 'text-red-500' : ''} />
        </motion.button>

      </div>

      {/* Content */}
      <div className="p-4 flex flex-col justify-between h-[230px]">
        <div>
        {/* Category */}
        <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">
          {category}
        </p>

        {/* Name */}
        <Link to={`/marketplace/${_id}`} onClick={() => onView?.(_id)}>
          <h3 className="font-semibold text-neutral-900 line-clamp-2 hover:text-blue-600 transition-colors">
            {name}
          </h3>
        </Link>

        {/* Rating */}
        {rating && (
          <div className="flex items-center gap-1 mt-2">
            <Star size={14} className="text-yellow-500 fill-current" />
            <span className="text-sm font-medium text-neutral-700">
              {rating.toFixed(1)}
            </span>
            {reviewCount > 0 && (
              <span className="text-xs text-neutral-500">({reviewCount})</span>
            )}
          </div>
        )}

        {/* Statistics */}
        <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
          <div className="flex items-center gap-1">
            <Eye size={12} />
            <span>{views || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart size={12} className={favoritesCount > 0 ? 'text-red-500' : ''} fill={favoritesCount > 0 ? 'currentColor' : 'none'} />
            <span>{favoritesCount || 0}</span>
          </div>
        </div>

        {/* Price and Delivery */}
        <div className="mt-3 flex items-baseline gap-2 flex-wrap">
          <span className="text-lg font-bold text-blue-600">
            KSh {price?.toLocaleString() || '0'}
          </span>
          {originalPrice && originalPrice > price && (
            <span className="text-sm text-neutral-400 line-through">
              KSh {originalPrice?.toLocaleString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 mt-1 text-xs text-neutral-500">
          <Truck size={12} />
          <span>Delivery: {deliveryFee === 0 ? 'FREE' : `KSh ${deliveryFee}`}</span>
        </div>

        {/* Business Info */}
        {business && (
          <div className="flex items-center gap-2 mt-2">
            <Avatar
              src={business.businessProfile?.businessLogo || business.avatar}
              alt={business.businessProfile?.businessName || business.name}
              size="sm"
            />
            <p className="text-xs text-neutral-400 truncate max-w-[130px]">
              by {business.businessProfile?.businessName || business.name}
            </p>
          </div>
        )}
        </div>

        {/* Action Buttons Row */}
        {!isOutOfStock && (
          <div className="mt-3 pt-2.5 border-t border-neutral-100 flex gap-1.5 flex-nowrap w-full">
            <button
              onClick={(e) => {
                e.preventDefault();
                onView?.(_id);
              }}
              className={`flex-1 text-[11px] font-bold py-1.5 px-2 rounded-lg flex items-center justify-center gap-0.5 border transition-all ${
                isViewed
                  ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'
              }`}
              title="View details"
            >
              <Eye size={12} />
              <span className="hidden min-[360px]:inline">Detail</span>
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                addToCart(product);
              }}
              className="flex-1 text-[11px] font-bold py-1.5 px-2 bg-neutral-100 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 text-neutral-700 border border-neutral-200 rounded-lg flex items-center justify-center gap-0.5 transition-all"
              title="Add to cart"
            >
              <ShoppingCart size={12} />
              <span className="hidden min-[360px]:inline">Add</span>
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                if (!user) {
                  navigate('/login', { state: { from: `/marketplace/${_id}` } });
                  return;
                }
                addToCart(product);
                navigate('/checkout');
              }}
              className="flex-1 text-[11px] font-bold py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-0.5 transition-all shadow-sm"
              title="Buy now"
            >
              <Zap size={12} />
              <span className="hidden min-[360px]:inline">Buy</span>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ProductCard;