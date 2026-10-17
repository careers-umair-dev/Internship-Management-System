import { useState } from 'react';
import { Button, Modal, ProgressBar } from '../ui';
import { taskService } from '../../services/taskService';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/format';

const PRESETS = [0, 25, 50, 75, 90];

// Intern updates how far along a task is (0-99%). Finishing happens by submitting work.
export default function ProgressModal({ task, onClose, onSaved }) {
  const toast = useToast();
  const [value, setValue] = useState(Math.min(task.progress || 0, 99));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true); setError('');
    try {
      const res = await taskService.updateProgress(task._id, { progress: Number(value) });
      toast.success(`Progress updated to ${value}%`);
      onSaved(res.task);
    } catch (err) { setError(getErrorMessage(err)); } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={saving ? undefined : onClose} size="sm" title="Update progress" description={task.title}
      footer={<><Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button><Button onClick={save} loading={saving} disabled={Number(value) === task.progress}>Save progress</Button></>}>
      <div className="space-y-5">
        {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger">{error}</p>}
        <div>
          <div className="mb-2 flex items-center justify-between"><label htmlFor="progress-range" className="text-sm font-medium text-foreground">Completed so far</label><span className="text-2xl font-semibold tabular-nums text-foreground">{value}%</span></div>
          <input id="progress-range" type="range" min={0} max={99} step={1} value={value} onChange={(e) => setValue(Number(e.target.value))} className="w-full accent-primary" />
          <ProgressBar value={value} size="sm" className="mt-3" label="Preview" />
        </div>
        <div className="flex flex-wrap gap-2">{PRESETS.map((p) => <button key={p} type="button" onClick={() => setValue(p)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-subtle hover:text-foreground">{p}%</button>)}</div>
        <p className="text-xs text-muted">To mark the task as finished, submit your work for review. Your mentor completes the task when they approve it.</p>
      </div>
    </Modal>
  );
}
