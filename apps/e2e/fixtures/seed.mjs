// Runs once, after the API has migrated the throwaway database. Adds the movie in
// fixtures/clip.mp4, and a movie with no video, which cannot be prepared.
import { closeDatabase, openDatabase, saveMovie } from '@workspace/db';

const db = openDatabase(process.env.DATABASE_PATH);

const addMovie = (id, title) => {
	const details = {
		id,
		title,
		overview: 'A generated test clip.',
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
	};

	const metadata = {
		details,
		credits: { cast: [], crew: [{ job: 'Director', name: 'Test Director' }] },
		images: { posters: [{ file_path: '/none.jpg' }], logos: [{ file_path: '/none.png' }], backdrops: [] },
	};

	saveMovie(db, { tmdbId: id, path: `movies/${title} (2024)`, metadata });
};

addMovie(550001, 'Demo Movie');
addMovie(550002, 'Missing Video');

closeDatabase(db);
