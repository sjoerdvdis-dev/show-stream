// Preloaded into the worker through NODE_OPTIONS, so that a scan can identify titles and store
// their art with no network. It knows the folders in compose.yml, and has no match for "Unknown Film".
const movies = {
	'Demo Movie': 550001,
	'Corrupt Movie': 550003,
	'Scanned Movie': 550004,
};

const details = (id) => ({
	id,
	title: Object.entries(movies).find(([, movieId]) => movieId === id)?.[0],
	overview: 'Found by a scan.',
	tagline: 'A test',
	release_date: '2024-01-01',
	runtime: 1,
	vote_average: 7.5,
	vote_count: 100,
	popularity: 1,
	poster_path: '/none.jpg',
	backdrop_path: '/none.jpg',
	imdb_id: 'tt0000000',
	genres: [{ id: 1, name: 'Drama' }],
	production_companies: [{ id: 1, name: 'Test Studio' }],
});

const art = (file_path) => ({ file_path, iso_639_1: 'en' });

const answers = [
	[
		/\/search\/movie$/,
		(url) => {
			const id = movies[url.searchParams.get('query')];
			return { results: id ? [{ id }] : [] };
		},
	],
	[/\/credits$/, () => ({ cast: [], crew: [{ job: 'Director', name: 'Test Director' }] })],
	[/\/images$/, () => ({ posters: [art('/none.jpg')], backdrops: [], logos: [art('/none.png')] })],
	[/\/movie\/\d+$/, (url) => details(Number(url.pathname.split('/').at(-1)))],
];

const realFetch = globalThis.fetch;

/** The start of a JPEG, which is all a scan needs to store an image. */
const image = () => new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), { headers: { 'content-type': 'image/jpeg' } });

globalThis.fetch = async (input, init) => {
	const url = new URL(input instanceof Request ? input.url : input);
	if (url.hostname === 'image.tmdb.org') {
		return image();
	}
	if (url.hostname !== 'api.themoviedb.org') {
		return realFetch(input, init);
	}
	const answer = answers.find(([pattern]) => pattern.test(url.pathname));
	return Response.json(answer ? answer[1](url) : {}, { status: answer ? 200 : 404 });
};
