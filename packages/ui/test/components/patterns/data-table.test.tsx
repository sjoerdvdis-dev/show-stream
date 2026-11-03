import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataTable, type DataTableColumn, type DataTableProps } from '@workspace/ui/patterns/data-table';

type User = { id: number; name: string; role: string };

const users: User[] = [
	{ id: 1, name: 'Ada', role: 'Admin' },
	{ id: 2, name: 'Grace', role: 'Viewer' },
];

const columns: DataTableColumn<User>[] = [
	{ id: 'name', header: 'Name', cell: (user) => user.name, sortable: true },
	{ id: 'role', header: 'Role', cell: (user) => user.role },
];

const renderTable = (props: Partial<DataTableProps<User>> = {}) =>
	render(<DataTable caption="Users" columns={columns} rows={users} getRowId={(user) => String(user.id)} {...props} />);

describe('DataTable', () => {
	it('shows its rows in a table named by its caption', () => {
		renderTable();

		const table = screen.getByRole('table', { name: 'Users' });
		const rows = within(table).getAllByRole('row');
		expect(rows).toHaveLength(3);
		expect(
			within(rows[1]!)
				.getAllByRole('cell')
				.map((cell) => cell.textContent),
		).toEqual(['Ada', 'Admin']);
	});

	it('asks for a sort from a sortable header by keyboard, and marks the sorted column', async () => {
		const user = userEvent.setup();
		const onSortChange = vi.fn();
		const { rerender } = renderTable({ onSortChange });

		expect(within(screen.getByRole('columnheader', { name: 'Role' })).queryByRole('button')).toBeNull();
		await user.tab();
		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Name' }));
		await user.keyboard('{Enter}');
		expect(onSortChange).toHaveBeenLastCalledWith({ column: 'name', direction: 'ascending' });

		rerender(
			<DataTable
				caption="Users"
				columns={columns}
				rows={users}
				getRowId={(user) => String(user.id)}
				sort={{ column: 'name', direction: 'ascending' }}
				onSortChange={onSortChange}
			/>,
		);
		expect(screen.getByRole('columnheader', { name: 'Name' }).getAttribute('aria-sort')).toBe('ascending');
		expect(screen.getByRole('columnheader', { name: 'Role' }).hasAttribute('aria-sort')).toBe(false);
		await user.keyboard(' ');
		expect(onSortChange).toHaveBeenLastCalledWith({ column: 'name', direction: 'descending' });
	});

	it('keeps its headers while loading, and says that it is loading', () => {
		renderTable({ rows: [], loading: true, loadingLabel: 'Loading users' });

		const table = screen.getByRole('table', { name: 'Users' });
		expect(table.getAttribute('aria-busy')).toBe('true');
		expect(screen.getByRole('columnheader', { name: 'Role' })).toBeTruthy();
		expect(screen.getByRole('status').textContent).toBe('Loading users');
		expect(within(table).getAllByRole('row')).toHaveLength(1);
	});

	it('says so when there are no rows', () => {
		renderTable({ rows: [], empty: { title: 'No users yet', description: 'Invite someone to share the library.' } });

		expect(screen.getByRole('heading', { name: 'No users yet' })).toBeTruthy();
		expect(screen.getByText('Invite someone to share the library.')).toBeTruthy();
	});

	it('announces an error in place of its rows, and retries by keyboard', async () => {
		const user = userEvent.setup();
		const onRetry = vi.fn();
		renderTable({ error: { title: 'Could not load the users', onRetry } });

		expect(screen.getByRole('alert').textContent).toContain('Could not load the users');
		expect(screen.queryByRole('cell', { name: 'Ada' })).toBeNull();
		screen.getByRole('button', { name: 'Try again' }).focus();
		await user.keyboard('{Enter}');
		expect(onRetry).toHaveBeenCalledOnce();
	});
});
