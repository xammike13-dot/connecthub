import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  MapPin,
  Home,
  Building,
  X,
} from 'lucide-react';
import RentalCard from '../components/cards/RentalCard';
import { SkeletonCard } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { rentalAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../components/Toast';

const rentalTypes = [
  { id: 'all', name: 'All Types', icon: Home },
  { id: 'single', name: 'Single Room', icon: Home },
  { id: 'bedsitter', name: 'Bedsitter', icon: Building },
  { id: 'one bedroom', name: 'One Bedroom', icon: Building },
  { id: 'two bedroom', name: 'Two Bedroom', icon: Building },
  { id: 'three bedroom', name: 'Three Bedroom', icon: Building },
];

const RentalsPage = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { error: toastError } = useToast();

  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [priceRange, setPriceRange] = useState({
    min: 0,
    max: 100000,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [totalRentals, setTotalRentals] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const loc = params.get('location');

    if (loc) {
      setLocationFilter(loc);
    }
  }, [location.search]);

  const fetchRentals = async (
    pageNumber = 1,
    append = false
  ) => {
    try {
      setLoading(true);

      const params = {
        page: pageNumber,
        limit: 12,
        rentalType:
          selectedType !== 'all'
            ? selectedType
            : undefined,
        location:
          locationFilter || undefined,
        minPrice:
          priceRange.min > 0
            ? priceRange.min
            : undefined,
        maxPrice:
          priceRange.max > 0
            ? priceRange.max
            : undefined,
      };

      const response =
        await rentalAPI.getAll(params);

      const rentalsData =
        response.data?.data || [];

      const pagination =
        response.data?.pagination || {};

      let filteredRentals = rentalsData;

      if (searchQuery.trim()) {
        const query =
          searchQuery.toLowerCase();

        filteredRentals =
          rentalsData.filter(
            (rental) =>
              rental.rentalName
                ?.toLowerCase()
                .includes(query) ||
              rental.location
                ?.toLowerCase()
                .includes(query) ||
              rental.rentalType
                ?.toLowerCase()
                .includes(query)
          );
      }

      if (append) {
        setRentals((prev) => [
          ...prev,
          ...filteredRentals,
        ]);
      } else {
        setRentals(filteredRentals);
      }

      setTotalRentals(
        pagination.total ||
        filteredRentals.length
      );

      setHasMore(
        pageNumber <
        (pagination.pages || 1)
      );

      setPage(pageNumber);
    } catch (error) {
      console.error(
        'Failed to fetch rentals:',
        error
      );
      toastError('Failed to load rentals. Please try again.');
      setRentals([]);
      setTotalRentals(0);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRentals(1, false);
  }, [
    selectedType,
    locationFilter,
    priceRange,
    searchQuery,
    location, // Refetch when location changes (navigation back from detail page)
  ]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRentals(1, false);
  };

  const handleLoadMore = () => {
    fetchRentals(page + 1, true);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setLocationFilter('');
    setPriceRange({
      min: 0,
      max: 100000,
    });
  };

  const handleFavorite = async (rentalId) => {
    if (!user) {
      return; // RentalCard handles navigation to login
    }
    try {
      const response = await rentalAPI.toggleFavorite(rentalId);
      const isFavorite = response.data?.isFavorite;
      const updatedRental = response.data?.data;

      // Update local state with backend response
      setRentals(rentals.map(r =>
        r._id === rentalId
          ? { ...r, isFavorited: isFavorite, favoritesCount: updatedRental?.favoritesCount || r.favoritesCount }
          : r
      ));

      // Update wishlist context
      await toggleWishlist(rentalId, 'rental');
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      toastError('Failed to update favorite. Please try again.');
    }
  };

  const handleViewRental = async (rentalId) => {
    if (!user) {
      return; // RentalCard handles navigation to login
    }

    // Check if already viewed
    const rental = rentals.find(r => r._id === rentalId);
    if (rental?.hasViewed) {
      return; // Already viewed, don't track again
    }

    try {
      // Track view on backend
      await rentalAPI.trackView(rentalId);

      // Update local state optimistically
      setRentals(rentals.map(r =>
        r._id === rentalId
          ? { ...r, hasViewed: true, views: (r.views || 0) + 1 }
          : r
      ));
    } catch (error) {
      console.error('Failed to track view:', error);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="bg-neutral-900/80 backdrop-blur-sm border-b border-neutral-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <form
            onSubmit={handleSearch}
            className="relative"
          >
            <Input
              type="text"
              placeholder="Search rentals..."
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(
                  e.target.value
                )
              }
              leftIcon={
                <Search size={18} />
              }
              rightIcon={
                searchQuery && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearchQuery('')
                    }
                    className="text-neutral-500 hover:text-neutral-300"
                  >
                    <X size={18} />
                  </button>
                )
              }
              fullWidth
            />
          </form>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() =>
                  setShowFilters(
                    !showFilters
                  )
                }
                className="flex items-center gap-2 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm font-medium text-neutral-300 hover:bg-neutral-700 transition-all whitespace-nowrap"
              >
                <Filter size={16} />
                Filters
              </button>

              {rentalTypes.map(
                (type) => (
                  <button
                    key={type.id}
                    onClick={() =>
                      setSelectedType(
                        type.id
                      )
                    }
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${selectedType ===
                      type.id
                      ? 'bg-gold-gradient text-black'
                      : 'bg-neutral-800 border border-neutral-700 text-neutral-300'
                      }`}
                  >
                    <type.icon
                      size={16}
                    />
                    {type.name}
                  </button>
                )
              )}
            </div>

            <span className="text-sm text-neutral-500 hidden sm:block">
              {totalRentals} rentals
            </span>
          </div>
        </div>

        {showFilters && (
          <motion.div
            initial={{
              height: 0,
              opacity: 0,
            }}
            animate={{
              height: 'auto',
              opacity: 1,
            }}
            className="border-t border-neutral-800 bg-neutral-900/80"
          >
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-neutral-300 mb-2">
                    Location
                  </label>

                  <Input
                    type="text"
                    placeholder="Chebai, Mabs, Stage, Kesses..."
                    value={
                      locationFilter
                    }
                    onChange={(e) =>
                      setLocationFilter(
                        e.target.value
                      )
                    }
                    leftIcon={
                      <MapPin
                        size={16}
                      />
                    }
                    fullWidth
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-300 mb-2">
                    Monthly Price
                  </label>

                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={
                        priceRange.min
                      }
                      onChange={(e) =>
                        setPriceRange({
                          ...priceRange,
                          min: Number(
                            e.target
                              .value
                          ),
                        })
                      }
                      fullWidth
                    />

                    <Input
                      type="number"
                      placeholder="Max"
                      value={
                        priceRange.max
                      }
                      onChange={(e) =>
                        setPriceRange({
                          ...priceRange,
                          max: Number(
                            e.target
                              .value
                          ),
                        })
                      }
                      fullWidth
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading &&
          rentals.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({
              length: 6,
            }).map((_, i) => (
              <SkeletonCard
                key={i}
              />
            ))}
          </div>
        ) : rentals.length === 0 ? (
          <EmptyState
            variant="rentals"
            title="No rentals found"
            message="Try changing your filters."
            actionLabel="Clear Filters"
            onAction={clearFilters}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rentals.map(
                (rental) => (
                  <RentalCard
                    key={
                      rental._id
                    }
                    rental={
                      rental
                    }
                    isFavorite={rental.isFavorited || isInWishlist(rental._id, 'rental')}
                    onFavorite={handleFavorite}
                    onView={handleViewRental}
                    isViewed={rental.hasViewed || false}
                  />
                )
              )}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="secondary"
                  onClick={
                    handleLoadMore
                  }
                  isLoading={
                    loading
                  }
                >
                  Load More Rentals
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RentalsPage;