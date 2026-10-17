import { useRef, useState } from 'react';
import { User, Lock, Palette, Camera, Sun, Moon, Monitor, Check } from 'lucide-react';
import { Avatar, Button, Card, CardBody, CardHeader, Input, PageHeader, PasswordInput, Tabs, TagInput } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { authService } from '../../services/authService';
import useForm from '../../hooks/useForm';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { formatDate, getErrorMessage } from '../../utils/format';
import { cn } from '../../utils/cn';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

function ProfileTab() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const isIntern = user.role === 'intern';

  const form = useForm({
    initialValues: { name: user.name || '', phone: user.phone || '', designation: user.designation || '', skills: user.skills || [] },
    validate: ({ name, phone }) => ({
      name: name.trim().length < 2 ? 'Name must be at least 2 characters' : name.length > 80 ? 'Name is too long' : '',
      phone: phone && (phone.length < 7 || phone.length > 20) ? 'Enter a valid phone number' : '',
    }),
    onSubmit: async (v) => {
      const payload = { name: v.name.trim(), phone: v.phone.trim(), ...(isIntern ? { skills: v.skills } : { designation: v.designation.trim() }) };
      updateUser(await authService.updateProfile(payload));
      toast.success('Profile updated');
    },
  });

  const onAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file');
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be smaller than 5 MB');
    setUploading(true);
    try { updateUser(await authService.uploadAvatar(file)); toast.success('Profile photo updated'); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setUploading(false); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card>
        <CardBody className="flex flex-col items-center text-center">
          <div className="relative">
            <Avatar name={user.name} src={user.avatar} size="xl" />
            <button onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Change profile photo"
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-card hover:text-foreground disabled:opacity-60">
              <Camera className="h-4 w-4" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatar} aria-label="Upload profile photo" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">{user.name}</h2>
          <p className="text-sm text-muted">{user.email}</p>
          <dl className="mt-6 w-full space-y-3 border-t border-border pt-5 text-left text-sm">
            <div className="flex justify-between"><dt className="text-muted">Role</dt><dd className="font-medium capitalize text-foreground">{user.role}</dd></div>
            {isIntern && <>
              <div className="flex justify-between"><dt className="text-muted">Department</dt><dd className="font-medium text-foreground">{user.department || '-'}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Position</dt><dd className="font-medium text-foreground">{user.position || '-'}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Joined</dt><dd className="font-medium text-foreground">{formatDate(user.joiningDate)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Mentor</dt><dd className="font-medium text-foreground">{user.mentor?.name || '-'}</dd></div>
            </>}
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Personal information" description="Update your details. Email can only be changed by an administrator." />
        <form onSubmit={form.handleSubmit} noValidate>
          <CardBody className="space-y-5">
            {form.formError && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger">{form.formError}</p>}
            <div className="grid gap-5 sm:grid-cols-2">
              <Input label="Full name" name="name" value={form.values.name} onChange={form.handleChange} error={form.errors.name} required />
              <Input label="Email" value={user.email} disabled readOnly />
              <Input label="Phone" name="phone" type="tel" placeholder="+92 300 0000000" value={form.values.phone} onChange={form.handleChange} error={form.errors.phone} />
              {!isIntern && <Input label="Designation" name="designation" value={form.values.designation} onChange={form.handleChange} />}
            </div>
            {isIntern && <TagInput label="Skills" value={form.values.skills} onChange={(s) => form.setValue('skills', s)} hint="Press Enter or comma to add a skill" />}
          </CardBody>
          <div className="flex justify-end border-t border-border px-5 py-4"><Button type="submit" loading={form.submitting}>Save changes</Button></div>
        </form>
      </Card>
    </div>
  );
}

const strength = ({ newPassword: p, currentPassword: c, confirm }) => ({
  currentPassword: !c ? 'Enter your current password' : '',
  newPassword: p.length < 8 ? 'Use at least 8 characters' : !/[A-Za-z]/.test(p) ? 'Include at least one letter' : !/\d/.test(p) ? 'Include at least one number' : p === c ? 'New password must be different' : '',
  confirm: confirm !== p ? 'Passwords do not match' : '',
});

function SecurityTab() {
  const { replaceToken } = useAuth();
  const toast = useToast();
  const form = useForm({
    initialValues: { currentPassword: '', newPassword: '', confirm: '' },
    validate: strength,
    onSubmit: async ({ currentPassword, newPassword }) => {
      const res = await authService.changePassword({ currentPassword, newPassword });
      if (res.token) replaceToken(res.token);
      form.reset();
      toast.success('Password changed successfully');
    },
  });
  return (
    <Card className="max-w-xl">
      <CardHeader title="Change password" description="Use a strong password you don't use elsewhere." />
      <form onSubmit={form.handleSubmit} noValidate>
        <CardBody className="space-y-5">
          {form.formError && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger">{form.formError}</p>}
          <PasswordInput label="Current password" name="currentPassword" autoComplete="current-password" value={form.values.currentPassword} onChange={form.handleChange} error={form.errors.currentPassword} />
          <PasswordInput label="New password" name="newPassword" autoComplete="new-password" hint="At least 8 characters, with a letter and a number" value={form.values.newPassword} onChange={form.handleChange} error={form.errors.newPassword} />
          <PasswordInput label="Confirm new password" name="confirm" autoComplete="new-password" value={form.values.confirm} onChange={form.handleChange} error={form.errors.confirm} />
        </CardBody>
        <div className="flex justify-end border-t border-border px-5 py-4"><Button type="submit" loading={form.submitting}>Update password</Button></div>
      </form>
    </Card>
  );
}

const THEMES = [
  { id: 'light', label: 'Light', icon: Sun, desc: 'Bright and clean' },
  { id: 'dark', label: 'Dark', icon: Moon, desc: 'Easy on the eyes' },
  { id: 'system', label: 'System', icon: Monitor, desc: 'Match your device' },
];

function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  return (
    <Card className="max-w-2xl">
      <CardHeader title="Theme" description="Choose how InternHub looks for you." />
      <CardBody>
        <div role="radiogroup" aria-label="Theme" className="grid gap-3 sm:grid-cols-3">
          {THEMES.map(({ id, label, icon: Icon, desc }) => (
            <button key={id} role="radio" aria-checked={theme === id} onClick={() => setTheme(id)}
              className={cn('relative rounded-xl border p-4 text-left transition-all', theme === id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-muted/50')}>
              {theme === id && <Check className="absolute right-3 top-3 h-4 w-4 text-link" />}
              <Icon className="h-5 w-5 text-muted" />
              <p className="mt-3 text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted">{desc}</p>
            </button>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

export default function SettingsPage() {
  useDocumentTitle('Settings');
  const [tab, setTab] = useState('profile');
  return (
    <>
      <PageHeader title="Settings" description="Manage your profile, security and preferences." />
      <Tabs tabs={TABS} value={tab} onChange={setTab} className="mb-6" />
      {tab === 'profile' && <ProfileTab />}
      {tab === 'security' && <SecurityTab />}
      {tab === 'appearance' && <AppearanceTab />}
    </>
  );
}
