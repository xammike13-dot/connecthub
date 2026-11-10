// Header.jsx – sticky top navigation with minimal search and Ola (green) fasta (yellow) branding
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Menu, X, ArrowRight, Store, Bike, Home as HomeIcon, HelpCircle, LogOut, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const { cartItemCount } = useCart();
  const navigate = useNavigate();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Scroll listener for subtle glassmorphism elevation ───────────────────
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/marketplace?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
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
      case 'assistant':
        return '/assistant/dashboard';
      case 'caretaker':
        return '/caretaker/dashboard';
      default:
        return '/customer/dashboard';
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-200 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-xs border-b border-gray-200/80 py-1.5 sm:py-2'
          : 'bg-white border-b border-gray-100 py-2 sm:py-2.5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* ── 1. Mobile View (Menu | Olafasta Logo | Longer Search Bar) ── */}
        <div className="flex md:hidden items-center justify-between gap-2.5 py-1">
          
          {/* Left: Hamburger Menu + Brand Name: Ola (Green) + fasta (Orange) */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Navigation Menu'}
              className="p-1.5 -ml-1 text-gray-700 hover:text-[#027A2B] rounded-xl hover:bg-gray-100 active:scale-90 transition-all flex-shrink-0"
            >
              {mobileMenuOpen ? (
                <X size={22} className="text-[#027A2B]" />
              ) : (
                <Menu size={22} />
              )}
            </button>

            {/* Brand Logo & Name: Ola (Green) + fasta (Orange) */}
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-1 group active:scale-95 transition-transform select-none"
              aria-label="Olafasta Home"
            >
              <div className="w-7 h-7 rounded-lg bg-[#027A2B] flex items-center justify-center text-white font-black text-sm shadow-2xs">
                O
              </div>
              <span className="text-lg font-black tracking-tight leading-none">
                <span className="text-[#027A2B]">Ola</span>
                <span className="text-[#FF5E00]">fasta</span>
              </span>
            </Link>
          </div>

          {/* Right: Longer Search Bar with Clear Placeholder */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-0">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search food, gas, mitumba, phones..."
              className="w-full bg-gray-100 hover:bg-gray-100/90 focus:bg-white text-gray-900 text-xs rounded-full pl-8 pr-7 py-2 border border-transparent focus:border-[#027A2B] focus:ring-1 focus:ring-[#027A2B]/20 focus:outline-none transition-all placeholder:text-gray-400 font-medium"
            />
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#027A2B]"
            />
            {searchQuery && (
              <button
                type="submit"
                aria-label="Submit Search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#027A2B] text-white flex items-center justify-center text-[9px]"
              >
                <ArrowRight size={10} />
              </button>
            )}
          </form>

        </div>

        {/* ── 2. Desktop View (Logo, Spacious Longer Search, Actions) ─ */}
        <div className="hidden md:flex items-center justify-between gap-5">
          
          {/* Logo & Brand Name: Ola (Green) + fasta (Orange) */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="w-10 h-10 rounded-xl bg-[#027A2B] flex items-center justify-center text-white font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
              O
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tight leading-none select-none">
                <span className="text-[#027A2B]">Ola</span>
                <span className="text-[#FF5E00]">fasta</span>
              </span>
              <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mt-0.5">
                FASTA FASTA
              </span>
            </div>
          </Link>

          {/* Spacious, Longer Centered Search Bar with Rich Placeholder */}
          <div className="flex-1 max-w-2xl mx-2">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search food, mitumba, gas, electronics, hostels, chemist..."
                className="w-full bg-gray-100 hover:bg-gray-100/90 focus:bg-white text-gray-900 text-xs sm:text-sm rounded-full pl-11 pr-24 py-2.5 border border-transparent focus:border-[#027A2B] focus:ring-2 focus:ring-[#027A2B]/20 focus:outline-none transition-all placeholder:text-gray-400 font-medium"
              />
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#027A2B]"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-[#027A2B] hover:bg-[#025D20] text-white text-xs font-bold px-4 py-1.5 rounded-full transition-colors active:scale-95 shadow-2xs"
              >
                Search
              </button>
            </form>
          </div>

          {/* Right Navigation & Auth */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              to="/marketplace"
              className="text-xs font-semibold text-gray-600 hover:text-[#027A2B] px-2.5 py-1.5 rounded-lg hover:bg-green-50/60 transition-colors"
            >
              Marketplace
            </Link>
            <Link
              to="/transport"
              className="text-xs font-semibold text-gray-600 hover:text-[#027A2B] px-2.5 py-1.5 rounded-lg hover:bg-green-50/60 transition-colors"
            >
              Bodaboda
            </Link>
            <Link
              to="/rentals"
              className="text-xs font-semibold text-gray-600 hover:text-[#027A2B] px-2.5 py-1.5 rounded-lg hover:bg-green-50/60 transition-colors"
            >
              Rentals
            </Link>
            <Link
              to="/about"
              className="text-xs font-semibold text-gray-600 hover:text-[#027A2B] px-2.5 py-1.5 rounded-lg hover:bg-green-50/60 transition-colors"
            >
              About & Support
            </Link>

            {/* Desktop Cart */}
            <Link
              to="/cart"
              className="relative p-2 text-gray-700 hover:text-[#027A2B] hover:bg-green-50/60 rounded-xl transition-colors"
              aria-label="View Cart"
            >
              <ShoppingCart size={21} className="text-gray-800" />
              {cartItemCount > 0 && (
                <span className="absolute top-1 right-1 bg-[#FF5E00] text-white text-[10px] font-black px-1.5 py-0.2 rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-xs">
                  {cartItemCount}
                </span>
              )}
            </Link>

            {/* Desktop Auth */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2.5 pl-2 border-l border-gray-200">
                <Link
                  to={getDashboardLink()}
                  className="bg-[#027A2B] hover:bg-[#025D20] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-all active:scale-95"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-xs font-semibold text-gray-500 hover:text-red-600 px-2 py-2 rounded-lg transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                <Link
                  to="/login"
                  className="text-xs font-bold text-gray-700 hover:text-[#027A2B] px-3 py-2 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-[#027A2B] hover:bg-[#025D20] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-all active:scale-95"
                >
                  Join Olafasta
                </Link>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* ── 3. Mobile Slide-Out / Drawer Navigation Menu ──────── */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/98 backdrop-blur-xl border-t border-gray-200 shadow-2xl animate-in slide-in-from-top-2 duration-200 max-h-[85vh] overflow-y-auto">
          <div className="px-4 py-4 space-y-4">
            
            {/* User Account / Auth Section */}
            {isAuthenticated ? (
              <div className="p-3.5 bg-green-50/70 border border-green-200/80 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#027A2B] text-white font-bold flex items-center justify-center text-sm shadow-xs">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Comrade Signed In</p>
                    <p className="text-sm font-bold text-gray-900 leading-tight">{user?.name}</p>
                  </div>
                </div>
                <Link
                  to={getDashboardLink()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-1.5 bg-[#027A2B] text-white text-xs font-bold rounded-xl active:scale-95 shadow-xs"
                >
                  Dashboard
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-center border border-gray-200 text-gray-800 font-bold text-xs rounded-xl hover:bg-gray-50"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-center bg-[#027A2B] text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Join Olafasta
                </Link>
              </div>
            )}

            {/* Prominent About & Support / Partner Hub Link */}
            <Link
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="p-3 bg-gradient-to-r from-orange-50 via-amber-50 to-green-50 rounded-2xl border border-orange-200/80 flex items-center justify-between shadow-xs transition-transform active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#027A2B] to-[#FF5E00] text-white flex items-center justify-center font-black text-sm shadow-2xs flex-shrink-0">
                  ⚡
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-gray-900">About & Support</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#FF5E00] text-white uppercase tracking-wider">
                      Partner With Us
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium leading-tight mt-0.5">
                    Moi Campus base, Helplines, Policies & Earn
                  </p>
                </div>
              </div>
              <ArrowRight size={15} className="text-[#FF5E00] flex-shrink-0 ml-1" />
            </Link>

            {/* Deep Campus Navigation & Categories */}
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                Campus Services
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <Link
                  to="/marketplace"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 bg-gray-50 rounded-xl text-gray-800 hover:text-[#027A2B] flex items-center justify-between border border-gray-100"
                >
                  <span>🛒 Marketplace</span>
                  <ArrowRight size={13} className="text-gray-400" />
                </Link>
                <Link
                  to="/transport"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 bg-gray-50 rounded-xl text-gray-800 hover:text-[#027A2B] flex items-center justify-between border border-gray-100"
                >
                  <span>🏍️ Bodaboda</span>
                  <ArrowRight size={13} className="text-gray-400" />
                </Link>
                <Link
                  to="/rentals"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 bg-gray-50 rounded-xl text-gray-800 hover:text-[#027A2B] flex items-center justify-between border border-gray-100"
                >
                  <span>🏠 Rentals</span>
                  <ArrowRight size={13} className="text-gray-400" />
                </Link>
                <Link
                  to="/marketplace?category=Food+%26+Drinks"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 bg-gray-50 rounded-xl text-gray-800 hover:text-[#027A2B] flex items-center justify-between border border-gray-100"
                >
                  <span>🍔 Kibandas</span>
                  <ArrowRight size={13} className="text-gray-400" />
                </Link>
                <Link
                  to="/marketplace?category=Fashion+%26+Mitumba"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 bg-gray-50 rounded-xl text-gray-800 hover:text-[#027A2B] flex items-center justify-between border border-gray-100"
                >
                  <span>👗 Mitumba</span>
                  <ArrowRight size={13} className="text-gray-400" />
                </Link>
                <Link
                  to="/marketplace?category=Hostel+Setup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 bg-gray-50 rounded-xl text-gray-800 hover:text-[#027A2B] flex items-center justify-between border border-gray-100"
                >
                  <span>🔥 Gas Refills</span>
                  <ArrowRight size={13} className="text-gray-400" />
                </Link>
              </div>
            </div>

            {/* Vendor & Partner Dashboards */}
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                Make Money With Us
              </p>
              <div className="space-y-1.5 text-xs font-semibold text-gray-700">
                <Link
                  to="/register?role=business"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <Store size={15} className="text-[#027A2B]" />
                  <span>Sell on Olafasta (Campus Vendor)</span>
                </Link>
                <Link
                  to="/register?role=rider"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <Bike size={15} className="text-[#027A2B]" />
                  <span>Drive with Olafasta Boda (Rider)</span>
                </Link>
                <Link
                  to="/register?role=landlord"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <HomeIcon size={15} className="text-[#027A2B]" />
                  <span>List Your Hostel / Bedsitter</span>
                </Link>
              </div>
            </div>

            {/* Support & Logout */}
            <div className="pt-2 border-t border-gray-100 space-y-1.5 text-xs">
              <Link
                to="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2 rounded-xl text-gray-700 hover:bg-gray-50 font-medium"
              >
                <span className="flex items-center gap-2">
                  <Info size={15} className="text-[#027A2B]" />
                  <span>About Olafasta & Policies</span>
                </span>
                <span className="text-[11px] text-gray-400">HQ Info</span>
              </Link>

              <Link
                to="/support"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2 rounded-xl text-gray-600 hover:bg-gray-50"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle size={15} className="text-[#027A2B]" />
                  <span>Help Center & Support</span>
                </span>
                <span className="text-[11px] text-gray-400">+254 748 459757</span>
              </Link>

              {isAuthenticated && (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-center text-red-600 font-semibold rounded-xl hover:bg-red-50 transition-colors"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </header>
  );
}
