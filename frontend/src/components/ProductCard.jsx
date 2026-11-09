// ProductCard.jsx – crisp light-mode product card
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ShoppingCart } from 'lucide-react';

export default function ProductCard({ product }) {
  const [added, setAdded] = useState(false);

  const { _id, name, price, oldPrice, images, discountPct, isLive } = product;
  const img = images?.[0] || null;

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
    // TODO: wire to CartContext
  };

  return (
    <Link
      to={`/product/${_id}`}
      className="relative flex-shrink-0 min-w-[160px] w-[160px] md:min-w-[190px] md:w-[190px]
                 bg-white rounded-xl overflow-hidden border border-gray-100
                 shadow-sm hover:shadow-md transition-all duration-200 snap-start group flex flex-col"
    >
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
          <div className="text-4xl md:text-5xl select-none">
            🛍️
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
      </div>

      {/* ── Details Area ── */}
      <div className="flex flex-col flex-1 p-3 md:p-3.5 gap-1.5 justify-between">
        <p className="text-gray-900 text-xs md:text-sm font-bold leading-snug line-clamp-2">
          {name}
        </p>

        {/* Pricing & Add to Cart button */}
        <div className="flex items-center justify-between mt-1 pt-1 border-t border-gray-50">
          <div className="flex flex-col">
            <span className="text-[#FF5E00] font-extrabold text-sm md:text-base leading-tight">
              KSh {price?.toLocaleString()}
            </span>
            {oldPrice && (
              <span className="text-gray-400 text-xs line-through leading-tight">
                {oldPrice.toLocaleString()}
              </span>
            )}
          </div>

          {/* Add button with hover pop */}
          <button
            onClick={handleAdd}
            aria-label="Add to cart"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm hover:scale-110 active:scale-95"
            style={{ background: added ? '#027A2B' : '#FF5E00' }}
          >
            {added
              ? <ShoppingCart size={15} className="text-white" />
              : <Plus size={16} className="text-white" />
            }
          </button>
        </div>
      </div>
    </Link>
  );
}
