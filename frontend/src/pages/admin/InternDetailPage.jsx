import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, ClipboardPlus, UserX, UserCheck, FileBarChart, Mail, Phone, Building2, CalendarDays, Hourglass, UserRound, ClipboardList, CheckCircle2, AlertTriangle, Percent, Activity, Inbox } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardHeader, ConfirmDialog, DataTable, EmptyState, ErrorState, ListSkeleton, PageSkeleton, ProgressBar, ProgressRing, StatCard, Tabs } from '../../components/ui';
import { DeadlineLabel, PriorityBadge, StatusBadge, SubmissionBadge } from '../../components/common/StatusBadges';
import { StarRating } from '../../components/common/Common';
import { TrendChart, StatusDonut } from '../../components/charts/Charts';
import InternFormModal from '../../components/forms/InternFormModal';
import TaskFormModal from '../../components/forms/TaskFormModal';
import { internService } from '../../services/internService';
import { taskService } from '../../services/taskService';
import { submissionService } from '../../services/submissionService';
import { feedbackService } from '../../services/feedbackService';
import { dashboardService } from '../../services/dashboardService';
import { useToast } from '../../context/ToastContext';
import useFetch from '../../hooks/useFetch';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { formatDate, timeAgo } from '../../utils/format';

const STATUS_VARIANT = { active: 'success', inactive: 'neutral', completed: 'info' };
const TABS = [{ id: 'overview', label: 'Overview', icon: Activity }, { id: 'tasks', label: 'Task history', icon: ClipboardList }, { id: 'submissions', label: 'Submissions', icon: Inbox }, { id: 'feedback', label: 'Feedback', icon: Percent }];

function TasksTab({ internId }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { data, loading, error, refetch } = useFetch(() => taskService.list({ intern: internId, page, limit: 8, sort: 'deadline:desc' }), [internId, page]);
  const columns = [
    { key: 'title', header: 'Task', render: (t) => <div className="min-w-0"><p className="truncate font-medium text-foreground">{t.title}</p><p className="text-xs text-muted">{t.category}</p></div> },
    { key: 'priority', header: 'Priority', render: (t) => <PriorityBadge priority={t.priority} /> },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
    { key: 'progress', header: 'Progress', className: 'min-w-[130px]', render: (t) => <ProgressBar value={t.progress} size="sm" showLabel label={`${t.title} progress`} /> },
    { key: 'deadline', header: 'Deadline', render: (t) => <div><p className="text-foreground">{formatDate(t.deadline)}</p><DeadlineLabel deadline={t.deadline} status={t.status} /></div> },
  ];
  return <DataTable caption="Task history" columns={columns} data={data?.items || []} loading={loading && !data} error={error} onRetry={refetch} onRowClick={(t) => navigate(`/admin/tasks/${t._id}`)}
    pagination={data && data.pagination} onPageChange={setPage} empty={{ title: 'No tasks assigned', description: 'Assign a task to start tracking this intern.' }} />;
}

function SubmissionsTab({ internId }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { data, loading, error, refetch } = useFetch(() => submissionService.list({ intern: internId, page, limit: 8 }), [internId, page]);
  const columns = [
    { key: 'task', header: 'Task', render: (s) => <span className="font-medium text-foreground">{s.task?.title}</span> },
    { key: 'version', header: 'Version', render: (s) => `v${s.version}` },
    { key: 'status', header: 'Status', render: (s) => <SubmissionBadge status={s.status} /> },
    { key: 'createdAt', header: 'Submitted', render: (s) => <span className="text-muted">{timeAgo(s.createdAt)}</span> },
  ];
  return <DataTable caption="Submissions" columns={columns} data={data?.items || []} loading={loading && !data} error={error} onRetry={refetch} onRowClick={(s) => navigate(`/admin/submissions/${s._id}`)}
    pagination={data && data.pagination} onPageChange={setPage} empty={{ title: 'No submissions yet', description: 'Submitted work will appear here.' }} />;
}

