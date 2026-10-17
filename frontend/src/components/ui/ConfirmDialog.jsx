import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { getErrorMessage } from '../../utils/format';

// onConfirm may be async; the dialog closes when it resolves and shows the error if it rejects.
export default function ConfirmDialog({ open, onClose, onConfirm, title = 'Are you sure?', message, confirmLabel = 'Confirm', variant = 'danger' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handle = async () => {
    setBusy(true); setError('');
    try { await onConfirm(); onClose(); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={busy ? undefined : onClose} title={title} size="sm"
      footer={<>
        <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant={variant} loading={busy} onClick={handle} data-autofocus>{confirmLabel}</Button>
      </>}>
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger"><AlertTriangle className="h-5 w-5" /></div>
        <div className="text-sm text-muted">{message}{error && <p role="alert" className="mt-2 text-danger">{error}</p>}</div>
      </div>
    </Modal>
  );
}
