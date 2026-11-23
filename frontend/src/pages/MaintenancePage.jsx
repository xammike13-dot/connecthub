import { Rocket, Wrench, RefreshCw, MessageCircle, Mail, Phone, Flame, Bike, UtensilsCrossed, Home as HomeIcon, Store, ShieldCheck } from 'lucide-react';

export default function MaintenancePage() {
  const handleRefresh = () => {
    window.location.reload();
  };

  const services = [
    { label: 'Food Delivery', icon: UtensilsCrossed },
    { label: 'Gas Refill', icon: Flame },
    { label: 'Boda Rides', icon: Bike },
    { label: 'Hostel Rentals', icon: HomeIcon },
    { label: 'Marketplace', icon: Store },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-white to-gray-50 flex flex-col justify-between text-gray-900 font-sans selection:bg-olaOrange-light selection:text-olaOrange-DEFAULT px-4 py-8 sm:px-6 lg:px-8">
      
      {/* ── Top Header Bar ─────────────────────────────────────────── */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6 border-b border-gray-100">
        <div className="flex items-center gap-2.5 select-none">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-olaGreen-DEFAULT to-olaGreen-deep flex items-center justify-center text-white font-black text-base sm:text-lg shadow-sm">
            O
          </div>
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-black tracking-tight leading-none">
              <span className="text-olaGreen-DEFAULT">Ola</span>
              <span className="text-olaOrange-DEFAULT">fasta</span>
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 tracking-wider uppercase mt-0.5">
              FASTA FASTA
            </span>
          </div>
        </div>

        {/* Live campus status badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden sm:inline">Moi University Campus</span>
          <span className="sm:hidden">Campus</span>
        </div>
      </header>

      {/* ── Main Upgrade Hero Section ─────────────────────────────── */}
      <main className="max-w-2xl mx-auto w-full text-center py-8 sm:py-12 my-auto">
        
        {/* Animated Icon Container */}
        <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-olaOrange-light via-orange-50 to-white border-2 border-olaOrange-DEFAULT/20 flex items-center justify-center shadow-lg shadow-olaOrange-DEFAULT/10 mb-6 sm:mb-8">
          <div className="relative">
            <Rocket className="w-12 h-12 text-olaOrange-DEFAULT transform -rotate-12 transition-transform duration-300 hover:rotate-0" />
            <div className="w-6 h-6 rounded-full bg-olaGreen-DEFAULT text-white flex items-center justify-center text-xs font-black shadow-xs absolute -bottom-1 -right-2 ring-2 ring-white">
              ⚡
            </div>
          </div>
          <span className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-white text-olaOrange-DEFAULT border border-olaOrange-DEFAULT/30 flex items-center justify-center text-xs shadow-2xs">
            <Wrench size={12} className="text-olaOrange-DEFAULT" />
          </span>
        </div>

        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-olaOrange-light border border-olaOrange-DEFAULT/20 text-olaOrange-DEFAULT text-xs font-black tracking-wide uppercase shadow-2xs mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-olaOrange-DEFAULT animate-ping" />
          <span>Scheduled Platform Upgrade</span>
        </div>

        {/* Primary Headline */}
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-4">
          We’re Upgrading <span className="text-olaOrange-DEFAULT">Olafasta</span> ⚡
        </h1>

        {/* Primary Subtext */}
        <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-lg mx-auto leading-relaxed mb-8">
          We are putting the final touches on your Moi University campus super-app for food, gas refills, boda rides, and verified hostels. We’ll be back online shortly!
        </p>

        {/* Campus Services Chips */}
        <div className="bg-white/80 backdrop-blur-xs border border-gray-200/80 rounded-2xl p-4 sm:p-5 shadow-xs mb-8">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            What We’re Optimizing For You
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
            {services.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200/60 text-gray-700 text-xs font-semibold hover:border-olaOrange-DEFAULT/30 hover:bg-olaOrange-light/50 transition-colors"
                >
                  <Icon size={14} className="text-olaOrange-DEFAULT" />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Call to Actions: Refresh & WhatsApp Support */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8">
          <button
            onClick={handleRefresh}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-olaOrange-DEFAULT hover:bg-olaOrange-hover text-white font-bold text-sm shadow-md shadow-olaOrange-DEFAULT/25 active:scale-95 transition-all cursor-pointer"
          >
            <RefreshCw size={16} />
            <span>Check Status / Refresh</span>
          </button>

          <a
            href="https://wa.me/254748459757?text=Hi%20Olafasta%20Support%2C%20I%20have%20an%20urgent%20inquiry%20regarding%20the%20platform%20upgrade."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <MessageCircle size={16} />
            <span>Chat on WhatsApp</span>
          </a>
        </div>

        {/* Subtle Support Contacts Bar */}
        <div className="border-t border-dashed border-gray-200 pt-6">
          <p className="text-xs text-gray-500 mb-2 font-medium">
            Need urgent assistance, pending orders, or delivery support?
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-gray-700">
            <a
              href="tel:+254748459757"
              className="inline-flex items-center gap-1.5 hover:text-olaOrange-DEFAULT transition-colors"
            >
              <Phone size={13} className="text-olaGreen-DEFAULT" />
              <span>+254 748 459757</span>
            </a>
            <span className="text-gray-300">•</span>
            <a
              href="mailto:support@olafasta.com"
              className="inline-flex items-center gap-1.5 hover:text-olaOrange-DEFAULT transition-colors"
            >
              <Mail size={13} className="text-olaOrange-DEFAULT" />
              <span>support@olafasta.com</span>
            </a>
          </div>
        </div>

      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="max-w-4xl mx-auto w-full pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-olaGreen-DEFAULT" />
          <span>Hyperlocal Campus Delivery &amp; Living • Moi University Main Campus</span>
        </div>
        <div>
          <span>© {new Date().getFullYear()} Olafasta. All rights reserved.</span>
        </div>
      </footer>

    </div>
  );
}
