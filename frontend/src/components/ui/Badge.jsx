import { cn } from '../../utils/cn';

const VARIANTS = {
  neutral: 'bg-subtle text-muted ring-border',
  primary: 'bg-primary/10 text-link ring-primary/20',
  success: 'bg-success/10 text-success ring-success/20',
  warning: 'bg-warning/10 text-warning ring-warning/25',
  danger: 'bg-danger/10 text-danger ring-danger/20',
  info: 'bg-info/10 text-info ring-info/20',
};
const DOTS = { neutral: 'bg-muted', primary: 'bg-link', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger', info: 'bg-info' };

export default function Badge({ variant = 'neutral', dot = false, className, children }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', VARIANTS[variant], className)}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', DOTS[variant])} />}
      {children}
    </span>
  );
}
