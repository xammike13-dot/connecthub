import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};

/** Build a stable string key that uniquely identifies a product+variation+addons combo */
const buildCartKey = (productId, selectedOptions = {}, selectedAddOns = [], variantId = '') => {
  const optStr = JSON.stringify(
    Object.fromEntries(Object.entries(selectedOptions).sort())
  );
  const addStr = [...selectedAddOns].map(a => a.name).sort().join(',');
  return `${productId}__${variantId || ''}__${optStr}__${addStr}`;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('cart');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Cross-tab sync
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'cart') {
        try {
          const newCart = e.newValue ? JSON.parse(e.newValue) : [];
          if (JSON.stringify(newCart) !== JSON.stringify(cartItems)) {
            setCartItems(newCart);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [cartItems]);

  // ── Totals ───────────────────────────────────────────────────────────────
  const cartTotal = cartItems.reduce((total, item) => {
    const addOnsPrice = (item.selectedAddOns || []).reduce((s, a) => s + (a.price || 0), 0);
    return total + (item.price + addOnsPrice) * item.quantity;
  }, 0);

  const cartItemCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  // ── addToCart ────────────────────────────────────────────────────────────
  /**
   * @param {object} product   – product object from API (must have _id, name, price, images)
   * @param {number} quantity  – default 1
   * @param {object} selectedOptions  – e.g. { Size: '42', Color: 'Black' }
   * @param {Array}  selectedAddOns   – e.g. [{ name: 'Extra Smokie', price: 30 }]
   * @param {object} matchedVariant   – optional matched variant object
   * @param {number} customBasePrice  – optional base price override
   */
  const addToCart = useCallback((product, quantity = 1, selectedOptions = {}, selectedAddOns = [], matchedVariant = null, customBasePrice = null) => {
    const variantId = matchedVariant?._id || matchedVariant?.id || '';
    const cartKey = buildCartKey(product._id, selectedOptions, selectedAddOns, variantId);

    let basePrice = product.price;
    if (matchedVariant) {
      if (matchedVariant.price !== undefined && matchedVariant.price !== null && matchedVariant.price > 0) {
        basePrice = Number(matchedVariant.price);
      } else if (matchedVariant.priceAdjustment) {
        basePrice = product.price + Number(matchedVariant.priceAdjustment);
      }
    } else if (customBasePrice !== null && customBasePrice !== undefined) {
      basePrice = Number(customBasePrice);
    }

    const variantLabel = matchedVariant
      ? (matchedVariant.name || matchedVariant.value || Object.entries(selectedOptions).map(([k, v]) => `${k}: ${v}`).join(' · '))
      : (selectedOptions && Object.keys(selectedOptions).length > 0 ? Object.entries(selectedOptions).map(([k, v]) => `${k}: ${v}`).join(' · ') : '');

    const maxStock = (matchedVariant && matchedVariant.stock !== undefined && matchedVariant.stock !== null)
      ? Number(matchedVariant.stock)
      : ((product.stock !== undefined && product.stock !== null) ? Number(product.stock) : (Number(product.stockCount) || 0));

    const itemImages = matchedVariant?.image ? [matchedVariant.image, ...(product.images || [])] : (product.images || []);

    setCartItems((prevItems) => {
      const existingIdx = prevItems.findIndex((item) => item.cartKey === cartKey);
      if (existingIdx !== -1) {
        return prevItems.map((item, idx) => {
          if (idx !== existingIdx) return item;
          const newQty = item.quantity + quantity;
          const cappedQty = maxStock > 0 ? Math.min(newQty, maxStock) : newQty;
          return { ...item, quantity: cappedQty };
        });
      }
      return [
        ...prevItems,
        {
          ...product,
          price: basePrice,
          cartKey,
          quantity: maxStock > 0 ? Math.min(quantity, maxStock) : quantity,
          selectedOptions,
          selectedAddOns,
          variant: variantLabel,
          variantId,
          maxStock,
          images: itemImages,
        },
      ];
    });
  }, []);

  // ── removeFromCart (by cartKey) ──────────────────────────────────────────
  const removeFromCart = useCallback((cartKey) => {
    setCartItems((prev) => prev.filter((item) => item.cartKey !== cartKey));
  }, []);

  // ── updateQuantity (by cartKey) ──────────────────────────────────────────
  const updateQuantity = useCallback((cartKey, quantity) => {
    if (quantity <= 0) {
      removeFromCart(cartKey);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.cartKey !== cartKey) return item;
        const capped = item.maxStock > 0 ? Math.min(quantity, item.maxStock) : quantity;
        return { ...item, quantity: capped };
      })
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => setCartItems([]), []);

  // Legacy helpers (by _id only — returns true if ANY variant of this product is in cart)
  const isInCart = useCallback((productId) =>
    cartItems.some((item) => item._id === productId), [cartItems]);

  const getItemQuantity = useCallback((productId) => {
    return cartItems
      .filter((item) => item._id === productId)
      .reduce((s, item) => s + item.quantity, 0);
  }, [cartItems]);

  const value = {
    cartItems,
    cartTotal,
    cartItemCount,
    isCartOpen,
    setIsCartOpen,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    isInCart,
    getItemQuantity,
    buildCartKey,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
