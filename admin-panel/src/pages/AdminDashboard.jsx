import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Package, 
  Home, 
  ShoppingCart, 
  CreditCard, 
  TrendingUp,
  DollarSign,
  Activity,
  Award,
  BookOpen,
  AlertTriangle
} from 'lucide-react';
import { adminAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getDashboardStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Admin Overview</h1>
        <p className="text-slate-400 mt-1">Platform monitoring and real-time MongoDB metrics</p>
      </div>

      {stats && (
        <>
          {/* Key Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-400">Total Registered Users</p>
                <h3 className="text-3xl font-bold mt-2 text-white">{stats.totalUsers}</h3>
              </div>
              <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-lg flex items-center justify-center">
                <Users size={24} />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-400">Commission Revenue</p>
                <h3 className="text-3xl font-bold mt-2 text-green-400">{formatCurrency(stats.totalRevenue || 0)}</h3>
              </div>
              <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-lg flex items-center justify-center">
                <DollarSign size={24} />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-400">Marketplace Orders</p>
                <h3 className="text-3xl font-bold mt-2 text-orange-400">{stats.completedOrders + stats.activeOrders}</h3>
              </div>
              <div className="w-12 h-12 bg-orange-500/20 text-orange-400 rounded-lg flex items-center justify-center">
                <ShoppingCart size={24} />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-400">Active Rides</p>
                <h3 className="text-3xl font-bold mt-2 text-teal-400">{stats.activeRides}</h3>
              </div>
              <div className="w-12 h-12 bg-teal-500/20 text-teal-400 rounded-lg flex items-center justify-center">
                <Activity size={24} />
              </div>
            </div>
          </div>

          {/* Detailed Role Breakdown & Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">Users By Role</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Customers</span>
                  <span className="font-semibold text-white">{stats.totalCustomers}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Marketplace Businesses</span>
                  <span className="font-semibold text-white">{stats.totalBusinesses}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Property Landlords</span>
                  <span className="font-semibold text-white">{stats.totalLandlords}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Boda Riders</span>
                  <span className="font-semibold text-white">{stats.totalRiders}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Property Caretakers</span>
                  <span className="font-semibold text-white">{stats.totalCaretakers}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Business Assistants</span>
                  <span className="font-semibold text-white">{stats.totalAssistants}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">Platform Booking Status</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Pending Bookings</span>
                  <span className="font-semibold text-yellow-400">{stats.pendingBookings}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Approved Bookings</span>
                  <span className="font-semibold text-green-400">{stats.approvedBookings}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Pending Marketplace Orders</span>
                  <span className="font-semibold text-orange-400">{stats.pendingOrders}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Cancelled Orders</span>
                  <span className="font-semibold text-red-400">{stats.cancelledOrders}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">Ride Statistics</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Pending Rides</span>
                  <span className="font-semibold text-indigo-400">{stats.pendingRides}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Active Rides</span>
                  <span className="font-semibold text-teal-400">{stats.activeRides}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Completed Rides</span>
                  <span className="font-semibold text-green-400">{stats.completedRides}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Registrations & Active Activity Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">Recent Registrations</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="pb-3">Name</th>
                      <th className="pb-3">Email</th>
                      <th className="pb-3">Role</th>
                      <th className="pb-3">Date Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {stats.recentRegistrations?.map((r) => (
                      <tr key={r._id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 font-medium text-white">{r.name}</td>
                        <td className="py-3">{r.email}</td>
                        <td className="py-3 capitalize">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            r.role === 'customer' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                            r.role === 'business' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                            r.role === 'landlord' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {r.role}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">Recent Activity (Latest Orders)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="pb-3">Order ID</th>
                      <th className="pb-3">Customer</th>
                      <th className="pb-3">Total</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {stats.recentOrders?.map((o) => (
                      <tr key={o._id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 font-mono text-white text-xs">{o._id.toString().slice(-6).toUpperCase()}</td>
                        <td className="py-3">{o.customer?.name || 'Deleted'}</td>
                        <td className="py-3 font-semibold text-green-400">{formatCurrency(o.finalAmount || o.totalAmount)}</td>
                        <td className="py-3 capitalize">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            o.status === 'completed' || o.status === 'delivered' ? 'bg-green-500/10 text-green-400' :
                            o.status === 'pending' || o.status === 'processing' ? 'bg-yellow-500/10 text-yellow-400' :
                            'bg-red-500/10 text-red-400'
                          }`}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
