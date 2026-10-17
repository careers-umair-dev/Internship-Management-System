import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ClipboardList, Columns3, Download, LayoutList, SlidersHorizontal } from 'lucide-react';
import { Button, DataTable, PageHeader, ProgressBar } from '../../components/ui';
import { FilterSelect, SearchInput } from '../../components/common/Common';
import { DeadlineLabel, PriorityBadge, StatusBadge, TaskSubmissionBadge, canWorkOn } from '../../components/common/StatusBadges';
import InternTaskBoard from '../../components/tasks/InternTaskBoard';
import ProgressModal from '../../components/tasks/ProgressModal';
import { taskService } from '../../services/taskService';
import { reportService } from '../../services/reportService';
import { useToast } from '../../context/ToastContext';
import useFetch from '../../hooks/useFetch';
import useQueryState from '../../hooks/useQueryState';
import useDebouncedSearch from '../../hooks/useDebouncedSearch';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { PRIORITIES, STATUSES } from '../../utils/constants';
import { formatDate, getErrorMessage } from '../../utils/format';
import { cn } from '../../utils/cn';

const DEFAULTS = { search: '', status: '', priority: '', category: '', deadlineFrom: '', deadlineTo: '', overdue: '', sort: 'deadline:asc', page: '1', view: 'table' };
const LIMIT = 10;

export default function InternTasksPage() {
  useDocumentTitle('My tasks');
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams, clear] = useQueryState(DEFAULTS);
  const [search, setSearch] = useDebouncedSearch(params.search, (v) => setParams({ search: v }));
  const page = Number(params.page) || 1;
  const [sortKey, sortDir] = params.sort.split(':');
  const board = params.view === 'board';

  const filters = { search: params.search, status: params.status, priority: params.priority, category: params.category, deadlineFrom: params.deadlineFrom, deadlineTo: params.deadlineTo, overdue: params.overdue };
  const deps = Object.values(filters);

  const list = useFetch(() => taskService.list({ ...filters, sort: params.sort, page, limit: LIMIT }), [...deps, params.sort, page], { enabled: !board });
  const boardData = useFetch(() => taskService.board(filters), deps, { enabled: board });
  const { data: categories } = useFetch(() => taskService.categories(), []);

  const [updating, setUpdating] = useState(null);
  const [exporting, setExporting] = useState(false);
  const hasFilters = deps.some(Boolean);
  const refetch = () => (board ? boardData.refetch() : list.refetch());
  const onSort = (key) => setParams({ sort: sortKey === key && sortDir === 'asc' ? `${key}:desc` : `${key}:asc` });

  const exportCSV = async () => {
    setExporting(true);
    try { await reportService.tasksCSV(filters); } catch (err) { toast.error(getErrorMessage(err)); } finally { setExporting(false); }
  };

  const columns = [
    { key: 'title', header: 'Task', sortable: true, className: 'min-w-[220px]', render: (t) => (
      <div className="min-w-0"><p className="truncate font-medium text-foreground">{t.title}</p><div className="mt-0.5 flex items-center gap-2"><span className="truncate text-xs text-muted">{t.category}</span><TaskSubmissionBadge status={t.submissionStatus} /></div></div>) },
    { key: 'priorityRank', header: 'Priority', sortable: true, sortKey: 'priority', render: (t) => <PriorityBadge priority={t.priority} /> },
    { key: 'status', header: 'Status', sortable: true, render: (t) => <StatusBadge status={t.status} /> },
    { key: 'progress', header: 'Progress', sortable: true, className: 'min-w-[140px]', render: (t) => <ProgressBar value={t.progress} size="sm" showLabel label={`${t.title} progress`} /> },
    { key: 'deadline', header: 'Deadline', sortable: true, render: (t) => <div><p className="text-foreground">{formatDate(t.deadline)}</p><DeadlineLabel deadline={t.deadline} status={t.status} /></div> },
    { key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', render: (t) => (
      canWorkOn(t) ? <Button size="sm" variant="outline" leftIcon={SlidersHorizontal} aria-label={`Update progress for ${t.title}`} onClick={(e) => { e.stopPropagation(); setUpdating(t); }}>Update</Button> : null) },
  ];

  return (
    <>
      <PageHeader title="My tasks" description="Everything assigned to you, with deadlines and review status."
        actions={<>
          <div role="group" aria-label="View" className="flex rounded-lg bg-subtle p-1">
            {[['table', 'Table', LayoutList], ['board', 'Board', Columns3]].map(([id, label, Icon]) => (
              <button key={id} onClick={() => setParams({ view: id })} aria-pressed={params.view === id}
                className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors', params.view === id ? 'bg-surface text-foreground shadow-card' : 'text-muted hover:text-foreground')}><Icon className="h-3.5 w-3.5" />{label}</button>
            ))}
          </div>
          <Button variant="outline" leftIcon={Download} onClick={exportCSV} loading={exporting}>Export CSV</Button>
        </>} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search tasks" className="w-full sm:w-64" label="Search tasks" />
        <FilterSelect label="Status" value={params.status} onChange={(v) => setParams({ status: v })} options={STATUSES} placeholder="All statuses" />
        <FilterSelect label="Priority" value={params.priority} onChange={(v) => setParams({ priority: v })} options={PRIORITIES} placeholder="All priorities" />
        <FilterSelect label="Category" value={params.category} onChange={(v) => setParams({ category: v })} options={categories || []} placeholder="All categories" />
        <div className="flex items-center gap-2 text-sm text-muted">
          <input type="date" aria-label="Deadline from" value={params.deadlineFrom} max={params.deadlineTo || undefined} onChange={(e) => setParams({ deadlineFrom: e.target.value })} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground" />
          to
          <input type="date" aria-label="Deadline to" value={params.deadlineTo} min={params.deadlineFrom || undefined} onChange={(e) => setParams({ deadlineTo: e.target.value })} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground" />
        </div>
        <Button variant={params.overdue ? 'danger' : 'outline'} leftIcon={AlertTriangle} aria-pressed={!!params.overdue} onClick={() => setParams({ overdue: params.overdue ? '' : 'true' })}>Overdue only</Button>
        {hasFilters && <Button variant="ghost" size="sm" onClick={clear}>Clear filters</Button>}
      </div>

      {board ? (
        <>
          <InternTaskBoard board={boardData.data} loading={boardData.loading} onUpdate={setUpdating} />
          {boardData.error && <p role="alert" className="mt-4 text-sm text-danger">{boardData.error}</p>}
        </>
      ) : (
        <DataTable caption="My tasks" columns={columns} data={list.data?.items || []} loading={list.loading && !list.data} error={list.error} onRetry={list.refetch}
          rowClassName={(t) => (t.status === 'Overdue' ? 'bg-danger/[0.04]' : '')}
          sort={{ key: sortKey, dir: sortDir }} onSortChange={onSort} onRowClick={(t) => navigate(`/intern/tasks/${t._id}`)}
          pagination={list.data && list.data.pagination} onPageChange={(p) => setParams({ page: p })}
          empty={hasFilters ? { title: 'No tasks match your filters', description: 'Try adjusting or clearing the filters.', action: <Button variant="outline" onClick={clear}>Clear filters</Button> }
            : { title: 'No tasks assigned yet', description: 'When your mentor assigns work it will show up here.', icon: ClipboardList }} />
      )}

      {updating && <ProgressModal key={updating._id} task={updating} onClose={() => setUpdating(null)} onSaved={() => { setUpdating(null); refetch(); }} />}
    </>
  );
}
