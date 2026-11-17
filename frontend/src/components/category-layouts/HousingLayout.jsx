// HousingLayout.jsx – dedicated layout for rentals and student hostels
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  Wifi, 
  Droplets, 
  Zap, 
  ShieldCheck, 
  Bath, 
  PhoneCall, 
  CheckCircle2, 
  Calendar,
  SlidersHorizontal,
  Home,
  BedDouble,
  DoorOpen,
  Sparkles
} from 'lucide-react';

export default function HousingLayout({ category }) {
  const [selectedRoomType, setSelectedRoomType] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedPriceTier, setSelectedPriceTier] = useState('all');
  const [vacantOnly, setVacantOnly] = useState(true);

  // Campus location tags around Moi University
  const locations = ['all', 'Kesses', 'Stage', 'Chebarus', 'Mabs', 'Annex', 'Gate A', 'Gate B'];

  const roomTypes = category.slug === 'hostels' 
    ? ['all', 'Private Hostels', 'Shared Hostels', 'Executive Hostels', 'En-suite Rooms']
    : ['all', 'Bedsitters', 'Single Rooms', '1-Bedroom', '2-Bedroom', 'Commercial Stalls'];

  const priceTiers = [
    { id: 'all', label: 'All Budgets' },
    { id: 'under-3500', label: '< KSh 3,500/mo', min: 0, max: 3500 },
    { id: '3500-5500', label: 'KSh 3.5k - 5.5k', min: 3500, max: 5500 },
    { id: '5500-8500', label: 'KSh 5.5k - 8.5k', min: 5500, max: 8500 },
    { id: '8500-plus', label: 'KSh 8.5k+/mo', min: 8500, max: Infinity },
  ];

  // Curated campus housing listings
  const housingListings = useMemo(() => [
    {
      _id: 'house-1',
      title: 'Sunrise Heights Executive Bedsitter',
      roomType: 'Bedsitters',
      location: 'Stage',
      price: 5000,
      deposit: 5000,
      vacantUnits: 2,
      walkingTime: '3 min walk to Stage',
      landlord: 'Mzee Mwangi (Verified)',
      phone: '0712345678',
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
      amenities: [
        { label: 'Free High-speed WiFi', icon: Wifi },
        { label: 'Borehole Water 24/7', icon: Droplets },
        { label: 'Individual Token Meter', icon: Zap },
        { label: 'Perimeter Wall & Guard', icon: ShieldCheck },
        { label: 'Inside Tiled Washroom', icon: Bath },
      ],
      features: ['Tiled floors', 'Kitchen counter with sink', 'Balcony view', 'Spacious closet'],
    },
    {
      _id: 'house-2',
      title: 'Green Valley Student Haven',
      roomType: category.slug === 'hostels' ? 'Executive Hostels' : 'Single Rooms',
      location: 'Chebarus',
      price: 3800,
      deposit: 3000,
      vacantUnits: 4,
      walkingTime: '5 min walk to Main Gate',
      landlord: 'Mama Grace (Caretaker)',
      phone: '0723456789',
      image: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80',
      amenities: [
        { label: 'Constant Tap Water', icon: Droplets },
        { label: 'Campus WiFi Zone', icon: Wifi },
        { label: 'Security Gate', icon: ShieldCheck },
        { label: 'Caretaker On-site', icon: CheckCircle2 },
      ],
      features: ['Silent study environment', 'DSTV in common room', 'Garbage collection included'],
    },
    {
      _id: 'house-3',
      title: 'Apex Modern 1-Bedroom Suites',
      roomType: '1-Bedroom',
      location: 'Kesses',
      price: 7500,
      deposit: 7500,
      vacantUnits: 1,
      walkingTime: '10 min walk to Campus',
      landlord: 'Apex Properties Ltd',
      phone: '0734567890',
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
      amenities: [
        { label: 'High-speed Fibre WiFi', icon: Wifi },
        { label: 'Hot Shower Installed', icon: Bath },
        { label: 'Borehole + County Water', icon: Droplets },
        { label: 'CCTV & Night Guard', icon: ShieldCheck },
        { label: 'Tokens Pre-installed', icon: Zap },
      ],
      features: ['Separate living room', 'Modern kitchenette', 'Paved compound', 'Private balcony'],
    },
    {
      _id: 'house-4',
      title: 'Comrades Crown Hostel & Suites',
      roomType: category.slug === 'hostels' ? 'Shared Hostels' : 'Bedsitters',
      location: 'Mabs',
      price: 4200,
      deposit: 4000,
      vacantUnits: 3,
      walkingTime: '4 min walk to Lecture Halls',
      landlord: 'Mwalimu Otieno',
      phone: '0745678901',
      image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
      amenities: [
        { label: 'Uncapped Comrade WiFi', icon: Wifi },
        { label: 'Overhead Water Tanks', icon: Droplets },
        { label: 'Biometric Gate Access', icon: ShieldCheck },
        { label: 'Electric Fence', icon: Zap },
      ],
      features: ['Furnished bed & study chair', 'Near grocery stalls', 'Water included in rent'],
    },
  ], [category.slug]);

  // Filter listings
  const filteredListings = useMemo(() => {
    return housingListings.filter((h) => {
      if (selectedRoomType !== 'all' && h.roomType !== selectedRoomType) return false;
      if (selectedLocation !== 'all' && h.location !== selectedLocation) return false;
      if (vacantOnly && h.vacantUnits <= 0) return false;

      if (selectedPriceTier !== 'all') {
        const tier = priceTiers.find((t) => t.id === selectedPriceTier);
        if (tier && (h.price < tier.min || h.price > tier.max)) return false;
      }
      return true;
    });
  }, [housingListings, selectedRoomType, selectedLocation, selectedPriceTier, vacantOnly]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* ── Housing Hero Banner ─────────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(107,227,25,0.15),transparent_50%)]" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/60 border border-emerald-500/40 text-emerald-200 text-xs font-bold mb-3">
                <Building2 size={14} className="text-[#6BE319]" />
                Verified Campus Housing · Zero Broker Fraud
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-white">
                {category.label}
              </h1>
              <p className="text-emerald-100 text-sm md:text-base mt-2 max-w-2xl leading-relaxed">
                Direct booking with verified landlords and caretakers around Moi University, Stage, Kesses & Chebarus. No hidden agent fees.
              </p>
            </div>

            {/* Quick Stat Pill */}
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 self-start md:self-auto">
              <div className="w-10 h-10 rounded-xl bg-[#6BE319] text-gray-900 flex items-center justify-center font-black text-lg">
                🏠
              </div>
              <div>
                <p className="text-xs text-emerald-200 font-medium">Available Units</p>
                <p className="text-lg font-black text-white">{filteredListings.length} Verified Vacancies</p>
              </div>
            </div>
          </div>

          {/* Location Badges Horizontal Scroll */}
          <div className="mt-6 pt-6 border-t border-emerald-700/60">
            <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider mb-2">
              Filter by Campus Zone
            </p>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-hide pb-1">
              {locations.map((loc) => (
                <button
                  key={loc}
                  onClick={() => setSelectedLocation(loc)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer
                    ${selectedLocation === loc
                      ? 'bg-[#6BE319] text-gray-900 shadow-md scale-105'
                      : 'bg-emerald-800/80 text-emerald-100 border border-emerald-700 hover:bg-emerald-700'
                    }`}
                >
                  {loc === 'all' ? 'All Zones' : `📍 ${loc}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters & Controls Bar ──────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 shadow-xs sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Room type tabs */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-hide py-1">
              {roomTypes.map((rt) => (
                <button
                  key={rt}
                  onClick={() => setSelectedRoomType(rt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer
                    ${selectedRoomType === rt
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {rt === 'all' ? 'All Room Types' : rt}
                </button>
              ))}
            </div>

            {/* Price tier selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-semibold hidden sm:inline">Budget:</span>
              <select
                value={selectedPriceTier}
                onChange={(e) => setSelectedPriceTier(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
              >
                {priceTiers.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Listings Container ──────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="space-y-6">
          {filteredListings.map((listing) => (
            <div 
              key={listing._id}
              className="bg-white rounded-3xl overflow-hidden border border-gray-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col lg:flex-row group"
            >
              {/* ── Edge-to-Edge Image Section ────────────────────── */}
              <div className="relative w-full lg:w-2/5 aspect-[16/10] lg:aspect-auto bg-gray-100 overflow-hidden flex-shrink-0">
                <img
                  src={listing.image}
                  alt={listing.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:hidden" />

                {/* Badges on image */}
                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-md flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    {listing.vacantUnits} Vacant Units
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/95 backdrop-blur-xs text-gray-900 shadow-sm">
                    {listing.roomType}
                  </span>
                </div>

                <div className="absolute bottom-4 left-4 text-white lg:hidden">
                  <p className="text-xl font-black">KSh {listing.price.toLocaleString()} <span className="text-xs font-normal">/ month</span></p>
                </div>
              </div>

              {/* ── Details & Amenities Section ───────────────────── */}
              <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-emerald-800 font-bold mb-1">
                        <MapPin size={14} className="text-[#027A2B]" />
                        <span>{listing.location} · {listing.walkingTime}</span>
                      </div>
                      <h2 className="text-xl md:text-2xl font-black text-gray-900 group-hover:text-emerald-700 transition-colors">
                        {listing.title}
                      </h2>
                    </div>

                    <div className="hidden lg:text-right lg:block">
                      <p className="text-2xl font-black text-[#027A2B]">
                        KSh {listing.price.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 font-medium">per month · Deposit KSh {listing.deposit.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Amenity Icons Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-4 pt-3 border-t border-gray-100">
                    {listing.amenities.map((amenity, i) => {
                      const IconComponent = amenity.icon;
                      return (
                        <div 
                          key={i} 
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-700 font-medium"
                        >
                          <IconComponent size={15} className="text-emerald-600 flex-shrink-0" />
                          <span className="truncate">{amenity.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Highlights */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {listing.features.map((feat, i) => (
                      <span key={i} className="text-[11px] font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md">
                        ✓ {feat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom CTA Row */}
                <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 w-full sm:w-auto">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span>Manager: <strong>{listing.landlord}</strong></span>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <a
                      href={`tel:${listing.phone}`}
                      className="flex-1 sm:flex-initial px-5 py-3 rounded-xl border border-gray-300 hover:border-gray-400 text-gray-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <PhoneCall size={14} />
                      Call Caretaker
                    </a>
                    <Link
                      to="/rentals"
                      className="flex-1 sm:flex-initial px-6 py-3 rounded-xl bg-[#027A2B] hover:bg-emerald-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <DoorOpen size={15} />
                      Book Viewing / Stall
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
