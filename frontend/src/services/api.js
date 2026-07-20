import api from './apiClient.js';
import { orderAPI } from './orderAPI.js';

export { orderAPI };

// Auth APIs
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/updatepassword', data),
  logoutAllDevices: () => api.post('/auth/logout-all'),
  deactivateAccount: () => api.post('/auth/deactivate'),
  deleteAccount: (password) => api.delete('/auth/account', { data: { password } }),
};

// Product APIs
export const productAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  search: (query) => api.get('/products', { params: { search: query } }),
  getByCategory: (category) => api.get('/products', { params: { category } }),
  getMyProducts: (params) => api.get('/products/my-products', { params }),
  trackView: (id) => api.post(`/products/${id}/view`),
};

// Rental APIs
export const rentalAPI = {
  getAll: (params) => api.get('/rentals', { params }),
  getById: (id) => api.get(`/rentals/${id}`),
  create: (data) => api.post('/rentals', data),
  update: (id, data) => api.put(`/rentals/${id}`, data),
  delete: (id) => api.delete(`/rentals/${id}`),
  getMyProperties: () => api.get('/rentals/my-rentals'),
  getMyBookings: (params) => api.get('/rentals/bookings/my-bookings', { params }),
  bookRental: (rentalId, data) => api.post(`/rentals/${rentalId}/book`, data),
  toggleAvailability: (id) => api.patch(`/rentals/${id}/toggle-availability`),
  updateBookingStatus: (rentalId, bookingId, data) => api.put(`/rentals/${rentalId}/bookings/${bookingId}/status`, data),
  setMoveInDate: (rentalId, bookingId, data) => api.put(`/rentals/${rentalId}/bookings/${bookingId}/set-move-in-date`, data),
  confirmMoveIn: (rentalId, bookingId) => api.put(`/rentals/${rentalId}/bookings/${bookingId}/confirm-move-in`),
  payMonthlyRent: (rentalId, bookingId) => api.post(`/rentals/${rentalId}/bookings/${bookingId}/pay-rent`),
  archiveBooking: (rentalId, bookingId) => api.put(`/rentals/${rentalId}/bookings/${bookingId}/archive`),
  toggleFavorite: (rentalId) => api.post(`/rentals/${rentalId}/favorite`),
  getFavorites: () => api.get('/rentals/favorites/my-favorites'),
  trackView: (rentalId) => api.post(`/rentals/${rentalId}/view`),
  getById: (rentalId) => api.get(`/rentals/${rentalId}`),
  // Note: booking a rental should create an order via `/orders` endpoint
};


// Ride APIs
export const rideAPI = {
  create: (data) => api.post('/rides', data),
  getAll: (params) => api.get('/rides', { params }),
  getById: (id) => api.get(`/rides/${id}`),
  accept: (id) => api.post(`/rides/${id}/accept`),
  decline: (id, data) => api.post(`/rides/${id}/decline`, data), // Added data parameter for reason
  updateStatus: (id, status) => api.put(`/rides/${id}/status`, { status }),
  confirmCompletion: (id) => api.put(`/rides/${id}/confirm-completion`),
  cancel: (id) => api.delete(`/rides/${id}/cancel`),
  archive: (id) => api.put(`/rides/${id}/archive`),
  delete: (id) => api.delete(`/rides/${id}/delete`), // Added delete endpoint for riders
  getMyRides: (params) => api.get('/rides/rider/my-rides', { params }),
  getAvailableRides: (params) => api.get('/rides/rider/available', { params }),
  getCustomerRides: (params) => api.get('/rides/customer/my-rides', { params }),
  getNearbyRiders: (params) => api.get('/rides/nearby-riders', { params }),
  updateLocation: (rideId, data) => api.post(`/rides/${rideId}/location`, data),
  completeRide: (id, data) => api.put(`/rides/${id}/status`, { status: 'completed', ...data }),

  // Fare calculation (backend is single source of truth)
  calculateFare: (data) => api.post('/rides/calculate-fare', data),
  calculateFareWithRider: (data) => api.post('/rides/calculate-fare-with-rider', data),
  getFareEstimate: (params) => api.get('/rides/estimate-fare', { params }),
};

