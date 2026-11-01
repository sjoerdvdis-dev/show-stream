import { spawn, type ChildProcess } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { MongoMemoryServer } from 'mongodb-memory-server';

const apiFolder = path.resolve(import.meta.dirname, '../..');

/** The version the `mongodb` service runs in `docker-compose.yml`. */
export const mongoVersion = '7.0.22';

// Fake values only. The API starts in a folder with no .env, so it reads nothing else.
const databaseUser = 'root';
const databasePassword = 'root';

export type TestApi = {
	/** The API's media folder, inside this server's temporary folder. */
	mediaFolder: string;
	/** Connection string of this server's own MongoDB. */
	databaseUrl: string;
	get: (route: string) => Promise<Response>;
	post: (route: string, body: unknown) => Promise<Response>;
	/** Retries `check` until it passes. Fails at once if the API process has gone. */
	waitFor: <T>(check: () => Promise<T>, timeoutMs?: number) => Promise<T>;
	/** Kills the API with no warning and starts it again on the same database and media. */
	restart: () => Promise<void>;
	stop: () => Promise<void>;
};

/**
 * Starts the real API as a child process, with its own database and folders.
 *
 * The API finds its media and log folders relative to its own source, so it runs from a
 * temporary copy of `src`. Started in place, it would write to the developer's `media`.
 */
export const startApi = async (): Promise<TestApi> => {
	const root = await mkdtemp(path.join(tmpdir(), 'show-stream-api-test-'));
	await cp(path.join(apiFolder, 'src'), path.join(root, 'src'), { recursive: true });
	await symlink(path.join(apiFolder, 'node_modules'), path.join(root, 'node_modules'));
	const mediaFolder = path.join(root, 'media');
	await mkdir(path.join(mediaFolder, 'movies'), { recursive: true });

	const database = await MongoMemoryServer.create({
		binary: { version: mongoVersion },
		auth: { enable: true, customRootName: databaseUser, customRootPwd: databasePassword },
	});
	const databaseUrl = new URL(database.getUri());
	const port = await findFreePort();
	const url = `http://127.0.0.1:${port}`;

	let process_: ChildProcess;
	let output = '';

	const launch = () => {
		output = '';
		process_ = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
			cwd: root,
			stdio: ['ignore', 'pipe', 'pipe'],
			env: {
				PATH: process.env.PATH,
				NODE_ENV: 'test',
				PORT: String(port),
				MONGO_DB_URL: databaseUrl.hostname,
				MONGO_DB_PORT: databaseUrl.port,
				MONGO_DB_USERNAME: databaseUser,
				MONGO_DB_PASSWORD: databasePassword,
				JWT_SECRET: 'fake-secret-for-api-tests',
				JWT_EXPIRES_IN: '3600',
				NEXT_CLIENT_URL: 'http://localhost:3000',
				TMDB_API_READ_ACCESS_TOKEN: 'fake-token-for-api-tests',
				// Sends TMDB calls to a closed port, so that they fail at once and offline.
				NODE_USE_ENV_PROXY: '1',
				HTTPS_PROXY: 'http://127.0.0.1:9',
			},
		});
		process_.stdout?.on('data', (data) => (output += data));
		process_.stderr?.on('data', (data) => (output += data));
	};

	const isRunning = () => process_.exitCode === null && process_.signalCode === null;

	const describeExit = () =>
		`API process exited (code ${process_.exitCode}, signal ${process_.signalCode}). Last output:\n${output.slice(-2000)}`;

	const request = (route: string, init?: RequestInit) =>
		fetch(`${url}${route}`, { ...init, signal: AbortSignal.timeout(10_000) });

	const get = (route: string) => request(route);

	const post = (route: string, body: unknown) =>
		request(route, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body),
		});

	const waitFor = async <T>(check: () => Promise<T>, timeoutMs = 20_000): Promise<T> => {
		const deadline = Date.now() + timeoutMs;
		for (;;) {
			if (!isRunning()) {
				throw new Error(describeExit());
			}
			try {
				return await check();
			} catch (error) {
				if (Date.now() > deadline) {
					throw error;
				}
			}
			await sleep(100);
		}
	};

	/** Ready means the API serves requests and has created the default account. */
	const waitUntilReady = () =>
		waitFor(async () => {
			const response = await post('/login', { username: 'admin', password: 'admin' });
			if (!response.ok) {
				throw new Error(`Login answered ${response.status} during startup`);
			}
		});

	const kill = async () => {
		if (isRunning()) {
			const exited = new Promise((resolve) => process_.once('exit', resolve));
			process_.kill('SIGKILL');
			await exited;
		}
	};

	launch();
	await waitUntilReady();

	return {
		mediaFolder,
		databaseUrl: `mongodb://${databaseUser}:${databasePassword}@${databaseUrl.host}/test?authSource=admin`,
		get,
		post,
		waitFor,
		restart: async () => {
			await kill();
			launch();
			await waitUntilReady();
		},
		stop: async () => {
			await kill();
			await database.stop();
			await rm(root, { recursive: true, force: true, maxRetries: 5 });
		},
	};
};

const findFreePort = () =>
	new Promise<number>((resolve, reject) => {
		const server = createServer();
		server.on('error', reject);
		server.listen(0, '127.0.0.1', () => {
			const address = server.address();
			server.close(() => {
				if (address && typeof address === 'object') {
					resolve(address.port);
				} else {
					reject(new Error('Could not read the free port'));
				}
			});
		});
	});
