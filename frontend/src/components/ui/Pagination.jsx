import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';
import { cn } from '../../utils/cn';

const pageList = (page, pages) => {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages, page, page - 1, page + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  return nums.flatMap((n, i) => (i && n - nums[i - 1] > 1 ? ['...', n] : [n]));
};

export default function Pagination({ page, pages, total, limit, onPageChange }) {
  if (!total) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
      <p className="text-xs text-muted">Showing <b className="font-medium text-foreground">{from}-{to}</b> of <b className="font-medium text-foreground">{total}</b></p>
      {pages > 1 && (
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <Button variant="ghost" size="icon" aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          {pageList(page, pages).map((n, i) => n === '...' ? <span key={`e${i}`} className="px-1 text-muted">...</span> : (
            <button key={n} onClick={() => onPageChange(n)} aria-current={n === page ? 'page' : undefined}
              className={cn('h-9 min-w-9 rounded-lg px-2 text-sm font-medium transition-colors', n === page ? 'bg-primary text-white' : 'text-muted hover:bg-subtle hover:text-foreground')}>{n}</button>
          ))}
          <Button variant="ghost" size="icon" aria-label="Next page" disabled={page >= pages} onClick={() => onPageChange(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </nav>
      )}
    </div>
  );
}
