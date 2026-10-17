import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Mail, ShieldCheck, GraduationCap, AlertCircle } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import { Button, Input, PasswordInput } from '../../components/ui';
import { FullScreenLoader } from '../../components/common/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useForm from '../../hooks/useForm';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { homeFor } from '../../utils/constants';
import { cn } from '../../utils/cn';

const ROLE_TABS = [
  { id: 'admin', label: 'Admin', icon: ShieldCheck },
  { id: 'intern', label: 'Intern', icon: GraduationCap },
];
const DEMO = {
  admin: { email: 'admin@internhub.com', password: 'Admin@123' },
  intern: { email: 'ali@internhub.com', password: 'Intern@123' },
};

const validate = ({ email, password }) => ({
  email: !email.trim() ? 'Email is required' : !/^\S+@\S+\.\S+$/.test(email) ? 'Enter a valid email address' : '',
  password: !password ? 'Password is required' : '',
});

export default function LoginPage() {
  useDocumentTitle('Sign in');
  const { login, isAuthenticated, booting, role: currentRole } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState('admin');

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate,
    onSubmit: async ({ email, password }) => {
      const user = await login(email.trim(), password, role);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      const from = location.state?.from;
      navigate(from && from.startsWith(`/${user.role}`) ? from : homeFor(user.role), { replace: true });
    },
  });

  if (booting) return <FullScreenLoader />;
  if (isAuthenticated) return <Navigate to={homeFor(currentRole)} replace />;

  const switchRole = (id) => { setRole(id); form.reset({ email: '', password: '' }); };

  return (
    <AuthLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sign in to your account</h1>
        <p className="mt-2 text-sm text-muted">Choose your role and enter your credentials to continue.</p>
      </div>

      <div role="tablist" aria-label="Sign in as" className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-subtle p-1">
        {ROLE_TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={role === id} onClick={() => switchRole(id)}
            className={cn('flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all',
              role === id ? 'bg-surface text-foreground shadow-card' : 'text-muted hover:text-foreground')}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      <form onSubmit={form.handleSubmit} noValidate className="space-y-5">
        {form.formError && (
          <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{form.formError}
          </div>
        )}
        <Input label="Email" name="email" type="email" autoComplete="username" placeholder={role === 'admin' ? 'admin@company.com' : 'you@company.com'}
          leftIcon={Mail} value={form.values.email} onChange={form.handleChange} error={form.errors.email} required />
        <PasswordInput label="Password" name="password" autoComplete="current-password" placeholder="Enter your password"
          value={form.values.password} onChange={form.handleChange} error={form.errors.password} required />
        <Button type="submit" size="lg" className="w-full" loading={form.submitting}>
          {form.submitting ? 'Signing in...' : `Sign in as ${role === 'admin' ? 'Admin' : 'Intern'}`}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New intern? <Link to="/register" className="font-medium text-link hover:underline">Create an account</Link>
      </p>

      {import.meta.env.DEV && (
        <div className="mt-8 rounded-xl border border-dashed border-border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Demo credentials (dev only)</p>
          <button type="button" onClick={() => form.setValues(DEMO[role])} className="mt-2 text-sm text-link hover:underline">
            Fill {role} demo login
          </button>
        </div>
      )}
    </AuthLayout>
  );
}
