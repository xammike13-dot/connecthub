// Footer.jsx – premium trust-building e-commerce footer for Olafasta
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, ShieldCheck, MessageCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 text-gray-600 font-sans mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ── 4-Column Responsive Grid ────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10 py-12 md:py-16">
          
          {/* ── Column 1: The Brand & Base ─────────────────────── */}
          <div className="space-y-3.5">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-[#027A2B] flex items-center justify-center text-white font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
                O
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight leading-none select-none">
                  <span className="text-[#027A2B]">Ola</span>
                  <span className="text-[#FF5E00]">fasta</span>
                </span>
                <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mt-0.5">
                  FASTA FASTA
                </span>
              </div>
            </Link>

            <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">
              <span className="font-semibold text-gray-900">The Ultimate Comrade Plug ⚡</span>
              <br />
              Hyperlocal university super-app built by comrades, for comrades.
            </p>

            <div className="flex items-start gap-2 text-xs text-gray-500 pt-1 leading-normal">
              <MapPin size={15} className="text-[#027A2B] flex-shrink-0 mt-0.5" />
              <span>Moi University Main Campus (Kesses • Chebarus • Mabs • Stage)</span>
            </div>
          </div>

          {/* ── Column 2: Explore (Services) ──────────────────── */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link
                  to="/marketplace"
                  className="text-gray-600 hover:text-[#FF5E00] transition-colors block py-0.5"
                >
                  Marketplace & Daily Needs
                </Link>
              </li>
              <li>
                <Link
                  to="/marketplace?category=Food+%26+Drinks"
                  className="text-gray-600 hover:text-[#FF5E00] transition-colors block py-0.5"
                >
                  Food Delivery (Kibandas & Restis)
                </Link>
              </li>
              <li>
                <Link
                  to="/transport"
                  className="text-gray-600 hover:text-[#FF5E00] transition-colors block py-0.5"
                >
                  Bodaboda Rides
                </Link>
              </li>
              <li>
                <Link
                  to="/rentals"
                  className="text-gray-600 hover:text-[#FF5E00] transition-colors block py-0.5"
                >
                  Campus Rentals & Hostels
                </Link>
              </li>
              <li>
                <Link
                  to="/marketplace?category=Chemist+%26+Wellness"
                  className="text-gray-600 hover:text-[#FF5E00] transition-colors block py-0.5"
                >
                  Chemist & Wellness
                </Link>
              </li>
            </ul>
          </div>

          {/* ── Column 3: Partner With Us (Make Money) ────────── */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">
              Partner With Us
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link
                  to="/register?role=business"
                  className="text-gray-600 hover:text-[#FF5E00] transition-colors block py-0.5"
                >
                  Sell on Olafasta
                </Link>
              </li>
              <li>
                <Link
                  to="/register?role=rider"
                  className="text-gray-600 hover:text-[#FF5E00] transition-colors block py-0.5"
                >
                  Drive with Olafasta Boda
                </Link>
              </li>
              <li>
                <Link
                  to="/register?role=landlord"
                  className="text-gray-600 hover:text-[#FF5E00] transition-colors block py-0.5"
                >
                  List Your Hostel
                </Link>
              </li>
              <li>
                <Link
                  to="/support"
                  className="text-gray-600 hover:text-[#FF5E00] transition-colors block py-0.5"
                >
                  Become a Campus Brand Rep
                </Link>
              </li>
            </ul>
          </div>

          {/* ── Column 4: Support & Connect ───────────────────── */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">
              Support & Connect
            </h4>
            
            <div className="space-y-2.5 text-xs sm:text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Phone size={15} className="text-[#FF5E00] flex-shrink-0" />
                <span className="font-semibold text-gray-800">
                  +254 748 459757 <span className="text-gray-400 font-normal">|</span> 0707 841 747
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Mail size={15} className="text-[#FF5E00] flex-shrink-0" />
                <a
                  href="mailto:support@olafasta.com"
                  className="text-gray-600 hover:text-[#FF5E00] transition-colors"
                >
                  support@olafasta.com
                </a>
              </div>

              <div>
                <Link
                  to="/support"
                  className="text-gray-600 hover:text-[#FF5E00] transition-colors inline-block py-0.5"
                >
                  Help Center & FAQs
                </Link>
              </div>
            </div>

            {/* Social Media Row */}
            <div className="pt-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Follow Comrades
              </p>
              <div className="flex items-center gap-2">
                {/* WhatsApp */}
                <a
                  href="https://wa.me/254748459757"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Chat on WhatsApp"
                  className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-[#25D366] hover:border-[#25D366]/40 hover:shadow-xs transition-all"
                >
                  <MessageCircle size={17} />
                </a>

                {/* Instagram */}
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-[#E4405F] hover:border-[#E4405F]/40 hover:shadow-xs transition-all"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-1.446 0-2.6 1.166-2.6 2.6s1.156 2.6 2.6 2.6 2.6-1.166 2.6-2.6-1.155-2.6-2.6-2.6z" />
                  </svg>
                </a>

                {/* TikTok */}
                <a
                  href="https://tiktok.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-black hover:border-black/40 hover:shadow-xs transition-all"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                  </svg>
                </a>

                {/* Twitter / X */}
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X (Twitter)"
                  className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-black hover:border-black/40 hover:shadow-xs transition-all"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* ── 3. Bottom Trust Bar ─────────────────────────────── */}
        <div className="border-t border-gray-200 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
            
            {/* Left: Copyright */}
            <p className="text-center md:text-left">
              &copy; 2026 Olafasta Technologies. All rights reserved.
            </p>

            {/* Center: Legal Links */}
            <div className="flex items-center gap-6">
              <Link
                to="/privacy"
                className="text-gray-500 hover:text-[#FF5E00] transition-colors"
              >
                Privacy Policy
              </Link>
              <span className="text-gray-300">•</span>
              <Link
                to="/terms"
                className="text-gray-500 hover:text-[#FF5E00] transition-colors"
              >
                Terms of Service
              </Link>
            </div>

            {/* Right: Payment Trust Badge (M-Pesa) */}
            <div className="flex items-center gap-2 text-gray-500">
              <span className="hidden sm:inline text-xs text-gray-500 font-medium">
                Secure Payments by
              </span>
              <div className="inline-flex items-center gap-1.5 bg-[#00A349]/10 text-[#00853B] border border-[#00A349]/30 font-bold px-3 py-1 rounded-full text-xs shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#00A349] animate-pulse" />
                <ShieldCheck size={14} className="text-[#00A349]" />
                <span className="tracking-wider">M-PESA</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </footer>
  );
}
