import { createFileRoute, Link } from '@tanstack/react-router';
import { endpoints } from '@workspace/contract/endpoints';
import { PageContainer } from '@workspace/ui/patterns/page';
import { Player } from '@/features/player/player';

const WatchPage = () => {
	const { id } = Route.useParams();

	return (
		<PageContainer>
			<Link to="/movies" className="underline">
				Back to Movies
			</Link>
			<Player key={id} id={id} />
		</PageContainer>
	);
};

export const Route = createFileRoute('/_app/watch/$id')({
	params: {
		parse: ({ id }) => ({ id: endpoints.transcodePlaylist.params.parse({ id }).id }),
		stringify: ({ id }) => ({ id: String(id) }),
	},
	component: WatchPage,
});
