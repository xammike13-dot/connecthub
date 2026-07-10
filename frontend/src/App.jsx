import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { SocketProvider } from './context/SocketContext';
import MainLayout from './layouts/MainLayout';
import DashboardLayout from './layouts/DashboardLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import LandlordSetupPage from './pages/LandlordSetupPage';
import BusinessSetupPage from './pages/BusinessSetupPage';
import RiderSetupPage from './pages/RiderSetupPage';
import ShopPage from './pages/ShopPage';
import RentalsPage from './pages/RentalsPage';
import BodabodaPage from './pages/BodabodaPage';
import CartPage from './pages/CartPage';
import OrdersPage from './pages/OrdersPage';
import NotificationsPage from './pages/NotificationsPage';
import ChatPage from './pages/ChatPage';
import CustomerDashboard from './pages/CustomerDashboard';
import LandlordDashboard from './pages/LandlordDashboard';
import BusinessDashboard from './pages/BusinessDashboard';
import RiderDashboard from './pages/RiderDashboard';
import RiderRequestsPage from './pages/RiderRequestsPage';
import RiderProfile from './pages/RiderProfile';
import RiderHistoryPage from './pages/RiderHistoryPage';
import CheckoutPage from './pages/CheckoutPage';
import PaymentConfirmationPage from './pages/PaymentConfirmationPage';
import WalletPage from './pages/WalletPage';
import TransactionHistoryPage from './pages/TransactionHistoryPage';
import EarningsDashboardPage from './pages/EarningsDashboardPage';
import AdminDashboard from './pages/AdminDashboard';
import BusinessProductsPage from './pages/BusinessProductsPage';
import BusinessOrdersPage from './pages/BusinessOrdersPage';
import BusinessProfilePage from './pages/BusinessProfilePage';
import LandlordPropertiesPage from './pages/LandlordPropertiesPage';
import LandlordPropertyNew from './pages/LandlordPropertyNew';
import LandlordPropertyEdit from './pages/LandlordPropertyEdit';
import LandlordPropertyDetail from './pages/LandlordPropertyDetail';
import LandlordBookingsPage from './pages/LandlordBookingsPage';
import CustomerBookingsPage from './pages/CustomerBookingsPage';
import CustomerRidesPage from './pages/CustomerRidesPage';
import CustomerHealthcarePage from './pages/CustomerHealthcarePage';
import HealthcareShopPage from './pages/HealthcareShopPage';
import LandlordProfile from './pages/LandlordProfile';
import LandlordSettings from './pages/LandlordSettings';
import CustomerSettings from './pages/CustomerSettings';
import BusinessSettings from './pages/BusinessSettings';
import RiderSettings from './pages/RiderSettings';
import RentalDetailPage from './pages/RentalDetailPage';


