import { queryOptions } from '@tanstack/react-query';
import type { ImageKind, LibraryMovie } from '@workspace/contract/library';
import { libraryKey, type LibrarySource } from '@/features/library/use-library-list';
import { api, movieImageUrl } from '@/lib/api';

/** The movie library, for the generic list. Shows get a source of their own in Phase 6. */
export const movieLibrary: LibrarySource = {
	key: 'movies',
	noun: { one: 'movie', many: 'movies' },
	list: (query) => api.libraryMovies({ query }),
	facets: () => api.libraryMovieFacets(),
	href: (id) => `/movies/${id}`,
	imageUrl: movieImageUrl,
};

/** One movie's page: its card, tagline, overview and why preparing it failed. */
export const movieQuery = (id: number) =>
	queryOptions({
		queryKey: [...libraryKey, movieLibrary.key, 'detail', id],
		queryFn: () => api.libraryMovie({ params: { id } }),
	});

/** The URL of a title's art, or null when the library says it has none, so that none is asked for. */
export const movieArt = (movie: Pick<LibraryMovie, 'id' | 'hasPoster' | 'hasBackdrop'>, kind: ImageKind) =>
	(kind === 'poster' ? movie.hasPoster : movie.hasBackdrop) ? movieImageUrl(movie.id, kind) : null;
