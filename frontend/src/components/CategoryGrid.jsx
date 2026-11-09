// CategoryGrid.jsx – renders the 7 core categories
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import OLA_CATEGORIES from '../config/categories.js';
import { Zap } from 'lucide-react';

// ICON_MAP is defined in HomePage; we duplicate minimal map here for required icons
import {
  UtensilsCrossed,
  Home,
  Shirt,
  Smartphone,
  ShoppingBasket,
  Pill,
  Bike,
} from 'lucide-react';

const ICON_MAP = {
  UtensilsCrossed,
  Home,
  Shirt,
  Smartphone,
  ShoppingBasket,
  Pill,
  Bike,
};

export default function CategoryGrid() {
  return (
    <section className="py-20 bg-[#0F172A]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-14">
          <span className="inline-block bg-[#FF5E00]/10 border border-[#FF5E00]/30 text-[#FF5E00] text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-4">
            Marketplace
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
            What Do You Need Today?
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            7 categories covering everything a comrade needs on campus.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {OLA_CATEGORIES.map((cat, index) => {
            const Icon = ICON_MAP[cat.iconName] || Zap;
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.07, duration: 0.4 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="group"
              >
                <Link
                  to={cat.route}
                  className="flex flex-col h-full bg-[#1E293B] hover:bg-slate-700/80 border border-slate-700 hover:border-[#FF5E00]/40 rounded-2xl p-5 transition-all duration-300"
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 text-white shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${cat.accentColor}CC, ${cat.accentColor}44)` }}
                  >
                    <Icon className="w-7 h-7" style={{ color: cat.accentColor }} />
                  </div>
                  <h3 className="text-white font-bold text-sm md:text-base leading-tight mb-1 group-hover:text-[#FF5E00] transition-colors">
                    {cat.label}
                  </h3>
                  <p className="text-slate-400 text-xs leading-relaxed flex-1">
                    {cat.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {cat.subcategories.slice(0, 2).map((sub) => (
                      <span
                        key={sub}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                        style={{
                          color: cat.accentColor,
                          borderColor: `${cat.accentColor}44`,
                          backgroundColor: `${cat.accentColor}11`,
                        }}
                      >
                        {sub}
                      </span>
                    ))}
                    {cat.subcategories.length > 2 && (
                      <span className="text-[10px] text-slate-500 px-2 py-0.5">
                        +{cat.subcategories.length - 2}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-4 text-slate-500 group-hover:text-[#FF5E00] transition-colors text-xs font-semibold">
                    Shop Now <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </div>
                </Link>
              </motion.div>
            );
          })}
          {/* Bodaboda CTA card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.56, duration: 0.4 }}
            whileHover={{ y: -4, scale: 1.02 }}
          >
            <Link
              to="/transport"
              className="flex flex-col h-full bg-gradient-to-br from-[#FF5E00]/20 to-[#1E293B] border border-[#FF5E00]/40 hover:border-[#FF5E00] rounded-2xl p-5 transition-all duration-300 group"
            >
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 bg-[#FF5E00]/20">
                <Bike className="w-7 h-7 text-[#FF5E00]" />
              </div>
              <h3 className="text-white font-bold text-sm md:text-base leading-tight mb-1 group-hover:text-[#FF5E00] transition-colors">
                Bodaboda Rides
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed flex-1">
                Quick boda rides across all Moi University corridors — fasta fasta.
              </p>
              <div className="flex items-center gap-1 mt-4 text-[#FF5E00] text-xs font-semibold">
                Book a Ride <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </div>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
