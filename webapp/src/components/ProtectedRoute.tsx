import { useAuth } from "../contexts/AuthContext";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  allowOwnUserOnly?: boolean; // Only allow users to access their own user routes
}

export default function ProtectedRoute({ children, requiredRole, allowOwnUserOnly }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const params = useParams();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [validSession, setValidSession] = useState(false);

  // Verify there's actually a valid Supabase session, not just cached user data
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        setValidSession(!!(session?.user && !error));
      } catch {
        setValidSession(false);
      }
      setSessionChecked(true);
    };

    checkSession();
  }, []);

  // Show loading state while checking authentication or session
  if (isLoading || !sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to sign-in if not authenticated OR no valid session
  if (!user || !validSession) {
    // Clear any stale localStorage data
    localStorage.removeItem('currentUser');
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
