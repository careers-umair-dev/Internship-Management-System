import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ClipboardList, Inbox, MessageSquareText, AlarmClock, AlertCircle, RotateCcw, CheckCircle2, Info } from 'lucide-react';
import Popover from '../ui/Popover';
import { EmptyState } from '../ui/EmptyState';
import { notificationService } from '../../services/notificationService';
import { timeAgo } from '../../utils/format';
import { cn } from '../../utils/cn';
import { useToast } from '../../context/ToastContext';

const ICONS = {
  task_assigned: ClipboardList, deadline_approaching: AlarmClock, task_completed: CheckCircle2, submission_received: Inbox,
  submission_reviewed: CheckCheck, feedback_received: MessageSquareText, revision_requested: RotateCcw, task_overdue: AlertCircle, system: Info,
};
const POLL_MS = 30000;

export default function NotificationBell() {
  const navigate = useNavigate();
  const toast = useToast();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const refreshCount = useCallback(() => notificationService.unreadCount().then(setUnread).catch(() => {}), []);

  // Poll the unread count while the tab is visible
  useEffect(() => {
    refreshCount();
    const id = setInterval(() => { if (!document.hidden) refreshCount(); }, POLL_MS);
    return () => clearInterval(id);
  }, [refreshCount]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationService.list({ limit: 8 });
      setItems(data.items);
      setUnread(data.unreadCount);
    } catch { toast.error('Could not load notifications'); }
    finally { setLoading(false); }
  }, [toast]);

  const open = async (n, close) => {
    close();
    if (!n.isRead) {
      setItems((list) => list.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
      setUnread((c) => Math.max(0, c - 1));
      notificationService.markRead(n._id).catch(() => {});
    }
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    try {
      await notificationService.markAllRead();
      setItems((list) => list.map((x) => ({ ...x, isRead: true })));
      setUnread(0);
    } catch { toast.error('Could not update notifications'); }
  };

  return (
    <Popover
      className="w-[min(92vw,380px)]"
      onOpenChange={(o) => o && loadList()}
      trigger={({ toggle, open: isOpen }) => (
        <button onClick={toggle} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-haspopup="dialog" aria-expanded={isOpen}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-subtle hover:text-foreground">
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white dark:text-background">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}
    >
      {({ close }) => (
        <div>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            <button onClick={markAll} disabled={!unread} className="text-xs font-medium text-link hover:underline disabled:opacity-40 disabled:no-underline">Mark all read</button>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {loading && !items.length ? (
              <p className="p-6 text-center text-sm text-muted">Loading...</p>
            ) : items.length === 0 ? (
              <EmptyState icon={Bell} title="You're all caught up" description="New notifications will show up here." className="py-10" />
            ) : items.map((n) => {
              const Icon = ICONS[n.type] || Info;
              return (
                <button key={n._id} onClick={() => open(n, close)}
                  className={cn('flex w-full items-start gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors last:border-0 hover:bg-subtle', !n.isRead && 'bg-primary/[0.04]')}>
                  <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', n.isRead ? 'bg-subtle text-muted' : 'bg-primary/10 text-link')}><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-sm', n.isRead ? 'text-foreground' : 'font-semibold text-foreground')}>{n.title}</span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{n.message}</span>
                    <span className="mt-1 block text-[11px] text-muted/80">{timeAgo(n.createdAt)}</span>
                  </span>
                  {!n.isRead && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Popover>
  );
}
