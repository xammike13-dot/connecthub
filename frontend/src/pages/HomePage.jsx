import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Flame, ArrowRight, Compass } from 'lucide-react';
import PromoCarousel from '../components/PromoCarousel';
import CategoryIconBar from '../components/CategoryIconBar';
import ProductRow from '../components/ProductRow';
import ProductFeed from '../components/ProductFeed';

// ─── 8 Quick Category Shortcuts (Bail-out shortcuts before infinite feed) ─────
const CATEGORY_SHORTCUTS = [
  { label: 'Food',        emoji: '🍔', route: '/marketplace?category=Food+%26+Drinks' },
  { label: 'Boda',        emoji: '🏍️', route: '/transport' },
  { label: 'Hostels',     emoji: '🏠', route: '/rentals' },
  { label: 'Mitumba',     emoji: '👗', route: '/marketplace?category=Fashion+%26+Mitumba' },
  { label: 'Gas',         emoji: '🔥', route: '/marketplace?category=Hostel+Setup' },
  { label: 'Electronics', emoji: '🔌', route: '/marketplace?category=Tech+%26+Gadgets' },
  { label: 'Chemist',     emoji: '💊', route: '/marketplace?category=Chemist+%26+Wellness' },
  { label: 'Printing',    emoji: '🖨️', route: '/marketplace?category=Printing+%26+Academics' },
];

// ─── 1. Flash Sales Mock Data (High urgency, steep discounts) ─────────────────
const FLASH_MOCK = [
  { _id: 'fl-1', name: 'Oraimo 27,000mAh Massive Fast-Charge Power Bank', price: 2400, oldPrice: 3200, discountPct: 25, images: [], emoji: '🔋', category: 'Tech & Gadgets', isLive: true },
  { _id: 'fl-2', name: 'Wireless Bluetooth Noise-Cancelling Earbuds Pro', price: 850, oldPrice: 1500, discountPct: 43, images: [], emoji: '🎧', category: 'Tech & Gadgets' },
  { _id: 'fl-3', name: 'High-Waist Thrift Vintage Mom Jeans (Grade A)', price: 350, oldPrice: 600, discountPct: 42, images: [], emoji: '👖', category: 'Fashion & Mitumba' },
  { _id: 'fl-4', name: '6kg Gas Cylinder Refill Delivery Voucher', price: 1350, oldPrice: 1550, discountPct: 13, images: [], emoji: '🔥', category: 'Hostel Setup', isLive: true },
  { _id: 'fl-5', name: 'Heavy Cotton Comrade Graphic Pullover Hoodie', price: 650, oldPrice: 900, discountPct: 28, images: [], emoji: '🧥', category: 'Fashion & Mitumba' },
  { _id: 'fl-6', name: '5-Metre 4-Way Heavy Duty Extension Cable', price: 450, oldPrice: 650, discountPct: 31, images: [], emoji: '🔌', category: 'Tech & Gadgets' },
];

// ─── 2. Hot Food & Drinks (Kibandas, fast food, liquor) ───────────────────────
const FOOD_MOCK = [
  { _id: 'fd-1', name: 'Ugali + Sukuma Wiki + Beef Stew (Hot Kibanda Meal)', price: 100, oldPrice: 140, discountPct: 28, images: [], emoji: '🍛', category: 'Food & Drinks', isLive: true },
  { _id: 'fd-2', name: 'Special Pilau Bowl (Large + Kachumbari + Banana)', price: 120, oldPrice: 150, discountPct: 20, images: [], emoji: '🍚', category: 'Food & Drinks', isLive: true },
  { _id: 'fd-3', name: 'Crispy Chips Mwitu + 2 Smoky Sausages Combo', price: 110, oldPrice: 140, discountPct: 21, images: [], emoji: '🍟', category: 'Food & Drinks', isLive: true },
  { _id: 'fd-4', name: 'Fresh Mandazi (6-Pack Hot from Karai)', price: 50, oldPrice: 60, discountPct: 16, images: [], emoji: '🥐', category: 'Food & Drinks' },
  { _id: 'fd-5', name: 'Nile Special Lager (6-Pack Chilled Cans)', price: 1100, oldPrice: 1350, discountPct: 19, images: [], emoji: '🍺', category: 'Food & Drinks' },
  { _id: 'fd-6', name: 'Ice Cold 500ml Soda (Coke / Fanta / Sprite)', price: 60, oldPrice: 70, discountPct: 14, images: [], emoji: '🥤', category: 'Food & Drinks' },
];