// Rider APIs
export const riderAPI = {
  // Dashboard
  getDashboardStats: () => api.get('/rider/dashboard/stats'),

  // Profile
  getProfile: () => api.get('/rider/profile'),
  updateProfile: (data) => api.put('/rider/profile', data),
  removeProfilePhoto: () => api.delete('/rider/profile/photo'),
  removeMotorcyclePhoto: () => api.delete('/rider/profile/motorcycle/photo'),

  // Earnings
  getEarnings: (params) => api.get('/rider/earnings', { params }),
  getEarningsTrend: (params) => api.get('/rider/analytics/earnings-trend', { params }),

  // Location
  getLocation: () => api.get('/rider/location'),
  updateLocation: (data) => api.post('/rider/location/update', data),

  // Online status
  updateOnlineStatus: (data) => api.post('/rider/status/online', data),

  // Active ride
  getActiveRide: () => api.get('/rider/active-ride'),

  // Notifications
  getNotifications: (params) => api.get('/rider/notifications', { params }),

  // Nearby riders (for customers)
  getNearbyRiders: (params) => api.get('/rider/nearby', { params }),
};

// Wallet APIs
export const walletAPI = {
  getBalance: () => api.get('/wallet/balance'),
  fundWallet: (data) => api.post('/wallet/fund', data),
  withdraw: (data) => api.post('/wallet/withdraw', data),
  getTransactions: (params) => api.get('/wallet/transactions', { params }),
};

// Payment APIs
export const paymentAPI = {
  initiate: (data) => api.post('/payments/initiate', data),
  initiateWithRider: (data) => api.post('/payments/initiate-with-rider', data),
  verify: (ref) => api.get(`/payments/verify/${ref}`),
  getPaymentStatus: (transactionRef) => api.get(`/payments/status/${transactionRef}`),
};

// Chat APIs
export const chatAPI = {
  getConversations: () => api.get('/chat'),
  getMessages: (conversationId) => api.get(`/chat/${conversationId}`),
  sendMessage: (data) => api.post('/chat', data),
  // checkAccess endpoint handled server-side when sending message (transaction check)
  markAsRead: (messageId) => api.put(`/chat/${messageId}/read`),
};

// User APIs
export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  toggleOnline: () => api.post('/users/toggle-online'),
  getProviders: (type, params) => api.get(`/users/providers/${type}`, { params }),
};

// Admin APIs
export const adminAPI = {
  getDashboardStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getProducts: (params) => api.get('/admin/products', { params }),
  getRentals: (params) => api.get('/admin/rentals', { params }),
  getOrders: (params) => api.get('/admin/orders', { params }),
  getPayments: (params) => api.get('/admin/payments', { params }),
  getWithdrawals: (params) => api.get('/admin/withdrawals', { params }),
  approveWithdrawal: (id) => api.post(`/admin/withdrawals/${id}/approve`),
  rejectWithdrawal: (id, reason) => api.post(`/admin/withdrawals/${id}/reject`, { reason }),
};

// Withdrawal APIs
export const withdrawalAPI = {
  request: (data) => api.post('/withdrawals', data),
  getMyWithdrawals: () => api.get('/withdrawals/my-withdrawals'),
  getById: (id) => api.get(`/withdrawals/${id}`),
};

// Notification APIs
export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  deleteAll: () => api.delete('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
};

// Landlord APIs
export const landlordAPI = {
  getDashboardStats: () => api.get('/landlord/dashboard/stats'),
  getMyProperties: () => api.get('/landlord/my-properties'),
  getMyRentals: () => api.get('/landlord/my-rentals'),
  getMyRental: (rentalId) => api.get(`/landlord/my-rentals/${rentalId}`),
  getBookings: () => api.get('/landlord/bookings'),
  getPropertiesByLandlord: (landlordId) => api.get(`/rentals/landlord/${landlordId}`),
  toggleAvailability: (rentalId) => api.patch(`/landlord/my-rentals/${rentalId}/toggle-availability`),
  getWallet: () => api.get('/landlord/wallet'),
};

