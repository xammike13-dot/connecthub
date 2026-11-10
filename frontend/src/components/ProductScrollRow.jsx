// ProductScrollRow.jsx – light-mode, snap-scroll horizontal product row with optional countdown & badges
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Clock, Flame } from 'lucide-react';
import ProductCard from './ProductCard';

export default function ProductScrollRow({
  title,
  viewAllLink,
  products,
  hasCountdown = false,
  badge = null,
  subtitle = null,
}) {
  // Live ticking countdown for Flash Sales
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

  if (!products?.length) return null;

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <section className="my-6 md:my-8">
      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 mb-3.5 gap-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-gray-900 font-extrabold text-base sm:text-lg md:text-xl tracking-tight flex items-center gap-2">
            <span>{title}</span>
          </h2>

          {badge && (
            <span className="text-[10px] font-black uppercase tracking-wider bg-orange-100 text-[#FF5E00] px-2 py-0.5 rounded-full border border-orange-200">
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
            className="flex items-center gap-0.5 text-[#FF5E00] hover:text-[#CC4B00] text-xs sm:text-sm font-bold transition-colors group self-start sm:self-auto"
          >
            <span>See All</span>
            <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}
      </div>

      {/* Horizontal scroll — snap on mobile, no-scrollbar */}
      <div className="flex gap-3.5 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-4 px-4 scrollbar-hide no-scrollbar scroll-smooth">
        {products.map((p) => (
          <ProductCard key={p._id} product={p} isGrid={false} />
        ))}
      </div>
    </section>
  );
}
