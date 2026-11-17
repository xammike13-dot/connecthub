// CategoryIconBar.jsx – swipeable horizontal category navigation covering all 21 Olafasta campus micro-economies
import { useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import OLA_CATEGORIES, { CATEGORY_ICONS } from '../config/categories.js';

export default function CategoryIconBar() {
  const location = useLocation();
  const currentParams = new URLSearchParams(location.search);
  const activeCategory = currentParams.get('category');
  const scrollRef = useRef(null);

  const items = [
    {
      id: 'all',
      label: 'All Items',
      shortLabel: 'All',
      emoji: '🛍️',
      iconName: 'ShoppingBag',
      route: '/marketplace',
      accentColor: '#FF5E00',
      lightBg: 'bg-orange-50',
    },
    ...OLA_CATEGORIES,
  ];

  const scroll = (direction) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -260 : 260,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-xs py-2 px-2 relative group/bar">
      <div className="max-w-7xl mx-auto relative">
        {/* Subtle scroll arrows for desktop */}
        <button
          type="button"
          onClick={() => scroll('left')}
          aria-label="Scroll categories left"
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-20 w-7 h-7 bg-white/90 hover:bg-white text-gray-700 hover:text-olaOrange-DEFAULT rounded-full shadow-md border border-gray-200 items-center justify-center cursor-pointer opacity-0 group-hover/bar:opacity-100 transition-opacity"
        >
          <ChevronLeft size={16} />
        </button>

        <button
          type="button"
          onClick={() => scroll('right')}
          aria-label="Scroll categories right"
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-20 w-7 h-7 bg-white/90 hover:bg-white text-gray-700 hover:text-olaOrange-DEFAULT rounded-full shadow-md border border-gray-200 items-center justify-center cursor-pointer opacity-0 group-hover/bar:opacity-100 transition-opacity"
        >
          <ChevronRight size={16} />
        </button>

        {/* Horizontal scroll container with snap-x for mobile touch swipe */}
        <div
          ref={scrollRef}
          className="flex gap-2 sm:gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide no-scrollbar px-1 py-1 scroll-smooth items-center"
        >
          {items.map((cat) => {
            const isSelected =
              cat.id === 'all'
                ? !activeCategory && (location.pathname === '/marketplace' || location.pathname === '/categories')
                : activeCategory === cat.label || location.pathname === cat.route || location.pathname === `/c/${cat.slug}`;

            const IconComponent =
              cat.id === 'all'
                ? ShoppingBag
                : CATEGORY_ICONS[cat.iconName] || Sparkles;

            return (
              <Link
                key={cat.id}
                to={cat.route}
                className="flex flex-col items-center gap-1 min-w-[62px] sm:min-w-[70px] snap-start flex-shrink-0 group outline-none active:scale-95 transition-transform"
              >
                {/* Icon Squircle with colorful Lucide React icon */}
                <div
                  className={`relative w-12 h-12 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-xs
                    ${
                      isSelected
                        ? 'bg-orange-50 border-2 border-[#FF5E00] shadow-md -translate-y-0.5 scale-105'
                        : 'bg-white border border-gray-100 group-hover:border-[#FF5E00]/40 group-hover:shadow-sm group-hover:-translate-y-0.5'
                    }`}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{
                      backgroundColor: `${cat.accentColor}18`,
                    }}
                  >
                    <IconComponent
                      size={18}
                      style={{ color: cat.accentColor }}
                      className="stroke-[2.2]"
                    />
                  </div>

                  {/* Micro Emoji Badge */}
                  <span className="absolute -bottom-1 -right-1 text-[11px] leading-none select-none filter drop-shadow-xs">
                    {cat.emoji}
                  </span>
                </div>

                {/* Short Category Label */}
                <span
                  className={`text-xs leading-tight text-center transition-colors max-w-[68px] sm:max-w-[76px] truncate
                    ${
                      isSelected
                        ? 'text-[#FF5E00] font-bold'
                        : 'text-gray-700 font-semibold group-hover:text-[#FF5E00]'
                    }`}
                >
                  {cat.shortLabel || cat.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
