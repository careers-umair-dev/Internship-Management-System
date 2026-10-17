import { Search, X, Star, Paperclip, FileText, ExternalLink } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { cn } from '../../utils/cn';
import { assetUrl } from '../../utils/format';

export function SearchInput({ value, onChange, placeholder = 'Search...', className, label = 'Search' }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input type="search" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-9 text-sm placeholder:text-muted/70 hover:border-muted/50 [&::-webkit-search-cancel-button]:hidden" />
      {value && <button onClick={() => onChange('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground"><X className="h-4 w-4" /></button>}
    </div>
  );
}

// Compact native <select> for filter bars
export function FilterSelect({ label, value, onChange, options, placeholder, className }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}
      className={cn('h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground hover:border-muted/50', value ? '' : 'text-muted', className)}>
      <option value="">{placeholder || label}</option>
      {options.map((o) => { const opt = typeof o === 'string' ? { value: o, label: o } : o; return <option key={opt.value} value={opt.value}>{opt.label}</option>; })}
    </select>
  );
}

export function InternCell({ intern, subtitle, size = 'sm' }) {
  if (!intern) return <span className="text-muted">-</span>;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={intern.name} src={intern.avatar} size={size} />
      <div className="min-w-0"><p className="truncate font-medium text-foreground">{intern.name}</p><p className="truncate text-xs text-muted">{subtitle ?? intern.email ?? intern.department}</p></div>
    </div>
  );
}

export function StarRating({ value = 0, onChange, size = 'md' }) {
  const dim = size === 'sm' ? 'h-3.5 w-3.5' : 'h-6 w-6';
  if (!onChange) {
    return <span className="inline-flex items-center gap-0.5 text-warning" aria-label={`Rating ${value} out of 5`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cn(dim, n <= value ? 'fill-current' : 'text-border')} />)}</span>;
  }
  return (
    <div role="radiogroup" aria-label="Rating" className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => onChange(value === n ? 0 : n)}
          className="rounded p-0.5 text-warning transition-transform hover:scale-110"><Star className={cn(dim, n <= value ? 'fill-current' : 'text-border')} /></button>
      ))}
    </div>
  );
}

const sizeLabel = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round((b || 0) / 1024))} KB`);

export function AttachmentList({ files = [], emptyText }) {
  if (!files.length) return emptyText ? <p className="text-sm text-muted">{emptyText}</p> : null;
  return (
    <ul className="space-y-2">
      {files.map((f) => (
        <li key={f.url}>
          <a href={assetUrl(f.url)} target="_blank" rel="noopener noreferrer" download={f.name}
            className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm transition-colors hover:bg-subtle">
            <FileText className="h-4 w-4 shrink-0 text-muted" /><span className="min-w-0 flex-1 truncate text-foreground">{f.name}</span>
            <span className="shrink-0 text-xs text-muted">{sizeLabel(f.size)}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export const ExternalLinkChip = ({ href }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1.5 truncate text-sm text-link hover:underline">
    <ExternalLink className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{href}</span>
  </a>
);

export const AttachmentCount = ({ count }) => (count ? <span className="inline-flex items-center gap-1 text-xs text-muted"><Paperclip className="h-3 w-3" />{count}</span> : null);
