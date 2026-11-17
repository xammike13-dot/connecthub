// CategoryPage.jsx — Master Dynamic Category Router with Archetype Switcher
import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCategoryBySlug, CATEGORY_ARCHETYPES } from '../config/categories.js';
import RetailLayout from '../components/category-layouts/RetailLayout';
import HousingLayout from '../components/category-layouts/HousingLayout';
import FoodLayout from '../components/category-layouts/FoodLayout';
import ServiceLayout from '../components/category-layouts/ServiceLayout';
import { HelpCircle, Grid, ArrowLeft } from 'lucide-react';

export default function CategoryPage() {
  const { slug } = useParams();

  // Resolve category configuration by slug or fallback
  const category = useMemo(() => {
    return getCategoryBySlug(slug);
  }, [slug]);

  // Graceful 404 Fallback if category slug does not exist
  if (!category) {
    return (
      <div className="min-h-[70vh] bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center border border-gray-200 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 text-[#FF5E00] flex items-center justify-center mx-auto mb-4">
            <HelpCircle size={32} />
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Category Not Found</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            The category slug <code className="bg-gray-100 px-2 py-0.5 rounded text-gray-800 font-mono text-xs">/c/{slug}</code> does not match any official Olafasta micro-economies.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/categories"
              className="px-5 py-2.5 rounded-xl bg-[#FF5E00] text-white text-xs font-bold shadow-sm hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
            >
              <Grid size={15} /> All Categories
            </Link>
            <Link
              to="/"
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft size={15} /> Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Switch Statement on Category Archetype ──────────────────────────────────
  switch (category.archetype) {
    case CATEGORY_ARCHETYPES.RETAIL:
    case 'retail':
      return <RetailLayout category={category} slug={slug} />;

    case CATEGORY_ARCHETYPES.FOOD:
    case 'food':
      return <FoodLayout category={category} slug={slug} />;

    case CATEGORY_ARCHETYPES.HOUSING:
    case 'housing':
      return <HousingLayout category={category} slug={slug} />;

    case CATEGORY_ARCHETYPES.SERVICE:
    case 'service':
      return <ServiceLayout category={category} slug={slug} />;

    default:
      return <RetailLayout category={category} slug={slug} />;
  }
}
