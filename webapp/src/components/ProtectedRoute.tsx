import { useAuth } from "../contexts/AuthContext";
import { Navigate, useLocation, useParams } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  allowOwnUserOnly?: boolean; // Only allow users to access their own user routes
}

export default function ProtectedRoute({ children, requiredRole, allowOwnUserOnly }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const params = useParams();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!user) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  // Check if user is trying to access another user's account
  if (allowOwnUserOnly && params.id && params.id !== user.id) {
    // Redirect to their own dashboard
    return <Navigate to={`/user/${user.id}/dashboard`} replace />;
  }

  // Check role-based access if required
  if (requiredRole && user.role !== requiredRole) {
    // If user is logged in but doesn't have the right role, redirect to their appropriate dashboard
    if (user.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      return <Navigate to={`/user/${user.id}/dashboard`} replace />;
    }
  }

  // User is authenticated and has the right role
  return <>{children}</>;
}
