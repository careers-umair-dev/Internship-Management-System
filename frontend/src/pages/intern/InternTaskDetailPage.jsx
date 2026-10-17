import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, CalendarDays, CheckCircle2, Clock, Hourglass, MessageSquare, PlayCircle, RotateCcw, SlidersHorizontal, Tag, UserRound, XCircle } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardBody, CardHeader, EmptyState, ErrorState, PageSkeleton, ProgressBar } from '../../components/ui';
import { AttachmentList, ExternalLinkChip, StarRating } from '../../components/common/Common';
import { DeadlineLabel, PriorityBadge, StatusBadge, SubmissionBadge, canWorkOn } from '../../components/common/StatusBadges';
import SubmissionForm from '../../components/forms/SubmissionForm';
import ProgressModal from '../../components/tasks/ProgressModal';
import { taskService } from '../../services/taskService';
import { useToast } from '../../context/ToastContext';
import useFetch from '../../hooks/useFetch';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { formatDate, formatDateTime, getErrorMessage, timeAgo } from '../../utils/format';

const FB_VARIANT = { approval: 'success', rejection: 'danger', revision: 'warning', general: 'info' };
const BANNERS = {
  completed: { icon: CheckCircle2, tone: 'border-success/30 bg-success/10 text-success', title: 'Task completed', text: 'Your work was approved. Great job!' },
  pending_review: { icon: Hourglass, tone: 'border-warning/30 bg-warning/10 text-warning', title: 'Awaiting review', text: 'Your submission is with your mentor. You will be notified once it is reviewed.' },
  revision_requested: { icon: RotateCcw, tone: 'border-info/30 bg-info/10 text-info', title: 'Revision requested', text: 'Your mentor asked for changes. Read the feedback below and submit a new version.' },
  rejected: { icon: XCircle, tone: 'border-danger/30 bg-danger/10 text-danger', title: 'Submission rejected', text: 'Review the feedback below and submit new work.' },
};

export default function InternTaskDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const { data, loading, error, refetch } = useFetch(() => taskService.get(id), [id]);
  const [updating, setUpdating] = useState(false);
  const [starting, setStarting] = useState(false);
  useDocumentTitle(data?.task?.title || 'Task');

  if (error) return <Card><ErrorState message={error} onRetry={refetch} /></Card>;
  if (loading && !data) return <PageSkeleton />;
  const { task, submissions, feedback } = data;
  const open = canWorkOn(task);
  const bannerKey = task.status === 'Completed' ? 'completed' : task.submissionStatus;
  const banner = BANNERS[bannerKey];
  const nextVersion = (submissions[0]?.version || 0) + 1;

  const start = async () => {
    setStarting(true);
    try { await taskService.updateProgress(id, { status: 'In Progress' }); toast.success('Task started'); refetch(); }
    catch (err) { toast.error(getErrorMessage(err)); } finally { setStarting(false); }
  };

  return (
    <>
      <Link to="/intern/tasks" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"><ArrowLeft className="h-4 w-4" />All tasks</Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><StatusBadge status={task.status} /><PriorityBadge priority={task.priority} /></div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{task.title}</h1>
        </div>
        {open && (
          <div className="flex shrink-0 gap-2">
            {task.status === 'Pending' && <Button variant="outline" leftIcon={PlayCircle} loading={starting} onClick={start}>Start task</Button>}
            <Button variant="outline" leftIcon={SlidersHorizontal} onClick={() => setUpdating(true)}>Update progress</Button>
          </div>
        )}
      </div>

      {banner && (
        <div role="status" className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 ${banner.tone}`}>
          <banner.icon className="mt-0.5 h-5 w-5 shrink-0" />
          <div><p className="text-sm font-semibold">{banner.title}</p><p className="text-sm opacity-90">{banner.text}</p></div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Description" />
            <CardBody>{task.description ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{task.description}</p> : <p className="text-sm text-muted">No description provided.</p>}</CardBody>
            {task.attachments?.length > 0 && <div className="border-t border-border p-5"><p className="mb-3 text-sm font-medium text-foreground">Resources</p><AttachmentList files={task.attachments} /></div>}
          </Card>

          {open && (
            <Card id="submit">
              <CardHeader title={nextVersion > 1 ? 'Submit a revision' : 'Submit your work'} description="Describe what you did, add a link and/or upload files." />
              <CardBody><SubmissionForm taskId={id} version={nextVersion} onSubmitted={refetch} /></CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Submission history" description={`${submissions.length} submission${submissions.length === 1 ? '' : 's'}`} />
            {submissions.length === 0 ? <EmptyState icon={Clock} title="Nothing submitted yet" description="Your submissions and their review status will show up here." className="py-10" /> : (
              <ul className="divide-y divide-border">
                {submissions.map((s) => (
                  <li key={s._id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2"><span className="text-sm font-semibold text-foreground">Version {s.version}</span><SubmissionBadge status={s.status} /></div>
                      <span className="text-xs text-muted">{formatDateTime(s.createdAt)}</span>
                    </div>
                    {s.description && <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{s.description}</p>}
                    {s.link && <div className="mt-2"><ExternalLinkChip href={s.link} /></div>}
                    {s.files?.length > 0 && <div className="mt-3"><AttachmentList files={s.files} /></div>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Feedback" description="Comments and review decisions from your mentor" />
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
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardBody className="space-y-5">
              <div><p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Progress</p><ProgressBar value={task.progress} showLabel label="Task progress" /></div>
              <dl className="space-y-4 text-sm">
                <div className="flex items-start gap-3"><Tag className="mt-0.5 h-4 w-4 text-muted" /><div><dt className="text-xs text-muted">Category</dt><dd className="font-medium text-foreground">{task.category}</dd></div></div>
                <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 h-4 w-4 text-muted" /><div><dt className="text-xs text-muted">Start date</dt><dd className="font-medium text-foreground">{formatDate(task.startDate)}</dd></div></div>
                <div className="flex items-start gap-3"><Clock className="mt-0.5 h-4 w-4 text-muted" /><div><dt className="text-xs text-muted">Deadline</dt><dd className="font-medium text-foreground">{formatDateTime(task.deadline)}</dd><dd><DeadlineLabel deadline={task.deadline} status={task.status} /></dd></div></div>
                {task.completedAt && <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-success" /><div><dt className="text-xs text-muted">Completed</dt><dd className="font-medium text-foreground">{formatDateTime(task.completedAt)}</dd></div></div>}
                <div className="flex items-start gap-3"><UserRound className="mt-0.5 h-4 w-4 text-muted" /><div><dt className="text-xs text-muted">Assigned by</dt><dd className="font-medium text-foreground">{task.assignedBy?.name}</dd></div></div>
              </dl>
            </CardBody>
          </Card>
        </aside>
      </div>

      {updating && <ProgressModal task={task} onClose={() => setUpdating(false)} onSaved={() => { setUpdating(false); refetch(); }} />}
    </>
  );
}
