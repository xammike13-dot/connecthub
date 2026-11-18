// ProductCard.jsx – high-conversion light-mode product card with wishlist heart, dynamic badging, ratings, vendor trust & scarcity indicators
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Check, Heart, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import ProductDetailModal from './modals/ProductDetailModal';

export default function ProductCard({
  product = {},
  className = '',
  isGrid = false,
  rating: propRating,
  reviews: propReviews,
  vendorName: propVendorName,
  stock: propStock,
  deliveryTag: propDeliveryTag,
}) {
  const [added, setAdded] = useState(false);
  const [isWished, setIsWished] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  let cart = null;
  try {
    cart = useCart();
  } catch (e) {
    // Context fallback
  }

  let wishlist = null;
  try {
    wishlist = useWishlist();
  } catch (e) {
    // Context fallback
  }

  const {
    _id,
    name = 'Unnamed Product',
    price = 0,
    oldPrice,
    images = [],
    discountPct,
    isLive,
    category,
    rating: productRating,
    reviews: productReviews,
    reviewCount,
    vendorName: productVendorName,
    vendor,
    business,
    stock: productStock,
    quantity,
    deliveryTag: productDeliveryTag,
  } = product;

  // Resolve props with intelligent fallbacks
  const displayRating = propRating ?? productRating ?? 4.8;
  const displayReviews = propReviews ?? productReviews ?? reviewCount ?? 24;
  const displayVendor = propVendorName ?? productVendorName ?? vendor?.businessName ?? business?.name ?? 'Campus Verified';
  const displayStock = propStock ?? productStock ?? quantity;
  const displayDelivery = propDeliveryTag ?? productDeliveryTag ?? (isLive ? '10-Min Delivery' : null);

  // Sync wishlist state from WishlistContext
  useEffect(() => {
    if (wishlist?.isInWishlist && _id) {
      setIsWished(wishlist.isInWishlist(_id, 'product'));
    }
  }, [wishlist, _id]);

  const hasOptions = (product.variations?.length > 0) || (product.addOns?.length > 0);

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWished((prev) => !prev);
    if (wishlist?.toggleWishlist && _id) {
      await wishlist.toggleWishlist(_id, 'product');
    }
  };

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasOptions) {
      setModalOpen(true);
      return;
    }
    if (cart?.addToCart) {
      cart.addToCart(product, 1);
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const img = images?.[0] || null;

  const containerClasses = isGrid
    ? `relative w-full min-w-0 bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 group flex flex-col ${className}`
    : `relative flex-shrink-0 min-w-[160px] w-[160px] md:min-w-[190px] md:w-[190px] bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 snap-start group flex flex-col ${className}`;

  const productId = _id || product.id;

  return (
    <>
      <Link
        to={`/product/${productId}`}
        className={containerClasses}
      >
      {/* ── 1. Image Area (1:1 aspect ratio, badges & wishlist button) ── */}
      <div className="relative w-full aspect-square bg-gray-100 overflow-hidden flex items-center justify-center">
        {img ? (
          <img
            src={img}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="text-4xl md:text-5xl select-none transform group-hover:scale-110 transition-transform">
            {product.emoji || '🛍️'}
          </div>
        )}

        {/* ── Dynamic Badging (Top Left) ────────────────────────── */}
        <div className="absolute top-2 left-2 z-10 flex flex-col items-start gap-1 max-w-[65%]">
          {discountPct && (
            <span className="text-[10px] font-black bg-[#FF5E00] text-white px-2 py-0.5 rounded-full shadow-sm">
              -{discountPct}%
            </span>
          )}

          {displayDelivery && (
            <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-sm shadow-2xs whitespace-nowrap truncate">
              {displayDelivery}
            </span>
          )}

          {isLive && !displayDelivery && (
            <span className="flex items-center gap-1 text-[9px] font-black bg-[#6BE319] text-[#0F172A] px-2 py-0.5 rounded-full shadow-sm">
              <span className="w-1.5 h-1.5 bg-[#0F172A] rounded-full animate-pulse" />
              LIVE
            </span>
          )}
        </div>

        {/* ── Wishlist Heart Button (Top Right) ─────────────────── */}
        <button
          type="button"
          onClick={handleWishlist}
          aria-label={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute top-2 right-2 z-10 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm transition-colors cursor-pointer active:scale-90 ${
            isWished ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
          }`}
        >
          <Heart
            size={16}
            className={`transition-all duration-200 ${
              isWished ? 'fill-red-500 text-red-500 scale-110' : ''
            }`}
          />
        </button>

        {/* Category micro badge if present */}
        {category && (
          <span className="absolute bottom-2 left-2 text-[9px] font-bold bg-white/90 backdrop-blur-xs text-gray-700 px-1.5 py-0.5 rounded-md shadow-xs max-w-[80%] truncate">
            {category}
          </span>
        )}
      </div>

      {/* ── 2. Details Area ───────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-3 md:p-3.5 justify-between gap-1">
        <div>
          {/* Product Title */}
          <p className="text-gray-900 text-xs md:text-sm font-bold leading-snug line-clamp-2 group-hover:text-olaOrange-DEFAULT transition-colors">
            {name}
          </p>

          {/* ── Trust Signals (Ratings & Vendor) ──────────────── */}
          <div className="flex items-center justify-between gap-1 mt-1 text-xs">
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star size={12} className="text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-bold text-gray-700">{displayRating}</span>
              <span className="text-xs text-gray-400">({displayReviews})</span>
            </div>

            {displayVendor && (
              <span className="text-[10px] text-gray-500 truncate max-w-[50%] text-right font-medium">
                Sold by {displayVendor}
              </span>
            )}
          </div>
        </div>

        <div>
          {/* ── Scarcity Indicator (Conditional Low Stock Alert) ─ */}
          {displayStock !== undefined && displayStock !== null && displayStock > 0 && displayStock < 5 && (
            <div className="mt-1">
              <span className="text-[11px] font-semibold text-red-500 animate-pulse">
                Only {displayStock} left!
              </span>
            </div>
          )}

          {/* ── Pricing & Add to Cart button ───────────────────── */}
          <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-gray-50">
            <div className="flex flex-col min-w-0 pr-1">
              <span className="text-olaOrange-DEFAULT font-extrabold text-sm md:text-base leading-tight truncate">
                KSh {price?.toLocaleString()}
              </span>
              {oldPrice && (
                <span className="text-gray-400 text-xs line-through leading-tight truncate">
                  KSh {oldPrice.toLocaleString()}
                </span>
              )}
            </div>

            {/* Add button with hover pop */}
            <button
              type="button"
              onClick={handleAdd}
              aria-label="Add to cart"
              className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-200 shadow-sm hover:scale-110 active:scale-95 cursor-pointer"
              style={{ background: added ? '#027A2B' : '#FF5E00' }}
            >
              {added ? (
                <Check size={16} className="text-white stroke-[2.5]" />
              ) : (
                <Plus size={16} className="text-white stroke-[2.5]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </Link>

    <ProductDetailModal
      product={product}
      isOpen={modalOpen}
      onClose={() => setModalOpen(false)}
    />
  </>
);
}
