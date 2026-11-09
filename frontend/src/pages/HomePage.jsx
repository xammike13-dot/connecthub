import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PromoCarousel from '../components/PromoCarousel';
import CategoryIconBar from '../components/CategoryIconBar';
import ProductScrollRow from '../components/ProductScrollRow';
import ProductFeed from '../components/ProductFeed';

// ─── Mock data (shown immediately while API loads) ─────────────────────────────
const FLASH_MOCK = [
  { _id: 'm1', name: 'Wireless Earbuds Pro', price: 850, oldPrice: 1500, discountPct: 43, images: [] },
  { _id: 'm2', name: 'Leather Belt – Black', price: 180, oldPrice: 300, discountPct: 40, images: [] },
  { _id: 'm3', name: 'Smart Phone Holder', price: 120, oldPrice: 250, discountPct: 52, images: [] },
  { _id: 'm4', name: '1L Cooking Oil', price: 215, oldPrice: 280, discountPct: 23, images: [] },
  { _id: 'm5', name: 'Hoodie – Campus Edition', price: 650, oldPrice: 900, discountPct: 28, images: [] },
];

const FOOD_MOCK = [
  { _id: 'f1', name: 'Ugali + Sukuma Wiki Combo', price: 60, oldPrice: null, images: [], isLive: true },
  { _id: 'f2', name: 'Pilau Bowl (Large)', price: 120, oldPrice: null, images: [], isLive: true },
  { _id: 'f3', name: 'Chips Mwitu + Kachumbari', price: 80, oldPrice: null, images: [], isLive: false },
  { _id: 'f4', name: 'Mandazi x6 Pack', price: 30, oldPrice: null, images: [] },
  { _id: 'f5', name: 'Soda 500ml (Any Brand)', price: 55, oldPrice: null, images: [] },
];

const FASHION_MOCK = [
  { _id: 'fa1', name: 'Slim Jeans – Blue Wash', price: 350, oldPrice: 600, discountPct: 42, images: [] },
  { _id: 'fa2', name: 'Ladies Blouse – Pink', price: 220, oldPrice: 400, discountPct: 45, images: [] },
  { _id: 'fa3', name: 'Nike-Style Sneakers', price: 800, oldPrice: 1200, discountPct: 33, images: [] },
  { _id: 'fa4', name: 'Vintage Denim Jacket', price: 550, oldPrice: 900, discountPct: 39, images: [] },
  { _id: 'fa5', name: 'Ankara Dress – L/XL', price: 400, oldPrice: 650, discountPct: 38, images: [] },
];

const TECH_MOCK = [
  { _id: 't1', name: 'USB-C Fast Charging Cable 2m', price: 150, oldPrice: 300, discountPct: 50, images: [] },
  { _id: 't2', name: 'Power Bank 10,000mAh', price: 1200, oldPrice: 2000, discountPct: 40, images: [] },
  { _id: 't3', name: 'Phone Screen Protector 9D', price: 80, oldPrice: 150, discountPct: 47, images: [] },
  { _id: 't4', name: 'Bluetooth Speaker Mini', price: 650, oldPrice: 1100, discountPct: 41, images: [] },
  { _id: 't5', name: 'Laptop Cooling Stand', price: 900, oldPrice: 1500, discountPct: 40, images: [] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const normaliseProducts = (json) => {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.data)) return json.data;
  return [];
};

