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
  Check,
  X,
  Bike,
  Store,
  Home,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../components/Toast';

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast() || {};
  const [activeTab, setActiveTab] = useState('approvals'); // 'approvals' | 'analytics' | 'ledger'
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch Users / Role Applicants / Vendors
  const { data: users = [], isLoading: loadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // Primary: /admin/users, Fallback: /users
      try {
        const res = await api.get('/admin/users', { params: { limit: 100 } });
        return res.data?.users || res.data?.data || [];
      } catch {
        const res = await api.get('/users', { params: { limit: 100 } });
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

  // 3. Mutation: Review Partner Role Application (POST-sign-up upgrade pipeline)
  const reviewRoleMutation = useMutation({
    mutationFn: async ({ userId, action }) => {
      const res = await api.patch(`/users/${userId}/review-role`, { action });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toastSuccess?.(data.message || 'Application reviewed successfully!');
    },
    onError: (err) => {
      toastError?.(err.response?.data?.message || 'Failed to review role application');
    },
  });

  // 4. Mutation: Approve Legacy Vendor
  const approveMutation = useMutation({
    mutationFn: async (vendorId) => {
      const res = await api.patch(`/users/${vendorId}/approve`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toastSuccess?.(data.message || 'Vendor approved successfully!');
    },
    onError: (err) => {
      toastError?.(err.response?.data?.message || 'Failed to approve vendor');
    },
  });

  // Filter pending role applications
  const pendingRoleApplications = useMemo(() => {
    return users.filter(
      (u) => u.roleApplication && u.roleApplication.status === 'pending'
    );
  }, [users]);

  // Filter pending legacy vendors: role === 'business' && !isApproved
  const pendingVendors = useMemo(() => {
    return users.filter(
      (u) => u.role === 'business' && u.businessProfile?.isApproved !== true && u.roleApplication?.status !== 'pending'
    );
  }, [users]);

  // Approved vendors
  const approvedVendors = useMemo(() => {
    return users.filter(
      (u) => u.role === 'business' && u.businessProfile?.isApproved === true
    );
  }, [users]);

  const totalPendingActionCount = pendingRoleApplications.length + pendingVendors.length;

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
      pendingCount: totalPendingActionCount,
      pendingRolesCount: pendingRoleApplications.length,
    };
  }, [orders, approvedVendors, totalPendingActionCount, pendingRoleApplications.length]);

  const renderRoleBadge = (role) => {
    switch (role) {
      case 'rider':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Bike size={12} />
            <span>Rider / Boda</span>
          </span>
        );
      case 'business':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-olaGreen-light text-olaGreen-DEFAULT border border-olaGreen-DEFAULT/30">
            <Store size={12} />
            <span>Vendor / Store</span>
          </span>
        );
      case 'landlord':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Home size={12} />
            <span>Landlord / Hostel</span>
          </span>
        );
      case 'assistant':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Briefcase size={12} />
            <span>Campus Ambassador</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
            <span>{role}</span>
          </span>
        );
    }
  };

  const renderRoleDetails = (app) => {
    const details = app.details || {};
    switch (app.requestedRole) {
      case 'rider':
        return (
          <div className="space-y-0.5 text-xs text-gray-600">
            <p>
              <strong className="text-gray-900">Stage:</strong> {details.primaryStage || 'Stage'}
            </p>
            <p>
              <strong className="text-gray-900">Vehicle:</strong> {details.isFootRunner ? 'Foot Runner' : (details.bikePlate || 'Motorcycle')}
            </p>
            {details.mpesaNumber && (
              <p>
                <strong className="text-gray-900">M-Pesa:</strong> {details.mpesaNumber}
              </p>
            )}
          </div>
        );
      case 'business':
        return (
          <div className="space-y-0.5 text-xs text-gray-600">
            <p className="font-bold text-gray-900 text-sm">{details.businessName || 'Business Shop'}</p>
            <p>
              <strong className="text-gray-900">Category:</strong> {details.category || 'General'}
            </p>
            <p>
              <strong className="text-gray-900">Location:</strong> {details.campusLocation || 'Stage'}
            </p>
            {details.mpesaNumber && (
              <p>
                <strong className="text-gray-900">Till/M-Pesa:</strong> {details.mpesaNumber}
              </p>
            )}
          </div>
        );
      case 'landlord':
        return (
          <div className="space-y-0.5 text-xs text-gray-600">
            <p className="font-bold text-gray-900 text-sm">{details.propertyName || 'Hostel Property'}</p>
            <p>
              <strong className="text-gray-900">Location:</strong> {details.location || 'Campus vicinity'}
            </p>
            <p>
              <strong className="text-gray-900">Units:</strong> {details.units || 'N/A'} bedsitters
            </p>
          </div>
        );
      case 'assistant':
        return (
          <div className="space-y-0.5 text-xs text-gray-600 max-w-xs">
            <p>
              <strong className="text-gray-900">Study / Zone:</strong> {details.yearOfStudy || ''} · {details.campusArea || ''}
            </p>
            {details.pitch && (
              <p className="italic text-gray-500 line-clamp-2">
                &ldquo;{details.pitch}&rdquo;
              </p>
            )}
          </div>
        );
      default:
        return <span className="text-xs text-gray-500">Details provided</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">

      {/* ── Admin Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 bg-olaOrange-light text-olaOrange-DEFAULT">
            <ShieldCheck size={14} />
            <span>OLAFASTA FOUNDING TEAM OVERSIGHT</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
            Admin Command Center
          </h1>
          <p className="text-gray-500 text-xs md:text-sm mt-0.5">
            Platform governance, partner onboarding queues & campus financial ledger
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-2xl self-start md:self-auto flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'approvals'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users size={14} className={activeTab === 'approvals' ? 'text-olaOrange-DEFAULT' : ''} />
            <span>Role & Vendor Approvals</span>
            {totalPendingActionCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                {totalPendingActionCount}
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
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Approved Vendors & Partners</span>
          <p className="text-2xl font-black text-gray-900 mt-1">
            {platformStats.totalVendors}
          </p>
          <span className="text-[11px] text-orange-600 font-bold block mt-1">
            {platformStats.pendingCount} pending review
          </span>
        </div>
      </div>

      {/* ── TAB 1: ROLE & VENDOR APPROVAL QUEUE ────────────────────────────── */}
      {activeTab === 'approvals' && (
        <div className="space-y-6">
          {/* Section A: Role Upgrade Applications */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <span>Role Upgrade Applications</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-olaOrange-light text-olaOrange-DEFAULT border border-olaOrange-DEFAULT/20">
                    {pendingRoleApplications.length} pending
                  </span>
                </h2>
                <p className="text-xs text-gray-400">
                  Comrades applying to become Riders, Vendors, Landlords, or Campus Assistants.
                </p>
              </div>
              <button
                onClick={() => refetchUsers()}
                className="p-2 text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded-xl cursor-pointer"
                title="Refresh Queue"
              >
                <RefreshCw size={14} className={loadingUsers ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              {loadingUsers ? (
                <div className="p-8 text-center text-xs text-gray-400 animate-pulse">
                  Loading partner applications...
                </div>
              ) : pendingRoleApplications.length === 0 ? (
                <div className="p-10 text-center max-w-sm mx-auto">
                  <div className="w-12 h-12 rounded-xl bg-olaGreen-light text-olaGreen-DEFAULT flex items-center justify-center mx-auto mb-3">
                    <CheckCircle size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-800">No Pending Role Applications</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    All partner applications from comrades have been processed.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-600">
                    <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-100 font-bold">
                      <tr>
                        <th className="px-5 py-3.5">Comrade / Applicant</th>
                        <th className="px-5 py-3.5">Requested Role</th>
                        <th className="px-5 py-3.5">Submitted Details</th>
                        <th className="px-5 py-3.5">Applied Date</th>
                        <th className="px-5 py-3.5 text-right">Review Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pendingRoleApplications.map((appUser) => (
                        <tr key={appUser._id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-5 py-4">
                            <div>
                              <p className="font-bold text-gray-900 text-sm">
                                {appUser.name}
                              </p>
                              <span className="text-[11px] text-gray-400 block">{appUser.email}</span>
                              <a
                                href={`tel:${appUser.phone}`}
                                className="font-semibold text-olaGreen-DEFAULT hover:underline flex items-center gap-1 mt-0.5"
                              >
                                <Phone size={11} /> {appUser.phone}
                              </a>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {renderRoleBadge(appUser.roleApplication?.requestedRole)}
                          </td>
                          <td className="px-5 py-4">
                            {renderRoleDetails(appUser.roleApplication)}
                          </td>
                          <td className="px-5 py-4 text-gray-500 font-mono text-[11px]">
                            {appUser.roleApplication?.appliedAt
                              ? new Date(appUser.roleApplication.appliedAt).toLocaleDateString('en-KE', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Recent'}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => reviewRoleMutation.mutate({ userId: appUser._id, action: 'approve' })}
                                disabled={reviewRoleMutation.isPending}
                                className="px-3.5 py-2 bg-olaGreen-DEFAULT hover:bg-olaGreen-deep text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <Check size={14} />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => reviewRoleMutation.mutate({ userId: appUser._id, action: 'reject' })}
                                disabled={reviewRoleMutation.isPending}
                                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl border border-red-200 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <X size={14} />
                                <span>Reject</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Section B: Legacy Pending Vendors (if any) */}
          {pendingVendors.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                <span>Legacy Registered Vendors Requiring Approval</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                  {pendingVendors.length}
                </span>
              </h2>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-600">
                    <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-100 font-bold">
                      <tr>
                        <th className="px-5 py-3.5">Vendor / Store</th>
                        <th className="px-5 py-3.5">Campus Location</th>
                        <th className="px-5 py-3.5">Category</th>
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
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: FINANCIAL LEDGER & M-PESA LOGS ──────────────────────────── */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-gray-900">M-Pesa Transaction &amp; Disbursement Ledger</h2>
              <p className="text-xs text-gray-400">Audit trail of customer checkout receipts, platform fees, and pending vendor payouts.</p>
            </div>
            <button
              onClick={() => refetchOrders()}
              className="p-2 text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded-xl cursor-pointer"
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
                    <th className="px-5 py-3.5">Order Ref</th>
                    <th className="px-5 py-3.5">Date / Time</th>
                    <th className="px-5 py-3.5">Gross Amount</th>
                    <th className="px-5 py-3.5">Vendor Payout</th>
                    <th className="px-5 py-3.5">Platform Cut (2.5%)</th>
                    <th className="px-5 py-3.5">Payment State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-5 py-8 text-center text-gray-400">
                        No transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => {
                      const amount = order.finalAmount || order.totalAmount || 0;
                      const fee = Math.round(amount * 0.025);
                      const payout = amount - fee;
                      return (
                        <tr key={order._id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-5 py-3.5 font-mono font-bold text-gray-900">
                            #{order._id?.slice(-6).toUpperCase()}
                          </td>
                          <td className="px-5 py-3.5 text-gray-500 font-mono text-[11px]">
                            {new Date(order.createdAt).toLocaleDateString('en-KE', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-5 py-3.5 font-bold text-gray-900">
                            KSh {amount.toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-olaGreen-DEFAULT">
                            KSh {payout.toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-olaOrange-DEFAULT">
                            KSh {fee.toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                order.paymentStatus === 'paid'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {order.paymentStatus || 'pending'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: PLATFORM OVERVIEW & RECENT VENDORS ────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <h2 className="text-base font-black text-gray-900">Verified Platform Partners ({approvedVendors.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {approvedVendors.map((vendor) => (
              <div key={vendor._id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 text-sm">
                    {vendor.businessProfile?.businessName || vendor.name}
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-olaGreen-light text-olaGreen-DEFAULT">
                    Active
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {vendor.businessProfile?.businessCategory || 'General Merchandise'}
                </p>
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <MapPin size={11} className="text-olaOrange-DEFAULT" />
                    {vendor.businessProfile?.campusLocation || 'Stage'}
                  </span>
                  <span>{vendor.phone}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