// ─── 3. Fresh Mitumba Drops (Second-hand clothing, shoes, jackets) ───────────
const MITUMBA_MOCK = [
  { _id: 'mt-1', name: 'Vintage Distressed Oversized Denim Jacket', price: 550, oldPrice: 900, discountPct: 39, images: [], emoji: '🧥', category: 'Fashion & Mitumba' },
  { _id: 'mt-2', name: 'Slim Fit Blue Wash Thrift Jeans (Grade A)', price: 350, oldPrice: 600, discountPct: 42, images: [], emoji: '👖', category: 'Fashion & Mitumba' },
  { _id: 'mt-3', name: 'Ladies Chiffon Floral Blouse – Pastel Pink', price: 220, oldPrice: 400, discountPct: 45, images: [], emoji: '👚', category: 'Fashion & Mitumba' },
  { _id: 'mt-4', name: 'Nike-Style Streetwear Sneakers (Triple White)', price: 800, oldPrice: 1200, discountPct: 33, images: [], emoji: '👟', category: 'Fashion & Mitumba' },
  { _id: 'mt-5', name: 'Flared Ankara Pattern Maxi Dress (L/XL)', price: 400, oldPrice: 650, discountPct: 38, images: [], emoji: '👗', category: 'Fashion & Mitumba' },
  { _id: 'mt-6', name: 'Vintage Corduroy Long-Sleeve Shirt (Olive Green)', price: 380, oldPrice: 550, discountPct: 31, images: [], emoji: '👔', category: 'Fashion & Mitumba' },
];

// ─── 4. Comrade Second-Hand Market (Subwoofers, TVs, beds, cylinders) ─────────
const SECOND_HAND_MOCK = [
  { _id: 'sh-1', name: 'Sayona 3.1 Bluetooth Subwoofer System (Gently Used)', price: 3200, oldPrice: 4800, discountPct: 33, images: [], emoji: '📻', category: 'Second Hand' },
  { _id: 'sh-2', name: '32-inch Frameless Digital LED TV (Sharp Display)', price: 8500, oldPrice: 12000, discountPct: 29, images: [], emoji: '📺', category: 'Second Hand' },
  { _id: 'sh-3', name: 'Heavy Steel 3x6 Single Bed Frame (Dismountable)', price: 2800, oldPrice: 4500, discountPct: 38, images: [], emoji: '🛏️', category: 'Second Hand' },
  { _id: 'sh-4', name: '6kg Empty Gas Cylinder (Total Brand, Tested Valve)', price: 2100, oldPrice: 3000, discountPct: 30, images: [], emoji: '🛢️', category: 'Second Hand' },
  { _id: 'sh-5', name: 'Comrade Study Desk & Ergonomic Mesh Chair Combo', price: 3500, oldPrice: 5200, discountPct: 33, images: [], emoji: '🪑', category: 'Second Hand' },
  { _id: 'sh-6', name: 'Laundry Kit: 1 Large Basin + 2 Heavy Water Buckets', price: 600, oldPrice: 900, discountPct: 33, images: [], emoji: '🪣', category: 'Second Hand' },
];

// ─── 5. Tech, Gadgets & Repairs (Phones, flash drives, chargers, screens) ──────
const TECH_MOCK = [
  { _id: 'tc-1', name: 'Original HP Blue-Pin 65W Laptop Charger', price: 950, oldPrice: 1400, discountPct: 32, images: [], emoji: '💻', category: 'Tech & Gadgets' },
  { _id: 'tc-2', name: 'SanDisk 64GB Ultra Dual USB-C & USB-A Flash Drive', price: 650, oldPrice: 950, discountPct: 32, images: [], emoji: '💾', category: 'Tech & Gadgets' },
  { _id: 'tc-3', name: '9D Full Screen Protector + Instant Installation (Stage)', price: 100, oldPrice: 200, discountPct: 50, images: [], emoji: '📲', category: 'Tech & Gadgets' },
  { _id: 'tc-4', name: 'Smartphone Broken Screen Replacement (Any Model - 1hr)', price: 1500, oldPrice: 2200, discountPct: 32, images: [], emoji: '🛠️', category: 'Tech & Gadgets', isLive: true },
  { _id: 'tc-5', name: 'Braided 2-Metre 65W Fast Charge Cable Type-C', price: 150, oldPrice: 300, discountPct: 50, images: [], emoji: '🔌', category: 'Tech & Gadgets' },
  { _id: 'tc-6', name: 'Dual-Fan Ergonomic Laptop Cooling Pad Stand', price: 900, oldPrice: 1500, discountPct: 40, images: [], emoji: '❄️', category: 'Tech & Gadgets' },
];

