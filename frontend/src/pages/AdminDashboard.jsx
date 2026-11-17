// frontend/src/pages/AdminDashboard.jsx
// Platform Administration & Founding Team Oversight Console

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ShieldCheck, 
  Users, 
  ShoppingBag, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MapPin, 
  Phone, 
  TrendingUp, 
  FileText, 
  RefreshCw,
  Search,
  Check
} from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../components/Toast';

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const { show: showToast } = useToast() || {};
  const [activeTab, setActiveTab] = useState('approvals'); // 'approvals' | 'analytics' | 'ledger'
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch Users / Vendors
  const { data: users = [], isLoading: loadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // Primary: /admin/users, Fallback: /users
      try {
        const res = await api.get('/admin/users');
        return res.data?.users || res.data?.data || [];
      } catch {
        const res = await api.get('/users');
        return res.data?.data || res.data?.users || [];
      }
    },
  });

  // 2. Fetch Orders for Platform Analytics & Ledger
  const { data: orders = [], isLoading: loadingOrders, refetch: refetchOrders } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      try {
        const res = await api.get('/admin/orders');
        return res.data?.orders || res.data?.data || [];
      } catch {
        const res = await api.get('/orders', { params: { limit: 100 } });
        return res.data?.data || res.data?.orders || [];
      }
    },
  });

  // 3. Mutation: Approve Vendor
  const approveMutation = useMutation({
    mutationFn: async (vendorId) => {
      const res = await api.patch(`/users/${vendorId}/approve`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      showToast?.(data.message || 'Vendor approved successfully!', 'success');
    },
    onError: (err) => {
      showToast?.(err.response?.data?.message || 'Failed to approve vendor', 'error');
    },
  });

  // Filter pending vendors: role === 'business' && !isApproved
  const pendingVendors = useMemo(() => {
    return users.filter(
      (u) => u.role === 'business' && u.businessProfile?.isApproved !== true
    );
  }, [users]);

  // Approved vendors
  const approvedVendors = useMemo(() => {
    return users.filter(
      (u) => u.role === 'business' && u.businessProfile?.isApproved === true
    );
  }, [users]);

  // Platform Metrics
  const platformStats = useMemo(() => {
    const totalGMV = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.finalAmount || o.totalAmount || 0), 0);
    const platformCommission = Math.round(totalGMV * 0.025); // 2.5% platform cut
    const activeOrders = orders.filter(
      (o) => o.status !== 'delivered' && o.status !== 'cancelled' && o.status !== 'completed'
    ).length;

    return {
      gmv: totalGMV,
      commission: platformCommission,
      activeOrders,
      totalVendors: approvedVendors.length,
      pendingCount: pendingVendors.length,
    };
  }, [orders, approvedVendors, pendingVendors]);

  return (
    <div className="space-y-6 pb-12 font-sans">

      {/* ── Admin Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 bg-olaOrange-light text-olaOrange-DEFAULT">
            <ShieldCheck size={14} />
            <span>OLAROUTE FOUNDING TEAM OVERSIGHT</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
            Admin Command Center
          </h1>
          <p className="text-gray-500 text-xs md:text-sm mt-0.5">
            Platform-wide governance, vendor vetting queues & campus financial ledger
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-2xl self-start md:self-auto">
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'approvals'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users size={14} className={activeTab === 'approvals' ? 'text-olaOrange-DEFAULT' : ''} />
            <span>Vendor Approvals</span>
            {pendingVendors.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                {pendingVendors.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'analytics'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp size={14} className={activeTab === 'analytics' ? 'text-olaOrange-DEFAULT' : ''} />
            <span>Platform Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ledger'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <DollarSign size={14} className={activeTab === 'ledger' ? 'text-olaOrange-DEFAULT' : ''} />
            <span>Financial Ledger</span>
          </button>
        </div>
      </div>

      {/* ── Metric Snapshot Tiles ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Gross Merch Value</span>
          <p className="text-2xl font-black text-gray-900 mt-1">
            KSh {platformStats.gmv.toLocaleString()}
          </p>
          <span className="text-[11px] text-olaGreen-DEFAULT font-bold block mt-1">Campus Total Sales</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Platform Take (2.5%)</span>
          <p className="text-2xl font-black text-olaOrange-DEFAULT mt-1">
            KSh {platformStats.commission.toLocaleString()}
          </p>
          <span className="text-[11px] text-gray-400 block mt-1">Dispute & infrastructure fee</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Live Campus Orders</span>
          <p className="text-2xl font-black text-[#FF5E00] mt-1">
            {platformStats.activeOrders}
          </p>
          <span className="text-[11px] text-gray-400 block mt-1">Currently in transit</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Approved Vendors</span>
          <p className="text-2xl font-black text-gray-900 mt-1">
            {platformStats.totalVendors}
          </p>
          <span className="text-[11px] text-orange-600 font-bold block mt-1">{platformStats.pendingCount} pending review</span>
        </div>
      </div>

      {/* ── TAB 1: VENDOR APPROVAL QUEUE ──────────────────────────────────── */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                <span>Pending Vendor Applications</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                  {pendingVendors.length} require action
                </span>
              </h2>
              <p className="text-xs text-gray-400">Review student & local merchant stores before publishing to campus feeds.</p>
            </div>
            <button
              onClick={() => refetchUsers()}
              className="p-2 text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded-xl"
              title="Refresh Queue"
            >
              <RefreshCw size={14} className={loadingUsers ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            {loadingUsers ? (
              <div className="p-8 text-center text-xs text-gray-400 animate-pulse">
                Loading vendor applications...
              </div>
            ) : pendingVendors.length === 0 ? (
              <div className="p-12 text-center max-w-sm mx-auto">
                <div className="w-12 h-12 rounded-xl bg-olaGreen-light text-olaGreen-DEFAULT flex items-center justify-center mx-auto mb-3">
                  <CheckCircle size={24} />
                </div>
                <h3 className="text-sm font-bold text-gray-800">Queue is completely clear!</h3>
                <p className="text-xs text-gray-400 mt-1">
                  All registered business partners have been vetted and verified for campus commerce.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-100 font-bold">
                    <tr>
                      <th className="px-5 py-3.5">Vendor / Store</th>
                      <th className="px-5 py-3.5">Campus Location</th>
                      <th className="px-5 py-3.5">Category</th>
                      <th className="px-5 py-3.5">Operating Hours</th>
                      <th className="px-5 py-3.5">Contact Phone</th>
                      <th className="px-5 py-3.5 text-right">Approval Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pendingVendors.map((vendor) => (
                      <tr key={vendor._id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-bold text-gray-900 text-sm">
                              {vendor.businessProfile?.businessName || vendor.name}
                            </p>
                            <span className="text-[11px] text-gray-400">{vendor.email}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md text-[11px]">
                            <MapPin size={12} className="text-[#FF5E00]" />
                            {vendor.businessProfile?.campusLocation || 'Stage Hub'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-semibold text-gray-600">
                            {vendor.businessProfile?.businessCategory || 'General Goods'}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono text-[11px] text-gray-500">
                          {vendor.businessProfile?.operatingHours?.open || '07:00'} - {vendor.businessProfile?.operatingHours?.close || '22:00'}
                        </td>
                        <td className="px-5 py-4">
                          <a
                            href={`tel:${vendor.phone}`}
                            className="font-bold text-olaGreen-DEFAULT hover:underline flex items-center gap-1"
                          >
                            <Phone size={12} /> {vendor.phone}
                          </a>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => approveMutation.mutate(vendor._id)}
                            disabled={approveMutation.isPending}
                            className="px-4 py-2 bg-olaGreen-DEFAULT hover:bg-olaGreen-deep text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 ml-auto cursor-pointer disabled:opacity-50"
                          >
                            <Check size={14} />
                            <span>Approve Vendor</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: FINANCIAL LEDGER & M-PESA LOGS ──────────────────────────── */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-gray-900">M-Pesa Transaction & Disbursement Ledger</h2>
              <p className="text-xs text-gray-400">Audit trail of customer checkout receipts, platform fees, and pending vendor payouts.</p>
            </div>
            <button
              onClick={() => refetchOrders()}
              className="p-2 text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded-xl"
              title="Refresh Ledger"
            >
              <RefreshCw size={14} className={loadingOrders ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-100 font-bold">
                  <tr>
                    <th className="px-5 py-3.5">Order ID</th>
                    <th className="px-5 py-3.5">M-Pesa Receipt</th>
                    <th className="px-5 py-3.5">Customer Gross</th>
                    <th className="px-5 py-3.5">Platform Fee (2.5%)</th>
                    <th className="px-5 py-3.5">Vendor Payout</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.slice(0, 25).map((order) => {
                    const gross = order.finalAmount || order.totalAmount || 0;
                    const fee = Math.round(gross * 0.025);
                    const payout = order.vendorPayout || (gross - fee);

                    return (
                      <tr key={order._id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-5 py-4 font-mono font-bold text-gray-800">
                          #{order._id?.slice(-6)}
                        </td>
                        <td className="px-5 py-4 font-mono text-[11px] text-gray-700 font-semibold">
                          {order.mpesaReceiptNumber || 'MPESA_PENDING'}
                        </td>
                        <td className="px-5 py-4 font-black text-gray-900">
                          KSh {gross.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 font-bold text-olaOrange-DEFAULT">
                          KSh {fee.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 font-bold text-olaGreen-DEFAULT">
                          KSh {payout.toLocaleString()}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            order.status === 'delivered' || order.status === 'completed'
                              ? 'bg-olaGreen-light text-olaGreen-DEFAULT'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: PLATFORM OVERVIEW ──────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-6">
          <h2 className="text-base font-black text-gray-900">Platform Growth & Ecosystem Distribution</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200/60 space-y-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Campus Merchant Network</span>
              <p className="text-3xl font-black text-gray-900">{approvedVendors.length} Verified Stores</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Active food kibandas, thrift sellers, tech repair hubs, and gas refill depots servicing students.
              </p>
            </div>
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200/60 space-y-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Order Conversion Velocity</span>
              <p className="text-3xl font-black text-[#FF5E00]">{orders.length} Campus Orders</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Direct transactions facilitated with automated M-Pesa push integration.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
