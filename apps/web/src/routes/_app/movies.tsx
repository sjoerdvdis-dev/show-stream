import { createFileRoute } from '@tanstack/react-router';
import { MovieList } from '@/features/library/movie-list';

const MoviesPage = () => (
	<>
		<h1 className="mb-4 text-2xl font-semibold">Movies</h1>
		<MovieList />
	</>
);

export const Route = createFileRoute('/_app/movies')({ component: MoviesPage });
