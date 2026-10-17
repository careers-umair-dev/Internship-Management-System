import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { homeFor } from '../../utils/constants';
import Spinner from '../ui/Spinner';

export function FullScreenLoader() {
  return <div className="flex min-h-screen items-center justify-center bg-background"><Spinner className="h-8 w-8" /></div>;
}

// <ProtectedRoute roles={['admin']} /> guards nested routes: guests go to /login,
// users with the wrong role are sent to their own home.
export default function ProtectedRoute({ roles }) {
  const { isAuthenticated, booting, role } = useAuth();
  const location = useLocation();

  if (booting) return <FullScreenLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(role)) return <Navigate to={homeFor(role)} replace />;
  return <Outlet />;
}

// "/" -> role home or login
export function RootRedirect() {
  const { isAuthenticated, booting, role } = useAuth();
  if (booting) return <FullScreenLoader />;
  return <Navigate to={isAuthenticated ? homeFor(role) : '/login'} replace />;
}
