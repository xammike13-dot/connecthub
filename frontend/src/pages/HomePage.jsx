import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Flame, ArrowRight, Compass } from 'lucide-react';
import PromoCarousel from '../components/PromoCarousel';
import CategoryIconBar from '../components/CategoryIconBar';
import ProductRow from '../components/ProductRow';
import ProductFeed from '../components/ProductFeed';
import { productAPI } from '../services/api';

// Quick category shortcuts using the 16 official Olafasta categories
const CATEGORY_SHORTCUTS = [
  { label: 'Foods', emoji: '🍔', route: '/marketplace?category=Olafasta+Foods' },
  { label: 'Boda', emoji: '🏍️', route: '/transport' },
  { label: 'Hostels', emoji: '🏠', route: '/rentals' },
  { label: 'Mitumba', emoji: '👗', route: '/marketplace?category=Olafasta+Mitumba' },
  { label: 'Gas', emoji: '🔥', route: '/marketplace?category=Olafasta+Gas' },
  { label: 'Tech', emoji: '🔌', route: '/marketplace?category=Olafasta+Tech' },
  { label: 'Chemist', emoji: '💊', route: '/marketplace?category=Olafasta+Chemist' },
  { label: 'Fashion', emoji: '👔', route: '/marketplace?category=Olafasta+Fashion' },
];

const HomePage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [flashProducts, setFlashProducts] = useState([]);
  const [foodProducts, setFoodProducts] = useState([]);
  const [mitumbaProducts, setMitumbaProducts] = useState([]);
  const [techProducts, setTechProducts] = useState([]);
  const [fashionProducts, setFashionProducts] = useState([]);
  const [gasProducts, setGasProducts] = useState([]);
  const [kibandaProducts, setKibandaProducts] = useState([]);

  // Redirect logged-in users to their role dashboard
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

  const loadCategory = useCallback(async (category, setter, limit = 10) => {
    try {
      const response = await productAPI.getAll({
        category,
        page: 1,
        limit,
        excludeHealthcare: true,
        sort: '-createdAt',
      });
      const data = response.data?.data || [];
      if (data.length) setter(data);
    } catch (err) {
      // Silently fail — the UI shows empty states
    }
  }, []);

  useEffect(() => {
    // Load flash/discounted products
    const loadFlash = async () => {
      try {
        const response = await productAPI.getAll({
          page: 1,
          limit: 10,
          excludeHealthcare: true,
          sort: '-createdAt',
        });
        const all = response.data?.data || [];
        const discounted = all.filter(
          (p) => p.originalPrice && p.originalPrice > p.price
        );
        setFlashProducts(discounted.length > 0 ? discounted : all.slice(0, 8));
      } catch (err) {
        // Silent fail
      }
    };

    loadFlash();
    loadCategory('Olafasta Foods', setFoodProducts);
    loadCategory('Olafasta Mitumba', setMitumbaProducts);
    loadCategory('Olafasta Tech', setTechProducts);
    loadCategory('Olafasta Fashion', setFashionProducts);
    loadCategory('Olafasta Gas', setGasProducts);
    loadCategory('Olafasta Kibanda', setKibandaProducts);
  }, [loadCategory]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans">

      {/* Promo Banner Carousel */}
      <div className="max-w-7xl w-full mx-auto px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
        <PromoCarousel />
      </div>

      {/* Category Icon Bar */}
      <div className="sticky top-[56px] sm:top-[64px] md:top-[68px] z-30">
        <CategoryIconBar />
      </div>

      {/* Product Rows */}
      <div className="max-w-7xl w-full mx-auto my-2 space-y-2 md:space-y-4">
        {flashProducts.length > 0 && (
          <ProductRow
            title="⚡ Flash Sales"
            hasCountdown={true}
            badge="High Urgency"
            viewAllLink="/marketplace"
            products={flashProducts}
          />
        )}

        {flashProducts.length > 0 && <div className="border-t border-gray-200/60 mx-4" />}

        {foodProducts.length > 0 && (
          <ProductRow
            title="🍔 Olafasta Foods"
            subtitle="Kibandas, Fast Food & Refreshments"
            viewAllLink="/marketplace?category=Olafasta+Foods"
            products={foodProducts}
          />
        )}

        {foodProducts.length > 0 && <div className="border-t border-gray-200/60 mx-4" />}

        {mitumbaProducts.length > 0 && (
          <ProductRow
            title="👗 Olafasta Mitumba"
            subtitle="Hand-picked Thrift Drops & Streetwear"
            viewAllLink="/marketplace?category=Olafasta+Mitumba"
            products={mitumbaProducts}
          />
        )}

        {mitumbaProducts.length > 0 && <div className="border-t border-gray-200/60 mx-4" />}

        {techProducts.length > 0 && (
          <ProductRow
            title="🔌 Olafasta Tech"
            subtitle="Laptops, Powerbanks, Phones & Accessories"
            viewAllLink="/marketplace?category=Olafasta+Tech"
            products={techProducts}
          />
        )}

        {techProducts.length > 0 && <div className="border-t border-gray-200/60 mx-4" />}

        {fashionProducts.length > 0 && (
          <ProductRow
            title="👔 Olafasta Fashion"
            subtitle="Boutiques, New Clothing & Accessories"
            viewAllLink="/marketplace?category=Olafasta+Fashion"
            products={fashionProducts}
          />
        )}

        {fashionProducts.length > 0 && <div className="border-t border-gray-200/60 mx-4" />}

        {gasProducts.length > 0 && (
          <ProductRow
            title="🔥 Olafasta Gas"
            subtitle="Gas Refills, Cylinders & Delivery"
            viewAllLink="/marketplace?category=Olafasta+Gas"
            products={gasProducts}
          />
        )}

        {gasProducts.length > 0 && <div className="border-t border-gray-200/60 mx-4" />}

        {kibandaProducts.length > 0 && (
          <ProductRow
            title="🍲 Olafasta Kibanda"
            subtitle="Local Food Kiosks & Home-Cooked Meals"
            viewAllLink="/marketplace?category=Olafasta+Kibanda"
            products={kibandaProducts}
          />
        )}
      </div>

      {/* Service Promo Strips */}
      <div className="max-w-7xl w-full mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Explore Categories Grid */}
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

      {/* More To Explore Infinite Feed */}
      <section className="border-t border-gray-200/80 bg-gray-50 pt-8 pb-12">
        <div className="max-w-7xl mx-auto px-4">
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
              <span>Explore All Categories</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          <ProductFeed />
        </div>
      </section>

    </div>
  );
};

export default HomePage;
