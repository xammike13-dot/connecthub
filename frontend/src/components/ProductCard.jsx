// ProductCard.jsx — redesigned marketplace product card using real model fields
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Check, Tag, Zap } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function ProductCard({ product, className = '', isGrid = false }) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  if (!product) return null;

  const {
    _id,
    name,
    price,
    originalPrice,
    images,
    coverImage = 0,
    category,
    businessCategory,
    condition,
    stock,
    isActive,
  } = product;

  const img = images?.[coverImage] || images?.[0] || null;

  const hasDiscount = originalPrice && originalPrice > price;
  const discountPct = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const isOutOfStock = stock === 0 || !isActive;
  const displayCategory = businessCategory || category || '';

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    addToCart({
      _id,
      name,
      price,
      images,
      coverImage,
      category: displayCategory,
      stock,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const containerClasses = isGrid
    ? `relative w-full min-w-0 bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 group flex flex-col ${className}`
    : `relative flex-shrink-0 min-w-[170px] w-[170px] md:min-w-[200px] md:w-[200px] bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 snap-start group flex flex-col ${className}`;

  return (
    <Link to={`/product/${_id}`} className={containerClasses}>
      {/* Image Area */}
      <div className="relative w-full aspect-square bg-gray-100 overflow-hidden flex items-center justify-center">
        {img ? (
          <img
            src={img}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-gray-50">
            <Tag size={28} className="text-gray-300" />
          </div>
        )}

        {/* Discount badge */}
        {hasDiscount && (
          <span className="absolute top-2 left-2 text-[10px] font-black bg-[#FF5E00] text-white px-2 py-0.5 rounded-full shadow-sm z-10">
            -{discountPct}%
          </span>
        )}

        {/* Condition badge */}
        {condition && (
          <span className="absolute top-2 right-2 text-[9px] font-bold bg-white/95 backdrop-blur-sm text-gray-700 px-1.5 py-0.5 rounded-md shadow-sm z-10">
            {condition}
          </span>
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
            <span className="text-white text-xs font-bold bg-black/60 px-3 py-1 rounded-full">
              Out of Stock
            </span>
          </div>
        )}

        {/* Category label */}
        {displayCategory && (
          <span className="absolute bottom-2 left-2 text-[9px] font-bold bg-white/90 backdrop-blur-sm text-gray-700 px-1.5 py-0.5 rounded-md shadow-sm max-w-[85%] truncate z-10">
            {displayCategory}
          </span>
        )}
      </div>

      {/* Details Area */}
      <div className="flex flex-col flex-1 p-2.5 md:p-3 gap-1 justify-between">
        <div>
          <p className="text-gray-900 text-xs md:text-sm font-bold leading-snug line-clamp-2 group-hover:text-[#FF5E00] transition-colors">
            {name}
          </p>
        </div>

        {/* Pricing & Add to Cart */}
        <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-gray-50">
          <div className="flex flex-col min-w-0 pr-1">
            <span className="text-[#FF5E00] font-extrabold text-sm md:text-base leading-tight truncate">
              KSh {price?.toLocaleString()}
            </span>
            {hasDiscount && (
              <span className="text-gray-400 text-[11px] line-through leading-tight truncate">
                KSh {originalPrice.toLocaleString()}
              </span>
            )}
          </div>

          <button
            onClick={handleAdd}
            disabled={isOutOfStock}
            aria-label="Add to cart"
            className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-200 shadow-sm hover:scale-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
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