// ─── Component ────────────────────────────────────────────────────────────────
const HomePage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Live API rows (fall back to mock while loading)
  const [flashProducts, setFlashProducts] = useState(FLASH_MOCK);
  const [foodProducts, setFoodProducts] = useState(FOOD_MOCK);
  const [fashionProducts, setFashionProducts] = useState(FASHION_MOCK);
  const [techProducts, setTechProducts] = useState(TECH_MOCK);

  // Redirect logged-in users to their dashboards
  useEffect(() => {
    if (isAuthenticated && user) {
      const map = {
        customer: '/customer/dashboard',
        landlord: '/landlord/dashboard',
        business: '/business/dashboard',
        rider: '/rider/dashboard',
        admin: '/',
        assistant: '/assistant/dashboard',
        caretaker: '/caretaker/dashboard',
      };
      navigate(map[user.role] || '/', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Load live products in the background; replace mocks when ready
  useEffect(() => {
    const load = (params, setter) =>
      fetch(`/api/products?${params}&limit=10`)
        .then((r) => r.json())
        .then((j) => {
          const d = normaliseProducts(j);
          if (d.length) setter(d);
        })
        .catch(() => {/* retain mocks if network or api fails */});

    load('page=1', setFlashProducts);
    load('category=food&page=1', setFoodProducts);
    load('category=fashion&page=1', setFashionProducts);
    load('category=electronics&page=1', setTechProducts);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans">

      {/* ── 1. Top Promo Banner Carousel ─────────────────────── */}
      <div className="max-w-7xl w-full mx-auto px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
        <PromoCarousel />
      </div>

      {/* ── 2. Compact Sticky Category Icon Bar ─────────────── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200/80">
        <div className="max-w-7xl mx-auto">
          <CategoryIconBar />
        </div>
      </div>

      {/* ── 3. High-Velocity Product Rows ────────────────────── */}
      <div className="max-w-7xl w-full mx-auto space-y-2 md:space-y-4 my-2">

        <ProductScrollRow
          title="⚡ Flash Sales"
          viewAllLink="/marketplace?sort=discount"
          products={flashProducts}
        />

        <div className="border-t border-gray-200/60 mx-4" />

        <ProductScrollRow
          title="🍔 Hot Food & Drinks"
          viewAllLink="/marketplace?category=food"
          products={foodProducts}
        />

        <div className="border-t border-gray-200/60 mx-4" />

        <ProductScrollRow
          title="👗 Fresh Mitumba Drops"
          viewAllLink="/marketplace?category=fashion"
          products={fashionProducts}
        />

        <div className="border-t border-gray-200/60 mx-4" />

        <ProductScrollRow
          title="🔌 Tech & Gadgets"
          viewAllLink="/marketplace?category=electronics"
          products={techProducts}
        />
      </div>

      {/* ── 4. Hyperlocal Service Promo Strips ────────────────── */}
      <div className="max-w-7xl w-full mx-auto px-4 py-4 md:py-6 grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Boda Card */}
        <div className="bg-gradient-to-r from-[#FF5E00] to-[#E05200] rounded-2xl p-5 md:p-6 flex items-center gap-4 shadow-md text-white">
          <span className="text-4xl md:text-5xl select-none">🏍️</span>
          <div className="flex-1">
            <h3 className="text-white font-extrabold text-lg md:text-xl leading-tight">Request a Boda Ride</h3>
            <p className="text-orange-100 text-xs md:text-sm mt-0.5 font-medium">Kesses · Chebarus · Mabs · Stage</p>
          </div>
          <Link
            to="/transport"
            className="bg-white text-[#FF5E00] font-bold text-xs md:text-sm px-4 md:px-5 py-2.5 rounded-xl shadow hover:bg-orange-50 active:scale-95 transition-all whitespace-nowrap"
          >
            Book Ride
          </Link>
        </div>

        {/* Rentals Card */}
        <div className="bg-gradient-to-r from-[#027A2B] to-[#015C20] rounded-2xl p-5 md:p-6 flex items-center gap-4 shadow-md text-white">
          <span className="text-4xl md:text-5xl select-none">🏠</span>
          <div className="flex-1">
            <h3 className="text-white font-extrabold text-lg md:text-xl leading-tight">Find a Bedsitter / Hostel</h3>
            <p className="text-green-100 text-xs md:text-sm mt-0.5 font-medium">Verified rooms around campus</p>
          </div>
          <Link
            to="/rentals"
            className="bg-white text-[#027A2B] font-bold text-xs md:text-sm px-4 md:px-5 py-2.5 rounded-xl shadow hover:bg-green-50 active:scale-95 transition-all whitespace-nowrap"
          >
            Search Rooms
          </Link>
        </div>
      </div>

      {/* ── 5. Full Marketplace Feed (Infinite Grid) ─────────── */}
      <div className="border-t border-gray-200/80 bg-gray-50 pt-6">
        <div className="max-w-7xl mx-auto px-4 pb-2 flex items-center justify-between">
          <h2 className="text-gray-900 font-extrabold text-base md:text-xl">🛒 All Marketplace Items</h2>
          <Link to="/marketplace" className="text-[#FF5E00] hover:text-[#CC4B00] text-xs md:text-sm font-bold flex items-center gap-1">
            Full Catalog →
          </Link>
        </div>
        <ProductFeed />
      </div>

      {/* ── 6. Clean Light-Mode Footer ───────────────────────── */}
      <footer className="bg-white border-t border-gray-200 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-left">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 bg-[#FF5E00] rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-white font-extrabold text-lg">O</span>
                </div>
                <h3 className="text-gray-900 font-extrabold text-xl tracking-tight">Olafasta</h3>
              </div>
              <p className="text-gray-500 text-xs md:text-sm leading-relaxed mb-3">
                The hyperlocal student super-app. Built by comrades, for comrades — fasta fasta, kila kitu.
              </p>
              <div className="text-gray-500 text-xs space-y-1">
                <p className="font-semibold text-gray-700">+254 748 459757 | 0707 841 747</p>
                <p>support@olafasta.com</p>
              </div>
            </div>

            <div>
              <h4 className="text-gray-900 font-bold text-xs uppercase tracking-wider mb-3">Services</h4>
              <ul className="space-y-2 text-xs md:text-sm">
                {[
                  ['Marketplace', '/marketplace'],
                  ['Bodaboda Rides', '/transport'],
                  ['Campus Rentals', '/rentals'],
                  ['Healthcare & Chemist', '/marketplace?category=health']
                ].map(([label, href]) => (
                  <li key={label}>
                    <Link to={href} className="text-gray-600 hover:text-[#FF5E00] transition-colors">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-gray-900 font-bold text-xs uppercase tracking-wider mb-3">Company</h4>
              <ul className="space-y-2 text-xs md:text-sm">
                {[
                  ['About Olafasta', '/about'],
                  ['Customer Support', '/support'],
                  ['Partner with Us', '/register?role=business']
                ].map(([label, href]) => (
                  <li key={label}>
                    <Link to={href} className="text-gray-600 hover:text-[#FF5E00] transition-colors">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-gray-900 font-bold text-xs uppercase tracking-wider mb-3">Legal & Safety</h4>
              <ul className="space-y-2 text-xs md:text-sm">
                {[
                  ['Safety Guidelines', '/support'],
                  ['Terms of Service', '#'],
                  ['Privacy Policy', '#']
                ].map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="text-gray-600 hover:text-[#FF5E00] transition-colors">{label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-100 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <p>© 2025 Olafasta. All rights reserved. Moi University Main Campus.</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#027A2B] rounded-full animate-pulse" />
              <span className="text-[#027A2B] font-semibold">Live in Kesses & Chebarus</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
