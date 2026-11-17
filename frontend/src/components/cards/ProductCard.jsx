// cards/ProductCard.jsx — wired to ProductDetailModal for variation-aware products
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Check, Tag } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import ProductDetailModal from '../modals/ProductDetailModal';

const ProductCard = ({ product, isGrid = true, className = '' }) => {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  if (!product) return null;

  const {
    _id, name, price, originalPrice,
    images, coverImage = 0,
    category, businessCategory, condition,
    stock, isActive,
    variations = [], addOns = [],
  } = product;

  const mainImage =
    images?.[coverImage] ||
    images?.[0] ||
    null;

  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const isOutOfStock = stock === 0 || !isActive;
  const displayCategory = businessCategory || category || '';

  // Products with variations or add-ons → open modal.
  // Simple products (no variations) → direct add-to-cart.
  const hasOptions = (variations?.length > 0) || (addOns?.length > 0);

  const handleAddClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;

    if (hasOptions) {
      setModalOpen(true);
    } else {
      addToCart({ _id, name, price, images, coverImage, category: displayCategory, stock });
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    }
  };

  return (
    <>
      <Link
        to={`/product/${_id}`}
        onClick={(e) => { if (hasOptions) { e.preventDefault(); setModalOpen(true); } }}
        className={`group relative flex flex-col bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all duration-200 ${className}`}
      >
        {/* Image Area */}
        <div className="relative w-full aspect-square bg-gray-100 overflow-hidden">
          {mainImage ? (
            <img
              src={mainImage}
              alt={name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-gray-50">
              <Tag size={32} className="text-gray-300" />
            </div>
          )}

          {hasDiscount && (
            <span className="absolute top-2 left-2 text-[10px] font-black bg-[#FF5E00] text-white px-2 py-0.5 rounded-full shadow-sm z-10">
              -{discountPercent}%
            </span>
          )}
          {condition && (
            <span className="absolute top-2 right-2 text-[9px] font-bold bg-white/95 backdrop-blur-sm text-gray-700 px-1.5 py-0.5 rounded-md shadow-sm z-10">
              {condition}
            </span>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
              <span className="text-white text-xs font-bold bg-black/60 px-3 py-1 rounded-full">Out of Stock</span>
            </div>
          )}
          {displayCategory && (
            <span className="absolute bottom-2 left-2 text-[9px] font-bold bg-white/90 backdrop-blur-sm text-gray-700 px-1.5 py-0.5 rounded-md shadow-sm max-w-[85%] truncate z-10">
              {displayCategory}
            </span>
          )}
          {/* Variations indicator */}
          {hasOptions && !isOutOfStock && (
            <span className="absolute bottom-2 right-2 text-[9px] font-bold bg-[#FF5E00]/90 text-white px-1.5 py-0.5 rounded-md z-10">
              Options
            </span>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col flex-1 p-2.5 md:p-3 gap-1.5 justify-between">
          <div>
            <p className="text-gray-900 text-xs md:text-sm font-bold leading-snug line-clamp-2 group-hover:text-[#FF5E00] transition-colors">
              {name}
            </p>
          </div>

          <div className="flex items-center justify-between mt-auto pt-1.5 border-t border-gray-50">
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
              onClick={handleAddClick}
              disabled={isOutOfStock}
              aria-label={hasOptions ? 'View options' : 'Add to cart'}
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

      {/* Quick-view modal */}
      <ProductDetailModal
        product={product}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
};

export default ProductCard;
