import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { wishlistAPI, rentalAPI } from '../services/api';
import { useAuth } from './AuthContext';

const WishlistContext = createContext(null);

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export const WishlistProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [favoriteRentals, setFavoriteRentals] = useState([]);

  // Fetch wishlist items (products only for now)
  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlistItems([]);
      setWishlistCount(0);
      setFavoriteRentals([]);
      return;
    }

    try {
      setLoading(true);
      const { data } = await wishlistAPI.getAll();
      const items = data?.data || [];
      setWishlistItems(items);
      setWishlistCount(items.length);

      // Fetch favorite rentals only for customers
      if (user?.role === 'customer') {
        try {
          const favoritesResponse = await rentalAPI.getFavorites();
          const favoriteRentalIds = favoritesResponse.data?.data?.map(r => r._id) || [];
          setFavoriteRentals(favoriteRentalIds);
        } catch (error) {
          console.error('Failed to fetch favorite rentals:', error);
          setFavoriteRentals([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
      setWishlistItems([]);
      setWishlistCount(0);
      setFavoriteRentals([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  // Add item to wishlist
  const addToWishlist = async (productId) => {
    if (!isAuthenticated) {
      alert('Please login to add items to your wishlist');
      return false;
    }

    try {
      console.log('[WISHLIST ADD] Product:', productId);
      const { data } = await wishlistAPI.add(productId);
      console.log('[WISHLIST ADD SUCCESS] Product:', productId, 'Response:', data);
      // Add the new item to the list
      setWishlistItems(prev => [...prev, data.data]);
      setWishlistCount(prev => prev + 1);
      return true;
    } catch (error) {
      console.error('[WISHLIST ADD ERROR] Product:', productId, 'Error:', error);
      if (error.response?.status === 400) {
        // Already in wishlist
        console.log('[WISHLIST ADD] Product already in wishlist:', productId);
        return true;
      }
      return false;
    }
  };

  // Remove item from wishlist
  const removeFromWishlist = async (productId) => {
    try {
      console.log('[WISHLIST REMOVE] Product:', productId);
      await wishlistAPI.remove(productId);
      console.log('[WISHLIST REMOVE SUCCESS] Product:', productId);
      setWishlistItems(prev => prev.filter(item => item.product?._id !== productId));
      setWishlistCount(prev => Math.max(0, prev - 1));
      return true;
    } catch (error) {
      console.error('[WISHLIST REMOVE ERROR] Product:', productId, 'Error:', error);
      return false;
    }
  };

  // Check if item is in wishlist (supports both products and rentals)
  const isInWishlist = useCallback((itemId, type = 'product') => {
    if (type === 'rental') {
      // For rentals, check backend state
      return favoriteRentals.includes(itemId);
    }
    return wishlistItems.some(item => item.product?._id === itemId);
  }, [wishlistItems, favoriteRentals]);

  // Toggle wishlist item (supports both products and rentals)
  const toggleWishlist = async (itemId, type = 'product') => {
    if (type === 'rental') {
      // Handle rental favorites via backend API
      try {
        const response = await rentalAPI.toggleFavorite(itemId);
        const isFavorite = response.data?.isFavorite;

        // Update local state
        if (isFavorite) {
          setFavoriteRentals(prev => [...prev, itemId]);
        } else {
          setFavoriteRentals(prev => prev.filter(id => id !== itemId));
        }

        return isFavorite;
      } catch (error) {
        console.error('Failed to toggle rental favorite:', error);
        return false;
      }
    }

    // Handle product favorites
    if (isInWishlist(itemId, 'product')) {
      return await removeFromWishlist(itemId);
    } else {
      return await addToWishlist(itemId);
    }
  };

  // Clear wishlist
  const clearWishlist = async () => {
    try {
      await wishlistAPI.clear();
      setWishlistItems([]);
      setWishlistCount(0);
      return true;
    } catch (error) {
      console.error('Failed to clear wishlist:', error);
      return false;
    }
  };

  const value = {
    wishlistItems,
    wishlistCount,
    loading,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    toggleWishlist,
    clearWishlist,
    refreshWishlist: fetchWishlist,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};