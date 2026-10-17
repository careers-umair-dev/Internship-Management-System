import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, Eye, Pencil, ClipboardPlus, UserX, UserCheck, Trash2, Copy, Check, KeyRound } from 'lucide-react';
import { Button, ConfirmDialog, DataTable, Dropdown, Modal, PageHeader, ProgressBar, Badge } from '../../components/ui';
import { FilterSelect, InternCell, SearchInput } from '../../components/common/Common';
import InternFormModal from '../../components/forms/InternFormModal';
import TaskFormModal from '../../components/forms/TaskFormModal';
import { internService } from '../../services/internService';
import { reportService } from '../../services/reportService';
import { useToast } from '../../context/ToastContext';
import useFetch from '../../hooks/useFetch';
import useQueryState from '../../hooks/useQueryState';
import useDebouncedSearch from '../../hooks/useDebouncedSearch';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { formatDate, getErrorMessage } from '../../utils/format';

const DEFAULTS = { search: '', status: '', department: '', sort: 'createdAt:desc', page: '1' };
const STATUS_VARIANT = { active: 'success', inactive: 'neutral', completed: 'info' };
const LIMIT = 10;

export function CredentialsDialog({ info, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!info) return null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(`Email: ${info.email}\nTemporary password: ${info.password}`); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard unavailable */ }
  };
  return (
    <Modal open onClose={onClose} size="sm" title="Intern account created" description="Share these sign-in details. The password is shown only once."
      footer={<><Button variant="outline" leftIcon={copied ? Check : Copy} onClick={copy}>{copied ? 'Copied' : 'Copy details'}</Button><Button onClick={onClose}>Done</Button></>}>
      <div className="space-y-3 rounded-xl bg-subtle p-4 text-sm">
        <div><p className="text-xs text-muted">Email</p><p className="font-medium text-foreground">{info.email}</p></div>
        <div><p className="flex items-center gap-1.5 text-xs text-muted"><KeyRound className="h-3 w-3" />Temporary password</p><p className="select-all font-mono text-base font-semibold text-foreground">{info.password}</p></div>
      </div>
      <p className="mt-3 text-xs text-muted">Ask the intern to change it from Settings after their first sign-in.</p>
    </Modal>
  );
}

