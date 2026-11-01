import { config } from './config';
import { createLogger } from './log';
import { createServer } from './server';
import { setupDb } from './db';
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

// Database Setup

setupDb().then(async (connected: boolean) => {
	if (!connected) {
		logger.log('error', 'Failed to connect to MongoDB database');
		return;
	}
	logger.log('info', 'Succesfully connected to MongoDB database');

	// Create TEMP user
	await ensureDefaultUser();
});

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

httpServer.listen(config.port, () => {
	logger.log('info', `API server is running on port ${config.port}`);
});
