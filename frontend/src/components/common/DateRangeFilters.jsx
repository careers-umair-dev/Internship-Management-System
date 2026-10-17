import { DATE_PRESETS } from '../../utils/dates';
import { cn } from '../../utils/cn';

const GROUPS = [{ id: '', label: 'Auto' }, { id: 'day', label: 'Daily' }, { id: 'week', label: 'Weekly' }, { id: 'month', label: 'Monthly' }];

export default function DateRangeFilters({ preset, setPreset, custom, setCustom, groupBy, setGroupBy }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select aria-label="Date range" value={preset} onChange={(e) => setPreset(e.target.value)} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm">
        {DATE_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
      {preset === 'custom' && (
        <>
          <input type="date" aria-label="From date" value={custom.from} max={custom.to || undefined} onChange={(e) => setCustom({ ...custom, from: e.target.value })} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm" />
          <span className="text-muted">to</span>
          <input type="date" aria-label="To date" value={custom.to} min={custom.from || undefined} onChange={(e) => setCustom({ ...custom, to: e.target.value })} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm" />
        </>
      )}
      <div role="group" aria-label="Group trend by" className="flex rounded-lg bg-subtle p-1">
        {GROUPS.map((g) => (
          <button key={g.id} onClick={() => setGroupBy(g.id)} aria-pressed={groupBy === g.id}
            className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors', groupBy === g.id ? 'bg-surface text-foreground shadow-card' : 'text-muted hover:text-foreground')}>{g.label}</button>
        ))}
      </div>
    </div>
  );
}

