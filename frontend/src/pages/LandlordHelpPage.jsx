import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, ChevronDown, ChevronUp, ArrowLeft, HelpCircle,
  Home, ShieldCheck, User, PlusCircle, Image, Edit,
  Layers, Users, Calendar, Wallet, BarChart3
} from 'lucide-react';

const faqCategories = [
  {
    id: 'setup',
    title: 'Registration & Profile',
    icon: User,
    items: [
      {
        question: 'How do I register as a Landlord?',
        answer: 'Select the "Landlord" role during account registration or profile setup. Fill out your Landlord details (full name, email, phone number) and upload your official profile details and supporting documents.'
      },
      {
        question: 'How does verification work for landlords?',
        answer: 'To protect our student and local tenant community, our admin team reviews your registered details and documents. Once verified, you will be authorized to list vacant residential or commercial properties.'
      },
      {
        question: 'How do I edit my landlord profile details?',
        answer: 'Visit the "Profile" or "Settings" tab in your Landlord Dashboard. You can update your business profile, contact details, or bio. Updates will automatically synchronize your profile photo back to the root avatar field in the database.'
      }
    ]
  },
  {
    id: 'properties',
    title: 'Property Listings Management',
    icon: Home,
    items: [
      {
        question: 'How do I add a new property listing?',
        answer: 'Click "Properties" on your sidebar navigation, then click the "Add New Property" button. Enter detailed specifications, price per month, deposits required, location (county/town), and category, then hit submit.'
      },
      {
        question: 'How do I upload or manage property images?',
        answer: 'During property creation or edit, you can drag and drop high-quality images. The system processes them securely using our integrated file services. We highly recommend using a standard horizontal orientation for best results on the listing cards.'
      },
      {
        question: 'What are the standardized property categories?',
        answer: 'ConnectHub standardizes the rental type enum in the backend and page filters to support: "single", "bedsitter", "one-bedroom", "two-bedroom", "three-bedroom", "apartment", "hostel", and "commercial". Ensure you map your property to these categories to ensure synchronized search displays.'
      },
      {
        question: 'How do I edit an existing listing?',
        answer: 'Go to the "Properties" tab, click the specific property you wish to update, and choose "Edit Property". You can alter the price, description, images, or availability status instantly.'
      }
    ]
  },
  {
    id: 'tenants-bookings',
    title: 'Tenants & Bookings',
    icon: Calendar,
    items: [
      {
        question: 'How do rental bookings work?',
        answer: 'When a tenant finds your listing, they can book a viewing or pay a deposit via M-Pesa. This registers a pending booking request on your dashboard under the "Bookings" tab.'
      },
      {
        question: 'How do I approve or manage tenants?',
        answer: 'From the "Bookings" view, you can check the tenant details, contact them directly via our chat or phone call, and toggle their status to "Approved" or "Occupied".'
      },
      {
        question: 'How do I view my rental payment history?',
        answer: 'All payments made by tenants are tracked in real-time. You can view successful transactions, invoices, and rental deposit breakdowns directly inside the "Bookings" or "Wallet" tab.'
      }
    ]
  },
  {
    id: 'payouts-stats',
    title: 'Wallet, Payouts & Analytics',
    icon: Wallet,
    items: [
      {
        question: 'How do I withdraw my earnings?',
        answer: 'Go to your Landlord Wallet. You can view your current balance and click "Withdraw" to instantly transfer rent collections directly to your registered M-Pesa phone number.'
      },
      {
        question: 'What stats can I see on my dashboard?',
        answer: 'The Landlord Dashboard provides detailed summaries of your total properties, occupied rooms, active tenants, total collected rent, monthly revenue breakdowns, and user ratings.'
      }
    ]
  }
];

const LandlordHelpPage = () => {
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
            to="/landlord/dashboard"
            className="p-2 text-neutral-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Landlord Help Center</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Learn how to manage listings, track tenant bookings, process rent, and review payout earnings</p>
          </div>
        </div>
        <Link
          to="/landlord/dashboard"
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
          placeholder="Search landlord topics (e.g. listings, bookings, verification)..."
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
          <h3 className="font-bold text-neutral-850">No landlord topics matched</h3>
          <p className="text-neutral-500 text-sm mt-1">Please try searching another term or contact manual support desk.</p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors shadow-sm"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default LandlordHelpPage;