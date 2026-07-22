import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { useSocket } from '../context/SocketContext';

const rentalTypes = [
  { id: 'all', name: 'All Types', icon: Home },
  { id: 'bedsitter', name: 'Bedsitters', icon: Building },
  { id: 'single', name: 'Single Rooms', icon: Home },
  { id: 'one-bedroom', name: 'One Bedroom', icon: Building },
  { id: 'two-bedroom', name: 'Two Bedroom', icon: Building },
  { id: 'apartment', name: 'Apartments', icon: Building },
  { id: 'hostel', name: 'Hostels', icon: Home },
  { id: 'commercial', name: 'Commercial Spaces', icon: Building },
];

const RentalsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { success: toastSuccess, error: toastError } = useToast();

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

  // Real-time rentals synchronization (Feature 5)
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;

    const handleRentalCreated = (newRental) => {
      console.log('[RentalsPage] Real-time rental_created received:', newRental);
      if (newRental) {
        setRentals(prev => {
          if (prev.some(r => r._id === newRental._id)) return prev;
          return [newRental, ...prev];
        });
      }
    };

    const handleRentalUpdated = (updatedRental) => {
      console.log('[RentalsPage] Real-time rental_updated received:', updatedRental);
      if (updatedRental) {
        setRentals(prev =>
          prev.map(r => r._id === updatedRental._id ? { ...r, ...updatedRental } : r)
        );
      }
    };

    const handleRentalDeleted = ({ rentalId }) => {
      console.log('[RentalsPage] Real-time rental_deleted received:', rentalId);
      if (rentalId) {
        setRentals(prev => prev.filter(r => r._id !== rentalId));
      }
    };

    socket.on('rental_created', handleRentalCreated);
    socket.on('rental_updated', handleRentalUpdated);
    socket.on('rental_deleted', handleRentalDeleted);

    return () => {
      socket.off('rental_created', handleRentalCreated);
      socket.off('rental_updated', handleRentalUpdated);
      socket.off('rental_deleted', handleRentalDeleted);
    };
  }, [socket]);

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
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    // Check if already viewed
    const rental = rentals.find(r => r._id === rentalId);
    if (rental?.hasViewed) {
      toastSuccess('You have already viewed this property.');
      return;
    }

    try {
      // Track view on backend
      const response = await rentalAPI.trackView(rentalId);
      const serverViews = response.data?.data?.views;

      // Update local state
      setRentals(rentals.map(r =>
        r._id === rentalId
          ? { ...r, hasViewed: true, views: serverViews !== undefined ? serverViews : (r.views || 0) + 1 }
          : r
      ));

      toastSuccess('✓ Property view registered.');
    } catch (error) {
      console.error('Failed to track view:', error);
      toastError('Failed to register property view. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-30 shadow-sm">
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
                    className="text-neutral-500 hover:text-neutral-600"
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
                className="flex items-center gap-2 px-4 py-2 bg-neutral-100 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-200 transition-all whitespace-nowrap"
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
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-100 border border-neutral-200 text-neutral-700'
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

            <span className="text-sm text-neutral-600 hidden sm:block">
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
            className="border-t border-neutral-200 bg-white"
          >
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-neutral-700 mb-2">
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
                  <label className="block text-sm text-neutral-700 mb-2">
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
                (rental, idx) => (
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
                    priority={idx < 3} // Eagerly load the first 3 visible images above-the-fold
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