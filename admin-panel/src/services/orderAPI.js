import api from './apiClient.js';

export const orderAPI = {
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  updateStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
  confirmDelivery: (orderId) => api.put(`/orders/${orderId}/confirm-delivery`),
  getMyOrders: (params) => api.get('/orders', { params }),
  cancel: (id) => api.delete(`/orders/${id}/cancel`),
  accept: (id, estimatedDeliveryTime) => api.put(`/orders/${id}/accept`, { estimatedDeliveryTime }),
  businessCancel: (id, cancellationReason) => api.put(`/orders/${id}/cancel`, { cancellationReason }),
  markDelivered: (id) => api.put(`/orders/${id}/delivered`),
  delete: (id) => api.delete(`/orders/${id}`),
  archive: (id) => api.put(`/orders/${id}/archive`),
};

export default orderAPI;
