import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck, ClipboardList, CheckCircle2, Hourglass, AlertTriangle, Percent, Gauge, Activity, CalendarClock, LogIn, UserPlus, Inbox, MessageSquare, UserSearch } from 'lucide-react';
import { Card, CardHeader, PageHeader, StatCard, StatCardSkeleton, ListSkeleton, EmptyState, ErrorState, Avatar, ProgressRing, Select } from '../../components/ui';
import { PriorityBadge, DeadlineLabel } from '../../components/common/StatusBadges';
import { TrendChart, StatusDonut, PerformanceChart, PriorityChart } from '../../components/charts/Charts';
import { dashboardService } from '../../services/dashboardService';
import { internService } from '../../services/internService';
import { useAuth } from '../../context/AuthContext';
import useFetch from '../../hooks/useFetch';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { timeAgo, formatDate } from '../../utils/format';
import { presetToRange } from '../../utils/dates';
import DateRangeFilters from '../../components/common/DateRangeFilters';

const activityIcon = (action = '') => ({ auth: LogIn, intern: UserPlus, submission: Inbox, feedback: MessageSquare }[action.split('.')[0]] || ClipboardList);
function IndividualPerformance({ params, enabled }) {
  const [internId, setInternId] = useState('');
  const { data: interns } = useFetch(() => internService.list({ limit: 100, sort: 'name:asc' }), []);
  const { data, loading, error, refetch } = useFetch(() => dashboardService.internPerformance(internId, params), [internId, params.from, params.to, params.groupBy], { enabled: !!internId && enabled });

  return (
    <Card>
      <CardHeader title="Individual intern performance" description="Pick an intern to see their progress and activity over the selected period"
        action={<Select aria-label="Select intern" wrapperClassName="w-56" value={internId} onChange={(e) => setInternId(e.target.value)} placeholder="Select an intern"
          options={(interns?.items || []).map((i) => ({ value: i._id, label: i.name }))} />} />
      {!internId ? <EmptyState icon={UserSearch} title="No intern selected" description="Choose an intern above to view their performance." className="py-10" />
        : error ? <ErrorState message={error} onRetry={refetch} />
        : loading || !data ? <div className="p-5"><div className="skeleton h-56 w-full" /></div> : (
          <div className="grid gap-6 p-5 lg:grid-cols-[220px_1fr]">
            <div className="flex flex-col items-center text-center">
              <Avatar name={data.intern.name} src={data.intern.avatar} size="lg" />
              <Link to={`/admin/interns/${data.intern._id}`} className="mt-3 font-medium text-foreground hover:text-link hover:underline">{data.intern.name}</Link>
              <p className="text-xs text-muted">{data.intern.position || data.intern.department || 'Intern'}</p>
              <div className="my-4"><ProgressRing value={data.cards.overallProgress} size={96} stroke={9} /></div>
              <dl className="grid w-full grid-cols-3 gap-2 text-center">
                {[['Tasks', data.cards.assignedTasks], ['Done', data.cards.completedTasks], ['Late', data.cards.overdueTasks]].map(([k, val]) => (
                  <div key={k} className="rounded-lg bg-subtle py-2"><dd className="text-base font-semibold tabular-nums text-foreground">{val}</dd><dt className="text-[11px] text-muted">{k}</dt></div>
                ))}
              </dl>
            </div>
            <TrendChart data={data.trend} height={260} />
          </div>
        )}
    </Card>
  );
}

