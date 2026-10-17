import { cn } from '../../utils/cn';
import { Card } from './Card';

export function Skeleton({ className }) {
  return <div aria-hidden="true" className={cn('skeleton h-4 w-full', className)} />;
}

export function StatCardSkeleton() {
  return (
    <Card className="p-5">
      <Skeleton className="h-9 w-9 rounded-lg" />
      <Skeleton className="mt-4 h-7 w-16" />
      <Skeleton className="mt-2 h-3 w-24" />
    </Card>
  );
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-4 p-5" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-2/3" /><Skeleton className="h-3 w-1/3" /></div>
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading page">
      <div className="space-y-2"><Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-72" /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}</div>
      <Card><ListSkeleton /></Card>
    </div>
  );
}
