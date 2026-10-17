import { Send } from 'lucide-react';
import { Button, Textarea } from '../ui';
import { StarRating } from '../common/Common';
import { feedbackService } from '../../services/feedbackService';
import { useToast } from '../../context/ToastContext';
import useForm from '../../hooks/useForm';

// Standalone feedback on a task (outside a submission review)
export default function FeedbackForm({ taskId, onSent }) {
  const toast = useToast();
  const form = useForm({
    initialValues: { message: '', rating: 0 },
    validate: ({ message }) => ({ message: message.trim().length < 2 ? 'Write some feedback first' : '' }),
    onSubmit: async ({ message, rating }) => {
      await feedbackService.create({ task: taskId, message: message.trim(), ...(rating && { rating }) });
      toast.success('Feedback sent to the intern');
      form.reset();
      onSent?.();
    },
  });
  return (
    <form onSubmit={form.handleSubmit} noValidate className="space-y-3">
      {form.formError && <p role="alert" className="text-sm text-danger">{form.formError}</p>}
      <Textarea label="Add feedback" name="message" rows={3} value={form.values.message} onChange={form.handleChange} error={form.errors.message} placeholder="Share guidance, praise or next steps..." />
      <div className="flex items-center justify-between gap-3">
        <StarRating value={form.values.rating} onChange={(r) => form.setValue('rating', r)} size="sm" />
        <Button type="submit" size="sm" leftIcon={Send} loading={form.submitting}>Send feedback</Button>
      </div>
    </form>
  );
}
