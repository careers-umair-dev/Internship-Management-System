import { BarChart3, CheckCircle2, Bell, ShieldCheck } from 'lucide-react';
import Logo from '../assets/Logo';
import ThemeToggle from '../components/common/ThemeToggle';

const FEATURES = [
  { icon: CheckCircle2, text: 'Assign tasks, track deadlines and priorities' },
  { icon: BarChart3, text: 'Live analytics on intern progress and performance' },
  { icon: Bell, text: 'Instant notifications for reviews and feedback' },
  { icon: ShieldCheck, text: 'Secure, role-based access for admins and interns' },
];

export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30">
            <svg viewBox="0 0 32 32" className="h-5 w-5"><path d="M9 21l5-5 3 3 6-7" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <span className="text-xl font-semibold tracking-tight">InternHub</span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">Manage your internship program with clarity.</h2>
          <p className="mt-4 text-indigo-100">One workspace to onboard interns, review their work and measure real progress.</p>
          <ul className="mt-10 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-indigo-50">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20"><Icon className="h-4 w-4" /></span>{text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-indigo-200">&copy; {new Date().getFullYear()} InternHub. All rights reserved.</p>
      </aside>
      <main className="relative flex items-center justify-center bg-background px-5 py-12">
        <div className="absolute right-4 top-4"><ThemeToggle /></div>
        <div className="w-full max-w-md animate-slide-up">
          <Logo className="mb-10 lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}
