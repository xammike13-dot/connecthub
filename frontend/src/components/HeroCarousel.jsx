// HeroCarousel.jsx – simple auto‑rotating banner carousel
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const BANNERS = [
  { id: 1, text: '50% Off Your First Boda Ride! 🏍️', bg: '#FF5E00' },
  { id: 2, text: 'Flash Sale: Mitumba Fits Under KSh 300! 👗', bg: '#6BE319' },
  { id: 3, text: 'Hungry? Free Delivery from Local Kibandas 🍔', bg: '#FF5E00' },
];

export default function HeroCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % BANNERS.length);
    }, 5000); // rotate every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const banner = BANNERS[active];
  return (
    <section className="relative overflow-hidden bg-[#0F172A] py-20">
      <motion.div
        key={banner.id}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-4xl mx-auto text-center"
      >
        <div
          className="inline-block px-6 py-3 rounded-full text-white font-bold"
          style={{ backgroundColor: banner.bg }}
        >
          {banner.text}
        </div>
      </motion.div>
    </section>
  );
}
