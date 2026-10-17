import { useCallback, useEffect, useRef, useState } from 'react';
import useClickOutside from '../../hooks/useClickOutside';
import { cn } from '../../utils/cn';

// Generic anchored popover. trigger({ open, toggle }) renders the button; children({ close }) the panel.
export default function Popover({ trigger, children, align = 'right', className, onOpenChange }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);

  const set = useCallback((v) => { setOpen(v); onOpenChange?.(v); }, [onOpenChange]);
  const close = useCallback(() => set(false), [set]);
  useClickOutside(ref, close, open);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => set(!open) })}
      {open && (
        <div className={cn('absolute z-40 mt-2 animate-scale-in rounded-xl border border-border bg-surface shadow-pop', align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left', className)}>
          {children({ close })}
        </div>
      )}
    </div>
  );
}
