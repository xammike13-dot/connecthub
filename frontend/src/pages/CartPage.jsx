import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard,
  ShoppingBag,
  ArrowRight,
  Package,
} from 'lucide-react';
import Button from '../components/ui/Button';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { calculatePayment, formatCurrency } from '../utils/paymentCalculator';

const CartPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    cartItems, 
    cartTotal, 
    cartItemCount,
    updateQuantity, 
    removeFromCart, 
    clearCart 
  } = useCart();
  const [removingItems, setRemovingItems] = useState(new Set());

  // Delivery fee is only included when explicitly entered (default: 0)
  // No automatic delivery fee calculation
  const deliveryFee = 0;
  
  // Use centralized payment calculator (NO VAT, NO tax)
  const paymentBreakdown = calculatePayment(cartTotal, deliveryFee);
  const grandTotal = paymentBreakdown.customerPays;

  const handleRemove = (productId) => {
    setRemovingItems((prev) => new Set(prev).add(productId));
    setTimeout(() => {
      removeFromCart(productId);
      setRemovingItems((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }, 300);
  };

  const handleCheckout = () => {
    if (!user) {
      navigate('/login', { state: { from: '/cart' } });
      return;
    }
    navigate('/checkout');
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Your cart is empty
          </h2>
          <p className="text-gray-500 mb-6">
            Looks like you haven't added anything to your cart yet.
          </p>
          <Link to="/marketplace">
            <Button>
              Start Shopping
              <ShoppingBag className="ml-2" size={18} />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <ShoppingCart className="w-6 h-6" />
            Shopping Cart
            <span className="bg-blue-100 text-blue-600 text-sm font-medium px-3 py-1 rounded-full">
              {cartItemCount} items
            </span>
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {cartItems.map((item) => (
                <motion.div
                  key={item._id}
                  layout
                  initial={{ opacity: 1, x: 0 }}
                  animate={{
                    opacity: removingItems.has(item._id) ? 0 : 1,
                    x: removingItems.has(item._id) ? -100 : 0,
                  }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-xl shadow-md p-4 flex gap-4"
                >
                  {/* Product Image */}
                  <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={item.images?.[0] || 'https://via.placeholder.com/100?text=No+Image'}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/marketplace/${item._id}`}
                      className="font-semibold text-gray-900 hover:text-blue-600 line-clamp-2"
                    >
                      {item.name}
                    </Link>
                    <p className="text-sm text-gray-500 mt-1">
                      {item.category}
                    </p>
                    <p className="text-lg font-bold text-gray-900 mt-2">
                      KSh {item.price?.toLocaleString() || 0}
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => handleRemove(item._id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => updateQuantity(item._id, item.quantity - 1)}
                        className="p-1 hover:bg-white rounded transition-colors"
                        disabled={item.quantity <= 1}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item._id, item.quantity + 1)}
                        className="p-1 hover:bg-white rounded transition-colors"
                        disabled={item.quantity >= (item.stock || 10)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Clear Cart Button */}
            <div className="flex justify-between items-center pt-4">
              <Button
                variant="outline"
                onClick={clearCart}
                leftIcon={<Trash2 size={16} />}
              >
                Clear Cart
              </Button>
              <Link to="/marketplace" className="text-blue-600 hover:underline text-sm">
                Continue Shopping
              </Link>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Package size={20} />
                Order Summary
              </h2>

              <div className="space-y-3">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({cartItemCount} items)</span>
                  <span>{formatCurrency(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Fee</span>
                  <span>
                    {deliveryFee === 0 ? (
                      <span className="text-green-600 font-medium">FREE</span>
                    ) : (
                      formatCurrency(deliveryFee)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Platform Fee (Customer Share 5%)</span>
                  <span>{formatCurrency(paymentBreakdown.customerShare)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-lg font-bold text-gray-900">
                    <span>Total To Pay</span>
                    <span>{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>

              {cartTotal >= 2000 && (
                <div className="mt-4 bg-green-50 text-green-700 text-sm p-3 rounded-lg flex items-center gap-2">
                  <Package size={14} />
                  You qualify for free delivery!
                </div>
              )}

              <Button
                fullWidth
                size="lg"
                className="mt-6"
                onClick={handleCheckout}
                rightIcon={<ArrowRight size={18} />}
              >
                Proceed to Checkout
              </Button>

              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                <CreditCard size={16} />
                Secure checkout with M-Pesa
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;