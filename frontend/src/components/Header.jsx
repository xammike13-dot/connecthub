// Header.jsx – sticky top navigation with minimal search and Ola (green) fasta (orange) branding
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  Menu,
  X,
  ArrowRight,
  Store,
  Bike,
  Home as HomeIcon,
  HelpCircle,
  LogOut,
  Info,
  Flame,
  UtensilsCrossed,
  LayoutGrid,
  Package,
  Heart,
  Settings,
  LayoutDashboard,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import JoinTeamModal from './JoinTeamModal';

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const { cartItemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Scroll listener for subtle glassmorphism elevation ───────────────────
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Close mobile drawer on Escape key ────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Body Scroll Lock when mobile drawer is open ─────────────────────────
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // ── Auto-close drawer on route change ───────────────────────────────────
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

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
        return '/account';
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
        return '/account';
    }
  };

  const isActiveRoute = (path) => {
    if (!path) return false;
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const essentialsNav = [
    { label: 'Bodaboda Rides', href: '/bodaboda', icon: Bike, badge: 'Instant' },
    { label: 'Food & Drinks', href: '/c/food-drinks', icon: UtensilsCrossed, badge: 'Hot' },
    { label: 'Gas Refill', href: '/c/gas-refill', icon: Flame, badge: 'Fasta' },
    { label: 'All Categories', href: '/categories', icon: LayoutGrid },
    { label: 'Shopping Cart', href: '/cart', icon: ShoppingCart, badge: cartItemCount > 0 ? cartItemCount : null },
  ];

  const accountNav = [
    { label: user?.role === 'customer' ? 'My Account' : 'Dashboard', href: getDashboardLink(), icon: LayoutDashboard },
    { label: 'Active Orders', href: '/customer/orders', icon: Package },
    { label: 'Saved Wishlist', href: '/wishlist', icon: Heart },
    { label: 'Profile Settings', href: '/account', icon: Settings },
  ];

  const servicesNav = [
    { label: 'Hostel Rentals', href: '/rentals', icon: HomeIcon },
    { label: 'Marketplace', href: '/marketplace', icon: Store },
    { label: 'Help & Support', href: '/support', icon: HelpCircle },
    { label: 'About Olafasta', href: '/about', icon: Info },
  ];

  return (
    <header
      className={`fixed top-0 left-0 w-full transition-all duration-200 ${
        mobileMenuOpen ? 'z-[70]' : 'z-50'
      } ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-xs border-b border-gray-200/80 py-1.5 sm:py-2'
          : 'bg-white border-b border-gray-100 py-2 sm:py-2.5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* ── 1. Mobile View (Menu | Olafasta Logo | Longer Search Bar) ── */}
        <div className="flex md:hidden items-center justify-between gap-2.5 py-1">
          
          {/* Left: Hamburger Menu + Brand Name: Ola (Green) + fasta (Orange) */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open Navigation Menu"
              aria-expanded={mobileMenuOpen}
              className="w-9 h-9 -ml-1 flex items-center justify-center text-gray-700 hover:text-olaGreen-DEFAULT rounded-xl hover:bg-gray-100 active:bg-gray-200/70 active:scale-95 transition-all flex-shrink-0 cursor-pointer"
            >
              <Menu size={22} strokeWidth={2.2} />
            </button>

            {/* Brand Logo & Name: Ola (Green) + fasta (Orange) */}
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-1 group active:scale-95 transition-transform select-none"
              aria-label="Olafasta Home"
            >
              <div className="w-7 h-7 rounded-lg bg-olaGreen-DEFAULT flex items-center justify-center text-white font-black text-sm shadow-2xs">
                O
              </div>
              <span className="text-lg font-black tracking-tight leading-none">
                <span className="text-olaGreen-DEFAULT">Ola</span>
                <span className="text-olaOrange-DEFAULT">fasta</span>
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
              className="w-full bg-gray-100 hover:bg-gray-100/90 focus:bg-white text-gray-900 text-xs rounded-full pl-8 pr-7 py-2 border border-transparent focus:border-olaGreen-DEFAULT focus:ring-1 focus:ring-olaGreen-DEFAULT/20 focus:outline-none transition-all placeholder:text-gray-400 font-medium"
            />
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-olaGreen-DEFAULT"
            />
            {searchQuery && (
              <button
                type="submit"
                aria-label="Submit Search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-olaGreen-DEFAULT text-white flex items-center justify-center text-[9px]"
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
            <div className="w-10 h-10 rounded-xl bg-olaGreen-DEFAULT flex items-center justify-center text-white font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
              O
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tight leading-none select-none">
                <span className="text-olaGreen-DEFAULT">Ola</span>
                <span className="text-olaOrange-DEFAULT">fasta</span>
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
                className="w-full bg-gray-100 hover:bg-gray-100/90 focus:bg-white text-gray-900 text-xs sm:text-sm rounded-full pl-11 pr-24 py-2.5 border border-transparent focus:border-olaGreen-DEFAULT focus:ring-2 focus:ring-olaGreen-DEFAULT/20 focus:outline-none transition-all placeholder:text-gray-400 font-medium"
              />
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-olaGreen-DEFAULT"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-olaGreen-DEFAULT hover:bg-olaGreen-deep text-white text-xs font-bold px-4 py-1.5 rounded-full transition-colors active:scale-95 shadow-2xs"
              >
                Search
              </button>
            </form>
          </div>

          {/* Right Navigation & Auth */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              to="/categories"
              className="text-xs font-semibold text-gray-600 hover:text-olaGreen-DEFAULT px-2.5 py-1.5 rounded-lg hover:bg-olaGreen-light/60 transition-colors"
            >
              Categories
            </Link>
            <Link
              to="/marketplace"
              className="text-xs font-semibold text-gray-600 hover:text-olaGreen-DEFAULT px-2.5 py-1.5 rounded-lg hover:bg-olaGreen-light/60 transition-colors"
            >
              Marketplace
            </Link>
            <Link
              to="/transport"
              className="text-xs font-semibold text-gray-600 hover:text-olaGreen-DEFAULT px-2.5 py-1.5 rounded-lg hover:bg-olaGreen-light/60 transition-colors"
            >
              Bodaboda
            </Link>
            <Link
              to="/rentals"
              className="text-xs font-semibold text-gray-600 hover:text-olaGreen-DEFAULT px-2.5 py-1.5 rounded-lg hover:bg-olaGreen-light/60 transition-colors"
            >
              Rentals
            </Link>
            <Link
              to="/about"
              className="text-xs font-semibold text-gray-600 hover:text-olaGreen-DEFAULT px-2.5 py-1.5 rounded-lg hover:bg-olaGreen-light/60 transition-colors"
            >
              About & Support
            </Link>

            {/* Desktop Cart */}
            <Link
              to="/cart"
              className="relative p-2 text-gray-700 hover:text-olaGreen-DEFAULT hover:bg-olaGreen-light/60 rounded-xl transition-colors"
              aria-label="View Cart"
            >
              <ShoppingCart size={21} className="text-gray-800" />
              {cartItemCount > 0 && (
                <span className="absolute top-1 right-1 bg-olaOrange-DEFAULT text-white text-[10px] font-black px-1.5 py-0.2 rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-xs">
                  {cartItemCount}
                </span>
              )}
            </Link>

            {/* Desktop Auth */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2.5 pl-2 border-l border-gray-200">
                <Link
                  to={getDashboardLink()}
                  className="bg-olaGreen-DEFAULT hover:bg-olaGreen-deep text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-all active:scale-95"
                >
                  {user?.role === 'customer' ? 'Account' : 'Dashboard'}
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
                  className="text-xs font-bold text-gray-700 hover:text-olaGreen-DEFAULT px-3 py-2 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-olaGreen-DEFAULT hover:bg-olaGreen-deep text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-all active:scale-95"
                >
                  Join Olafasta
                </Link>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* ── 3. Mobile Slide-Over Drawer Architecture ──────── */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] animate-backdrop-in"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-Over Panel */}
          <div
            className="fixed top-0 left-0 bottom-0 w-[85vw] max-w-[320px] h-[100dvh] bg-white z-[70] shadow-2xl flex flex-col animate-drawer-in overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Menu"
          >
            {/* Top Section: Branded Header Bar */}
            <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-white">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 select-none group"
                aria-label="Olafasta Home"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-olaGreen-DEFAULT to-olaGreen-deep flex items-center justify-center text-white font-black text-sm shadow-xs group-hover:scale-105 transition-transform">
                  O
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-black tracking-tight leading-none">
                    <span className="text-olaGreen-DEFAULT">Ola</span>
                    <span className="text-olaOrange-DEFAULT">fasta</span>
                  </span>
                  <span className="text-[9px] font-bold text-gray-400 tracking-wider uppercase mt-0.5">
                    FASTA FASTA
                  </span>
                </div>
              </Link>

              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-600 hover:text-gray-900 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                aria-label="Close navigation menu"
              >
                <X size={18} strokeWidth={2.2} />
              </button>
            </div>

            {/* Top Section: Auth/Profile Card */}
            <div className="px-3 pt-3 flex-shrink-0">
              {isAuthenticated ? (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-olaOrange-light/80 to-amber-50/50 border border-olaOrange-DEFAULT/15 flex items-center gap-2.5 shadow-2xs">
                  <div className="w-10 h-10 rounded-full bg-olaOrange-DEFAULT text-white font-bold flex items-center justify-center text-sm shadow-xs flex-shrink-0">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {user?.name || 'Comrade'}
                    </p>
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-olaOrange-DEFAULT bg-white px-2 py-0.5 rounded-full mt-0.5 border border-olaOrange-DEFAULT/20 shadow-2xs">
                      {user?.role || 'customer'}
                    </span>
                  </div>
                  <Link
                    to={getDashboardLink()}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-olaOrange-light text-olaOrange-DEFAULT border border-olaOrange-DEFAULT/20 text-xs font-bold shadow-2xs active:scale-95 transition-all flex items-center gap-1 flex-shrink-0"
                  >
                    <LayoutDashboard size={13} />
                    <span>Dashboard</span>
                  </Link>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-gradient-to-br from-olaOrange-light/70 via-white to-gray-50 border border-olaOrange-DEFAULT/15 shadow-2xs">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-base leading-none">👋</span>
                    <div>
                      <p className="text-xs font-black text-gray-900 leading-tight">Welcome, Comrade!</p>
                      <p className="text-[10px] font-medium text-gray-500">Sign in for campus fast orders</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="bg-olaOrange-DEFAULT hover:bg-olaOrange-hover active:scale-95 text-white font-bold py-1.5 rounded-xl text-xs text-center shadow-xs transition-all flex items-center justify-center"
                    >
                      Log In
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="bg-white hover:bg-gray-50 active:scale-95 border border-gray-200 text-gray-800 font-bold py-1.5 rounded-xl text-xs text-center shadow-2xs transition-all flex items-center justify-center"
                    >
                      Sign Up
                    </Link>
                  </div>
                </div>
              )}

              {/* Partner Track in Mobile Drawer */}
              {(!isAuthenticated || user?.role === 'customer') && (
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      document.body.style.overflow = '';
                      if (!isAuthenticated) {
                        navigate('/login?redirect=/customer/join-team');
                      } else {
                        setIsJoinModalOpen(true);
                      }
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-olaOrange-light/90 via-olaOrange-light/60 to-amber-50 text-olaOrange-DEFAULT hover:bg-olaOrange-light border border-olaOrange-DEFAULT/25 shadow-2xs transition-all active:scale-[0.98] cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-5 h-5 rounded-md bg-olaOrange-DEFAULT text-white flex items-center justify-center text-[10px] font-black shadow-2xs flex-shrink-0">
                        ⚡
                      </div>
                      <span className="truncate font-black text-gray-900">
                        Join Olafasta Team &amp; Earn
                      </span>
                    </div>
                    <span className="text-olaOrange-DEFAULT font-black text-xs flex-shrink-0 flex items-center gap-0.5">
                        Earn <ArrowRight size={12} />
                      </span>
                  </button>
                </div>
              )}
            </div>

            {/* Middle Section: Smooth Scrollable Navigation */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 overscroll-contain scrollbar-hide">
              {/* Quick Essentials */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 mb-1">
                  Quick Essentials
                </p>
                <div className="space-y-1">
                  {essentialsNav.map((item) => {
                    const Icon = item.icon;
                    const active = isActiveRoute(item.href);
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-[0.98] ${
                          active
                            ? 'bg-olaOrange-light text-olaOrange-DEFAULT font-bold shadow-2xs'
                            : 'text-gray-700 hover:bg-gray-100/80 active:bg-gray-100'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                            active
                              ? 'bg-olaOrange-DEFAULT text-white shadow-2xs'
                              : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                          }`}
                        >
                          <Icon size={15} />
                        </div>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              typeof item.badge === 'number'
                                ? 'bg-olaOrange-DEFAULT text-white'
                                : 'bg-olaOrange-light text-olaOrange-DEFAULT border border-olaOrange-DEFAULT/20'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight
                          size={14}
                          className={`transition-transform ${
                            active ? 'text-olaOrange-DEFAULT translate-x-0.5' : 'text-gray-300'
                          }`}
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* My Account (when logged in) */}
              {isAuthenticated && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 mb-1">
                    My Account
                  </p>
                  <div className="space-y-1">
                    {accountNav.map((item) => {
                      const Icon = item.icon;
                      const active = isActiveRoute(item.href);
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-[0.98] ${
                            active
                              ? 'bg-olaOrange-light text-olaOrange-DEFAULT font-bold shadow-2xs'
                              : 'text-gray-700 hover:bg-gray-100/80 active:bg-gray-100'
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                              active
                                ? 'bg-olaOrange-DEFAULT text-white shadow-2xs'
                                : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                            }`}
                          >
                            <Icon size={15} />
                          </div>
                          <span className="flex-1 truncate">{item.label}</span>
                          <ChevronRight
                            size={14}
                            className={`transition-transform ${
                              active ? 'text-olaOrange-DEFAULT translate-x-0.5' : 'text-gray-300'
                            }`}
                          />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Campus Services & Support */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 mb-1">
                  Campus Services & Info
                </p>
                <div className="space-y-1">
                  {servicesNav.map((item) => {
                    const Icon = item.icon;
                    const active = isActiveRoute(item.href);
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-[0.98] ${
                          active
                            ? 'bg-olaOrange-light text-olaOrange-DEFAULT font-bold shadow-2xs'
                            : 'text-gray-700 hover:bg-gray-100/80 active:bg-gray-100'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                            active
                              ? 'bg-olaOrange-DEFAULT text-white shadow-2xs'
                              : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                          }`}
                        >
                          <Icon size={15} />
                        </div>
                        <span className="flex-1 truncate">{item.label}</span>
                        <ChevronRight
                          size={14}
                          className={`transition-transform ${
                            active ? 'text-olaOrange-DEFAULT translate-x-0.5' : 'text-gray-300'
                          }`}
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Section: Pinned Footer */}
            <div
              className="p-3 border-t border-gray-100 bg-gray-50/90 space-y-2 flex-shrink-0"
              style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
            >
              {isAuthenticated && (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 active:scale-95 transition-all border border-red-100 cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              )}
              <div className="flex items-center justify-between text-[10px] font-semibold text-gray-400 px-1 pt-0.5">
                <span>Olafasta • Moi University</span>
                <span>Fasta Fasta</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Join Team Application Modal */}
      <JoinTeamModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
      />
    </header>
  );
}
