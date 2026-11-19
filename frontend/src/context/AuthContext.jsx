// frontend/src/context/AuthContext.jsx
// Standardized JWT Authentication & RBAC Session Management

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper to extract cookies in browser environments
function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

// Canonical Olafasta Roles
export const OLA_ROLES = {
  CUSTOMER: 'customer',
  BUSINESS: 'business',
  RIDER: 'rider',
  ADMIN: 'admin',
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('token') || getCookie('token'));
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Normalized role string
  const role = user?.role || null;
  const isAuthenticated = Boolean(user && token);

  /**
   * Fetches the user profile from backend to validate session token
   */
  const fetchUserProfile = useCallback(async (authToken) => {
    try {
      // Primary: /users/profile; Fallback: /auth/profile
      let response;
      try {
        response = await api.get('/users/profile', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch (firstErr) {
        if (firstErr.response?.status === 404) {
          response = await api.get('/auth/profile', {
            headers: { Authorization: `Bearer ${authToken}` },
          });
        } else {
          throw firstErr;
        }
      }

      const fetchedUser = response.data?.user || response.data?.data || response.data;
      if (fetchedUser) {
        setUser(fetchedUser);
        localStorage.setItem('user', JSON.stringify(fetchedUser));
        return { success: true, user: fetchedUser };
      }
      return { success: false, isAuthError: false };
    } catch (error) {
      console.error('[AuthContext] Session validation failed:', error);
      const isAuthError = error.response?.status === 401 || error.response?.status === 403;
      return { success: false, isAuthError };
    }
  }, []);

  /**
   * Global Logout & Session Cleanup
   */
  const logout = useCallback(async () => {
    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager?.getSubscription();
        if (subscription) {
          await api.post('/notifications/unsubscribe', { endpoint: subscription.endpoint }).catch(() => {});
          await subscription.unsubscribe().catch(() => {});
        }
      }
    } catch (err) {
      console.warn('[AuthContext] Push unsubscribe cleanup warning:', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
      setToken(null);
      setUser(null);
      setInitialized(true);
      setLoading(false);
    }
  }, []);

  /**
   * Boot logic: On app mount, validate existing JWT token
   */
  useEffect(() => {
    const initializeAuth = async () => {
      const activeToken = localStorage.getItem('token') || getCookie('token');

      if (activeToken) {
        setToken(activeToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${activeToken}`;

        const result = await fetchUserProfile(activeToken);
        if (!result.success && result.isAuthError) {
          // Token expired or invalid
          logout();
          return;
        }
      } else {
        localStorage.removeItem('user');
        setUser(null);
      }

      setInitialized(true);
      setLoading(false);
    };

    initializeAuth();
  }, [fetchUserProfile, logout]);

  /**
   * Listen for global 401 unauthorized events emitted by Axios interceptor
   */
  useEffect(() => {
    const handleAuthError = (e) => {
      if (e.detail?.status === 401) {
        console.warn('[AuthContext] 401 detected via interceptor. Triggering global logout.');
        logout();
      }
    };

    window.addEventListener('auth-error', handleAuthError);
    return () => window.removeEventListener('auth-error', handleAuthError);
  }, [logout]);


  // Listen for real-time role approval from socket
  useEffect(() => {
    const handleRoleApproved = async (e) => {
      const detail = e.detail || {};
      const activeToken = localStorage.getItem('token') || getCookie('token');
      if (activeToken) {
        const res = await fetchUserProfile(activeToken);
        const upgradedRole = detail.role || detail.requestedRole || res.user?.role;
        const targetUrl = detail.dashboardUrl || (upgradedRole ? `/${upgradedRole}/dashboard` : '/');

        // Trigger celebratory toast with one-click dashboard link
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: {
              message: `🎉 Congratulations! Your Olafasta ${upgradedRole?.toUpperCase()} account is now active.`,
              type: 'success',
              duration: 8000,
              action: {
                label: 'Go to Your Dashboard →',
                url: targetUrl,
              },
            },
          })
        );
      }
    };

    window.addEventListener('olafasta:role-approved', handleRoleApproved);
    return () => window.removeEventListener('olafasta:role-approved', handleRoleApproved);
  }, [fetchUserProfile]);

  /**
   * Login handler
   */
  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });

      if (data.requiresVerification) {
        return {
          success: false,
          requiresVerification: true,
          emailVerified: data.emailVerified,
          message: data.message || 'Please verify your credentials',
        };
      }

      const authToken = data.token;
      const userData = data.user;

      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(authToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      setUser(userData);
      setInitialized(true);
      setLoading(false);

      return { success: true, user: userData };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please check your credentials.',
      };
    }
  };

  /**
   * Direct token authentication (e.g. OAuth / OTP verification)
   */
  const authenticateWithToken = (authToken, userData) => {
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(authToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    setUser(userData);
    setInitialized(true);
    setLoading(false);
  };

  /**
   * Register handler
   */
  const register = async (userData) => {
    try {
      const { data } = await api.post('/auth/register', userData);
      if (data.token && data.user) {
        authenticateWithToken(data.token, data.user);
      }
      return { 
        success: true, 
        user: data.user, 
        token: data.token,
        message: data.message 
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed',
      };
    }
  };

  /**
   * Refresh profile data
   */
  const refreshProfile = async () => {
    const activeToken = localStorage.getItem('token') || getCookie('token');
    if (activeToken) {
      const result = await fetchUserProfile(activeToken);
      if (!result.success && result.isAuthError) {
        logout();
      }
    }
  };

  const value = {
    user,
    token,
    role,
    loading,
    isLoading: loading,
    initialized,
    isAuthenticated,
    login,
    register,
    logout,
    refreshProfile,
    authenticateWithToken,
    // Role boolean helpers
    isCustomer: role === OLA_ROLES.CUSTOMER,
    isBusiness: role === OLA_ROLES.BUSINESS,
    isRider: role === OLA_ROLES.RIDER,
    isAdmin: role === OLA_ROLES.ADMIN,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
