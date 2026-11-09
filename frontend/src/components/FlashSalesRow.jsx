// FlashSalesRow.jsx – displays a horizontal scroll of hot products
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function FlashSalesRow() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    // API returns { success, data: [...], pagination: {...} }
    fetch('/api/products?page=1&limit=10')
      .then((res) => res.json())
      .then((json) => {
        const items = Array.isArray(json) ? json : (json?.data ?? []);
        setProducts(items);
      })
      .catch(console.error);
  }, []);

  return (
    <section className="py-12 bg-[#0F172A]">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-6">
          Flash Sales
        </h2>
        <div className="overflow-x-auto flex gap-4 pb-4">
          {products.map((p) => {
            const oldPrice = Math.round(p.price * 1.3);
            return (
              <motion.div
                key={p._id}
                className="min-w-[200px] bg-[#1E293B] rounded-xl p-4 flex flex-col"
                whileHover={{ y: -4, scale: 1.02 }}
              >
                <Link to={`/product/${p._id}`}> 
                  <img
                    src={p.images?.[0] || '/placeholder.png'}
                    alt={p.name}
                    className="w-full h-32 object-cover rounded-md mb-2"
                    loading="lazy"
                  />
                </Link>
                <h3 className="text-white font-medium mb-1 truncate">
                  {p.name}
                </h3>
                <div className="flex items-center mb-2">
                  <span className="text-slate-400 line-through mr-2">KSh {oldPrice}</span>
                  <span className="text-[#FF5E00] font-bold">KSh {p.price}</span>
                </div>
                <button className="mt-auto bg-[#FF5E00] hover:bg-[#CC4B00] text-white font-semibold px-3 py-2 rounded-md">
                  Add to Cart
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