export default function AdminDashboard() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const [preset, setPreset] = useState('all');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [groupBy, setGroupBy] = useState('');

  const range = useMemo(() => presetToRange(preset, custom.from, custom.to), [preset, custom]);
  const ready = preset !== 'custom' || (!!custom.from && !!custom.to && custom.from <= custom.to);
  const params = useMemo(() => ({ ...range, groupBy }), [range, groupBy]);

  const { data, loading, error, refetch } = useFetch(() => dashboardService.admin(params), [params.from, params.to, params.groupBy], { enabled: ready });
  const c = data?.cards;
  const busy = loading || !data;

  return (
    <>
      <PageHeader title={`Welcome back, ${user?.name?.split(' ')[0] || 'Admin'}`} description="Here's what's happening across your internship program."
        actions={<DateRangeFilters {...{ preset, setPreset, custom, setCustom, groupBy, setGroupBy }} />} />

      {!ready && <p className="mb-4 text-sm text-muted">Choose a start and end date to apply the custom range.</p>}

      {error ? (
        <Card><ErrorState message={error} onRetry={refetch} /></Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {busy ? Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />) : (
              <>
                <StatCard icon={Users} label="Total interns" value={c.totalInterns} tone="primary" />
                <StatCard icon={UserCheck} label="Active interns" value={c.activeInterns} tone="success" />
                <StatCard icon={ClipboardList} label="Total tasks" value={c.totalTasks} tone="info" />
                <StatCard icon={CheckCircle2} label="Completed tasks" value={c.completedTasks} tone="success" />
                <StatCard icon={Hourglass} label="Pending tasks" value={c.pendingTasks} tone="warning" />
                <StatCard icon={AlertTriangle} label="Overdue tasks" value={c.overdueTasks} tone={c.overdueTasks ? 'danger' : 'neutral'} />
                <StatCard icon={Percent} label="Completion rate" value={`${c.completionRate}%`} tone="primary" />
                <StatCard icon={Gauge} label="Average progress" value={`${c.avgProgress}%`} tone="info" />
              </>
            )}
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Task completion trend"
                description={busy ? 'Loading...' : `${formatDate(data.range.from, { day: 'numeric', month: 'short' })} - ${formatDate(data.range.to, { day: 'numeric', month: 'short' })}, grouped ${{ day: 'daily', week: 'weekly', month: 'monthly' }[data.range.groupBy]}`} />
              <div className="p-5">{busy ? <div className="skeleton h-64 w-full" /> : <TrendChart data={data.trend} />}</div>
            </Card>
            <Card>
              <CardHeader title="Completed vs pending" description="All tasks by current status" />
              <div className="p-5">{busy ? <div className="skeleton h-64 w-full" /> : <StatusDonut data={data.statusBreakdown} />}</div>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Intern performance" description="Average task progress per intern (top 15)" />
              <div className="p-5">{busy ? <div className="skeleton h-64 w-full" /> : <PerformanceChart data={data.performance} />}</div>
            </Card>
            <Card>
              <CardHeader title="Tasks by priority" />
              <div className="p-5">{busy ? <div className="skeleton h-56 w-full" /> : <PriorityChart data={data.priorityBreakdown} />}</div>
            </Card>
          </div>

          <IndividualPerformance params={params} enabled={ready} />

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Upcoming deadlines" description="Next tasks due across all interns" action={<Link to="/admin/tasks" className="text-xs font-medium text-link hover:underline">View tasks</Link>} />
              {busy ? <ListSkeleton /> : data.upcomingDeadlines.length === 0 ? (
                <EmptyState icon={CalendarClock} title="No upcoming deadlines" description="Tasks with future deadlines will appear here." className="py-10" />
              ) : (
                <ul className="divide-y divide-border">
                  {data.upcomingDeadlines.map((t) => (
                    <li key={t._id}>
                      <Link to={`/admin/tasks/${t._id}`} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-subtle/60">
                        <Avatar name={t.intern?.name} src={t.intern?.avatar} size="sm" />
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-foreground">{t.title}</p><p className="truncate text-xs text-muted">{t.intern?.name}</p></div>
                        <div className="flex flex-col items-end gap-1"><PriorityBadge priority={t.priority} /><DeadlineLabel deadline={t.deadline} status={t.status} /></div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader title="Recent activity" description="Latest actions by admins and interns" />
              {busy ? <ListSkeleton /> : data.recentActivity.length === 0 ? (
                <EmptyState icon={Activity} title="No activity yet" description="Actions will be logged here as your team works." className="py-10" />
              ) : (
                <ul className="divide-y divide-border">
                  {data.recentActivity.map((a) => {
                    const Icon = activityIcon(a.action);
                    return (
                      <li key={a._id} className="flex items-start gap-3 px-5 py-3.5">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-subtle text-muted"><Icon className="h-4 w-4" /></span>
                        <div className="min-w-0 flex-1"><p className="text-sm text-foreground">{a.description}</p><p className="mt-0.5 text-xs text-muted">{timeAgo(a.createdAt)}</p></div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
