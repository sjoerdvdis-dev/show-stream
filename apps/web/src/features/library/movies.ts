import { queryOptions } from '@tanstack/react-query';
import { libraryKey, type LibrarySource } from '@/features/library/use-library-list';
import { api, movieImageUrl } from '@/lib/api';

/** The movie library, for the generic list. Shows get a source of their own in Phase 6. */
export const movieLibrary: LibrarySource = {
	key: 'movies',
	list: (query) => api.libraryMovies({ query }),
	facets: () => api.libraryMovieFacets(),
	href: (id) => `/movies/${id}`,
	imageUrl: movieImageUrl,
};

/** One movie's full payload, for its page. */
export const movieQuery = (id: number) =>
	queryOptions({
		queryKey: [...libraryKey, 'movies', 'detail', id],
		queryFn: () => api.movie({ params: { id } }),
	});