function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <SocketProvider>
            <Router future={{ v7_relativeSplatPath: true }}>
              <Routes>
                {/* Public Routes with Main Layout */}
                <Route path="/" element={<MainLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="marketplace" element={<ShopPage />} />
                  <Route path="marketplace/:category" element={<ShopPage />} />
                  <Route path="rentals" element={<RentalsPage />} />
                  <Route path="rentals/:location" element={<RentalsPage />} />
                  <Route path="rentals/detail/:id" element={<RentalDetailPage />} />
                  <Route path="healthcare" element={<HealthcareShopPage />} />
                  <Route path="transport" element={<BodabodaPage />} />
                </Route>

                {/* Auth Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-email" element={<EmailVerificationPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/setup/landlord" element={<LandlordSetupPage />} />
                <Route path="/setup/business" element={<BusinessSetupPage />} />
                <Route path="/setup/rider" element={<RiderSetupPage />} />

                {/* Cart & Checkout */}
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/checkout/:entityType/:entityId" element={<CheckoutPage />} />
                <Route path="/payment-confirmation/:transactionRef" element={<PaymentConfirmationPage />} />

                {/* Customer Routes */}
                <Route path="/customer" element={<DashboardLayout allowedRoles={['customer']} />}>
                  <Route path="dashboard" element={<CustomerDashboard />} />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="bookings" element={<CustomerBookingsPage />} />
                  <Route path="order/:orderId" element={<OrdersPage />} />
                  <Route path="rentals" element={<CustomerBookingsPage />} />
                  <Route path="healthcare" element={<CustomerHealthcarePage />} />
                  <Route path="rides" element={<CustomerRidesPage />} />
                  <Route path="settings" element={<CustomerSettings />} />
                  <Route path="transactions" element={<TransactionHistoryPage />} />
                  <Route path="wallet" element={<WalletPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="chat" element={<ChatPage />} />
                  <Route path="chat/:conversationId" element={<ChatPage />} />
                </Route>

                {/* Landlord Routes */}
                <Route path="/landlord" element={<DashboardLayout allowedRoles={['landlord']} />}>
                  <Route path="dashboard" element={<LandlordDashboard />} />
                  <Route path="properties" element={<LandlordPropertiesPage />} />
                  <Route path="properties/new" element={<LandlordPropertyNew />} />
                  <Route path="properties/:id" element={<LandlordPropertyDetail />} />
                  <Route path="properties/:id/edit" element={<LandlordPropertyEdit />} />
                  <Route path="bookings" element={<LandlordBookingsPage />} />
                  <Route path="tenants" element={<LandlordDashboard />} />
                  <Route path="payments" element={<LandlordDashboard />} />
                  <Route path="profile" element={<LandlordProfile />} />
                  <Route path="settings" element={<LandlordSettings />} />
                  <Route path="transactions" element={<TransactionHistoryPage />} />
                  <Route path="wallet" element={<WalletPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="chat" element={<ChatPage />} />
                  <Route path="chat/:conversationId" element={<ChatPage />} />
                </Route>

                {/* Business Routes */}
                <Route path="/business" element={<DashboardLayout allowedRoles={['business']} />}>
                  <Route path="dashboard" element={<BusinessDashboard />} />
                  <Route path="products" element={<BusinessProductsPage />} />
                  <Route path="orders" element={<BusinessOrdersPage />} />
                  <Route path="profile" element={<BusinessProfilePage />} />
                  <Route path="settings" element={<BusinessSettings />} />
                  <Route path="earnings" element={<EarningsDashboardPage />} />
                  <Route path="transactions" element={<TransactionHistoryPage />} />
                  <Route path="wallet" element={<WalletPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="chat" element={<ChatPage />} />
                  <Route path="chat/:conversationId" element={<ChatPage />} />
                </Route>

                {/* Rider Routes */}
                <Route path="/rider" element={<DashboardLayout allowedRoles={['rider']} />}>
                  <Route path="dashboard" element={<RiderDashboard />} />
                  <Route path="requests" element={<RiderRequestsPage />} />
                  <Route path="history" element={<RiderHistoryPage />} />
                  <Route path="earnings" element={<EarningsDashboardPage />} />
                  <Route path="profile" element={<RiderProfile />} />
                  <Route path="settings" element={<RiderSettings />} />
                  <Route path="transactions" element={<TransactionHistoryPage />} />
                  <Route path="wallet" element={<WalletPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="chat" element={<ChatPage />} />
                  <Route path="chat/:conversationId" element={<ChatPage />} />
                </Route>

                {/* Admin Routes */}
                <Route path="/admin" element={<DashboardLayout allowedRoles={['admin']} />}>
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="users" element={<BusinessDashboard />} />
                  <Route path="products" element={<BusinessDashboard />} />
                  <Route path="rentals" element={<BusinessDashboard />} />
                  <Route path="orders" element={<BusinessDashboard />} />
                  <Route path="payments" element={<BusinessDashboard />} />
                  <Route path="withdrawals" element={<BusinessDashboard />} />
                  <Route path="analytics" element={<BusinessDashboard />} />
                  <Route path="settings" element={<BusinessDashboard />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </SocketProvider>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;