import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@workspace/ui/components/command';

const genres = ['Action', 'Animation', 'Comedy', 'Drama'];

const renderCommand = (onSelect: (genre: string) => void = () => {}) =>
	render(
		<Command>
			<CommandInput placeholder="Search genres..." />
			<CommandList>
				<CommandEmpty>No genres found.</CommandEmpty>
				<CommandGroup heading="Genres">
					{genres.map((genre) => (
						<CommandItem key={genre} value={genre} onSelect={onSelect}>
							{genre}
						</CommandItem>
					))}
				</CommandGroup>
			</CommandList>
		</Command>,
	);

const shown = () => screen.queryAllByRole('option').map((option) => option.textContent);

describe('command', () => {
	it('filters as the user types', async () => {
		const user = userEvent.setup();
		renderCommand();
		expect(shown()).toEqual(genres);

		await user.type(screen.getByPlaceholderText('Search genres...'), 'dra');

		await waitFor(() => expect(shown()).toEqual(['Drama']));
	});

	it('says when nothing matches', async () => {
		const user = userEvent.setup();
		renderCommand();

		await user.type(screen.getByPlaceholderText('Search genres...'), 'western');

		expect(await screen.findByText('No genres found.')).toBeTruthy();
		expect(shown()).toEqual([]);
	});

	it('chooses a filtered item with the arrow keys and Enter', async () => {
		const user = userEvent.setup();
		const onSelect = vi.fn();
		renderCommand(onSelect);

		await user.type(screen.getByPlaceholderText('Search genres...'), 'a');
		await user.keyboard('{ArrowDown}{Enter}');

		expect(onSelect).toHaveBeenCalledWith('Animation');
	});
});
