import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { Button, Textarea } from '../ui';
import { StarRating } from '../common/Common';
import { submissionService } from '../../services/submissionService';
import { useToast } from '../../context/ToastContext';
import useForm from '../../hooks/useForm';
import { cn } from '../../utils/cn';

const DECISIONS = [
  { id: 'approved', label: 'Approve', hint: 'Marks the task completed', icon: CheckCircle2, tone: 'border-success bg-success/5 text-success' },
  { id: 'revision_requested', label: 'Request revision', hint: 'Intern updates and resubmits', icon: RotateCcw, tone: 'border-warning bg-warning/5 text-warning' },
  { id: 'rejected', label: 'Reject', hint: 'Task returns to In Progress', icon: XCircle, tone: 'border-danger bg-danger/5 text-danger' },
];
const LABEL = { approved: 'Approve submission', revision_requested: 'Request revision', rejected: 'Reject submission' };

export default function ReviewForm({ submission, onReviewed }) {
  const toast = useToast();
  const form = useForm({
    initialValues: { status: '', feedback: '', rating: 0 },
    validate: ({ status, feedback }) => ({
      status: !status ? 'Choose a decision' : '',
      feedback: status && status !== 'approved' && feedback.trim().length < 3 ? 'Feedback is required when rejecting or requesting a revision' : '',
    }),
    onSubmit: async ({ status, feedback, rating }) => {
      const result = await submissionService.review(submission._id, { status, ...(feedback.trim() && { feedback: feedback.trim() }), ...(rating && { rating }) });
      toast.success(status === 'approved' ? 'Submission approved. Task marked completed.' : 'Review sent to the intern');
      onReviewed(result);
    },
  });
  const { values: v, errors: e } = form;

  return (
    <form onSubmit={form.handleSubmit} noValidate className="space-y-5">
      {form.formError && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger">{form.formError}</p>}
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-foreground">Decision</legend>
        <div role="radiogroup" aria-label="Decision" className="grid gap-2">
          {DECISIONS.map(({ id, label, hint, icon: Icon, tone }) => (
            <button key={id} type="button" role="radio" aria-checked={v.status === id} onClick={() => form.setValue('status', id)}
              className={cn('flex items-center gap-3 rounded-xl border p-3 text-left transition-colors', v.status === id ? tone : 'border-border hover:bg-subtle')}>
              <Icon className={cn('h-5 w-5 shrink-0', v.status === id ? '' : 'text-muted')} />
              <span><span className="block text-sm font-medium text-foreground">{label}</span><span className="block text-xs text-muted">{hint}</span></span>
            </button>
          ))}
        </div>
        {e.status && <p role="alert" className="mt-1.5 text-xs text-danger">{e.status}</p>}
      </fieldset>
      <Textarea label="Feedback" name="feedback" rows={5} value={v.feedback} onChange={form.handleChange} error={e.feedback}
        hint={v.status === 'approved' ? 'Optional for approvals' : 'Be specific so the intern knows what to change'} placeholder="What went well? What should change?" />
      <div><p className="mb-1.5 text-sm font-medium text-foreground">Rating <span className="font-normal text-muted">(optional)</span></p><StarRating value={v.rating} onChange={(r) => form.setValue('rating', r)} /></div>
      <Button type="submit" className="w-full" loading={form.submitting}>{LABEL[v.status] || 'Submit review'}</Button>
    </form>
  );
}
