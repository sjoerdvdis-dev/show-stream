import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MediaImage } from '@workspace/ui/patterns/media-image';

describe('MediaImage', () => {
	it('shows the image once it loads', () => {
		render(<MediaImage src="/posters/heat.jpg" alt="Heat" />);

		const image = screen.getByRole('img', { name: 'Heat' });
		fireEvent.load(image);
		expect(image.getAttribute('src')).toBe('/posters/heat.jpg');
	});

	it('falls back, keeping its name, when the image fails to load', () => {
		render(<MediaImage src="/posters/missing.jpg" alt="Heat" />);

		fireEvent.error(screen.getByRole('img', { name: 'Heat' }));

		const fallback = screen.getByRole('img', { name: 'Heat' });
		expect(fallback.tagName).not.toBe('IMG');
		expect(fallback.textContent).toContain('Heat');
	});

	it('falls back when there is no image', () => {
		render(<MediaImage src={undefined} alt="Heat" />);

		expect(screen.getByRole('img', { name: 'Heat' }).tagName).not.toBe('IMG');
	});

	it('tries again when it is given another image', () => {
		const { rerender } = render(<MediaImage src="/posters/missing.jpg" alt="Heat" />);
		fireEvent.error(screen.getByRole('img', { name: 'Heat' }));

		rerender(<MediaImage src="/posters/heat.jpg" alt="Heat" />);

		expect(screen.getByRole('img', { name: 'Heat' }).getAttribute('src')).toBe('/posters/heat.jpg');
	});

	it('hides a decorative image and its fallback from assistive technology', () => {
		render(<MediaImage src={null} alt="" />);

		expect(screen.queryByRole('img')).toBeNull();
	});
});
