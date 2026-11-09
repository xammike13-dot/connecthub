// PromoCarousel.jsx – bright, airy hero banners floating above light background
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const BANNERS = [
  {
    id: 1,
    badge: 'FREE DELIVERY',
    headline: 'Kibanda Meals — Delivered Fasta! 🍔',
    sub: 'Order from your favourite campus kibandas. Zero delivery fee today.',
    cta: 'Order Food Now',
    link: '/marketplace?category=food',
    bg: 'linear-gradient(135deg, #FF5E00 0%, #FF8C3B 100%)',
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
    link: '/marketplace?category=fashion',
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
    bg: 'linear-gradient(135deg, #FFFFFF 0%, #FFF7F0 100%)',
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
    link: '/marketplace?category=health',
    bg: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%)',
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

  const prev = () => setActive((a) => (a - 1 + BANNERS.length) % BANNERS.length);
  const next = () => setActive((a) => (a + 1) % BANNERS.length);

  useEffect(() => {
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, []);

  const b = BANNERS[active];

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300"
      style={{
        background: b.bg,
        border: b.border ? `1.5px solid ${b.border}` : '1px solid rgba(0,0,0,0.04)',
        minHeight: 185,
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={b.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col justify-center px-6 md:px-12 py-7 md:py-9"
        >
          {/* Badge */}
          <span
            className="inline-block self-start text-[10px] md:text-xs font-black tracking-wider px-3 py-1 rounded-full mb-2.5 shadow-sm uppercase"
            style={{ background: b.badgeBg, color: b.badgeText }}
          >
            {b.badge}
          </span>

          <h2
            className="text-xl md:text-3xl font-extrabold mb-1.5 leading-tight max-w-sm md:max-w-xl"
            style={{ color: b.textColor }}
          >
            {b.headline}
          </h2>

          <p
            className="text-xs md:text-sm mb-5 opacity-90 max-w-md font-medium"
            style={{ color: b.textColor }}
          >
            {b.sub}
          </p>

          <a
            href={b.link}
            className="inline-block self-start font-bold text-xs md:text-sm px-6 py-2.5 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95"
            style={{ background: b.ctaBg, color: b.ctaText }}
          >
            {b.cta} →
          </a>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      <button
        onClick={prev}
        aria-label="Previous banner"
        className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all active:scale-90"
      >
        <ChevronLeft size={18} className="text-gray-800" />
      </button>
      <button
        onClick={next}
        aria-label="Next banner"
        className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all active:scale-90"
      >
        <ChevronRight size={18} className="text-gray-800" />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {BANNERS.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            aria-label={`Go to slide ${i + 1}`}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === active ? 22 : 6,
              height: 6,
              background: i === active ? (b.ctaBg === '#ffffff' ? '#ffffff' : '#FF5E00') : 'rgba(150,150,150,0.3)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
