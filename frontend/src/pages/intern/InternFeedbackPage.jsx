import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareText, Star } from 'lucide-react';
import { Avatar, Badge, Card, EmptyState, ErrorState, ListSkeleton, PageHeader, Pagination, StatCard, Tabs } from '../../components/ui';
import { StarRating } from '../../components/common/Common';
import { feedbackService } from '../../services/feedbackService';
import useFetch from '../../hooks/useFetch';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { timeAgo } from '../../utils/format';

const VARIANT = { approval: 'success', rejection: 'danger', revision: 'warning', general: 'info' };
const TABS = [{ id: 'all', label: 'All' }, { id: 'approval', label: 'Approvals' }, { id: 'revision', label: 'Revisions' }, { id: 'rejection', label: 'Rejections' }, { id: 'general', label: 'General' }];
const PAGE = 8;

export default function InternFeedbackPage() {
  useDocumentTitle('Feedback');
  const { data, loading, error, refetch } = useFetch(() => feedbackService.list({ limit: 100 }), []);
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);

  const items = data?.items || [];
  const stats = useMemo(() => {
    const rated = items.filter((f) => f.rating);
    return { total: items.length, avg: rated.length ? (rated.reduce((a, f) => a + f.rating, 0) / rated.length).toFixed(1) : '-', revisions: items.filter((f) => f.type === 'revision').length };
  }, [items]);
  const filtered = tab === 'all' ? items : items.filter((f) => f.type === tab);
  const shown = filtered.slice((page - 1) * PAGE, page * PAGE);

  if (error) return <Card><ErrorState message={error} onRetry={refetch} /></Card>;

  return (
    <>
      <PageHeader title="Feedback" description="Everything your mentors said about your work." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={MessageSquareText} label="Total feedback" value={loading ? '-' : stats.total} tone="primary" />
        <StatCard icon={Star} label="Average rating" value={loading ? '-' : stats.avg} tone="warning" />
        <StatCard icon={MessageSquareText} label="Revisions requested" value={loading ? '-' : stats.revisions} tone="info" />
      </div>
      <Tabs tabs={TABS} value={tab} onChange={(t) => { setTab(t); setPage(1); }} className="mb-4" />
      <Card>
        {loading ? <ListSkeleton /> : shown.length === 0 ? (
          <EmptyState icon={MessageSquareText} title="No feedback to show" description={tab === 'all' ? 'Feedback on your submissions will appear here.' : 'Nothing in this category yet.'} className="py-12" />
        ) : (
          <ul className="divide-y divide-border">
            {shown.map((f) => (
              <li key={f._id} className="flex gap-3 px-5 py-4">
                <Avatar name={f.admin?.name} src={f.admin?.avatar} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{f.admin?.name}</span>
                    <Badge variant={VARIANT[f.type] || 'info'} className="capitalize">{f.type}</Badge>
                    <span className="text-xs text-muted">{timeAgo(f.createdAt)}</span>
                  </div>
                  {f.task && <Link to={`/intern/tasks/${f.task._id}`} className="mt-1 block text-sm text-link hover:underline">{f.task.title}</Link>}
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{f.message}</p>
                  {f.rating ? <div className="mt-1.5"><StarRating value={f.rating} size="sm" /></div> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        {filtered.length > 0 && <Pagination page={page} pages={Math.ceil(filtered.length / PAGE)} total={filtered.length} limit={PAGE} onPageChange={setPage} />}
      </Card>
    </>
  );
}
