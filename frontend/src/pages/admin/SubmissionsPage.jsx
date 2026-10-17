import { useNavigate } from 'react-router-dom';
import { Button, DataTable, PageHeader } from '../../components/ui';
import { FilterSelect, InternCell } from '../../components/common/Common';
import { SubmissionBadge } from '../../components/common/StatusBadges';
import { submissionService } from '../../services/submissionService';
import { internService } from '../../services/internService';
import useFetch from '../../hooks/useFetch';
import useQueryState from '../../hooks/useQueryState';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { timeAgo, formatDateTime } from '../../utils/format';
import { SUBMISSION_LABEL } from '../../utils/constants';
import { cn } from '../../utils/cn';

const DEFAULTS = { status: 'pending', intern: '', sort: 'createdAt:desc', page: '1' };
const TABS = [{ id: 'pending', label: 'Awaiting review' }, { id: '', label: 'All' }, { id: 'approved', label: 'Approved' }, { id: 'revision_requested', label: 'Revision requested' }, { id: 'rejected', label: 'Rejected' }];

export default function SubmissionsPage() {
  useDocumentTitle('Submissions');
  const navigate = useNavigate();
  const [params, setParams] = useQueryState(DEFAULTS);
  const page = Number(params.page) || 1;
  const [sortKey, sortDir] = params.sort.split(':');
  const tab = params.status === 'all' ? '' : params.status;

  const { data, loading, error, refetch } = useFetch(
    () => submissionService.list({ status: params.status === 'all' ? '' : params.status, intern: params.intern, sort: params.sort, page, limit: 10 }), [params.status, params.intern, params.sort, page]);
  const { data: interns } = useFetch(() => internService.list({ limit: 100, sort: 'name:asc' }), []);

  const columns = [
    { key: 'intern', header: 'Intern', render: (s) => <InternCell intern={s.intern} subtitle={s.intern?.department} /> },
    { key: 'task', header: 'Task', className: 'min-w-[200px]', render: (s) => <div className="min-w-0"><p className="truncate font-medium text-foreground">{s.task?.title}</p><p className="text-xs text-muted">{s.task?.category}</p></div> },
    { key: 'version', header: 'Version', sortable: true, render: (s) => <span className="tabular-nums">v{s.version}</span> },
    { key: 'createdAt', header: 'Submitted', sortable: true, render: (s) => <span title={formatDateTime(s.createdAt)} className="text-muted">{timeAgo(s.createdAt)}</span> },
    { key: 'status', header: 'Status', render: (s) => <SubmissionBadge status={s.status} /> },
    { key: 'action', header: <span className="sr-only">Action</span>, align: 'right', render: (s) => (
      <Button size="sm" variant={s.status === 'pending' ? 'primary' : 'outline'} onClick={(e) => { e.stopPropagation(); navigate(`/admin/submissions/${s._id}`); }}>{s.status === 'pending' ? 'Review' : 'View'}</Button>) },
  ];

  return (
    <>
      <PageHeader title="Submissions" description="Review submitted work, approve it or request changes." />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Submission status" className="flex flex-wrap gap-1 rounded-xl bg-subtle p-1">
          {TABS.map((t) => (
            <button key={t.label} role="tab" aria-selected={tab === t.id} onClick={() => setParams({ status: t.id || 'all' })}
              className={cn('rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', tab === t.id ? 'bg-surface text-foreground shadow-card' : 'text-muted hover:text-foreground')}>{t.label}</button>
          ))}
        </div>
        <FilterSelect label="Intern" value={params.intern} onChange={(v) => setParams({ intern: v })} options={(interns?.items || []).map((i) => ({ value: i._id, label: i.name }))} placeholder="All interns" />
      </div>
      <DataTable caption="Submissions" columns={columns} data={data?.items || []} loading={loading && !data} error={error} onRetry={refetch}
        sort={{ key: sortKey, dir: sortDir }} onSortChange={(k) => setParams({ sort: sortKey === k && sortDir === 'asc' ? `${k}:desc` : `${k}:asc` })}
        onRowClick={(s) => navigate(`/admin/submissions/${s._id}`)} pagination={data && data.pagination} onPageChange={(p) => setParams({ page: p })}
        empty={{ title: tab === 'pending' ? 'All caught up' : 'No submissions found', description: tab === 'pending' ? 'There is no work waiting for your review.' : `No ${SUBMISSION_LABEL[tab]?.toLowerCase() || ''} submissions to show.` }} />
    </>
  );
}
