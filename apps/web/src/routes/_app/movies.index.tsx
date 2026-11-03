import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { LibraryScreen } from '@/features/library/library-screen';
import { libraryDefaults, validateLibrarySearch } from '@/features/library/library-search';
import { movieLibrary } from '@/features/library/movies';

const MoviesPage = () => {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();

	return (
		<LibraryScreen
			title="Movies"
			source={movieLibrary}
			search={search}
			onSearchChange={(update, { replace } = {}) => void navigate({ search: update, replace })}
		/>
	);
};

export const Route = createFileRoute('/_app/movies/')({
	validateSearch: validateLibrarySearch,
	search: { middlewares: [stripSearchParams(libraryDefaults)] },
	component: MoviesPage,
});
