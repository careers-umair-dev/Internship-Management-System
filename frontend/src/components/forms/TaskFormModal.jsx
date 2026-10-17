import { useRef } from 'react';
import { Paperclip, X } from 'lucide-react';
import { Modal, Button, Input, Select, Textarea } from '../ui';
import { AttachmentList } from '../common/Common';
import { internService } from '../../services/internService';
import { taskService } from '../../services/taskService';
import { useToast } from '../../context/ToastContext';
import useForm from '../../hooks/useForm';
import useFetch from '../../hooks/useFetch';
import { toDateInput, toDateTimeLocal, todayInput } from '../../utils/dates';
import { PRIORITIES } from '../../utils/constants';

const MAX_FILES = 5;

const validate = (v) => {
  const start = v.startDate ? new Date(v.startDate) : null;
  const end = v.deadline ? new Date(v.deadline) : null;
  return {
    title: v.title.trim().length < 3 ? 'Title must be at least 3 characters' : '',
    intern: !v.intern ? 'Select an intern' : '',
    deadline: !v.deadline ? 'Deadline is required' : start && end && end < start ? 'Deadline cannot be before the start date' : '',
  };
};

// Create (task = null) or edit a task. `defaultIntern` pre-selects the intern when assigning from a profile.
export default function TaskFormModal({ task, defaultIntern = '', onClose, onSaved }) {
  const toast = useToast();
  const editing = !!task;
  const fileRef = useRef(null);
  const { data: internData } = useFetch(() => internService.list({ status: 'active', limit: 100, sort: 'name:asc' }), []);
  const { data: categories } = useFetch(() => taskService.categories(), []);

  const form = useForm({
    initialValues: {
      title: task?.title || '', description: task?.description || '',
      intern: task?.intern?._id || task?.intern || defaultIntern, category: task?.category || '',
      priority: task?.priority || 'Medium',
      startDate: task ? toDateInput(task.startDate) : todayInput(), deadline: toDateTimeLocal(task?.deadline), files: [],
    },
    validate,
    onSubmit: async (v) => {
      const data = new FormData();
      data.append('title', v.title.trim());
      data.append('description', v.description.trim());
      data.append('intern', v.intern);
      data.append('priority', v.priority);
      if (v.category.trim()) data.append('category', v.category.trim());
      if (v.startDate) data.append('startDate', new Date(v.startDate).toISOString());
      data.append('deadline', new Date(v.deadline).toISOString());
      v.files.forEach((f) => data.append('attachments', f));
      const result = editing ? await taskService.update(task._id, data) : await taskService.create(data);
      toast.success(editing ? 'Task updated' : 'Task created and assigned');
      onSaved(result);
    },
  });
  const { values: v, errors: e, handleChange: change } = form;

  const addFiles = (list) => {
    const next = [...v.files];
    for (const f of list) {
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name} is larger than 10 MB`); continue; }
      if (next.length + (task?.attachments?.length || 0) >= MAX_FILES) { toast.warning(`You can attach up to ${MAX_FILES} files`); break; }
      next.push(f);
    }
    form.setValue('files', next);
  };

  const internOptions = (internData?.items || []).map((i) => ({ value: i._id, label: `${i.name}${i.department ? ` - ${i.department}` : ''}` }));
  // When editing, the current intern may be inactive (not in the active list): keep them selectable.
  if (editing && v.intern && !internOptions.some((o) => o.value === v.intern) && task?.intern?.name) internOptions.unshift({ value: v.intern, label: task.intern.name });

  return (
    <Modal open onClose={form.submitting ? undefined : onClose} size="lg" title={editing ? 'Edit task' : 'Create & assign task'}
      description={editing ? 'Changing the intern reassigns the task and notifies them.' : 'The intern is notified as soon as the task is created.'}
      footer={<><Button variant="outline" onClick={onClose} disabled={form.submitting}>Cancel</Button>
        <Button type="submit" form="task-form" loading={form.submitting}>{editing ? 'Save changes' : 'Create task'}</Button></>}>
      <form id="task-form" onSubmit={form.handleSubmit} noValidate className="space-y-5">
        {form.formError && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger">{form.formError}</p>}
        <Input label="Title" name="title" value={v.title} onChange={change} error={e.title} required data-autofocus placeholder="e.g. Build the onboarding flow" />
        <Textarea label="Description" name="description" rows={4} value={v.description} onChange={change} placeholder="What needs to be done, acceptance criteria, helpful links..." />
        <div className="grid gap-5 sm:grid-cols-2">
          <Select label="Assign to" name="intern" value={v.intern} onChange={change} error={e.intern} required placeholder="Select an intern" options={internOptions} />
          <Select label="Priority" name="priority" value={v.priority} onChange={change} options={PRIORITIES} />
          <Input label="Category" name="category" list="category-options" value={v.category} onChange={change} placeholder="e.g. Development" />
          <datalist id="category-options">{(categories || []).map((c) => <option key={c} value={c} />)}</datalist>
          <Input label="Start date" name="startDate" type="date" value={v.startDate} onChange={change} />
          <Input label="Deadline" name="deadline" type="datetime-local" value={v.deadline} onChange={change} error={e.deadline} required wrapperClassName="sm:col-span-2" />
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-foreground">Attachments</p>
          {editing && task.attachments?.length > 0 && <div className="mb-3"><AttachmentList files={task.attachments} /></div>}
          {v.files.length > 0 && (
            <ul className="mb-3 space-y-2">
              {v.files.map((f, i) => (
                <li key={`${f.name}${i}`} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                  <Paperclip className="h-4 w-4 text-muted" /><span className="min-w-0 flex-1 truncate">{f.name}</span>
                  <button type="button" aria-label={`Remove ${f.name}`} onClick={() => form.setValue('files', v.files.filter((_, j) => j !== i))} className="text-muted hover:text-danger"><X className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
          <input ref={fileRef} type="file" multiple className="hidden" aria-label="Attach files" onChange={(ev) => { addFiles([...ev.target.files]); ev.target.value = ''; }} />
          <Button type="button" variant="outline" size="sm" leftIcon={Paperclip} onClick={() => fileRef.current?.click()}>Add files</Button>
          <p className="mt-1.5 text-xs text-muted">Up to {MAX_FILES} files, 10 MB each (documents, images, archives).</p>
        </div>
      </form>
    </Modal>
  );
}
