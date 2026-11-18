// ProductFeed.jsx — infinite-scroll product feed using real API data
import { useEffect, useState, useRef, useCallback } from 'react';
import { ArrowDown, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import ProductCard from './ProductCard';
import { productAPI } from '../services/api';

export default function ProductFeed() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const sentinelRef = useRef(null);

  // Initial load
  useEffect(() => {
    fetchProducts(1, false);
  }, []);

  const fetchProducts = async (pageNum, append) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await productAPI.getAll({
        page: pageNum,
        limit: 24,
        sort: '-createdAt',
      });

      const productsData = response.data?.data || [];
      const pagination = response.data?.pagination || {};

      if (append) {
        setProducts((prev) => [...prev, ...productsData]);
      } else {
        setProducts(productsData);
      }

      setHasMore(productsData.length === 24);
      setPage(pageNum);
    } catch (err) {
      console.error('[ProductFeed] Failed to fetch products:', err);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Infinite scroll observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchProducts(page + 1, true);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page]);

  if (loading) {
    return (
      <section className="px-4 my-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={20} className="text-[#FF5E00]" />
          <h2 className="text-gray-900 font-extrabold text-base sm:text-lg md:text-xl tracking-tight">
            More To Explore
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-pulse"
            >
              <div className="w-full aspect-square bg-gray-200" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
                <div className="h-5 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="px-4 my-6">
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">{error}</p>
          <button
            onClick={() => fetchProducts(1, false)}
            className="mt-3 text-[#FF5E00] font-bold text-sm hover:underline"
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  if (!loading && products.length === 0) {
    return (
      <section className="px-4 my-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={20} className="text-[#FF5E00]" />
          <h2 className="text-gray-900 font-extrabold text-base sm:text-lg md:text-xl tracking-tight">
            More To Explore
          </h2>
        </div>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles size={28} className="text-[#FF5E00]" />
          </div>
          <p className="text-gray-600 font-semibold text-sm">No products available yet</p>
          <p className="text-gray-400 text-xs mt-1">Check back soon for new listings!</p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 my-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={20} className="text-[#FF5E00]" />
        <h2 className="text-gray-900 font-extrabold text-base sm:text-lg md:text-xl tracking-tight">
          More To Explore
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} isGrid />
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      {hasMore && (
        <div ref={sentinelRef} className="flex items-center justify-center py-8">
          {loadingMore ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Loader2 size={18} className="animate-spin" />
              <span>Loading more products...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-gray-400 text-xs">
              <ArrowDown size={14} />
              <span>Scroll for more</span>
            </div>
          )}
        </div>
      )}

      {!hasMore && products.length > 0 && (
        <div className="flex items-center justify-center py-6">
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <CheckCircle2 size={16} className="text-[#027A2B]" />
            <span>You've seen all products</span>
          </div>
        </div>
      )}
    </section>
  );
}
