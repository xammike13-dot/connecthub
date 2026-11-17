import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};

/** Build a stable string key that uniquely identifies a product+variation combo */
const buildCartKey = (productId, selectedOptions = {}, selectedAddOns = []) => {
  const optStr = JSON.stringify(
    Object.fromEntries(Object.entries(selectedOptions).sort())
  );
  const addStr = [...selectedAddOns].map(a => a.name).sort().join(',');
  return `${productId}__${optStr}__${addStr}`;
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
   */
  const addToCart = useCallback((product, quantity = 1, selectedOptions = {}, selectedAddOns = []) => {
    const cartKey = buildCartKey(product._id, selectedOptions, selectedAddOns);
    setCartItems((prevItems) => {
      const existingIdx = prevItems.findIndex((item) => item.cartKey === cartKey);
      if (existingIdx !== -1) {
        return prevItems.map((item, idx) =>
          idx === existingIdx ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [
        ...prevItems,
        {
          ...product,
          cartKey,
          quantity,
          selectedOptions,
          selectedAddOns,
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
      prev.map((item) => item.cartKey === cartKey ? { ...item, quantity } : item)
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
