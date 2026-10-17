import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Search, UserRound, X } from 'lucide-react';
import Avatar from '../ui/Avatar';
import Spinner from '../ui/Spinner';
import { StatusBadge } from './StatusBadges';
import { searchService } from '../../services/searchService';
import { useAuth } from '../../context/AuthContext';
import useClickOutside from '../../hooks/useClickOutside';
import useDebounce from '../../hooks/useDebounce';
import { cn } from '../../utils/cn';

const MIN = 2;

// Topbar search: interns (admin) and tasks. Ctrl/Cmd+K or "/" focuses it; arrows + Enter navigate.
export default function GlobalSearch({ className }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const base = user?.role === 'admin' ? '/admin' : '/intern';
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listId = useId();

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ loading: false, error: '', interns: [], tasks: [] });
  const [active, setActive] = useState(-1);
  const debounced = useDebounce(query.trim(), 300);
  const ready = debounced.length >= MIN;

  useClickOutside(rootRef, () => setOpen(false), open);

  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(input|textarea|select)$/i.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
        e.preventDefault(); inputRef.current?.focus(); setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Fetch (ignore stale responses)
  useEffect(() => {
    if (!ready) { setState({ loading: false, error: '', interns: [], tasks: [] }); return undefined; }
    let stale = false;
    setState((s) => ({ ...s, loading: true, error: '' }));
    searchService.search(debounced)
      .then((r) => { if (!stale) setState({ loading: false, error: '', interns: r.interns || [], tasks: r.tasks || [] }); })
      .catch(() => { if (!stale) setState({ loading: false, error: 'Search failed. Try again.', interns: [], tasks: [] }); });
    return () => { stale = true; };
  }, [debounced, ready]);

  const options = useMemo(() => [
    ...state.interns.map((i) => ({ id: `i-${i._id}`, kind: 'intern', item: i, to: `/admin/interns/${i._id}` })),
    ...state.tasks.map((t) => ({ id: `t-${t._id}`, kind: 'task', item: t, to: `${base}/tasks/${t._id}` })),
  ], [state.interns, state.tasks, base]);

  useEffect(() => { setActive(-1); }, [options]);

  const go = (opt) => { setOpen(false); setQuery(''); inputRef.current?.blur(); navigate(opt.to); };
  const onKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); return; }
    if (!options.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % options.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a <= 0 ? options.length - 1 : a - 1)); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); go(options[active]); }
  };

  const showPanel = open && query.trim().length > 0;
  const row = (opt) => {
    const idx = options.indexOf(opt);
    return (
      <li key={opt.id} id={`${listId}-${idx}`} role="option" aria-selected={idx === active} onMouseEnter={() => setActive(idx)} onMouseDown={(e) => e.preventDefault()} onClick={() => go(opt)}
        className={cn('flex cursor-pointer items-center gap-3 px-3 py-2.5', idx === active ? 'bg-subtle' : '')}>
        {opt.kind === 'intern' ? <Avatar name={opt.item.name} src={opt.item.avatar} size="xs" /> : <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-link"><ClipboardList className="h-3.5 w-3.5" /></span>}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{opt.kind === 'intern' ? opt.item.name : opt.item.title}</p>
          <p className="truncate text-xs text-muted">{opt.kind === 'intern' ? [opt.item.email, opt.item.department].filter(Boolean).join(' - ') : opt.item.intern?.name || 'Task'}</p>
        </div>
        {opt.kind === 'task' && <StatusBadge status={opt.item.status} />}
      </li>
    );
  };

  return (
    <div ref={rootRef} className={cn('relative w-full max-w-md', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input ref={inputRef} type="search" role="combobox" aria-label="Global search" aria-expanded={showPanel} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined} autoComplete="off" value={query} placeholder={user?.role === 'admin' ? 'Search interns and tasks' : 'Search your tasks'}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKeyDown}
        className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-16 text-sm placeholder:text-muted/70 hover:border-muted/50 [&::-webkit-search-cancel-button]:hidden" />
      {query ? <button onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label="Clear global search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground"><X className="h-4 w-4" /></button>
        : <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 text-[10px] font-medium text-muted sm:block">Ctrl K</kbd>}

      {showPanel && (
        <div className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-xl border border-border bg-surface shadow-pop">
          <ul id={listId} role="listbox" aria-label="Search results" className="max-h-96 overflow-y-auto py-1">
            {!ready ? <li className="px-4 py-6 text-center text-sm text-muted">Type at least {MIN} characters</li>
              : state.loading && !options.length ? <li className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-muted"><Spinner className="h-4 w-4" />Searching...</li>
              : state.error ? <li role="alert" className="px-4 py-6 text-center text-sm text-danger">{state.error}</li>
              : !options.length ? <li className="px-4 py-6 text-center text-sm text-muted">No results for "{debounced}"</li>
              : (
                <>
                  {state.interns.length > 0 && <li role="presentation" className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted"><UserRound className="h-3 w-3" />Interns</li>}
                  {options.filter((o) => o.kind === 'intern').map(row)}
                  {state.tasks.length > 0 && <li role="presentation" className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted"><ClipboardList className="h-3 w-3" />Tasks</li>}
                  {options.filter((o) => o.kind === 'task').map(row)}
                </>
              )}
          </ul>
        </div>
      )}
    </div>
  );
}
