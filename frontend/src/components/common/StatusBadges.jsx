import Badge from '../ui/Badge';
import { PRIORITY_VARIANT, STATUS_VARIANT, SUBMISSION_LABEL, SUBMISSION_VARIANT } from '../../utils/constants';
import { deadlineInfo } from '../../utils/format';
import { cn } from '../../utils/cn';
import { Clock } from 'lucide-react';

export const StatusBadge = ({ status }) => <Badge variant={STATUS_VARIANT[status] || 'neutral'} dot>{status}</Badge>;
export const PriorityBadge = ({ priority }) => <Badge variant={PRIORITY_VARIANT[priority] || 'neutral'}>{priority}</Badge>;
export const SubmissionBadge = ({ status }) => <Badge variant={SUBMISSION_VARIANT[status] || 'neutral'} dot>{SUBMISSION_LABEL[status] || status}</Badge>;

const TONE = { danger: 'text-danger', warning: 'text-warning', default: 'text-muted' };

// Deadline countdown with urgency colouring
export function DeadlineLabel({ deadline, status, className }) {
  const { label, tone } = deadlineInfo(deadline, status);
  return <span className={cn('inline-flex items-center gap-1 text-xs font-medium', TONE[tone], className)}><Clock className="h-3.5 w-3.5" />{label}</span>;
}

const TASK_SUBMISSION = {
  pending_review: ['warning', 'Awaiting review'],
  revision_requested: ['info', 'Revision requested'],
  rejected: ['danger', 'Rejected'],
  approved: ['success', 'Approved'],
};
// Submission state shown on a task (hidden when nothing was submitted)
export function TaskSubmissionBadge({ status }) {
  const entry = TASK_SUBMISSION[status];
  return entry ? <Badge variant={entry[0]} dot>{entry[1]}</Badge> : null;
}

// Can the intern still work on / submit this task?
export const canWorkOn = (t) => t.status !== 'Completed' && t.submissionStatus !== 'pending_review';
