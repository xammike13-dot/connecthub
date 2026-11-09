// ProductFeed.jsx – light-mode infinite scroll grid
import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ShoppingCart } from 'lucide-react';

function FeedCard({ product }) {
  const [added, setAdded] = useState(false);
  const { _id, name, price, oldPrice, images, discountPct } = product;
  const img = images?.[0] || null;

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <Link
      to={`/product/${_id}`}
      className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 group flex flex-col"
    >
      <div className="relative w-full aspect-square bg-gray-100 overflow-hidden flex items-center justify-center">
        {img ? (
          <img
            src={img}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="text-4xl md:text-5xl select-none">
            🛍️
          </div>
        )}
        {discountPct && (
          <span className="absolute top-2 left-2 text-[10px] font-black bg-[#FF5E00] text-white px-2 py-0.5 rounded-full shadow-sm">
            -{discountPct}%
          </span>
        )}
      </div>
      <div className="flex flex-col flex-1 p-3 md:p-3.5 gap-1.5 justify-between">
        <p className="text-gray-900 text-xs md:text-sm font-bold leading-snug line-clamp-2">
          {name}
        </p>
        <div className="flex items-center justify-between mt-1 pt-1 border-t border-gray-50">
          <div className="flex flex-col">
            <span className="text-[#FF5E00] font-extrabold text-sm md:text-base leading-tight">
              KSh {price?.toLocaleString()}
            </span>
            {oldPrice && (
              <span className="text-gray-400 text-xs line-through leading-tight">
                {oldPrice.toLocaleString()}
              </span>
            )}
          </div>
          <button
            onClick={handleAdd}
            aria-label="Add to cart"
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all duration-200 hover:scale-110 active:scale-95"
            style={{ background: added ? '#027A2B' : '#FF5E00' }}
          >
            {added
              ? <ShoppingCart size={14} className="text-white" />
              : <Plus size={16} className="text-white" />}
          </button>
        </div>
      </div>
    </Link>
  );
}

export default function ProductFeed() {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const loader = useRef(null);

  const loadProducts = useCallback(() => {
    if (loading || !hasMore) return;
    setLoading(true);
    fetch(`/api/products?page=${page}&limit=12`)
      .then((r) => r.json())
      .then((json) => {
        const items = Array.isArray(json) ? json : (json?.data ?? []);
        if (items.length === 0) {
          setHasMore(false);
        } else {
          setProducts((prev) => [...prev, ...items]);
          setPage((p) => p + 1);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, loading, hasMore]);

  // Initial load
  useEffect(() => { loadProducts(); }, []); // eslint-disable-line

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadProducts(); },
      { rootMargin: '300px' }
    );
    if (loader.current) obs.observe(loader.current);
    return () => obs.disconnect();
  }, [loadProducts, hasMore]);

  return (
    <section className="bg-gray-50 py-5 px-4">
      {products.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {products.map((p) => <FeedCard key={p._id} product={p} />)}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-[#FF5E00] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!hasMore && products.length > 0 && (
        <p className="text-center text-gray-400 text-xs py-6">
          Hiyo ndiyo yote — umefika mwisho wa marketplace! 🎉
        </p>
      )}

      {hasMore && <div ref={loader} className="h-4" />}
    </section>
  );
}
