import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    // If baseURL ends with /api and config.url starts with /api/, strip duplicate /api to avoid double /api/api
    if (config.baseURL && config.baseURL.endsWith('/api') && config.url && config.url.startsWith('/api/')) {
      config.url = config.url.substring(4);
    }

    const token = localStorage.getItem('token');
    // Don't add token for login endpoint to avoid 401 errors
    if (token && !config.url.includes('/auth/login') && !config.url.includes('/api/auth/login')) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only clear token on 401 for protected routes, not for login/register
    const isLoginOrRegister = error.config?.url?.includes('/auth/login') ||
                              error.config?.url?.includes('/api/auth/login') ||
                              error.config?.url?.includes('/auth/register') ||
                              error.config?.url?.includes('/api/auth/register');
    if (error.response?.status === 401 && !isLoginOrRegister) {
      localStorage.removeItem('token');
      window.dispatchEvent(new CustomEvent('auth-error', { detail: { status: 401 } }));
    }
    return Promise.reject(error);
  }
);

export default api;
