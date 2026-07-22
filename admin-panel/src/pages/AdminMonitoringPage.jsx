import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { Activity, ShieldCheck, Server, AlertTriangle, Cpu, Terminal, Users } from 'lucide-react';

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
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* express api card */}
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

            {/* auditing stats */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck size={20} className="text-indigo-400" />
                Transactions Auditing
              </h3>
              <div className="space-y-2 text-sm text-slate-300">
                <p className="flex justify-between">
                  <span className="text-slate-400">Failed Payments Count:</span>
                  <span className="font-semibold text-red-400">{health?.failedPayments || 0}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Pending Support Issues:</span>
                  <span className="font-semibold text-yellow-400">{health?.pendingSupport || 0}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Failed API requests (4xx):</span>
                  <span className="font-semibold text-orange-400">{health?.failedApiRequests || 0}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Unhandled backend errors (5xx):</span>
                  <span className="font-semibold text-red-500">{health?.unhandledErrors || 0}</span>
                </p>
              </div>
            </div>

            {/* active user card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users size={20} className="text-sky-400" />
                Active Users Online
              </h3>
              <div className="space-y-2 text-sm text-slate-300">
                <p className="flex justify-between">
                  <span className="text-slate-400">Active Users (last 15 mins):</span>
                  <span className="font-semibold text-sky-400 text-lg">{health?.activeUsersOnline || 0}</span>
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Real-time database check on users who logged in or updated session tokens within the last 15 minutes.
                </p>
              </div>
            </div>

            {/* system alerts */}
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

          {/* recent error logs */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Terminal size={20} className="text-red-400" />
              Live Backend Failures & Error Logs
            </h3>
            <p className="text-xs text-slate-400">Real-time unhandled server exceptions, authorization rejections, and failed M-Pesa STK push logs parsed dynamically from MongoDB</p>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {health?.recentErrors && health.recentErrors.length > 0 ? (
                health.recentErrors.map((err) => (
                  <div key={err._id} className="bg-slate-950 border border-slate-800/80 rounded-lg p-4 font-mono text-xs space-y-2 text-slate-300">
                    <div className="flex justify-between items-start">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                        err.type === 'unhandled_error' || err.type === 'payment_failure' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        err.type === 'api_error' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                        'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                      }`}>
                        {err.type}
                      </span>
                      <span className="text-slate-500 text-[10px]">
                        {new Date(err.timestamp || err.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-white font-semibold text-sm">{err.message}</p>
                    <div className="text-slate-400 grid grid-cols-1 md:grid-cols-3 gap-2 border-t border-slate-900 pt-2 text-[10px]">
                      {err.statusCode && <div><strong className="text-slate-500">Status Code:</strong> {err.statusCode}</div>}
                      {err.method && err.path && <div><strong className="text-slate-500">Route:</strong> {err.method} {err.path}</div>}
                      {err.user && <div><strong className="text-slate-500">User Context:</strong> {err.user.name || err.user._id || err.user}</div>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 font-semibold bg-slate-950 rounded-lg border border-slate-800">
                  No system errors or payment logs registered in the database.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMonitoringPage;
