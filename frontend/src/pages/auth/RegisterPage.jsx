import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, Mail, UserRound } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import { Button, Input, PasswordInput } from '../../components/ui';
import { FullScreenLoader } from '../../components/common/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useForm from '../../hooks/useForm';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { homeFor } from '../../utils/constants';

const validate = ({ name, email, password, confirmPassword }) => ({
  name: !name.trim() ? 'Name is required' : name.trim().length < 2 ? 'Name must be at least 2 characters' : '',
  email: !email.trim() ? 'Email is required' : !/^\S+@\S+\.\S+$/.test(email) ? 'Enter a valid email address' : '',
  password: !password ? 'Password is required'
    : password.length < 8 ? 'Use at least 8 characters'
      : !/[A-Za-z]/.test(password) || !/\d/.test(password) ? 'Password must contain a letter and a number' : '',
  confirmPassword: !confirmPassword ? 'Confirm your password' : password !== confirmPassword ? 'Passwords do not match' : '',
});

export default function RegisterPage() {
  useDocumentTitle('Create intern account');
  const { register, isAuthenticated, booting, role } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const form = useForm({
    initialValues: { name: '', email: '', password: '', confirmPassword: '' },
    validate,
    onSubmit: async ({ name, email, password }) => {
      const user = await register({ name: name.trim(), email: email.trim(), password });
      toast.success(`Account created. Welcome, ${user.name.split(' ')[0]}!`);
      navigate(homeFor(user.role), { replace: true });
    },
  });

  if (booting) return <FullScreenLoader />;
  if (isAuthenticated) return <Navigate to={homeFor(role)} replace />;

  return (
    <AuthLayout>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create your intern account</h1>
        <p className="mt-2 text-sm text-muted">Join your internship workspace. Admin accounts are created separately.</p>
      </div>

      <form onSubmit={form.handleSubmit} noValidate className="space-y-4">
        {form.formError && (
          <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{form.formError}
          </div>
        )}
        <Input label="Full name" name="name" autoComplete="name" placeholder="Your full name"
          leftIcon={UserRound} value={form.values.name} onChange={form.handleChange} error={form.errors.name} required />
        <Input label="Email" name="email" type="email" autoComplete="email" placeholder="you@company.com"
          leftIcon={Mail} value={form.values.email} onChange={form.handleChange} error={form.errors.email} required />
        <PasswordInput label="Password" name="password" autoComplete="new-password" placeholder="At least 8 characters"
          hint="Use at least 8 characters, including a letter and a number."
          value={form.values.password} onChange={form.handleChange} error={form.errors.password} required />
        <PasswordInput label="Confirm password" name="confirmPassword" autoComplete="new-password" placeholder="Enter your password again"
          value={form.values.confirmPassword} onChange={form.handleChange} error={form.errors.confirmPassword} required />
        <Button type="submit" size="lg" className="w-full" loading={form.submitting}>
          {form.submitting ? 'Creating account...' : 'Create intern account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account? <Link to="/login" className="font-medium text-link hover:underline">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
