import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Search,
  Eye,
  Trash2,
  ShieldAlert,
  CheckCircle,
  Flag,
  Package,
  Folder,
  Tag,
  BarChart3,
  DollarSign,
  ShoppingBag,
  Calendar,
  User,
  Phone,
  Mail,
  X
} from 'lucide-react';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const AdminProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    inactiveProducts: 0,
    outOfStockProducts: 0,
    flaggedProducts: 0,
    totalViews: 0,
    totalOrders: 0
  });

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchStats();
  }, [search, category, status, sortBy, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, category, status, sortBy]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getProducts({
        search,
        category,
        status,
        sortBy,
        page,
        limit: 10
      });
      setProducts(res.data.data || []);
      if (res.data.pagination) {
        setTotalPages(res.data.pagination.pages || 1);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await adminAPI.getProductsStats();
      if (res.data.success && res.data.data) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching product stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleToggleStatus = async (product) => {
    const updatedStatus = !product.isActive;
    const actionText = updatedStatus ? 'activate' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${actionText} this product?`)) return;

    try {
      await adminAPI.updateProductStatus(product._id, { isActive: updatedStatus });
      alert(`Product ${updatedStatus ? 'activated' : 'suspended'} successfully.`);
      fetchProducts();
      fetchStats();
    } catch (err) {
      console.error('Failed to update product status:', err);
      alert('Failed to update product status. Please try again.');
    }
  };

  const handleToggleFlag = async (product) => {
    const updatedFlag = !product.isFlagged;
    const actionText = updatedFlag ? 'flag' : 'unflag';
    if (!window.confirm(`Are you sure you want to ${actionText} this product as suspicious?`)) return;

    try {
      await adminAPI.flagProduct(product._id, { isFlagged: updatedFlag });
      alert(`Product ${updatedFlag ? 'flagged and suspended' : 'unflagged and activated'} successfully.`);
      fetchProducts();
      fetchStats();
      if (selectedProduct && selectedProduct._id === product._id) {
        // Refresh detail modal if open
        handleViewDetails(product._id);
      }
    } catch (err) {
      console.error('Failed to flag product:', err);
      alert('Failed to update product flag. Please try again.');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you ABSOLUTELY sure you want to delete this product? This will permanently remove the product from the marketplace and pull it from all customer wishlists. This action cannot be undone.')) return;
    try {
      await adminAPI.deleteProduct(productId);
      alert('Product permanently deleted successfully.');
      setIsModalOpen(false);
      setSelectedProduct(null);
      fetchProducts();
      fetchStats();
    } catch (err) {
      console.error('Failed to delete product:', err);
      alert('Failed to delete product. Please try again.');
    }
  };

  const handleViewDetails = async (productId) => {
    try {
      const res = await adminAPI.getProductById(productId);
      if (res.data.success && res.data.data) {
        setSelectedProduct(res.data.data);
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error('Error fetching product details:', err);
      alert('Failed to load product details.');
    }
  };

  // Helper to determine status label
  const getProductStatus = (product) => {
    if (product.isFlagged) return 'Flagged';
    if (!product.isActive) return 'Inactive';
    if (product.stock === 0) return 'Out of Stock';
    return 'Active';
  };

  // List of common categories
  const categories = [
    'Electronics',
    'Kitchen',
    'Fashion',
    'Home & Living',
    'Books',
    'Food & Groceries',
    'Healthcare',
    'Beauty',
    'Toys & Games',
    'Software',
    'Other'
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Package className="text-blue-500" /> Products Management
        </h1>
        <p className="text-slate-400 mt-1">Monitor product activity, pricing, stock levels, ownership, and platform violations</p>
      </div>

      {/* Monitoring Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Products</span>
            <Package size={16} className="text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{statsLoading ? '...' : stats.totalProducts}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active</span>
            <CheckCircle size={16} className="text-green-400" />
          </div>
          <p className="text-2xl font-bold text-green-400">{statsLoading ? '...' : stats.activeProducts}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Inactive</span>
            <X size={16} className="text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-300">{statsLoading ? '...' : stats.inactiveProducts}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Out of Stock</span>
            <Tag size={16} className="text-yellow-400" />
          </div>
          <p className="text-2xl font-bold text-yellow-400">{statsLoading ? '...' : stats.outOfStockProducts}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Flagged</span>
            <ShieldAlert size={16} className="text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400">{statsLoading ? '...' : stats.flaggedProducts}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Views</span>
            <Eye size={16} className="text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-purple-400">{statsLoading ? '...' : stats.totalViews}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Orders</span>
            <ShoppingBag size={16} className="text-pink-400" />
          </div>
          <p className="text-2xl font-bold text-pink-400">{statsLoading ? '...' : stats.totalOrders}</p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Input
          placeholder="Search by name, category, or business name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={18} className="text-slate-500" />}
          className="bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500"
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-100 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-100 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active (In Stock)</option>
          <option value="inactive">Inactive</option>
          <option value="out_of_stock">Out of Stock</option>
          <option value="flagged">Flagged / Suspicious</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-100 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="stock_asc">Stock: Low to High</option>
          <option value="stock_desc">Stock: High to Low</option>
        </select>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm min-w-[1000px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950">
                  <th className="p-4 w-16">Image</th>
                  <th className="p-4">Product Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Business Owner</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Views</th>
                  <th className="p-4">Orders</th>
                  <th className="p-4">Created</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {products.map((p) => {
                  const currentStatus = getProductStatus(p);
                  return (
                    <tr key={p._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden flex items-center justify-center border border-slate-700">
                          {p.images && p.images[0] ? (
                            <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={16} className="text-slate-500" />
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-white max-w-xs truncate" title={p.name}>
                        {p.name}
                      </td>
                      <td className="p-4 text-slate-400">{p.category}</td>
                      <td className="p-4 font-medium text-slate-300">
                        {p.business?.businessName || p.business?.name || 'Unknown Business'}
                      </td>
                      <td className="p-4 font-semibold text-white">{formatCurrency(p.price)}</td>
                      <td className="p-4">
                        <span className={`font-semibold ${p.stock === 0 ? 'text-red-400' : 'text-slate-300'}`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          currentStatus === 'Active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                          currentStatus === 'Inactive' ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' :
                          currentStatus === 'Out of Stock' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            currentStatus === 'Active' ? 'bg-green-400' :
                            currentStatus === 'Inactive' ? 'bg-slate-400' :
                            currentStatus === 'Out of Stock' ? 'bg-yellow-400' :
                            'bg-red-400'
                          }`} />
                          {currentStatus}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">{p.views || 0}</td>
                      <td className="p-4 font-semibold text-pink-400">{p.ordersCount || 0}</td>
                      <td className="p-4 text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleViewDetails(p._id)}
                            className="p-1.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors border border-blue-500/20"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>

                          <Button
                            variant={p.isActive ? 'warning' : 'success'}
                            size="xs"
                            onClick={() => handleToggleStatus(p)}
                            className="h-8 flex items-center justify-center gap-1 px-2"
                            title={p.isActive ? 'Suspend Product' : 'Activate Product'}
                          >
                            {p.isActive ? <ShieldAlert size={12} /> : <CheckCircle size={12} />}
                            {p.isActive ? 'Suspend' : 'Activate'}
                          </Button>

                          <button
                            onClick={() => handleToggleFlag(p)}
                            className={`p-1.5 rounded transition-colors border ${
                              p.isFlagged
                                ? 'bg-red-600/20 text-red-400 border-red-500/30'
                                : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                            }`}
                            title={p.isFlagged ? 'Unflag Product' : 'Flag as Suspicious'}
                          >
                            <Flag size={14} className={p.isFlagged ? 'fill-current' : ''} />
                          </button>

                          <button
                            onClick={() => handleDeleteProduct(p._id)}
                            className="p-1.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors border border-red-500/30"
                            title="Delete Product"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {products.length === 0 && (
                  <tr>
                    <td colSpan="11" className="p-8 text-center text-slate-500 font-semibold">
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
              <span className="text-xs text-slate-400">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Product Details Modal */}
      {isModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div>
                <h2 className="text-xl font-bold text-white">Product Insights</h2>
                <p className="text-xs text-slate-400 mt-1">ID: {selectedProduct._id}</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              {/* Image and Primary Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Images Gallery */}
                <div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl h-64 overflow-hidden flex items-center justify-center relative">
                    {selectedProduct.images && selectedProduct.images[0] ? (
                      <img
                        src={selectedProduct.images[0]}
                        alt={selectedProduct.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Package size={64} className="text-slate-600" />
                    )}
                  </div>
                  {/* Small Thumbnails */}
                  {selectedProduct.images && selectedProduct.images.length > 1 && (
                    <div className="flex gap-2 mt-2 overflow-x-auto py-1">
                      {selectedProduct.images.map((img, i) => (
                        <div key={i} className="w-12 h-12 rounded border border-slate-800 overflow-hidden bg-slate-950 flex-shrink-0">
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Primary Fields */}
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Name</span>
                    <h3 className="text-2xl font-bold text-white mt-0.5 leading-snug">{selectedProduct.name}</h3>
                  </div>

                  <div className="flex gap-6">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</span>
                      <p className="text-xl font-bold text-green-400 mt-0.5">{formatCurrency(selectedProduct.price)}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock Status</span>
                      <p className="text-lg font-bold text-slate-300 mt-0.5">
                        {selectedProduct.stock} <span className="text-xs text-slate-500 font-normal">items left</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-6">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</span>
                      <p className="text-sm text-slate-300 mt-0.5 flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-full w-fit">
                        <Folder size={14} className="text-blue-400" /> {selectedProduct.category}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Status</span>
                      <div className="mt-1">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          getProductStatus(selectedProduct) === 'Active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                          getProductStatus(selectedProduct) === 'Inactive' ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' :
                          getProductStatus(selectedProduct) === 'Out of Stock' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            getProductStatus(selectedProduct) === 'Active' ? 'bg-green-400' :
                            getProductStatus(selectedProduct) === 'Inactive' ? 'bg-slate-400' :
                            getProductStatus(selectedProduct) === 'Out of Stock' ? 'bg-yellow-400' :
                            'bg-red-400'
                          }`} />
                          {getProductStatus(selectedProduct)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Description */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Full Description</span>
                <p className="text-sm text-slate-300 mt-1 whitespace-pre-wrap leading-relaxed">
                  {selectedProduct.description || 'No description provided.'}
                </p>
              </div>

              {/* Performance / Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
                  <div className="p-2.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg">
                    <Eye size={18} />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-semibold block">Total Views</span>
                    <span className="text-lg font-bold text-white">{selectedProduct.views || 0}</span>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
                  <div className="p-2.5 bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded-lg">
                    <ShoppingBag size={18} />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-semibold block">Total Orders Count</span>
                    <span className="text-lg font-bold text-white">{selectedProduct.ordersCount || 0}</span>
                  </div>
                </div>
              </div>

              {/* Business Ownership & Profile */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <User size={16} className="text-blue-400" />
                  <span className="text-sm font-bold text-white">Business Owner Profile</span>
                </div>

                {selectedProduct.business ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-slate-500 font-semibold block">Business Name</span>
                      <span className="text-slate-200 font-medium">{selectedProduct.business.businessName || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-semibold block">Contact Email</span>
                      <span className="text-slate-300 flex items-center gap-1 mt-0.5">
                        <Mail size={12} /> {selectedProduct.business.email}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-semibold block">Contact Phone</span>
                      <span className="text-slate-300 flex items-center gap-1 mt-0.5">
                        <Phone size={12} /> {selectedProduct.business.phone}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Business ownership details are missing or unavailable.</p>
                )}
              </div>

              {/* Timestamps */}
              <div className="flex justify-between text-xs text-slate-500 border-t border-slate-800 pt-4 px-1">
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> Created: {new Date(selectedProduct.createdAt).toLocaleString()}
                </span>
                <span>
                  Last Updated: {new Date(selectedProduct.updatedAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Modal Footer / Quick Actions */}
            <div className="p-6 border-t border-slate-800 bg-slate-950 flex justify-between gap-4">
              <Button
                variant="danger"
                size="md"
                onClick={() => handleDeleteProduct(selectedProduct._id)}
                className="flex items-center gap-1.5"
              >
                <Trash2 size={16} /> Delete Product
              </Button>

              <div className="flex gap-2">
                <Button
                  variant={selectedProduct.isFlagged ? 'success' : 'danger'}
                  size="md"
                  onClick={() => handleToggleFlag(selectedProduct)}
                  className="flex items-center gap-1.5"
                >
                  <Flag size={16} className={selectedProduct.isFlagged ? 'fill-current' : ''} />
                  {selectedProduct.isFlagged ? 'Unflag Product' : 'Flag as Suspicious'}
                </Button>

                <Button
                  variant={selectedProduct.isActive ? 'warning' : 'success'}
                  size="md"
                  onClick={() => handleToggleStatus(selectedProduct)}
                  className="flex items-center gap-1.5"
                >
                  {selectedProduct.isActive ? <ShieldAlert size={16} /> : <CheckCircle size={16} />}
                  {selectedProduct.isActive ? 'Suspend Product' : 'Reactivate Product'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductsPage;
