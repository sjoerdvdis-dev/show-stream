import { config } from './config';
import { createLogger } from './log';
import { createServer } from './server';
import { streamVideoFile, transcodePlaylist, transcodeRequest } from './video';
import { getMovie, getMovies, getShows, mediaScan } from './media';
import { removeSocketNotifications, setupSocketNotifications } from './notification';
import { login, register, authenticate, ensureDefaultUser } from './auth';

const logger = createLogger();

// API Routes

const { httpServer, io } = createServer(
	{
		register: ({ body }) => register(body),
		login: ({ body }) => login(body),
		authenticate: ({ body }) => authenticate(body),
		scan: async () => {
			await mediaScan(config.mediaFolder, logger);
			return 'Successfully scanned media folder';
		},
		transcodeRequest: ({ params }) => transcodeRequest({ id: params.id, logger }),
		transcodePlaylist: ({ params }) => transcodePlaylist({ id: params.id, logger }),
		stream: ({ params }, res) => streamVideoFile({ ...params, res }),
		movies: () => getMovies(),
		shows: () => getShows(),
		movie: ({ params }) => getMovie({ id: params.id }),
	},
	logger,
);

// Socket.io Setup

io.on('connection', (socket) => {
	logger.info(`New socket connection: ${socket.id}`);
	setupSocketNotifications(socket);

	socket.on('disconnect', () => {
		logger.info(`Socket disconnected: ${socket.id}`);
		removeSocketNotifications(socket);
	});
});

// HTTP Setup

// Importing `./db` has applied the migrations, so the server only listens on a current schema.
const start = async () => {
	// Create TEMP user
	await ensureDefaultUser();

	httpServer.listen(config.port, () => {
		logger.log('info', `API server is running on port ${config.port}`);
	});
};

start().catch((error: unknown) => {
	console.error('The API cannot start:', error);
	process.exit(1);
});
