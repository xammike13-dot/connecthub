// ServiceCards.jsx – promotion cards for Boda rides and Hostel rentals
import { Link } from 'react-router-dom';
import { Bike } from 'lucide-react';

export default function ServiceCards() {
  return (
    <section className="py-20 bg-[#0F172A]">
      <div className="max-w-7xl mx-auto px-4 grid gap-8 md:grid-cols-2">
        {/* Boda Ride Card */}
        <Link
          to="/transport"
          className="bg-gradient-to-br from-[#FF5E00]/20 to-[#1E293B] border border-[#FF5E00]/40 rounded-2xl p-6 flex flex-col items-center text-center hover:border-[#FF5E00] transition group"
        >
          <div className="w-16 h-16 bg-[#FF5E00]/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <Bike className="w-8 h-8 text-[#FF5E00]" />
          </div>
          <h3 className="text-white font-bold text-xl mb-2">Request an Olafasta Boda</h3>
          <p className="text-neutral-400 text-sm mb-4">
            Fixed fares, predefined campus routes, instant rider matching with M-Pesa.
          </p>
          <button
            className="bg-[#FF5E00] hover:bg-[#CC4B00] text-white font-semibold px-6 py-2.5 rounded-xl shadow-md transition"
          >
            Book Ride Now
          </button>
        </Link>
        {/* Hostel Rental Card */}
        <Link
          to="/rentals"
          className="bg-[#027A2B]/10 border border-[#027A2B]/30 rounded-2xl p-6 flex flex-col items-center text-center hover:border-[#6BE319]/40 transition group"
        >
          <h3 className="text-white font-bold text-xl mb-4">Find a Hostel / Bedsitter</h3>
          <button className="bg-[#6BE319] hover:bg-[#5AAE15] text-white font-semibold px-6 py-2.5 rounded-xl transition">
            Search Rentals
          </button>
        </Link>
      </div>
    </section>
  );
}
