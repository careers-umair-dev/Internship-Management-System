import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, CalendarDays, Tag, UserRound, CheckCircle2, Clock, ExternalLink, MessageSquare, PlayCircle, CircleDashed, AlertOctagon } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardBody, CardHeader, ConfirmDialog, Dropdown, EmptyState, ErrorState, PageSkeleton, ProgressBar } from '../../components/ui';
import { AttachmentList, StarRating, ExternalLinkChip } from '../../components/common/Common';
import { DeadlineLabel, PriorityBadge, StatusBadge, SubmissionBadge } from '../../components/common/StatusBadges';
import TaskFormModal from '../../components/forms/TaskFormModal';
import FeedbackForm from '../../components/forms/FeedbackForm';
import { taskService } from '../../services/taskService';
import { useToast } from '../../context/ToastContext';
import useFetch from '../../hooks/useFetch';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { formatDate, formatDateTime, getErrorMessage, timeAgo } from '../../utils/format';

const FB_VARIANT = { approval: 'success', rejection: 'danger', revision: 'warning', general: 'info' };

export default function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, refetch } = useFetch(() => taskService.get(id), [id]);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useDocumentTitle(data?.task?.title || 'Task');

  if (error) return <Card><ErrorState message={error} onRetry={refetch} /></Card>;
  if (loading && !data) return <PageSkeleton />;
  const { task, submissions, feedback } = data;

  const setStatus = async (status) => {
    try { await taskService.changeStatus(id, status); toast.success(`Status changed to ${status}`); refetch(); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <>
      <Link to="/admin/tasks" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"><ArrowLeft className="h-4 w-4" />All tasks</Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><StatusBadge status={task.status} /><PriorityBadge priority={task.priority} />{task.submissionStatus === 'pending_review' && <Badge variant="warning" dot>Awaiting review</Badge>}</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{task.title}</h1>
        </div>
        <div className="flex shrink-0 gap-2">
          <Dropdown label="Change status" trigger={({ toggle }) => <Button variant="outline" onClick={toggle}>Change status</Button>}
            items={[
              { label: 'Pending', icon: CircleDashed, onClick: () => setStatus('Pending'), disabled: task.status === 'Pending' },
              { label: 'In Progress', icon: PlayCircle, onClick: () => setStatus('In Progress'), disabled: task.status === 'In Progress' },
              { label: 'Completed', icon: CheckCircle2, onClick: () => setStatus('Completed'), disabled: task.status === 'Completed' },
              { label: 'Overdue', icon: AlertOctagon, onClick: () => setStatus('Overdue'), disabled: task.status === 'Overdue' },
            ]} />
          <Button variant="outline" leftIcon={Pencil} onClick={() => setEditing(true)}>Edit</Button>
          <Button variant="ghost" size="icon" aria-label="Delete task" onClick={() => setDeleting(true)} className="text-danger hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Description" />
            <CardBody>{task.description ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{task.description}</p> : <p className="text-sm text-muted">No description provided.</p>}</CardBody>
            {task.attachments?.length > 0 && <div className="border-t border-border p-5"><p className="mb-3 text-sm font-medium text-foreground">Attachments</p><AttachmentList files={task.attachments} /></div>}
          </Card>

          <Card>
            <CardHeader title="Submission history" description={`${submissions.length} submission${submissions.length === 1 ? '' : 's'}`} />
            {submissions.length === 0 ? <EmptyState icon={Clock} title="Nothing submitted yet" description="Submitted work and its review status will show up here." className="py-10" /> : (
              <ul className="divide-y divide-border">
                {submissions.map((s) => (
                  <li key={s._id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2"><span className="text-sm font-semibold text-foreground">Version {s.version}</span><SubmissionBadge status={s.status} /></div>
                      <span className="text-xs text-muted">{formatDateTime(s.createdAt)}</span>
                    </div>
                    {s.description && <p className="mt-2 line-clamp-3 text-sm text-muted">{s.description}</p>}
                    {s.link && <div className="mt-2"><ExternalLinkChip href={s.link} /></div>}
                    {s.files?.length > 0 && <p className="mt-2 text-xs text-muted">{s.files.length} file{s.files.length > 1 ? 's' : ''} attached</p>}
                    <div className="mt-3"><Button size="sm" variant={s.status === 'pending' ? 'primary' : 'outline'} onClick={() => navigate(`/admin/submissions/${s._id}`)}>{s.status === 'pending' ? 'Review submission' : 'View details'}</Button></div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Feedback" description="Comments and review decisions for this task" />
            {feedback.length === 0 ? <EmptyState icon={MessageSquare} title="No feedback yet" className="py-8" /> : (
              <ul className="divide-y divide-border">
                {feedback.map((f) => (
                  <li key={f._id} className="flex gap-3 px-5 py-4">
                    <Avatar name={f.admin?.name} src={f.admin?.avatar} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium text-foreground">{f.admin?.name}</span><Badge variant={FB_VARIANT[f.type]} className="capitalize">{f.type}</Badge><span className="text-xs text-muted">{timeAgo(f.createdAt)}</span></div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{f.message}</p>
                      {f.rating ? <div className="mt-1.5"><StarRating value={f.rating} size="sm" /></div> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t border-border p-5"><FeedbackForm taskId={id} onSent={refetch} /></div>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardBody className="space-y-5">
              <div><p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Progress</p><ProgressBar value={task.progress} showLabel label="Task progress" /></div>
              <dl className="space-y-4 text-sm">
                <div className="flex items-start gap-3"><UserRound className="mt-0.5 h-4 w-4 text-muted" /><div><dt className="text-xs text-muted">Assigned to</dt>
                  <dd><Link to={`/admin/interns/${task.intern?._id}`} className="flex items-center gap-2 font-medium text-foreground hover:text-link"><Avatar name={task.intern?.name} src={task.intern?.avatar} size="xs" />{task.intern?.name}</Link></dd></div></div>
                <div className="flex items-start gap-3"><Tag className="mt-0.5 h-4 w-4 text-muted" /><div><dt className="text-xs text-muted">Category</dt><dd className="font-medium text-foreground">{task.category}</dd></div></div>
                <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 h-4 w-4 text-muted" /><div><dt className="text-xs text-muted">Start date</dt><dd className="font-medium text-foreground">{formatDate(task.startDate)}</dd></div></div>
                <div className="flex items-start gap-3"><Clock className="mt-0.5 h-4 w-4 text-muted" /><div><dt className="text-xs text-muted">Deadline</dt><dd className="font-medium text-foreground">{formatDateTime(task.deadline)}</dd><dd><DeadlineLabel deadline={task.deadline} status={task.status} /></dd></div></div>
                {task.completedAt && <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-success" /><div><dt className="text-xs text-muted">Completed</dt><dd className="font-medium text-foreground">{formatDateTime(task.completedAt)}</dd></div></div>}
                <div className="flex items-start gap-3"><ExternalLink className="mt-0.5 h-4 w-4 text-muted" /><div><dt className="text-xs text-muted">Assigned by</dt><dd className="font-medium text-foreground">{task.assignedBy?.name}</dd><dd className="text-xs text-muted">Created {formatDate(task.createdAt)}</dd></div></div>
              </dl>
            </CardBody>
          </Card>
        </aside>
      </div>

      {editing && <TaskFormModal task={task} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); refetch(); }} />}
      <ConfirmDialog open={deleting} onClose={() => setDeleting(false)} title="Delete task?" confirmLabel="Delete task"
        message="This permanently deletes the task together with its submissions and feedback."
        onConfirm={async () => { await taskService.remove(id); toast.success('Task deleted'); navigate('/admin/tasks', { replace: true }); }} />
    </>
  );
}
