// CategoryGrid.jsx – renders all 21 official Olafasta categories in a responsive dark-theme showcase grid
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Zap, ArrowRight, Bike } from 'lucide-react';
import OLA_CATEGORIES, { CATEGORY_ICONS } from '../config/categories.js';

export default function CategoryGrid() {
  return (
    <section className="py-16 md:py-20 bg-[#0F172A]">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Heading */}
        <div className="text-center mb-10 md:mb-14">
          <span className="inline-block bg-[#FF5E00]/10 border border-[#FF5E00]/30 text-[#FF5E00] text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-4">
            Official Taxonomy
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-3">
            What Do You Need Today?
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            21 official Olafasta micro-economies covering everything a comrade needs on campus.
          </p>
        </div>

        {/* Responsive Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {OLA_CATEGORIES.map((cat, index) => {
            const Icon = CATEGORY_ICONS[cat.iconName] || Zap;
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(index * 0.03, 0.4), duration: 0.3 }}
                whileHover={{ y: -3, scale: 1.01 }}
                className="group"
              >
                <Link
                  to={cat.route}
                  className="flex flex-col h-full bg-[#1E293B] hover:bg-slate-700/80 border border-slate-700/80 hover:border-[#FF5E00]/50 rounded-2xl p-4 transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105"
                      style={{
                        background: `linear-gradient(135deg, ${cat.accentColor}33, ${cat.accentColor}11)`,
                        border: `1px solid ${cat.accentColor}44`,
                      }}
                    >
                      <Icon className="w-5 h-5 stroke-[2.2]" style={{ color: cat.accentColor }} />
                    </div>

                    <span className="text-xl select-none">{cat.emoji}</span>
                  </div>

                  <h3 className="text-white font-bold text-xs sm:text-sm leading-tight mb-1 group-hover:text-[#FF5E00] transition-colors line-clamp-1">
                    {cat.label}
                  </h3>

                  <p className="text-slate-400 text-[11px] leading-relaxed flex-1 line-clamp-2 mb-2">
                    {cat.tagline || cat.description}
                  </p>

                  <div className="flex flex-wrap gap-1 mt-auto pt-1">
                    {cat.subcategories.slice(0, 2).map((sub) => (
                      <span
                        key={sub}
                        className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full border truncate max-w-[100px]"
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
                      <span className="text-[9.5px] text-slate-500 self-center">
                        +{cat.subcategories.length - 2}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 mt-3 text-slate-500 group-hover:text-[#FF5E00] transition-colors text-[11px] font-semibold">
                    <span>Shop Now</span>
                    <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              </motion.div>
            );
          })}

          {/* Quick Boda Special CTA card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.35, duration: 0.3 }}
            whileHover={{ y: -3, scale: 1.01 }}
          >
            <Link
              to="/transport"
              className="flex flex-col h-full bg-gradient-to-br from-[#FF5E00]/20 to-[#1E293B] border border-[#FF5E00]/40 hover:border-[#FF5E00] rounded-2xl p-4 transition-all duration-200 group"
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 bg-[#FF5E00]/20 border border-[#FF5E00]/40">
                <Bike className="w-5 h-5 text-[#FF5E00]" />
              </div>
              <h3 className="text-white font-bold text-xs sm:text-sm leading-tight mb-1 group-hover:text-[#FF5E00] transition-colors">
                Instant Boda Rides
              </h3>
              <p className="text-slate-400 text-[11px] leading-relaxed flex-1">
                Stage, Mabs, Chebarus & Kesses campus corridor runs — fasta fasta.
              </p>
              <div className="flex items-center gap-1 mt-3 text-[#FF5E00] text-[11px] font-semibold">
                <span>Book Ride</span>
                <ArrowRight size={12} />
              </div>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
