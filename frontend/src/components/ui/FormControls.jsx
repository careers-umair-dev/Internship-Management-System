import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff, ChevronDown, X } from 'lucide-react';
import { cn } from '../../utils/cn';

const control = (error) =>
  cn(
    'w-full rounded-lg border bg-surface text-sm text-foreground placeholder:text-muted/70 transition-colors',
    'disabled:cursor-not-allowed disabled:bg-subtle disabled:opacity-70',
    error ? 'border-danger focus-visible:ring-danger/40' : 'border-border hover:border-muted/50'
  );

// Wraps any control with label, hint and error text (wired for accessibility)
export function Field({ id, label, error, hint, required, children, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-foreground">
          {label}{required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

const aria = (id, error, hint) => ({
  'aria-invalid': error ? true : undefined,
  'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
});

export const Input = forwardRef(function Input(
  { label, error, hint, required, leftIcon: Left, rightElement, className, wrapperClassName, id: idProp, ...props }, ref
) {
  const auto = useId();
  const id = idProp || auto;
  return (
    <Field id={id} label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
      <div className="relative">
        {Left && <Left className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />}
        <input
          ref={ref} id={id} required={required}
          className={cn(control(error), 'h-10 px-3', Left && 'pl-9', rightElement && 'pr-10', className)}
          {...aria(id, error, hint)} {...props}
        />
        {rightElement && <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightElement}</div>}
      </div>
    </Field>
  );
});

export const PasswordInput = forwardRef(function PasswordInput(props, ref) {
  const [show, setShow] = useState(false);
  return (
    <Input
      ref={ref}
      type={show ? 'text' : 'password'}
      rightElement={
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}
          className="rounded p-1 text-muted hover:text-foreground">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
      {...props}
    />
  );
});

export const Textarea = forwardRef(function Textarea({ label, error, hint, required, rows = 4, className, wrapperClassName, id: idProp, ...props }, ref) {
  const auto = useId();
  const id = idProp || auto;
  return (
    <Field id={id} label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
      <textarea ref={ref} id={id} rows={rows} required={required}
        className={cn(control(error), 'resize-y px-3 py-2.5', className)} {...aria(id, error, hint)} {...props} />
    </Field>
  );
});

export const Select = forwardRef(function Select({ label, error, hint, required, options = [], placeholder, className, wrapperClassName, id: idProp, children, ...props }, ref) {
  const auto = useId();
  const id = idProp || auto;
  return (
    <Field id={id} label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
      <div className="relative">
        <select ref={ref} id={id} required={required}
          className={cn(control(error), 'h-10 appearance-none pl-3 pr-9', className)} {...aria(id, error, hint)} {...props}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => {
            const opt = typeof o === 'string' ? { value: o, label: o } : o;
            return <option key={opt.value} value={opt.value}>{opt.label}</option>;
          })}
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
    </Field>
  );
});

// Type and press Enter / comma to add; Backspace removes the last tag.
export function TagInput({ label, value = [], onChange, placeholder = 'Add and press Enter', max = 30, hint, error, id: idProp }) {
  const auto = useId();
  const id = idProp || auto;
  const [draft, setDraft] = useState('');

  const add = () => {
    const tag = draft.trim().replace(/,$/, '');
    if (tag && !value.includes(tag) && value.length < max) onChange([...value, tag.slice(0, 40)]);
    setDraft('');
  };
  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
    else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
  };

  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <div className={cn(control(error), 'flex min-h-10 flex-wrap items-center gap-1.5 p-1.5 focus-within:ring-2 focus-within:ring-primary/40')}>
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-link">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="rounded hover:text-danger">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input id={id} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKeyDown} onBlur={add}
          placeholder={value.length ? '' : placeholder}
          className="min-w-[8ch] flex-1 bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-muted/70 focus-visible:ring-0 focus-visible:ring-offset-0" />
      </div>
    </Field>
  );
}