function FeedbackTab({ internId }) {
  const { data, loading, error, refetch } = useFetch(() => feedbackService.list({ intern: internId, limit: 20 }), [internId]);
  if (error) return <Card><ErrorState message={error} onRetry={refetch} /></Card>;
  return (
    <Card>
      {loading && !data ? <ListSkeleton /> : data.items.length === 0 ? <EmptyState icon={Percent} title="No feedback yet" description="Feedback given on this intern's work will appear here." /> : (
        <ul className="divide-y divide-border">
          {data.items.map((f) => (
            <li key={f._id} className="px-5 py-4">
              <div className="flex items-center justify-between gap-3"><Link to={`/admin/tasks/${f.task?._id}`} className="truncate text-sm font-medium text-foreground hover:text-link hover:underline">{f.task?.title}</Link><Badge variant="neutral" className="capitalize">{f.type}</Badge></div>
              <p className="mt-1.5 text-sm text-muted">{f.message}</p>
              <p className="mt-2 flex items-center gap-3 text-xs text-muted">{f.admin?.name} - {timeAgo(f.createdAt)}{f.rating ? <StarRating value={f.rating} size="sm" /> : null}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function InternDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [toggling, setToggling] = useState(false);

  const { data, loading, error, refetch } = useFetch(() => internService.get(id), [id]);
  const perf = useFetch(() => dashboardService.internPerformance(id), [id]);
  useDocumentTitle(data?.intern?.name || 'Intern');

  if (error) return <Card><ErrorState message={error} onRetry={refetch} /></Card>;
  if (loading && !data) return <PageSkeleton />;
  const { intern, stats, recentActivity } = data;
  const active = intern.status === 'active';

  const toggleActive = async () => {
    if (active) await internService.remove(id); else await internService.update(id, { status: 'active' });
    toast.success(active ? `${intern.name} deactivated` : `${intern.name} reactivated`);
    refetch(); perf.refetch();
  };
  const refreshAll = () => { refetch(); perf.refetch(); };

  return (
    <>
      <Link to="/admin/interns" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"><ArrowLeft className="h-4 w-4" />All interns</Link>

      <Card className="mb-6">
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-start">
          <Avatar name={intern.name} src={intern.avatar} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{intern.name}</h1>
              <Badge variant={STATUS_VARIANT[intern.status]} dot className="capitalize">{intern.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">{[intern.position, intern.department].filter(Boolean).join(' - ') || 'Intern'}</p>
            <dl className="mt-4 grid gap-x-8 gap-y-2.5 text-sm sm:grid-cols-2">
              {[[Mail, intern.email], [Phone, intern.phone || 'No phone'], [Building2, intern.department || 'No department'], [UserRound, `Mentor: ${intern.mentor?.name || '-'}`],
                [CalendarDays, `Joined ${formatDate(intern.joiningDate)}`], [Hourglass, `${intern.durationMonths} month${intern.durationMonths > 1 ? 's' : ''} - ends ${formatDate(intern.internshipEndDate)}`]].map(([Icon, text], i) => (
                <div key={i} className="flex items-center gap-2.5 text-muted"><Icon className="h-4 w-4 shrink-0" /><span className="truncate text-foreground">{text}</span></div>
              ))}
            </dl>
            {intern.skills?.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{intern.skills.map((s) => <Badge key={s} variant="primary">{s}</Badge>)}</div>}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button size="sm" leftIcon={ClipboardPlus} onClick={() => setAssigning(true)} disabled={!active}>Assign task</Button>
              <Button size="sm" variant="outline" leftIcon={Pencil} onClick={() => setEditing(true)}>Edit</Button>
              <Button size="sm" variant="outline" leftIcon={FileBarChart} onClick={() => navigate(`/admin/reports?intern=${id}`)}>Progress report</Button>
              <Button size="sm" variant="ghost" leftIcon={active ? UserX : UserCheck} onClick={() => setToggling(true)}>{active ? 'Deactivate' : 'Reactivate'}</Button>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2"><ProgressRing value={intern.overallProgress} /><p className="text-xs text-muted">Overall progress</p></div>
        </div>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ClipboardList} label="Total tasks" value={stats.total} tone="primary" />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} tone="success" hint={`${stats.completionRate}% completion rate`} />
        <StatCard icon={Hourglass} label="Pending / in progress" value={stats.pending + stats.inProgress} tone="warning" />
        <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdue} tone={stats.overdue ? 'danger' : 'neutral'} />
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTab} className="mb-6" />

      {tab === 'overview' && (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title="Weekly progress" description="Tasks assigned vs completed (last 8 weeks)" />
            <div className="p-5">{perf.loading && !perf.data ? <div className="skeleton h-64 w-full" /> : perf.error ? <ErrorState message={perf.error} onRetry={perf.refetch} /> : <TrendChart data={perf.data.trend} />}</div>
          </Card>
          <Card>
            <CardHeader title="Task status" />
            <div className="p-5">{perf.data ? <StatusDonut data={perf.data.statusBreakdown} /> : <div className="skeleton h-64 w-full" />}</div>
          </Card>
          <Card className="xl:col-span-3">
            <CardHeader title="Recent activity" />
            {recentActivity.length === 0 ? <EmptyState icon={Activity} title="No activity yet" className="py-10" /> : (
              <ul className="divide-y divide-border">{recentActivity.map((a) => <li key={a._id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm"><span className="text-foreground">{a.description}</span><span className="shrink-0 text-xs text-muted">{timeAgo(a.createdAt)}</span></li>)}</ul>
            )}
          </Card>
        </div>
      )}
      {tab === 'tasks' && <TasksTab internId={id} />}
      {tab === 'submissions' && <SubmissionsTab internId={id} />}
      {tab === 'feedback' && <FeedbackTab internId={id} />}

      {editing && <InternFormModal intern={intern} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); refreshAll(); }} />}
      {assigning && <TaskFormModal defaultIntern={id} onClose={() => setAssigning(false)} onSaved={() => { setAssigning(false); refreshAll(); }} />}
      <ConfirmDialog open={toggling} onClose={() => setToggling(false)} onConfirm={toggleActive} variant={active ? 'danger' : 'primary'} confirmLabel={active ? 'Deactivate' : 'Reactivate'}
        title={active ? 'Deactivate intern?' : 'Reactivate intern?'}
        message={active ? `${intern.name} will no longer be able to sign in or receive new tasks. Their data is kept.` : `${intern.name} will be able to sign in again.`} />
    </>
  );
}
