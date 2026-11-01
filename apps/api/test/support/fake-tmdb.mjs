// Preloaded into the API process, before tmdb-ts takes its reference to `fetch`. It answers
// TMDB calls with one movie per search, so that a scan can identify a title offline.
const fakeMovieId = 7001;

const answers = [
	[/\/search\/movie$/, (url) => ({ results: [{ id: fakeMovieId, title: url.searchParams.get('query') }] })],
	[/\/credits$/, () => ({ cast: [], crew: [] })],
	[/\/images$/, () => ({ posters: [], backdrops: [], logos: [] })],
	[/\/movie\/\d+$/, () => ({ id: fakeMovieId, title: 'Scanned Movie', release_date: '2024-01-01' })],
];

const realFetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
	const url = new URL(input instanceof Request ? input.url : input);
	if (url.hostname !== 'api.themoviedb.org') {
		return realFetch(input, init);
	}
	const answer = answers.find(([pattern]) => pattern.test(url.pathname));
	return Response.json(answer ? answer[1](url) : {}, { status: answer ? 200 : 404 });
};