// ─── 6. Beauty & Glow Up (Cosmetics, skincare, salon braiding offers) ──────────
const BEAUTY_MOCK = [
  { _id: 'bt-1', name: 'Knotless Box Braids Session (Full Head - Mabs)', price: 650, oldPrice: 950, discountPct: 32, images: [], emoji: '💇🏽‍♀️', category: 'Kinyozi & Salon', isLive: true },
  { _id: 'bt-2', name: 'Clean Fade, Beard Sculpt & Hot Towel (Stage Barber)', price: 150, oldPrice: 250, discountPct: 40, images: [], emoji: '💈', category: 'Kinyozi & Salon' },
  { _id: 'bt-3', name: 'Dreadlock Retwist & Interlocking (Chebarus Corridor)', price: 500, oldPrice: 800, discountPct: 38, images: [], emoji: '✨', category: 'Kinyozi & Salon' },
  { _id: 'bt-4', name: 'CeraVe Foaming Cleanser 236ml (Authentic Skincare)', price: 1400, oldPrice: 1800, discountPct: 22, images: [], emoji: '🧴', category: 'Chemist & Wellness' },
  { _id: 'bt-5', name: 'Gel Polish Manicure & Pedicure Grooming Package', price: 400, oldPrice: 650, discountPct: 38, images: [], emoji: '💅', category: 'Kinyozi & Salon' },
  { _id: 'bt-6', name: 'Anti-Scald Ceramic Hair Straightener Hot Comb', price: 700, oldPrice: 1100, discountPct: 36, images: [], emoji: '🎀', category: 'Kinyozi & Salon' },
];

// ─── 7. Hostel Setup & Essentials (Gas refills, Mali Mali, plasticware) ────────
const HOSTEL_MOCK = [
  { _id: 'hs-1', name: '6kg Complete Gas Cylinder + Burner & Regulator', price: 2900, oldPrice: 3600, discountPct: 19, images: [], emoji: '🔥', category: 'Hostel Setup' },
  { _id: 'hs-2', name: '6x6 Heavy Velvet Comforter Duvet (Navy Blue)', price: 1600, oldPrice: 2200, discountPct: 27, images: [], emoji: '🛏️', category: 'Hostel Setup' },
  { _id: 'hs-3', name: 'Stainless Steel Cordless Electric Kettle 2.0L', price: 650, oldPrice: 950, discountPct: 32, images: [], emoji: '☕', category: 'Hostel Setup' },
  { _id: 'hs-4', name: '24-Piece Student Cutlery, Plates & Mug Starter Set', price: 450, oldPrice: 650, discountPct: 31, images: [], emoji: '🥣', category: 'Hostel Setup' },
  { _id: 'hs-5', name: 'Heavy Non-Stick Granite Frying Pan 24cm', price: 550, oldPrice: 800, discountPct: 31, images: [], emoji: '🍳', category: 'Hostel Setup' },
  { _id: 'hs-6', name: '4-Tier Plastic Storage Rack for Hostel Shoes & Goods', price: 580, oldPrice: 850, discountPct: 32, images: [], emoji: '🪜', category: 'Hostel Setup' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const normaliseProducts = (json) => {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.data)) return json.data;
  return [];
};

