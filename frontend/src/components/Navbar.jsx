import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useState } from 'react';
import { ShoppingCart, Bell, User, Menu, X } from 'lucide-react';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { cartItemCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'customer':
        return '/customer/dashboard';
      case 'landlord':
        return '/landlord/dashboard';
      case 'business':
        return '/business/dashboard';
      case 'rider':
        return '/rider/dashboard';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/';
    }
  };

  return (
    <nav className="bg-white border-b border-neutral-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-blue">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <span className="text-xl font-bold text-neutral-900">ConnectHub</span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center ml-10 gap-1">
              <Link to="/marketplace" className="px-4 py-2 text-neutral-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium">
                Marketplace
              </Link>
              <Link to="/rentals" className="px-4 py-2 text-neutral-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium">
                Rentals
              </Link>
              <Link to="/healthcare" className="px-4 py-2 text-neutral-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium">
                Healthcare
              </Link>
              <Link to="/transport" className="px-4 py-2 text-neutral-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium">
                Bodaboda
              </Link>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2 md:gap-4">
            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-4">
                {/* Cart */}
                <Link to="/cart" className="relative p-2 text-neutral-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <ShoppingCart size={22} />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                      {cartItemCount}
                    </span>
                  )}
                </Link>

                {/* Dashboard Button */}
                <Link to={getDashboardLink()} className="btn-primary px-5 py-2">
                  Dashboard
                </Link>

                {/* User Profile */}
                <div className="flex items-center gap-3 pl-4 border-l border-neutral-200">
                  <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center border border-blue-200">
                    <span className="text-blue-600 font-semibold text-sm">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="text-neutral-700 font-medium">{user?.name}</span>
                </div>

                {/* Logout */}
                <button onClick={handleLogout} className="px-4 py-2 text-neutral-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium">
                  Logout
                </button>
              </div>
            ) : (
              <>
                {/* Cart */}
                <Link to="/cart" className="relative p-2 text-neutral-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <ShoppingCart size={22} />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                      {cartItemCount}
                    </span>
                  )}
                </Link>

                {/* Login */}
                <Link to="/login" className="px-3 md:px-5 py-2 text-neutral-600 hover:text-blue-600 font-medium transition-colors text-sm md:text-base">
                  Login
                </Link>

                {/* Sign Up */}
                <Link to="/register" className="btn-primary px-3 md:px-5 py-2 text-sm md:text-base">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-neutral-200 shadow-lg">
          <div className="px-4 py-4 space-y-2">
            <Link to="/marketplace" className="block px-4 py-3 text-neutral-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors">
              Marketplace
            </Link>
            <Link to="/rentals" className="block px-4 py-3 text-neutral-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors">
              Rentals
            </Link>
            <Link to="/healthcare" className="block px-4 py-3 text-neutral-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors">
              Healthcare
            </Link>
            <Link to="/transport" className="block px-4 py-3 text-neutral-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors">
              Bodaboda
            </Link>
            
            <div className="border-t border-neutral-200 my-2"></div>
            
            <Link to="/cart" className="block px-4 py-3 text-neutral-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors flex items-center gap-2">
              <ShoppingCart size={18} />
              Cart
              {cartItemCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>
            
            {isAuthenticated ? (
              <>
                <Link to={getDashboardLink()} className="block w-full btn-primary text-center">Dashboard</Link>
                <button onClick={handleLogout} className="block w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="block w-full px-4 py-3 text-neutral-700 hover:bg-neutral-50 rounded-lg font-medium transition-colors">
                  Login
                </Link>
                <Link to="/register" className="block w-full btn-primary text-center">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;