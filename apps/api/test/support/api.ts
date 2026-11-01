import { spawn, type ChildProcess } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const apiFolder = path.resolve(import.meta.dirname, '../..');

// Fake values only. The API starts in a folder with no .env, so it reads nothing else.
const offlineEnvironment = {
	PATH: process.env.PATH,
	NODE_ENV: 'test',
	// Sends TMDB calls to a closed port, so that they fail at once and offline.
	NODE_USE_ENV_PROXY: '1',
	HTTPS_PROXY: 'http://127.0.0.1:9',
};

/** Runs from the temporary copy, so the API looks for its `.env` files there. */
const prepareFolder = async () => {
	const root = await mkdtemp(path.join(tmpdir(), 'show-stream-api-test-'));
	await cp(path.join(apiFolder, 'src'), path.join(root, 'src'), { recursive: true });
	await symlink(path.join(apiFolder, 'node_modules'), path.join(root, 'node_modules'));
	return root;
};

const launchArguments = ['--import', 'tsx', 'src/index.ts'];

export type ApiOptions = {
	/** Sets MEDIA_FOLDER. The folder must exist. By default the API uses its own media folder. */
	mediaFolder?: string;
	/** Written to `.env`. The API then gets its secrets from this file, not the environment. */
	envFile?: string;
	/** Written to `.env.development`, which the API reads after `.env`. */
	developmentEnvFile?: string;
	/** Answers TMDB calls with a fake movie, so that a scan can identify a title. */
	fakeTmdb?: boolean;
	/** Builds the SQLite file before the API first opens it, as an older version left it. */
	prepareDatabase?: (databasePath: string) => Promise<void>;
};

type Headers = Record<string, string>;

export type Requests = {
	get: (route: string, headers?: Headers) => Promise<Response>;
	post: (route: string, body?: unknown, headers?: Headers) => Promise<Response>;
};

/** Makes requests with a session. Everything on `TestApi` itself has none. */
export type TestClient = Requests & {
	/** The value of the `session` cookie. */
	token: string;
	/** The `cookie` header that carries the session. */
	cookie: string;
	/** Asks for `/auth/logout`, which ends this session. */
	logOut: () => Promise<Response>;
};

export const ownerCredentials = { username: 'owner', password: 'correct horse' };

