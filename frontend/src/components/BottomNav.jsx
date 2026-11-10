// BottomNav.jsx – native app-style bottom navigation bar for mobile
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, Heart, ShoppingCart, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function BottomNav() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { cartItemCount } = useCart();

  // Don't render on dedicated full-screen auth pages if desired, but for general app feel:
  if (location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  const getProfileRoute = () => {
    if (!isAuthenticated || !user) return '/login';
    switch (user.role) {
      case 'customer':
        return '/customer/dashboard';
      case 'landlord':
        return '/landlord/dashboard';
      case 'business':
        return '/business/dashboard';
      case 'rider':
        return '/rider/dashboard';
      case 'assistant':
        return '/assistant/dashboard';
      case 'caretaker':
        return '/caretaker/dashboard';
      default:
        return '/customer/dashboard';
    }
  };

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      route: '/',
      isActive: location.pathname === '/',
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: LayoutGrid,
      route: '/marketplace',
      isActive: location.pathname.startsWith('/marketplace'),
    },
    {
      id: 'wishlist',
      label: 'Wishlist',
      icon: Heart,
      route: '/wishlist',
      isActive: location.pathname === '/wishlist',
    },
    {
      id: 'cart',
      label: 'Cart',
      icon: ShoppingCart,
      route: '/cart',
      badge: cartItemCount > 0 ? cartItemCount : null,
      isActive: location.pathname === '/cart',
    },
    {
      id: 'profile',
      label: isAuthenticated ? 'Profile' : 'Sign In',
      icon: User,
      route: getProfileRoute(),
      isActive:
        location.pathname.includes('/dashboard') ||
        location.pathname === '/login' ||
        location.pathname === '/profile',
    },
  ];

  return (
    <nav
      className="flex md:hidden fixed bottom-0 left-0 w-full z-50 bg-white/98 backdrop-blur-md border-t border-gray-200 px-3 py-1.5 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'calc(0.4rem + env(safe-area-inset-bottom, 0px))' }}
      aria-label="Mobile Bottom Navigation"
    >
      <div className="flex w-full items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;

          return (
            <Link
              key={item.id}
              to={item.route}
              className="flex flex-col items-center justify-center flex-1 py-1 relative group active:scale-90 transition-transform"
            >
              {/* Icon Container */}
              <div className="relative">
                <Icon
                  size={20}
                  className={`transition-colors duration-200 ${
                    active ? 'text-[#FF5E00] stroke-[2.4]' : 'text-gray-500 group-hover:text-gray-700 stroke-[1.8]'
                  }`}
                />

                {/* Cart Badge */}
                {item.badge !== null && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-[#FF5E00] text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] mt-1 font-semibold leading-none tracking-tight transition-colors duration-200 ${
                  active ? 'text-[#FF5E00] font-bold' : 'text-gray-500'
                }`}
              >
                {item.label}
              </span>

              {/* Active Dot Indicator */}
              {active && (
                <span className="w-1 h-1 rounded-full bg-[#FF5E00] mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
