import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, CheckCircle2, ClipboardList, Download, Hourglass, Printer, Trophy } from 'lucide-react';
import { Button, Card, CardHeader, EmptyState, ErrorState, ListSkeleton, PageHeader, ProgressRing, StatCard, StatCardSkeleton, Badge } from '../../components/ui';
import DateRangeFilters from '../../components/common/DateRangeFilters';
import { PriorityChart, StatusDonut, TrendChart } from '../../components/charts/Charts';
import { PriorityBadge, DeadlineLabel } from '../../components/common/StatusBadges';
import { dashboardService } from '../../services/dashboardService';
import { reportService } from '../../services/reportService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useFetch from '../../hooks/useFetch';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { formatDate, getErrorMessage, timeAgo } from '../../utils/format';
import { presetToRange } from '../../utils/dates';

export default function InternProgressPage() {
  useDocumentTitle('My progress');
  const { user } = useAuth();
  const toast = useToast();
  const [preset, setPreset] = useState('90');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [groupBy, setGroupBy] = useState('week');
  const [exporting, setExporting] = useState(false);

  const range = useMemo(() => presetToRange(preset, custom.from, custom.to), [preset, custom]);
  const ready = preset !== 'custom' || (!!custom.from && !!custom.to && custom.from <= custom.to);
  const params = useMemo(() => ({ ...range, groupBy }), [range, groupBy]);

  const { data, loading, error, refetch } = useFetch(() => dashboardService.intern(params), [params.from, params.to, params.groupBy], { enabled: ready });
  const activity = useFetch(() => dashboardService.activity({ limit: 8 }), []);
  const busy = loading || !data;
  const c = data?.cards;

  const exportCSV = async () => {
    setExporting(true);
    try { await reportService.progressCSV(user._id); } catch (err) { toast.error(getErrorMessage(err)); } finally { setExporting(false); }
  };

  return (
    <>
      <PageHeader title="My progress" description="How your work is going over time."
        actions={<>
          <DateRangeFilters {...{ preset, setPreset, custom, setCustom, groupBy, setGroupBy }} />
          <Button variant="outline" leftIcon={Download} onClick={exportCSV} loading={exporting}>Export CSV</Button>
          <Button variant="outline" leftIcon={Printer} onClick={() => window.print()}>Print</Button>
        </>} />
      {!ready && <p className="mb-4 text-sm text-muted">Choose a start and end date to apply the custom range.</p>}

      {error ? <Card><ErrorState message={error} onRetry={refetch} /></Card> : (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <Card className="flex flex-col items-center justify-center p-6 text-center">
              {busy ? <div className="skeleton h-28 w-28 rounded-full" /> : <ProgressRing value={c.overallProgress} label="Overall progress" />}
              <p className="mt-3 text-sm text-muted">Average across all tasks</p>
            </Card>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {busy ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />) : (
                <>
                  <StatCard icon={ClipboardList} label="Assigned" value={c.assignedTasks} tone="primary" />
                  <StatCard icon={CheckCircle2} label="Completed" value={c.completedTasks} tone="success" hint={`${c.completionRate}% completion rate`} />
                  <StatCard icon={Hourglass} label="In flight" value={c.pendingTasks} tone="warning" />
                  <StatCard icon={AlertTriangle} label="Overdue" value={c.overdueTasks} tone={c.overdueTasks ? 'danger' : 'neutral'} />
                </>
              )}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Weekly and monthly activity" description="Tasks assigned vs completed in the selected period" />
              <div className="p-5">{busy ? <div className="skeleton h-64 w-full" /> : <TrendChart data={data.trend} />}</div>
            </Card>
            <Card>
              <CardHeader title="Task status" description="Current state of all your tasks" />
              <div className="p-5">{busy ? <div className="skeleton h-64 w-full" /> : <StatusDonut data={data.statusBreakdown} />}</div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Performance history" description="Your most recently completed tasks" />
              {busy ? <ListSkeleton /> : data.performanceHistory.length === 0 ? (
                <EmptyState icon={Trophy} title="No completed tasks yet" description="Finished work will build your history here." className="py-10" />
              ) : (
                <ul className="divide-y divide-border">
                  {data.performanceHistory.map((t) => {
                    const onTime = t.completedAt && new Date(t.completedAt) <= new Date(t.deadline);
                    return (
                      <li key={t._id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                        <div className="min-w-0"><Link to={`/intern/tasks/${t._id}`} className="block truncate text-sm font-medium text-foreground hover:text-link">{t.title}</Link>
                          <p className="text-xs text-muted">Completed {formatDate(t.completedAt)}</p></div>
                        <Badge variant={onTime ? 'success' : 'warning'}>{onTime ? 'On time' : 'Late'}</Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
            <Card>
              <CardHeader title="Tasks by priority" />
              <div className="p-5">{busy ? <div className="skeleton h-56 w-full" /> : <PriorityChart data={data.priorityBreakdown} />}</div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Upcoming deadlines" action={<Link to="/intern/tasks" className="text-xs font-medium text-link hover:underline">All tasks</Link>} />
              {busy ? <ListSkeleton /> : data.upcomingDeadlines.length === 0 ? (
                <EmptyState icon={ClipboardList} title="Nothing due soon" className="py-10" />
              ) : (
                <ul className="divide-y divide-border">
                  {data.upcomingDeadlines.map((t) => (
                    <li key={t._id}><Link to={`/intern/tasks/${t._id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-subtle/60">
                      <p className="min-w-0 truncate text-sm font-medium text-foreground">{t.title}</p>
                      <div className="flex shrink-0 flex-col items-end gap-1"><PriorityBadge priority={t.priority} /><DeadlineLabel deadline={t.deadline} status={t.status} /></div>
                    </Link></li>
                  ))}
                </ul>
              )}
            </Card>
            <Card>
              <CardHeader title="Activity timeline" description="Your latest actions" />
              {activity.loading && !activity.data ? <ListSkeleton /> : !activity.data?.items?.length ? (
                <EmptyState icon={Activity} title="No activity yet" className="py-10" />
              ) : (
                <ul className="divide-y divide-border">
                  {activity.data.items.map((a) => (
                    <li key={a._id} className="flex items-start gap-3 px-5 py-3.5">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-subtle text-muted"><Activity className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1"><p className="text-sm text-foreground">{a.description}</p><p className="mt-0.5 text-xs text-muted">{timeAgo(a.createdAt)}</p></div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