export type TestApi = Requests & {
	/** The API's media folder. By default it is inside this server's temporary folder. */
	mediaFolder: string;
	/** The API's base URL. */
	url: string;
	/** Everything the API has printed since it last started. */
	output: () => string;
	/** This server's own SQLite file. */
	databasePath: string;
	/** Runs first-run setup, and returns a client with the owner's session. */
	createOwner: () => Promise<TestClient>;
	/** Logs in, and returns a client with the new session. */
	logIn: (username: string, password: string) => Promise<TestClient>;
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
export const startApi = async (options: ApiOptions = {}): Promise<TestApi> => {
	const root = await prepareFolder();
	const mediaFolder = options.mediaFolder ?? path.join(root, 'media');
	await mkdir(path.join(mediaFolder, 'movies'), { recursive: true });
	if (options.envFile) {
		await writeFile(path.join(root, '.env'), options.envFile);
	}
	if (options.developmentEnvFile) {
		await writeFile(path.join(root, '.env.development'), options.developmentEnvFile);
	}

	const databasePath = path.join(root, 'app.db');
	await options.prepareDatabase?.(databasePath);
	const port = await findFreePort();
	const url = `http://127.0.0.1:${port}`;

	let child: ChildProcess;
	let output = '';

	const launch = () => {
		output = '';
		const preload = options.fakeTmdb ? ['--import', path.join(import.meta.dirname, 'fake-tmdb.mjs')] : [];
		child = spawn(process.execPath, [...preload, ...launchArguments], {
			cwd: root,
			stdio: ['ignore', 'pipe', 'pipe'],
			env: {
				...offlineEnvironment,
				PORT: String(port),
				DATABASE_PATH: databasePath,
				...(options.envFile
					? {}
					: {
							NEXT_CLIENT_URL: 'http://localhost:3000',
							TMDB_API_READ_ACCESS_TOKEN: 'fake-token-for-api-tests',
						}),
				...(options.mediaFolder ? { MEDIA_FOLDER: options.mediaFolder } : {}),
			},
		});
		child.stdout?.on('data', (data) => (output += data));
		child.stderr?.on('data', (data) => (output += data));
	};

	const isRunning = () => child.exitCode === null && child.signalCode === null;

	const describeExit = () =>
		`API process exited (code ${child.exitCode}, signal ${child.signalCode}). Last output:\n${output.slice(-2000)}`;

	let requestCount = 0;

	/**
	 * Each request looks like a new address behind the proxy, so that a run of failed logins
	 * does not reach the rate limit. A test of that limit passes its own `x-forwarded-for`.
	 */
	const nextAddress = () => {
		requestCount += 1;
		return `198.18.${requestCount >> 8}.${requestCount & 255}`;
	};

	const request = (route: string, init: RequestInit) =>
		fetch(`${url}${route}`, {
			...init,
			headers: { 'x-forwarded-for': nextAddress(), ...init.headers },
			signal: AbortSignal.timeout(10_000),
		});

	const requestsWith = (headers: Headers = {}): Requests => ({
		get: (route, extraHeaders) => request(route, { headers: { ...headers, ...extraHeaders } }),
		post: (route, body = {}, extraHeaders) =>
			request(route, {
				method: 'POST',
				headers: { 'content-type': 'application/json', ...headers, ...extraHeaders },
				body: JSON.stringify(body),
			}),
	});

	const requests = requestsWith();

	const clientOf = async (response: Response): Promise<TestClient> => {
		if (!response.ok) {
			throw new Error(`Could not start a session: ${response.status} ${await response.text()}`);
		}
		const token = response.headers
			.getSetCookie()
			.find((cookie) => cookie.startsWith('session='))
			?.match(/^session=([^;]+)/)?.[1];
		if (!token) {
			throw new Error('The API set no session cookie');
		}
		const cookie = `session=${token}`;
		const client = requestsWith({ cookie });
		return { ...client, token, cookie, logOut: () => client.post('/auth/logout') };
	};

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

	const waitUntilReady = () =>
		waitFor(async () => {
			const response = await requests.get('/auth/setup');
			if (!response.ok) {
				throw new Error(`Setup status answered ${response.status} during startup`);
			}
		});

	const kill = async () => {
		if (isRunning()) {
			const exited = new Promise((resolve) => child.once('exit', resolve));
			child.kill('SIGKILL');
			await exited;
		}
	};

	launch();
	await waitUntilReady();

	return {
		mediaFolder,
		url,
		output: () => output,
		databasePath,
		...requests,
		createOwner: async () => clientOf(await requests.post('/auth/setup', ownerCredentials)),
		logIn: async (username, password) => clientOf(await requests.post('/auth/login', { username, password })),
		waitFor,
		restart: async () => {
			await kill();
			launch();
			await waitUntilReady();
		},
		stop: async () => {
			await kill();
			await rm(root, { recursive: true, force: true, maxRetries: 5 });
		},
	};
};

/**
 * Starts the API with only the given environment, for a start that should fail. It has no
 * database, so it must stop on its own. Resolves with its exit code and everything it printed.
 */
export const runApiUntilExit = async (environment: Record<string, string>) => {
	const root = await prepareFolder();
	try {
		const child = spawn(process.execPath, launchArguments, {
			cwd: root,
			stdio: ['ignore', 'pipe', 'pipe'],
			env: { ...offlineEnvironment, ...environment },
		});
		let output = '';
		child.stdout.on('data', (data) => (output += data));
		child.stderr.on('data', (data) => (output += data));
		const timeout = setTimeout(() => child.kill('SIGKILL'), 20_000);
		const code = await new Promise<number | null>((resolve) => child.once('close', resolve));
		clearTimeout(timeout);
		return { code, output };
	} finally {
		await rm(root, { recursive: true, force: true, maxRetries: 5 });
	}
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
