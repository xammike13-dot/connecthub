// frontend/src/pages/BusinessDashboard.jsx
// Vendor Operational Cockpit: Live Order Kanban Board & Inventory Manager

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ShoppingBag, 
  Package, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Phone, 
  MapPin, 
  RefreshCw, 
  DollarSign, 
  AlertCircle,
  Truck,
  Flame,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';
import InventoryManager from '../components/dashboard/InventoryManager';
import { useToast } from '../components/Toast';

export default function BusinessDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { show: showToast } = useToast() || {};
  const { socket } = useSocket();

  // Audio chime synthesized via Web Audio API
  const playOrderChime = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5

      gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn('Audio chime warning:', e);
    }
  }, []);

  // Real-Time Socket.IO: Invalidate vendor orders & play notification chime on new order
  useEffect(() => {
    if (!socket) return;

    const handleNewOrder = (newOrder) => {
      console.log('[Socket] Vendor received new order:', newOrder);
      playOrderChime();
      showToast?.(`New Order Received! #${newOrder?._id?.slice(-6)?.toUpperCase() || ''}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['orders', 'vendor'] });
      queryClient.invalidateQueries({ queryKey: ['business-orders'] });
    };

    socket.on('order:created', handleNewOrder);

    return () => {
      socket.off('order:created', handleNewOrder);
    };
  }, [socket, playOrderChime, showToast, queryClient]);
  const [activeTab, setActiveTab] = useState('kanban'); // 'kanban' | 'inventory'

  // 1. Fetch Vendor Orders via TanStack Query
  const { data: rawOrders = [], isLoading: loadingOrders, refetch } = useQuery({
    queryKey: ['business-orders', user?._id],
    queryFn: async () => {
      const res = await api.get('/orders', {
        params: { businessId: user?._id, limit: 50 },
      });
      return Array.isArray(res.data) ? res.data : res.data?.data || res.data?.orders || [];
    },
    refetchInterval: 15000, // Background poll every 15s for live vendor updates
    enabled: Boolean(user?._id),
  });

  // 2. Mutation: Advance Order Status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, nextStatus }) => {
      const res = await api.patch(`/orders/${orderId}/status`, { status: nextStatus });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['business-orders'] });
      showToast?.(`Order moved to ${variables.nextStatus.replace('_', ' ')}!`, 'success');
    },
    onError: (err) => {
      showToast?.(err.response?.data?.message || 'Failed to update order status', 'error');
    },
  });

  // 3. Partition Orders into Kanban Columns
  const kanban = useMemo(() => {
    const incoming = [];
    const preparing = [];
    const ready = [];
    const completed = [];

    rawOrders.forEach((order) => {
      const s = order.status?.toLowerCase();
      if (s === 'pending_payment' || s === 'paid' || s === 'pending') {
        incoming.push(order);
      } else if (s === 'preparing' || s === 'processing') {
        preparing.push(order);
      } else if (s === 'ready_for_pickup') {
        ready.push(order);
      } else if (s === 'delivered' || s === 'completed' || s === 'out_for_delivery') {
        completed.push(order);
      }
    });

    return { incoming, preparing, ready, completed };
  }, [rawOrders]);

  // High-Level Metrics
  const metrics = useMemo(() => {
    const totalRevenue = rawOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.finalAmount || o.totalAmount || 0), 0);
    const activeCount = kanban.incoming.length + kanban.preparing.length + kanban.ready.length;
    return {
      revenue: totalRevenue,
      active: activeCount,
      total: rawOrders.length,
    };
  }, [rawOrders, kanban]);

  return (
    <div className="space-y-6 pb-12 font-sans">

      {/* ── Dashboard Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 bg-orange-100/70 text-[#FF5E00]">
            <StoreIcon size={14} />
            <span>VENDOR COMMAND COCKPIT</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
            {user?.businessProfile?.businessName || user?.name || 'Campus Vendor'}
          </h1>
          <p className="text-gray-500 text-xs md:text-sm mt-0.5">
            Campus Hub: <span className="font-bold text-gray-700">{user?.businessProfile?.campusLocation || 'Stage'}</span> · Orders & Inventory Dispatch
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-2xl self-start md:self-auto">
          <button
            onClick={() => setActiveTab('kanban')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'kanban'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ShoppingBag size={14} className={activeTab === 'kanban' ? 'text-[#FF5E00]' : ''} />
            <span>Live Orders</span>
            {metrics.active > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#FF5E00] text-white text-[10px] font-black flex items-center justify-center">
                {metrics.active}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'inventory'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Package size={14} className={activeTab === 'inventory' ? 'text-[#FF5E00]' : ''} />
            <span>Inventory Catalog</span>
          </button>
        </div>
      </div>

      {/* ── High-Level Metric Tiles ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-400 font-bold mb-2">
            <span>STORE REVENUE</span>
            <DollarSign size={16} className="text-olaGreen-DEFAULT" />
          </div>
          <p className="text-2xl font-black text-gray-900">
            KSh {metrics.revenue.toLocaleString()}
          </p>
          <span className="text-[11px] text-gray-400 mt-1 block">Net sales from confirmed campus orders</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-400 font-bold mb-2">
            <span>ACTIVE PIPELINE</span>
            <Flame size={16} className="text-[#FF5E00]" />
          </div>
          <p className="text-2xl font-black text-[#FF5E00]">
            {metrics.active} Orders
          </p>
          <span className="text-[11px] text-gray-400 mt-1 block">Incoming, preparing & awaiting pickup</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-400 font-bold mb-2">
            <span>TOTAL FULFILLED</span>
            <CheckCircle2 size={16} className="text-olaOrange-DEFAULT" />
          </div>
          <p className="text-2xl font-black text-gray-900">
            {metrics.total} Orders
          </p>
          <span className="text-[11px] text-gray-400 mt-1 block">Lifetime campus orders routed to your store</span>
        </div>
      </div>

      {/* ── VIEW 1: LIVE ORDERS KANBAN BOARD ──────────────────────────────── */}
      {activeTab === 'kanban' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                <span>Real-Time Order Kanban</span>
                <span className="w-2 h-2 rounded-full bg-olaGreen-DEFAULT animate-pulse" />
              </h2>
              <p className="text-xs text-gray-400">Click advance button on cards to transition orders through preparation.</p>
            </div>
            <button
              onClick={() => refetch()}
              className="p-2 text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded-xl"
              title="Refresh Orders"
            >
              <RefreshCw size={14} className={loadingOrders ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Kanban Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            
            {/* Column 1: Incoming Orders */}
            <KanbanColumn
              title="Incoming"
              count={kanban.incoming.length}
              color="border-olaOrange-DEFAULT/40 bg-olaOrange-light/50 text-olaOrange-DEFAULT"
              orders={kanban.incoming}
              nextActionLabel="Start Preparing"
              nextStatus="preparing"
              onAdvance={(id, status) => updateStatusMutation.mutate({ orderId: id, nextStatus: status })}
              isPending={updateStatusMutation.isPending}
            />

            {/* Column 2: Preparing */}
            <KanbanColumn
              title="Preparing"
              count={kanban.preparing.length}
              color="border-olaOrange-DEFAULT/40 bg-olaOrange-light/50 text-olaOrange-DEFAULT"
              orders={kanban.preparing}
              nextActionLabel="Mark Ready"
              nextStatus="ready_for_pickup"
              onAdvance={(id, status) => updateStatusMutation.mutate({ orderId: id, nextStatus: status })}
              isPending={updateStatusMutation.isPending}
            />

            {/* Column 3: Ready for Pickup */}
            <KanbanColumn
              title="Ready for Pickup"
              count={kanban.ready.length}
              color="border-olaGreen-DEFAULT/40 bg-olaGreen-light/50 text-olaGreen-DEFAULT"
              orders={kanban.ready}
              nextActionLabel="Mark Delivered"
              nextStatus="delivered"
              onAdvance={(id, status) => updateStatusMutation.mutate({ orderId: id, nextStatus: status })}
              isPending={updateStatusMutation.isPending}
            />

            {/* Column 4: Completed */}
            <KanbanColumn
              title="Completed"
              count={kanban.completed.length}
              color="border-gray-300 bg-gray-50 text-gray-700"
              orders={kanban.completed}
              isCompletedCol={true}
            />
          </div>
        </div>
      )}

      {/* ── VIEW 2: INVENTORY MANAGER ─────────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <InventoryManager user={user} />
      )}
    </div>
  );
}

/**
 * Modular Kanban Column Component
 */
function KanbanColumn({
  title,
  count,
  color,
  orders = [],
  nextActionLabel,
  nextStatus,
  onAdvance,
  isPending,
  isCompletedCol = false,
}) {
  return (
    <div className="bg-gray-100/80 rounded-2xl p-3 sm:p-4 space-y-3 min-h-[500px] flex flex-col">
      {/* Column Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
        <span className="text-xs font-black text-gray-800 uppercase tracking-wider">{title}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${color}`}>
          {count}
        </span>
      </div>

      {/* Order Cards List */}
      <div className="space-y-3 flex-1 overflow-y-auto">
        {orders.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-center text-xs text-gray-400 italic">
            No orders
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order._id}
              className="bg-white rounded-xl p-3.5 border border-gray-200 shadow-2xs hover:shadow-xs transition-shadow space-y-2.5"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-gray-400">#{order._id?.slice(-5)}</span>
                <span className="text-[11px] font-black text-[#FF5E00]">
                  KSh {order.finalAmount || order.totalAmount}
                </span>
              </div>

              {/* Items Summary with Variations & Add-ons */}
              <div className="space-y-1">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="text-xs text-gray-700">
                    <span className="font-bold">{item.quantity}x</span> {item.name}
                    {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                      <span className="text-[10px] text-olaOrange-DEFAULT block pl-3">
                        {Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                      </span>
                    )}
                    {item.selectedAddOns?.length > 0 && (
                      <span className="text-[10px] text-olaGreen-DEFAULT block pl-3">
                        +{item.selectedAddOns.map((a) => a.name).join(', ')}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Delivery Meta */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                <div className="flex items-center gap-1 truncate max-w-[140px]">
                  <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">{order.campusLandmark || order.deliveryAddress?.landmark || 'Stage Campus'}</span>
                </div>
                {order.deliveryAddress?.phone && (
                  <a
                    href={`tel:${order.deliveryAddress.phone}`}
                    className="flex items-center gap-0.5 text-gray-600 hover:text-olaGreen-DEFAULT font-bold"
                  >
                    <Phone size={11} /> Call
                  </a>
                )}
              </div>

              {/* Advance Status Button */}
              {!isCompletedCol && nextStatus && (
                <button
                  onClick={() => onAdvance(order._id, nextStatus)}
                  disabled={isPending}
                  className="w-full mt-2 py-2 px-3 bg-gray-900 hover:bg-[#FF5E00] text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <span>{nextActionLabel}</span>
                  <ChevronRight size={13} />
                </button>
              )}

              {isCompletedCol && (
                <div className="text-[10px] text-olaGreen-DEFAULT font-bold flex items-center gap-1 pt-1 justify-center">
                  <CheckCircle2 size={12} /> Fulfilled
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StoreIcon(props) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}
