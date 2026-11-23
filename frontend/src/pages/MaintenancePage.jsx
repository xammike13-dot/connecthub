import { RefreshCw, MessageSquare, Phone, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';

export default function MaintenancePage() {
  const handleRefresh = () => {
    window.location.reload();
  };

  const desk1Number = "0707841747";
  const kingMikeNumber = "0748459757";

  const desk1WhatsApp = `https://wa.me/254707841747?text=${encodeURIComponent(
    'Hi Olafasta Support, I am reaching out regarding an urgent inquiry.'
  )}`;
  const kingMikeWhatsApp = `https://wa.me/254748459757?text=${encodeURIComponent(
    'Hi King Mike, I am reaching out regarding an urgent Olafasta inquiry.'
  )}`;

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col justify-between text-gray-900 font-sans selection:bg-olaOrange-light selection:text-olaOrange-DEFAULT px-4 py-6 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Background Subtle Accent Gradients */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute -top-40 right-1/2 translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-orange-100/40 via-transparent to-transparent blur-3xl -z-10"
      />

      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="max-w-3xl mx-auto w-full flex items-center justify-start py-4 border-b border-gray-200/70">
        <div className="flex items-center gap-2.5 select-none">
          <div className="w-9 h-9 rounded-xl bg-olaGreen-DEFAULT flex items-center justify-center text-white font-black text-base shadow-xs">
            O
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight leading-none">
              <span className="text-olaGreen-DEFAULT">Ola</span>
              <span className="text-olaOrange-DEFAULT">fasta</span>
            </span>
            <span className="text-[9px] font-bold text-gray-400 tracking-wider uppercase mt-0.5">
              FASTA FASTA
            </span>
          </div>
        </div>
      </header>

      {/* ── Center Content Box ─────────────────────────────────────── */}
      <main className="max-w-xl mx-auto w-full my-auto py-8 sm:py-10">
        <div className="bg-white rounded-3xl border border-gray-200/90 shadow-[0_10px_35px_-5px_rgba(0,0,0,0.05)] p-6 sm:p-9 relative">
          
          {/* Status Label */}
          <div className="flex items-center justify-between gap-2 mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200/70 text-olaOrange-DEFAULT text-xs font-bold tracking-wide uppercase">
              <Clock size={13} className="text-olaOrange-DEFAULT" />
              <span>Scheduled System Upgrade</span>
            </div>
            <span className="text-xs font-semibold text-gray-400">Release v1.4</span>
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight leading-tight mb-3">
            We’re upgrading Olafasta.
          </h1>

          {/* Main Description */}
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-6">
            We are putting the final touches on your Moi University campus super-app for food, gas refills, boda rides, and verified hostels. We’ll be back online shortly!
          </p>

          {/* Real Operational Status Reassurance Card */}
          <div className="bg-gray-50/90 rounded-2xl border border-gray-200/60 p-4 mb-7 space-y-3">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Service Bulletin
            </p>
            <div className="space-y-2 text-xs sm:text-sm text-gray-600">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-olaGreen-DEFAULT flex-shrink-0 mt-0.5" />
                <span><strong className="text-gray-900 font-semibold">Active Orders &amp; Rides:</strong> In-flight orders and deliveries are safely routed.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-olaGreen-DEFAULT flex-shrink-0 mt-0.5" />
                <span><strong className="text-gray-900 font-semibold">M-Pesa &amp; Wallets:</strong> Account balances and pending confirmations are protected.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-olaGreen-DEFAULT flex-shrink-0 mt-0.5" />
                <span><strong className="text-gray-900 font-semibold">Pending Deliveries:</strong> Any pending deliveries are being handled and will be delivered shortly.</span>
              </div>
            </div>
          </div>

          {/* Urgent Direct Contact Banner */}
          <div className="border-t border-gray-100 pt-6 mb-6">
            <p className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">
              Need Urgent Help or Deliveries?
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Our campus dispatch desk is on standby for immediate comrade assistance:
            </p>

            <div className="space-y-3">
              {/* Desk 1 (0707841747) */}
              <div className="p-3 rounded-2xl bg-gray-50/80 border border-gray-200/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-900">Desk 1 ({desk1Number})</span>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70">
                    Online
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={desk1WhatsApp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-olaGreen-DEFAULT hover:bg-olaGreen-deep text-white font-bold text-xs shadow-2xs transition-colors"
                  >
                    <MessageSquare size={14} />
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={`tel:+254707841747`}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 font-bold text-xs shadow-2xs transition-colors"
                  >
                    <Phone size={13} className="text-gray-500" />
                    <span>Call</span>
                  </a>
                </div>
              </div>

              {/* King Mike (0748459757) */}
              <div className="p-3 rounded-2xl bg-gray-50/80 border border-gray-200/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-900">King Mike ({kingMikeNumber})</span>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70">
                    Online
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={kingMikeWhatsApp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-olaGreen-DEFAULT hover:bg-olaGreen-deep text-white font-bold text-xs shadow-2xs transition-colors"
                  >
                    <MessageSquare size={14} />
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={`tel:+254748459757`}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 font-bold text-xs shadow-2xs transition-colors"
                  >
                    <Phone size={13} className="text-gray-500" />
                    <span>Call</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Refresh Action */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-xs">
            <span className="text-gray-400">Site updates will load automatically</span>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 font-bold text-olaOrange-DEFAULT hover:text-olaOrange-hover transition-colors cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Refresh Page</span>
            </button>
          </div>

        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="max-w-3xl mx-auto w-full pt-6 pb-2 border-t border-gray-200/70 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-3">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-olaGreen-DEFAULT" />
          <span>Olafasta • Hyperlocal Campus Commerce for Moi University</span>
        </div>

        <div className="flex items-center gap-3">
          <span>© {new Date().getFullYear()} Olafasta.</span>
          <span className="text-gray-300">•</span>
          <span className="text-gray-500">
            Powered by{' '}
            <a
              href="https://www.mulleyzcreatives.co.ke/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-gray-800 hover:text-olaOrange-DEFAULT transition-colors underline decoration-gray-300 hover:decoration-olaOrange-DEFAULT underline-offset-2"
            >
              Mulleyz Creatives
            </a>{' '}
            x King Mike
          </span>
        </div>
      </footer>

    </div>
  );
}
