import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, ChevronDown, ChevronUp, ArrowLeft, HelpCircle,
  Bike, ShieldCheck, User, Image, MapPin, Clock, DollarSign,
  Power, CheckCircle2, Star, Wallet
} from 'lucide-react';

const faqCategories = [
  {
    id: 'setup',
    title: 'Registration & Verification',
    icon: User,
    items: [
      {
        question: 'How do I register as a Rider on ConnectHub?',
        answer: 'During account registration, choose the "Rider" role. Fill out the Rider Setup form with your full name, phone number, working area (County, Town), standard motorcycle details, and rate per kilometre.'
      },
      {
        question: 'What documents/photos must I upload?',
        answer: 'You must upload a clear professional Profile Photo (which synchronizes back to your main account avatar) and a high-resolution Motorcycle Photo. These are visible to customers to ensure safety and transparency.'
      },
      {
        question: 'How do working areas and hours work?',
        answer: 'In your Rider Profile, you specify your working area county, town, and your active service radius (e.g. 5km, 10km). You can also set your working hours. The system uses these nested workingArea objects to map you to relevant nearby customer requests.'
      },
      {
        question: 'How do I set my rate per kilometre?',
        answer: 'Navigate to your Profile or Settings page. Enter your desired rate per kilometre (e.g. KES 50). This rate is used to calculate the exact estimated fare shown to customers based on pick-up and drop-off coordinates.'
      }
    ]
  },
  {
    id: 'operations',
    title: 'Going Online & Accepting Rides',
    icon: Power,
    items: [
      {
        question: 'How do I toggle my online/offline status?',
        answer: 'On your Rider Dashboard, there is a prominent "Go Online" / "Go Offline" switch. When online, customers in your working area will see you as available on their live transport map and can send you ride requests.'
      },
      {
        question: 'How do I accept or decline a ride request?',
        answer: 'When a customer requests a ride, a real-time sound/popup prompt appears on your dashboard under "Ride Requests". You can view the pickup, destination, distance, and total estimated fare. Click "Accept" to lock in the request, or "Decline" if you are occupied.'
      },
      {
        question: 'How do I complete a ride?',
        answer: 'Once you pickup the client and arrive at the destination, click the "Complete Ride" button on your active ride interface. This updates the ride status in the database and prepares the payment checkout.'
      }
    ]
  },
  {
    id: 'earnings-ratings',
    title: 'Earnings & Rider Ratings',
    icon: Wallet,
    items: [
      {
        question: 'How do rider payouts and commission work?',
        answer: 'Payments completed by customers via M-Pesa or Wallet are split dynamically based on system commission rates. Your share is deposited instantly into your online Wallet.'
      },
      {
        question: 'How can I withdraw my earnings?',
        answer: 'Go to your Rider Wallet, enter the amount you wish to withdraw, and request an instant payout directly to your M-Pesa registered phone number.'
      },
      {
        question: 'How do ratings work for riders?',
        answer: 'After a ride is completed, customers can rate their experience from 1 to 5 stars. Your average rating is displayed on your profile and dashboard. Highly-rated riders enjoy priority placement on customer maps.'
      }
    ]
  }
];

const RiderHelpPage = () => {
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
            to="/rider/dashboard"
            className="p-2 text-neutral-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Rider Help Center</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Learn how to manage your availability, accept ride requests, set rates, and track your wallet earnings</p>
          </div>
        </div>
        <Link
          to="/rider/dashboard"
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
          placeholder="Search rider guides (e.g. rate, online, working hours, wallet)..."
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
          <h3 className="font-bold text-neutral-850">No rider topics found</h3>
          <p className="text-neutral-500 text-sm mt-1">Please refine your search terms or view category listings above.</p>
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

export default RiderHelpPage;