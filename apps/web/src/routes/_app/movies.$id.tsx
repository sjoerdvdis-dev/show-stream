import { createFileRoute, notFound } from '@tanstack/react-router';
import { endpoints } from '@workspace/contract/endpoints';
import { MovieDetail } from '@/features/library/movie-detail';

const MoviePage = () => {
	const { id } = Route.useParams();
	return <MovieDetail key={id} id={id} />;
};

export const Route = createFileRoute('/_app/movies/$id')({
	params: {
		// An id that is not a TMDB id, such as `abc`, is a page that does not exist.
		parse: ({ id }) => {
			const parsed = endpoints.movie.params.safeParse({ id });
			if (!parsed.success) throw notFound();
			return { id: parsed.data.id };
		},
		stringify: ({ id }) => ({ id: String(id) }),
	},
	component: MoviePage,
});
