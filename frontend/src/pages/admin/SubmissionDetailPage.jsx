import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, MessageSquare, CheckCircle2, Clock } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardBody, CardHeader, EmptyState, ErrorState, PageSkeleton } from '../../components/ui';
import { AttachmentList, ExternalLinkChip, InternCell, StarRating } from '../../components/common/Common';
import { DeadlineLabel, PriorityBadge, SubmissionBadge } from '../../components/common/StatusBadges';
import ReviewForm from '../../components/forms/ReviewForm';
import { submissionService } from '../../services/submissionService';
import useFetch from '../../hooks/useFetch';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { formatDateTime, timeAgo } from '../../utils/format';

const FB_VARIANT = { approval: 'success', rejection: 'danger', revision: 'warning', general: 'info' };

export default function SubmissionDetailPage() {
  const { id } = useParams();
  const { data, loading, error, refetch } = useFetch(() => submissionService.get(id), [id]);
  const versions = useFetch(() => submissionService.list({ task: data.submission.task._id, sort: 'version:desc', limit: 20 }), [data?.submission?.task?._id], { enabled: !!data });
  useDocumentTitle(data ? `Review: ${data.submission.task?.title}` : 'Submission');

  if (error) return <Card><ErrorState message={error} onRetry={refetch} /></Card>;
  if (loading && !data) return <PageSkeleton />;
  const { submission: s, feedback } = data;
  const pending = s.status === 'pending';
  const done = () => { refetch(); versions.refetch(); };

  return (
    <>
      <Link to="/admin/submissions" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"><ArrowLeft className="h-4 w-4" />All submissions</Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{s.task?.title}</h1>
        <Badge variant="neutral">Version {s.version}</Badge><SubmissionBadge status={s.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Submitted work" description={`Submitted ${formatDateTime(s.createdAt)}`} />
            <CardBody className="space-y-6">
              <section><h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Description</h3>
                {s.description ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{s.description}</p> : <p className="text-sm text-muted">No description provided.</p>}</section>
              <section><h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">External link</h3>
                {s.link ? <ExternalLinkChip href={s.link} /> : <p className="text-sm text-muted">No link provided.</p>}</section>
              <section><h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Files</h3>
                <AttachmentList files={s.files} emptyText="No files uploaded." /></section>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Review feedback" description="Decisions and comments on this version" />
            {feedback.length === 0 ? <EmptyState icon={MessageSquare} title="Not reviewed yet" description="Feedback appears here after the review." className="py-10" /> : (
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
            <CardHeader title={pending ? 'Review this submission' : 'Review outcome'} />
            <CardBody>
              {pending ? <ReviewForm submission={s} onReviewed={done} /> : (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted" /><SubmissionBadge status={s.status} /></div>
                  <p className="text-muted">Reviewed by <b className="text-foreground">{s.reviewedBy?.name || 'an admin'}</b> {s.reviewedAt && timeAgo(s.reviewedAt)}.</p>
                  <p className="text-xs text-muted">This version is final. If a revision was requested, the intern will submit a new version.</p>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-4">
              <InternCell intern={s.intern} subtitle={s.intern?.department} size="md" />
              <div className="border-t border-border pt-4 text-sm">
                <Link to={`/admin/tasks/${s.task?._id}`} className="font-medium text-link hover:underline">Open task</Link>
                <div className="mt-3 flex flex-wrap items-center gap-2"><PriorityBadge priority={s.task?.priority} /><DeadlineLabel deadline={s.task?.deadline} status={s.task?.status} /></div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Version history" />
            {!versions.data ? <div className="p-5"><div className="skeleton h-16 w-full" /></div> : (
              <ul className="divide-y divide-border">
                {versions.data.items.map((v) => (
                  <li key={v._id}>
                    <Link to={`/admin/submissions/${v._id}`} aria-current={v._id === s._id ? 'page' : undefined} className="flex items-center justify-between gap-3 px-5 py-3 text-sm transition-colors hover:bg-subtle/60 aria-[current=page]:bg-primary/5">
                      <span className="flex items-center gap-2 font-medium text-foreground"><FileText className="h-4 w-4 text-muted" />v{v.version}</span>
                      <span className="flex items-center gap-2"><span className="flex items-center gap-1 text-xs text-muted"><Clock className="h-3 w-3" />{timeAgo(v.createdAt)}</span><SubmissionBadge status={v.status} /></span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
