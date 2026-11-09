// ProductScrollRow.jsx – light-mode, snap-scroll horizontal product row
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import ProductCard from './ProductCard';

export default function ProductScrollRow({ title, viewAllLink, products }) {
  if (!products?.length) return null;

  return (
    <section className="my-6 md:my-8">
      {/* Section header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-gray-900 font-extrabold text-base md:text-xl tracking-tight flex items-center gap-2">
          {title}
        </h2>
        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="flex items-center gap-0.5 text-[#FF5E00] hover:text-[#CC4B00] text-xs md:text-sm font-bold transition-colors"
          >
            See All <ChevronRight size={16} />
          </Link>
        )}
      </div>

      {/* Horizontal scroll — snap on mobile, no-scrollbar */}
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 px-4 scrollbar-hide no-scrollbar">
        {products.map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
      </div>
    </section>
  );
}
