import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Grid,
  List,
  X,
  Sparkles,
} from 'lucide-react';
import ProductCard from '../components/cards/ProductCard';
import { SkeletonCard } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { productAPI } from '../services/api';

// Updated categories based on requirements
const categories = [
  { id: 'all', name: 'All Products' },
  { id: 'Food', name: 'Food' },
  { id: 'Household', name: 'Household' },
  { id: 'Electronics', name: 'Electronics' },
  { id: 'Fashion', name: 'Fashion' },
  { id: 'Gas', name: 'Gas' },
  { id: 'Wines & Spirits', name: 'Wines & Spirits' },
  { id: 'Second Hand', name: 'Second Hand' },
  { id: 'Test', name: 'Test' },
];

// Subcategories for each main category
const subcategories = {
  'Food': ['Snacks', 'Beverages', 'Fries', 'Rice', 'Unga', 'Cooking Oil', 'Salt', 'Sugar', 'Flour', 'Soap', 'Other Essentials'],
  'Household': ['New', 'Second Hand', 'Kitchenware', 'Cleaning', 'Furniture'],
  'Electronics': ['Phones', 'Accessories', 'Home Appliances', 'Computers'],
  'Fashion': ['Men', 'Women', 'Kids', 'Shoes', 'Bags'],
};

const sortOptions = [
  { value: '-createdAt', label: 'Newest' },
  { value: 'price', label: 'Price: Low to High' },
  { value: '-price', label: 'Price: High to Low' },
  { value: '-rating', label: 'Highest Rated' },
];

const mapCategoryName = (cat) => {
  if (!cat) return 'Other';
  const lower = cat.toLowerCase();
  if (lower === 'food' || lower === 'food stuffs' || lower === 'food-stuffs') return 'Food';
  if (lower === 'household' || lower === 'households' || lower === 'house-shopping' || lower === 'house shopping') return 'Household';
  if (lower === 'electronics' || lower === 'electronic') return 'Electronics';
  if (lower === 'fashion') return 'Fashion';
  if (lower === 'gas') return 'Gas';
  if (lower === 'wines & spirits' || lower === 'wines-spirits' || lower === 'wines and spirits') return 'Wines & Spirits';
  if (lower === 'second hand' || lower === 'second-hand') return 'Second Hand';
  if (lower === 'test') return 'Test';

  // Title case fallback if it does not match exactly
  return cat.charAt(0).toUpperCase() + cat.slice(1);
};

const ShopPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { user } = useAuth();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [sortBy, setSortBy] = useState('-createdAt');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000000 });
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [viewedProducts, setViewedProducts] = useState(new Set());

  // Check for category from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const category = params.get('category');
    if (category) {
      setSelectedCategory(category);
    }
  }, [location.search]);

  // Load viewed products from localStorage on mount
  useEffect(() => {
    const viewed = new Set();
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('viewed_product_')) {
        const productId = key.replace('viewed_product_', '');
        if (localStorage.getItem(key) === 'true') {
          viewed.add(productId);
        }
      }
    });
    setViewedProducts(viewed);
  }, []);

  // Clear subcategory when category changes
  useEffect(() => {
    setSelectedSubcategory('');
  }, [selectedCategory]);

  // Fetch products
  const fetchProducts = async (pageNumber = 1, append = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pageNumber,
        limit: 24, // increased limit to fetch more products for grouping
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        subcategory: selectedSubcategory || undefined,
        search: searchQuery || undefined,
        sort: sortBy,
        minPrice: priceRange.min > 0 ? priceRange.min : undefined,
        maxPrice: priceRange.max < 1000000 ? priceRange.max : undefined,
        excludeHealthcare: true, // Exclude healthcare products from marketplace
      };

      const response = await productAPI.getAll(params);

      // Backend returns: { success: true, data: [...], pagination: {...} }
      const productsData = response.data?.data || [];
      const pagination = response.data?.pagination || {};

      if (append) {
        setProducts((prev) => [...prev, ...productsData]);
      } else {
        setProducts(productsData);
      }

      setTotalProducts(pagination.total || productsData.length);
      setHasMore(pageNumber < (pagination.pages || 1));
      setPage(pageNumber);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError('Failed to load products. Please try again.');
      if (!append) {
        setProducts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(1, false);
  }, [selectedCategory, selectedSubcategory, sortBy, searchQuery, priceRange]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProducts(1, false);
  };

  const handleAddToCart = (product) => {
    addToCart(product);
  };

  const handleFavorite = async (productId) => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    const wasFavorite = isInWishlist(productId);
    await toggleWishlist(productId);

    // Update local product state to reflect count change
    setProducts(prevProducts =>
      prevProducts.map(product => {
        if (product._id === productId) {
          const newCount = wasFavorite
            ? Math.max(0, (product.favoritesCount || 0) - 1)
            : (product.favoritesCount || 0) + 1;
          return { ...product, favoritesCount: newCount };
        }
        return product;
      })
    );
  };

  const handleViewProduct = async (productId) => {
    const alreadyViewed = viewedProducts.has(productId);

    if (!alreadyViewed) {
      try {
        if (user) {
          await productAPI.trackView(productId);
        }
        localStorage.setItem(`viewed_product_${productId}`, 'true');

        // Update local viewed products state immediately
        setViewedProducts(prev => new Set([...prev, productId]));

        // Update local product state to reflect view count change
        setProducts(prevProducts =>
          prevProducts.map(product => {
            if (product._id === productId) {
              const newCount = (product.views || 0) + 1;
              return { ...product, views: newCount };
            }
            return product;
          })
        );
      } catch (error) {
        console.error('Failed to track view:', error);
      }
    }
    navigate(`/marketplace/${productId}`);
  };

  const handleLoadMore = () => {
    fetchProducts(page + 1, true);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedSubcategory('');
    setPriceRange({ min: 0, max: 1000000 });
  };

  // Group products by category when selectedCategory is "all"
  const groupProducts = (items) => {
    const grouped = {};
    items.forEach(product => {
      const cat = mapCategoryName(product.category);
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(product);
    });
    return grouped;
  };

  const groupedProducts = groupProducts(products);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header / Filter Panel */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative">
            <Input
              type="text"
              placeholder="Search local products, brands, essentials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search size={18} className="text-neutral-400" />}
              rightIcon={
                searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    <X size={18} />
                  </button>
                )
              }
              fullWidth
            />
          </form>

          {/* Quick Filters / Toolbar */}
          <div className="flex items-center justify-between mt-4 gap-2 overflow-visible">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-1">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  showFilters
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100 hover:border-neutral-300'
                }`}
              >
                <Filter size={14} />
                <span>Filters</span>
              </button>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-all cursor-pointer outline-none focus:border-blue-500"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              {selectedCategory !== 'all' && subcategories[selectedCategory] && (
                <select
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                  className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-all cursor-pointer outline-none focus:border-blue-500"
                >
                  <option value="">All {selectedCategory}</option>
                  {subcategories[selectedCategory].map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-all cursor-pointer outline-none focus:border-blue-500"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-neutral-500 font-bold hidden sm:inline-block">
                {totalProducts} Products
              </span>
              <div className="flex items-center gap-1 bg-neutral-100 border border-neutral-200 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                  title="Grid View"
                >
                  <Grid size={14} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded transition-all ${
                    viewMode === 'list'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                  title="List View"
                >
                  <List size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Expanded Filters Box */}
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-neutral-200 bg-neutral-50"
          >
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase tracking-wider">
                    Price Range (KSh)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={priceRange.min || ''}
                      onChange={(e) =>
                        setPriceRange({ ...priceRange, min: Number(e.target.value) })
                      }
                      fullWidth
                    />
                    <span className="text-neutral-400 font-bold">-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={priceRange.max === 1000000 ? '' : priceRange.max}
                      onChange={(e) =>
                        setPriceRange({ ...priceRange, max: Number(e.target.value) || 1000000 })
                      }
                      fullWidth
                    />
                  </div>
                </div>

                <div>
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="w-full flex items-center justify-center gap-2 text-xs font-bold h-[42px]"
                  >
                    <X size={14} />
                    <span>Clear All Filters</span>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Main Marketplace Area */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading && products.length === 0 ? (
          /* Loading skeleton grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            variant="error"
            title="Error loading products"
            message={error}
            actionLabel="Retry"
            onAction={() => fetchProducts(1, false)}
          />
        ) : products.length === 0 ? (
          <EmptyState
            variant="search"
            title="No products found"
            message="Try adjusting your search query, price ranges, or filters."
            actionLabel="Reset Marketplace"
            onAction={clearFilters}
          />
        ) : (
          <>
            {selectedCategory !== 'all' ? (
              /* Single Category View Grid */
              <div
                className={`grid gap-4 sm:gap-6 ${
                  viewMode === 'grid'
                    ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                    : 'grid-cols-1'
                }`}
              >
                {products.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    onAddToCart={handleAddToCart}
                    onFavorite={handleFavorite}
                    isFavorite={isInWishlist(product._id)}
                    onView={handleViewProduct}
                    isViewed={viewedProducts.has(product._id)}
                  />
                ))}
              </div>
            ) : (
              /* Grouped by Categories View */
              <div className="space-y-12">
                {/* Hero Feature Box / Prompt */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden mb-8">
                  <div className="relative z-10 max-w-lg">
                    <span className="bg-white/25 text-white text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1 w-fit mb-3">
                      <Sparkles size={12} /> Local Marketplace
                    </span>
                    <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">
                      Browse by Category
                    </h1>
                    <p className="text-white/80 text-sm mt-2 leading-relaxed">
                      Discover amazing goods from verified local vendors near you, grouped by category for your convenience.
                    </p>
                  </div>
                  {/* Decorative background circle */}
                  <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
                </div>

                {Object.entries(groupedProducts).map(([categoryName, categoryProducts]) => (
                  <div key={categoryName} className="space-y-4">
                    {/* Category Header */}
                    <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                        <h2 className="text-lg sm:text-xl font-extrabold text-neutral-800 tracking-tight">
                          {categoryName}
                        </h2>
                      </div>
                      <span className="text-[10px] sm:text-xs font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full border border-blue-100 shadow-2xs">
                        {categoryProducts.length} {categoryProducts.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>

                    {/* Category Products Grid */}
                    <div
                      className={`grid gap-4 sm:gap-6 ${
                        viewMode === 'grid'
                          ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                          : 'grid-cols-1'
                      }`}
                    >
                      {categoryProducts.map((product) => (
                        <ProductCard
                          key={product._id}
                          product={product}
                          onAddToCart={handleAddToCart}
                          onFavorite={handleFavorite}
                          isFavorite={isInWishlist(product._id)}
                          onView={handleViewProduct}
                          isViewed={viewedProducts.has(product._id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center mt-12 pb-8">
                <Button
                  variant="secondary"
                  onClick={handleLoadMore}
                  isLoading={loading}
                  className="px-8 font-bold border-neutral-300 hover:border-neutral-400"
                >
                  Load More Products
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ShopPage;