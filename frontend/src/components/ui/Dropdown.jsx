import { MoreHorizontal } from 'lucide-react';
import Popover from './Popover';
import { cn } from '../../utils/cn';

// items: [{ label, icon, onClick, danger, disabled } | { divider: true }]
export default function Dropdown({ items, label = 'Actions', trigger, align = 'right' }) {
  return (
    <Popover
      align={align}
      className="w-48 p-1.5"
      trigger={({ toggle, open }) =>
        trigger ? trigger({ toggle, open }) : (
          <button onClick={toggle} aria-label={label} aria-haspopup="menu" aria-expanded={open}
            className="rounded-lg p-1.5 text-muted hover:bg-subtle hover:text-foreground"><MoreHorizontal className="h-5 w-5" /></button>
        )}
    >
      {({ close }) => (
        <div role="menu">
          {items.map((it, i) => it.divider ? <div key={i} className="my-1 h-px bg-border" /> : (
            <button key={it.label} role="menuitem" disabled={it.disabled}
              onClick={() => { close(); it.onClick?.(); }}
              className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors disabled:opacity-50',
                it.danger ? 'text-danger hover:bg-danger/10' : 'text-foreground hover:bg-subtle')}>
              {it.icon && <it.icon className="h-4 w-4" />}{it.label}
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}
