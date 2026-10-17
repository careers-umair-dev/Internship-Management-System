import { useNavigate } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import { Button, DataTable, PageHeader, Tabs } from '../../components/ui';
import { SubmissionBadge } from '../../components/common/StatusBadges';
import { submissionService } from '../../services/submissionService';
import useFetch from '../../hooks/useFetch';
import useQueryState from '../../hooks/useQueryState';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { formatDateTime, timeAgo } from '../../utils/format';

const DEFAULTS = { status: 'all', sort: 'createdAt:desc', page: '1' };
const TABS = [{ id: 'all', label: 'All' }, { id: 'pending', label: 'Awaiting review' }, { id: 'approved', label: 'Approved' }, { id: 'revision_requested', label: 'Revision requested' }, { id: 'rejected', label: 'Rejected' }];

export default function InternSubmissionsPage() {
  useDocumentTitle('Submissions');
  const navigate = useNavigate();
  const [params, setParams] = useQueryState(DEFAULTS);
  const page = Number(params.page) || 1;
  const [sortKey, sortDir] = params.sort.split(':');
  const status = params.status === 'all' ? '' : params.status;

  const { data, loading, error, refetch } = useFetch(() => submissionService.list({ status, sort: params.sort, page, limit: 10 }), [status, params.sort, page]);
  const onSort = (key) => setParams({ sort: sortKey === key && sortDir === 'asc' ? `${key}:desc` : `${key}:asc` });
  const open = (s) => navigate(`/intern/tasks/${s.task?._id}${['revision_requested', 'rejected'].includes(s.status) ? '#submit' : ''}`);

  const columns = [
    { key: 'task', header: 'Task', className: 'min-w-[220px]', render: (s) => <div className="min-w-0"><p className="truncate font-medium text-foreground">{s.task?.title}</p><p className="text-xs text-muted">{s.task?.category}</p></div> },
    { key: 'version', header: 'Version', sortable: true, render: (s) => <span className="tabular-nums">v{s.version}</span> },
    { key: 'createdAt', header: 'Submitted', sortable: true, render: (s) => <span title={formatDateTime(s.createdAt)} className="text-muted">{timeAgo(s.createdAt)}</span> },
    { key: 'status', header: 'Status', render: (s) => <SubmissionBadge status={s.status} /> },
    { key: 'action', header: <span className="sr-only">Action</span>, align: 'right', render: (s) => (
      <Button size="sm" variant={['revision_requested', 'rejected'].includes(s.status) ? 'primary' : 'outline'} onClick={(e) => { e.stopPropagation(); open(s); }}>
        {['revision_requested', 'rejected'].includes(s.status) ? 'Resubmit' : 'View'}</Button>) },
  ];

  return (
    <>
      <PageHeader title="Submissions" description="Track the work you handed in and how it was reviewed." />
      <Tabs tabs={TABS} value={params.status} onChange={(v) => setParams({ status: v })} className="mb-4" />
      <DataTable caption="My submissions" columns={columns} data={data?.items || []} loading={loading && !data} error={error} onRetry={refetch}
        sort={{ key: sortKey, dir: sortDir }} onSortChange={onSort} onRowClick={open}
        pagination={data?.pagination} onPageChange={(p) => setParams({ page: p })}
        empty={{ title: 'No submissions here', description: status ? 'Nothing matches this filter yet.' : 'Submit work from one of your tasks and it will appear here.', icon: Inbox }} />
    </>
  );
}
