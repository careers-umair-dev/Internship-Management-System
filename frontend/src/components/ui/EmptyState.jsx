import { Inbox, AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';
import { cn } from '../../utils/cn';

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-subtle text-muted"><Icon className="h-6 w-6" /></div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong while loading this.', onRetry, className }) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger"><AlertTriangle className="h-6 w-6" /></div>
      <h3 className="text-sm font-semibold text-foreground">Couldn't load data</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>
      {onRetry && <Button variant="outline" size="sm" className="mt-5" leftIcon={RefreshCw} onClick={onRetry}>Try again</Button>}
    </div>
  );
}
