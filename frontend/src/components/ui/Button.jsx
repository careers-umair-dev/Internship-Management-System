import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary/90 shadow-sm',
  secondary: 'bg-subtle text-foreground hover:bg-border/70',
  outline: 'border border-border bg-surface text-foreground hover:bg-subtle',
  ghost: 'text-muted hover:bg-subtle hover:text-foreground',
  danger: 'bg-danger text-white hover:bg-danger/90 shadow-sm dark:text-background',
};
const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
  icon: 'h-9 w-9',
};

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, leftIcon: Left, rightIcon: Right, className, children, disabled, type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap rounded-lg font-medium transition-all duration-150 active:scale-[0.98]',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant], SIZES[size], className
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Left && <Left className="h-4 w-4" />}
      {children}
      {!loading && Right && <Right className="h-4 w-4" />}
    </button>
  );
});

export default Button;
