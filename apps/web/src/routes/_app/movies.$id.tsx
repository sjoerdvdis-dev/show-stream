import { createFileRoute } from '@tanstack/react-router';
import { endpoints } from '@workspace/contract/endpoints';
import { MovieDetail } from '@/features/library/movie-detail';

const MoviePage = () => {
	const { id } = Route.useParams();
	return <MovieDetail key={id} id={id} />;
};

export const Route = createFileRoute('/_app/movies/$id')({
	params: {
		parse: ({ id }) => ({ id: endpoints.movie.params.parse({ id }).id }),
		stringify: ({ id }) => ({ id: String(id) }),
	},
	component: MoviePage,
});
