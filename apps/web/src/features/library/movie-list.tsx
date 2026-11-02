import { queryOptions, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { api } from '@/lib/api';

const moviesQuery = queryOptions({ queryKey: ['movies'], queryFn: () => api.movies() });

/** Thin on purpose. Phase 2 item 6 replaces this. */
export const MovieList = () => {
	const { data, isPending, isError } = useQuery(moviesQuery);

	if (isPending) return <p>Loading…</p>;
	if (isError) return <p role="alert">Could not load the library.</p>;
	if (data.movies.length === 0) return <p>The library is empty.</p>;

	return (
		<ul className="flex flex-col gap-2">
			{data.movies.map(({ details, transcodeStatus }) => (
				<li key={details.id} className="flex flex-wrap items-baseline gap-x-2">
					<Link to="/watch/$id" params={{ id: details.id }} className="underline">
						{details.title}
					</Link>
					{transcodeStatus ? <span className="text-sm opacity-70">{transcodeStatus}</span> : null}
				</li>
			))}
		</ul>
	);
};
