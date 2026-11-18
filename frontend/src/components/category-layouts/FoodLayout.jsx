// FoodLayout.jsx — Vendor-First Dining & Grocery Archetype for Campus Comrades
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UtensilsCrossed, 
  Clock, 
  MapPin, 
  Star, 
  Sparkles, 
  Flame, 
  Phone,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Search,
  Store,
  Bike
} from 'lucide-react';
import { useVendorsByCategory } from '../../hooks/useVendors';

function VendorLogo({ src, name, className = '' }) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = name
    ? name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    : 'V';

  return (
    <div className={`relative flex-shrink-0 overflow-hidden bg-emerald-50 border border-emerald-100 ${className}`}>
      {src && !imageFailed ? (
        <img
          src={src}
          alt={`${name || 'Vendor'} logo`}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-emerald-700 font-black" aria-label={`${name || 'Vendor'} initials`}>
          {initials}
        </div>
      )}
    </div>
  );
}

export default function FoodLayout({ category, slug }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpenOnly, setFilterOpenOnly] = useState(false);
  const isWines = slug === 'wines' || category?.id === 'wines-spirits';
  const menuLabel = isWines ? 'Explore Drinks' : 'Explore Menu';

  const openVendorMenu = (vendor) => {
    navigate(`/marketplace?category=${encodeURIComponent(category.label)}&business=${encodeURIComponent(vendor._id)}`);
  };

  // ── 1. Fetch Vendors via TanStack React Query ───────────────────────────────
  const { data: vendors = [], isLoading, isError, refetch } = useVendorsByCategory(slug || category?.slug);

  // ── 2. Filter Vendors ───────────────────────────────────────────────────────
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      if (filterOpenOnly && !v.isOpen) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = v.name?.toLowerCase().includes(q);
        const matchesLoc = v.location?.toLowerCase().includes(q);
        const matchesDish = v.popularDishes?.some((d) => d.name?.toLowerCase().includes(q));
        if (!matchesName && !matchesLoc && !matchesDish) return false;
      }
      return true;
    });
  }, [vendors, filterOpenOnly, searchQuery]);

  // Top rated / Open now subset for horizontal quick row
  const topRatedVendors = useMemo(() => {
    return vendors.filter((v) => v.rating >= 4.8 || v.isOpen).slice(0, 6);
  }, [vendors]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* ── Category Hero Banner ─────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 bg-emerald-50 text-emerald-700">
                <UtensilsCrossed size={14} />
                <span>VENDOR-FIRST KITCHEN DIRECTORY</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {category.label}
              </h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-1 max-w-xl">
                {category.description || 'Browse available campus vendors and order directly.'}
              </p>
            </div>

            {/* Vendor search */}
            <div className="w-full md:w-80 relative">
              <input
                type="text"
                placeholder={isWines ? 'Search drinks, wines, spirits...' : 'Search vendors, dishes, drinks...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
              />
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">

        {/* ── 1. "Open Now & Top Rated" Horizontal Quick-Pill Row ──────────── */}
        {topRatedVendors.length > 0 && !isLoading && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-extrabold text-gray-900 flex items-center gap-1.5">
                <Flame size={15} className="text-[#FF5E00]" />
                <span>Hot & Open Around Campus</span>
              </h2>
              <span className="text-xs text-gray-400 font-medium">Fast Dispatch</span>
            </div>

            <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar scrollbar-hide snap-x">
              {topRatedVendors.map((vendor) => (
                <button
                  key={vendor._id}
                  type="button"
                  onClick={() => openVendorMenu(vendor)}
                  className="flex-shrink-0 w-[230px] max-w-[calc(100vw-2.5rem)] min-h-[76px] bg-white rounded-2xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-all snap-start flex items-center gap-3 cursor-pointer group text-left"
                >
                  <VendorLogo
                    src={vendor.avatar}
                    name={vendor.name}
                    className="w-12 h-12 rounded-xl group-hover:scale-[1.02] transition-transform"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-900 truncate group-hover:text-[#FF5E00] transition-colors">
                      {vendor.name}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-1 flex-wrap">
                      {vendor.rating > 0 && (
                        <>
                          <Star size={11} className="fill-yellow-400 text-yellow-400" />
                          <span className="font-bold text-gray-700">{vendor.rating.toFixed(1)}</span>
                        </>
                      )}
                      {vendor.deliveryTime && <span>· {vendor.deliveryTime}</span>}
                      {vendor.isOpen && <span className="text-emerald-700 font-bold">· Open</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── 2. Primary Vendor Cards Feed (Vertical List) ────────────────── */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-gray-900">
                All Available Kitchens & Vendors
              </h2>
              <p className="text-xs text-gray-500 mt-1">Pick a vendor to browse their full menu and place an order</p>
            </div>

            <button
              onClick={() => setFilterOpenOnly(!filterOpenOnly)}
              className={`w-full sm:w-auto min-h-10 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                filterOpenOnly
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {filterOpenOnly ? 'Showing Open Only' : 'Filter: Open Now'}
            </button>
          </div>

          {/* Loading Skeletons */}
          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-pulse space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gray-200" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-3 bg-gray-200 rounded w-1/4" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="h-8 bg-gray-200 rounded-xl w-32" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Vendors Feed */}
          {!isLoading && filteredVendors.length > 0 && (
            <div className="space-y-4">
              {filteredVendors.map((vendor) => (
                <div
                  key={vendor._id}
                  className="w-full min-w-0 bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left: Vendor Meta */}
                  <div className="flex items-start gap-3 sm:gap-4 min-w-0 w-full md:max-w-[72%]">
                    <VendorLogo
                      src={vendor.avatar}
                      name={vendor.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl text-xl sm:text-2xl group-hover:scale-[1.02] transition-transform"
                    />

                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="min-w-0 text-base sm:text-lg font-black text-gray-900 leading-tight break-words line-clamp-2 group-hover:text-emerald-700 transition-colors">
                          {vendor.name}
                        </h3>
                        <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${
                          vendor.isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {vendor.isOpen ? 'Open Now' : 'Closed'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 min-[390px]:grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-gray-500">
                        {vendor.rating > 0 && (
                          <span className="flex items-center gap-1 font-bold text-gray-800 min-w-0">
                            <Star size={13} className="fill-yellow-400 text-yellow-400 flex-shrink-0" />
                            <span className="truncate">{vendor.rating.toFixed(1)}{vendor.reviewCount > 0 ? ` (${vendor.reviewCount})` : ''}</span>
                          </span>
                        )}
                        {vendor.deliveryTime && (
                          <span className="flex items-center gap-1 text-gray-600 min-w-0">
                            <Clock size={13} className="flex-shrink-0" />
                            <span className="truncate">{vendor.deliveryTime}</span>
                          </span>
                        )}
                        {vendor.location && (
                          <span className="flex items-center gap-1 text-gray-600 min-w-0 min-[390px]:col-span-2">
                            <MapPin size={13} className="flex-shrink-0" />
                            <span className="truncate">{vendor.location}</span>
                          </span>
                        )}
                      </div>

                      {/* Popular Dishes Horizontal Preview */}
                      {vendor.popularDishes?.length > 0 && (
                        <div className="pt-1 flex items-center gap-2 max-w-full overflow-x-auto no-scrollbar scrollbar-hide">
                          <span className="text-[11px] font-bold text-gray-400 flex-shrink-0">Popular</span>
                          {vendor.popularDishes.map((dish, i) => (
                            <div
                              key={i}
                              className="inline-flex items-center gap-1 max-w-[180px] px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-100 text-xs font-medium text-gray-700 flex-shrink-0"
                            >
                              <span className="flex-shrink-0">{dish.emoji || '🍽️'}</span>
                              <span className="font-semibold text-gray-800 truncate">{dish.name}</span>
                              {dish.price != null && (
                                <span className="text-emerald-700 font-bold whitespace-nowrap">KSh {dish.price}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Action CTA */}
                  <div className="flex w-full md:w-auto flex-col items-stretch justify-end gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                    {vendor.deliveryFee != null && (
                      <div className="text-left md:text-right">
                        <span className="text-xs text-gray-400">Delivery</span>
                        <p className="text-xs font-bold text-emerald-700">
                          {vendor.deliveryFee === 0 ? 'Free Delivery' : `KSh ${vendor.deliveryFee}`}
                        </p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => openVendorMenu(vendor)}
                      className="w-full md:w-40 min-h-11 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <span>{menuLabel}</span>
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredVendors.length === 0 && (
            <div className="py-16 text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Store size={32} />
              </div>
              <h3 className="text-base font-bold text-gray-900">No Kitchens Found</h3>
              <p className="text-xs text-gray-500 mt-1 mb-4">
                No vendors are currently active for this category filter.
              </p>
              {filterOpenOnly && (
                <button
                  onClick={() => setFilterOpenOnly(false)}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
                >
                  Show All Kitchens
                </button>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
