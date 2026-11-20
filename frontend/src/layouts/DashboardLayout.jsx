// frontend/src/layouts/DashboardLayout.jsx
// Enterprise Dashboard Shell with Role-Restricted Layout and Dynamic Navigation

import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth, OLA_ROLES } from '../context/AuthContext';
import { ROLE_DASHBOARDS } from '../components/RouteGuards';
import Sidebar from '../components/Sidebar';
import DashboardHeader from '../components/DashboardHeader';
import LoadingSpinner from '../components/LoadingSpinner';

const DashboardLayout = ({ allowedRoles }) => {
  const { user, role, loading, isAuthenticated, initialized } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 1. Show loading spinner during session bootstrapping
  if (loading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  // 2. Unauthenticated guard: redirect to login preserving intent
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Onboarding guard: ensure vendors and riders complete profile setup
  const isApprovedPartner =
    user?.onboardingCompleted === true ||
    user?.setupCompleted === true ||
    user?.roleApplication?.status === 'approved' ||
    user?.businessProfile?.isApproved === true ||
    role === 'assistant' ||
    role === 'caretaker';

  if (user && role !== OLA_ROLES.CUSTOMER && role !== OLA_ROLES.ADMIN && !isApprovedPartner) {
    const setupPages = {
      [OLA_ROLES.BUSINESS]: '/setup/business',
      [OLA_ROLES.RIDER]: '/setup/rider',
      landlord: '/setup/landlord',
    };
    const targetSetup = setupPages[role];
    if (targetSetup && location.pathname !== targetSetup) {
      return <Navigate to={targetSetup} replace />;
    }
  }

  // 4. Role Authorization Guard: verify if user role is permitted for this dashboard sub-tree
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    const redirectUrl = ROLE_DASHBOARDS[role] || '/';
    console.warn(`[DashboardLayout] Role "${role}" attempted access to protected section. Redirecting to "${redirectUrl}".`);
    return <Navigate to={redirectUrl} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Dynamic Role-Based Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        role={role}
        user={user}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
        <DashboardHeader
          onMenuClick={() => setSidebarOpen(true)}
          user={user}
          role={role}
        />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
