import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import ThemeToggle from '../components/common/ThemeToggle';
import NotificationBell from '../components/common/NotificationBell';
import GlobalSearch from '../components/common/GlobalSearch';
import UserMenu from '../components/common/UserMenu';
import { pageTitleFor } from '../utils/navigation';

export default function Topbar({ onMenuClick }) {
  const { pathname } = useLocation();
  return (
    <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <button onClick={onMenuClick} aria-label="Open menu" className="rounded-lg p-2 text-muted hover:bg-subtle hover:text-foreground lg:hidden"><Menu className="h-5 w-5" /></button>
      <p className="hidden text-sm font-medium text-muted md:block">{pageTitleFor(pathname)}</p>
      <GlobalSearch className="ml-auto min-w-0 md:ml-6 md:flex-1" />
      <div className="flex items-center gap-1 md:ml-auto">
        <ThemeToggle />
        <NotificationBell />
        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
        <UserMenu />
      </div>
    </header>
  );
}
