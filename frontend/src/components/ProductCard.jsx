// ProductCard.jsx – crisp light-mode product card for both horizontal scroll and grid feeds
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ShoppingCart, Check } from 'lucide-react';

export default function ProductCard({ product, className = '', isGrid = false }) {
  const [added, setAdded] = useState(false);

  const {
    _id,
    name,
    price,
    oldPrice,
    images,
    discountPct,
    isLive,
    category,
    rating,
    soldCount,
  } = product;

  const img = images?.[0] || null;

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
    // Hooked to CartContext in integrated components
  };

  const containerClasses = isGrid
    ? `relative w-full min-w-0 bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 group flex flex-col ${className}`
    : `relative flex-shrink-0 min-w-[160px] w-[160px] md:min-w-[190px] md:w-[190px] bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 snap-start group flex flex-col ${className}`;

  return (
    <Link to={`/product/${_id}`} className={containerClasses}>
      {/* ── Image Area (light gray placeholder, 1:1 aspect ratio) ── */}
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

        {/* Discount badge */}
        {discountPct && (
          <span className="absolute top-2 left-2 text-[10px] font-black bg-[#FF5E00] text-white px-2 py-0.5 rounded-full shadow-sm">
            -{discountPct}%
          </span>
        )}

        {/* Live badge */}
        {isLive && (
          <span className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-black bg-[#6BE319] text-[#0F172A] px-2 py-0.5 rounded-full shadow-sm">
            <span className="w-1.5 h-1.5 bg-[#0F172A] rounded-full animate-pulse" />
            LIVE
          </span>
        )}

        {/* Category micro badge if present */}
        {category && (
          <span className="absolute bottom-2 left-2 text-[9px] font-bold bg-white/90 backdrop-blur-xs text-gray-700 px-1.5 py-0.5 rounded-md shadow-xs max-w-[80%] truncate">
            {category}
          </span>
        )}
      </div>

      {/* ── Details Area ── */}
      <div className="flex flex-col flex-1 p-3 md:p-3.5 gap-1.5 justify-between">
        <div>
          <p className="text-gray-900 text-xs md:text-sm font-bold leading-snug line-clamp-2 group-hover:text-[#FF5E00] transition-colors">
            {name}
          </p>

          {/* Sold or rating info if present */}
          {soldCount && (
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">
              {soldCount} orders placed
            </p>
          )}
        </div>

        {/* Pricing & Add to Cart button */}
        <div className="flex items-center justify-between mt-1 pt-1 border-t border-gray-50">
          <div className="flex flex-col min-w-0 pr-1">
            <span className="text-[#FF5E00] font-extrabold text-sm md:text-base leading-tight truncate">
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
            onClick={handleAdd}
            aria-label="Add to cart"
            className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-200 shadow-sm hover:scale-110 active:scale-95"
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
    </Link>
  );
}
