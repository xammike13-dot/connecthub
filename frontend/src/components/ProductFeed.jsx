// ProductFeed.jsx – massive infinite-scroll product feed for "More To Explore / Just For You"
import { useEffect, useState, useRef, useCallback } from 'react';
import { ArrowDown, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import ProductCard from './ProductCard';

// ─── 32 Diverse Campus Products across all 11 Comrade Micro-Economies ─────────
export const MOCK_EXPLORE_PRODUCTS = [
  {
    _id: 'exp-1',
    name: '6kg Pro-Gas Cylinder (Refill + Burner Grill)',
    price: 1350,
    oldPrice: 1550,
    discountPct: 13,
    images: [],
    emoji: '🔥',
    category: 'Hostel Setup',
    soldCount: 84,
  },
  {
    _id: 'exp-2',
    name: 'Oraimo 27,000mAh Massive Fast-Charge Power Bank',
    price: 2400,
    oldPrice: 3200,
    discountPct: 25,
    images: [],
    emoji: '🔋',
    category: 'Tech & Gadgets',
    soldCount: 112,
  },
  {
    _id: 'exp-3',
    name: 'Fresh Kibanda Chapati Pack (10 Pieces)',
    price: 150,
    oldPrice: 200,
    discountPct: 25,
    images: [],
    emoji: '🥞',
    category: 'Food & Drinks',
    isLive: true,
    soldCount: 230,
  },
  {
    _id: 'exp-4',
    name: 'Sharp Clean Fade & Beard Shave (Stage Barber Voucher)',
    price: 150,
    oldPrice: 250,
    discountPct: 40,
    images: [],
    emoji: '💈',
    category: 'Kinyozi & Salon',
    soldCount: 65,
  },
  {
    _id: 'exp-5',
    name: 'Casio fx-991EX ClassWiz Scientific Calculator',
    price: 1850,
    oldPrice: 2500,
    discountPct: 26,
    images: [],
    emoji: '📐',
    category: 'Printing & Academics',
    soldCount: 47,
  },
  {
    _id: 'exp-6',
    name: 'Heavy Velvet 6x6 Comforter Warm Duvet (Navy)',
    price: 1600,
    oldPrice: 2200,
    discountPct: 27,
    images: [],
    emoji: '🛏️',
    category: 'Hostel Setup',
    soldCount: 39,
  },
  {
    _id: 'exp-7',
    name: 'Nike Air Force 1 Low (Triple White - Thrift Grade A)',
    price: 1450,
    oldPrice: 2000,
    discountPct: 28,
    images: [],
    emoji: '👟',
    category: 'Fashion & Mitumba',
    soldCount: 92,
  },
  {
    _id: 'exp-8',
    name: 'Wireless PS4 DualShock Controller (Daily Rental)',
    price: 200,
    oldPrice: 300,
    discountPct: 33,
    images: [],
    emoji: '🎮',
    category: 'Gaming & Accounts',
    soldCount: 150,
  },
  {
    _id: 'exp-9',
    name: 'Comrade Heavyweight Pullover Hoodie (Black)',
    price: 850,
    oldPrice: 1200,
    discountPct: 29,
    images: [],
    emoji: '🧥',
    category: 'Fashion & Mitumba',
    soldCount: 78,
  },
  {
    _id: 'exp-10',
    name: '5-Metre 4-Way Heavy Duty Extension Cable',
    price: 450,
    oldPrice: 650,
    discountPct: 31,
    images: [],
    emoji: '🔌',
    category: 'Tech & Gadgets',
    soldCount: 104,
  },
  {
    _id: 'exp-11',
    name: 'Moi University Campus Bash VIP Ticket (Early Bird)',
    price: 300,
    oldPrice: 500,
    discountPct: 40,
    images: [],
    emoji: '🎟️',
    category: 'Events & Tickets',
    isLive: true,
    soldCount: 180,
  },
  {
    _id: 'exp-12',
    name: 'Gold Standard 100% Whey Protein (1kg Decant)',
    price: 2200,
    oldPrice: 2800,
    discountPct: 21,
    images: [],
    emoji: '🥤',
    category: 'Fitness & Sports',
    soldCount: 29,
  },
  {
    _id: 'exp-13',
    name: 'Fluffy Bedside Rug (120x80cm Soft Shag)',
    price: 750,
    oldPrice: 1100,
    discountPct: 32,
    images: [],
    emoji: '🧶',
    category: 'Hostel Setup',
    soldCount: 43,
  },
  {
    _id: 'exp-14',
    name: 'Knotless Box Braids Session (Full Head - Mabs)',
    price: 650,
    oldPrice: 950,
    discountPct: 32,
    images: [],
    emoji: '💇🏽‍♀️',
    category: 'Kinyozi & Salon',
    soldCount: 55,
  },
  {
    _id: 'exp-15',
    name: 'Stainless Steel Cordless Electric Kettle 2.0L',
    price: 650,
    oldPrice: 950,
    discountPct: 32,
    images: [],
    emoji: '☕',
    category: 'Mini-Mart',
    soldCount: 120,
  },
  {
    _id: 'exp-16',
    name: 'Lab Coat White (Poly-Cotton) + Safety Goggles',
    price: 750,
    oldPrice: 1050,
    discountPct: 29,
    images: [],
    emoji: '🥼',
    category: 'Printing & Academics',
    soldCount: 88,
  },
  {
    _id: 'exp-17',
    name: 'HP Original Blue-Pin 65W Laptop Fast Charger',
    price: 950,
    oldPrice: 1400,
    discountPct: 32,
    images: [],
    emoji: '💻',
    category: 'Tech & Gadgets',
    soldCount: 61,
  },
  {
    _id: 'exp-18',
    name: 'Netflix Premium 1-Month Private Screen Profile',
    price: 250,
    oldPrice: 400,
    discountPct: 38,
    images: [],
    emoji: '🎬',
    category: 'Gaming & Accounts',
    soldCount: 310,
  },
  {
    _id: 'exp-19',
    name: 'Nile Special Lager (6-Pack Chilled Cans)',
    price: 1100,
    oldPrice: 1350,
    discountPct: 19,
    images: [],
    emoji: '🍺',
    category: 'Food & Drinks',
    soldCount: 94,
  },
  {
    _id: 'exp-20',
    name: 'Non-Stick Heavy Granite Frying Pan 24cm',
    price: 550,
    oldPrice: 800,
    discountPct: 31,
    images: [],
    emoji: '🍳',
    category: 'Hostel Setup',
    soldCount: 72,
  },
  {
    _id: 'exp-21',
    name: 'Dreadlock Retwist & Interlocking (Chebarus Corridor)',
    price: 500,
    oldPrice: 800,
    discountPct: 38,
    images: [],
    emoji: '✨',
    category: 'Kinyozi & Salon',
    soldCount: 46,
  },
  {
    _id: 'exp-22',
    name: '50-Page Project & Lab Report Color Print + Binding',
    price: 250,
    oldPrice: 400,
    discountPct: 38,
    images: [],
    emoji: '📑',
    category: 'Printing & Academics',
    soldCount: 205,
  },
  {
    _id: 'exp-23',
    name: 'High-Waist Vintage Mitumba Mom Jeans (Grade A)',
    price: 380,
    oldPrice: 600,
    discountPct: 37,
    images: [],
    emoji: '👖',
    category: 'Fashion & Mitumba',
    soldCount: 89,
  },
  {
    _id: 'exp-24',
    name: 'Emergency Chemist Pack (Panadol, Strepsils, Fludrex)',
    price: 180,
    oldPrice: 250,
    discountPct: 28,
    images: [],
    emoji: '💊',
    category: 'Chemist & Wellness',
    isLive: true,
    soldCount: 167,
  },
  {
    _id: 'exp-25',
    name: 'Predator Turf Football Boots (Moulded Studs)',
    price: 1650,
    oldPrice: 2400,
    discountPct: 31,
    images: [],
    emoji: '⚽',
    category: 'Fitness & Sports',
    soldCount: 38,
  },
  {
    _id: 'exp-26',
    name: 'Fresh Fri Pure Vegetable Cooking Oil 5L',
    price: 1180,
    oldPrice: 1350,
    discountPct: 13,
    images: [],
    emoji: '🪔',
    category: 'Mini-Mart',
    soldCount: 93,
  },
  {
    _id: 'exp-27',
    name: 'Portable Bluetooth RGB Bass Speaker (Waterproof)',
    price: 950,
    oldPrice: 1500,
    discountPct: 37,
    images: [],
    emoji: '🔊',
    category: 'Tech & Gadgets',
    soldCount: 84,
  },
  {
    _id: 'exp-28',
    name: '24-Piece Student Cutlery, Plate & Basin Starter Kit',
    price: 450,
    oldPrice: 650,
    discountPct: 31,
    images: [],
    emoji: '🥣',
    category: 'Hostel Setup',
    soldCount: 130,
  },
  {
    _id: 'exp-29',
    name: 'Spotify Premium 3-Month Student Subscription',
    price: 300,
    oldPrice: 600,
    discountPct: 50,
    images: [],
    emoji: '🎵',
    category: 'Gaming & Accounts',
    soldCount: 220,
  },
  {
    _id: 'exp-30',
    name: 'Mt. Elgon Student Hiking & Bonfire Trip Pass',
    price: 850,
    oldPrice: 1200,
    discountPct: 29,
    images: [],
    emoji: '🏕️',
    category: 'Events & Tickets',
    soldCount: 68,
  },
  {
    _id: 'exp-31',
    name: 'Anti-Scald Ceramic Hair Straightener Comb',
    price: 700,
    oldPrice: 1100,
    discountPct: 36,
    images: [],
    emoji: '🎀',
    category: 'Kinyozi & Salon',
    soldCount: 42,
  },
  {
    _id: 'exp-32',
    name: '5-Piece Heavy Duty Resistance Bands Set + Pouch',
    price: 500,
    oldPrice: 800,
    discountPct: 38,
    images: [],
    emoji: '🏋️',
    category: 'Fitness & Sports',
    soldCount: 57,
  },
];

export default function ProductFeed() {
  const PAGE_CHUNK = 10;
  const [visibleCount, setVisibleCount] = useState(15);
  const [loadingMore, setLoadingMore] = useState(false);
  const [liveProducts, setLiveProducts] = useState([]);
  const loaderRef = useRef(null);

  // Attempt to fetch any live backend products and prepend/blend them
  useEffect(() => {
    fetch('/api/products?page=1&limit=20')
      .then((res) => res.json())
      .then((json) => {
        const items = Array.isArray(json) ? json : json?.data ?? [];
        if (items.length > 0) {
          setLiveProducts(items);
        }
      })
      .catch(() => {/* retain mock gracefully */});
  }, []);

  // Combined product pool: live backend items first, followed by mock explore catalog
  const allAvailable = [...liveProducts, ...MOCK_EXPLORE_PRODUCTS];
  const displayedProducts = allAvailable.slice(0, visibleCount);
  const hasMore = visibleCount < allAvailable.length;

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + PAGE_CHUNK, allAvailable.length));
      setLoadingMore(false);
    }, 400);
  }, [loadingMore, hasMore, allAvailable.length]);

  // Infinite scroll trigger via IntersectionObserver
  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          handleLoadMore();
        }
      },
      { rootMargin: '250px' }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) observer.observe(currentLoader);

    return () => {
      if (currentLoader) observer.unobserve(currentLoader);
    };
  }, [handleLoadMore, hasMore, loadingMore]);

  return (
    <section className="w-full">
      {/* ── Responsive Grid (grid-cols-2 md:grid-cols-3 lg:grid-cols-5) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {displayedProducts.map((product) => (
          <ProductCard
            key={product._id}
            product={product}
            isGrid={true}
          />
        ))}
      </div>

      {/* ── Load More / Infinite Trigger Zone ── */}
      <div className="mt-8 mb-4 flex flex-col items-center justify-center gap-3">
        {hasMore ? (
          <>
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="group flex items-center gap-2.5 px-6 py-3 rounded-xl bg-white hover:bg-orange-50/70 border border-gray-200 hover:border-[#FF5E00]/40 text-gray-800 hover:text-[#FF5E00] font-bold text-sm shadow-sm hover:shadow transition-all duration-200 active:scale-95 disabled:opacity-60"
            >
              {loadingMore ? (
                <>
                  <Loader2 size={16} className="animate-spin text-[#FF5E00]" />
                  <span>Loading More Deals...</span>
                </>
              ) : (
                <>
                  <ArrowDown size={16} className="text-[#FF5E00] group-hover:translate-y-0.5 transition-transform" />
                  <span>Load More Products</span>
                  <span className="text-xs bg-orange-100 text-[#FF5E00] px-2 py-0.5 rounded-full font-bold ml-1">
                    +{allAvailable.length - visibleCount} left
                  </span>
                </>
              )}
            </button>
            {/* Observer anchor target */}
            <div ref={loaderRef} className="h-6 w-full" />
          </>
        ) : (
          <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold py-4 bg-white/70 px-5 rounded-full border border-gray-200/60 shadow-xs">
            <CheckCircle2 size={14} className="text-[#027A2B]" />
            <span>You've seen all {allAvailable.length} top campus deals right now!</span>
          </div>
        )}
      </div>
    </section>
  );
}