// ─── HomePage Component ───────────────────────────────────────────────────────
const HomePage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // State for all 7 specialized rows (defaults to rich mocks immediately)
  const [flashProducts, setFlashProducts] = useState(FLASH_MOCK);
  const [foodProducts, setFoodProducts] = useState(FOOD_MOCK);
  const [mitumbaProducts, setMitumbaProducts] = useState(MITUMBA_MOCK);
  const [secondHandProducts, setSecondHandProducts] = useState(SECOND_HAND_MOCK);
  const [techProducts, setTechProducts] = useState(TECH_MOCK);
  const [beautyProducts, setBeautyProducts] = useState(BEAUTY_MOCK);
  const [hostelProducts, setHostelProducts] = useState(HOSTEL_MOCK);

  // Redirect logged-in users to their respective role dashboard
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

  // Load live products from backend in the background and replace mocks when ready
  useEffect(() => {
    const load = (params, setter) =>
      fetch(`/api/products?${params}&limit=10`)
        .then((r) => r.json())
        .then((j) => {
          const d = normaliseProducts(j);
          if (d.length) setter(d);
        })
        .catch(() => {/* retain mocks on network error */});

    load('sort=discount&page=1', setFlashProducts);
    load('category=Food+%26+Drinks&page=1', setFoodProducts);
    load('category=Fashion+%26+Mitumba&page=1', setMitumbaProducts);
    load('category=Second+Hand&page=1', setSecondHandProducts);
    load('category=Tech+%26+Gadgets&page=1', setTechProducts);
    load('category=Kinyozi+%26+Salon&page=1', setBeautyProducts);
    load('category=Hostel+Setup&page=1', setHostelProducts);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans">

      {/* ── 1. Top Promo Banner Carousel ─────────────────────── */}
      <div className="max-w-7xl w-full mx-auto px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
        <PromoCarousel />
      </div>

      {/* ── 2. Compact Sticky Category Icon Bar (11 Micro-Economies) ── */}
      <div className="sticky top-[56px] sm:top-[64px] md:top-[68px] z-30">
        <CategoryIconBar />
      </div>

      {/* ── 3. The 7 Merchandising Horizontal Product Rows ───── */}
      <div className="max-w-7xl w-full mx-auto my-2 space-y-2 md:space-y-4">

        {/* Row 1: ⚡ Flash Sales with Live Urgency Countdown */}
        <ProductRow
          title="⚡ Flash Sales"
          hasCountdown={true}
          badge="High Urgency"
          viewAllLink="/marketplace?sort=discount"
          products={flashProducts}
        />

        <div className="border-t border-gray-200/60 mx-4" />

        {/* Row 2: 🍔 Hot Food & Drinks */}
        <ProductRow
          title="🍔 Hot Food & Drinks"
          subtitle="Kibandas, Fast Food & Refreshments"
          viewAllLink="/marketplace?category=Food+%26+Drinks"
          products={foodProducts}
        />

        <div className="border-t border-gray-200/60 mx-4" />

        {/* Row 3: 👗 Fresh Mitumba Drops */}
        <ProductRow
          title="👗 Fresh Mitumba Drops"
          subtitle="Hand-picked Thrift Drops & Streetwear"
          viewAllLink="/marketplace?category=Fashion+%26+Mitumba"
          products={mitumbaProducts}
        />

        <div className="border-t border-gray-200/60 mx-4" />

        {/* Row 4: ♻️ Comrade Second-Hand Market */}
        <ProductRow
          title="♻️ Comrade Second-Hand Market"
          subtitle="Pre-loved Subwoofers, TVs, Gas Cylinders & Beds"
          badge="Comrade Deals"
          viewAllLink="/marketplace?category=Second+Hand"
          products={secondHandProducts}
        />

        <div className="border-t border-gray-200/60 mx-4" />

        {/* Row 5: 🔌 Tech, Gadgets & Repairs */}
        <ProductRow
          title="🔌 Tech, Gadgets & Repairs"
          subtitle="Laptops, Powerbanks, Screen Repairs in 1hr"
          viewAllLink="/marketplace?category=Tech+%26+Gadgets"
          products={techProducts}
        />

        <div className="border-t border-gray-200/60 mx-4" />

        {/* Row 6: 💅 Beauty & Glow Up */}
        <ProductRow
          title="💅 Beauty & Glow Up"
          subtitle="Braiding Sessions, Kinyozi Fades & Skincare"
          viewAllLink="/marketplace?category=Kinyozi+%26+Salon"
          products={beautyProducts}
        />

        <div className="border-t border-gray-200/60 mx-4" />

        {/* Row 7: 🏠 Hostel Setup & Essentials */}
        <ProductRow
          title="🏠 Hostel Setup & Essentials"
          subtitle="Gas Refills, Mali Mali Supplies & Bedding"
          viewAllLink="/marketplace?category=Hostel+Setup"
          products={hostelProducts}
        />
      </div>

      {/* ── 4. Hyperlocal Service Promo Strips ────────────────── */}
      <div className="max-w-7xl w-full mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Boda Card */}
        <div className="bg-gradient-to-r from-[#FF5E00] to-[#E05200] rounded-2xl p-5 md:p-6 flex items-center gap-4 shadow-md text-white hover:shadow-lg transition-shadow">
          <span className="text-4xl md:text-5xl select-none">🏍️</span>
          <div className="flex-1">
            <h3 className="text-white font-extrabold text-lg md:text-xl leading-tight">Request an Olafasta Boda</h3>
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
        <div className="bg-gradient-to-r from-[#027A2B] to-[#015C20] rounded-2xl p-5 md:p-6 flex items-center gap-4 shadow-md text-white hover:shadow-lg transition-shadow">
          <span className="text-4xl md:text-5xl select-none">🏠</span>
          <div className="flex-1">
            <h3 className="text-white font-extrabold text-lg md:text-xl leading-tight">Find a Bedsitter / Hostel</h3>
            <p className="text-green-100 text-xs md:text-sm mt-0.5 font-medium">Verified rooms around Moi University</p>
          </div>
          <Link
            to="/rentals"
            className="bg-white text-[#027A2B] font-bold text-xs md:text-sm px-4 md:px-5 py-2.5 rounded-xl shadow hover:bg-green-50 active:scale-95 transition-all whitespace-nowrap"
          >
            Search Rooms
          </Link>
        </div>
      </div>

      {/* ── 5. "Explore Categories" Grid Shortcuts (Pre-Feed Bailout) ── */}
      <section className="max-w-7xl w-full mx-auto px-4 py-4 md:py-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-gray-900 font-extrabold text-sm sm:text-base tracking-tight flex items-center gap-2">
                <Compass size={16} className="text-[#FF5E00]" />
                <span>Explore Top Categories</span>
              </h3>
              <p className="text-gray-400 text-xs hidden sm:block mt-0.5">
                Quick jump to your favorite campus micro-economy
              </p>
            </div>
            <Link
              to="/marketplace"
              className="text-xs font-bold text-[#FF5E00] hover:text-[#CC4B00] transition-colors"
            >
              All Categories →
            </Link>
          </div>

          {/* Tight 8-Item Category Grid (grid-cols-4 md:grid-cols-8 gap-4) */}
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3 sm:gap-4">
            {CATEGORY_SHORTCUTS.map((item) => (
              <Link
                key={item.label}
                to={item.route}
                className="flex flex-col items-center group active:scale-95 transition-transform"
              >
                <div className="rounded-full w-13 h-13 sm:w-14 sm:h-14 bg-gray-50 border border-gray-100 group-hover:border-[#FF5E00]/40 group-hover:bg-orange-50/50 group-hover:shadow-xs flex items-center justify-center text-2xl transition-all">
                  <span className="transform group-hover:scale-110 transition-transform select-none">
                    {item.emoji}
                  </span>
                </div>
                <span className="text-xs text-center mt-1.5 text-gray-700 font-medium group-hover:text-[#FF5E00] transition-colors line-clamp-1">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. Massive "More To Explore" / "Just For You" Infinite Feed ── */}
      <section className="border-t border-gray-200/80 bg-gray-50 pt-8 pb-12">
        <div className="max-w-7xl mx-auto px-4">
          
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-orange-100/80 text-[#FF5E00] font-bold text-[11px] px-2.5 py-0.5 rounded-full mb-1">
                <Flame size={13} className="text-[#FF5E00]" />
                <span>MASSIVE CAMPUS CATALOG</span>
              </div>
              <h2 className="text-gray-900 font-extrabold text-xl sm:text-2xl tracking-tight flex items-center gap-2">
                <span>More To Explore</span>
                <span className="text-gray-400 font-normal text-sm sm:text-base hidden sm:inline">
                  (Just For You)
                </span>
              </h2>
              <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
                Everyday essentials, meals, second-hand bargains & campus services from verified vendors.
              </p>
            </div>

            <Link
              to="/marketplace"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#FF5E00] hover:text-[#CC4B00] transition-colors self-start sm:self-auto py-1"
            >
              <span>Explore All 11 Categories</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          {/* Grid Feed with Infinite Scroll */}
          <ProductFeed />
        </div>
      </section>

    </div>
  );
};

export default HomePage;
