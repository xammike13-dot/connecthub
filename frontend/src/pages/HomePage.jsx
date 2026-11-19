import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Flame, ArrowRight, Compass, Sparkles } from 'lucide-react';
import PromoCarousel from '../components/PromoCarousel';
import CategoryIconBar from '../components/CategoryIconBar';
import ProductRow from '../components/ProductRow';
import ProductFeed from '../components/ProductFeed';
import ServiceBanners from '../components/ServiceBanners';
import OLA_CATEGORIES, { CATEGORY_ICONS } from '../config/categories.js';
import { useFlashDeals, useProductsByCategory } from '../hooks/useProducts';

// ─── HomePage Component ───────────────────────────────────────────────────────
const HomePage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // ── 1. Asynchronous Dynamic Product Queries (TanStack React Query) ──────────
  const { data: flashProducts = [], isLoading: loadingFlash } = useFlashDeals(8);
  const { data: foodProducts = [], isLoading: loadingFood } = useProductsByCategory('food-drinks', 8);
  const { data: mitumbaProducts = [], isLoading: loadingMitumba } = useProductsByCategory('mitumba', 8);
  const { data: secondHandProducts = [], isLoading: loadingSecondHand } = useProductsByCategory('second-hand', 8);
  const { data: techProducts = [], isLoading: loadingTech } = useProductsByCategory('tech', 8);
  const { data: beautyProducts = [], isLoading: loadingBeauty } = useProductsByCategory('grooming', 8);
  const { data: gasProducts = [], isLoading: loadingGas } = useProductsByCategory('gas-refill', 8);

  // Redirect non-customer roles to their respective role dashboards (landlords, riders, vendors)
  // Customers MUST remain on the homepage as their default landing page
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'customer') {
        // Customer remains on the main Olafasta homepage
        return;
      }
      const map = {
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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans">

      {/* ── 1. Top Promo Banner Carousel ─────────────────────── */}
      <div className="max-w-7xl w-full mx-auto px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
        <PromoCarousel />
      </div>

      {/* ── 2. Compact Sticky Category Icon Bar (21 Micro-Economies) ── */}
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
          isLoading={loadingFlash}
        />

        {/* ── Non-Retail Service Banners (Bodaboda Rides & Hostel Rentals) ── */}
        <ServiceBanners />

        {/* Row 2: 🍔 Food & Drinks */}
        <ProductRow
          title="🍔 Food & Drinks"
          subtitle="Kibandas, Fast Food, Chapo & Refreshments"
          viewAllLink="/c/food-drinks"
          products={foodProducts}
          isLoading={loadingFood}
        />

        {/* Row 3: 👗 Mitumba (Thrift Clothes) */}
        <ProductRow
          title="👗 Mitumba (Thrift Clothes)"
          subtitle="Hand-picked Thrift Drops, Denim & Streetwear"
          viewAllLink="/c/mitumba"
          products={mitumbaProducts}
          isLoading={loadingMitumba}
        />

        {/* Row 4: 📻 Second-Hand Market */}
        <ProductRow
          title="📻 Second-Hand Market"
          subtitle="Pre-loved Subwoofers, TVs, Gas Cylinders & Beds"
          badge="Comrade Deals"
          viewAllLink="/c/second-hand"
          products={secondHandProducts}
          isLoading={loadingSecondHand}
        />

        {/* Row 5: 💻 Tech & Gadgets */}
        <ProductRow
          title="💻 Tech & Gadgets"
          subtitle="Laptops, Powerbanks, Screen Repairs in 1hr"
          viewAllLink="/c/tech"
          products={techProducts}
          isLoading={loadingTech}
        />

        {/* Row 6: 💈 Grooming & Salons */}
        <ProductRow
          title="💈 Grooming & Salons"
          subtitle="Braiding Sessions, Kinyozi Fades & Skincare"
          viewAllLink="/c/grooming"
          products={beautyProducts}
          isLoading={loadingBeauty}
        />

        {/* Row 7: 🔥 Gas Refill & Essentials */}
        <ProductRow
          title="🔥 Gas Refill & Essentials"
          subtitle="Gas Refills, Mali Mali Supplies & Bedding"
          viewAllLink="/c/gas-refill"
          products={gasProducts}
          isLoading={loadingGas}
        />
      </div>

      {/* ── 4. "Explore Categories" Dense Shortcut Grid (Pre-Feed Bailout) ── */}
      <section className="max-w-7xl w-full mx-auto px-4 py-4 md:py-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-gray-900 font-extrabold text-sm sm:text-base tracking-tight flex items-center gap-2">
                <Compass size={16} className="text-[#FF5E00]" />
                <span>Explore 21 Campus Categories</span>
              </h3>
              <p className="text-gray-400 text-xs hidden sm:block mt-0.5">
                Quick jump to your favorite campus micro-economy
              </p>
            </div>
            <Link
              to="/categories"
              className="text-xs font-bold text-[#FF5E00] hover:text-[#CC4B00] transition-colors flex items-center gap-1"
            >
              <span>View All 21</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* Swipeable horizontal scroll row on mobile & responsive dense grid on sm+ screens */}
          <div className="sm:hidden flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 no-scrollbar scrollbar-hide">
            {OLA_CATEGORIES.map((item) => {
              const IconComponent = CATEGORY_ICONS[item.iconName] || Sparkles;

              return (
                <Link
                  key={item.id}
                  to={item.route}
                  className="flex flex-col items-center min-w-[76px] w-[76px] snap-start flex-shrink-0 group active:scale-95 transition-transform"
                >
                  <div
                    className="rounded-2xl w-13 h-13 border flex items-center justify-center transition-all shadow-2xs group-hover:scale-105 relative"
                    style={{
                      backgroundColor: `${item.accentColor}14`,
                      borderColor: `${item.accentColor}30`,
                    }}
                  >
                    <IconComponent
                      size={20}
                      style={{ color: item.accentColor }}
                      className="stroke-[2.2]"
                    />
                    <span className="absolute -bottom-1 -right-1 text-[10px]">
                      {item.emoji}
                    </span>
                  </div>
                  <span className="text-xs leading-tight text-center mt-1 text-gray-700 font-medium group-hover:text-[#FF5E00] transition-colors line-clamp-2 w-full px-0.5">
                    {item.shortLabel}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Dense Grid on sm and larger screens (grid-cols-4 sm:grid-cols-5 md:grid-cols-7) */}
          <div className="hidden sm:grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-3 sm:gap-4">
            {OLA_CATEGORIES.map((item) => {
              const IconComponent = CATEGORY_ICONS[item.iconName] || Sparkles;

              return (
                <Link
                  key={item.id}
                  to={item.route}
                  className="flex flex-col items-center group active:scale-95 transition-transform p-2 rounded-xl hover:bg-orange-50/40"
                >
                  <div
                    className="rounded-2xl w-13 h-13 sm:w-14 sm:h-14 border flex items-center justify-center transition-all shadow-2xs group-hover:scale-105 group-hover:shadow-xs relative"
                    style={{
                      backgroundColor: `${item.accentColor}14`,
                      borderColor: `${item.accentColor}30`,
                    }}
                  >
                    <IconComponent
                      size={22}
                      style={{ color: item.accentColor }}
                      className="stroke-[2.2] transition-transform group-hover:rotate-3"
                    />
                    <span className="absolute -bottom-1 -right-1 text-[11px]">
                      {item.emoji}
                    </span>
                  </div>
                  <span className="text-xs leading-tight text-center mt-1.5 text-gray-700 font-semibold group-hover:text-[#FF5E00] transition-colors line-clamp-2 w-full">
                    {item.shortLabel}
                  </span>
                  <span className="text-[10px] text-gray-400 text-center line-clamp-1 mt-0.5">
                    {item.tagline?.split('/')[0] || item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 5. Massive "More To Explore" / "Just For You" Infinite Feed ── */}
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
              to="/categories"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#FF5E00] hover:text-[#CC4B00] transition-colors self-start sm:self-auto py-1"
            >
              <span>Explore All 21 Categories</span>
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
