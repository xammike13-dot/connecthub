// ServiceCards.jsx – promotion cards for Boda rides and Hostel rentals
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bike } from 'lucide-react';

export default function ServiceCards() {
  const [destination, setDestination] = useState('');

  const handleBoda = () => {
    // Simple navigation with query param; adjust route as needed
    if (destination.trim()) {
      window.location.href = `/transport?dest=${encodeURIComponent(destination)}`;
    } else {
      window.location.href = '/transport';
    }
  };

  return (
    <section className="py-20 bg-[#0F172A]">
      <div className="max-w-7xl mx-auto px-4 grid gap-8 md:grid-cols-2">
        {/* Boda Ride Card */}
        <div className="bg-gradient-to-br from-[#FF5E00]/20 to-[#1E293B] border border-[#FF5E00]/40 rounded-2xl p-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-[#FF5E00]/20 rounded-full flex items-center justify-center mb-4">
            <Bike className="w-8 h-8 text-[#FF5E00]" />
          </div>
          <h3 className="text-white font-bold text-xl mb-2">Request an Olafasta Boda</h3>
          <input
            type="text"
            placeholder="Enter destination"
            className="w-full bg-[#1E293B] text-white rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-[#FF5E00]"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
          <button
            onClick={handleBoda}
            className="bg-[#FF5E00] hover:bg-[#CC4B00] text-white font-semibold px-4 py-2 rounded"
          >
            Book Ride
          </button>
        </div>
        {/* Hostel Rental Card */}
        <Link
          to="/rentals"
          className="bg-[#027A2B]/10 border border-[#027A2B]/30 rounded-2xl p-6 flex flex-col items-center text-center hover:border-[#6BE319]/40"
        >
          <h3 className="text-white font-bold text-xl mb-4">Find a Hostel / Bedsitter</h3>
          <button className="bg-[#6BE319] hover:bg-[#5AAE15] text-white font-semibold px-4 py-2 rounded">
            Search Rentals
          </button>
        </Link>
      </div>
    </section>
  );
}
