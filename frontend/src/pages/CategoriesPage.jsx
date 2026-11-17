// CategoriesPage.jsx – Master Category Directory for Olafasta's 21 Campus Micro-Economies
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Sparkles, ChevronRight, Layers, ArrowUpRight } from 'lucide-react';
import OLA_CATEGORIES, { CATEGORY_ICONS } from '../config/categories.js';

export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);

  // Filter categories by search query across label, tagline, description, and subcategories
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return OLA_CATEGORIES;
    return OLA_CATEGORIES.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.shortLabel.toLowerCase().includes(q) ||
        c.tagline?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.subcategories?.some((s) => s.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20 pt-3 md:pt-6 font-sans">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">

        {/* ── Page Header & Search ──────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-xs mb-4 md:mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-orange-100/80 text-olaOrange-DEFAULT font-bold text-[11px] px-2.5 py-0.5 rounded-full mb-1">
                <Layers size={13} className="text-olaOrange-DEFAULT" />
                <span>21 CAMPUS MICRO-ECONOMIES</span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
                All Olafasta Categories
              </h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
                Explore every student plug, food kiosk, hostel service & thrift store at Moi University.
              </p>
            </div>

            {/* Quick search input */}
            <div className="relative w-full md:w-80">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search categories, items..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm focus:outline-none focus:border-olaOrange-DEFAULT focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Quick Stats Pill Bar */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-hide pt-1 text-xs text-gray-500">
            <span className="font-semibold text-gray-700 whitespace-nowrap">
              Showing {filteredCategories.length} categories
            </span>
            <span>·</span>
            <span className="whitespace-nowrap">⚡ Instant Campus Delivery</span>
            <span>·</span>
            <span className="whitespace-nowrap">🔒 Comrade Verified</span>
          </div>
        </div>

        {/* ── Dense Master Category Grid (grid-cols-4 or grid-cols-5 on mobile) ── */}
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-2 sm:gap-3.5 mb-8">
          {filteredCategories.map((cat) => {
            const IconComponent = CATEGORY_ICONS[cat.iconName] || Sparkles;
            const isHovered = activeCategory === cat.id;

            return (
              <Link
                key={cat.id}
                to={cat.route}
                onMouseEnter={() => setActiveCategory(cat.id)}
                onMouseLeave={() => setActiveCategory(null)}
                className="group relative flex flex-col items-center bg-white hover:bg-orange-50/30 rounded-2xl p-2.5 sm:p-3.5 border border-gray-100 hover:border-olaOrange-DEFAULT/40 shadow-xs hover:shadow-md transition-all duration-200 active:scale-95 text-center"
              >
                {/* Micro Category Badge (e.g. Popular, Sweet, etc.) */}
                {cat.badge && (
                  <span className="hidden sm:inline-block absolute top-1.5 right-1.5 text-[8.5px] font-bold px-1.5 py-0.2 rounded-full bg-gray-100 group-hover:bg-orange-100 group-hover:text-olaOrange-DEFAULT text-gray-600 transition-colors">
                    {cat.badge}
                  </span>
                )}

                {/* Elevated Colorful Squircle Icon Container */}
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-2xs group-hover:scale-110 mb-2 relative ${cat.lightBg}`}
                  style={{
                    backgroundColor: `${cat.accentColor}15`,
                    borderColor: `${cat.accentColor}30`,
                  }}
                >
                  <IconComponent
                    size={22}
                    className="transition-transform group-hover:rotate-3 stroke-[2.2]"
                    style={{ color: cat.accentColor }}
                  />

                  {/* Micro Emoji Corner Accent */}
                  <span className="absolute -bottom-1 -right-1 text-[11px] select-none filter drop-shadow-xs">
                    {cat.emoji}
                  </span>
                </div>

                {/* Short Category Title */}
                <h3 className="text-gray-900 font-bold text-xs leading-tight group-hover:text-olaOrange transition-colors line-clamp-2 w-full text-center">
                  {cat.shortLabel}
                </h3>

                {/* Tagline / Subtitle */}
                <p className="text-gray-400 text-[10px] leading-tight mt-0.5 line-clamp-1 w-full text-center">
                  {cat.tagline || cat.label}
                </p>

                {/* Tap to enter arrow on hover/desktop */}
                <span className="hidden sm:flex items-center gap-0.5 text-[10px] font-semibold text-olaOrange-DEFAULT opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                  <span>Explore</span>
                  <ArrowUpRight size={11} />
                </span>
              </Link>
            );
          })}
        </div>

        {/* ── Deep Dive Category Sections (Grouped breakdown with subcategories) ── */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>Detailed Category Subsections</span>
              </h2>
              <p className="text-gray-400 text-xs">
                Browse direct sub-departments and specific student products
              </p>
            </div>
            <Link
              to="/marketplace"
              className="text-xs font-bold text-olaOrange-DEFAULT hover:underline flex items-center gap-0.5"
            >
              <span>View In Marketplace</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((cat) => {
              const IconComponent = CATEGORY_ICONS[cat.iconName] || Sparkles;

              return (
                <div
                  key={`detail-${cat.id}`}
                  className="rounded-xl border border-gray-100 hover:border-gray-200 p-3.5 bg-gray-50/50 hover:bg-white transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${cat.accentColor}18` }}
                      >
                        <IconComponent size={16} style={{ color: cat.accentColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={cat.route}
                          className="font-bold text-xs sm:text-sm text-gray-900 hover:text-olaOrange-DEFAULT truncate block"
                        >
                          {cat.label}
                        </Link>
                        <span className="text-[10px] text-gray-400 block truncate">
                          {cat.tagline}
                        </span>
                      </div>
                    </div>

                    <p className="text-gray-500 text-[11px] leading-relaxed mb-2.5 line-clamp-2">
                      {cat.description}
                    </p>

                    {/* Subcategory Pills */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {cat.subcategories.map((sub) => (
                        <Link
                          key={sub}
                          to={`/marketplace?category=${encodeURIComponent(cat.label)}&sub=${encodeURIComponent(sub)}`}
                          className="text-[10px] font-medium bg-white hover:bg-orange-50 text-gray-600 hover:text-olaOrange-DEFAULT border border-gray-200/80 rounded-md px-1.5 py-0.5 transition-colors"
                        >
                          {sub}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <Link
                    to={cat.route}
                    className="self-start text-[11px] font-bold text-olaOrange-DEFAULT hover:underline flex items-center gap-1 mt-1 pt-1"
                  >
                    <span>Shop {cat.shortLabel}</span>
                    <ChevronRight size={12} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
