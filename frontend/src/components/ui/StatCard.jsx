import { Card } from './Card';
import { cn } from '../../utils/cn';

const TONES = {
  primary: 'bg-primary/10 text-link',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
  neutral: 'bg-subtle text-muted',
};

export default function StatCard({ icon: Icon, label, value, hint, tone = 'primary', className }) {
  return (
    <Card className={cn('p-5 transition-shadow hover:shadow-pop', className)}>
      <div className="flex items-center justify-between">
        {Icon && <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', TONES[tone])}><Icon className="h-[18px] w-[18px]" /></div>}
      </div>
      <p className="mt-4 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      <p className="mt-0.5 text-sm text-muted">{label}</p>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </Card>
  );
}
