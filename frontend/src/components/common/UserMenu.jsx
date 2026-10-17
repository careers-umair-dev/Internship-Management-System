import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Popover from '../ui/Popover';
import Avatar from '../ui/Avatar';

export default function UserMenu() {
  const { user, logout, role } = useAuth();
  const navigate = useNavigate();
  return (
    <Popover
      className="w-60 p-1.5"
      trigger={({ toggle, open }) => (
        <button onClick={toggle} aria-label="Account menu" aria-haspopup="menu" aria-expanded={open}
          className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-subtle">
          <Avatar name={user?.name} src={user?.avatar} size="sm" />
          <ChevronDown className="hidden h-4 w-4 text-muted sm:block" />
        </button>
      )}
    >
      {({ close }) => (
        <div role="menu">
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium text-foreground">{user?.name}</p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-link">{role}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          <button role="menuitem" onClick={() => { close(); navigate(`/${role}/settings`); }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground hover:bg-subtle"><Settings className="h-4 w-4" />Settings</button>
          <button role="menuitem" onClick={() => { close(); logout(); navigate('/login', { replace: true }); }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-danger hover:bg-danger/10"><LogOut className="h-4 w-4" />Sign out</button>
        </div>
      )}
    </Popover>
  );
}
