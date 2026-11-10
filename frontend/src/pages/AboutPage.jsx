// AboutPage.jsx – dedicated mobile-optimized About, Partner, and Support hub for Olafasta
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  Bike,
  Home,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  HelpCircle,
  AlertTriangle,
  FileText,
  Lock,
  ArrowRight,
} from 'lucide-react';

export default function AboutPage() {
  // Accordion state for support & legal sections
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (id) => {
    setOpenSection((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 md:py-10">
      <div className="max-w-2xl mx-auto px-4 flex flex-col gap-6">

        {/* ── 1. The Brand & Base Identity ───────────────────── */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-xs flex flex-col items-center text-center">
          {/* Logo badge */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#027A2B] to-[#04A83C] flex items-center justify-center text-white font-black text-3xl shadow-sm mb-3.5">
            O
          </div>

          {/* Brand Name: Ola (Green) + fasta (Orange) */}
          <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none select-none mb-2">
            <span className="text-[#027A2B]">Ola</span>
            <span className="text-[#FF5E00]">fasta</span>
          </h1>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100/70 border border-orange-200 text-[#FF5E00] text-xs font-bold uppercase tracking-wider mb-3">
            <span>FASTA FASTA · KILA KITU</span>
          </div>

          <p className="text-gray-900 font-bold text-base md:text-lg mb-1 flex items-center justify-center gap-1.5">
            <span>The Ultimate Comrade Plug</span>
            <span className="text-[#FF5E00]">⚡</span>
          </p>

          <p className="text-gray-600 text-xs sm:text-sm leading-relaxed max-w-lg mb-4">
            Hyperlocal university super-app built by comrades, for comrades. From hot kibanda meals to urgent gas refills, verified bedsitters, and instant bodaboda rides in minutes.
          </p>

          {/* Location text with Map Pin */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gray-50 border border-gray-200/80 text-xs text-gray-700 font-medium">
            <MapPin size={15} className="text-[#027A2B] flex-shrink-0" />
            <span>Moi University Main Campus (Kesses • Chebarus • Mabs • Stage)</span>
          </div>
        </div>

        {/* ── 2. Call-To-Action Buttons (Make Money With Us) ─── */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs flex flex-col gap-3.5">
          <div className="mb-1">
            <h2 className="text-gray-900 font-extrabold text-base md:text-lg tracking-tight">
              Partner With Us & Earn
            </h2>
            <p className="text-gray-500 text-xs">
              Join thousands of student vendors, riders, and property owners earning daily on campus.
            </p>
          </div>

          {/* 1. Sell on Olafasta (Orange Button) */}
          <Link
            to="/register?role=business"
            className="w-full py-3.5 px-5 rounded-xl bg-[#FF5E00] hover:bg-[#CC4B00] active:scale-[0.98] text-white font-bold text-sm md:text-base text-center shadow-sm flex items-center justify-center gap-2.5 transition-all"
          >
            <Store size={18} />
            <span>Sell on Olafasta Market</span>
            <ArrowRight size={16} className="ml-auto opacity-80" />
          </Link>

          {/* 2. Drive with Olafasta Boda (Green Button) */}
          <Link
            to="/register?role=rider"
            className="w-full py-3.5 px-5 rounded-xl bg-[#027A2B] hover:bg-[#025D20] active:scale-[0.98] text-white font-bold text-sm md:text-base text-center shadow-sm flex items-center justify-center gap-2.5 transition-all"
          >
            <Bike size={18} />
            <span>Drive with Olafasta Boda</span>
            <ArrowRight size={16} className="ml-auto opacity-80" />
          </Link>

          {/* 3. List Your Hostel/Bedsitter (Dark Gray Button) */}
          <Link
            to="/register?role=landlord"
            className="w-full py-3.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-900 active:scale-[0.98] text-white font-bold text-sm md:text-base text-center shadow-sm flex items-center justify-center gap-2.5 transition-all"
          >
            <Home size={18} />
            <span>List Your Hostel / Bedsitter</span>
            <ArrowRight size={16} className="ml-auto opacity-80" />
          </Link>
        </div>

        {/* ── 3. Direct Contact & Support Helplines ──────────── */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs flex flex-col gap-4">
          <div>
            <h2 className="text-gray-900 font-extrabold text-base md:text-lg tracking-tight">
              Customer Support & Inquiries
            </h2>
            <p className="text-gray-500 text-xs">
              Reach our local campus support desk 24/7.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Call Line 1 */}
            <a
              href="tel:+254748459757"
              className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 hover:border-[#FF5E00]/40 flex items-center gap-3 transition-colors active:scale-95"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-100/80 text-[#FF5E00] flex items-center justify-center flex-shrink-0">
                <Phone size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-gray-500 font-medium">Helpline 1</p>
                <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">+254 748 459757</p>
              </div>
            </a>

            {/* Call Line 2 */}
            <a
              href="tel:0707841747"
              className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 hover:border-[#FF5E00]/40 flex items-center gap-3 transition-colors active:scale-95"
            >
              <div className="w-10 h-10 rounded-xl bg-green-100/80 text-[#027A2B] flex items-center justify-center flex-shrink-0">
                <Phone size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-gray-500 font-medium">Helpline 2</p>
                <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">0707 841 747</p>
              </div>
            </a>

            {/* WhatsApp Direct */}
            <a
              href="https://wa.me/254748459757?text=Hello%20Olafasta%20Support"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/30 hover:border-[#25D366] flex items-center gap-3 transition-colors active:scale-95"
            >
              <div className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <MessageCircle size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-[#128C7E] font-medium">Instant Chat</p>
                <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">WhatsApp Support</p>
              </div>
            </a>

            {/* Email */}
            <a
              href="mailto:support@olafasta.com"
              className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 hover:border-[#FF5E00]/40 flex items-center gap-3 transition-colors active:scale-95"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Mail size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-gray-500 font-medium">Email Support</p>
                <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">support@olafasta.com</p>
              </div>
            </a>
          </div>
        </div>

        {/* ── 4. Support & Legal Accordions ───────────────────── */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs flex flex-col gap-3">
          <h2 className="text-gray-900 font-extrabold text-base md:text-lg tracking-tight mb-1">
            Help & Policies
          </h2>

          {/* Accordion Item: Help Center */}
          <div className="border border-gray-200/80 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection('help')}
              className="w-full p-4 bg-gray-50/70 hover:bg-gray-100/60 flex items-center justify-between text-left transition-colors"
            >
              <span className="flex items-center gap-2.5 font-bold text-xs sm:text-sm text-gray-900">
                <HelpCircle size={16} className="text-[#FF5E00]" />
                <span>Help Center & FAQ</span>
              </span>
              {openSection === 'help' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openSection === 'help' && (
              <div className="p-4 bg-white text-xs text-gray-600 space-y-2.5 border-t border-gray-100">
                <p>
                  <strong>How fast is delivery?</strong> Food and urgent essentials like gas and medicines typically arrive in under 30 minutes within Kesses, Chebarus, Mabs, and Stage.
                </p>
                <p>
                  <strong>How do I pay?</strong> Olafasta supports M-Pesa Daraja STK Push directly on checkout for 100% cashless security.
                </p>
                <Link to="/support" className="inline-block text-[#FF5E00] font-bold hover:underline pt-1">
                  Visit Full Help Center & Guides →
                </Link>
              </div>
            )}
          </div>

          {/* Accordion Item: Report an Issue */}
          <div className="border border-gray-200/80 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection('report')}
              className="w-full p-4 bg-gray-50/70 hover:bg-gray-100/60 flex items-center justify-between text-left transition-colors"
            >
              <span className="flex items-center gap-2.5 font-bold text-xs sm:text-sm text-gray-900">
                <AlertTriangle size={16} className="text-[#FF5E00]" />
                <span>Report an Issue or Dispute</span>
              </span>
              {openSection === 'report' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openSection === 'report' && (
              <div className="p-4 bg-white text-xs text-gray-600 space-y-2 border-t border-gray-100">
                <p>
                  Encountered an issue with an order, rider, or landlord? Our student resolution team handles complaints within 2 hours.
                </p>
                <Link
                  to="/support"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-100 text-[#FF5E00] font-bold text-xs hover:bg-orange-200/70 transition-colors"
                >
                  Submit Dispute Ticket →
                </Link>
              </div>
            )}
          </div>

          {/* Accordion Item: Privacy Policy */}
          <div className="border border-gray-200/80 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection('privacy')}
              className="w-full p-4 bg-gray-50/70 hover:bg-gray-100/60 flex items-center justify-between text-left transition-colors"
            >
              <span className="flex items-center gap-2.5 font-bold text-xs sm:text-sm text-gray-900">
                <Lock size={16} className="text-[#027A2B]" />
                <span>Privacy Policy</span>
              </span>
              {openSection === 'privacy' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openSection === 'privacy' && (
              <div className="p-4 bg-white text-xs text-gray-600 space-y-2 border-t border-gray-100">
                <p>
                  Olafasta respects student privacy. Your telephone numbers and delivery coordinates are strictly used for live order fulfillment and never sold to third parties.
                </p>
                <p className="text-[11px] text-gray-400">
                  Last updated: January 2026. Compliant with the Kenya Data Protection Act.
                </p>
              </div>
            )}
          </div>

          {/* Accordion Item: Terms of Service */}
          <div className="border border-gray-200/80 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection('terms')}
              className="w-full p-4 bg-gray-50/70 hover:bg-gray-100/60 flex items-center justify-between text-left transition-colors"
            >
              <span className="flex items-center gap-2.5 font-bold text-xs sm:text-sm text-gray-900">
                <FileText size={16} className="text-gray-700" />
                <span>Terms of Service</span>
              </span>
              {openSection === 'terms' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openSection === 'terms' && (
              <div className="p-4 bg-white text-xs text-gray-600 space-y-2 border-t border-gray-100">
                <p>
                  By using Olafasta as a buyer, vendor, or rider, you agree to fair campus trading terms, respectful community behavior, and prompt fulfillment of student orders.
                </p>
                <p className="text-[11px] text-gray-400">
                  Operated by Olafasta Technologies Kenya.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── 5. Payment Security Trust Pill ─────────────────── */}
        <div className="flex flex-col items-center justify-center text-center gap-2 py-4">
          <div className="inline-flex items-center gap-2 bg-[#00A349]/10 border border-[#00A349]/30 text-[#00853B] font-bold px-4 py-2 rounded-full text-xs shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#00A349] animate-pulse" />
            <ShieldCheck size={16} className="text-[#00A349]" />
            <span>Secure Cashless Payments Powered by M-Pesa</span>
          </div>

          <p className="text-[11px] text-gray-400 mt-1">
            © 2026 Olafasta Technologies. Built by comrades, for comrades.
          </p>
        </div>

      </div>
    </div>
  );
}
