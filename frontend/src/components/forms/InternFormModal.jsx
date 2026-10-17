import { Modal, Button, Input, PasswordInput, Select, TagInput } from '../ui';
import { internService } from '../../services/internService';
import { useToast } from '../../context/ToastContext';
import useForm from '../../hooks/useForm';
import { toDateInput, todayInput } from '../../utils/dates';

const validate = (v) => ({
  name: v.name.trim().length < 2 ? 'Name must be at least 2 characters' : '',
  email: !v.email.trim() ? 'Email is required' : !/^\S+@\S+\.\S+$/.test(v.email) ? 'Enter a valid email address' : '',
  phone: v.phone && (v.phone.length < 7 || v.phone.length > 20) ? 'Enter a valid phone number' : '',
  durationMonths: !(Number(v.durationMonths) >= 1 && Number(v.durationMonths) <= 24) ? 'Duration must be 1-24 months' : '',
  password: v.password && (v.password.length < 8 || !/[A-Za-z]/.test(v.password) || !/\d/.test(v.password)) ? 'At least 8 characters with a letter and a number' : '',
});

// Create (intern = null) or edit an intern. onSaved(result) receives the API response.
export default function InternFormModal({ intern, departments = [], onClose, onSaved }) {
  const toast = useToast();
  const editing = !!intern;

  const form = useForm({
    initialValues: {
      name: intern?.name || '', email: intern?.email || '', phone: intern?.phone || '',
      department: intern?.department || '', position: intern?.position || '',
      joiningDate: intern ? toDateInput(intern.joiningDate) : todayInput(),
      durationMonths: intern?.durationMonths ?? 3, status: intern?.status || 'active',
      skills: intern?.skills || [], password: '',
    },
    validate,
    onSubmit: async (v) => {
      const payload = {
        name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim(), department: v.department.trim(), position: v.position.trim(),
        durationMonths: Number(v.durationMonths), skills: v.skills,
        ...(v.joiningDate && { joiningDate: v.joiningDate }),
        ...(editing && { status: v.status }),
        ...(v.password && { password: v.password }),
      };
      const result = editing ? await internService.update(intern._id, payload) : await internService.create(payload);
      toast.success(editing ? 'Intern updated' : 'Intern added');
      onSaved(result);
    },
  });
  const { values: v, errors: e, handleChange: change } = form;

  return (
    <Modal open onClose={form.submitting ? undefined : onClose} size="lg" title={editing ? 'Edit intern' : 'Add new intern'}
      description={editing ? 'Update profile details and internship information.' : 'Create an account. A password is generated if you leave it empty.'}
      footer={<><Button variant="outline" onClick={onClose} disabled={form.submitting}>Cancel</Button>
        <Button type="submit" form="intern-form" loading={form.submitting}>{editing ? 'Save changes' : 'Add intern'}</Button></>}>
      <form id="intern-form" onSubmit={form.handleSubmit} noValidate className="space-y-5">
        {form.formError && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger">{form.formError}</p>}
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Full name" name="name" value={v.name} onChange={change} error={e.name} required data-autofocus />
          <Input label="Email" name="email" type="email" value={v.email} onChange={change} error={e.email} required />
          <Input label="Phone" name="phone" type="tel" placeholder="+92 300 0000000" value={v.phone} onChange={change} error={e.phone} />
          <Input label="Department" name="department" list="dept-options" value={v.department} onChange={change} placeholder="e.g. Engineering" />
          <datalist id="dept-options">{departments.map((d) => <option key={d} value={d} />)}</datalist>
          <Input label="Position / role" name="position" value={v.position} onChange={change} placeholder="e.g. Frontend Intern" />
          <Input label="Joining date" name="joiningDate" type="date" value={v.joiningDate} onChange={change} />
          <Input label="Duration (months)" name="durationMonths" type="number" min={1} max={24} value={v.durationMonths} onChange={change} error={e.durationMonths} />
          {editing && <Select label="Status" name="status" value={v.status} onChange={change} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'completed', label: 'Completed' }]} />}
        </div>
        <TagInput label="Skills" value={v.skills} onChange={(s) => form.setValue('skills', s)} hint="Press Enter or comma to add" />
        <PasswordInput label={editing ? 'Reset password' : 'Password'} name="password" autoComplete="new-password" value={v.password} onChange={change} error={e.password}
          hint={editing ? 'Leave empty to keep the current password' : 'Leave empty to auto-generate a secure temporary password'} />
      </form>
    </Modal>
  );
}
