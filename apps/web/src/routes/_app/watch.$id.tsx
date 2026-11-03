import { createFileRoute, notFound } from '@tanstack/react-router';
import { endpoints } from '@workspace/contract/endpoints';
import { BackLink, PageContainer } from '@workspace/ui/patterns/page';
import { Player } from '@/features/player/player';

const WatchPage = () => {
	const { id } = Route.useParams();

	return (
		<PageContainer>
			<BackLink href="/movies" label="Movies" />
			<Player key={id} id={id} />
		</PageContainer>
	);
};

export const Route = createFileRoute('/_app/watch/$id')({
	params: {
		// An id that is not a TMDB id, such as `abc`, is a page that does not exist.
		parse: ({ id }) => {
			const parsed = endpoints.transcodePlaylist.params.safeParse({ id });
			if (!parsed.success) throw notFound();
			return { id: parsed.data.id };
		},
		stringify: ({ id }) => ({ id: String(id) }),
	},
	component: WatchPage,
});
