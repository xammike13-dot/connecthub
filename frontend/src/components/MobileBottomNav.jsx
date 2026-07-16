import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Home, 
  ShoppingBag, 
  Home as HomeIcon, 
  Bike, 
  User,
  Wallet,
  Bell,
  Menu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MobileBottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();

  // Don't show on auth pages
  if (location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  // Define nav items based on user role
  const getNavItems = () => {
    const commonItems = [
      {
        path: '/',
        icon: <Home size={20} />,
        label: 'Home',
      },
      {
        path: '/marketplace',
        icon: <ShoppingBag size={20} />,
        label: 'Shop',
      },
      {
        path: '/rentals',
        icon: <HomeIcon size={20} />,
        label: 'Rentals',
      },
      {
        path: '/transport',
        icon: <Bike size={20} />,
        label: 'Rides',
      },
    ];

    const customerItems = [
      ...commonItems,
    ];

    const landlordItems = [
      {
        path: '/landlord/dashboard',
        icon: <HomeIcon size={20} />,
        label: 'Dashboard',
      },
      {
        path: '/landlord/properties',
        icon: <Home size={20} />,
        label: 'Properties',
      },
      {
        path: '/landlord/earnings',
        icon: <Wallet size={20} />,
        label: 'Earnings',
      },
    ];

    const businessItems = [
      {
        path: '/business/dashboard',
        icon: <HomeIcon size={20} />,
        label: 'Dashboard',
      },
      {
        path: '/business/products',
        icon: <ShoppingBag size={20} />,
        label: 'Products',
      },
      {
        path: '/business/orders',
        icon: <Menu size={20} />,
        label: 'Orders',
      },
      {
        path: '/business/earnings',
        icon: <Wallet size={20} />,
        label: 'Earnings',
      },
    ];

    const riderItems = [
      {
        path: '/rider/dashboard',
        icon: <HomeIcon size={20} />,
        label: 'Dashboard',
      },
      {
        path: '/rider/requests',
        icon: <Bike size={20} />,
        label: 'Requests',
      },
      {
        path: '/rider/history',
        icon: <Menu size={20} />,
        label: 'History',
      },
      {
        path: '/rider/earnings',
        icon: <Wallet size={20} />,
        label: 'Earnings',
      },
    ];

    if (!user) return commonItems;

    switch (user.role) {
      case 'customer':
        return customerItems.slice(0, 5);
      case 'landlord':
        return landlordItems;
      case 'business':
        return businessItems;
      case 'rider':
        return riderItems;
      default:
        return commonItems;
    }
  };

  const navItems = getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-40 safe-area-bottom shadow-lg">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center px-2 py-1 relative transition-colors ${
                isActive
                  ? 'text-blue-600'
                  : 'text-neutral-500 hover:text-blue-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="navIndicator"
                    className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <span className={isActive ? 'text-blue-600' : ''}>
                  {item.icon}
                </span>
                <span className="text-xs mt-1">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileBottomNav;