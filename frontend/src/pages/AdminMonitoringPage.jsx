import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { Activity, ShieldCheck, Server, AlertTriangle } from 'lucide-react';

const AdminMonitoringPage = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getPlatformHealth();
      setHealth(res.data.data);
    } catch (err) {
      console.error('Failed to fetch platform health:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Activity size={28} className="text-emerald-500 animate-pulse" />
          Platform Monitoring
        </h1>
        <p className="text-slate-400 mt-1">Monitor live server uptime, database connections, and failed platform transactions</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Server size={20} className="text-emerald-400" />
              Express API Server
            </h3>
            <div className="space-y-2 text-sm text-slate-300">
              <p className="flex justify-between">
                <span className="text-slate-400">Uptime:</span>
                <span className="font-semibold text-white">{Math.round(health?.uptime || 0)} seconds</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="font-semibold text-emerald-400 capitalize">{health?.serverStatus}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-400">Database Connection:</span>
                <span className="font-semibold text-emerald-400 capitalize">{health?.databaseStatus}</span>
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck size={20} className="text-indigo-400" />
              Transactions Auditing
            </h3>
            <div className="space-y-2 text-sm text-slate-300">
              <p className="flex justify-between">
                <span className="text-slate-400">Failed M-Pesa STK Pushes:</span>
                <span className="font-semibold text-red-400">{health?.failedPayments || 0}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-400">Pending Support Issues:</span>
                <span className="font-semibold text-yellow-400">{health?.pendingSupport || 0}</span>
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4 col-span-1 md:col-span-2 lg:col-span-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-400" />
              Active System Warnings & Alerts
            </h3>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs text-amber-400 leading-relaxed font-mono">
              [ALERT LOG] {health?.systemAlerts || 'All platform services are running nominally.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMonitoringPage;
