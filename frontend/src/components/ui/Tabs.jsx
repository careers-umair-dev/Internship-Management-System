import { cn } from '../../utils/cn';

// tabs: [{ id, label, icon }]
export default function Tabs({ tabs, value, onChange, className }) {
  return (
    <div role="tablist" className={cn('flex gap-1 overflow-x-auto border-b border-border', className)}>
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={cn('-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
            value === t.id ? 'border-primary text-foreground' : 'border-transparent text-muted hover:text-foreground')}>
          {t.icon && <t.icon className="h-4 w-4" />}{t.label}
        </button>
      ))}
    </div>
  );
}
