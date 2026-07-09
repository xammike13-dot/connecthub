import { useState, useCallback, useEffect } from 'react';
import { dashboardAPI, orderAPI, rentalAPI, rideAPI, businessAPI } from '../services/api';

// Customer Dashboard Hook
export const useCustomerDashboard = () => {
  const [data, setData] = useState({
    stats: null,
    orders: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsResponse, ordersResponse] = await Promise.all([
        dashboardAPI.getCustomerStats(),
        orderAPI.getAll({ page: 1, limit: 10 }),
      ]);

      setData({
        stats: statsResponse.data?.data || {},
        orders: ordersResponse.data?.data || [],
      });
    } catch (err) {
      console.error('Error fetching customer dashboard:', err);
      setError(err.response?.data?.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...data,
    loading,
    error,
    refetch: fetchData,
  };
};

// Business Dashboard Hook
export const useBusinessDashboard = () => {
  const [data, setData] = useState({
    stats: null,
    orders: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsResponse, ordersResponse] = await Promise.all([
        dashboardAPI.getBusinessStats(),
        businessAPI.getOrders({ page: 1, limit: 10 }),
      ]);

      setData({
        stats: statsResponse.data?.data || {},
        orders: ordersResponse.data?.data || [],
      });
    } catch (err) {
      console.error('Error fetching business dashboard:', err);
      setError(err.response?.data?.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...data,
    loading,
    error,
    refetch: fetchData,
  };
};

// Landlord Dashboard Hook
export const useLandlordDashboard = () => {
  const [data, setData] = useState({
    stats: null,
    properties: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsResponse, propertiesResponse] = await Promise.all([
        dashboardAPI.getLandlordStats(),
        rentalAPI.getAll({ page: 1, limit: 10 }),
      ]);

      setData({
        stats: statsResponse.data?.data || {},
        properties: propertiesResponse.data?.data || [],
      });
    } catch (err) {
      console.error('Error fetching landlord dashboard:', err);
      setError(err.response?.data?.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...data,
    loading,
    error,
    refetch: fetchData,
  };
};