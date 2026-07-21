import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ToastProvider from './components/Toast';
import AdminLayout from './layouts/AdminLayout';

// Admin Pages
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminOrdersPage from './pages/AdminOrdersPage';
import AdminRentalsPage from './pages/AdminRentalsPage';
import AdminRidesPage from './pages/AdminRidesPage';
import AdminReportsPage from './pages/AdminReportsPage';
import AdminBroadcastPage from './pages/AdminBroadcastPage';
import AdminMonitoringPage from './pages/AdminMonitoringPage';
import AdminSettingsPage from './pages/AdminSettingsPage';

function App() {
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
