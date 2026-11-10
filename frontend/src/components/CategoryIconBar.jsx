// CategoryIconBar.jsx – swipeable horizontal category navigation covering all 11 campus micro-economies
import { Link, useLocation } from 'react-router-dom';
import OLA_CATEGORIES from '../config/categories.js';

export default function CategoryIconBar() {
  const location = useLocation();
  const currentParams = new URLSearchParams(location.search);
  const activeCategory = currentParams.get('category');

  const items = [
    {
      id: 'all',
      label: 'All Items',
      shortLabel: 'All',
      emoji: '🛍️',
      route: '/marketplace',
    },
    ...OLA_CATEGORIES,
  ];

  return (
    <div className="bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-sm py-2.5 px-2">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-2.5 sm:gap-4 overflow-x-auto scrollbar-hide no-scrollbar px-2 pb-1 scroll-smooth">
          {items.map((cat) => {
            const isSelected =
              cat.id === 'all'
                ? !activeCategory && location.pathname === '/marketplace'
                : activeCategory === cat.label;

            return (
              <Link
                key={cat.id}
                to={cat.route}
                className="flex flex-col items-center gap-1.5 min-w-[64px] sm:min-w-[72px] group flex-shrink-0"
              >
                {/* Soft rounded container with subtle border and shadow */}
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-xl sm:text-2xl transition-all duration-200 shadow-sm
                    ${
                      isSelected
                        ? 'bg-orange-50 border-2 border-[#FF5E00] shadow-md -translate-y-0.5'
                        : 'bg-white border border-gray-100 group-hover:border-[#FF5E00]/40 group-hover:shadow-md group-hover:-translate-y-0.5'
                    }`}
                >
                  <span className="transform group-hover:scale-110 transition-transform select-none">
                    {cat.emoji}
                  </span>
                </div>

                {/* Short Category Label */}
                <span
                  className={`text-[11px] font-semibold text-center leading-tight whitespace-nowrap transition-colors
                    ${
                      isSelected
                        ? 'text-[#FF5E00] font-bold'
                        : 'text-gray-700 group-hover:text-[#FF5E00]'
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
