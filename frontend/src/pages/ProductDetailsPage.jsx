// ProductDetailsPage.jsx — Premium /product/:productId page for Olafasta
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronRight, Star, Heart, Minus, Plus, ShoppingCart,
  Truck, Shield, RotateCcw, Share2, Store, Package,
  CheckCircle2, AlertTriangle, ChevronLeft,
} from 'lucide-react';
import { productAPI } from '../services/api';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../components/Toast';
import ProductRow from '../components/ProductRow';
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProductDetailsPage() {
  const { productId } = useParams();
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({});  // { "Size": "42", "Color": "Black" }
  const [selectedAddOns, setSelectedAddOns] = useState([]);    // [{ name, price }]
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [isWished, setIsWished] = useState(false);
  const [similarProducts, setSimilarProducts] = useState([]);

  // ── Contexts ───────────────────────────────────────────────────────────────
  let cart = null;
  try { cart = useCart(); } catch (_) {}
  let wishlist = null;
  try { wishlist = useWishlist(); } catch (_) {}
  let toast = null;
  try { toast = useToast(); } catch (_) {}

  // ── Fetch product ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    setCurrentImageIdx(0);
    setSelectedOptions({});
    setSelectedAddOns([]);
    setQuantity(1);
    setAddedToCart(false);

    productAPI.getById(productId)
      .then((res) => {
        const p = res.data?.product || res.data?.data || res.data;
        setProduct(p);
      })
      .catch(() => setError('Product not found.'))
      .finally(() => setLoading(false));
  }, [productId]);

  // ── Sync wishlist ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (wishlist?.isInWishlist && product?._id) {
      setIsWished(wishlist.isInWishlist(product._id, 'product'));
    }
  }, [wishlist, product]);

  // ── Fetch similar products (same category) ─────────────────────────────────
  useEffect(() => {
    if (!product?.category) return;
    productAPI.getAll({ category: product.category, limit: 10 })
      .then((res) => {
        const all = res.data?.products || res.data?.data || res.data || [];
        setSimilarProducts(all.filter((p) => p._id !== product._id).slice(0, 8));
      })
      .catch(() => {});
  }, [product]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + (a.price || 0), 0);
  const unitPrice = (product?.price || 0) + addOnsTotal;
  const totalPrice = unitPrice * quantity;

  const allVariationsSelected = !product?.variations?.length ||
    product.variations.every((v) => selectedOptions[v.name]);

  const categoryInfo = product?.category
    ? getCategoryBySlug?.(product.category.toLowerCase().replace(/\s+/g, '-')) ?? null
    : null;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleOptionSelect = useCallback((variationName, option) => {
    setSelectedOptions((prev) => ({ ...prev, [variationName]: option }));
  }, []);

  const handleAddOnToggle = useCallback((addOn) => {
    setSelectedAddOns((prev) => {
      const exists = prev.find((a) => a.name === addOn.name);
      return exists ? prev.filter((a) => a.name !== addOn.name) : [...prev, addOn];
    });
  }, []);

  const handleAddToCart = useCallback(() => {
    if (!allVariationsSelected) {
      toast?.show?.('Please select all options first', 'warning');
      return;
    }
    if (cart?.addToCart) {
      cart.addToCart(product, quantity, selectedOptions, selectedAddOns);
    }
    setAddedToCart(true);
    toast?.show?.('Added to cart!', 'success');
    setTimeout(() => setAddedToCart(false), 2000);
  }, [allVariationsSelected, cart, product, quantity, selectedOptions, selectedAddOns, toast]);

  const handleWishlist = useCallback(async () => {
    setIsWished((prev) => !prev);
    if (wishlist?.toggleWishlist && product?._id) {
      await wishlist.toggleWishlist(product._id, 'product');
    }
  }, [wishlist, product]);

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({ title: product?.name, url: window.location.href });
    } else {
      navigator.clipboard?.writeText(window.location.href);
      toast?.show?.('Link copied!', 'success');
    }
  }, [product, toast]);

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
    oldPrice,
    discountPct,
    images = [],
    description,
    category,
    subcategory,
    variations = [],
    addOns = [],
    stock,
    quantity: productQty,
    rating = 4.8,
    reviewCount = 24,
    vendor,
    business,
    isLive,
  } = product;

  const displayStock = stock ?? productQty;
  const vendorName = vendor?.businessName || business?.name || 'Campus Verified';
  const imgs = images.length ? images : [];
  const mainImg = imgs[currentImageIdx] || null;
  const isLowStock = displayStock !== undefined && displayStock !== null && displayStock > 0 && displayStock < 5;
  const isOutOfStock = displayStock === 0;

  // ── Build breadcrumbs ──────────────────────────────────────────────────────
  const categorySlug = category?.toLowerCase().replace(/[\s&]+/g, '-') || 'marketplace';
  const breadcrumbs = [
    { label: 'Home', to: '/' },
    { label: categoryInfo?.label || category || 'Marketplace', to: `/c/${categorySlug}` },
    ...(subcategory ? [{ label: subcategory, to: `/c/${categorySlug}` }] : []),
    { label: name, to: null },
  ];

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white pb-24 md:pb-10">

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

          {/* ════════════════ LEFT: Media Gallery ════════════════ */}
          <div>
            {/* Main Image */}
            <div className="relative w-full aspect-square bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              {mainImg ? (
                <img
                  src={mainImg}
                  alt={name}
                  className="w-full h-full object-contain"
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
                    onClick={() => setCurrentImageIdx((p) => (p - 1 + imgs.length) % imgs.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white transition-colors"
                  >
                    <ChevronLeft size={18} className="text-gray-700" />
                  </button>
                  <button
                    onClick={() => setCurrentImageIdx((p) => (p + 1) % imgs.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white transition-colors"
                  >
                    <ChevronRight size={18} className="text-gray-700" />
                  </button>
                </>
              )}

              {/* Dot indicators */}
              {imgs.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {imgs.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImageIdx(i)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i === currentImageIdx ? 'bg-[#FF5E00] w-4' : 'bg-white/70'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                {discountPct && (
                  <span className="text-xs font-black bg-[#FF5E00] text-white px-2.5 py-1 rounded-full shadow">
                    -{discountPct}%
                  </span>
                )}
                {isLive && (
                  <span className="flex items-center gap-1 text-[10px] font-black bg-[#6BE319] text-[#0F172A] px-2.5 py-1 rounded-full shadow">
                    <span className="w-1.5 h-1.5 bg-[#0F172A] rounded-full animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnail Strip */}
            {imgs.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
                {imgs.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImageIdx(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                      i === currentImageIdx
                        ? 'border-[#FF5E00] shadow-sm'
                        : 'border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <img src={img} alt={`${name} view ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Trust Strip (desktop) */}
            <div className="hidden md:flex gap-4 mt-5 p-4 bg-gray-50 rounded-xl border border-gray-100">
              {[
                { icon: Truck, label: 'Campus Delivery' },
                { icon: Shield, label: 'Secure Payment' },
                { icon: RotateCcw, label: 'Easy Returns' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                  <Icon size={15} className="text-[#027A2B] flex-shrink-0" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* ════════════════ RIGHT: Conversion Engine ════════════════ */}
          <div className="flex flex-col gap-5">

            {/* Category tag */}
            {category && (
              <Link to={`/c/${categorySlug}`} className="inline-flex">
                <span className="text-xs font-bold text-[#FF5E00] bg-orange-50 border border-orange-100 px-3 py-1 rounded-full hover:bg-orange-100 transition-colors">
                  {category}
                </span>
              </Link>
            )}

            {/* Title + actions */}
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight flex-1">
                {name}
              </h1>
              <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                <button
                  onClick={handleWishlist}
                  className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
                    isWished ? 'border-red-200 bg-red-50 text-red-500' : 'border-gray-200 bg-white text-gray-400 hover:text-red-500'
                  }`}
                >
                  <Heart size={18} className={isWished ? 'fill-red-500' : ''} />
                </button>
                <button
                  onClick={handleShare}
                  className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors hover:scale-110 active:scale-95"
                >
                  <Share2 size={16} />
                </button>
              </div>
            </div>

            {/* Rating + Vendor row */}
            <div className="flex items-center flex-wrap gap-3">
              <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-100 px-3 py-1.5 rounded-full">
                <Star size={14} className="fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-black text-gray-800">{rating}</span>
                <span className="text-xs text-gray-400">({reviewCount} reviews)</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Store size={14} className="text-gray-400" />
                <span>Sold by <span className="font-bold text-gray-800">{vendorName}</span></span>
              </div>
            </div>

            {/* Pricing */}
            <div className="flex items-end gap-3 flex-wrap">
              <span className="text-3xl md:text-4xl font-black text-[#FF5E00] leading-none">
                KSh {totalPrice.toLocaleString()}
              </span>
              {oldPrice && (
                <span className="text-lg text-gray-400 line-through leading-none">
                  KSh {(oldPrice * quantity).toLocaleString()}
                </span>
              )}
              {addOnsTotal > 0 && (
                <span className="text-xs text-gray-500 self-end">
                  (base KSh {(product.price * quantity).toLocaleString()} + extras KSh {(addOnsTotal * quantity).toLocaleString()})
                </span>
              )}
            </div>

            {/* Stock / Urgency badge */}
            {isOutOfStock ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-full w-fit">
                <Package size={14} /> Out of Stock
              </span>
            ) : isLowStock ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-700 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-full w-fit animate-pulse">
                🔥 Only {displayStock} left in stock!
              </span>
            ) : null}

            {/* ── Variation Chips ───────────────────────────────────── */}
            {variations.length > 0 && (
              <div className="space-y-3">
                {variations.map((variation) => (
                  <div key={variation.name}>
                    <p className="text-sm font-bold text-gray-700 mb-2">
                      {variation.name}
                      {selectedOptions[variation.name] && (
                        <span className="text-[#FF5E00] ml-1">: {selectedOptions[variation.name]}</span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {variation.options?.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => handleOptionSelect(variation.name, opt)}
                          className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all ${
                            selectedOptions[variation.name] === opt
                              ? 'border-[#FF5E00] bg-[#FF5E00] text-white shadow-sm'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-[#FF5E00] hover:text-[#FF5E00]'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Add-ons Checkboxes ────────────────────────────────── */}
            {addOns.length > 0 && (
              <div>
                <p className="text-sm font-bold text-gray-700 mb-2">Add Extras</p>
                <div className="space-y-2">
                  {addOns.map((addOn) => {
                    const checked = selectedAddOns.some((a) => a.name === addOn.name);
                    return (
                      <label
                        key={addOn.name}
                        className={`flex items-center justify-between gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          checked ? 'border-[#027A2B] bg-green-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleAddOnToggle(addOn)}
                            className="w-4 h-4 accent-[#027A2B] cursor-pointer"
                          />
                          <span className={`text-sm font-semibold ${checked ? 'text-[#027A2B]' : 'text-gray-700'}`}>
                            {addOn.name}
                          </span>
                        </div>
                        <span className={`text-sm font-bold ${checked ? 'text-[#027A2B]' : 'text-gray-500'}`}>
                          +KSh {addOn.price?.toLocaleString()}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Quantity Selector ─────────────────────────────────── */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-gray-700">Qty:</span>
              <div className="flex items-center gap-0 border border-gray-200 rounded-full overflow-hidden">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-700"
                >
                  <Minus size={16} />
                </button>
                <span className="w-10 text-center text-sm font-black text-gray-900">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  disabled={isOutOfStock}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-700 disabled:opacity-40"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* ── Desktop CTA ───────────────────────────────────────── */}
            <div className="hidden md:flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock || (variations.length > 0 && !allVariationsSelected)}
                className={`flex-1 flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl text-white font-black text-base transition-all shadow-sm active:scale-95 ${
                  addedToCart
                    ? 'bg-[#027A2B] shadow-green-200'
                    : 'bg-[#FF5E00] hover:bg-orange-600 shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {addedToCart ? (
                  <><CheckCircle2 size={20} /> Added to Cart!</>
                ) : (
                  <><ShoppingCart size={20} /> Add to Cart · KSh {totalPrice.toLocaleString()}</>
                )}
              </button>
            </div>

            {/* Variations incomplete warning */}
            {variations.length > 0 && !allVariationsSelected && (
              <p className="text-xs text-orange-600 font-semibold flex items-center gap-1.5 -mt-2">
                <AlertTriangle size={13} /> Please select {variations.filter((v) => !selectedOptions[v.name]).map((v) => v.name).join(', ')} to continue
              </p>
            )}

            {/* ── Delivery Info Row ─────────────────────────────────── */}
            <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-600">
              <div className="flex items-center gap-2.5">
                <Truck size={16} className="text-[#027A2B] flex-shrink-0" />
                <span><span className="font-bold text-gray-800">Campus Delivery</span> — Kesses · Chebarus · Mabs · Stage</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Shield size={16} className="text-[#027A2B] flex-shrink-0" />
                <span><span className="font-bold text-gray-800">Buyer Protection</span> — Pay on delivery available</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Description & Specs Section ──────────────────────────────────── */}
        {description && (
          <section className="mt-10 border-t border-gray-100 pt-8">
            <h2 className="text-lg font-black text-gray-900 mb-3">Product Description</h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{description}</p>
          </section>
        )}

        {/* ── Similar Products ─────────────────────────────────────────────── */}
        {similarProducts.length > 0 && (
          <div className="mt-10 border-t border-gray-100 pt-8">
            <ProductRow
              title={`More in ${category || 'This Category'}`}
              products={similarProducts}
              viewAllLink={`/c/${categorySlug}`}
            />
          </div>
        )}
      </div>

      {/* ════════════════ STICKY MOBILE CTA ════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-100 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex gap-3 items-center">
          {/* Price display */}
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-gray-400 font-medium">Total</span>
            <span className="text-lg font-black text-[#FF5E00] leading-tight">
              KSh {totalPrice.toLocaleString()}
            </span>
          </div>

          {/* Mobile Add to Cart */}
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock || (variations.length > 0 && !allVariationsSelected)}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-black text-sm transition-all active:scale-95 ${
              addedToCart
                ? 'bg-[#027A2B]'
                : 'bg-[#FF5E00] hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {addedToCart ? (
              <><CheckCircle2 size={18} /> Added!</>
            ) : (
              <><ShoppingCart size={18} /> Add to Cart</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
