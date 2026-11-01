import dotenv from 'dotenv';

dotenv.config({
	path: '.env',
});
dotenv.config({
	path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development',
});

import path from 'path';
import { createServer } from './server';
import { setupDb } from './db';
import { streamVideoFile, transcodePlaylist, transcodeRequest } from './video';
import { getMovie, getMovies, getShows, mediaScan } from './media';
import { removeSocketNotifications, setupSocketNotifications } from './notification';
import { login, register, authenticate } from './auth';

const port = process.env.PORT || 5000;
const { httpServer, io, app, logger } = createServer();

// Database Setup

setupDb().then((connected: boolean) => {
	if (!connected) {
		logger.log('error', 'Failed to connect to MongoDB database');
		return;
	}
	logger.log('info', 'Succesfully connected to MongoDB database');

	// Create TEMP user
	register({ username: 'admin', password: 'admin'})
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

// API Routes

app.post('/register', async (req, res) => {
	const body = req.body;
	if (!body.username || !body.password) {
		res.status(400).send('Username and password are required');
		return;
	}
	const { status, error, data } = await register({ username: body.username, password: body.password });
	res.status(status).json(data);
});

app.post('/login', async (req, res) => {
	const body = req.body;
	if (!body.username || !body.password) {
		res.status(400).send('Username and password are required');
		return;
	}
	const { status, error, data } = await login({ username: body.username, password: body.password });
	res.status(status).json(data);
});

app.post('/authenticate', async (req, res) => {
	const body = req.body;
	if (!body.token) {
		res.status(400).send('Token is required');
		return;
	}
	const { status, error, data } = await authenticate({ token: body.token });
	res.status(status).json(data);
});

app.get('/scan', async (_req, res) => {
	const mediaFolder = process.env.MEDIA_FOLDER || path.resolve(__dirname, '../media');
	const { success } = await mediaScan(mediaFolder, logger);
	if (!success) {
		res.status(500).send('Failed to scan media folder');
		return;
	}
	res.status(200).send('Successfully scanned media folder');
});

app.get('/transcode/request/:id', async (req, res) => {
	const { id } = req.params;
	const { status, data } = await transcodeRequest({ id: Number(id), logger });
	res.status(status).json(data);
});

app.get('/transcode/playlist/:id', async (req, res) => {
	const { id } = req.params;
	const { status, data } = await transcodePlaylist({ id: Number(id), logger });
	res.status(status).json(data);
});

app.get('/streams/:id/:file', async (req, res) => {
	const { id, file } = req.params;
	streamVideoFile({ id: Number(id), file, logger, req, res });
});

app.get('/movies', async (_req, res) => {
	const { status, data } = await getMovies();
	res.status(status).json(data);
});

app.get('/shows', async (_req, res) => {
	const { status, data } = await getShows();
	res.status(status).json(data);
});

app.get('/movie/:id', async (req, res) => {
	const { id } = req.params;
	const { status, data } = await getMovie({ id: Number(id) });
	res.status(status).json(data);
});

// HTTP Setup

httpServer.listen(port, () => {
	logger.log('info', `API server is running on port ${port}`);
});
