import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Pager } from '@workspace/ui/patterns/pager';

const PagedList = ({ start = 1, pageCount = 3 }: { start?: number; pageCount?: number }) => {
	const [page, setPage] = useState(start);
	return <Pager page={page} pageCount={pageCount} onPageChange={setPage} label="Movies pages" />;
};

describe('Pager', () => {
	it('moves a page at a time by keyboard, and stops at either end', async () => {
		const user = userEvent.setup();
		render(<PagedList />);

		const pages = screen.getByRole('navigation', { name: 'Movies pages' });
		expect(pages.textContent).toContain('Page 1 of 3');
		expect(screen.getByRole('button', { name: 'Previous page' }).hasAttribute('disabled')).toBe(true);

		await user.tab();
		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next page' }));
		await user.keyboard('{Enter}');
		await user.keyboard('{Enter}');

		expect(pages.textContent).toContain('Page 3 of 3');
		expect(screen.getByRole('button', { name: 'Next page' }).hasAttribute('disabled')).toBe(true);

		await user.click(screen.getByRole('button', { name: 'Previous page' }));
		expect(pages.textContent).toContain('Page 2 of 3');
	});

	it('hides itself when there is one page', () => {
		render(<PagedList pageCount={1} />);

		expect(screen.queryByRole('navigation')).toBeNull();
	});
});