export default function InternsPage() {
  useDocumentTitle('Interns');
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams, clear] = useQueryState(DEFAULTS);
  const [search, setSearch] = useDebouncedSearch(params.search, (v) => setParams({ search: v }));
  const page = Number(params.page) || 1;
  const [sortKey, sortDir] = params.sort.split(':');

  const { data, loading, error, refetch } = useFetch(
    () => internService.list({ search: params.search, status: params.status, department: params.department, sort: params.sort, page, limit: LIMIT }),
    [params.search, params.status, params.department, params.sort, page]
  );
  const { data: departments } = useFetch(() => internService.departments(), []);

  const [form, setForm] = useState(undefined); // undefined = closed, null = create, object = edit
  const [assignTo, setAssignTo] = useState(null);
  const [confirm, setConfirm] = useState(null); // { kind, intern }
  const [credentials, setCredentials] = useState(null);
  const [exporting, setExporting] = useState(false);

  const onSort = (key) => setParams({ sort: sortKey === key && sortDir === 'asc' ? `${key}:desc` : `${key}:asc` });
  const hasFilters = params.search || params.status || params.department;

  const exportCSV = async () => {
    setExporting(true);
    try { await reportService.internsCSV(); } catch (err) { toast.error(getErrorMessage(err)); } finally { setExporting(false); }
  };

  const runConfirm = async () => {
    const { kind, intern } = confirm;
    if (kind === 'activate') await internService.update(intern._id, { status: 'active' });
    else await internService.remove(intern._id, kind === 'delete');
    toast.success({ activate: `${intern.name} reactivated`, deactivate: `${intern.name} deactivated`, delete: `${intern.name} deleted` }[kind]);
    refetch();
  };

  const CONFIRM = {
    deactivate: { title: 'Deactivate intern?', label: 'Deactivate', msg: (i) => `${i.name} will no longer be able to sign in or receive new tasks. Their data is kept and you can reactivate them anytime.` },
    activate: { title: 'Reactivate intern?', label: 'Reactivate', msg: (i) => `${i.name} will be able to sign in and receive tasks again.` },
    delete: { title: 'Delete permanently?', label: 'Delete permanently', msg: (i) => `This permanently deletes ${i.name} together with all their tasks, submissions, feedback and notifications. This cannot be undone.` },
  };

  const columns = [
    { key: 'name', header: 'Intern', sortable: true, render: (i) => <InternCell intern={i} /> },
    { key: 'department', header: 'Department', sortable: true, render: (i) => <div><p className="text-foreground">{i.department || '-'}</p><p className="text-xs text-muted">{i.position}</p></div> },
    { key: 'status', header: 'Status', render: (i) => <Badge variant={STATUS_VARIANT[i.status]} dot className="capitalize">{i.status}</Badge> },
    { key: 'overallProgress', header: 'Progress', sortable: true, className: 'min-w-[150px]', render: (i) => <ProgressBar value={i.overallProgress} showLabel size="sm" label={`${i.name} progress`} /> },
    { key: 'tasks', header: 'Tasks', render: (i) => (
      <div className="text-sm"><span className="font-medium tabular-nums text-foreground">{i.taskCounts.completed}/{i.taskCounts.total}</span>
        {i.taskCounts.overdue > 0 && <span className="ml-2 text-xs font-medium text-danger">{i.taskCounts.overdue} overdue</span>}</div>) },
    { key: 'joiningDate', header: 'Joined', sortable: true, render: (i) => <span className="text-muted">{formatDate(i.joiningDate)}</span> },
    { key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', render: (i) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Dropdown label={`Actions for ${i.name}`} items={[
          { label: 'View profile', icon: Eye, onClick: () => navigate(`/admin/interns/${i._id}`) },
          { label: 'Edit', icon: Pencil, onClick: () => setForm(i) },
          { label: 'Assign task', icon: ClipboardPlus, onClick: () => setAssignTo(i._id), disabled: i.status !== 'active' },
          { divider: true },
          i.status === 'active' ? { label: 'Deactivate', icon: UserX, onClick: () => setConfirm({ kind: 'deactivate', intern: i }) }
            : { label: 'Reactivate', icon: UserCheck, onClick: () => setConfirm({ kind: 'activate', intern: i }) },
          { label: 'Delete permanently', icon: Trash2, danger: true, onClick: () => setConfirm({ kind: 'delete', intern: i }) },
        ]} />
      </div>) },
  ];

  const cfg = confirm && CONFIRM[confirm.kind];
  return (
    <>
      <PageHeader title="Interns" description="Onboard interns, manage their profiles and track their progress."
        actions={<><Button variant="outline" leftIcon={Download} onClick={exportCSV} loading={exporting}>Export CSV</Button><Button leftIcon={Plus} onClick={() => setForm(null)}>Add intern</Button></>} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email or department" className="w-full sm:w-80" label="Search interns" />
        <FilterSelect label="Status" value={params.status} onChange={(v) => setParams({ status: v })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'completed', label: 'Completed' }]} placeholder="All statuses" />
        <FilterSelect label="Department" value={params.department} onChange={(v) => setParams({ department: v })} options={departments || []} placeholder="All departments" />
        {hasFilters && <Button variant="ghost" size="sm" onClick={clear}>Clear filters</Button>}
      </div>

      <DataTable caption="Interns" columns={columns} data={data?.items || []} loading={loading && !data} error={error} onRetry={refetch}
        sort={{ key: sortKey, dir: sortDir }} onSortChange={onSort} onRowClick={(i) => navigate(`/admin/interns/${i._id}`)}
        pagination={data && { ...data.pagination }} onPageChange={(p) => setParams({ page: p })}
        empty={hasFilters ? { title: 'No interns match your filters', description: 'Try a different search or clear the filters.', action: <Button variant="outline" onClick={clear}>Clear filters</Button> }
          : { title: 'No interns yet', description: 'Add your first intern to get started.', action: <Button leftIcon={Plus} onClick={() => setForm(null)}>Add intern</Button> }} />

      {form !== undefined && (
        <InternFormModal key={form?._id || 'new'} intern={form} departments={departments || []} onClose={() => setForm(undefined)}
          onSaved={(res) => { setForm(undefined); refetch(); if (res.temporaryPassword) setCredentials({ email: res.intern.email, password: res.temporaryPassword }); }} />
      )}
      {assignTo && <TaskFormModal defaultIntern={assignTo} onClose={() => setAssignTo(null)} onSaved={() => { setAssignTo(null); refetch(); }} />}
      <CredentialsDialog info={credentials} onClose={() => setCredentials(null)} />
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={runConfirm} title={cfg?.title} confirmLabel={cfg?.label}
        variant={confirm?.kind === 'activate' ? 'primary' : 'danger'} message={confirm && cfg.msg(confirm.intern)} />
    </>
  );
}
