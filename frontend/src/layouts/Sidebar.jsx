import { NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import Logo from '../assets/Logo';
import { NAV } from '../utils/navigation';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/ui/Avatar';
import { cn } from '../utils/cn';

function NavItem({ item, collapsed, onNavigate }) {
  const Icon = item.icon;
  const base = 'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors';

  if (!item.ready) {
    return (
      <div className={cn(base, 'cursor-not-allowed text-muted/60')} aria-disabled="true" title={`${item.label} - coming soon`}>
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && <><span className="flex-1">{item.label}</span><span className="rounded bg-subtle px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">Soon</span></>}
      </div>
    );
  }
  return (
    <NavLink to={item.to} onClick={onNavigate} title={collapsed ? item.label : undefined}
      className={({ isActive }) => cn(base, isActive ? 'bg-primary/10 text-link' : 'text-muted hover:bg-subtle hover:text-foreground')}>
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}
          <Icon className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>{item.label}</span>}
        </>
      )}
    </NavLink>
  );
}

function SidebarContent({ collapsed, onNavigate, onToggleCollapse, onClose, showCollapse }) {
  const { role, user } = useAuth();
  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-16 items-center border-b border-border px-5', collapsed && 'justify-center px-0')}>
        <Logo collapsed={collapsed} />
        {onClose && <button onClick={onClose} aria-label="Close menu" className="ml-auto rounded-lg p-1.5 text-muted hover:bg-subtle"><X className="h-5 w-5" /></button>}
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Main navigation">
        {NAV[role]?.map((group) => (
          <div key={group.section}>
            {!collapsed && <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted/70">{group.section}</p>}
            <div className="space-y-1">{group.items.map((i) => <NavItem key={i.to} item={i} collapsed={collapsed} onNavigate={onNavigate} />)}</div>
          </div>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <div className={cn('flex items-center gap-3 rounded-lg p-2', collapsed && 'justify-center')}>
          <Avatar name={user?.name} src={user?.avatar} size="sm" />
          {!collapsed && <div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{user?.name}</p><p className="truncate text-xs capitalize text-muted">{user?.role === 'intern' ? (user?.position || 'Intern') : (user?.designation || 'Admin')}</p></div>}
        </div>
        {showCollapse && (
          <button onClick={onToggleCollapse} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="mt-1 hidden w-full items-center justify-center gap-2 rounded-lg p-2 text-xs text-muted hover:bg-subtle hover:text-foreground lg:flex">
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" />Collapse</>}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onMobileClose }) {
  return (
    <>
      <aside className={cn('no-print fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-surface transition-[width] duration-200 lg:block', collapsed ? 'w-[72px]' : 'w-64')}>
        <SidebarContent collapsed={collapsed} onToggleCollapse={onToggleCollapse} showCollapse />
      </aside>
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-slate-950/50 backdrop-blur-sm" onClick={onMobileClose} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 w-72 animate-slide-in-left border-r border-border bg-surface shadow-pop">
            <SidebarContent collapsed={false} onNavigate={onMobileClose} onClose={onMobileClose} />
          </aside>
        </div>
      )}
    </>
  );
}
