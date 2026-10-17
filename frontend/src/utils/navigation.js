import { LayoutDashboard, Users, ClipboardList, Inbox, BarChart3, Settings, MessageSquareText, TrendingUp } from 'lucide-react';

// `ready: false` items render as disabled "Soon" entries until their phase ships.
export const NAV = {
  admin: [
    { section: 'Workspace', items: [
      { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard, ready: true },
      { label: 'Interns', to: '/admin/interns', icon: Users, ready: true },
      { label: 'Tasks', to: '/admin/tasks', icon: ClipboardList, ready: true },
      { label: 'Submissions', to: '/admin/submissions', icon: Inbox, ready: true },
      { label: 'Reports', to: '/admin/reports', icon: BarChart3, ready: true },
    ] },
    { section: 'Account', items: [{ label: 'Settings', to: '/admin/settings', icon: Settings, ready: true }] },
  ],
  intern: [
    { section: 'Workspace', items: [
      { label: 'Dashboard', to: '/intern/dashboard', icon: LayoutDashboard, ready: true },
      { label: 'My Tasks', to: '/intern/tasks', icon: ClipboardList, ready: true },
      { label: 'Submissions', to: '/intern/submissions', icon: Inbox, ready: true },
      { label: 'Feedback', to: '/intern/feedback', icon: MessageSquareText, ready: true },
      { label: 'My Progress', to: '/intern/progress', icon: TrendingUp, ready: true },
    ] },
    { section: 'Account', items: [{ label: 'Settings', to: '/intern/settings', icon: Settings, ready: true }] },
  ],
};

export const pageTitleFor = (pathname) => {
  const all = [...NAV.admin, ...NAV.intern].flatMap((g) => g.items);
  return all.find((i) => pathname.startsWith(i.to))?.label || 'InternHub';
};
