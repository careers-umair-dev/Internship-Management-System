import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import { Button, ProgressBar } from '../ui';
import { DeadlineLabel, PriorityBadge, TaskSubmissionBadge, canWorkOn } from '../common/StatusBadges';
import { AttachmentCount } from '../common/Common';
import { cn } from '../../utils/cn';
import { STATUSES } from '../../utils/constants';

const DOT = { Pending: 'bg-muted', 'In Progress': 'bg-info', Completed: 'bg-success', Overdue: 'bg-danger' };

function Card({ task, onUpdate }) {
  const navigate = useNavigate();
  return (
    <article className={cn('rounded-xl border bg-surface p-3.5 shadow-card transition-shadow hover:shadow-pop', task.status === 'Overdue' ? 'border-danger/40' : 'border-border')}>
      <button onClick={() => navigate(`/intern/tasks/${task._id}`)} className="text-left text-sm font-medium text-foreground hover:text-link"><span className="line-clamp-2">{task.title}</span></button>
      <div className="mt-2 flex flex-wrap items-center gap-2"><PriorityBadge priority={task.priority} /><AttachmentCount count={task.attachments?.length} /><TaskSubmissionBadge status={task.submissionStatus} /></div>
      <ProgressBar value={task.progress} size="sm" showLabel className="mt-3" label={`${task.title} progress`} />
      <div className="mt-3 flex items-center justify-between gap-2">
        <DeadlineLabel deadline={task.deadline} status={task.status} />
        {canWorkOn(task) && <Button size="sm" variant="ghost" leftIcon={SlidersHorizontal} onClick={() => onUpdate(task)} aria-label={`Update progress for ${task.title}`}>Update</Button>}
      </div>
    </article>
  );
}

// Card board grouped by status (progress is changed via the Update action)
export default function InternTaskBoard({ board, loading, onUpdate }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Task board">
      {STATUSES.map((status) => {
        const tasks = board?.[status] || [];
        return (
          <section key={status} aria-label={`${status} tasks`} className="flex min-h-[200px] flex-col rounded-2xl border border-border bg-subtle/50 p-3">
            <header className="mb-3 flex items-center gap-2 px-1"><span className={cn('h-2.5 w-2.5 rounded-full', DOT[status])} /><h3 className="text-sm font-semibold text-foreground">{status}</h3>
              <span className="ml-auto rounded-full bg-surface px-2 py-0.5 text-xs font-medium tabular-nums text-muted ring-1 ring-border">{tasks.length}</span></header>
            <div className="flex-1 space-y-3">
              {loading && !board ? Array.from({ length: 2 }).map((_, i) => <div key={i} className="skeleton h-28 w-full rounded-xl" />)
                : tasks.length === 0 ? <p className="rounded-xl border border-dashed border-border py-8 text-center text-xs text-muted">No tasks</p>
                : tasks.map((t) => <Card key={t._id} task={t} onUpdate={onUpdate} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
