// ProductDetailsPage.jsx — Premium /product/:productId page for Olafasta
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronRight, Star, Heart, Minus, Plus, ShoppingCart,
  Truck, Shield, RotateCcw, Share2, Store, Package,
  CheckCircle2, AlertTriangle, ChevronLeft, Loader2, MapPin, Zap,
  Copy, Check, X, MessageCircle, ExternalLink
} from 'lucide-react';
import { productAPI } from '../services/api';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../components/Toast';
import ProductCard from '../components/ProductCard';
import { getCategoryBySlug } from '../config/categories';

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
function PDPSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="flex gap-2 mb-6">
        {[80, 60, 100, 120].map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-3 bg-gray-200 rounded" style={{ width: w }} />
            {i < 3 && <div className="w-3 h-3 bg-gray-200 rounded" />}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Left: image skeleton */}
        <div>
          <div className="aspect-square bg-gray-200 rounded-2xl mb-3" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-16 h-16 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
        {/* Right: details skeleton */}
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="h-6 bg-gray-200 rounded w-1/2" />
          <div className="h-10 bg-gray-200 rounded w-1/3" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-9 w-16 bg-gray-200 rounded-full" />
            ))}
          </div>
          <div className="h-12 bg-gray-200 rounded-xl w-full" />
        </div>
      </div>
    </div>
  );
}

