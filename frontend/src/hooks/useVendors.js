// frontend/src/hooks/useVendors.js
// React Query hooks for fetching campus vendors, kitchens, and local service providers

import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { getCategoryBySlug } from '../config/categories';

/**
 * Normalizes vendor response and merges with category-specific popular menus
 */
const normalizeVendors = (rawList, categorySlug) => {
  if (!Array.isArray(rawList)) return [];

  return rawList.map((vendor, idx) => ({
    _id: vendor._id || `vendor-${categorySlug}-${idx}`,
    name: vendor.businessName || vendor.name || 'Campus Vendor',
    avatar: typeof vendor.avatar === 'string' && /^(https?:\/\/|\/|data:image\/|blob:)/i.test(vendor.avatar)
      ? vendor.avatar
      : null,
    banner: vendor.banner || null,
    badge: vendor.badge || null,
    isOpen: vendor.isOpen !== false,
    rating: Number(vendor.rating) || 0,
    reviewCount: Number(vendor.reviewCount) || 0,
    deliveryTime: vendor.deliveryTime || null,
    deliveryFee: vendor.deliveryFee ?? null,
    location: vendor.location || vendor.campusLocation || null,
    phone: vendor.phone || null,
    popularDishes: Array.isArray(vendor.popularDishes) ? vendor.popularDishes : [],
  }));
};

/**
 * Hook to fetch vendors filtered by food / retail category slug
 */
export const useVendorsByCategory = (categorySlug) => {
  const matched = getCategoryBySlug(categorySlug);
  const categoryLabel = matched?.label || categorySlug;

  return useQuery({
    queryKey: ['vendors', 'category', categorySlug],
    queryFn: async () => {
      try {
        // Query products for this category to extract linked active businesses
        const res = await api.get('/products', {
          params: {
            category: categoryLabel,
            limit: 30,
          },
        });

        const rawProducts = Array.isArray(res.data)
          ? res.data
          : res.data?.data || res.data?.products || [];

        // Extract unique vendors from products
        const businessMap = new Map();
        rawProducts.forEach((product) => {
          if (product.business?._id && !businessMap.has(product.business._id)) {
            const businessProfile = product.business.businessProfile || {};
            businessMap.set(product.business._id, {
              _id: product.business._id,
              name: businessProfile.businessName || product.business.name || product.vendorName || 'Campus Vendor',
              avatar:
                businessProfile.businessLogo ||
                product.business.businessLogo ||
                product.business.avatar ||
                null,
              rating: businessProfile.rating || product.rating || 0,
              reviewCount: product.numReviews || product.reviewCount || 0,
              isOpen: businessProfile.operatingHours?.isOpenNow !== false,
              deliveryTime: product.deliveryTime || null,
              deliveryFee: product.deliveryFee ?? null,
              location:
                businessProfile.campusLocation ||
                businessProfile.businessLocation ||
                businessProfile.businessAddress ||
                null,
              phone: businessProfile.businessContact || product.business.phone || null,
              popularDishes: [
                { name: product.name, price: product.price, emoji: product.emoji || '🍽️' },
              ],
            });
          } else if (product.business?._id && businessMap.has(product.business._id)) {
            const b = businessMap.get(product.business._id);
            if (b.popularDishes.length < 3) {
              b.popularDishes.push({
                name: product.name,
                price: product.price,
                emoji: product.emoji || '🍽️',
              });
            }
          }
        });

        return normalizeVendors(Array.from(businessMap.values()), categorySlug);
      } catch (err) {
        throw err;
      }
    },
    enabled: Boolean(categorySlug),
    staleTime: 5 * 60 * 1000,
  });
};
