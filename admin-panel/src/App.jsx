import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ToastProvider from './components/Toast';
import AdminLayout from './layouts/AdminLayout';
import { isConfigError, configErrorMessage } from './services/apiClient.js';

// Admin Pages
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminProductsPage from './pages/AdminProductsPage';
import AdminOrdersPage from './pages/AdminOrdersPage';
import AdminRentalsPage from './pages/AdminRentalsPage';
import AdminRidesPage from './pages/AdminRidesPage';
import AdminReportsPage from './pages/AdminReportsPage';
import AdminBroadcastPage from './pages/AdminBroadcastPage';
import AdminMonitoringPage from './pages/AdminMonitoringPage';
import AdminSettingsPage from './pages/AdminSettingsPage';

function App() {
  if (isConfigError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100 font-sans">
        <div className="max-w-xl w-full bg-red-950/40 border border-red-800/80 rounded-2xl p-8 shadow-2xl space-y-4">
          <div className="flex items-center gap-3 text-red-500">
            <span className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">Configuration Error</h1>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">
            {configErrorMessage}
          </p>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono text-xs text-red-400 space-y-2">
            <p className="font-semibold text-slate-300">To resolve this:</p>
            <p>1. Create a <code className="text-white bg-slate-800 px-1 py-0.5 rounded">.env</code> file in the <code className="text-white bg-slate-800 px-1 py-0.5 rounded">admin-panel/</code> directory.</p>
            <p>2. Set <code className="text-white bg-slate-800 px-1 py-0.5 rounded">VITE_API_URL=http://localhost:5000/api</code> (or your development backend URL).</p>
            <p>3. Restart the Vite development server.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <ToastProvider>
        <Router future={{ v7_relativeSplatPath: true }}>
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Admin Routes */}
            <Route path="/" element={<AdminLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="rentals" element={<AdminRentalsPage />} />
              <Route path="rides" element={<AdminRidesPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="broadcast" element={<AdminBroadcastPage />} />
              <Route path="monitoring" element={<AdminMonitoringPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