// ─── Related Products Grid with Automatic Infinite Scroll ──────────────────────
function RelatedProducts({ product }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadedIdsRef = useRef(new Set());
  const fetchingRef = useRef(false);
  const requestedPagesRef = useRef(new Set());
  const activeProductIdRef = useRef(null);
  const sentinelRef = useRef(null);

  // Reset state when product changes (user navigated to a different product)
  useEffect(() => {
    if (!product?._id) return;
    activeProductIdRef.current = product._id;
    setProducts([]);
    setHasMore(true);
    setError(null);
    setPage(1);
    loadedIdsRef.current = new Set([product._id]);
    requestedPagesRef.current = new Set();
    fetchingRef.current = false;
  }, [product?._id]);

  // Fetch a specific page of related products
  const fetchPage = useCallback(
    async (pageNum) => {
      const currentId = product?._id;
      if (!currentId || fetchingRef.current || !hasMore) return;
      if (requestedPagesRef.current.has(pageNum)) return;

      fetchingRef.current = true;
      requestedPagesRef.current.add(pageNum);
      setLoading(true);
      setError(null);

      try {
        const res = await productAPI.getRelated(currentId, {
          page: pageNum,
          limit: 12,
        });

        // If product changed while request was in-flight, discard response
        if (activeProductIdRef.current !== currentId) return;

        const items = res.data?.data || [];
        const pagination = res.data?.pagination;

        // Filter out duplicates and current product
        const newItems = items.filter((p) => {
          if (!p?._id || p._id === currentId) return false;
          if (loadedIdsRef.current.has(p._id)) return false;
          loadedIdsRef.current.add(p._id);
          return true;
        });

        setProducts((prev) => [...prev, ...newItems]);

        // Evaluate hasMore from backend pagination metadata
        if (pagination?.hasMore !== undefined) {
          setHasMore(pagination.hasMore);
        } else if (items.length < 12) {
          setHasMore(false);
        }
      } catch (err) {
        if (activeProductIdRef.current === currentId) {
          setError('Failed to load related products. Tap to retry.');
          requestedPagesRef.current.delete(pageNum);
        }
      } finally {
        if (activeProductIdRef.current === currentId) {
          setLoading(false);
        }
        fetchingRef.current = false;
      }
    },
    [product?._id, hasMore]
  );

  // Load first page on initial mount or when product ID changes
  useEffect(() => {
    if (product?._id && products.length === 0 && hasMore && !loading && !fetchingRef.current) {
      fetchPage(1);
    }
  }, [product?._id, products.length, hasMore, loading, fetchPage]);

  // Automatic infinite scroll observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !fetchingRef.current &&
          hasMore &&
          !error &&
          products.length > 0
        ) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchPage(nextPage);
        }
      },
      { rootMargin: '350px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, error, products.length, page, fetchPage]);

  const handleRetry = () => {
    setError(null);
    fetchPage(page);
  };

  // Initial loading state (skeleton grid)
  if (products.length === 0 && loading) {
    return (
      <section className="mt-12 border-t border-gray-100 pt-8">
        <h2 className="text-xl font-black text-gray-900 mb-4">Related Products</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-2xl animate-pulse aspect-square" />
          ))}
        </div>
      </section>
    );
  }

  // Empty state when no related products exist
  if (products.length === 0 && !loading && !error) {
    return (
      <section className="mt-12 border-t border-gray-100 pt-8 text-center py-8">
        <h2 className="text-xl font-black text-gray-900 mb-2">Related Products</h2>
        <p className="text-sm text-gray-500">
          No other products found in this category yet. Explore more in our{' '}
          <Link to="/marketplace" className="text-[#FF5E00] font-bold hover:underline">
            marketplace
          </Link>.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-12 border-t border-gray-100 pt-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-black text-gray-900">Related Products</h2>
          <p className="text-xs text-gray-500 mt-0.5">Explore more products in this category</p>
        </div>
        {product?.category && (
          <Link
            to={`/c/${product.category.toLowerCase().replace(/[\s&]+/g, '-')}`}
            className="text-xs font-bold text-[#FF5E00] hover:underline"
          >
            View all &rarr;
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
        {products.map((p) => (
          <ProductCard key={p._id} product={p} isGrid />
        ))}
      </div>

      {/* Sentinel element for automatic IntersectionObserver detection */}
      {hasMore && (
        <div ref={sentinelRef} className="flex items-center justify-center py-8">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm font-semibold bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
              <Loader2 size={18} className="animate-spin text-[#FF5E00]" />
              Loading more products...
            </div>
          ) : (
            <div className="h-8" />
          )}
        </div>
      )}

      {/* Error with retry */}
      {error && (
        <div className="flex flex-col items-center py-6">
          <p className="text-sm text-gray-500 mb-3">{error}</p>
          <button
            onClick={handleRetry}
            className="bg-[#FF5E00] text-white font-bold px-6 py-2 rounded-full text-sm hover:bg-orange-600 transition-colors shadow-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* End of list message */}
      {!hasMore && !error && products.length > 0 && (
        <div className="text-center py-8 text-xs font-semibold text-gray-400">
          You've viewed all related products
        </div>
      )}
    </section>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProductDetailsPage() {
  const { productId, slug } = useParams();
  const productIdentifier = slug || productId;
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({}); // { "Size": "42", "Color": "Black" }
  const [selectedAddOns, setSelectedAddOns] = useState([]); // [{ name, price }]
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [isWished, setIsWished] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Swipe gesture handling for mobile gallery
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  // ── Contexts ───────────────────────────────────────────────────────────────
  let cart = null;
  try { cart = useCart(); } catch (_) {}
  let wishlist = null;
  try { wishlist = useWishlist(); } catch (_) {}
  let toast = null;
  try { toast = useToast(); } catch (_) {}

  // ── Reset and Fetch product ────────────────────────────────────────────────
  useEffect(() => {
    if (!productIdentifier) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setLoading(true);
    setError(null);
    setCurrentImageIdx(0);
    setSelectedOptions({});
    setSelectedAddOns([]);
    setQuantity(1);
    setAddedToCart(false);

    productAPI.getById(productIdentifier)
      .then((res) => {
        const p = res.data?.product || res.data?.data || res.data;
        setProduct(p);

        // Pre-select required add-ons
        const requiredExtras = (p?.addOns || [])
          .filter((a) => a.isRequired && a.isActive !== false && a.isAvailable !== false)
          .map((a) => ({ name: a.name, price: Number(a.price) || 0 }));
        setSelectedAddOns(requiredExtras);
      })
      .catch(() => setError('Product not found.'))
      .finally(() => setLoading(false));

    // Optional view tracking
    productAPI.trackView?.(productIdentifier)?.catch(() => {});
  }, [productIdentifier]);

  // ── Sync wishlist ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (wishlist?.isInWishlist && product?._id) {
      setIsWished(wishlist.isInWishlist(product._id, 'product'));
    }
  }, [wishlist, product]);

  // ── Normalize images ───────────────────────────────────────────────────────
  const rawImages = product?.images || [];
  const imgs = rawImages.map((img) => {
    if (typeof img === 'string') return img;
    return img?.url || img?.secure_url || '';
  }).filter(Boolean);

  // ── Variations & Variants ──────────────────────────────────────────────────
  const variations = product?.variations || [];
  const variants = product?.variants || [];
  const addOns = product?.addOns || [];

  // Match selected variant from variants list
  let matchedVariant = null;
  if (variants.length > 0 && Object.keys(selectedOptions).length > 0) {
    matchedVariant = variants.find((v) => {
      if (v.options && typeof v.options === 'object') {
        const opts = v.options instanceof Map ? Object.fromEntries(v.options) : v.options;
        return Object.entries(selectedOptions).every(([k, val]) => opts[k] === val);
      }
      if (v.name && v.value) {
        return selectedOptions[v.name] === v.value;
      }
      return false;
    });

    if (!matchedVariant) {
      const selectedStr = Object.values(selectedOptions).join(' / ');
      matchedVariant = variants.find((v) => v.value === selectedStr || v.name === selectedStr);
    }
  }

  // Variant image takes priority if defined
  const variantImg = matchedVariant?.image || null;
  const mainImg = variantImg || imgs[currentImageIdx] || null;

  // ── Swipe handlers ─────────────────────────────────────────────────────────
  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current || imgs.length <= 1) return;
    const diff = touchStartX.current - touchEndX.current;
    const minDistance = 45;

    if (diff > minDistance) {
      setCurrentImageIdx((prev) => (prev + 1) % imgs.length);
    } else if (diff < -minDistance) {
      setCurrentImageIdx((prev) => (prev - 1 + imgs.length) % imgs.length);
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Base price calculation: variant price (if specified and > 0) or base price + adjustment
  let basePrice = product?.price || 0;
  if (matchedVariant) {
    if (matchedVariant.price !== undefined && matchedVariant.price !== null && matchedVariant.price > 0) {
      basePrice = Number(matchedVariant.price);
    } else if (matchedVariant.priceAdjustment) {
      basePrice = (product?.price || 0) + Number(matchedVariant.priceAdjustment);
    }
  }

  const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
  const unitPrice = basePrice + addOnsTotal;
  const totalPrice = unitPrice * quantity;

  // Stock calculation: resolve base stock safely, or variant stock if variant selected
  const resolvedBaseStock = (product?.stock !== undefined && product?.stock !== null)
    ? Number(product.stock)
    : (product?.stockCount !== undefined && product?.stockCount !== null ? Number(product.stockCount) : 0);

  let displayStock = resolvedBaseStock;
  if (matchedVariant && matchedVariant.stock !== undefined && matchedVariant.stock !== null) {
    displayStock = Number(matchedVariant.stock);
  }

  // Availability status
  const isVariantUnavailable = matchedVariant && (matchedVariant.isActive === false || matchedVariant.isAvailable === false);
  const isOutOfStock = displayStock <= 0 || product?.isActive === false || isVariantUnavailable;
  const isLowStock = !isOutOfStock && displayStock <= 5;

  // Auto-clamp quantity if stock limit is reached
  useEffect(() => {
    if (displayStock > 0 && quantity > displayStock) {
      setQuantity(displayStock);
    }
  }, [displayStock, quantity]);

  // Validate required variations
  const requiredVariations = variations.filter((v) => v.options?.length > 0);
  const allVariationsSelected = requiredVariations.every((v) => Boolean(selectedOptions[v.name]));

  const categoryInfo = product?.category
    ? getCategoryBySlug?.(product.category.toLowerCase().replace(/\s+/g, '-')) ?? null
    : null;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleOptionSelect = useCallback((variationName, option) => {
    setSelectedOptions((prev) => ({ ...prev, [variationName]: option }));
  }, []);

  const handleAddOnToggle = useCallback((addOn) => {
    if (addOn.isRequired) return;
    if (addOn.isActive === false || addOn.isAvailable === false) return;

    setSelectedAddOns((prev) => {
      const exists = prev.find((a) => a.name.toLowerCase() === addOn.name.toLowerCase());
      if (exists) {
        return prev.filter((a) => a.name.toLowerCase() !== addOn.name.toLowerCase());
      }
      if (product?.maxAddOnsSelectable) {
        const optionalCount = prev.filter((a) => {
          const orig = product.addOns?.find((o) => o.name.toLowerCase() === a.name.toLowerCase());
          return !orig?.isRequired;
        }).length;
        if (optionalCount >= product.maxAddOnsSelectable) {
          toast?.show?.(`Maximum of ${product.maxAddOnsSelectable} extras allowed`, 'warning');
          return prev;
        }
      }
      return [...prev, { name: addOn.name, price: Number(addOn.price) || 0 }];
    });
  }, [product, toast]);

  const handleAddToCart = useCallback((andCheckout = false) => {
    if (!allVariationsSelected) {
      const unselected = requiredVariations
        .filter((v) => !selectedOptions[v.name])
        .map((v) => v.name)
        .join(', ');
      toast?.show?.(`Please select ${unselected} first`, 'warning');
      return;
    }

    if (isOutOfStock) {
      toast?.show?.('This item is currently out of stock', 'error');
      return;
    }

    if (cart?.addToCart) {
      cart.addToCart(product, quantity, selectedOptions, selectedAddOns, matchedVariant, basePrice);
    }
    setAddedToCart(true);
    toast?.show?.('Added to cart!', 'success');

    if (andCheckout) {
      const directItem = {
        _id: product._id,
        product: product._id,
        name: product.name,
        price: unitPrice,
        quantity,
        images: imgs,
        variant: matchedVariant?.name || matchedVariant?.value || Object.entries(selectedOptions).map(([k, v]) => `${k}: ${v}`).join(', '),
        variantId: matchedVariant?._id,
        selectedOptions,
        selectedAddOns,
        business: product.business,
      };

      navigate('/checkout', {
        state: {
          directPurchase: true,
          directItems: [directItem],
        },
      });
    } else {
      setTimeout(() => setAddedToCart(false), 2000);
    }
  }, [allVariationsSelected, requiredVariations, selectedOptions, isOutOfStock, cart, product, quantity, selectedAddOns, matchedVariant, basePrice, unitPrice, imgs, toast, navigate]);

  const handleBuyNow = useCallback(() => {
    handleAddToCart(true);
  }, [handleAddToCart]);

  const handleWishlist = useCallback(async () => {
    setIsWished((prev) => !prev);
    if (wishlist?.toggleWishlist && product?._id) {
      await wishlist.toggleWishlist(product._id, 'product');
    }
  }, [wishlist, product]);

  const handleShare = useCallback(async () => {
    const shareUrl = window.location.href;
    const shareTitle = product?.name || 'Olafasta ⚡';

    if (navigator.share && /mobile|android|iphone|ipad/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: shareTitle,
          text: 'Check this out on Olafasta ⚡',
          url: shareUrl,
        });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback: open Olafasta WhatsApp / Copy link modal
    setShareModalOpen(true);
  }, [product]);

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    toast?.show?.('Link copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // ── Render: Loading ────────────────────────────────────────────────────────
  if (loading) return <div className="min-h-screen bg-white"><PDPSkeleton /></div>;

  // ── Render: Error ──────────────────────────────────────────────────────────
  if (error || !product) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-4 text-center">
        <AlertTriangle size={48} className="text-orange-400" />
        <h2 className="text-xl font-bold text-gray-800">Product Not Found</h2>
        <p className="text-gray-500 text-sm max-w-sm">
          This product may have been removed or the link is incorrect.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-2 bg-[#FF5E00] text-white font-bold px-6 py-2.5 rounded-full hover:bg-orange-600 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  // ── Destructure product ────────────────────────────────────────────────────
  const {
    _id,
    name = 'Product',
    price = 0,
    originalPrice,
    oldPrice,
    description,
    category,
    subcategory,
    condition,
    stock,
    stockCount,
    rating = 4.8,
    numReviews = 24,
    vendor,
    business,
    isLive,
  } = product;

  // Discount calculation
  const comparePrice = originalPrice || oldPrice;
  const hasDiscount = comparePrice && comparePrice > price;
  const discountPct = hasDiscount ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0;

  // Business profile details
  const businessObj = typeof business === 'object' && business !== null ? business : {};
  const vendorName = businessObj.businessProfile?.businessName || businessObj.name || vendor?.businessName || 'Campus Store';
  const businessLogo = businessObj.businessProfile?.businessLogo || businessObj.businessLogo || businessObj.avatar || vendor?.avatar || null;
  const businessCampus = businessObj.businessProfile?.campusLocation || businessObj.businessProfile?.businessLocation;
  const businessId = businessObj._id;

  // ── Breadcrumbs ────────────────────────────────────────────────────────────
  const categorySlug = category?.toLowerCase().replace(/[\s&]+/g, '-') || 'marketplace';
  const breadcrumbs = [
    { label: 'Home', to: '/' },
    { label: categoryInfo?.label || category || 'Marketplace', to: `/c/${categorySlug}` },
    ...(subcategory ? [{ label: subcategory, to: `/c/${categorySlug}?sub=${encodeURIComponent(subcategory)}` }] : []),
    { label: name, to: null },
  ];

  return (
    <div className="min-h-screen bg-white pb-28 md:pb-12">
      {/* ── Breadcrumbs ───────────────────────────────────────────────────── */}
      <nav className="max-w-6xl mx-auto px-4 pt-4 pb-2">
        <ol className="flex items-center flex-wrap gap-1 text-xs text-gray-400">
          {breadcrumbs.map((crumb, i) => (
            <li key={i} className="flex items-center gap-1">
              {crumb.to ? (
                <Link to={crumb.to} className="hover:text-[#FF5E00] transition-colors font-medium truncate max-w-[120px]">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-gray-700 font-semibold truncate max-w-[180px]">{crumb.label}</span>
              )}
              {i < breadcrumbs.length - 1 && <ChevronRight size={12} className="flex-shrink-0" />}
            </li>
          ))}
        </ol>
      </nav>

      {/* ── Main Two-Column Grid ───────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">

          {/* ════════════════ LEFT: Image Gallery ════════════════ */}
          <div>
            {/* Main Image */}
            <div
              className="relative w-full aspect-square bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 shadow-sm select-none touch-pan-y"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {mainImg ? (
                <img
                  src={mainImg}
                  alt={name}
                  className="w-full h-full object-contain p-2"
                  key={currentImageIdx}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl select-none">
                  {product.emoji || '🛍️'}
                </div>
              )}

              {/* Nav arrows for image */}
              {imgs.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setCurrentImageIdx((p) => (p - 1 + imgs.length) % imgs.length)}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white text-gray-800 rounded-full shadow flex items-center justify-center transition-colors z-10"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentImageIdx((p) => (p + 1) % imgs.length)}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white text-gray-800 rounded-full shadow flex items-center justify-center transition-colors z-10"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}

              {/* Floating Share Button (Top Right) */}
              <button
                type="button"
                onClick={handleShare}
                aria-label="Share product"
                className="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-white/95 hover:bg-white text-gray-700 hover:text-olaOrange-DEFAULT shadow-md border border-gray-100 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-xs"
                title="Share this product"
              >
                <Share2 size={18} />
              </button>

              {/* Image counter (Bottom Right) */}
              {imgs.length > 1 && (
                <div className="absolute bottom-3 right-3 bg-black/60 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-xs z-10 select-none">
                  {currentImageIdx + 1} / {imgs.length}
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start z-10">
                {hasDiscount && (
                  <span className="text-xs font-black bg-olaOrange-DEFAULT text-white px-2.5 py-1 rounded-full shadow">
                    -{discountPct}%
                  </span>
                )}
                {isLive && (
                  <span className="flex items-center gap-1 text-[10px] font-black bg-olaGreen-DEFAULT text-white px-2.5 py-1 rounded-full shadow">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnail Strip */}
            {imgs.length > 1 && (
              <div className="flex gap-2.5 mt-3 overflow-x-auto pb-1 no-scrollbar">
                {imgs.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentImageIdx(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      i === currentImageIdx
                        ? 'border-olaOrange-DEFAULT shadow-xs ring-2 ring-olaOrange-DEFAULT/20'
                        : 'border-gray-200 hover:border-gray-300 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`${name} view ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Trust Strip */}
            <div className="hidden md:flex gap-4 mt-5 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              {[
                { icon: Truck, label: 'Campus Delivery' },
                { icon: Shield, label: 'Escrow Protection' },
                { icon: RotateCcw, label: 'Easy Returns' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                  <Icon size={15} className="text-olaGreen-DEFAULT flex-shrink-0" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* ════════════════ RIGHT: Product Information & Customisation ════════════════ */}
          <div className="flex flex-col gap-5">

            {/* 1. Product category */}
            {category && (
              <div className="flex items-center gap-2">
                <Link to={`/c/${categorySlug}`} className="inline-flex">
                  <span className="text-xs font-bold text-[#FF5E00] bg-orange-50 border border-orange-100 px-3 py-1 rounded-full hover:bg-orange-100 transition-colors">
                    {category}
                  </span>
                </Link>
                {condition && (
                  <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                    {condition}
                  </span>
                )}
              </div>
            )}

            {/* 2. Product name */}
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight flex-1">
                {name}
              </h1>
              <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                <button
                  type="button"
                  onClick={handleWishlist}
                  aria-label={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
                  className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
                    isWished ? 'border-red-200 bg-red-50 text-red-500' : 'border-gray-200 bg-white text-gray-400 hover:text-red-500'
                  }`}
                >
                  <Heart size={18} className={isWished ? 'fill-red-500' : ''} />
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  aria-label="Share product"
                  className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors hover:scale-105 active:scale-95"
                >
                  <Share2 size={16} />
                </button>
              </div>
            </div>

            {/* 3. Product variations configured by the business */}
            {product?.hasVariations !== false && variations.length > 0 && (
              <div className="space-y-4 pt-1">
                {variations.map((variation) => {
                  const selectedVal = selectedOptions[variation.name];
                  return (
                    <div key={variation.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Select {variation.name}:
                          {selectedVal && (
                            <span className="text-olaOrange-DEFAULT font-black ml-1 normal-case">{selectedVal}</span>
                          )}
                        </span>
                        {!selectedVal && (
                          <span className="text-[11px] text-red-500 font-semibold flex items-center gap-1">
                            Required *
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {variation.options?.map((opt) => {
                          const isSelected = selectedVal === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleOptionSelect(variation.name, opt)}
                              className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? 'border-olaOrange-DEFAULT bg-olaOrange-DEFAULT text-white shadow-sm'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              {isSelected && <CheckCircle2 size={14} className="stroke-[3]" />}
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 4. Product add-ons configured by the business */}
            {product?.hasAddOns !== false && addOns.length > 0 && (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                    Product Add-ons & Extras:
                  </span>
                  {product?.maxAddOnsSelectable ? (
                    <span className="text-[11px] text-gray-500 font-medium">
                      (Max {product.maxAddOnsSelectable} selectable)
                    </span>
                  ) : null}
                </div>
                <div className="space-y-2">
                  {addOns.map((addOn) => {
                    const checked = selectedAddOns.some(
                      (a) => a.name.toLowerCase() === addOn.name.toLowerCase()
                    );
                    const extraPrice = Number(addOn.price) || 0;
                    const isAvail = addOn.isActive !== false && addOn.isAvailable !== false;
                    return (
                      <label
                        key={addOn.name}
                        className={`flex items-center justify-between gap-3 p-3 rounded-xl border-2 transition-all select-none ${
                          !isAvail
                            ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
                            : checked
                              ? 'border-olaGreen-DEFAULT bg-olaGreen-light/30 cursor-pointer'
                              : 'border-gray-100 bg-gray-50/80 hover:border-gray-200 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!isAvail || addOn.isRequired}
                            onChange={() => handleAddOnToggle(addOn)}
                            className="w-4 h-4 accent-olaGreen-DEFAULT cursor-pointer rounded"
                          />
                          <div>
                            <span className={`text-sm font-bold ${checked ? 'text-olaGreen-DEFAULT' : 'text-gray-800'}`}>
                              {addOn.name}
                            </span>
                            {addOn.isRequired && (
                              <span className="ml-2 text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                                Required
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`text-sm font-bold ${checked ? 'text-olaGreen-DEFAULT' : 'text-gray-600'}`}>
                          + KSh {extraPrice.toLocaleString()}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. Vendor Trust Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-gray-50 via-orange-50/20 to-emerald-50/20 border border-gray-100 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-2xs">
                  {businessLogo ? (
                    <img
                      src={businessLogo}
                      alt={vendorName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Store size={22} className="text-olaOrange-DEFAULT" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link
                      to={businessId ? `/marketplace?business=${businessId}` : `/c/${categorySlug}`}
                      className="text-sm font-black text-gray-900 hover:text-olaOrange-DEFAULT transition-colors truncate"
                      title={`Visit ${vendorName}'s store`}
                    >
                      {vendorName}
                    </Link>
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-olaGreen-DEFAULT bg-olaGreen-light px-2 py-0.5 rounded-full">
                      <Shield size={10} className="stroke-[2.5]" /> Verified
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                    {businessCampus && (
                      <span className="flex items-center gap-1 text-gray-600 font-medium">
                        <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                        {businessCampus}
                      </span>
                    )}
                    <span className="flex items-center gap-1 font-bold text-gray-800">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      {rating} <span className="text-gray-400 font-normal">({numReviews} reviews)</span>
                    </span>
                  </div>
                </div>
              </div>

              <Link
                to={businessId ? `/marketplace?business=${businessId}` : `/c/${categorySlug}`}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-olaOrange-DEFAULT bg-white hover:bg-olaOrange-light border border-olaOrange-DEFAULT/30 transition-colors flex-shrink-0 shadow-2xs"
              >
                Store
              </Link>
            </div>

            {/* 6. Product price */}
            <div className="flex items-baseline gap-3 flex-wrap pt-1">
              <span className="text-3xl md:text-4xl font-black text-olaOrange-DEFAULT leading-none">
                KSh {totalPrice.toLocaleString()}
              </span>
              {hasDiscount && (
                <span className="text-lg text-gray-400 line-through leading-none">
                  KSh {(comparePrice * quantity).toLocaleString()}
                </span>
              )}
              {addOnsTotal > 0 && (
                <span className="text-xs text-gray-500">
                  (Includes KSh {(addOnsTotal * quantity).toLocaleString()} for selected extras)
                </span>
              )}
            </div>

            {/* 7. Actual stock availability and quantity */}
            <div>
              {isOutOfStock ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3.5 py-1.5 rounded-full">
                  <Package size={14} /> Out of Stock
                </span>
              ) : isLowStock ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 px-3.5 py-1.5 rounded-full animate-pulse">
                  🔥 Only {displayStock} {displayStock === 1 ? 'item' : 'items'} left
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-full">
                  <CheckCircle2 size={14} /> In Stock — {displayStock} {displayStock === 1 ? 'item' : 'items'} available
                </span>
              )}
            </div>

            {/* 8. Quantity selector */}
            <div className="flex items-center gap-4 pt-1">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Quantity:</span>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || isOutOfStock}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-700 disabled:opacity-40"
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} />
                </button>
                <span className="w-12 text-center text-sm font-black text-gray-900">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => (displayStock > 0 ? Math.min(displayStock, q + 1) : q + 1))}
                  disabled={isOutOfStock || (displayStock !== undefined && displayStock !== null && quantity >= displayStock)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-700 disabled:opacity-40"
                  aria-label="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>
              {displayStock > 0 && quantity >= displayStock && (
                <span className="text-[11px] text-gray-500 font-medium">Max available reached</span>
              )}
            </div>

            {/* 9. Delivery and buyer protection information */}
            <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs text-gray-600 mt-1">
              <div className="flex items-center gap-2.5">
                <Truck size={16} className="text-olaGreen-DEFAULT flex-shrink-0" />
                <span><strong className="text-gray-800">Campus Delivery Available</strong> — Kesses · Chebarus · Mabs · Stage</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Shield size={16} className="text-olaGreen-DEFAULT flex-shrink-0" />
                <span><strong className="text-gray-800">Buyer Protection</strong> — Escrow secured payment</span>
              </div>
            </div>

            {/* 10. Dual Action Bar (Desktop) */}
            <div className="hidden md:flex flex-col gap-2 pt-2">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleAddToCart(false)}
                  disabled={isOutOfStock}
                  className={`flex-1 py-3.5 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-98 border-2 border-olaOrange-DEFAULT text-olaOrange-DEFAULT bg-olaOrange-light/40 hover:bg-olaOrange-light cursor-pointer ${
                    addedToCart ? 'bg-olaGreen-light text-olaGreen-DEFAULT border-olaGreen-DEFAULT' : ''
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {addedToCart ? (
                    <><CheckCircle2 size={18} /> Added to Cart!</>
                  ) : isOutOfStock ? (
                    'Out of Stock'
                  ) : (
                    <><ShoppingCart size={18} /> Add to Cart</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className="flex-1 py-3.5 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-98 bg-olaOrange-DEFAULT hover:bg-olaOrange-hover text-white shadow-md shadow-olaOrange-DEFAULT/25 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Zap size={18} /> Buy Now
                </button>
              </div>

              {/* Incomplete variations notice */}
              {!allVariationsSelected && (
                <p className="text-xs text-olaOrange-DEFAULT font-semibold flex items-center gap-1.5 mt-1">
                  <AlertTriangle size={13} />
                  Please select{' '}
                  {requiredVariations.filter((v) => !selectedOptions[v.name]).map((v) => v.name).join(', ')}{' '}
                  to continue.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Description Section ──────────────────────────────────── */}
        {description && (
          <section className="mt-12 border-t border-gray-100 pt-8">
            <h2 className="text-xl font-black text-gray-900 mb-3">Product Description</h2>
            <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap max-w-4xl">
              {description}
            </div>
          </section>
        )}

        {/* ── Specifications Section ──────────────────────────────── */}
        <section className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {category && (
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <span className="text-[11px] text-gray-400 block mb-0.5">Category</span>
              <span className="text-sm font-bold text-gray-800">{category}</span>
            </div>
          )}
          {condition && (
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <span className="text-[11px] text-gray-400 block mb-0.5">Condition</span>
              <span className="text-sm font-bold text-gray-800">{condition}</span>
            </div>
          )}
          {product.brand && (
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <span className="text-[11px] text-gray-400 block mb-0.5">Brand</span>
              <span className="text-sm font-bold text-gray-800">{product.brand}</span>
            </div>
          )}
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <span className="text-[11px] text-gray-400 block mb-0.5">Availability</span>
            <span className="text-sm font-bold text-gray-800">
              {isOutOfStock ? 'Out of Stock' : displayStock !== undefined ? `${displayStock} Units` : 'In Stock'}
            </span>
          </div>
        </section>

        {/* ── Related Products with Automatic Infinite Scroll ───────── */}
        <RelatedProducts product={product} />
      </div>

      {/* ════════════════ STICKY MOBILE ACTION BAR ════════════════ */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-[55] bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom,12px)]"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 12px))' }}
      >
        <div className="max-w-lg mx-auto grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleAddToCart(false)}
            disabled={isOutOfStock}
            className={`border-2 border-olaOrange-DEFAULT text-olaOrange-DEFAULT bg-olaOrange-light/40 hover:bg-olaOrange-light font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
              addedToCart ? 'bg-olaGreen-light text-olaGreen-DEFAULT border-olaGreen-DEFAULT' : ''
            }`}
          >
            {addedToCart ? (
              <>
                <CheckCircle2 size={18} />
                <span>Added!</span>
              </>
            ) : isOutOfStock ? (
              <span>Out of Stock</span>
            ) : (
              <>
                <ShoppingCart size={18} />
                <span>Add to Cart</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            disabled={isOutOfStock}
            className="bg-olaOrange-DEFAULT hover:bg-olaOrange-hover text-white font-bold py-3 rounded-xl text-sm shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Zap size={18} />
            <span>Buy Now</span>
          </button>
        </div>
      </div>

      {/* ════════════════ SHARE MODAL (WhatsApp & Copy Fallback) ════════════════ */}
      {shareModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShareModalOpen(false)}
        >
          <div
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-gray-100 transform transition-all animate-in slide-in-from-bottom duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-olaOrange-light flex items-center justify-center text-olaOrange-DEFAULT">
                  <Share2 size={16} />
                </span>
                <h3 className="text-base font-black text-gray-900">Share with Comrades</h3>
              </div>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
                aria-label="Close share dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Product snippet preview */}
            <div className="flex items-center gap-3.5 p-3.5 bg-gray-50 rounded-2xl border border-gray-100 my-4">
              {mainImg ? (
                <img src={mainImg} alt={name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-gray-200" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-orange-50 flex items-center justify-center text-2xl flex-shrink-0">
                  {product?.emoji || '🛍️'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-gray-900 truncate">{name}</h4>
                <p className="text-xs font-black text-olaOrange-DEFAULT mt-0.5">KSh {unitPrice.toLocaleString()}</p>
                <p className="text-[11px] text-gray-400 truncate">Olafasta ⚡ Campus Super-App</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2.5">
              {/* WhatsApp Share Button */}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Check out ${name} on Olafasta ⚡ (KSh ${unitPrice.toLocaleString()}): ${window.location.href}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShareModalOpen(false)}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-md shadow-emerald-500/20 transition-all active:scale-98"
              >
                <MessageCircle size={18} className="fill-white" />
                <span>Share on WhatsApp</span>
              </a>

              {/* Copy Link Button */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-3.5 px-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-98 cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check size={18} className="text-olaGreen-DEFAULT" />
                    <span className="text-olaGreen-DEFAULT">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
