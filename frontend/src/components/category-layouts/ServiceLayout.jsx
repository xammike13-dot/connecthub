import { useMemo } from 'react';
import { Search, RotateCcw, ShoppingBag } from 'lucide-react';
import ProductCard from '../ProductCard';
import ProductCardSkeleton from '../skeletons/ProductCardSkeleton';
import { useProductsByCategory } from '../../hooks/useProducts';

export default function ServiceLayout({ category, slug }) {
  const { data: products = [], isLoading, isError, refetch } = useProductsByCategory(
    slug || category?.slug,
    { limit: 40 }
  );

  const activeProducts = useMemo(
    () => products.filter((product) => product.isActive !== false),
    [products]
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-3"
            style={{ backgroundColor: `${category.accentColor}15`, color: category.accentColor }}>
            <span>{category.emoji}</span>
            <span>SERVICE MARKETPLACE</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900">{category.label}</h1>
          <p className="text-sm text-gray-500 mt-2 max-w-xl">{category.description}</p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, index) => (
              <ProductCardSkeleton key={index} isGrid />
            ))}
          </div>
        )}

        {isError && !isLoading && (
          <div className="py-16 text-center">
            <Search className="mx-auto text-red-400 mb-3" size={32} />
            <h2 className="text-lg font-bold text-gray-900">Failed to load listings</h2>
            <p className="text-sm text-gray-500 mt-1 mb-4">Please retry to load the database listings.</p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF5E00] text-white text-sm font-bold"
            >
              <RotateCcw size={14} /> Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && activeProducts.length === 0 && (
          <div className="py-16 text-center">
            <ShoppingBag className="mx-auto text-gray-300 mb-3" size={40} />
            <h2 className="text-lg font-bold text-gray-900">No listings found</h2>
            <p className="text-sm text-gray-500 mt-1">No active products are available in this category.</p>
          </div>
        )}

        {!isLoading && !isError && activeProducts.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {activeProducts.map((product) => (
              <ProductCard key={product._id} product={product} isGrid />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
