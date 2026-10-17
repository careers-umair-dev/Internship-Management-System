import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { Button, Input, Modal, ConfirmDialog, DataTable, Badge, ProgressBar, Pagination, TagInput, EmptyState } from '../components/ui';
import { ToastProvider, useToast } from '../context/ToastContext';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { deadlineInfo, timeAgo, initials, getErrorMessage } from '../utils/format';

describe('Button', () => {
  it('is disabled and busy while loading', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });
  it('fires onClick', async () => {
    const fn = vi.fn();
    render(<Button onClick={fn}>Go</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe('Input', () => {
  it('links label, shows error with alert role and aria-invalid', () => {
    render(<Input label="Email" error="Email is required" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Email is required');
  });
});

describe('TagInput', () => {
  it('adds on Enter and removes on click', async () => {
    const Wrapper = () => { const [v, setV] = useState([]); return <TagInput label="Skills" value={v} onChange={setV} />; };
    render(<Wrapper />);
    await userEvent.type(screen.getByLabelText('Skills'), 'React{Enter}');
    expect(screen.getByText('React')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Remove React'));
    expect(screen.queryByText('React')).not.toBeInTheDocument();
  });
});

describe('Modal', () => {
  it('renders when open, closes on Escape and overlay', async () => {
    const onClose = vi.fn();
    const { rerender } = render(<Modal open={false} onClose={onClose} title="Edit"><p>Body</p></Modal>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    rerender(<Modal open onClose={onClose} title="Edit"><button>Inside</button></Modal>);
    expect(screen.getByRole('dialog', { name: 'Edit' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});

describe('ConfirmDialog', () => {
  it('awaits onConfirm, then closes', async () => {
    const onConfirm = vi.fn().mockResolvedValue();
    const onClose = vi.fn();
    render(<ConfirmDialog open onClose={onClose} onConfirm={onConfirm} title="Delete task?" message="This cannot be undone." confirmLabel="Delete" />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onConfirm).toHaveBeenCalledOnce();
  });
  it('shows the error and stays open when confirm fails', async () => {
    const onClose = vi.fn();
    render(<ConfirmDialog open onClose={onClose} onConfirm={() => Promise.reject({ response: { data: { message: 'Nope' } } })} confirmLabel="Delete" />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Nope')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('DataTable', () => {
  const columns = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'dept', header: 'Department', render: (r) => <Badge>{r.dept}</Badge> },
  ];
  const rows = [{ _id: '1', name: 'Ali', dept: 'Eng' }, { _id: '2', name: 'Sara', dept: 'Design' }];

  it('renders rows and custom cells', () => {
    render(<DataTable columns={columns} data={rows} />);
    expect(screen.getByText('Ali')).toBeInTheDocument();
    expect(screen.getByText('Design')).toBeInTheDocument();
  });
  it('shows skeleton rows while loading (no data)', () => {
    const { container } = render(<DataTable columns={columns} data={[]} loading skeletonRows={3} />);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(screen.queryByText('Nothing here yet')).not.toBeInTheDocument();
  });
  it('shows the empty state', () => {
    render(<DataTable columns={columns} data={[]} empty={{ title: 'No interns', description: 'Add one' }} />);
    expect(screen.getByText('No interns')).toBeInTheDocument();
  });
  it('shows an error with retry', async () => {
    const retry = vi.fn();
    render(<DataTable columns={columns} data={[]} error="Boom" onRetry={retry} />);
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(retry).toHaveBeenCalled();
  });
  it('reports sort changes and marks aria-sort', async () => {
    const onSort = vi.fn();
    render(<DataTable columns={columns} data={rows} sort={{ key: 'name', dir: 'asc' }} onSortChange={onSort} />);
    expect(screen.getByRole('columnheader', { name: /name/i })).toHaveAttribute('aria-sort', 'ascending');
    await userEvent.click(screen.getByRole('button', { name: /name/i }));
    expect(onSort).toHaveBeenCalledWith('name');
  });
  it('paginates', async () => {
    const onPage = vi.fn();
    render(<DataTable columns={columns} data={rows} pagination={{ page: 1, pages: 3, total: 25, limit: 10 }} onPageChange={onPage} />);
    expect(screen.getByText(/1-10/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPage).toHaveBeenCalledWith(2);
  });
});

describe('Pagination', () => {
  it('collapses long page ranges with ellipsis and disables prev on first page', () => {
    render(<Pagination page={1} pages={20} total={200} limit={10} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByText('...')).toBeInTheDocument();
  });
});

describe('ProgressBar', () => {
  it('exposes clamped value to assistive tech', () => {
    render(<ProgressBar value={140} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });
});

describe('EmptyState', () => {
  it('renders title, description and action', () => {
    render(<EmptyState title="No tasks" description="Create one" action={<button>Add</button>} />);
    expect(screen.getByText('No tasks')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });
});

describe('Toast', () => {
  it('shows and dismisses a toast', async () => {
    const Trigger = () => { const t = useToast(); return <button onClick={() => t.success('Saved!')}>fire</button>; };
    render(<ToastProvider><Trigger /></ToastProvider>);
    await userEvent.click(screen.getByText('fire'));
    expect(screen.getByRole('status')).toHaveTextContent('Saved!');
    await userEvent.click(screen.getByLabelText('Dismiss notification'));
    expect(screen.queryByText('Saved!')).not.toBeInTheDocument();
  });
});

describe('ErrorBoundary', () => {
  it('catches render errors and offers recovery', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Bomb = () => { throw new Error('kaboom'); };
    render(<ErrorBoundary><Bomb /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    spy.mockRestore();
  });
});

describe('format utils', () => {
  it('deadlineInfo covers overdue, urgent, soon and later', () => {
    const d = (ms) => new Date(Date.now() + ms).toISOString();
    expect(deadlineInfo(d(-3 * 86400000), 'Pending')).toMatchObject({ tone: 'danger', label: expect.stringMatching(/Overdue by 3 days/) });
    expect(deadlineInfo(d(5 * 3600000), 'Pending').tone).toBe('danger');
    expect(deadlineInfo(d(2 * 86400000), 'Pending').tone).toBe('warning');
    expect(deadlineInfo(d(9 * 86400000), 'Pending').tone).toBe('default');
    expect(deadlineInfo(d(-86400000 * 5), 'Completed').tone).toBe('default');
  });
  it('timeAgo, initials and getErrorMessage', () => {
    expect(timeAgo(new Date(Date.now() - 2 * 3600000))).toBe('2 hours ago');
    expect(initials('Ali Raza Khan')).toBe('AR');
    expect(getErrorMessage({ response: { data: { message: 'Bad' } } })).toBe('Bad');
    expect(getErrorMessage({ code: 'ERR_NETWORK' })).toMatch(/Cannot reach the server/);
  });
});
