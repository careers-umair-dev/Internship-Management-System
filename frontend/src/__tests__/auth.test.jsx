import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderApp, adminUser, internUser, adminDash, internDash } from '../test/utils';
import { authService } from '../services/authService';
import { dashboardService } from '../services/dashboardService';
import { internService } from '../services/internService';
import { notificationService } from '../services/notificationService';
import { tokenStore } from '../services/api';

vi.mock('../services/authService', () => ({ authService: { login: vi.fn(), me: vi.fn(), updateProfile: vi.fn(), changePassword: vi.fn(), uploadAvatar: vi.fn() } }));
vi.mock('../services/dashboardService', () => ({ dashboardService: { admin: vi.fn(), intern: vi.fn() } }));
vi.mock('../services/internService', () => ({ internService: { list: vi.fn() } }));
vi.mock('../services/notificationService', () => ({ notificationService: { unreadCount: vi.fn(), list: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  notificationService.unreadCount.mockResolvedValue(2);
  notificationService.list.mockResolvedValue({ items: [], unreadCount: 2 });
  internService.list.mockResolvedValue({ items: [], pagination: {} });
  dashboardService.admin.mockResolvedValue(adminDash);
  dashboardService.intern.mockResolvedValue(internDash);
});

const signIn = async (email, password) => {
  await userEvent.type(screen.getByLabelText(/email/i), email);
  await userEvent.type(screen.getByLabelText(/^password/i), password);
  await userEvent.click(screen.getByRole('button', { name: /^sign in as/i }));
};

describe('route protection', () => {
  it('redirects guests from a protected page to /login', async () => {
    renderApp('/admin/dashboard');
    expect(await screen.findByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument();
  });

  it('redirects "/" to login for guests', async () => {
    renderApp('/');
    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });

  it('sends an intern away from admin pages to the intern dashboard', async () => {
    tokenStore.set('t');
    authService.me.mockResolvedValue(internUser);
    renderApp('/admin/dashboard');
    expect(await screen.findByRole('heading', { name: /welcome back, ali/i })).toBeInTheDocument();
    expect(dashboardService.admin).not.toHaveBeenCalled();
  });

  it('shows a 404 page for unknown routes inside the app', async () => {
    tokenStore.set('t');
    authService.me.mockResolvedValue(adminUser);
    renderApp('/admin/does-not-exist');
    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  });
});

describe('login', () => {
  it('validates fields before calling the API', async () => {
    renderApp('/login');
    await userEvent.click(await screen.findByRole('button', { name: /^sign in as/i }));
    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('shows the server error for bad credentials', async () => {
    authService.login.mockRejectedValue({ response: { status: 401, data: { message: 'Invalid email or password' } } });
    renderApp('/login');
    await screen.findByRole('heading', { name: /sign in/i });
    await signIn('admin@internhub.com', 'wrongpass1');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });

  it('logs an admin in and renders live dashboard data', async () => {
    authService.login.mockResolvedValue({ token: 'jwt', user: adminUser });
    renderApp('/login');
    await screen.findByRole('heading', { name: /sign in/i });
    await signIn('admin@internhub.com', 'Admin@123');

    expect(authService.login).toHaveBeenCalledWith('admin@internhub.com', 'Admin@123', 'admin');
    expect(await screen.findByRole('heading', { name: /welcome back, ayesha/i })).toBeInTheDocument();
    expect(await screen.findByText('Total interns')).toBeInTheDocument();
    expect(screen.getByText('Overdue tasks')).toBeInTheDocument();
    expect(screen.getByText('Integrate REST API')).toBeInTheDocument();
    expect(tokenStore.get()).toBe('jwt');
  });

  it('uses the selected role when signing in as an intern', async () => {
    authService.login.mockResolvedValue({ token: 'jwt2', user: internUser });
    renderApp('/login');
    await userEvent.click(await screen.findByRole('tab', { name: /intern/i }));
    await signIn('ali@internhub.com', 'Intern@123');
    expect(authService.login).toHaveBeenCalledWith('ali@internhub.com', 'Intern@123', 'intern');
    expect(await screen.findByRole('heading', { name: /welcome back, ali/i })).toBeInTheDocument();
    expect(await screen.findByText('Assigned tasks')).toBeInTheDocument();
    expect(screen.getByText('Excellent work!')).toBeInTheDocument();
  });
});

describe('session', () => {
  it('restores a saved session on load', async () => {
    tokenStore.set('saved');
    authService.me.mockResolvedValue(adminUser);
    renderApp('/');
    expect(await screen.findByRole('heading', { name: /welcome back, ayesha/i })).toBeInTheDocument();
  });

  it('clears an invalid saved token and shows login', async () => {
    tokenStore.set('stale');
    authService.me.mockRejectedValue({ response: { status: 401 } });
    renderApp('/admin/dashboard');
    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
  });

  it('signs out from the user menu', async () => {
    tokenStore.set('t');
    authService.me.mockResolvedValue(adminUser);
    renderApp('/admin/dashboard');
    await userEvent.click(await screen.findByLabelText('Account menu'));
    await userEvent.click(screen.getByRole('menuitem', { name: /sign out/i }));
    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
  });

  it('ends the session and warns when the API reports an expired token', async () => {
    tokenStore.set('t');
    authService.me.mockResolvedValue(adminUser);
    renderApp('/admin/dashboard');
    await screen.findByRole('heading', { name: /welcome back/i });
    window.dispatchEvent(new CustomEvent('auth:expired'));
    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/session has expired/i)).toBeInTheDocument();
  });
});

describe('dashboard states', () => {
  it('shows an error state with retry when the API fails', async () => {
    tokenStore.set('t');
    authService.me.mockResolvedValue(adminUser);
    dashboardService.admin.mockRejectedValueOnce({ response: { data: { message: 'Server exploded' } } });
    renderApp('/admin/dashboard');
    expect(await screen.findByText('Server exploded')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('Total interns')).toBeInTheDocument();
  });
});

describe('layout', () => {
  it('shows role-specific navigation', async () => {
    tokenStore.set('t');
    authService.me.mockResolvedValue(adminUser);
    renderApp('/admin/dashboard');
    const nav = await screen.findByRole('navigation', { name: /main navigation/i });
    ['Dashboard', 'Interns', 'Tasks', 'Submissions', 'Reports', 'Settings'].forEach((l) => expect(nav).toHaveTextContent(l));
    expect(nav).not.toHaveTextContent('My Tasks');
    expect(nav.querySelector('a[href="/admin/interns"]')).not.toBeNull();
  });

  it('intern navigation links to all intern pages and none of the admin pages', async () => {
    tokenStore.set('t');
    authService.me.mockResolvedValue(internUser);
    renderApp('/intern/dashboard');
    const nav = await screen.findByRole('navigation', { name: /main navigation/i });
    ['/intern/tasks', '/intern/submissions', '/intern/feedback', '/intern/progress', '/intern/settings'].forEach((h) => expect(nav.querySelector(`a[href="${h}"]`)).not.toBeNull());
    expect(nav.querySelector('a[href^="/admin"]')).toBeNull();
    expect(nav).not.toHaveTextContent('Interns');
  });

  it('shows the unread notification count', async () => {
    tokenStore.set('t');
    authService.me.mockResolvedValue(adminUser);
    renderApp('/admin/dashboard');
    expect(await screen.findByLabelText(/notifications, 2 unread/i)).toBeInTheDocument();
  });

  it('toggles dark mode and persists it', async () => {
    tokenStore.set('t');
    authService.me.mockResolvedValue(adminUser);
    renderApp('/admin/dashboard');
    await userEvent.click(await screen.findByLabelText('Change theme'));
    await userEvent.click(screen.getByRole('menuitemradio', { name: /dark/i }));
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    expect(localStorage.getItem('iph_theme')).toBe('dark');
  });
});

describe('settings', () => {
  it('validates the password form client-side', async () => {
    tokenStore.set('t');
    authService.me.mockResolvedValue(internUser);
    renderApp('/intern/settings');
    await userEvent.click(await screen.findByRole('tab', { name: /security/i }));
    await userEvent.type(screen.getByLabelText('Current password'), 'Intern@123');
    await userEvent.type(screen.getByLabelText('New password'), 'short');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'different');
    await userEvent.click(screen.getByRole('button', { name: /update password/i }));
    expect(await screen.findByText('Use at least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(authService.changePassword).not.toHaveBeenCalled();
  });

  it('saves profile changes', async () => {
    tokenStore.set('t');
    authService.me.mockResolvedValue(internUser);
    authService.updateProfile.mockResolvedValue({ ...internUser, name: 'Ali R' });
    renderApp('/intern/settings');
    const name = await screen.findByLabelText(/full name/i);
    await userEvent.clear(name);
    await userEvent.type(name, 'Ali R');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(authService.updateProfile).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ali R' })));
    expect(await screen.findByText('Profile updated')).toBeInTheDocument();
  });
});
