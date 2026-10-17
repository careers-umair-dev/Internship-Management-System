import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function Spinner({ className, label = 'Loading' }) {
  return <Loader2 role="status" aria-label={label} className={cn('h-5 w-5 animate-spin text-muted', className)} />;
}
