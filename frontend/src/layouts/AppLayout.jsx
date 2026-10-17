import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { PageSkeleton } from '../components/ui/Skeleton';
import useLocalStorage from '../hooks/useLocalStorage';
import { SIDEBAR_KEY } from '../utils/constants';
import { cn } from '../utils/cn';

export default function AppLayout() {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useLocalStorage(SIDEBAR_KEY, false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <div className="min-h-screen bg-background">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
      <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className={cn('transition-[padding] duration-200', collapsed ? 'lg:pl-[72px]' : 'lg:pl-64')}>
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main id="main" className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
          <ErrorBoundary resetKey={pathname}>
            <Suspense fallback={<PageSkeleton />}>
              <div key={pathname} className="animate-slide-up"><Outlet /></div>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
