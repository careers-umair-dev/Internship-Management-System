import { Link } from 'react-router-dom';
import { ClipboardList, CheckCircle2, Hourglass, AlertTriangle, CalendarClock, MessageSquareText, Star, Inbox } from 'lucide-react';
import { Card, CardHeader, StatCard, StatCardSkeleton, ListSkeleton, EmptyState, ErrorState, Avatar, Badge, ProgressBar, ProgressRing } from '../../components/ui';
import { PriorityBadge, DeadlineLabel, SubmissionBadge } from '../../components/common/StatusBadges';
import { TrendChart, StatusDonut } from '../../components/charts/Charts';
import StatusBar from '../../components/common/StatusBar';
import { dashboardService } from '../../services/dashboardService';
import { useAuth } from '../../context/AuthContext';
import useFetch from '../../hooks/useFetch';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { timeAgo } from '../../utils/format';

const FEEDBACK_VARIANT = { approval: 'success', rejection: 'danger', revision: 'warning', general: 'info' };

export default function InternDashboard() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const { data, loading, error, refetch } = useFetch(() => dashboardService.intern(), []);
  const c = data?.cards;
  const first = user?.name?.split(' ')[0] || 'there';

  if (error) return <Card><ErrorState message={error} onRetry={refetch} /></Card>;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="flex flex-col items-start gap-6 bg-gradient-to-r from-primary/10 via-transparent to-transparent p-6 sm:flex-row sm:items-center">
          <Avatar name={user?.name} src={user?.avatar} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back, {first}</h1>
            <p className="mt-1 text-sm text-muted">
              {[user?.position, user?.department].filter(Boolean).join(' - ') || 'Intern'}
              {!loading && !c.overdueTasks && ' - you are on track'}
            </p>
            {!loading && c.overdueTasks > 0 && <Link to="/intern/tasks?overdue=true" className="mt-1 inline-block text-sm font-medium text-danger hover:underline">{c.overdueTasks} overdue task{c.overdueTasks > 1 ? 's' : ''} need attention</Link>}
          </div>
          {loading ? <div className="skeleton h-28 w-28 rounded-full" /> : <ProgressRing value={c.overallProgress} />}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />) : (
          <>
            <StatCard icon={ClipboardList} label="Assigned tasks" value={c.assignedTasks} tone="primary" />
            <StatCard icon={CheckCircle2} label="Completed" value={c.completedTasks} tone="success" />
            <StatCard icon={Hourglass} label="Pending" value={c.pendingTasks} tone="warning" />
            <StatCard icon={AlertTriangle} label="Overdue" value={c.overdueTasks} tone={c.overdueTasks ? 'danger' : 'neutral'} />
          </>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Progress over time" description="Tasks assigned vs completed" action={<Link to="/intern/progress" className="text-xs font-medium text-link hover:underline">Full report</Link>} />
          <div className="p-5">{loading ? <div className="skeleton h-64 w-full" /> : <TrendChart data={data.trend} height={240} />}</div>
        </Card>
        <Card>
          <CardHeader title="My task status" description="Where all your tasks currently stand" />
          <div className="space-y-4 p-5">{loading ? <div className="skeleton h-56 w-full" /> : (<><StatusDonut data={data.statusBreakdown} height={200} /><StatusBar breakdown={data.statusBreakdown} /></>)}</div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Upcoming deadlines" description="What you need to finish next" />
          {loading ? <ListSkeleton /> : data.upcomingDeadlines.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Nothing due soon" description="You have no upcoming deadlines." className="py-10" />
          ) : (
            <ul className="divide-y divide-border">
              {data.upcomingDeadlines.map((t) => (
                <li key={t._id}><Link to={`/intern/tasks/${t._id}`} className="block px-5 py-3.5 transition-colors hover:bg-subtle/60">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium text-foreground">{t.title}</p><PriorityBadge priority={t.priority} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <DeadlineLabel deadline={t.deadline} status={t.status} />
                    <ProgressBar value={t.progress} size="sm" className="w-28" label={`${t.title} progress`} />
                  </div>
                </Link></li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Recent feedback" description="Latest comments from your mentors" />
          {loading ? <ListSkeleton /> : data.recentFeedback.length === 0 ? (
            <EmptyState icon={MessageSquareText} title="No feedback yet" description="Feedback on your submissions will appear here." className="py-10" />
          ) : (
            <ul className="divide-y divide-border">
              {data.recentFeedback.map((f) => (
                <li key={f._id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-foreground">{f.task?.title}</p>
                    <Badge variant={FEEDBACK_VARIANT[f.type] || 'info'}>{f.type}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{f.message}</p>
                  <p className="mt-1.5 flex items-center gap-2 text-xs text-muted">
                    {f.admin?.name} - {timeAgo(f.createdAt)}
                    {f.rating && <span className="inline-flex items-center gap-0.5 text-warning"><Star className="h-3 w-3 fill-current" />{f.rating}/5</span>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card>
        <CardHeader title="Recent submissions" description="Your latest handed-in work" action={<Link to="/intern/submissions" className="text-xs font-medium text-link hover:underline">View all</Link>} />
        {loading ? <ListSkeleton /> : !data.recentSubmissions?.length ? (
          <EmptyState icon={Inbox} title="No submissions yet" description="Submit work from one of your tasks." className="py-10" />
        ) : (
          <ul className="divide-y divide-border">
            {data.recentSubmissions.map((s) => (
              <li key={s._id}><Link to={`/intern/tasks/${s.task?._id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-subtle/60">
                <div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{s.task?.title}</p><p className="text-xs text-muted">Version {s.version} - {timeAgo(s.createdAt)}</p></div>
                <SubmissionBadge status={s.status} />
              </Link></li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
