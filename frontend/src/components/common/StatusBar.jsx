import { cn } from '../../utils/cn';

const SEGMENT = { Completed: 'bg-success', 'In Progress': 'bg-info', Pending: 'bg-muted/60', Overdue: 'bg-danger' };

export default function StatusBar({ breakdown = [] }) {
  const total = breakdown.reduce((n, b) => n + b.value, 0);
  if (!total) return <p className="text-sm text-muted">No tasks yet.</p>;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-subtle" role="img" aria-label="Task status distribution">
        {breakdown.filter((b) => b.value).map((b) => <div key={b.name} className={cn('h-full transition-all', SEGMENT[b.name])} style={{ width: `${(b.value / total) * 100}%` }} title={`${b.name}: ${b.value}`} />)}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {breakdown.map((b) => (
          <li key={b.name} className="flex items-center gap-2 text-sm">
            <span className={cn('h-2.5 w-2.5 rounded-full', SEGMENT[b.name])} /><span className="text-muted">{b.name}</span>
            <span className="ml-auto font-medium tabular-nums text-foreground">{b.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