// Business APIs
export const businessAPI = {
  getProfile: () => api.get('/business/profile'),
  updateProfile: (data) => api.put('/business/profile', data),
  getWallet: () => api.get('/business/wallet'),
  getWithdrawals: (params) => api.get('/business/withdrawals', { params }),
  getMyProducts: (params) => api.get('/business/my-products', { params }),
  getMyServices: (params) => api.get('/business/my-services', { params }),
  getProductsByBusiness: (businessId, params) => api.get(`/products/business/${businessId}`, { params }),
  getOrders: (params) => api.get('/business/orders', { params }),
  getDashboardStats: () => api.get('/business/dashboard/stats'),
  getCustomers: (params) => api.get('/business/customers', { params }),
};

// Wishlist APIs
export const wishlistAPI = {
  getAll: (params) => api.get('/wishlist', { params }),
  add: (productId) => api.post('/wishlist/add', { productId }),
  remove: (productId) => api.delete(`/wishlist/remove/${productId}`),
  check: (productId) => api.get(`/wishlist/check/${productId}`),
  clear: () => api.delete('/wishlist/clear'),
};

// Assistant APIs
export const assistantAPI = {
  getInvitation: (token) => api.get(`/assistants/invite/${token}`),
  registerAndAccept: (token, data) => api.post(`/assistants/invite/${token}/register`, data),
  acceptExisting: (token) => api.post(`/assistants/invite/${token}/accept`),
  getDashboardStats: () => api.get('/assistants/dashboard/stats'),
  // Business owner managing assistants
  getAssistants: () => api.get('/assistants'),
  generateInvite: (data) => api.post('/assistants/invite', data),
  remove: (id) => api.delete(`/assistants/${id}`),
  updateStatus: (id, status) => api.patch(`/assistants/${id}/status`, { status }),
  resendInvite: (id) => api.post(`/assistants/${id}/resend`),
};

// Customer APIs
export const customerAPI = {
  getDashboardStats: () => api.get('/customer/dashboard/stats'),
  getMyOrders: (params) => api.get('/customer/orders', { params }),
  getMyBookings: (params) => api.get('/customer/bookings', { params }),
  getMyRides: (params) => api.get('/customer/rides', { params }),
};

// Dashboard APIs
export const dashboardAPI = {
  getLandlordStats: () => api.get('/landlord/dashboard/stats'),
  getBusinessStats: () => api.get('/business/dashboard/stats'),
  getCustomerStats: () => api.get('/customer/dashboard/stats'),
};

// Upload API (Cloudinary)
export const uploadAPI = {
  getUploadSignature: (data) => api.post('/upload/signature', data),
  upload: (file, signature) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', signature.apiKey);
    formData.append('timestamp', signature.timestamp);
    formData.append('signature', signature.signature);
    formData.append('folder', signature.folder);
    return axios.post(signature.uploadUrl, formData);
  },
  uploadSingle: (file) => {
    console.log('[uploadAPI] uploadSingle - File:', file.name, 'Size:', file.size, 'Type:', file.type);
    const formData = new FormData();
    formData.append('image', file);
    console.log('[uploadAPI] uploadSingle - FormData entries:');
    for (const pair of formData.entries()) {
      console.log('[uploadAPI] ', pair[0], pair[1]);
    }
    const response = api.post('/upload/single', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    console.log('[uploadAPI] uploadSingle - Request sent to /api/upload/single');
    return response;
  },
  uploadMultiple: (files) => {
    console.log('[uploadAPI] uploadMultiple - Files:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });
    console.log('[uploadAPI] uploadMultiple - FormData entries:');
    for (const pair of formData.entries()) {
      console.log('[uploadAPI] ', pair[0], pair[1] instanceof File ? { name: pair[1].name, size: pair[1].size } : pair[1]);
    }
    const response = api.post('/upload/multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    console.log('[uploadAPI] uploadMultiple - Request sent to /api/upload/multiple');
    return response;
  },
};

export default api;