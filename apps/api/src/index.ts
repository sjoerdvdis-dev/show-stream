import { config } from './config';
import { createLogger } from './log';
import { createServer } from './server';
import {
	announceFinishedTranscodes,
	streamVideoFile,
	transcodePlaylist,
	transcodeRequest,
	transcodeRetry,
} from './video';
import { getMovie, getMovies, getShows, mediaScan } from './media';
import { setupNotifications } from './notification';
import { login, logout, me, removeExpiredSessions, setup, setupStatus } from './auth';

const announceIntervalMs = 500;

const logger = createLogger();

// API Routes

const { httpServer, io } = createServer(
	{
		setupStatus: () => setupStatus(),
		setup: ({ body }, res) => setup(body, res),
		login: ({ body }, res) => login(body, res),
		logout: ({ session }, res) => logout(session, res),
		me: ({ session }) => me(session),
		scan: async () => {
			await mediaScan(config.mediaFolder, logger);
			return 'Successfully scanned media folder';
		},
		transcodeRequest: ({ params, session }) => transcodeRequest({ id: params.id, userId: session.user.id, logger }),
		transcodeRetry: ({ params, session }) => transcodeRetry({ id: params.id, userId: session.user.id }),
		transcodePlaylist: ({ params }) => transcodePlaylist({ id: params.id, logger }),
		stream: ({ params }, res) => streamVideoFile({ ...params, res }),
		movies: () => getMovies(),
		shows: () => getShows(),
		movie: ({ params }) => getMovie({ id: params.id }),
	},
	logger,
);

// Socket.io Setup

setupNotifications(io);

io.on('connection', (socket) => {
	logger.info(`New socket connection: ${socket.id}`);

	socket.on('disconnect', () => {
		logger.info(`Socket disconnected: ${socket.id}`);
	});
});

// HTTP Setup

// Importing `./db` has applied the migrations, so the server only listens on a current schema.
removeExpiredSessions();

httpServer.listen(config.port, () => {
	logger.log('info', `API server is running on port ${config.port}`);
});

setInterval(() => {
	try {
		announceFinishedTranscodes();
	} catch (error) {
		// Most likely a busy database. Nothing has been announced, so the next run tries again.
		logger.error('Could not announce finished transcodes', { error });
	}
}, announceIntervalMs);
