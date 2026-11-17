// RetailLayout.jsx — Marketplace Grid archetype for Mitumba, Fashion, Tech, Home, Mali-Mali, Shoes, Mini-Mart
import { useState, useMemo } from 'react';
import { 
  ArrowUpDown, 
  Search, 
  SlidersHorizontal, 
  Check, 
  Sparkles,
  ShoppingBag,
  RotateCcw,
  PackageX
} from 'lucide-react';
import ProductCard from '../ProductCard';
import ProductCardSkeleton from '../skeletons/ProductCardSkeleton';
import { useProductsByCategory } from '../../hooks/useProducts';

export default function RetailLayout({ category, slug }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [sortBy, setSortBy] = useState('-createdAt');
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // ── 1. Fetch Live Products via TanStack React Query ─────────────────────────
  const { data: rawProducts = [], isLoading, isError, refetch } = useProductsByCategory(
    slug || category?.slug,
    { sort: sortBy, limit: 40 }
  );

  // ── 2. Client-Side Filtering (Subcategory, Search, Condition) ───────────────
  const filteredProducts = useMemo(() => {
    return rawProducts.filter((product) => {
      // Text Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = product.name?.toLowerCase().includes(query);
        const matchesDesc = product.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }

      // Subcategory Filter
      if (selectedSubcategory !== 'all' && product.subcategory) {
        if (product.subcategory.toLowerCase() !== selectedSubcategory.toLowerCase()) {
          return false;
        }
      }

      // Condition Filter
      if (selectedCondition !== 'all' && product.condition) {
        if (product.condition.toLowerCase() !== selectedCondition.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [rawProducts, searchQuery, selectedSubcategory, selectedCondition]);

  const subcategories = category?.subcategories || [];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* ── Category Hero Banner ─────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2"
                style={{
                  backgroundColor: `${category.accentColor}15`,
                  color: category.accentColor,
                }}
              >
                <span>{category.emoji}</span>
                <span>{category.archetype?.toUpperCase()} ECONOMY</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {category.label}
              </h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-1 max-w-xl">
                {category.tagline || 'Direct campus marketplace with student-vetted quality and instant hostel delivery.'}
              </p>
            </div>

            {/* Quick Search in Category */}
            <div className="w-full md:w-72 relative">
              <input
                type="text"
                placeholder={`Search ${category.shortLabel}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5E00] focus:border-transparent transition-all"
              />
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {/* Subcategory Pills Row */}
          {subcategories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-hide pt-4 mt-2 border-t border-gray-100">
              <button
                onClick={() => setSelectedSubcategory('all')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  selectedSubcategory === 'all'
                    ? 'bg-[#FF5E00] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All {category.shortLabel}
              </button>
              {subcategories.map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubcategory(sub)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                    selectedSubcategory === sub
                      ? 'bg-[#FF5E00] text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Sticky Control Toolbar ────────────────────────────────────────── */}
      <section className="sticky top-[56px] sm:top-[64px] z-20 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          
          {/* Results count */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-700">
              {isLoading ? 'Scanning catalog...' : `${filteredProducts.length} Products`}
            </span>
            {selectedSubcategory !== 'all' && (
              <span className="text-[10px] bg-orange-100 text-[#FF5E00] font-bold px-2 py-0.5 rounded-md">
                {selectedSubcategory}
              </span>
            )}
          </div>

          {/* Controls: Sort and Filter */}
          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <div className="relative inline-flex items-center">
              <ArrowUpDown size={14} className="absolute left-2.5 text-gray-400 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="pl-8 pr-7 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#FF5E00] cursor-pointer"
              >
                <option value="-createdAt">Newest First</option>
                <option value="price">Price: Low to High</option>
                <option value="-price">Price: High to Low</option>
                <option value="-rating">Top Rated</option>
                <option value="discount">Steepest Discounts</option>
              </select>
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFiltersModal(!showFiltersModal)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                selectedCondition !== 'all'
                  ? 'border-[#FF5E00] bg-orange-50 text-[#FF5E00]'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <SlidersHorizontal size={13} />
              <span className="hidden sm:inline">Filters</span>
            </button>
          </div>
        </div>

        {/* Collapsible Mobile/Quick Filters Tray */}
        {showFiltersModal && (
          <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-600">Condition:</span>
                {['all', 'New', 'Second-hand'].map((cond) => (
                  <button
                    key={cond}
                    onClick={() => setSelectedCondition(cond)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                      selectedCondition === cond
                        ? 'bg-[#FF5E00] text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {cond === 'all' ? 'All' : cond}
                  </button>
                ))}
              </div>
            </div>

            {(selectedCondition !== 'all' || selectedSubcategory !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCondition('all');
                  setSelectedSubcategory('all');
                  setSearchQuery('');
                }}
                className="text-xs text-red-500 font-bold hover:underline flex items-center gap-1"
              >
                <RotateCcw size={12} /> Reset Filters
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── Main Catalog Grid ─────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        
        {/* Loading State: 10 Pulse Skeletons in Grid */}
        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <ProductCardSkeleton key={i} isGrid={true} />
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <div className="py-16 text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3">
              <PackageX size={28} />
            </div>
            <h3 className="text-base font-bold text-gray-900">Failed to load products</h3>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              Unable to sync with the campus catalog. Please try again.
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-[#FF5E00] text-white text-xs font-bold rounded-xl shadow-xs"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && filteredProducts.length === 0 && (
          <div className="py-16 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 text-[#FF5E00] flex items-center justify-center mx-auto mb-3">
              <ShoppingBag size={32} />
            </div>
            <h3 className="text-lg font-black text-gray-900">No Products Found</h3>
            <p className="text-xs text-gray-500 mt-1 mb-5 leading-relaxed">
              {searchQuery || selectedSubcategory !== 'all' || selectedCondition !== 'all'
                ? 'No items matched your current filter criteria. Try loosening your filters.'
                : `No listings are currently active under ${category.label}. Vendors are actively dropping new inventory.`}
            </p>
            {(searchQuery || selectedSubcategory !== 'all' || selectedCondition !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSubcategory('all');
                  setSelectedCondition('all');
                }}
                className="px-5 py-2.5 bg-gray-900 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-black transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {/* Success Grid: Live Products */}
        {!isLoading && !isError && filteredProducts.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                isGrid={true}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
