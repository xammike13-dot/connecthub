import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  Grid,
  List,
  X,
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
  { id: 'food-stuffs', name: 'Food Stuffs' },
  { id: 'households', name: 'Households' },
  { id: 'gas', name: 'Gas' },
  { id: 'wines-spirits', name: 'Wines & Spirits' },
  { id: 'house-shopping', name: 'House Shopping' },
];

// Subcategories for each main category
const subcategories = {
  'food-stuffs': ['Snacks', 'Beverages', 'Fries'],
  'households': ['New', 'Second Hand'],
  'house-shopping': ['Rice', 'Unga', 'Cooking Oil', 'Salt', 'Sugar', 'Flour', 'Soap', 'Other Essentials'],
};

const sortOptions = [
  { value: '-createdAt', label: 'Newest' },
  { value: 'price', label: 'Price: Low to High' },
  { value: '-price', label: 'Price: High to Low' },
  { value: '-rating', label: 'Highest Rated' },
];

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
    if (user) {
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
      console.log('[VIEWED PRODUCTS LOADED]', viewed.size, 'products');
    }
  }, [user]);

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
        limit: 12,
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
    console.log('[FAVORITE TOGGLE] Product:', productId);
    const wasFavorite = isInWishlist(productId);
    const result = await toggleWishlist(productId);

    // Update local product state to reflect count change
    setProducts(prevProducts =>
      prevProducts.map(product => {
        if (product._id === productId) {
          const newCount = wasFavorite
            ? Math.max(0, (product.favoritesCount || 0) - 1)
            : (product.favoritesCount || 0) + 1;
          console.log('[FAVORITE COUNT UPDATED] Product:', productId, 'Old:', product.favoritesCount, 'New:', newCount);
          return { ...product, favoritesCount: newCount };
        }
        return product;
      })
    );
  };

  const handleViewProduct = async (productId) => {
    console.log('[VIEW CLICK] Product:', productId);
    if (user) {
      // Check if already viewed using local state
      const alreadyViewed = viewedProducts.has(productId);

      if (!alreadyViewed) {
        try {
          console.log('[TRACKING VIEW] Product:', productId);
          await productAPI.trackView(productId);
          localStorage.setItem(`viewed_product_${productId}`, 'true');

          // Update local viewed products state immediately
          setViewedProducts(prev => new Set([...prev, productId]));
          console.log('[VIEW STATE UPDATED] Product:', productId, 'added to viewed set');

          // Update local product state to reflect view count change
          setProducts(prevProducts =>
            prevProducts.map(product => {
              if (product._id === productId) {
                const newCount = (product.views || 0) + 1;
                console.log('[VIEW COUNT UPDATED] Product:', productId, 'Old:', product.views, 'New:', newCount);
                return { ...product, views: newCount };
              }
              return product;
            })
          );
        } catch (error) {
          console.error('Failed to track view:', error);
        }
      } else {
        console.log('[VIEW ALREADY TRACKED] Product:', productId);
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

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <div className="bg-neutral-900/80 backdrop-blur-sm border-b border-neutral-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative">
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search size={18} />}
              rightIcon={
                searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-neutral-500 hover:text-neutral-300"
                  >
                    <X size={18} />
                  </button>
                )
              }
              fullWidth
            />
          </form>

          {/* Filters Bar */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm font-medium text-neutral-300 hover:bg-neutral-700 hover:border-gold-500/50 transition-all whitespace-nowrap"
              >
                <Filter size={16} />
                Filters
              </button>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm font-medium text-neutral-300 hover:bg-neutral-700 hover:border-gold-500/50 transition-all cursor-pointer"
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
                  className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm font-medium text-neutral-300 hover:bg-neutral-700 hover:border-gold-500/50 transition-all cursor-pointer"
                >
                  <option value="">All {categories.find(c => c.id === selectedCategory)?.name}</option>
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
                className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm font-medium text-neutral-300 hover:bg-neutral-700 hover:border-gold-500/50 transition-all cursor-pointer"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-500 hidden sm:block">
                {totalProducts} products
              </span>
              <div className="flex items-center gap-1 bg-neutral-800 border border-neutral-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-all ${viewMode === 'grid'
                    ? 'bg-gold-500/20 text-gold-400'
                    : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-all ${viewMode === 'list'
                    ? 'bg-gold-500/20 text-gold-400'
                    : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-neutral-800 bg-neutral-900/80"
          >
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Price Range
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={priceRange.min}
                      onChange={(e) =>
                        setPriceRange({ ...priceRange, min: Number(e.target.value) })
                      }
                      fullWidth
                    />
                    <span className="text-neutral-500">-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={priceRange.max}
                      onChange={(e) =>
                        setPriceRange({ ...priceRange, max: Number(e.target.value) })
                      }
                      fullWidth
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="w-full"
                  >
                    Clear All Filters
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading && products.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
            message="Try adjusting your search or filter criteria"
            actionLabel="Clear Filters"
            onAction={clearFilters}
          />
        ) : (
          <>
            <div
              className={`grid gap-4 ${viewMode === 'grid'
                ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
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

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="secondary"
                  onClick={handleLoadMore}
                  isLoading={loading}
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