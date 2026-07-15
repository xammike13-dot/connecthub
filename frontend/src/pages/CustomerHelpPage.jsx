import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, ChevronDown, ChevronUp, ArrowLeft, HelpCircle,
  UserPlus, ShieldCheck, ShoppingBag, ShoppingCart, CreditCard,
  Truck, Home, Bike, Heart, Wallet, Bell, Trash2, RefreshCw
} from 'lucide-react';

const faqCategories = [
  {
    id: 'account',
    title: 'Account & Verification',
    icon: UserPlus,
    items: [
      {
        question: 'How do I create a ConnectHub account?',
        answer: 'To create an account, click the "Sign Up" button on the homepage. Choose your role as "Customer", fill in your name, email, phone number, and password, then click "Register".'
      },
      {
        question: 'How do I verify my email and phone number?',
        answer: 'After registering, you will be redirected to the verification page. An email containing a verification link is automatically sent to your registered email address. For phone verification, a security code will be sent to your phone number via SMS to ensure the account belongs to you.'
      }
    ]
  },
  {
    id: 'shopping',
    title: 'Shopping & Cart',
    icon: ShoppingBag,
    items: [
      {
        question: 'How do I shop on ConnectHub?',
        answer: 'You can browse products by visiting the "Marketplace" from the main navigation. You can filter products by standardized categories like Food, Household, Electronics, Fashion, Gas, Wines & Spirits, Second Hand, and Health Care.'
      },
      {
        question: 'How do I add products to my cart?',
        answer: 'Click on any product in the Marketplace to view its details. On the product card or detail view, click the "Add to Cart" button. The cart counter in the navigation bar will automatically update.'
      }
    ]
  },
  {
    id: 'checkout',
    title: 'Checkout & Payments',
    icon: CreditCard,
    items: [
      {
        question: 'How do I checkout and place an order?',
        answer: 'Click the Cart icon in the navbar to open your cart page. Review your items, then click "Proceed to Checkout". Provide your delivery details and choose your preferred payment method.'
      },
      {
        question: 'How do M-Pesa payments work?',
        answer: 'When you select M-Pesa during checkout, you will enter your M-Pesa mobile number. An STK push prompt will be sent directly to your phone. Enter your M-Pesa PIN to complete the payment safely. Once completed, your transaction will show as "Paid".'
      }
    ]
  },
  {
    id: 'tracking',
    title: 'Order Tracking & Management',
    icon: Truck,
    items: [
      {
        question: 'How can I track my orders?',
        answer: 'You can track your orders by going to the "My Orders" tab on your Customer Dashboard. Each order displays its real-time status: Processing, Paid, Shipped, or Delivered.'
      },
      {
        question: 'Can I cancel an order?',
        answer: 'Yes, you can request order cancellation from the order details page if the order is still "Processing" or "Paid" but not yet shipped. If a business cancels an order due to out of stock, you will be notified instantly.'
      },
      {
        question: 'How do refunds work on ConnectHub?',
        answer: 'If your order is cancelled or a return is approved, the refund is automatically processed. Funds are immediately returned to your ConnectHub online Wallet, which you can use for other purchases or withdraw via M-Pesa.'
      }
    ]
  },
  {
    id: 'rentals-rides',
    title: 'Rentals, Rides & Healthcare',
    icon: Home,
    items: [
      {
        question: 'How do I book a rental property?',
        answer: 'Go to the "Rentals" section from the navbar or dashboard. Search through single, bedsitter, one-bedroom, two-bedroom, three-bedroom, apartment, hostel, or commercial listings. Click a property to see its detail page and follow the booking instructions.'
      },
      {
        question: 'How do I request a ride (Bodaboda)?',
        answer: 'Go to the "Bodaboda" or "Transport" section. Enter your pick-up point, destination, and select an active, online rider. You will see their estimated rate per kilometre before initiating the ride request.'
      },
      {
        question: 'How do I make healthcare purchases?',
        answer: 'Navigate to the "Healthcare" shop from the navbar. Select verified medical and wellness products, add them to your cart, and proceed with our highly secure payment processing.'
      }
    ]
  },
  {
    id: 'wallet-notifications',
    title: 'Wallet & Notifications',
    icon: Wallet,
    items: [
      {
        question: 'What is the ConnectHub Wallet?',
        answer: 'Your Wallet stores online funds, cashbacks, and refunds. You can deposit money into your Wallet via M-Pesa or use your existing balance to quickly checkout without waiting for M-Pesa prompts.'
      },
      {
        question: 'How do notifications work?',
        answer: 'We send you real-time notifications for order updates, rental approvals, active ride requests, payment confirmations, and chat messages. Unread counts are always visible at the top bell icon.'
      }
    ]
  }
];

const CustomerHelpPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState({}); // track toggles by category-item index

  const toggleAccordion = (catId, itemIdx) => {
    const key = `${catId}-${itemIdx}`;
    setOpenIndex(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Filter FAQs based on search query
  const filteredCategories = faqCategories.map(category => {
    const filteredItems = category.items.filter(item =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return {
      ...category,
      items: filteredItems
    };
  }).filter(category => category.items.length > 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header with Back to Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div className="flex items-center gap-3">
          <Link
            to="/customer/dashboard"
            className="p-2 text-neutral-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Customer Help Center</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Everything you need to know about shopping, bookings, and payments</p>
          </div>
        </div>
        <Link
          to="/customer/dashboard"
          className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors text-sm font-semibold text-center sm:self-auto"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-lg">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
        <input
          type="text"
          placeholder="Search for answers (e.g. M-Pesa, rentals, checkout)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm transition-all outline-none"
        />
      </div>

      {/* FAQ content */}
      {filteredCategories.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* FAQ Categories Nav for Desktop */}
          <div className="lg:col-span-1 space-y-2 hidden lg:block sticky top-24 self-start">
            <h3 className="font-bold text-neutral-800 text-sm uppercase tracking-wider mb-3 px-3">Categories</h3>
            {filteredCategories.map((category) => {
              const IconComponent = category.icon;
              return (
                <a
                  key={category.id}
                  href={`#cat-${category.id}`}
                  className="flex items-center gap-3 p-3 bg-white hover:bg-blue-50/50 border border-neutral-200/60 rounded-xl transition-all hover:border-blue-200 group text-sm font-medium text-neutral-700 hover:text-blue-700"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:bg-blue-100 transition-colors">
                    <IconComponent className="w-4 h-4" />
                  </div>
                  {category.title}
                </a>
              );
            })}
          </div>

          {/* FAQ Accordions */}
          <div className="lg:col-span-2 space-y-8">
            {filteredCategories.map((category) => {
              const IconComponent = category.icon;
              return (
                <div key={category.id} id={`cat-${category.id}`} className="space-y-3.5 scroll-mt-24">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-neutral-200/80">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold text-neutral-850">{category.title}</h2>
                  </div>

                  <div className="space-y-3">
                    {category.items.map((item, idx) => {
                      const isOpen = !!openIndex[`${category.id}-${idx}`];
                      return (
                        <div
                          key={idx}
                          className="bg-white border border-neutral-200 rounded-xl overflow-hidden transition-all shadow-sm"
                        >
                          <button
                            onClick={() => toggleAccordion(category.id, idx)}
                            className="w-full flex items-center justify-between p-4 text-left font-semibold text-neutral-800 text-sm hover:bg-neutral-50/50 transition-colors"
                          >
                            <span className="pr-4">{item.question}</span>
                            {isOpen ? (
                              <ChevronUp className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                            )}
                          </button>
                          {isOpen && (
                            <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-neutral-600 border-t border-neutral-100 bg-neutral-50/30 leading-relaxed">
                              {item.answer}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white border border-neutral-200 rounded-2xl">
          <HelpCircle className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="font-bold text-neutral-850">No questions match your search</h3>
          <p className="text-neutral-500 text-sm mt-1">Try typing another keyword or check our categories.</p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors shadow-sm"
          >
            Clear Search Filter
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomerHelpPage;