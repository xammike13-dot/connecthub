// ServiceLayout.jsx – high-conversion action layout for campus essentials (Gas Refill, Bodaboda, Chemist, Print, Grooming, Gaming)
import { useState } from 'react';
import { 
  Flame, 
  Bike, 
  Pill, 
  Printer, 
  Scissors, 
  Gamepad2, 
  MapPin, 
  Phone, 
  Upload, 
  Check, 
  Clock, 
  AlertCircle, 
  FileText, 
  ShieldCheck,
  Zap,
  ChevronRight
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useToast } from '../Toast';

export default function ServiceLayout({ category }) {
  const { addToCart } = useCart();
  const { success: toastSuccess, error: toastError } = useToast();

  // ── 1. Gas Refill State ─────────────────────────────────────
  const [gasSize, setGasSize] = useState('6kg'); // '6kg' | '13kg'
  const [gasBrand, setGasBrand] = useState('Total Energies');
  const [gasServiceType, setGasServiceType] = useState('refill'); // 'refill' | 'new-cylinder'
  const [deliveryHostel, setDeliveryHostel] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // ── 2. Bodaboda State ───────────────────────────────────────
  const [bodaPickup, setBodaPickup] = useState('Stage');
  const [bodaDropoff, setBodaDropoff] = useState('Gate A (Lecture Halls)');
  const [rideType, setRideType] = useState('passenger'); // 'passenger' | 'parcel'
  const [passengerCount, setPassengerCount] = useState(1);

  // ── 3. Chemist State ────────────────────────────────────────
  const [selectedSymptom, setSelectedSymptom] = useState('Pain & Headache');
  const [discretePackage, setDiscretePackage] = useState(true);

  // ── 4. Print State ──────────────────────────────────────────
  const [printColor, setPrintColor] = useState('bw'); // 'bw' | 'color'
  const [printCopies, setPrintCopies] = useState(1);
  const [bindingType, setBindingType] = useState('stapled'); // 'stapled' | 'spiral' | 'none'
  const [uploadedFileName, setUploadedFileName] = useState('');

  // ── 5. Grooming & Gaming State ──────────────────────────────
  const [serviceOption, setServiceOption] = useState(
    category.slug === 'gaming' ? 'PS5 FIFA 1 Hour' : 'Barber Cut & Fade'
  );
  const [bookingTime, setBookingTime] = useState('Immediate / Next Available');

  // Pricing calculations
  const calculateServiceTotal = () => {
    if (category.slug === 'gas-refill') {
      const base = gasSize === '6kg' ? 1200 : 2500;
      return gasServiceType === 'new-cylinder' ? base + 3500 : base;
    }
    if (category.slug === 'boda') {
      const distanceFare = bodaPickup === bodaDropoff ? 50 : 80;
      return rideType === 'parcel' ? distanceFare + 20 : distanceFare;
    }
    if (category.slug === 'print') {
      const perPage = printColor === 'bw' ? 5 : 20;
      const bind = bindingType === 'spiral' ? 50 : 0;
      return (perPage * 10 * printCopies) + bind; // sample 10 page doc
    }
    if (category.slug === 'chemist') {
      return 150;
    }
    if (category.slug === 'gaming') {
      return 100;
    }
    if (category.slug === 'grooming') {
      return 150;
    }
    return 100;
  };

  const handleInstantDispatch = (e) => {
    e.preventDefault();
    const total = calculateServiceTotal();

    const serviceProduct = {
      _id: `svc-${category.slug}-${Date.now()}`,
      name: `${category.label} - Instant Service`,
      price: total,
      category: category.label,
      images: [],
      stock: 99,
    };

    addToCart(
      serviceProduct,
      1,
      {
        Service: category.label,
        Configuration: category.slug === 'gas-refill'
          ? `${gasBrand} ${gasSize} (${gasServiceType}) · Room ${roomNumber || 'Hostel'}`
          : category.slug === 'boda'
            ? `${bodaPickup} → ${bodaDropoff} (${rideType})`
            : category.slug === 'print'
              ? `${printColor.toUpperCase()} · ${printCopies} copies · ${bindingType}`
              : serviceOption,
      },
      []
    );

    toastSuccess(`Request placed for ${category.label}! Added to cart for instant checkout.`);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-20">
      {/* ── Emergency Service Cockpit Header ─────────────────────── */}
      <div 
        className="relative overflow-hidden border-b border-slate-800"
        style={{
          background: `radial-gradient(ellipse at top, ${category.accentColor}33 0%, #0F172A 70%)`
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/90 border border-slate-700 text-xs font-bold text-slate-200 mb-4 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#6BE319] animate-pulse" />
            Priority Campus Dispatch · Instant Response
          </div>

          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-4xl shadow-lg border border-slate-700 bg-slate-800/80">
            {category.emoji || '⚡'}
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
            {category.label}
          </h1>

          <p className="text-slate-300 text-sm md:text-base mt-2 max-w-lg mx-auto">
            {category.description || 'Fast, reliable and verified service fulfillment for comrades.'}
          </p>
        </div>
      </div>

      {/* ── Interactive Service Form Card ────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-6">
        <form 
          onSubmit={handleInstantDispatch}
          className="bg-slate-800/90 backdrop-blur-md rounded-3xl border border-slate-700 p-6 md:p-8 shadow-2xl space-y-6"
        >
          {/* ──────────────────────────────────────────────────────── */}
          {/* 1. GAS REFILL SPECIFIC COCKPIT                          */}
          {/* ──────────────────────────────────────────────────────── */}
          {category.slug === 'gas-refill' && (
            <div className="space-y-6">
              {/* Cylinder Size Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  1. Select Cylinder Size
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { size: '6kg', label: '6kg Mini Cylinder', price: 'KSh 1,200', desc: 'Standard single comrade cylinder' },
                    { size: '13kg', label: '13kg Mega Cylinder', price: 'KSh 2,500', desc: 'Extended semester supply' },
                  ].map((s) => (
                    <button
                      key={s.size}
                      type="button"
                      onClick={() => setGasSize(s.size)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        gasSize === s.size
                          ? 'border-[#FF5E00] bg-[#FF5E00]/10 text-white shadow-md'
                          : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-lg">{s.size}</span>
                        <span className="text-sm font-bold text-[#FF5E00]">{s.price}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Type (Refill vs New Set) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  2. Order Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'refill', label: 'Refill Exchange (I have empty cylinder)' },
                    { id: 'new-cylinder', label: 'Complete New Set (Cylinder + Burner + Gas)' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setGasServiceType(t.id)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        gasServiceType === t.id
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                          : 'border-slate-700 bg-slate-900/40 text-slate-400'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gas Brand Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  3. Preferred Brand
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Total Energies', 'K-Gas', 'Afrigas', 'Rubis', 'Pro-Gas', 'Shell', 'Any Compatible'].map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => setGasBrand(brand)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        gasBrand === brand
                          ? 'border-orange-500 bg-orange-500/20 text-orange-200'
                          : 'border-slate-700 bg-slate-900/40 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Hostel / Apartment Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sunrise Heights, Stage"
                    value={deliveryHostel}
                    onChange={(e) => setDeliveryHostel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#FF5E00]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Room No. / Floor *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Room B12, 2nd Floor"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#FF5E00]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* 2. BODABODA SPECIFIC COCKPIT                            */}
          {/* ──────────────────────────────────────────────────────── */}
          {category.slug === 'boda' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRideType('passenger')}
                  className={`p-3 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                    rideType === 'passenger'
                      ? 'border-[#FF5E00] bg-[#FF5E00]/20 text-white'
                      : 'border-slate-700 bg-slate-900/40 text-slate-400'
                  }`}
                >
                  🏍️ Passenger Ride
                </button>
                <button
                  type="button"
                  onClick={() => setRideType('parcel')}
                  className={`p-3 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                    rideType === 'parcel'
                      ? 'border-[#FF5E00] bg-[#FF5E00]/20 text-white'
                      : 'border-slate-700 bg-slate-900/40 text-slate-400'
                  }`}
                >
                  📦 Fast Parcel Courier
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Pickup Location</label>
                  <select
                    value={bodaPickup}
                    onChange={(e) => setBodaPickup(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-[#FF5E00]"
                  >
                    {['Stage', 'Chebarus', 'Kesses', 'Gate A', 'Mabs', 'Annex', 'Hostels'].map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Destination</label>
                  <select
                    value={bodaDropoff}
                    onChange={(e) => setBodaDropoff(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-[#FF5E00]"
                  >
                    {['Gate A (Lecture Halls)', 'Stage', 'Chebarus', 'Kesses', 'Mabs', 'Annex', 'Student Center'].map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* 3. PRINT & STATIONERY SPECIFIC COCKPIT                  */}
          {/* ──────────────────────────────────────────────────────── */}
          {category.slug === 'print' && (
            <div className="space-y-5">
              {/* File Upload Zone */}
              <div className="border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center hover:border-slate-500 transition-colors bg-slate-900/50 cursor-pointer">
                <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-bold text-white">Upload Assignment / Document (PDF, DOCX)</p>
                <p className="text-xs text-slate-500 mt-1">Tap to browse files or drag and drop here</p>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.ppt,.pptx"
                  onChange={(e) => setUploadedFileName(e.target.files?.[0]?.name || '')}
                  className="mt-3 text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#FF5E00] file:text-white"
                />
                {uploadedFileName && (
                  <p className="text-xs text-emerald-400 mt-2 font-bold">✓ Ready: {uploadedFileName}</p>
                )}
              </div>

              {/* Color & Binding options */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Print Color Mode</label>
                  <select
                    value={printColor}
                    onChange={(e) => setPrintColor(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
                  >
                    <option value="bw">Black & White (KSh 5/pg)</option>
                    <option value="color">Full Color (KSh 20/pg)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Binding Preference</label>
                  <select
                    value={bindingType}
                    onChange={(e) => setBindingType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
                  >
                    <option value="stapled">Corner Stapled (Free)</option>
                    <option value="spiral">Spiral Binding (+KSh 50)</option>
                    <option value="none">No Binding (Loose pages)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* 4. CHEMIST & WELLNESS SPECIFIC COCKPIT                   */}
          {/* ──────────────────────────────────────────────────────── */}
          {category.slug === 'chemist' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Select Symptoms / Requirement
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Pain & Headache', 'Cold, Flu & Cough', 'First Aid & Cuts', 'Stomach Upset & Antacid', 'Vitamins & Zinc', 'Personal Hygiene'].map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => setSelectedSymptom(sym)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        selectedSymptom === sym
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200'
                          : 'border-slate-700 bg-slate-900/40 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-700/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Discreet Hostel Packaging</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Opaque brown wrap with zero exterior labels</p>
                </div>
                <input
                  type="checkbox"
                  checked={discretePackage}
                  onChange={(e) => setDiscretePackage(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500"
                />
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* 5. GAMING & GROOMING SPECIFIC COCKPIT                    */}
          {/* ──────────────────────────────────────────────────────── */}
          {(category.slug === 'gaming' || category.slug === 'grooming') && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Select Service Package</label>
                <select
                  value={serviceOption}
                  onChange={(e) => setServiceOption(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
                >
                  {category.slug === 'gaming' ? (
                    <>
                      <option value="PS5 FIFA 1 Hour">PS5 FIFA Tournament (1 Hour) · KSh 100</option>
                      <option value="PS5 30 Mins Quick Match">PS5 Quick Match (30 Mins) · KSh 50</option>
                      <option value="Mortal Kombat / Tekken Pass">Combat Match Pass (1 Hour) · KSh 100</option>
                    </>
                  ) : (
                    <>
                      <option value="Barber Cut & Fade">Clean Barber Fade + Beard Trim · KSh 150</option>
                      <option value="Dreadlock Retwist">Dreadlock Retwist & Styling · KSh 800</option>
                      <option value="Knotless Braids">Knotless Braids Campus Special · KSh 1,200</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          )}

          {/* ── MASSIVE DISPATCH CTA BUTTON ───────────────────────── */}
          <div className="pt-4 border-t border-slate-700/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-400 font-medium">Estimated Immediate Total:</span>
              <span className="text-2xl font-black text-[#FF5E00]">
                KSh {calculateServiceTotal().toLocaleString()}
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-2xl font-black text-base md:text-lg flex items-center justify-center gap-3 transition-all duration-200 shadow-xl active:scale-98 cursor-pointer"
              style={{
                backgroundColor: category.accentColor || '#FF5E00',
                color: '#FFFFFF',
              }}
            >
              <Zap size={22} className="fill-white" />
              <span>
                {category.slug === 'gas-refill'
                  ? 'Dispatch Emergency Gas Now'
                  : category.slug === 'boda'
                    ? 'Request Olafasta Boda Rider'
                    : category.slug === 'print'
                      ? 'Submit to Campus Print Hub'
                      : `Order Instant ${category.shortLabel || category.label}`}
              </span>
              <ChevronRight size={20} />
            </button>

            <p className="text-[11px] text-center text-slate-400 mt-2.5">
              🔒 Guaranteed verified campus provider · Pay conveniently via M-Pesa
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
