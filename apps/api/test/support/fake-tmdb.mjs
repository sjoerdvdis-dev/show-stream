// Preloaded into the worker process, so that a scan can identify titles offline.
//
// "Scanned Movie" is movie 7001 and "Scanned Movie 2" is movie 7002. "No Match" has no
// result, and "Broken Lookup" answers with an error, as a bad token does.
//
// Every identified movie has a poster and a backdrop. "Broken Art" (movie 7900) has a poster
// that TMDB refuses, and "Slow Art" (movie 7950) has a poster that starts to download and never
// finishes. "No Art" (movie 7990) has none at all.
const baseMovieId = 7000;

const specialMovies = { 'Broken Art': 7900, 'Slow Art': 7950, 'No Art': 7990 };

const movieIdOf = (query) => specialMovies[query] ?? baseMovieId + Number(query.match(/\d+$/)?.[0] ?? 1);

const titleOf = (id) => {
	const special = Object.entries(specialMovies).find(([, specialId]) => specialId === id);
	if (special) {
		return special[0];
	}
	return id === baseMovieId + 1 ? 'Scanned Movie' : `Scanned Movie ${id - baseMovieId}`;
};

const search = (url) => {
	const query = url.searchParams.get('query');
	if (query === 'Broken Lookup') {
		return Response.json({ status_code: 7, status_message: 'Invalid API key: You must be granted a valid key.' }, { status: 401 });
	}
	return Response.json({ results: query === 'No Match' ? [] : [{ id: movieIdOf(query), title: query }] });
};

const details = (url) => {
	const id = Number(url.pathname.split('/').at(-1));
	const art = id === specialMovies['No Art'] ? {} : { poster_path: `/poster-${id}.jpg`, backdrop_path: `/backdrop-${id}.jpg` };
	return Response.json({ id, title: titleOf(id), release_date: '2024-01-01', genres: [{ id: 18, name: 'Drama' }], ...art });
};

const answers = [
	[/\/search\/movie$/, search],
	[/\/credits$/, () => Response.json({ cast: [], crew: [] })],
	[/\/images$/, () => Response.json({ posters: [], backdrops: [], logos: [] })],
	[/\/movie\/\d+$/, details],
];

/** Starts every image, so that it reads as a JPEG. */
const jpegStart = [0xff, 0xd8, 0xff, 0xe0];

let imageRequests = 0;

/**
 * Each answer carries its size, file and a count of the images this process has served, so a
 * test can tell a stored image from one fetched again.
 */
const image = (url) => {
	imageRequests += 1;
	const [, , , size, file] = url.pathname.split('/');
	if (file === `poster-${specialMovies['Broken Art']}.jpg`) {
		return new Response('Not found', { status: 404 });
	}
	const body = new Uint8Array([...jpegStart, ...new TextEncoder().encode(`${size} ${file} request ${imageRequests}`)]);
	if (file === `poster-${specialMovies['Slow Art']}.jpg`) {
		const neverEnds = new ReadableStream({
			start: (controller) => controller.enqueue(body),
		});
		return new Response(neverEnds, { headers: { 'content-type': 'image/jpeg' } });
	}
	return new Response(body, { headers: { 'content-type': 'image/jpeg' } });
};

const realFetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
	const url = new URL(input instanceof Request ? input.url : input);
	if (url.hostname === 'image.tmdb.org') {
		return image(url);
	}
	if (url.hostname !== 'api.themoviedb.org') {
		return realFetch(input, init);
	}
	const answer = answers.find(([pattern]) => pattern.test(url.pathname));
	return answer ? answer[1](url) : Response.json({}, { status: 404 });
};
