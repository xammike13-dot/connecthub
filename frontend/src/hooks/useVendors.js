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
    name: vendor.businessName || vendor.name || 'Campus Kitchen',
    avatar: vendor.avatar || '🍲',
    banner: vendor.banner || null,
    badge: vendor.badge || (idx === 0 ? 'Top Rated' : 'Campus Verified'),
    isOpen: vendor.isOpen !== false,
    rating: vendor.rating || 4.8,
    reviewCount: vendor.reviewCount || 45 + idx * 12,
    deliveryTime: vendor.deliveryTime || '15-25 min',
    deliveryFee: vendor.deliveryFee ?? 0,
    location: vendor.location || vendor.campusLocation || 'Stage, Opposite Gate B',
    phone: vendor.phone || '0700000000',
    popularDishes: vendor.popularDishes || [
      { name: 'Special Campus Combo', price: 150, emoji: '🍛' },
      { name: 'Daily Saver Meal', price: 100, emoji: '🍲' },
      { name: 'Chilled Refreshment 500ml', price: 60, emoji: '🥤' },
    ],
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
            businessMap.set(product.business._id, {
              _id: product.business._id,
              name: product.business.name || product.vendorName,
              avatar: product.business.avatar || '🏪',
              rating: product.rating || 4.8,
              reviewCount: product.reviewCount || 24,
              location: product.business.businessProfile?.address || 'Campus Center',
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

        const extractedVendors = Array.from(businessMap.values());
        if (extractedVendors.length > 0) {
          return normalizeVendors(extractedVendors, categorySlug);
        }

        // Return curated defaults for campus food micro-economies if none seeded yet
        const defaultVendors = [
          {
            _id: `v-${categorySlug}-1`,
            name: categorySlug === 'kibanda'
              ? 'Mama Oliech Local Kitchen'
              : categorySlug === 'wines'
                ? 'Chillout Wines & Spirits'
                : 'Stage Central Fast Bites',
            avatar: '🍲',
            badge: 'Bestseller',
            isOpen: true,
            rating: 4.9,
            reviewCount: 142,
            deliveryTime: '15-20 min',
            deliveryFee: 0,
            location: 'Stage, Opposite Gate B',
            popularDishes: [
              { name: categorySlug === 'kibanda' ? 'Ugali Beef & Sukuma' : 'Fried Chicken & Chips', price: 180, emoji: '🍗' },
              { name: categorySlug === 'kibanda' ? 'Chapo Ndengu Special' : 'Loaded Beef Burger', price: 120, emoji: '🍔' },
              { name: categorySlug === 'kibanda' ? 'Special Githeri Fry' : 'Crispy Seasoned Fries', price: 100, emoji: '🍟' },
            ],
          },
          {
            _id: `v-${categorySlug}-2`,
            name: categorySlug === 'kibanda'
              ? 'Chebarus Express Kibanda'
              : categorySlug === 'cakes'
                ? 'Sweet Delights Bakery'
                : 'Hot Spot Shawarma & Grill',
            avatar: '🥘',
            badge: 'Top Rated',
            isOpen: true,
            rating: 4.8,
            reviewCount: 98,
            deliveryTime: '20-25 min',
            deliveryFee: 30,
            location: 'Chebarus Junction',
            popularDishes: [
              { name: categorySlug === 'cakes' ? 'Red Velvet Bento Cake' : 'Spicy Chicken Shawarma', price: 250, emoji: '🌯' },
              { name: categorySlug === 'cakes' ? 'Chocolate Cupcakes (Box of 4)' : 'Smokie Pasua with Kachumbari', price: 100, emoji: '🌭' },
              { name: categorySlug === 'cakes' ? 'Black Forest Slice' : 'Fresh Passion Juice 500ml', price: 80, emoji: '🥤' },
            ],
          },
          {
            _id: `v-${categorySlug}-3`,
            name: categorySlug === 'wines'
              ? 'Kesses Boulevard Liquor'
              : 'Swahili Bites & Coastal Delights',
            avatar: '🍛',
            badge: 'Open Now',
            isOpen: true,
            rating: 4.7,
            reviewCount: 65,
            deliveryTime: '10-15 min',
            deliveryFee: 0,
            location: 'Mabs Center',
            popularDishes: [
              { name: 'Swahili Pilau Bowl + Kachumbari', price: 160, emoji: '🍚' },
              { name: 'Biryani Kuku Special', price: 220, emoji: '🍗' },
              { name: 'Fresh Mahamri (Pack of 4)', price: 60, emoji: '🥐' },
            ],
          },
        ];

        return normalizeVendors(defaultVendors, categorySlug);
      } catch (err) {
        console.error('[useVendorsByCategory] Failed to fetch vendors:', err);
        return [];
      }
    },
    enabled: Boolean(categorySlug),
    staleTime: 5 * 60 * 1000,
  });
};
