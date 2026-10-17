import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Skeleton } from './Skeleton';
import { EmptyState, ErrorState } from './EmptyState';
import Pagination from './Pagination';

/**
 * columns: [{ key, header, sortable?, sortKey?, align?, className?, render?(row) }]
 * sort: { key, dir: 'asc'|'desc' }, onSortChange(key)
 * pagination: { page, pages, total, limit }, onPageChange(page)
 */
export default function DataTable({
  columns, data = [], loading = false, error, onRetry, rowKey = '_id', onRowClick, rowClassName,
  sort, onSortChange, pagination, onPageChange, skeletonRows = 6,
  empty = { title: 'Nothing here yet', description: 'No records match your criteria.' }, caption,
}) {
  const alignClass = (a) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');

  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="border-b border-border bg-subtle/60 text-xs uppercase tracking-wide text-muted">
            <tr>
              {columns.map((c) => {
                const k = c.sortKey || c.key;
                const active = sort?.key === k;
                return (
                  <th key={c.key} scope="col" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cn('px-4 py-3 font-medium', alignClass(c.align), c.className)}>
                    {c.sortable ? (
                      <button onClick={() => onSortChange?.(k)} className={cn('inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground', active && 'text-foreground')}>
                        {c.header}
                        {active ? (sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-50" />}
                      </button>
                    ) : c.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && Array.from({ length: skeletonRows }).map((_, r) => (
              <tr key={`s${r}`}>{columns.map((c) => <td key={c.key} className="px-4 py-3.5"><Skeleton className="h-4 w-4/5" /></td>)}</tr>
            ))}
            {!loading && !error && data.map((row) => (
              <tr key={row[rowKey]} onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn('transition-colors hover:bg-subtle/60', onRowClick && 'cursor-pointer', rowClassName?.(row))}>
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3.5 align-middle text-foreground', alignClass(c.align), c.className)}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && data.length === 0 && <EmptyState {...empty} />}
      {pagination && !error && <Pagination {...pagination} onPageChange={onPageChange} />}
    </div>
  );
}
