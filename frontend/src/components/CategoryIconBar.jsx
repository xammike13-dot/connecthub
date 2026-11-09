// CategoryIconBar.jsx – bright, light-mode sticky category icon bar
import { Link } from 'react-router-dom';

const CATEGORIES = [
  { id: 'all',         label: 'All',           icon: '🛍️',  route: '/marketplace',                     accent: '#FF5E00' },
  { id: 'food',        label: 'Food',          icon: '🍔',  route: '/marketplace?category=food',        accent: '#FF5E00' },
  { id: 'fashion',     label: 'Mitumba',       icon: '👗',  route: '/marketplace?category=fashion',     accent: '#027A2B' },
  { id: 'hostel',      label: 'Hostel',        icon: '🏠',  route: '/marketplace?category=hostel',      accent: '#FF5E00' },
  { id: 'electronics', label: 'Tech',          icon: '📱',  route: '/marketplace?category=electronics', accent: '#027A2B' },
  { id: 'health',      label: 'Chemist',       icon: '💊',  route: '/marketplace?category=health',      accent: '#FF5E00' },
  { id: 'campus',      label: 'Campus',        icon: '🎓',  route: '/marketplace?category=campus',      accent: '#027A2B' },
  { id: 'shops',       label: 'Daily Shops',   icon: '🛒',  route: '/marketplace?category=shops',       accent: '#FF5E00' },
  { id: 'boda',        label: 'Boda Ride',     icon: '🏍️',  route: '/transport',                        accent: '#FF5E00' },
  { id: 'rentals',     label: 'Rentals',       icon: '🔑',  route: '/rentals',                          accent: '#027A2B' },
];

export default function CategoryIconBar() {
  return (
    <div className="bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-sm py-3 px-2">
      <div className="flex gap-4 overflow-x-auto scrollbar-hide no-scrollbar px-2 pb-1">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.id}
            to={cat.route}
            className="flex flex-col items-center gap-1.5 min-w-[62px] group flex-shrink-0"
          >
            {/* Soft rounded container with subtle border and shadow */}
            <div
              className="w-13 h-13 p-3 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-2xl
                         group-hover:border-[#FF5E00]/40 group-hover:shadow-md group-hover:scale-105 transition-all duration-200"
            >
              <span className="transform group-hover:scale-110 transition-transform select-none">
                {cat.icon}
              </span>
            </div>
            {/* Label */}
            <span className="text-[11px] font-semibold text-gray-600 group-hover:text-[#FF5E00] text-center leading-tight whitespace-nowrap transition-colors">
              {cat.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
