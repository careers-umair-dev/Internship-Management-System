import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, PlayCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { Avatar, Dropdown, ProgressBar } from '../ui';
import { PriorityBadge, DeadlineLabel } from '../common/StatusBadges';
import { AttachmentCount } from '../common/Common';
import { cn } from '../../utils/cn';
import { STATUSES } from '../../utils/constants';

const COLUMN_DOT = { Pending: 'bg-muted', 'In Progress': 'bg-info', Completed: 'bg-success', Overdue: 'bg-danger' };

function TaskCard({ task, onEdit, onDelete, onMove }) {
  const navigate = useNavigate();
  const overdue = task.status === 'Overdue';
  return (
    <article draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', task._id); e.dataTransfer.effectAllowed = 'move'; }}
      className={cn('group cursor-grab rounded-xl border bg-surface p-3.5 shadow-card transition-shadow hover:shadow-pop active:cursor-grabbing', overdue ? 'border-danger/40' : 'border-border')}>
      <div className="flex items-start justify-between gap-2">
        <button onClick={() => navigate(`/admin/tasks/${task._id}`)} className="min-w-0 text-left text-sm font-medium text-foreground hover:text-link">
          <span className="line-clamp-2">{task.title}</span>
        </button>
        <Dropdown label={`Actions for ${task.title}`} items={[
          { label: 'Open', icon: Eye, onClick: () => navigate(`/admin/tasks/${task._id}`) },
          { label: 'Edit', icon: Pencil, onClick: () => onEdit(task) },
          ...(task.status !== 'In Progress' && task.status !== 'Completed' ? [{ label: 'Mark in progress', icon: PlayCircle, onClick: () => onMove(task, 'In Progress') }] : []),
          ...(task.status !== 'Completed' ? [{ label: 'Mark completed', icon: CheckCircle2, onClick: () => onMove(task, 'Completed') }] : []),
          { divider: true },
          { label: 'Delete', icon: Trash2, danger: true, onClick: () => onDelete(task) },
        ]} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2"><PriorityBadge priority={task.priority} /><span className="text-xs text-muted">{task.category}</span><AttachmentCount count={task.attachments?.length} /></div>
      <ProgressBar value={task.progress} size="sm" showLabel className="mt-3" label={`${task.title} progress`} />
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2"><Avatar name={task.intern?.name} src={task.intern?.avatar} size="xs" /><span className="truncate text-xs text-muted">{task.intern?.name}</span></div>
        <DeadlineLabel deadline={task.deadline} status={task.status} />
      </div>
    </article>
  );
}

// Kanban view: drag a card to another column to change its status
export default function TaskBoard({ board, loading, onMove, onEdit, onDelete }) {
  const [over, setOver] = useState(null);
  const find = (id) => Object.values(board || {}).flat().find((t) => t._id === id);

  const drop = (e, status) => {
    e.preventDefault(); setOver(null);
    const task = find(e.dataTransfer.getData('text/plain'));
    if (task && task.status !== status) onMove(task, status);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Task board">
      {STATUSES.map((status) => {
        const tasks = board?.[status] || [];
        return (
          <section key={status} aria-label={`${status} tasks`} onDragOver={(e) => { e.preventDefault(); setOver(status); }} onDragLeave={() => setOver((o) => (o === status ? null : o))} onDrop={(e) => drop(e, status)}
            className={cn('flex min-h-[220px] flex-col rounded-2xl border bg-subtle/50 p-3 transition-colors', over === status ? 'border-primary bg-primary/5' : 'border-border')}>
            <header className="mb-3 flex items-center gap-2 px-1">
              <span className={cn('h-2.5 w-2.5 rounded-full', COLUMN_DOT[status])} /><h3 className="text-sm font-semibold text-foreground">{status}</h3>
              <span className="ml-auto rounded-full bg-surface px-2 py-0.5 text-xs font-medium tabular-nums text-muted ring-1 ring-border">{tasks.length}</span>
            </header>
            <div className="flex-1 space-y-3">
              {loading && !board ? Array.from({ length: 2 }).map((_, i) => <div key={i} className="skeleton h-28 w-full rounded-xl" />) :
                tasks.length === 0 ? <p className="rounded-xl border border-dashed border-border py-8 text-center text-xs text-muted">Drop tasks here</p> :
                tasks.map((t) => <TaskCard key={t._id} task={t} onEdit={onEdit} onDelete={onDelete} onMove={onMove} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
