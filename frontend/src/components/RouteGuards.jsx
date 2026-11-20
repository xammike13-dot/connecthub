// frontend/src/components/RouteGuards.jsx
// Declarative Route Guards for Authentication and Role-Based Access Control (RBAC)

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, OLA_ROLES } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * Map of user roles to their primary default dashboard route.
 * Customers stay on the homepage — their account is accessed via the Account icon.
 */
export const ROLE_DASHBOARDS = {
  [OLA_ROLES.CUSTOMER]: '/',
  [OLA_ROLES.BUSINESS]: '/business/dashboard',
  [OLA_ROLES.RIDER]: '/rider/dashboard',
  [OLA_ROLES.ADMIN]: '/admin',
  // Backward compatibility mappings
  landlord: '/landlord/dashboard',
  caretaker: '/caretaker/dashboard',
  assistant: '/assistant/dashboard',
};

/**
 * ProtectedRoute: Blocks unauthenticated visitors and preserves intended URL in state
 */
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, initialized } = useAuth();
  const location = useLocation();

  if (loading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
};

/**
 * RoleRoute: Enforces specific allowed roles. Redirects unauthorized users to their own dashboard.
 * Example: <RoleRoute allowedRoles={['admin', 'business']} />
 */
export const RoleRoute = ({ allowedRoles = [], children }) => {
  const { user, role, isAuthenticated, loading, initialized } = useAuth();
  const location = useLocation();

  if (loading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  // First verify authentication
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verify role authorization
  const isAuthorized = allowedRoles.length === 0 || allowedRoles.includes(role);

  if (!isAuthorized) {
    console.warn(`[RoleRoute] Access denied for role "${role}" on path "${location.pathname}". Allowed:`, allowedRoles);
    const redirectUrl = ROLE_DASHBOARDS[role] || '/';
    return <Navigate to={redirectUrl} replace />;
  }

  return children ? children : <Outlet />;
};

/**
 * PublicOnlyRoute: Redirects logged-in users away from /login or /register to their dashboard
 */
export const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, role, loading, initialized } = useAuth();
  const location = useLocation();

  if (loading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (isAuthenticated) {
    const origin = location.state?.from?.pathname;
    let target = origin || ROLE_DASHBOARDS[role] || '/';
    if (role === 'customer' && target.includes('/dashboard')) {
      target = '/';
    }
    return <Navigate to={target} replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
