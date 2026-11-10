// PromoCarousel.jsx – hero promo banner carousel with floating Left (<) and Right (>) navigation arrows
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const BANNERS = [
  {
    id: 1,
    badge: 'FREE DELIVERY',
    headline: 'Kibanda Meals — Delivered Fasta! 🍔',
    sub: 'Order from your favourite campus kibandas. Zero delivery fee today.',
    cta: 'Order Food Now',
    link: '/marketplace?category=Food+%26+Drinks',
    bg: 'linear-gradient(135deg, #FF5E00 0%, #FF7A2E 100%)',
    textColor: '#ffffff',
    badgeBg: 'rgba(255,255,255,0.25)',
    badgeText: '#ffffff',
    ctaBg: '#ffffff',
    ctaText: '#FF5E00',
  },
  {
    id: 2,
    badge: 'MITUMBA CLEAROUT',
    headline: 'Fresh Mitumba Drops — From KSh 150! 👗',
    sub: 'Top thrift picks updated daily. Comrades grab yours before stock clears.',
    cta: 'Shop Mitumba',
    link: '/marketplace?category=Fashion+%26+Mitumba',
    bg: 'linear-gradient(135deg, #027A2B 0%, #04A83C 100%)',
    textColor: '#ffffff',
    badgeBg: 'rgba(255,255,255,0.25)',
    badgeText: '#ffffff',
    ctaBg: '#ffffff',
    ctaText: '#027A2B',
  },
  {
    id: 3,
    badge: '50% OFF BODA',
    headline: '50% Off Your First Boda Trip! 🏍️',
    sub: 'Kesses · Chebarus · Mabs · Stage — riders ready in 3 minutes.',
    cta: 'Book a Ride',
    link: '/transport',
    bg: 'linear-gradient(135deg, #FFF8F3 0%, #FFEFE5 100%)',
    textColor: '#1E293B',
    badgeBg: '#FF5E00',
    badgeText: '#ffffff',
    ctaBg: '#FF5E00',
    ctaText: '#ffffff',
    border: '#FED7AA',
  },
  {
    id: 4,
    badge: 'EMERGENCY MEDS',
    headline: 'Dawa Fasta — Meds Delivered to Hostel 💊',
    sub: 'Not feeling well? Chemist orders delivered right to your doorstep.',
    cta: 'Order Chemist',
    link: '/marketplace?category=Chemist+%26+Wellness',
    bg: 'linear-gradient(135deg, #F0FDF4 0%, #E8F5EC 100%)',
    textColor: '#1E293B',
    badgeBg: '#027A2B',
    badgeText: '#ffffff',
    ctaBg: '#027A2B',
    ctaText: '#ffffff',
    border: '#BBF7D0',
  },
];

export default function PromoCarousel() {
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Swipe gesture tracking for touch devices
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const prev = () => setActive((a) => (a - 1 + BANNERS.length) % BANNERS.length);
  const next = () => setActive((a) => (a + 1) % BANNERS.length);

  // Auto-rotation every 5 seconds (pauses on hover)
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [isPaused, active]);

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) next();
    if (distance < -50) prev();
    setTouchStart(0);
    setTouchEnd(0);
  };

  const b = BANNERS[active];

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 select-none"
      style={{
        background: b.bg,
        border: b.border ? `1.5px solid ${b.border}` : '1px solid rgba(0,0,0,0.04)',
        minHeight: 195,
      }}
    >
      {/* ── 1. Animated Slide Content ────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={b.id}
          initial={{ opacity: 0, x: 25 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -25 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col justify-center px-6 md:px-16 py-8 md:py-10"
        >
          {/* Badge */}
          <span
            className="inline-block self-start text-[10px] md:text-xs font-black tracking-wider px-3 py-1 rounded-full mb-2.5 shadow-xs uppercase"
            style={{ background: b.badgeBg, color: b.badgeText }}
          >
            {b.badge}
          </span>

          {/* Headline */}
          <h2
            className="text-xl md:text-3xl font-extrabold mb-1.5 leading-tight max-w-sm md:max-w-xl"
            style={{ color: b.textColor }}
          >
            {b.headline}
          </h2>

          {/* Subtext */}
          <p
            className="text-xs md:text-sm mb-5 opacity-90 max-w-md font-medium leading-relaxed"
            style={{ color: b.textColor }}
          >
            {b.sub}
          </p>

          {/* CTA Link */}
          <Link
            to={b.link}
            className="inline-block self-start font-bold text-xs md:text-sm px-6 py-2.5 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95"
            style={{ background: b.ctaBg, color: b.ctaText }}
          >
            {b.cta} →
          </Link>
        </motion.div>
      </AnimatePresence>

      {/* ── 2. Floating Navigation Arrows (< and >) ─────────── */}
      <button
        onClick={prev}
        type="button"
        aria-label="Previous banner"
        className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-gray-800 hover:text-olaOrange-DEFAULT hover:scale-105 transition-all cursor-pointer border border-gray-100 active:scale-90"
      >
        <ChevronLeft size={20} className="stroke-[2.5]" />
      </button>

      <button
        onClick={next}
        type="button"
        aria-label="Next banner"
        className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-gray-800 hover:text-olaOrange-DEFAULT hover:scale-105 transition-all cursor-pointer border border-gray-100 active:scale-90"
      >
        <ChevronRight size={20} className="stroke-[2.5]" />
      </button>

      {/* ── 3. Pagination Dots ─────────────────────────────────── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10 items-center">
        {BANNERS.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2 transition-all duration-300 cursor-pointer ${
              i === active
                ? 'bg-olaOrange-DEFAULT w-6 rounded-full ring-1 ring-white/60 shadow-xs'
                : 'bg-gray-300 hover:bg-gray-400 w-2 rounded-full'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
