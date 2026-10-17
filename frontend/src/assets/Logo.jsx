import { cn } from '../utils/cn';

export function LogoMark({ className }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-8 w-8', className)} aria-hidden="true">
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path d="M9 21l5-5 3 3 6-7" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Logo({ collapsed = false, className }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      {!collapsed && <span className="text-lg font-semibold tracking-tight text-foreground">Intern<span className="text-link">Hub</span></span>}
    </div>
  );
}
