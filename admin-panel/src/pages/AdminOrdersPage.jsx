import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/LoadingSpinner';
import { Search, ShoppingBag, Eye, Flag, ShieldAlert, CheckCircle } from 'lucide-react';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, [search, status]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getOrders({ search, status });
      setOrders(res.data.data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReview = async (orderId, currentFlag) => {
    try {
      const markReview = !currentFlag;
      await adminAPI.updateOrder(orderId, { markForReview: markReview });
      alert(`Order review flag set successfully.`);
      fetchOrders();
    } catch (err) {
      console.error('Failed to flag order:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Marketplace Orders</h1>
          <p className="text-slate-400 mt-1">Review, flag, and monitor overall delayed or problematic platform orders</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Input
          placeholder="Search by Order ID, customer, or business..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={18} className="text-slate-500" />}
          className="bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-100 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="processing">Processing</option>
          <option value="delivered">Delivered</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950">
                <th className="p-4">Order ID</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Business</th>
                <th className="p-4">Total Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {orders.map((o) => {
                const isReviewed = o.notes?.includes('ADMIN REVIEW FLAG: true');
                return (
                  <tr key={o._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-mono text-white text-xs">{o._id}</td>
                    <td className="p-4">{o.customer?.name || 'Deleted User'}</td>
                    <td className="p-4">{o.business?.businessProfile?.businessName || o.business?.name || 'Deleted Business'}</td>
                    <td className="p-4 font-semibold text-green-400">{formatCurrency(o.finalAmount || o.totalAmount)}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        o.status === 'completed' || o.status === 'delivered' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        o.status === 'pending' || o.status === 'processing' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <Button
                          variant={isReviewed ? 'success' : 'warning'}
                          size="xs"
                          onClick={() => handleMarkReview(o._id, isReviewed)}
                          title="Mark Order for Review"
                          className="flex items-center gap-1"
                        >
                          <Flag size={14} />
                          {isReviewed ? 'Unflag' : 'Flag Review'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500 font-semibold">No orders found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;
