// frontend/src/hooks/useProducts.js
// Standard React Query hooks for product data fetching, caching, and state synchronization

import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { getCategoryBySlug } from '../config/categories';

/**
 * Normalizes raw API response into an array of product documents
 */
const normalizeProducts = (response) => {
  if (!response?.data) return [];
  const rawList = Array.isArray(response.data)
    ? response.data
    : response.data?.data || response.data?.products || [];

  if (!Array.isArray(rawList)) return [];

  return rawList.map((product) => {
    // Ensure oldPrice and discountPct are properly derived if originalPrice exists
    const price = product.price ?? 0;
    const oldPrice = product.oldPrice ?? product.originalPrice ?? null;
    let discountPct = product.discountPct;

    if (!discountPct && oldPrice && oldPrice > price) {
      discountPct = Math.round(((oldPrice - price) / oldPrice) * 100);
    }

    return {
      ...product,
      oldPrice,
      discountPct,
    };
  });
};

/**
 * Hook to fetch flash sale items with active discounts
 */
export const useFlashDeals = (limit = 10) => {
  return useQuery({
    queryKey: ['products', 'flash-deals', limit],
    queryFn: async () => {
      // Prioritize high-discount products
      const res = await api.get('/products', {
        params: {
          sort: 'discount',
          limit,
          page: 1,
        },
      });
      const products = normalizeProducts(res);
      // Fallback filter on client if backend sort isn't configured for discount field yet
      return products.filter((p) => p.discountPct > 0 || (p.oldPrice && p.oldPrice > p.price));
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for flash sales
  });
};

/**
 * Hook to fetch items filtered by category slug or official label with dynamic sorting and filtering
 */
export const useProductsByCategory = (categorySlugOrLabel, options = {}) => {
  const { sort = '-createdAt', limit = 40, page = 1 } =
    typeof options === 'object' ? options : { limit: options };

  // Resolve category slug to official taxonomy label
  const matched = getCategoryBySlug(categorySlugOrLabel);
  const categoryParam = matched?.label || categorySlugOrLabel;

  return useQuery({
    queryKey: ['products', 'category', categorySlugOrLabel, sort, limit, page],
    queryFn: async () => {
      if (!categoryParam) return [];
      const res = await api.get('/products', {
        params: {
          category: categoryParam,
          sort,
          limit,
          page,
        },
      });
      return normalizeProducts(res);
    },
    enabled: Boolean(categoryParam),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to fetch trending / curated products for feed sections
 */
export const useTrendingProducts = ({ page = 1, limit = 12, sort = '-createdAt' } = {}) => {
  return useQuery({
    queryKey: ['products', 'trending', page, limit, sort],
    queryFn: async () => {
      const res = await api.get('/products', {
        params: {
          page,
          limit,
          sort,
        },
      });
      return {
        products: normalizeProducts(res),
        pagination: res.data?.pagination || {
          total: 0,
          pages: 1,
          currentPage: page,
          perPage: limit,
        },
      };
    },
    staleTime: 5 * 60 * 1000,
  });
};
