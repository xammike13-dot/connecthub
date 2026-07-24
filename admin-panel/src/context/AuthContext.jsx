import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/apiClient.js';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('admin_user');
    try {
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed && parsed.role === 'admin') {
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('admin_token'));
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Memoize the fetch user profile function
  const fetchUserProfile = useCallback(async (authToken) => {
    try {
      const { data } = await api.get('/auth/profile', {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      // Backend returns { success: true, user: { ... } }
      const fetchedUser = data.user || data;
      if (fetchedUser && fetchedUser.role === 'admin') {
        setUser(fetchedUser);
        localStorage.setItem('admin_user', JSON.stringify(fetchedUser));
        return { success: true };
      } else {
        console.warn('Fetched user is not an admin:', fetchedUser);
        return { success: false, isAuthError: true };
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      const isAuthError = error.response?.status === 401;
      return { success: false, isAuthError };
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('admin_token');

      if (storedToken) {
        setToken(storedToken);
        // Set authorization header in the api instance
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;

        // Fetch user profile to validate token
        const result = await fetchUserProfile(storedToken);

        if (!result.success && result.isAuthError) {
          // Token is invalid or not admin, clear everything
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
          delete api.defaults.headers.common['Authorization'];
          setToken(null);
          setUser(null);
        }
      } else {
        // No token, clear user just in case
        localStorage.removeItem('admin_user');
        setUser(null);
      }

      setInitialized(true);
      setLoading(false);
    };

    initializeAuth();
  }, [fetchUserProfile]);

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/api/auth/login', { email, password });

      // Check if user needs verification
      if (data.requiresVerification) {
        return {
          success: false,
          requiresVerification: true,
          emailVerified: data.emailVerified,
          message: data.message || 'Please verify your email address',
        };
      }

      // Check if user is admin
      if (data.user && data.user.role !== 'admin') {
        return {
          success: false,
          message: 'Access denied. Only platform administrators can log in here.'
        };
      }

      // Save token to localStorage
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_user', JSON.stringify(data.user));
      setToken(data.token);

      // Set authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

      // Set user from login response (already has all needed data)
      setUser(data.user);
      setInitialized(true);
      setLoading(false);

      return { success: true, user: data.user };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Login failed'
      };
    }
  };

  const authenticateWithToken = (authToken, userData) => {
    if (userData && userData.role === 'admin') {
      localStorage.setItem('admin_token', authToken);
      localStorage.setItem('admin_user', JSON.stringify(userData));
      setToken(authToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      setUser(userData);
      setInitialized(true);
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      const { data } = await api.post('/auth/register', userData);

      // Do NOT save token - user must verify phone first
      // Return user data for verification flow
      return { success: true, user: data.user, devMode: data.devMode };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  const logout = async () => {
    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        // Race the service worker readiness to prevent hanging if no service worker is registered
        await Promise.race([
          (async () => {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
              // Send request to backend to unsubscribe before clearing token
              await api.post('/notifications/unsubscribe', { endpoint: subscription.endpoint }).catch(() => {});
              // Unsubscribe from browser PushManager
              await subscription.unsubscribe().catch(() => {});
            }
          })(),
          new Promise((resolve) => setTimeout(resolve, 1500))
        ]);
      }
    } catch (err) {
      console.error('[AuthContext] Unsubscribe push on logout failed:', err);
    } finally {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      setToken(null);
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
      setInitialized(true);
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      const result = await fetchUserProfile(token);
      if (!result.success && result.isAuthError) {
        logout();
      }
    }
  };

  const value = {
    user,
    token,
    loading,
    initialized,
    login,
    register,
    logout,
    refreshProfile,
    authenticateWithToken,
    isAuthenticated: !!user,
    isCustomer: user?.role === 'customer',
    isLandlord: user?.role === 'landlord',
    isBusiness: user?.role === 'business',
    isRider: user?.role === 'rider',
    isAdmin: user?.role === 'admin',
    isAssistant: user?.role === 'assistant',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};