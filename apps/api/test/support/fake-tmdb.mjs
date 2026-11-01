// Preloaded into the worker process, so that a scan can identify titles offline.
//
// "Scanned Movie" is movie 7001 and "Scanned Movie 2" is movie 7002. "No Match" has no
// result, and "Broken Lookup" answers with an error, as a bad token does.
const baseMovieId = 7000;

const movieIdOf = (query) => baseMovieId + Number(query.match(/\d+$/)?.[0] ?? 1);

const search = (url) => {
	const query = url.searchParams.get('query');
	if (query === 'Broken Lookup') {
		return Response.json({ status_code: 7, status_message: 'Invalid API key: You must be granted a valid key.' }, { status: 401 });
	}
	return Response.json({ results: query === 'No Match' ? [] : [{ id: movieIdOf(query), title: query }] });
};

const details = (url) => {
	const id = Number(url.pathname.split('/').at(-1));
	const title = id === baseMovieId + 1 ? 'Scanned Movie' : `Scanned Movie ${id - baseMovieId}`;
	return Response.json({ id, title, release_date: '2024-01-01' });
};

const answers = [
	[/\/search\/movie$/, search],
	[/\/credits$/, () => Response.json({ cast: [], crew: [] })],
	[/\/images$/, () => Response.json({ posters: [], backdrops: [], logos: [] })],
	[/\/movie\/\d+$/, details],
];

const realFetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
	const url = new URL(input instanceof Request ? input.url : input);
	if (url.hostname !== 'api.themoviedb.org') {
		return realFetch(input, init);
	}
	const answer = answers.find(([pattern]) => pattern.test(url.pathname));
	return answer ? answer[1](url) : Response.json({}, { status: 404 });
};
