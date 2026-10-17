import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { homeFor } from '../../utils/constants';
import useDocumentTitle from '../../hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  const { isAuthenticated, role } = useAuth();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center bg-background px-6 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-link"><Compass className="h-8 w-8" /></div>
      <p className="text-sm font-semibold text-link">404</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">The page you're looking for doesn't exist or hasn't been released yet.</p>
      <Link to={isAuthenticated ? homeFor(role) : '/login'}
        className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90">
        {isAuthenticated ? 'Back to dashboard' : 'Go to sign in'}
      </Link>
    </div>
  );
}
