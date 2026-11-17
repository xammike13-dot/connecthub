// ProductDetailModal.jsx – Quick-view modal for product variations & add-ons
import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Minus, ShoppingCart, Check, ChevronLeft, ChevronRight, Star, Truck } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export default function ProductDetailModal({ product, isOpen, onClose }) {
  const { addToCart } = useCart();

  const [selectedOptions, setSelectedOptions] = useState({});
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [addedFeedback, setAddedFeedback] = useState(false);

  // Reset state whenever product changes
  useEffect(() => {
    if (product) {
      setSelectedOptions({});
      setSelectedAddOns([]);
      setQuantity(1);
      setCurrentImageIdx(0);
      setAddedFeedback(false);
    }
  }, [product?._id]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const {
    _id, name, price, originalPrice, description,
    images = [], coverImage = 0,
    variations = [], addOns = [],
    stock = 0, isActive = true,
    rating = 0, numReviews = 0,
    deliveryFee = 0, category,
  } = product;

  const isOutOfStock = stock === 0 || !isActive;
  const hasDiscount = originalPrice && originalPrice > price;
  const discountPct = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  // Check if all required variations have been selected
  const requiredVariations = variations.filter(v => v.options?.length > 0);
  const allVariationsSelected = requiredVariations.every(v => selectedOptions[v.name]);

  const addOnsTotal = selectedAddOns.reduce((s, a) => s + a.price, 0);
  const unitPrice = price + addOnsTotal;
  const totalPrice = unitPrice * quantity;

  const handleVariationSelect = (varName, option) => {
    setSelectedOptions(prev => ({ ...prev, [varName]: option }));
  };

  const handleAddOnToggle = (addOn) => {
    setSelectedAddOns(prev => {
      const exists = prev.find(a => a.name === addOn.name);
      return exists ? prev.filter(a => a.name !== addOn.name) : [...prev, addOn];
    });
  };

  const handleAddToCart = () => {
    if (isOutOfStock || !allVariationsSelected) return;
    addToCart(
      { _id, name, price, images, coverImage, category, stock },
      quantity,
      selectedOptions,
      selectedAddOns,
    );
    setAddedFeedback(true);
    setTimeout(() => {
      setAddedFeedback(false);
      onClose();
    }, 1200);
  };

  const images_ = images.length > 0 ? images : [null];
  const prevImage = () => setCurrentImageIdx(i => (i - 1 + images_.length) % images_.length);
  const nextImage = () => setCurrentImageIdx(i => (i + 1) % images_.length);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal panel – slides up on mobile, centered on desktop */}
      <div className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-50 pointer-events-none">
        <div
          className="pointer-events-auto bg-white w-full md:max-w-2xl md:rounded-2xl rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-slide-up"
          onClick={e => e.stopPropagation()}
        >
          {/* Drag handle (mobile) */}
          <div className="flex-shrink-0 flex justify-center pt-3 pb-1 md:hidden">
            <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-gray-100 transition-colors"
          >
            <X size={18} className="text-gray-700" />
          </button>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 overscroll-contain">
            {/* Image Carousel */}
            <div className="relative w-full aspect-[4/3] bg-gray-100 flex-shrink-0">
              {images_[currentImageIdx] ? (
                <img
                  src={images_[currentImageIdx]}
                  alt={`${name} ${currentImageIdx + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-gray-50">
                  <ShoppingCart size={48} className="text-gray-200" />
                </div>
              )}

              {/* Prev / Next */}
              {images_.length > 1 && (
                <>
                  <button onClick={prevImage} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors">
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={nextImage} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors">
                    <ChevronRight size={18} />
                  </button>
                  {/* Dots */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images_.map((_, i) => (
                      <button key={i} onClick={() => setCurrentImageIdx(i)}
                        className={`w-2 h-2 rounded-full transition-all ${i === currentImageIdx ? 'bg-[#FF5E00] scale-125' : 'bg-white/70'}`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Badges */}
              {hasDiscount && (
                <span className="absolute top-3 left-3 bg-[#FF5E00] text-white text-xs font-black px-2 py-1 rounded-full shadow">
                  -{discountPct}%
                </span>
              )}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="text-white font-bold bg-black/60 px-4 py-2 rounded-full">Out of Stock</span>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="p-4 md:p-6 space-y-4">
              {/* Name + Price */}
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{category}</p>
                <h2 className="text-xl font-bold text-gray-900 leading-snug mt-0.5">{name}</h2>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-extrabold text-[#FF5E00]">KSh {price.toLocaleString()}</span>
                  {hasDiscount && (
                    <span className="text-sm text-gray-400 line-through">KSh {originalPrice.toLocaleString()}</span>
                  )}
                </div>
                {rating > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                    <span className="text-sm font-semibold text-gray-700">{rating.toFixed(1)}</span>
                    <span className="text-sm text-gray-400">({numReviews} reviews)</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {description && (
                <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
              )}

              {/* Delivery Info */}
              <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
                <Truck size={15} className="text-[#027A2B] flex-shrink-0" />
                <span>
                  {deliveryFee === 0 ? (
                    <span className="text-[#027A2B] font-semibold">Free delivery</span>
                  ) : (
                    <>Delivery: <strong>KSh {deliveryFee.toLocaleString()}</strong></>
                  )}
                </span>
              </div>

              {/* ── Variations ─────────────────────────────────────── */}
              {variations.length > 0 && variations.map((variation) => (
                <div key={variation.name}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-gray-800">
                      {variation.name}
                      <span className="text-[#FF5E00] ml-1">*</span>
                    </p>
                    {selectedOptions[variation.name] && (
                      <span className="text-xs text-gray-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                        {selectedOptions[variation.name]}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {variation.options.map((option) => {
                      const isSelected = selectedOptions[variation.name] === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleVariationSelect(variation.name, option)}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all duration-150 active:scale-95 cursor-pointer outline-none
                            ${isSelected
                              ? 'border-[#FF5E00] bg-orange-50 text-[#FF5E00] shadow-sm scale-105 ring-2 ring-[#FF5E00]'
                              : 'border-transparent bg-gray-100 text-gray-700 hover:border-[#FF5E00] focus:ring-2 focus:ring-[#FF5E00]'
                            }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* ── Add-ons ────────────────────────────────────────── */}
              {addOns.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-gray-800 mb-2">Add Extras</p>
                  <div className="space-y-2">
                    {addOns.map((addOn) => {
                      const isChecked = selectedAddOns.some(a => a.name === addOn.name);
                      return (
                        <label
                          key={addOn.name}
                          className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all
                            ${isChecked
                              ? 'border-[#027A2B] bg-green-50'
                              : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0
                              ${isChecked ? 'border-[#027A2B] bg-[#027A2B]' : 'border-gray-300'}`}>
                              {isChecked && <Check size={12} className="text-white stroke-[3]" />}
                            </div>
                            <span className="text-sm font-medium text-gray-800">{addOn.name}</span>
                          </div>
                          <span className={`text-sm font-bold ${isChecked ? 'text-[#027A2B]' : 'text-gray-500'}`}>
                            + KSh {addOn.price.toLocaleString()}
                          </span>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={isChecked}
                            onChange={() => handleAddOnToggle(addOn)}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity selector */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-bold text-gray-700">Quantity</span>
                <div className="flex items-center gap-3 bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-40"
                    disabled={quantity <= 1}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center font-bold text-gray-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => Math.min(stock || 99, q + 1))}
                    className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-40"
                    disabled={quantity >= (stock || 99)}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Validation hint */}
              {!allVariationsSelected && requiredVariations.length > 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Please select: {requiredVariations.filter(v => !selectedOptions[v.name]).map(v => v.name).join(', ')}
                </p>
              )}

              {/* Total price line */}
              {(selectedAddOns.length > 0 || quantity > 1) && (
                <div className="flex justify-between items-center bg-orange-50 rounded-xl px-3 py-2 border border-orange-100">
                  <span className="text-sm text-gray-600 font-medium">Total</span>
                  <span className="text-lg font-extrabold text-[#FF5E00]">KSh {totalPrice.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Sticky bottom CTA */}
          <div className="flex-shrink-0 p-4 md:px-6 pb-safe border-t border-gray-100 bg-white">
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock || !allVariationsSelected}
              className={`w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all duration-200 shadow-md
                ${addedFeedback
                  ? 'bg-[#027A2B] text-white scale-95'
                  : isOutOfStock || !allVariationsSelected
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-[#FF5E00] text-white hover:bg-orange-600 active:scale-95 hover:shadow-lg'
                }`}
            >
              {addedFeedback ? (
                <><Check size={20} className="stroke-[3]" /> Added to Cart!</>
              ) : isOutOfStock ? (
                'Out of Stock'
              ) : (
                <><ShoppingCart size={20} /> Add to Cart · KSh {totalPrice.toLocaleString()}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
