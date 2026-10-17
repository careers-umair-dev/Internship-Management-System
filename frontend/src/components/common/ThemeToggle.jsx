import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import Popover from '../ui/Popover';
import { cn } from '../../utils/cn';

const OPTIONS = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
];

export default function ThemeToggle() {
  const { theme, resolved, setTheme } = useTheme();
  const Icon = resolved === 'dark' ? Moon : Sun;
  return (
    <Popover
      className="w-40 p-1.5"
      trigger={({ toggle, open }) => (
        <button onClick={toggle} aria-label="Change theme" aria-haspopup="menu" aria-expanded={open}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-subtle hover:text-foreground"><Icon className="h-[18px] w-[18px]" /></button>
      )}
    >
      {({ close }) => (
        <div role="menu">
          {OPTIONS.map(({ id, label, icon: I }) => (
            <button key={id} role="menuitemradio" aria-checked={theme === id} onClick={() => { setTheme(id); close(); }}
              className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-subtle', theme === id ? 'text-foreground' : 'text-muted')}>
              <I className="h-4 w-4" />{label}{theme === id && <Check className="ml-auto h-4 w-4 text-link" />}
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}
