import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Printer, Users, ClipboardList, FileBarChart } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardBody, CardHeader, EmptyState, ErrorState, PageHeader, ProgressBar, Select } from '../../components/ui';
import { StarRating } from '../../components/common/Common';
import { PriorityBadge, StatusBadge } from '../../components/common/StatusBadges';
import { internService } from '../../services/internService';
import { reportService } from '../../services/reportService';
import { useToast } from '../../context/ToastContext';
import useFetch from '../../hooks/useFetch';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { PRIORITIES, STATUSES } from '../../utils/constants';
import { formatDate, formatDateTime, getErrorMessage } from '../../utils/format';

function useDownload() {
  const toast = useToast();
  const [busy, setBusy] = useState('');
  const run = async (key, fn) => {
    setBusy(key);
    try { await fn(); toast.success('Download started'); } catch (err) { toast.error(getErrorMessage(err)); } finally { setBusy(''); }
  };
  return [busy, run];
}

function ProgressReport({ internId }) {
  const [busy, run] = useDownload();
  const { data, loading, error, refetch } = useFetch(() => reportService.progress(internId), [internId]);
  if (error) return <Card><ErrorState message={error} onRetry={refetch} /></Card>;
  if (loading && !data) return <Card><div className="p-6"><div className="skeleton h-64 w-full" /></div></Card>;
  const { intern, stats, tasks, feedback, submissionCount } = data;

  return (
    <Card className="print:border-0 print:shadow-none">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold text-foreground">Progress report preview</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" leftIcon={Download} loading={busy === 'csv'} onClick={() => run('csv', () => reportService.progressCSV(internId))}>Download CSV</Button>
          <Button size="sm" leftIcon={Printer} onClick={() => window.print()}>Print / Save PDF</Button>
        </div>
      </div>
      <CardBody className="space-y-8">
        <header className="flex items-center gap-4">
          <Avatar name={intern.name} src={intern.avatar} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold text-foreground">{intern.name}</h2>
            <p className="text-sm text-muted">{[intern.position, intern.department].filter(Boolean).join(' - ')} - joined {formatDate(intern.joiningDate)}</p>
            <p className="text-xs text-muted">Mentor: {intern.mentor?.name || '-'} - Report generated {formatDateTime(data.generatedAt)}</p>
          </div>
          <div className="text-right"><p className="text-3xl font-semibold tabular-nums text-foreground">{intern.overallProgress}%</p><p className="text-xs text-muted">overall progress</p></div>
        </header>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[['Tasks', stats.total], ['Completed', stats.completed], ['In progress', stats.inProgress], ['Overdue', stats.overdue], ['Submissions', submissionCount]].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-subtle p-4"><dd className="text-2xl font-semibold tabular-nums text-foreground">{v}</dd><dt className="text-xs text-muted">{k}</dt></div>
          ))}
        </dl>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Tasks</h3>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-subtle/60 text-left text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-2.5">Task</th><th className="px-4 py-2.5">Priority</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5">Progress</th><th className="px-4 py-2.5">Deadline</th></tr></thead>
              <tbody className="divide-y divide-border">
                {tasks.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">No tasks assigned.</td></tr>}
                {tasks.map((t) => (
                  <tr key={t._id}><td className="px-4 py-2.5 font-medium text-foreground">{t.title}</td><td className="px-4 py-2.5"><PriorityBadge priority={t.priority} /></td><td className="px-4 py-2.5"><StatusBadge status={t.status} /></td>
                    <td className="min-w-[120px] px-4 py-2.5"><ProgressBar value={t.progress} size="sm" showLabel label={`${t.title} progress`} /></td><td className="px-4 py-2.5 text-muted">{formatDate(t.deadline)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Recent feedback</h3>
          {feedback.length === 0 ? <p className="text-sm text-muted">No feedback recorded.</p> : (
            <ul className="space-y-3">
              {feedback.slice(0, 8).map((f) => (
                <li key={f._id} className="rounded-xl border border-border p-4 text-sm">
                  <div className="flex items-center justify-between gap-3"><span className="font-medium text-foreground">{f.task?.title}</span><Badge variant="neutral" className="capitalize">{f.type}</Badge></div>
                  <p className="mt-1 text-muted">{f.message}</p>
                  <p className="mt-2 flex items-center gap-3 text-xs text-muted">{f.admin?.name} - {formatDate(f.createdAt)}{f.rating ? <StarRating value={f.rating} size="sm" /> : null}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardBody>
    </Card>
  );
}

export default function ReportsPage() {
  useDocumentTitle('Reports');
  const [sp, setSp] = useSearchParams();
  const internId = sp.get('intern') || '';
  const [busy, run] = useDownload();
  const [taskFilters, setTaskFilters] = useState({ status: '', priority: '', intern: '', deadlineFrom: '', deadlineTo: '' });
  const { data: interns } = useFetch(() => internService.list({ limit: 100, sort: 'name:asc' }), []);
  const internOptions = (interns?.items || []).map((i) => ({ value: i._id, label: i.name }));
  const setF = (k) => (e) => setTaskFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <PageHeader title="Reports" description="Export data to CSV and generate printable intern progress reports." />
      <div className="no-print mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Interns export" description="All interns with department, status, progress and task counts" />
          <CardBody className="flex items-center justify-between gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-link"><Users className="h-5 w-5" /></span>
            <p className="flex-1 text-sm text-muted">One row per intern, ready for Excel or Google Sheets.</p>
            <Button variant="outline" leftIcon={Download} loading={busy === 'interns'} onClick={() => run('interns', reportService.internsCSV)}>Download CSV</Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Tasks export" description="Filter the tasks you want in the file" />
          <CardBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Select label="Status" value={taskFilters.status} onChange={setF('status')} placeholder="All" options={STATUSES} />
              <Select label="Priority" value={taskFilters.priority} onChange={setF('priority')} placeholder="All" options={PRIORITIES} />
              <Select label="Intern" value={taskFilters.intern} onChange={setF('intern')} placeholder="All" options={internOptions} />
              <label className="space-y-1.5 text-sm font-medium text-foreground">Deadline from<input type="date" value={taskFilters.deadlineFrom} onChange={setF('deadlineFrom')} className="mt-1.5 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm font-normal" /></label>
              <label className="space-y-1.5 text-sm font-medium text-foreground">Deadline to<input type="date" value={taskFilters.deadlineTo} onChange={setF('deadlineTo')} className="mt-1.5 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm font-normal" /></label>
            </div>
            <Button variant="outline" leftIcon={ClipboardList} loading={busy === 'tasks'} onClick={() => run('tasks', () => reportService.tasksCSV(taskFilters))}>Download tasks CSV</Button>
          </CardBody>
        </Card>
      </div>

      <Card className="no-print mb-6">
        <CardHeader title="Intern progress report" description="Select an intern to preview a printable report" />
        <CardBody><Select label="Intern" wrapperClassName="max-w-sm" value={internId} onChange={(e) => setSp(e.target.value ? { intern: e.target.value } : {}, { replace: true })} placeholder="Select an intern" options={internOptions} /></CardBody>
      </Card>

      {internId ? <ProgressReport key={internId} internId={internId} /> : (
        <Card className="no-print"><EmptyState icon={FileBarChart} title="No intern selected" description="Choose an intern above to see their progress report." /></Card>
      )}
    </>
  );
}
