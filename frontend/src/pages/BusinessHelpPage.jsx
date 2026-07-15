import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, ChevronDown, ChevronUp, ArrowLeft, HelpCircle,
  Store, ShieldCheck, User, Image, PlusCircle, Edit, List,
  Layers, Users, Package, Truck, Wallet, BarChart3, AlertCircle
} from 'lucide-react';

const faqCategories = [
  {
    id: 'setup',
    title: 'Registration & Verification',
    icon: Store,
    items: [
      {
        question: 'How do I register a Business on ConnectHub?',
        answer: 'During or after setup, choose the "Business" role. Fill out your Business Setup form with business name, category, operations description, location, contact, and upload your official licensing/identification documents.'
      },
      {
        question: 'How does business verification work?',
        answer: 'Once you submit your setup form, ConnectHub admins review your details and uploaded verification files. You will receive an email confirmation once approved, unlocking full catalog publishing privileges.'
      },
      {
        question: 'How do I manage my business profile and logo?',
        answer: 'Go to your Profile tab under the Business Dashboard. Here, you can edit your business name, description, and upload/change your company logo. Logo uploads are automatically synchronized back to your user account avatar.'
      }
    ]
  },
  {
    id: 'catalog',
    title: 'Products & Inventory',
    icon: PlusCircle,
    items: [
      {
        question: 'How do I add a new product?',
        answer: 'Go to the "Products" tab on your dashboard, click "Add Product", select a standardized category, fill out the form (title, description, stock, price), upload the product images, and save.'
      },
      {
        question: 'How do I edit or delete products?',
        answer: 'On your Products list, click the Edit icon next to any product to modify its price, description, images, or stock levels. You can also temporarily archive or permanently delete products from this view.'
      },
      {
        question: 'What product categories are standardized?',
        answer: 'ConnectHub standardizes products under case-insensitive categories including: Food, Household, Electronics, Fashion, Gas, Wines & Spirits, Second Hand, and Health Care.'
      },
      {
        question: 'How do I manage my inventory?',
        answer: 'Each product has a stock field. When orders are placed, the system automatically decrements stock. If stock reaches zero, the product automatically displays as "Out of Stock" to customers.'
      }
    ]
  },
  {
    id: 'orders-delivery',
    title: 'Orders, Delivery & Customers',
    icon: Package,
    items: [
      {
        question: 'How do I manage incoming customer orders?',
        answer: 'Incoming orders appear under the "Orders" tab. You can view order details, track customer details, and update the status from processing to shipped or delivered.'
      },
      {
        question: 'How does delivery management work?',
        answer: 'Once you prepare and pack an order, you can hand it over to a delivery partner or dispatch it yourself. Update the order status to "Shipped" and subsequently "Delivered" once the customer receives it.'
      },
      {
        question: 'How do I manage customers?',
        answer: 'The ConnectHub backend provides a "Customers" tab where you can search, view, and analyze customer metrics such as total spending, transaction count, order history, and contact details.'
      }
    ]
  },
  {
    id: 'finances-stats',
    title: 'Payments, Earnings & Analytics',
    icon: Wallet,
    items: [
      {
        question: 'When do I receive payments for orders?',
        answer: 'Once a customer receives their order and marks it as delivered, funds are instantly transferred into your online Wallet minus any commission fees.'
      },
      {
        question: 'How do I view my earnings and withdraw funds?',
        answer: 'Go to the "Earnings" or "Wallet" tab. You can view your completed sales, commission share, and execute instant withdrawals directly to your registered M-Pesa phone number.'
      },
      {
        question: 'What dashboard statistics are available?',
        answer: 'Your Business Dashboard provides dynamic, real-time analytics. Review total sales, total orders completed, top-selling products, rating averages, and active customer counts.'
      }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Common Issues & FAQs',
    icon: AlertCircle,
    items: [
      {
        question: 'Why are my nested business profile updates resetting other fields?',
        answer: 'The system uses standardized dot-notation updates to perform partial modifications on nested fields (e.g. user.businessProfile.businessName). This ensures that your business statistics, rating, or order counts are never accidentally overwritten.'
      },
      {
        question: 'What should I do if my product image is not showing?',
        answer: 'Ensure that the image file size is within limits (less than 5MB) and of correct format (PNG, JPG). If you upload images through external URLs, ensure the URLs are public and secure.'
      }
    ]
  }
];

const BusinessHelpPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState({});

  const toggleAccordion = (catId, itemIdx) => {
    const key = `${catId}-${itemIdx}`;
    setOpenIndex(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

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
            to="/business/dashboard"
            className="p-2 text-neutral-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Business Help Center</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Learn how to manage inventory, fulfill orders, track payouts, and view sales statistics</p>
          </div>
        </div>
        <Link
          to="/business/dashboard"
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
          placeholder="Search business tutorials (e.g. products, earnings, inventory)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm transition-all outline-none"
        />
      </div>

      {/* FAQ content */}
      {filteredCategories.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Categories Nav */}
          <div className="lg:col-span-1 space-y-2 hidden lg:block sticky top-24 self-start">
            <h3 className="font-bold text-neutral-800 text-sm uppercase tracking-wider mb-3 px-3">Topics</h3>
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
          <h3 className="font-bold text-neutral-850">No topics match your query</h3>
          <p className="text-neutral-500 text-sm mt-1">Please clarify your terms or scroll through standard sections above.</p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors shadow-sm"
          >
            Reset Help Filter
          </button>
        </div>
      )}
    </div>
  );
};

export default BusinessHelpPage;