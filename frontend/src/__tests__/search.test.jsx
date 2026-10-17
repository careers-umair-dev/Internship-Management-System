import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderApp, adminUser, adminDash, internUser, internDash } from '../test/utils';
import { authService } from '../services/authService';
import { dashboardService } from '../services/dashboardService';
import { notificationService } from '../services/notificationService';
import { searchService } from '../services/searchService';
import { internService } from '../services/internService';
import { taskService } from '../services/taskService';
import { tokenStore } from '../services/api';

vi.mock('../services/authService', () => ({ authService: { me: vi.fn() } }));
vi.mock('../services/dashboardService', () => ({ dashboardService: { admin: vi.fn(), intern: vi.fn(), internPerformance: vi.fn(), activity: vi.fn() } }));
vi.mock('../services/notificationService', () => ({ notificationService: { unreadCount: vi.fn(), list: vi.fn() } }));
vi.mock('../services/searchService', () => ({ searchService: { search: vi.fn() } }));
vi.mock('../services/internService', () => ({ internService: { list: vi.fn(), get: vi.fn() } }));
vi.mock('../services/taskService', () => ({ taskService: { get: vi.fn(), updateProgress: vi.fn(), list: vi.fn(), board: vi.fn(), categories: vi.fn() } }));

const results = {
  interns: [{ _id: 'i7', name: 'Sara Ahmed', email: 'sara@internhub.com', department: 'Design', status: 'active' }],
  tasks: [{ _id: 't1', title: 'Integrate REST API', status: 'In Progress', priority: 'High', intern: { name: 'Ali Raza' } }],
};

beforeEach(() => {
  vi.resetAllMocks();
  tokenStore.set('t');
  notificationService.unreadCount.mockResolvedValue(0);
  notificationService.list.mockResolvedValue({ items: [], pagination: { total: 0 } });
  dashboardService.admin.mockResolvedValue(adminDash);
  dashboardService.intern.mockResolvedValue(internDash);
  internService.list.mockResolvedValue({ items: [], pagination: { total: 0 } });
  searchService.search.mockResolvedValue(results);
  taskService.get.mockResolvedValue({ task: { _id: 't1', title: 'Integrate REST API', status: 'Pending', priority: 'High', progress: 0, category: 'Dev', deadline: new Date().toISOString(), assignedBy: { name: 'Ayesha' } }, submissions: [], feedback: [] });
});

describe('global search', () => {
  it('admin: searches after typing, groups interns and tasks, navigates on click', async () => {
    authService.me.mockResolvedValue(adminUser);
    renderApp('/admin/dashboard');
    const box = await screen.findByRole('combobox', { name: /global search/i });
    await userEvent.type(box, 'r');
    expect(await screen.findByText(/type at least 2 characters/i)).toBeInTheDocument();
    expect(searchService.search).not.toHaveBeenCalled();
    await userEvent.type(box, 'a');
    await waitFor(() => expect(searchService.search).toHaveBeenCalledWith('ra'));
    expect(await screen.findByRole('option', { name: /sara ahmed/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /integrate rest api/i })).toBeInTheDocument();
    expect(within(screen.getByRole('listbox')).getByText('Interns')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: /sara ahmed/i }));
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(box).toHaveValue('');
  });

  it('supports keyboard navigation and Escape', async () => {
    authService.me.mockResolvedValue(adminUser);
    renderApp('/admin/dashboard');
    const box = await screen.findByRole('combobox', { name: /global search/i });
    await userEvent.type(box, 'ali');
    await screen.findByRole('option', { name: /sara ahmed/i });
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(screen.getByRole('option', { name: /integrate rest api/i })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('shows an empty state and an error state', async () => {
    authService.me.mockResolvedValue(adminUser);
    renderApp('/admin/dashboard');
    const box = await screen.findByRole('combobox', { name: /global search/i });
    searchService.search.mockResolvedValueOnce({ interns: [], tasks: [] });
    await userEvent.type(box, 'zzz');
    expect(await screen.findByText(/no results for "zzz"/i)).toBeInTheDocument();
    searchService.search.mockRejectedValueOnce(new Error('boom'));
    await userEvent.type(box, 'q');
    expect(await screen.findByRole('alert')).toHaveTextContent(/search failed/i);
  });

  it('intern: only task results are navigated to the intern task page; Ctrl+K focuses', async () => {
    authService.me.mockResolvedValue(internUser);
    searchService.search.mockResolvedValue({ interns: [], tasks: results.tasks });
    renderApp('/intern/dashboard');
    const box = await screen.findByRole('combobox', { name: /global search/i });
    expect(box).toHaveAttribute('placeholder', 'Search your tasks');
    await userEvent.keyboard('{Control>}k{/Control}');
    expect(box).toHaveFocus();
    await userEvent.type(box, 'rest');
    await userEvent.click(await screen.findByRole('option', { name: /integrate rest api/i }));
    expect(await screen.findByRole('heading', { name: 'Integrate REST API' })).toBeInTheDocument();
    expect(screen.queryByText('Interns')).toBeNull();
  });
});
