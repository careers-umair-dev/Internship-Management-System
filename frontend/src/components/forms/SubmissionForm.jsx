import { useRef } from 'react';
import { Link2, Paperclip, Send, X } from 'lucide-react';
import { Button, Input, Textarea } from '../ui';
import { submissionService } from '../../services/submissionService';
import { useToast } from '../../context/ToastContext';
import useForm from '../../hooks/useForm';

const MAX_FILES = 5;
const MAX_SIZE = 10 * 1024 * 1024;
const isHttpUrl = (v) => { try { const u = new URL(v); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; } };

// Submit work (or a revision) as text, files and/or an external link.
export default function SubmissionForm({ taskId, version = 1, onSubmitted }) {
  const toast = useToast();
  const fileRef = useRef(null);

  const form = useForm({
    initialValues: { description: '', link: '', files: [] },
    validate: ({ description, link, files }) => {
      const empty = !description.trim() && !link.trim() && files.length === 0;
      return {
        description: empty ? 'Add a description, a link or at least one file' : '',
        link: link.trim() && !isHttpUrl(link.trim()) ? 'Enter a valid link starting with http:// or https://' : '',
      };
    },
    onSubmit: async ({ description, link, files }) => {
      const data = new FormData();
      data.append('task', taskId);
      if (description.trim()) data.append('description', description.trim());
      if (link.trim()) data.append('link', link.trim());
      files.forEach((f) => data.append('files', f));
      const res = await submissionService.create(data);
      toast.success('Work submitted for review');
      form.reset();
      onSubmitted?.(res.submission);
    },
  });
  const { values: v, errors: e } = form;

  const addFiles = (list) => {
    const next = [...v.files];
    for (const f of list) {
      if (f.size > MAX_SIZE) { toast.error(`${f.name} is larger than 10 MB`); continue; }
      if (next.length >= MAX_FILES) { toast.warning(`You can upload up to ${MAX_FILES} files`); break; }
      next.push(f);
    }
    form.setValue('files', next);
  };

  return (
    <form onSubmit={form.handleSubmit} noValidate className="space-y-5">
      {form.formError && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger">{form.formError}</p>}
      <Textarea label="What did you do?" name="description" rows={5} value={v.description} onChange={form.handleChange} error={e.description} placeholder="Summarise your work, decisions made and anything the reviewer should know..." />
      <Input label="External link" name="link" type="url" leftIcon={Link2} value={v.link} onChange={form.handleChange} error={e.link} placeholder="https://github.com/your-repo/pull/12" hint="Pull request, document, design file, deployed demo..." />
      <div>
        <p className="mb-1.5 text-sm font-medium text-foreground">Files</p>
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
        <input ref={fileRef} type="file" multiple className="hidden" aria-label="Upload files" onChange={(ev) => { addFiles([...ev.target.files]); ev.target.value = ''; }} />
        <Button type="button" variant="outline" size="sm" leftIcon={Paperclip} onClick={() => fileRef.current?.click()}>Choose files</Button>
        <p className="mt-1.5 text-xs text-muted">Up to {MAX_FILES} files, 10 MB each (documents, images, spreadsheets, archives).</p>
      </div>
      <Button type="submit" leftIcon={Send} loading={form.submitting} className="w-full sm:w-auto">{version > 1 ? `Submit revision (v${version})` : 'Submit for review'}</Button>
    </form>
  );
}
