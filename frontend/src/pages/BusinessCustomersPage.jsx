import { useState, useEffect, useCallback } from 'react';
import { businessAPI } from '../services/api';
import { Search, User, Mail, Phone, ShoppingBag, Award, Wallet, ArrowLeft } from 'lucide-react';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/ui/Button';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const BusinessCustomersPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    repeatCustomers: 0,
    totalSales: 0,
    averageSpending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchCustomersData = useCallback(async (search = '', pageNumber = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        search: search || undefined,
        page: pageNumber,
        limit: 10,
      };

      const response = await businessAPI.getCustomers(params);

      if (response.data?.success) {
        setCustomers(response.data.data || []);
        if (response.data.stats) {
          setStats(response.data.stats);
        }
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.pages || 1);
          setPage(response.data.pagination.currentPage || 1);
        }
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError(err.response?.data?.message || 'Failed to load customers data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search input or fetch when search query changes
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCustomersData(searchQuery, 1);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, fetchCustomersData]);

  const handleRefresh = () => {
    fetchCustomersData(searchQuery, page);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchCustomersData(searchQuery, newPage);
    }
  };

  if (loading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-5 border border-secondary-100 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-secondary-800 flex items-center gap-2">
            <User className="w-6 h-6 text-primary-650" />
            Customers
          </h1>
          <p className="text-secondary-500 mt-1 text-sm font-medium">
            Monitor your customer list, order count, and purchase histories directly from the database.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-705 text-white rounded-xl font-semibold text-sm shadow-sm transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="card bg-red-50 border border-red-200 p-6 rounded-2xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-bold text-red-800">Error Loading Customers</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-red-650 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 bg-white shadow-sm border border-secondary-100 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-secondary-400 uppercase tracking-wider">Total Customers</p>
            <p className="text-2xl font-extrabold text-secondary-800 mt-1">
              {stats.totalCustomers}
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shadow-inner">
            <User className="w-6 h-6" />
          </div>
        </div>

        <div className="card p-5 bg-white shadow-sm border border-secondary-100 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-secondary-400 uppercase tracking-wider">Repeat Customers</p>
            <p className="text-2xl font-extrabold text-green-600 mt-1">
              {stats.repeatCustomers}
            </p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 shadow-inner">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="card p-5 bg-white shadow-sm border border-secondary-100 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-secondary-400 uppercase tracking-wider">Total Sales Revenue</p>
            <p className="text-2xl font-extrabold text-secondary-800 mt-1">
              {formatCurrency(stats.totalSales)}
            </p>
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 shadow-inner">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="card p-5 bg-white shadow-sm border border-secondary-100 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-secondary-400 uppercase tracking-wider">Average Customer Spend</p>
            <p className="text-2xl font-extrabold text-blue-600 mt-1">
              {formatCurrency(stats.averageSpending)}
            </p>
          </div>
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-inner">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter / Search section */}
      <div className="card bg-white p-4 border border-secondary-100 rounded-xl shadow-sm">
        <Input
          type="text"
          placeholder="Search customers by name, phone, email or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search size={18} className="text-secondary-400" />}
          fullWidth
        />
      </div>

      {/* Main content table/list */}
      {customers.length === 0 ? (
        <div className="card bg-white p-12 text-center rounded-xl border border-secondary-100 shadow-sm flex flex-col items-center justify-center">
          <User className="w-12 h-12 text-secondary-300 mb-3" />
          <p className="text-secondary-700 font-semibold text-base">No customers found</p>
          <p className="text-secondary-400 text-sm mt-1 max-w-sm">
            {searchQuery ? "Try refining your search query to find your registered users." : "Once customers place orders with your business, they will appear here."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block card bg-white border border-secondary-100 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary-50 border-b border-secondary-100 text-left">
                    <th className="py-4 px-6 text-sm font-semibold text-secondary-600">Customer Name</th>
                    <th className="py-4 px-6 text-sm font-semibold text-secondary-600">Contact Details</th>
                    <th className="py-4 px-6 text-sm font-semibold text-secondary-600 text-center">Orders Count</th>
                    <th className="py-4 px-6 text-sm font-semibold text-secondary-600 text-right">Total Spent</th>
                    <th className="py-4 px-6 text-sm font-semibold text-secondary-600 text-right">Last Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {customers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-secondary-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center text-primary-600 border border-primary-100">
                            <span className="font-semibold text-sm">
                              {cust.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-secondary-800">{cust.name}</p>
                            <p className="text-xs text-secondary-400 mt-0.5 max-w-xs truncate" title={cust.address}>
                              {cust.address}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-1 text-sm text-secondary-600">
                          <p className="flex items-center gap-1.5">
                            <Mail size={13} className="text-secondary-400" />
                            {cust.email}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <Phone size={13} className="text-secondary-400" />
                            {cust.phone}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                          {cust.orderCount} Orders
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-secondary-800">
                        {formatCurrency(cust.totalSpent)}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <p className="text-sm text-secondary-700 font-medium">
                          {new Date(cust.lastOrderDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-secondary-400 mt-0.5">
                          {new Date(cust.lastOrderDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile/Tablet Card Grid View */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
            {customers.map((cust) => (
              <div key={cust.id} className="card p-5 bg-white border border-secondary-100 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Top line with Avatar */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 font-bold text-sm">
                      {cust.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-secondary-800 text-base">{cust.name}</h3>
                      <p className="text-xs text-secondary-400 font-medium mt-0.5">{cust.address}</p>
                    </div>
                  </div>

                  {/* Details Block */}
                  <div className="pt-3 border-t border-secondary-50 space-y-2 text-sm text-secondary-600">
                    <p className="flex items-center gap-2">
                      <Mail size={14} className="text-secondary-400" />
                      <span className="truncate">{cust.email}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone size={14} className="text-secondary-400" />
                      <span>{cust.phone}</span>
                    </p>
                  </div>
                </div>

                {/* Footnotes Block */}
                <div className="mt-5 pt-3 border-t border-secondary-50 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-secondary-400 font-medium block">Total Spent</span>
                    <span className="font-bold text-secondary-800 text-base">{formatCurrency(cust.totalSpent)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-secondary-400 font-medium block">{cust.orderCount} Orders</span>
                    <span className="text-xs text-secondary-500 font-semibold bg-secondary-100 px-2.5 py-1 rounded-full inline-block mt-1">
                      {new Date(cust.lastOrderDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 bg-white border border-secondary-100 rounded-xl shadow-sm">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 border rounded-xl text-sm font-medium hover:bg-secondary-50 disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm font-semibold text-secondary-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="px-4 py-2 border rounded-xl text-sm font-medium hover:bg-secondary-50 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BusinessCustomersPage;
