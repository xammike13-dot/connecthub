import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  ChevronDown,
  Grid,
  List,
  X,
  Heart,
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

const sortOptions = [
  { value: '-createdAt', label: 'Newest' },
  { value: 'price', label: 'Price: Low to High' },
  { value: '-price', label: 'Price: High to Low' },
  { value: '-rating', label: 'Highest Rated' },
];

const HealthcareShopPage = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { user } = useAuth();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('-createdAt');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000000 });
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [viewedProducts, setViewedProducts] = useState(new Set());

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
    console.log('[VIEWED PRODUCTS LOADED]', viewed.size, 'products');
  }, []);

  // Fetch healthcare products only
  const fetchProducts = async (pageNumber = 1, append = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pageNumber,
        limit: 12,
        category: 'healthcare', // Hardcoded to healthcare only
        search: searchQuery || undefined,
        sort: sortBy,
        minPrice: priceRange.min > 0 ? priceRange.min : undefined,
        maxPrice: priceRange.max < 1000000 ? priceRange.max : undefined,
      };

      const response = await productAPI.getAll(params);

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
      console.error('Failed to fetch healthcare products:', err);
      setError('Failed to load healthcare products. Please try again.');
      if (!append) {
        setProducts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(1, false);
  }, [sortBy, searchQuery, priceRange]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProducts(1, false);
  };

  const handleAddToCart = (product) => {
    addToCart(product);
  };

  const handleFavorite = async (productId) => {
    if (!user) {
      navigate('/login');
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
    // Check if already viewed using local state
    const alreadyViewed = viewedProducts.has(productId);

    if (!alreadyViewed) {
      try {
        console.log('[TRACKING VIEW] Product:', productId);
        if (user) {
          await productAPI.trackView(productId);
        }
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
    navigate(`/marketplace/${productId}`);
  };

  const handleLoadMore = () => {
    fetchProducts(page + 1, true);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setPriceRange({ min: 0, max: 1000000 });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Title */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900">Healthcare Products</h1>
              <p className="text-sm text-neutral-500">Medicines, medical supplies, and health products</p>
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative">
            <Input
              type="text"
              placeholder="Search healthcare products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search size={18} />}
              rightIcon={
                searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-neutral-500 hover:text-neutral-600"
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
                className="flex items-center gap-2 px-4 py-2 bg-neutral-100 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-200 hover:border-red-500/50 transition-all whitespace-nowrap"
              >
                <Filter size={16} />
                Filters
              </button>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-neutral-100 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-200 hover:border-red-500/50 transition-all cursor-pointer"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-600 hidden sm:block">
                {totalProducts} healthcare products
              </span>
              <div className="flex items-center gap-1 bg-neutral-100 border border-neutral-200 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-all ${viewMode === 'grid'
                    ? 'bg-red-500/20 text-red-500'
                    : 'text-neutral-500 hover:text-neutral-600'
                    }`}
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-all ${viewMode === 'list'
                    ? 'bg-red-500/20 text-red-500'
                    : 'text-neutral-500 hover:text-neutral-600'
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
            className="border-t border-neutral-200 bg-white"
          >
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
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
            title="Error loading healthcare products"
            message={error}
            actionLabel="Retry"
            onAction={() => fetchProducts(1, false)}
          />
        ) : products.length === 0 ? (
          <EmptyState
            variant="search"
            title="No healthcare products found"
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

export default HealthcareShopPage;
