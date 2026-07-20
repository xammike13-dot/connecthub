import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import DashboardHeader from '../components/DashboardHeader';
import LoadingSpinner from '../components/LoadingSpinner';

const DashboardLayout = ({ allowedRoles }) => {
  const { user, loading, isAuthenticated, initialized } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Show loading spinner while auth is being initialized
  if (loading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <LoadingSpinner />
      </div>
    );
  }

  // If not authenticated, redirect to login with return URL
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Prevent users from bypassing onboarding
  if (user && user.role !== 'customer' && !user.onboardingCompleted) {
    const setupPages = {
      landlord: '/setup/landlord',
      business: '/setup/business',
      rider: '/setup/rider',
    };
    const targetSetupPage = setupPages[user.role];
    if (targetSetupPage) {
      return <Navigate to={targetSetupPage} replace />;
    }
  }

  // If user's role is not in allowedRoles, redirect to their appropriate dashboard
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Map of roles to their respective dashboards
    const dashboardMap = {
      customer: '/customer/dashboard',
      landlord: '/landlord/dashboard',
      business: '/business/dashboard',
      rider: '/rider/dashboard',
      admin: '/admin/dashboard',
      caretaker: '/caretaker/dashboard',
      assistant: '/assistant/dashboard',
    };
    
    const userDashboard = dashboardMap[user?.role];
    
    // If user has a valid dashboard, redirect there; otherwise to login
    if (userDashboard) {
      return <Navigate to={userDashboard} replace />;
    }
    
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
        <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;