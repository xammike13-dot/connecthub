// ProductRow.jsx – reusable horizontal scrolling product row with floating edge navigation arrows (< and >) and "See All" end card
import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Clock, ArrowRight } from 'lucide-react';
import ProductCard from './ProductCard';

export default function ProductRow({
  title,
  viewAllLink,
  products = [],
  hasCountdown = false,
  badge = null,
  subtitle = null,
  className = '',
}) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);

  // Live countdown timer for Flash Sales / urgent rows
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 47, seconds: 35 });

  useEffect(() => {
    if (!hasCountdown) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: 59, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 2, minutes: 59, seconds: 59 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasCountdown]);

  // Track scroll position to update left arrow state
  const handleScroll = () => {
    if (!scrollRef.current) return;
    setCanScrollLeft(scrollRef.current.scrollLeft > 20);
  };

  useEffect(() => {
    handleScroll();
  }, [products]);

  // Unified smooth scroll handler
  const scroll = (direction) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -300 : 300,
        behavior: 'smooth',
      });
    }
  };

  if (!products?.length) return null;

  const pad = (n) => String(n).padStart(2, '0');

  // Extract clean category name (e.g. "⚡ Flash Sales" -> "Flash Sales")
  const categoryName = title ? title.replace(/^[^\p{L}\p{N}]+/u, '').trim() : 'Products';
  const targetLink = viewAllLink || `/marketplace?category=${encodeURIComponent(categoryName)}`;

  return (
    <section className={`my-5 md:my-7 ${className}`}>
      {/* ── Section Header ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 mb-3 gap-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-gray-900 font-extrabold text-base sm:text-lg md:text-xl tracking-tight flex items-center gap-2">
            <span>{title}</span>
          </h2>

          {badge && (
            <span className="text-[10px] font-black uppercase tracking-wider bg-orange-100 text-olaOrange-DEFAULT px-2 py-0.5 rounded-full border border-orange-200">
              {badge}
            </span>
          )}

          {/* Flash sales countdown timer */}
          {hasCountdown && (
            <div className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200/80 text-red-600 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
              <Clock size={13} className="animate-pulse text-red-500" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-red-500 mr-1">
                Ends In
              </span>
              <span className="font-mono bg-white px-1 py-0.2 rounded border border-red-100 text-red-700">
                {pad(timeLeft.hours)}
              </span>
              <span>:</span>
              <span className="font-mono bg-white px-1 py-0.2 rounded border border-red-100 text-red-700">
                {pad(timeLeft.minutes)}
              </span>
              <span>:</span>
              <span className="font-mono bg-white px-1 py-0.2 rounded border border-red-100 text-red-700">
                {pad(timeLeft.seconds)}
              </span>
            </div>
          )}

          {subtitle && (
            <span className="text-gray-400 text-xs hidden md:inline-block font-normal">
              · {subtitle}
            </span>
          )}
        </div>

        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="flex items-center gap-0.5 text-olaOrange-DEFAULT hover:text-olaOrange-dark text-xs sm:text-sm font-bold transition-colors group self-start sm:self-auto"
          >
            <span>See All</span>
            <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}
      </div>

      {/* ── 1. MASTER WRAPPER: relative container (no overflow-hidden) ─ */}
      <div className="relative group w-full">

        {/* ── 2. LEFT ARROW (<): visible when user has scrolled right ─ */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Scroll left"
            className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-40 w-9 h-9 sm:w-10 sm:h-10 bg-white/95 hover:bg-white text-gray-800 hover:text-olaOrange-DEFAULT rounded-full shadow-lg border border-gray-200/90 flex items-center justify-center cursor-pointer active:scale-90 transition-all opacity-100"
          >
            <ChevronLeft size={22} className="stroke-[2.5]" />
          </button>
        )}

        {/* ── 3. THE SCROLL CONTAINER: Only element with horizontal scroll ─ */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory gap-3.5 sm:gap-4 no-scrollbar pb-4 px-4 scrollbar-hide scroll-smooth items-stretch"
        >
          {/* Mapped preview products */}
          {products.map((product) => (
            <ProductCard key={product._id} product={product} isGrid={false} />
          ))}

          {/* ── Dedicated "See All" Terminal Card ──────────────── */}
          <Link
            to={targetLink}
            aria-label={`See all ${categoryName}`}
            className="flex-shrink-0 min-w-[160px] w-[160px] md:min-w-[190px] md:w-[190px] rounded-xl snap-start bg-orange-50/70 hover:bg-orange-100/60 border-2 border-dashed border-orange-200/90 hover:border-olaOrange-DEFAULT transition-all duration-200 group/card flex flex-col items-center justify-center p-5 text-center shadow-xs hover:shadow-md cursor-pointer self-stretch"
          >
            <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-orange-100 flex items-center justify-center text-olaOrange-DEFAULT group-hover/card:bg-olaOrange-DEFAULT group-hover/card:text-white group-hover/card:scale-110 transition-all duration-200 mb-3">
              <ArrowRight size={20} className="stroke-[2.5] group-hover/card:translate-x-0.5 transition-transform" />
            </div>

            <p className="text-xs sm:text-sm font-bold text-olaOrange-DEFAULT leading-snug group-hover/card:underline">
              See All {categoryName}
            </p>

            <span className="text-[11px] text-gray-500 font-medium mt-1.5 flex items-center gap-0.5 group-hover/card:text-olaOrange-dark transition-colors">
              Explore More <ChevronRight size={12} />
            </span>
          </Link>
        </div>

        {/* ── 4. RIGHT ARROW (>): Always visible so users know to scroll ─ */}
        <button
          type="button"
          onClick={() => scroll('right')}
          aria-label="Scroll right"
          className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-40 w-9 h-9 sm:w-10 sm:h-10 bg-white/95 hover:bg-white text-gray-800 hover:text-olaOrange-DEFAULT rounded-full shadow-lg border border-gray-200/90 flex items-center justify-center cursor-pointer active:scale-90 transition-all opacity-100"
        >
          <ChevronRight size={22} className="stroke-[2.5]" />
        </button>

      </div>
    </section>
  );
}
