// FlashSalesRow.jsx – light-mode horizontal scroll of hot products with edge navigation arrows (< and >)
import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function FlashSalesRow() {
  const [products, setProducts] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    fetch('/api/products?page=1&limit=10')
      .then((res) => res.json())
      .then((json) => {
        const items = Array.isArray(json) ? json : (json?.data ?? []);
        setProducts(items);
      })
      .catch(console.error);
  }, []);

  const scroll = (direction) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -300 : 300,
        behavior: 'smooth',
      });
    }
  };

  if (!products.length) return null;

  return (
    <section className="py-8 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 mb-4">
          Flash Sales
        </h2>

        {/* ── Relative & Group Container ───────────────────────── */}
        <div className="relative group">
          {/* Left Arrow (<) */}
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Scroll left"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/4 z-10 w-10 h-10 bg-white rounded-full shadow-md border border-gray-100 flex items-center justify-center text-gray-800 hover:text-olaOrange-DEFAULT hover:scale-105 active:scale-95 transition-all cursor-pointer hidden md:flex"
          >
            <ChevronLeft size={20} className="stroke-[2.5]" />
          </button>

          {/* Right Arrow (>) */}
          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Scroll right"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 z-10 w-10 h-10 bg-white rounded-full shadow-md border border-gray-100 flex items-center justify-center text-gray-800 hover:text-olaOrange-DEFAULT hover:scale-105 active:scale-95 transition-all cursor-pointer hidden md:flex"
          >
            <ChevronRight size={20} className="stroke-[2.5]" />
          </button>

          {/* Scrollable Track */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide no-scrollbar scroll-smooth"
          >
            {products.map((p) => {
              const oldPrice = p.oldPrice || Math.round(p.price * 1.3);
              return (
                <motion.div
                  key={p._id}
                  className="min-w-[190px] w-[190px] bg-white rounded-xl p-3 border border-gray-100 shadow-sm hover:shadow-md flex flex-col snap-start flex-shrink-0 transition-all"
                  whileHover={{ y: -3 }}
                >
                  <Link to={`/product/${p._id}`}>
                    <img
                      src={p.images?.[0] || '/placeholder.png'}
                      alt={p.name}
                      className="w-full aspect-square object-cover rounded-lg mb-2 bg-gray-100"
                      loading="lazy"
                    />
                  </Link>
                  <h3 className="text-gray-900 font-semibold text-xs mb-1 truncate">
                    {p.name}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-gray-400 text-xs line-through">KSh {oldPrice}</span>
                    <span className="text-olaOrange-DEFAULT font-bold text-sm">KSh {p.price}</span>
                  </div>
                  <button className="mt-auto bg-olaOrange-DEFAULT hover:bg-olaOrange-dark text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
                    Add to Cart
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
