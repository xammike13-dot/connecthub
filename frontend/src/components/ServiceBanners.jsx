import { useNavigate } from 'react-router-dom';

export default function ServiceBanners() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 my-6">
      
      {/* Boda Banner – Olafasta Brand Orange (#FF5E00) */}
      <div
        onClick={() => navigate('/transport')}
        className="bg-[#FF5E00] hover:bg-[#E05200] rounded-xl p-4 md:p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center gap-4">
          <span className="text-4xl select-none">🏍️</span>
          <div>
            <h3 className="text-white font-bold text-lg md:text-xl leading-tight">Request an Olafasta Boda</h3>
            <p className="text-white/90 text-xs md:text-sm mt-1 font-medium">Kesses • Chebarus • Mabs • Stage</p>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate('/transport');
          }}
          className="bg-white text-[#FF5E00] hover:text-[#E05200] font-bold text-sm px-5 py-2 rounded-full shadow-sm hover:bg-gray-50 transition-colors whitespace-nowrap ml-4 cursor-pointer"
        >
          Book Ride
        </button>
      </div>

      {/* Rentals Banner – Deep Trust Green (#027A2B) */}
      <div
        onClick={() => navigate('/rentals')}
        className="bg-olaGreen-deep hover:bg-olaGreen-deep-hover rounded-xl p-4 md:p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center gap-4">
          <span className="text-4xl select-none">🏠</span>
          <div>
            <h3 className="text-white font-bold text-lg md:text-xl leading-tight">Find a Bedsitter / Hostel</h3>
            <p className="text-white/90 text-xs md:text-sm mt-1 font-medium">Verified rooms around Moi University</p>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate('/rentals');
          }}
          className="bg-white text-olaGreen-deep font-bold text-sm px-5 py-2 rounded-full shadow-sm hover:bg-gray-50 transition-colors whitespace-nowrap ml-4 cursor-pointer"
        >
          Search Rooms
        </button>
      </div>

    </div>
  );
}
