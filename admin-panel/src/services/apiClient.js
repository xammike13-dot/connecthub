import axios from 'axios';

let rawApiUrl = import.meta.env.VITE_API_URL;

export let isConfigError = false;
export let configErrorMessage = '';

// Check configuration based on environment
if (!import.meta.env.DEV) {
  // In production, keep fallback to the live Render endpoint
  if (!rawApiUrl || !rawApiUrl.startsWith('http')) {
    rawApiUrl = 'https://connecthub-60j4.onrender.com/api';
  }
} else {
  // In development, require VITE_API_URL to be explicitly set.
  if (!rawApiUrl || !rawApiUrl.startsWith('http')) {
    isConfigError = true;
    configErrorMessage = 'VITE_API_URL must be explicitly configured in development mode (e.g., in admin-panel/.env). Dynamic fallback to "/api" has been disabled to protect live production database integrity and prevent silent empty states.';
    console.error(`[Configuration Error] ${configErrorMessage}`);
    rawApiUrl = 'INVALID_CONFIG';
  }
}

// Ensure the baseURL always ends with /api so that relative paths
// like /admin/users resolve to /api/admin/users. If VITE_API_URL is
// set to just the origin (e.g. https://host.com without /api), append it.
if (rawApiUrl && rawApiUrl.startsWith('http') && !rawApiUrl.endsWith('/api')) {
  rawApiUrl = rawApiUrl.replace(/\/$/, '') + '/api';
}

const API_URL = rawApiUrl.replace(/\/$/, '');

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    if (isConfigError) {
      console.error(`[API Request Blocked] Request to ${config.url} was blocked: ${configErrorMessage}`);
      return Promise.reject(new Error(configErrorMessage));
    }

    // If baseURL ends with /api and config.url starts with /api/, strip duplicate /api to avoid double /api/api
    if (config.baseURL && config.baseURL.endsWith('/api') && config.url && config.url.startsWith('/api/')) {
      config.url = config.url.substring(4);
    }

    const token = localStorage.getItem('admin_token');
    // Don't add token for login endpoint to avoid 401 errors
    if (token && !config.url.includes('/auth/login') && !config.url.includes('/api/auth/login')) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Append cache-busting timestamp parameter for GET requests
    if (config.method && config.method.toLowerCase() === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Centralized detailed error logging for all failed requests
    console.error('[API Error Interceptor] Request failed:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    // Only clear token on 401 for protected routes, not for login/register
    const isLoginOrRegister = error.config?.url?.includes('/auth/login') ||
                              error.config?.url?.includes('/api/auth/login') ||
                              error.config?.url?.includes('/auth/register') ||
                              error.config?.url?.includes('/api/auth/register');
    if (error.response?.status === 401 && !isLoginOrRegister) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.dispatchEvent(new CustomEvent('auth-error', { detail: { status: 401 } }));
    }
    return Promise.reject(error);
  }
);

export default api;
