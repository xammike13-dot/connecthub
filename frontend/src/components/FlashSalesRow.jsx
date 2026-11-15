// FlashSalesRow.jsx — fetches real products with discounts from the API
import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { productAPI } from '../services/api';
import { useCart } from '../context/CartContext';

export default function FlashSalesRow() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchDiscounted = async () => {
      try {
        setLoading(true);
        const response = await productAPI.getAll({
          page: 1,
          limit: 10,
          excludeHealthcare: true,
          sort: '-createdAt',
        });
        const all = response.data?.data || [];
        // Filter to products that have a genuine discount
        const discounted = all.filter(
          (p) => p.originalPrice && p.originalPrice > p.price
        );
        setProducts(discounted.length > 0 ? discounted : all.slice(0, 8));
      } catch (err) {
        console.error('[FlashSalesRow] Failed to fetch:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDiscounted();
  }, []);

  const scroll = (direction) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -300 : 300,
        behavior: 'smooth',
      });
    }
  };

  if (loading) {
    return (
      <section className="py-6 bg-gradient-to-b from-orange-50/30 to-transparent">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">
              Flash Sales
            </h2>
          </div>
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="min-w-[190px] w-[190px] bg-white rounded-xl p-3 border border-gray-100 shadow-sm animate-pulse"
              >
                <div className="w-full aspect-square bg-gray-200 rounded-lg mb-2" />
                <div className="h-3 bg-gray-200 rounded w-full mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!products.length) return null;

  return (
    <section className="py-6 bg-gradient-to-b from-orange-50/30 to-transparent">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 mb-4">
          Flash Sales
        </h2>

        <div className="relative group">
          {/* Left Arrow */}
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Scroll left"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/4 z-10 w-10 h-10 bg-white rounded-full shadow-md border border-gray-100 flex items-center justify-center text-gray-800 hover:text-[#FF5E00] hover:scale-105 active:scale-95 transition-all cursor-pointer hidden md:flex"
          >
            <ChevronLeft size={20} className="stroke-[2.5]" />
          </button>

          {/* Right Arrow */}
          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Scroll right"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 z-10 w-10 h-10 bg-white rounded-full shadow-md border border-gray-100 flex items-center justify-center text-gray-800 hover:text-[#FF5E00] hover:scale-105 active:scale-95 transition-all cursor-pointer hidden md:flex"
          >
            <ChevronRight size={20} className="stroke-[2.5]" />
          </button>

          {/* Scrollable Track */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide no-scrollbar scroll-smooth"
          >
            {products.map((p) => {
              const oldPrice = p.originalPrice || null;
              const hasDiscount = oldPrice && oldPrice > p.price;
              const discountPct = hasDiscount
                ? Math.round(((oldPrice - p.price) / oldPrice) * 100)
                : 0;
              const img = p.images?.[0] || null;

              return (
                <motion.div
                  key={p._id}
                  className="min-w-[190px] w-[190px] bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md flex flex-col snap-start flex-shrink-0 transition-all"
                  whileHover={{ y: -3 }}
                >
                  <Link to={`/product/${p._id}`}>
                    <div className="relative w-full aspect-square bg-gray-100 overflow-hidden">
                      {img ? (
                        <img
                          src={img}
                          alt={p.name}
                          className="w-full h-full object-cover rounded-t-lg"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-orange-50 to-gray-50" />
                      )}
                      {hasDiscount && (
                        <span className="absolute top-2 left-2 text-[10px] font-black bg-[#FF5E00] text-white px-2 py-0.5 rounded-full shadow-sm">
                          -{discountPct}%
                        </span>
                      )}
                    </div>
                  </Link>
                  <div className="flex flex-col p-3 gap-1 flex-1">
                    <h3 className="text-gray-900 font-semibold text-xs mb-0.5 line-clamp-2">
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[#FF5E00] font-bold text-sm">
                        KSh {p.price?.toLocaleString()}
                      </span>
                      {hasDiscount && (
                        <span className="text-gray-400 text-xs line-through">
                          KSh {oldPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        addToCart({
                          _id: p._id,
                          name: p.name,
                          price: p.price,
                          images: p.images,
                          category: p.businessCategory || p.category,
                          stock: p.stock,
                        });
                      }}
                      className="mt-auto bg-[#FF5E00] hover:bg-[#e55400] text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                    >
                      Add to Cart
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
