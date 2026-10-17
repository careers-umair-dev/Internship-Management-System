import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '../utils/cn';

const ToastContext = createContext(null);

const STYLES = {
  success: { icon: CheckCircle2, color: 'text-success' },
  error: { icon: AlertCircle, color: 'text-danger' },
  warning: { icon: AlertTriangle, color: 'text-warning' },
  info: { icon: Info, color: 'text-info' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const show = useCallback((type, message, { duration = 4500 } = {}) => {
    const id = ++idRef.current;
    setToasts((t) => [...t.slice(-3), { id, type, message }]);
    if (duration) setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (m, o) => show('success', m, o),
    error: (m, o) => show('error', m, o),
    warning: (m, o) => show('warning', m, o),
    info: (m, o) => show('info', m, o),
    dismiss,
  }), [show, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end" aria-live="polite">
        {toasts.map((t) => {
          const { icon: Icon, color } = STYLES[t.type];
          return (
            <div key={t.id} role="status" className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-pop">
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', color)} />
              <p className="flex-1 text-sm text-foreground">{t.message}</p>
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="rounded p-0.5 text-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
