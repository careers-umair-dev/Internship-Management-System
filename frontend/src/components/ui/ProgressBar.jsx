import { cn } from '../../utils/cn';

const toneFor = (v) => (v >= 100 ? 'bg-success' : v >= 60 ? 'bg-primary' : v >= 30 ? 'bg-info' : 'bg-warning');

export default function ProgressBar({ value = 0, showLabel = false, size = 'md', tone, className, label = 'Progress' }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
        className={cn('w-full overflow-hidden rounded-full bg-subtle', size === 'sm' ? 'h-1.5' : 'h-2.5')}>
        <div className={cn('h-full rounded-full transition-all duration-500', tone || toneFor(pct))} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className="w-10 text-right text-xs font-medium tabular-nums text-muted">{pct}%</span>}
    </div>
  );
}

export function ProgressRing({ value = 0, size = 112, stroke = 10, label }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}
      role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label || 'Overall progress'}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-subtle" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} className="stroke-primary transition-all duration-700" />
      </svg>
      <span className="absolute text-xl font-semibold tabular-nums text-foreground">{pct}%</span>
    </div>
  );
}
