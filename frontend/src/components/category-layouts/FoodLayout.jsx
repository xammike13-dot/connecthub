// FoodLayout.jsx – vendor-centric dining & groceries layout for campus comrades
import { useState, useMemo } from 'react';
import { 
  UtensilsCrossed, 
  Clock, 
  MapPin, 
  Star, 
  Sparkles, 
  Flame, 
  ShoppingBag, 
  Phone,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Search
} from 'lucide-react';
import ProductDetailModal from '../modals/ProductDetailModal';

export default function FoodLayout({ category }) {
  const [selectedTag, setSelectedTag] = useState('all');
  const [selectedProductForModal, setSelectedProductForModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Curated campus food / grocery vendors
  const vendors = useMemo(() => [
    {
      _id: 'v-1',
      name: category.slug === 'kibanda' ? 'Mama Oliech Local Kitchen' : category.slug === 'wines' ? 'Chillout Wines & Spirits' : 'Stage Central Fast Bites',
      avatar: '🍲',
      badge: 'Bestseller',
      isOpen: true,
      rating: 4.9,
      reviewCount: 142,
      deliveryTime: '15-20 min',
      deliveryFee: 0,
      location: 'Stage, Opposite Gate B',
      phone: '0712345678',
      popularDishes: [
        { name: category.slug === 'kibanda' ? 'Ugali Beef & Sukuma' : category.slug === 'wines' ? 'Chilled Cider 6-Pack' : 'Fried Chicken & Chips', price: 180, originalPrice: 220, emoji: '🍗' },
        { name: category.slug === 'kibanda' ? 'Chapo Ndengu Special' : category.slug === 'wines' ? 'Premium Gin 750ml' : 'Loaded Beef Burger', price: 120, emoji: '🍔' },
        { name: category.slug === 'kibanda' ? 'Special Githeri Fry' : category.slug === 'wines' ? 'Lager Can 500ml' : 'Crispy Seasoned Fries', price: 100, emoji: '🍟' },
      ],
      addOns: [
        { name: 'Extra Avocado', price: 30 },
        { name: 'Extra Fried Egg', price: 30 },
        { name: 'Extra Smokie', price: 40 },
        { name: 'Kachumbari', price: 20 },
      ],
    },
    {
      _id: 'v-2',
      name: category.slug === 'kibanda' ? 'Chebarus Express Kibanda' : category.slug === 'cakes' ? 'Sweet Delights Bakery' : 'Hot Spot Shawarma & Grill',
      avatar: '🥘',
      badge: 'Popular',
      isOpen: true,
      rating: 4.8,
      reviewCount: 98,
      deliveryTime: '20-25 min',
      deliveryFee: 30,
      location: 'Chebarus Junction',
      phone: '0723456789',
      popularDishes: [
        { name: category.slug === 'cakes' ? 'Red Velvet Bento Cake' : 'Spicy Chicken Shawarma', price: 250, originalPrice: 300, emoji: '🌯' },
        { name: category.slug === 'cakes' ? 'Chocolate Cupcakes (Box of 4)' : 'Smokie Pasua with Kachumbari', price: 100, emoji: '🌭' },
        { name: category.slug === 'cakes' ? 'Black Forest Slice' : 'Fresh Passion Juice 500ml', price: 80, emoji: '🥤' },
      ],
      addOns: [
        { name: 'Chilli Sauce', price: 10 },
        { name: 'Cheese Slice', price: 50 },
        { name: 'Extra Meat Scoop', price: 80 },
      ],
    },
    {
      _id: 'v-3',
      name: category.slug === 'soko' ? 'Kesses Organic Greens & Eggs' : 'Campus Corner Kitchen',
      avatar: '🥬',
      badge: 'Fresh Farm',
      isOpen: true,
      rating: 4.7,
      reviewCount: 76,
      deliveryTime: '10-15 min',
      deliveryFee: 0,
      location: 'Mabs Market Stalls',
      phone: '0734567890',
      popularDishes: [
        { name: category.slug === 'soko' ? 'Crate of Kienyeji Eggs (30 pcs)' : 'Full Plate Pilau Beef', price: 450, emoji: '🥚' },
        { name: category.slug === 'soko' ? 'Fresh Greens & Sukuma Bunch' : 'Chapo Beans Bowl', price: 50, emoji: '🥗' },
        { name: category.slug === 'soko' ? 'Ripe Bananas (Bunch)' : 'Spiced Milk Tea (Chai)', price: 70, emoji: '🍌' },
      ],
      addOns: [
        { name: 'Fast Delivery Courier', price: 30 },
      ],
    },
  ], [category.slug]);

  const tags = ['all', '⚡ Under 20 Mins', '🔥 Free Delivery', '⭐ Top Rated', 'Hot Combos'];

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = v.name.toLowerCase().includes(q);
        const matchDish = v.popularDishes.some(d => d.name.toLowerCase().includes(q));
        if (!matchName && !matchDish) return false;
      }
      if (selectedTag === '⚡ Under 20 Mins' && !v.deliveryTime.includes('10') && !v.deliveryTime.includes('15')) return false;
      if (selectedTag === '🔥 Free Delivery' && v.deliveryFee !== 0) return false;
      if (selectedTag === '⭐ Top Rated' && v.rating < 4.8) return false;
      return true;
    });
  }, [vendors, searchQuery, selectedTag]);

  const handleDishClick = (vendor, dish) => {
    setSelectedProductForModal({
      _id: `dish-${vendor._id}-${dish.name.replace(/\s+/g, '-').toLowerCase()}`,
      name: dish.name,
      price: dish.price,
      originalPrice: dish.originalPrice,
      category: category.label,
      description: `Freshly prepared by ${vendor.name} at ${vendor.location}. Hot and ready for immediate campus delivery.`,
      stock: 20,
      isActive: true,
      deliveryFee: vendor.deliveryFee,
      variations: [],
      addOns: vendor.addOns || [],
      images: [],
    });
  };

  return (
    <div className="min-h-screen bg-orange-50/30 pb-20">
      {/* ── Food Hero Banner ────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-[#FF5E00] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 text-white text-xs font-bold mb-3 border border-white/20">
                <Clock size={13} className="text-[#6BE319]" />
                ⚡ Average campus meal delivery: 15–25 mins
              </div>
              <h1 className="text-3xl md:text-4xl font-black">
                {category.label}
              </h1>
              <p className="text-white/90 text-sm md:text-base mt-1.5 max-w-xl">
                Browse open local kibandas, campus food joints & verified suppliers. Order hot meals straight to your hostel door.
              </p>
            </div>

            {/* In-category search */}
            <div className="w-full md:w-80 relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search food, dishes or joints..."
                className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl text-sm text-gray-900 placeholder-gray-400 shadow-md focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-hide mt-6 pt-4 border-t border-white/20">
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTag(t)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer
                  ${selectedTag === t
                    ? 'bg-white text-[#FF5E00] shadow-sm font-black'
                    : 'bg-white/15 text-white hover:bg-white/25 border border-white/20'
                  }`}
              >
                {t === 'all' ? 'All Vendors' : t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 1. Horizontal "Open Now" Vendor Carousel ─────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-base font-black text-gray-900">Open Now Near You</h2>
          </div>
          <span className="text-xs text-gray-500 font-medium">Fast hostel dispatch</span>
        </div>

        <div className="flex gap-4 overflow-x-auto no-scrollbar scrollbar-hide pb-2">
          {vendors.map((vendor) => (
            <div
              key={vendor._id}
              className="flex-shrink-0 w-64 bg-white rounded-2xl p-4 border border-orange-100 shadow-xs hover:shadow-md transition-all flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                {vendor.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900 truncate group-hover:text-[#FF5E00] transition-colors">
                  {vendor.name}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                  <Star size={12} className="text-amber-500 fill-amber-500" />
                  <span className="font-bold text-gray-700">{vendor.rating}</span>
                  <span>·</span>
                  <span>{vendor.deliveryTime}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. Grid of Vendor Cards (Full Menu & Direct Order) ───── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <h2 className="text-lg font-black text-gray-900 mb-4">
          Featured {category.shortLabel || 'Food'} Vendors
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVendors.map((vendor) => (
            <div
              key={vendor._id}
              className="bg-white rounded-3xl overflow-hidden border border-gray-200/90 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
            >
              <div className="p-5 md:p-6">
                {/* Vendor Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-3xl shadow-2xs">
                      {vendor.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                          Open Now
                        </span>
                        {vendor.badge && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF5E00]/10 text-[#FF5E00]">
                            {vendor.badge}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 leading-tight mt-1">
                        {vendor.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1 font-bold text-gray-700">
                          <Star size={12} className="fill-amber-400 text-amber-400" />
                          {vendor.rating} ({vendor.reviewCount})
                        </span>
                        <span>·</span>
                        <span>{vendor.location}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Popular Dishes / Offerings List */}
                <div className="space-y-2 mt-4 pt-3 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Popular Items</p>
                  {vendor.popularDishes.map((dish, i) => (
                    <div
                      key={i}
                      onClick={() => handleDishClick(vendor, dish)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-orange-50/70 border border-transparent hover:border-orange-200 transition-all cursor-pointer group/dish"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg">{dish.emoji}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate group-hover/dish:text-[#FF5E00]">
                            {dish.name}
                          </p>
                          {dish.originalPrice && (
                            <span className="text-[10px] text-gray-400 line-through">
                              KSh {dish.originalPrice}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-black text-[#FF5E00]">
                          KSh {dish.price}
                        </span>
                        <span className="w-6 h-6 rounded-full bg-[#FF5E00] text-white flex items-center justify-center text-xs font-bold shadow-2xs group-hover/dish:scale-110 transition-transform">
                          +
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium">
                  {vendor.deliveryFee === 0 ? (
                    <strong className="text-green-600">Free delivery</strong>
                  ) : (
                    `Delivery: KSh ${vendor.deliveryFee}`
                  )}
                </span>
                <span className="text-[#FF5E00] font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  View full menu <ChevronRight size={14} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Dish Customization Modal */}
      <ProductDetailModal
        product={selectedProductForModal}
        isOpen={Boolean(selectedProductForModal)}
        onClose={() => setSelectedProductForModal(null)}
      />
    </div>
  );
}
