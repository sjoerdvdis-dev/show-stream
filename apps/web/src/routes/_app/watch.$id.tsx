import { createFileRoute, Link } from '@tanstack/react-router';
import { endpoints } from '@workspace/contract/endpoints';
import { Player } from '@/features/player/player';

const WatchPage = () => {
	const { id } = Route.useParams();

	return (
		<div className="flex flex-col gap-4">
			<Link to="/movies" className="underline">
				Back to Movies
			</Link>
			<Player key={id} id={id} />
		</div>
	);
};

export const Route = createFileRoute('/_app/watch/$id')({
	params: {
		parse: ({ id }) => ({ id: endpoints.transcodePlaylist.params.parse({ id }).id }),
		stringify: ({ id }) => ({ id: String(id) }),
	},
	component: WatchPage,
});
