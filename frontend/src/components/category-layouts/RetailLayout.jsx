// RetailLayout.jsx – e-commerce layout for retail categories (Mitumba, Fashion, Tech, Home, Mini-Mart, Shoes, Mali-Mali, Thrift)
import { useState, useEffect, useMemo } from 'react';
import { 
  Filter, 
  ArrowUpDown, 
  Search, 
  X, 
  SlidersHorizontal, 
  Check, 
  Tag, 
  Package, 
  Sparkles,
  ChevronDown
} from 'lucide-react';
import ProductCard from '../cards/ProductCard';
import ProductDetailModal from '../modals/ProductDetailModal';
import { productAPI } from '../../services/api';

export default function RetailLayout({ category }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('popular');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Fetch products for this category
  useEffect(() => {
    let isMounted = true;
    const fetchCategoryProducts = async () => {
      setLoading(true);
      try {
        const { data } = await productAPI.getAll({
          category: category.label,
          limit: 30,
        });
        if (isMounted && data?.data) {
          setProducts(data.data);
        }
      } catch (err) {
        console.warn('[RetailLayout] Failed to fetch live products, using mock fallback:', err.message);
        // Generates realistic mock items tailored to this retail category
        if (isMounted) {
          const mockRetailItems = (category.subcategories || []).flatMap((sub, subIdx) => [
            {
              _id: `retail-${category.slug}-${subIdx}-1`,
              name: `${sub} - Premium Drop`,
              price: 350 + (subIdx * 150),
              originalPrice: 500 + (subIdx * 200),
              category: category.label,
              subcategory: sub,
              condition: 'New',
              stock: 8,
              isActive: true,
              rating: 4.8,
              numReviews: 19 + subIdx,
              deliveryFee: 0,
              description: `Authentic ${sub} sourced for campus comrades. Verified quality, instant delivery around campus.`,
              variations: category.slug === 'shoes' 
                ? [{ name: 'Size', options: ['40', '41', '42', '43', '44'] }]
                : category.slug === 'fashion' || category.slug === 'mitumba'
                  ? [{ name: 'Size', options: ['S', 'M', 'L', 'XL'] }, { name: 'Color', options: ['Black', 'Blue', 'Beige'] }]
                  : category.slug === 'tech'
                    ? [{ name: 'Storage / Spec', options: ['64GB', '128GB', '256GB'] }]
                    : [],
              images: [],
            },
            {
              _id: `retail-${category.slug}-${subIdx}-2`,
              name: `Campus Grade ${sub}`,
              price: 200 + (subIdx * 90),
              category: category.label,
              subcategory: sub,
              condition: 'Second-hand',
              stock: 3,
              isActive: true,
              rating: 4.6,
              numReviews: 11,
              deliveryFee: 50,
              description: `Clean pre-loved ${sub}. Tested & inspected by comrade vendors.`,
              variations: [],
              images: [],
            }
          ]);
          setProducts(mockRetailItems);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCategoryProducts();
    return () => { isMounted = false; };
  }, [category.label, category.slug, category.subcategories]);

  // Price ranges
  const priceRanges = [
    { id: 'all', label: 'All Prices' },
    { id: 'under-500', label: 'Under KSh 500', min: 0, max: 500 },
    { id: '500-1500', label: 'KSh 500 - 1,500', min: 500, max: 1500 },
    { id: '1500-5000', label: 'KSh 1,500 - 5,000', min: 1500, max: 5000 },
    { id: '5000-plus', label: 'KSh 5,000+', min: 5000, max: Infinity },
  ];

  // Filtering & Sorting
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.name?.toLowerCase().includes(q);
          const matchSub = p.subcategory?.toLowerCase().includes(q);
          if (!matchName && !matchSub) return false;
        }

        // Subcategory filter
        if (selectedSubcategory !== 'all' && p.subcategory !== selectedSubcategory) {
          return false;
        }

        // Condition filter
        if (selectedCondition !== 'all') {
          if (p.condition?.toLowerCase() !== selectedCondition.toLowerCase()) return false;
        }

        // Price range filter
        if (selectedPriceRange !== 'all') {
          const range = priceRanges.find((r) => r.id === selectedPriceRange);
          if (range && (p.price < range.min || p.price > range.max)) return false;
        }

        // In-stock only
        if (inStockOnly && (p.stock <= 0 || p.isActive === false)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        if (sortBy === 'discount') {
          const discA = a.originalPrice ? (a.originalPrice - a.price) / a.originalPrice : 0;
          const discB = b.originalPrice ? (b.originalPrice - b.price) / b.originalPrice : 0;
          return discB - discA;
        }
        return 0; // Default popularity / natural
      });
  }, [products, searchQuery, selectedSubcategory, selectedCondition, selectedPriceRange, inStockOnly, sortBy]);

  const activeFilterCount = 
    (selectedSubcategory !== 'all' ? 1 : 0) +
    (selectedCondition !== 'all' ? 1 : 0) +
    (selectedPriceRange !== 'all' ? 1 : 0) +
    (inStockOnly ? 1 : 0);

  const clearAllFilters = () => {
    setSelectedSubcategory('all');
    setSelectedCondition('all');
    setSelectedPriceRange('all');
    setInStockOnly(false);
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* ── Category Hero Banner ─────────────────────────────────── */}
      <div 
        className="relative overflow-hidden border-b border-gray-200"
        style={{
          background: `linear-gradient(135deg, ${category.accentColor}12 0%, #FFFFFF 100%)`
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              <div 
                className="w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-white"
                style={{ backgroundColor: `${category.accentColor}20` }}
              >
                {category.emoji || '🛍️'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-gray-700 shadow-2xs border border-gray-200">
                    Retail Market
                  </span>
                  {category.badge && (
                    <span 
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white shadow-2xs"
                      style={{ backgroundColor: category.accentColor }}
                    >
                      {category.badge}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-gray-900 mt-1">
                  {category.label}
                </h1>
                <p className="text-xs md:text-sm text-gray-600 mt-0.5 max-w-xl">
                  {category.description || category.tagline}
                </p>
              </div>
            </div>

            {/* Quick in-category search */}
            <div className="w-full md:w-72 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search in ${category.shortLabel || category.label}...`}
                className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5E00] shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Quick Subcategory Pills Row */}
          {category.subcategories?.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-hide pt-4 pb-1">
              <button
                type="button"
                onClick={() => setSelectedSubcategory('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer
                  ${selectedSubcategory === 'all'
                    ? 'bg-[#FF5E00] text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-[#FF5E00]/60'
                  }`}
              >
                All {category.shortLabel || 'Items'}
              </button>
              {category.subcategories.map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSelectedSubcategory(sub)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer
                    ${selectedSubcategory === sub
                      ? 'bg-[#FF5E00] text-white shadow-sm font-bold'
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-[#FF5E00]/60'
                    }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Layout: Desktop Sidebar + Product Grid ─────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMobileFilters(true)}
              className="md:hidden flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 shadow-xs active:scale-95"
            >
              <SlidersHorizontal size={14} />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#FF5E00] text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <p className="text-xs md:text-sm text-gray-500 font-medium">
              Showing <strong className="text-gray-900">{filteredProducts.length}</strong> items
            </p>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs text-gray-500 font-medium">Sort by:</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-xl pl-3 pr-8 py-2 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#FF5E00] shadow-xs cursor-pointer"
              >
                <option value="popular">Most Popular</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
                <option value="discount">Biggest Discount</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* ── Desktop Sidebar Filters ────────────────────────────── */}
          <aside className="hidden md:block col-span-1 space-y-6">
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-5 sticky top-20">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Filter size={15} className="text-[#FF5E00]" />
                  Filters
                </span>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-xs text-[#FF5E00] font-semibold hover:underline"
                  >
                    Reset all
                  </button>
                )}
              </div>

              {/* Condition */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-2 uppercase tracking-wider">
                  Condition
                </label>
                <div className="space-y-1.5">
                  {['all', 'New', 'Second-hand'].map((cond) => (
                    <label key={cond} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-gray-900">
                      <input
                        type="radio"
                        name="condition"
                        checked={selectedCondition === cond}
                        onChange={() => setSelectedCondition(cond)}
                        className="text-[#FF5E00] focus:ring-[#FF5E00]"
                      />
                      <span>{cond === 'all' ? 'All Conditions' : cond}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-2 uppercase tracking-wider">
                  Price Range
                </label>
                <div className="space-y-1.5">
                  {priceRanges.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-gray-900">
                      <input
                        type="radio"
                        name="priceRange"
                        checked={selectedPriceRange === r.id}
                        onChange={() => setSelectedPriceRange(r.id)}
                        className="text-[#FF5E00] focus:ring-[#FF5E00]"
                      />
                      <span>{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* In-Stock Only */}
              <div className="pt-3 border-t border-gray-100">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="rounded text-[#FF5E00] focus:ring-[#FF5E00]"
                  />
                  <span>In-Stock Items Only</span>
                </label>
              </div>
            </div>
          </aside>

          {/* ── Product Grid ───────────────────────────────────────── */}
          <main className="col-span-1 md:col-span-3">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 md:gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl h-64 animate-pulse border border-gray-100" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
                <Package size={48} className="mx-auto text-gray-300 mb-3" />
                <h3 className="text-base font-bold text-gray-800">No items found</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  No items in {category.label} match your current filter selection.
                </p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="mt-4 px-4 py-2 bg-[#FF5E00] text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 md:gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    isGrid
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ── Mobile Filters Drawer ─────────────────────────────────── */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setShowMobileFilters(false)} />
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 space-y-5 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-base">Filter Products</h3>
              <button onClick={() => setShowMobileFilters(false)} className="p-1 rounded-full text-gray-500 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            {/* Condition */}
            <div>
              <p className="text-xs font-bold text-gray-700 mb-2">Condition</p>
              <div className="flex gap-2">
                {['all', 'New', 'Second-hand'].map((cond) => (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => setSelectedCondition(cond)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                      selectedCondition === cond ? 'border-[#FF5E00] bg-orange-50 text-[#FF5E00]' : 'border-gray-200'
                    }`}
                  >
                    {cond === 'all' ? 'All' : cond}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <p className="text-xs font-bold text-gray-700 mb-2">Price</p>
              <div className="flex flex-wrap gap-2">
                {priceRanges.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedPriceRange(r.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                      selectedPriceRange === r.id ? 'border-[#FF5E00] bg-orange-50 text-[#FF5E00]' : 'border-gray-200'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowMobileFilters(false)}
                className="w-full py-3 bg-[#FF5E00] text-white rounded-xl font-bold text-sm shadow-md"
              >
                Apply Filters ({filteredProducts.length} results)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
