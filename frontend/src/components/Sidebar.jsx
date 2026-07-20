import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    if (onClose) onClose();
    navigate('/login');
  };

  const getMenuItems = () => {
    if (!user) return [];

    switch (user.role) {
      case 'customer':
        return [
          { path: '/customer/dashboard', label: 'Dashboard', icon: 'home' },
          { path: '/customer/orders', label: 'My Orders', icon: 'shopping' },
          { path: '/customer/rentals', label: 'Rentals', icon: 'home' },
          { path: '/customer/healthcare', label: 'Healthcare', icon: 'medical' },
          { path: '/customer/rides', label: 'My Rides', icon: 'transport' },
          { path: '/customer/settings', label: 'Settings', icon: 'settings' },
          { path: '/customer/help', label: 'Help Center', icon: 'help' },
        ];
      case 'landlord':
        return [
          { path: '/landlord/dashboard', label: 'Dashboard', icon: 'home' },
          { path: '/landlord/caretakers', label: 'Caretakers', icon: 'users' },
          { path: '/landlord/properties', label: 'Properties', icon: 'building' },
          { path: '/landlord/bookings', label: 'Bookings', icon: 'orders' },
          { path: '/landlord/wallet', label: 'Wallet', icon: 'money' },
          { path: '/landlord/notifications', label: 'Notifications', icon: 'calendar' },
          { path: '/landlord/profile', label: 'Profile', icon: 'user' },
          { path: '/landlord/settings', label: 'Settings', icon: 'settings' },
          { path: '/landlord/help', label: 'Help Center', icon: 'help' },
        ];
      case 'caretaker':
        return [
          { path: '/caretaker/dashboard', label: 'Dashboard', icon: 'home' },
          { path: '/caretaker/properties', label: 'Properties', icon: 'building' },
          { path: '/caretaker/bookings', label: 'Bookings', icon: 'orders' },
          { path: '/caretaker/notifications', label: 'Notifications', icon: 'calendar' },
          { path: '/caretaker/help', label: 'Help Center', icon: 'help' },
        ];
      case 'business':
        return [
          { path: '/business/dashboard', label: 'Dashboard', icon: 'home' },
          { path: '/business/assistants', label: 'Assistants', icon: 'users' },
          { path: '/business/products', label: 'Products', icon: 'shopping' },
          { path: '/business/orders', label: 'Orders', icon: 'orders' },
          { path: '/business/customers', label: 'Customers', icon: 'users' },
          { path: '/business/analytics', label: 'Analytics', icon: 'chart' },
          { path: '/business/profile', label: 'Profile', icon: 'user' },
          { path: '/business/settings', label: 'Settings', icon: 'settings' },
          { path: '/business/help', label: 'Help Center', icon: 'help' },
        ];
      case 'assistant':
        return [
          { path: '/assistant/dashboard', label: 'Dashboard', icon: 'home' },
          { path: '/assistant/products', label: 'Products', icon: 'shopping' },
          { path: '/assistant/orders', label: 'Orders', icon: 'orders' },
          { path: '/assistant/notifications', label: 'Notifications', icon: 'calendar' },
          { path: '/assistant/help', label: 'Help Center', icon: 'help' },
        ];
      case 'rider':
        return [
          { path: '/rider/dashboard', label: 'Dashboard', icon: 'home' },
          { path: '/rider/requests', label: 'Ride Requests', icon: 'transport' },
          { path: '/rider/history', label: 'History', icon: 'history' },
          { path: '/rider/earnings', label: 'Earnings', icon: 'money' },
          { path: '/rider/profile', label: 'Profile', icon: 'user' },
          { path: '/rider/settings', label: 'Settings', icon: 'settings' },
          { path: '/rider/help', label: 'Help Center', icon: 'help' },
        ];
      case 'admin':
        return [
          { path: '/admin/dashboard', label: 'Dashboard', icon: 'home' },
          { path: '/admin/users', label: 'Users', icon: 'users' },
          { path: '/admin/orders', label: 'Orders', icon: 'orders' },
          { path: '/admin/rentals', label: 'Rentals', icon: 'building' },
          { path: '/admin/rides', label: 'Rides', icon: 'transport' },
          { path: '/admin/reports', label: 'Reports', icon: 'help' },
          { path: '/admin/broadcast', label: 'Broadcast', icon: 'megaphone' },
          { path: '/admin/monitoring', label: 'Monitoring', icon: 'chart' },
          { path: '/admin/settings', label: 'Settings', icon: 'settings' },
        ];
      default:
        return [];
    }
  };

  const getIcon = (type) => {
    const icons = {
      home: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
        </svg>
      ),
      shopping: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      medical: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      transport: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      settings: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      building: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      calendar: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      users: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      money: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      orders: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      chart: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      megaphone: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.563-.317z" />
        </svg>
      ),
      history: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      user: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      help: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    };
    return icons[type] || icons.home;
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-neutral-900 bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-neutral-200 z-50 shadow-sm transition-transform duration-300 transform lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Logo */}
        <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-blue">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="text-xl font-bold text-neutral-900">ConnectHub</span>
          </div>
          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            title="Close Menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

      {/* User Info */}
      <div className="p-4 border-b border-neutral-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center border border-blue-200">
            {user?.riderProfile?.profilePhoto || user?.avatar ? (
              <img 
                src={user?.riderProfile?.profilePhoto || user?.avatar} 
                alt={user?.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-blue-600 font-semibold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            )}
          </div>
          <div>
            <p className="font-semibold text-neutral-900">{user?.name}</p>
            <p className="text-sm text-neutral-500 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => {
              if (onClose) onClose();
            }}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            {getIcon(item.icon)}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-200 bg-white">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3h4a3 3 0 013 3v1" />
          </svg>
          <span>Logout</span>
        </button>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;