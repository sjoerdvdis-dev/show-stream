import { execFile, spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const run = promisify(execFile);
const root = path.resolve(import.meta.dirname, '../../..');

/** Skips locally without Docker, as `pnpm test` needs none, but a run in CI must never pass without these. */
const hasDocker = spawnSync('docker', ['info']).status === 0;

if (!hasDocker) {
	if (process.env.CI) {
		throw new Error('Docker is required in CI, to check what Compose publishes.');
	}
	console.warn('Skipping the tests of what Compose publishes, because Docker is not running.');
}

type ComposeService = {
	image?: string;
	build?: { context: string; dockerfile: string };
	ports?: { host_ip?: string; published: string; protocol: string }[];
	healthcheck?: { test: string[] };
	depends_on?: Record<string, { condition: string }>;
	logging?: { driver: string; options?: Record<string, string> };
	environment?: Record<string, string | null>;
};

type ComposeConfig = { services: Record<string, ComposeService> };

/** `--no-env-resolution` keeps the values of any real env file out of the output. */
const composeConfig = async (files: string[]) => {
	const { stdout } = await run(
		'docker',
		['compose', ...files.flatMap((file) => ['-f', file]), '--profile', '*', 'config', '--format', 'json', '--no-env-resolution'],
		{ cwd: root },
	);
	return JSON.parse(stdout) as ComposeConfig;
};

const publishedPorts = async (files: string[]) =>
	Object.entries((await composeConfig(files)).services)
		.flatMap(([service, { ports = [] }]) =>
			ports.map(({ host_ip, published, protocol }) => ({ service, host_ip, published, protocol })),
		)
		.sort((a, b) => Number(a.published) - Number(b.published));

/** The Caddy image that the `caddy` service's Dockerfile ends on, which needs no build of the app. */
const caddyImage = async () => {
	const { build } = (await composeConfig(['docker-compose.yml'])).services.caddy!;
	const dockerfile = await readFile(path.resolve(build!.context, build!.dockerfile), 'utf8');
	return [...dockerfile.matchAll(/^FROM\s+(\S+)/gm)].at(-1)![1]!;
};

const validate = async (environment: Record<string, string>) => {
	const image = await caddyImage();
	await run('docker', [
		'run', '--rm',
		'--volume', `${path.join(root, 'infra/caddy/Caddyfile')}:/etc/caddy/Caddyfile:ro`,
		...Object.entries(environment).flatMap(([name, value]) => ['--env', `${name}=${value}`]),
		image,
		'caddy', 'validate', '--config', '/etc/caddy/Caddyfile', '--adapter', 'caddyfile',
	]);
};

describe.skipIf(!hasDocker)('the public entry', () => {
	const onlyCaddy = [
		{ service: 'caddy', host_ip: undefined, published: '80', protocol: 'tcp' },
		{ service: 'caddy', host_ip: undefined, published: '443', protocol: 'tcp' },
	];

	it('publishes only ports 80 and 443 over TCP, from Caddy', async () => {
		expect(await publishedPorts(['docker-compose.yml'])).toEqual(onlyCaddy);
	});

	it('publishes nothing more with the Tailscale override', async () => {
		expect(await publishedPorts(['docker-compose.yml', 'docker-compose.tailscale.yml'])).toEqual(onlyCaddy);
	});

	it('keeps every development port on loopback', async () => {
		const ports = await publishedPorts(['docker-compose.yml', 'docker-compose.dev.yml']);

		const development = ports.filter(({ service }) => service !== 'caddy');
		expect(development.length).toBeGreaterThan(0);
		expect(development.map(({ host_ip }) => host_ip)).toEqual(development.map(() => '127.0.0.1'));
	});

	it.each([
		['the default', {}],
		['internal', { TLS_MODE: 'internal', SITE_ADDRESS: 'server.home.arpa' }],
		['public', { TLS_MODE: 'public', SITE_ADDRESS: 'media.example.com' }],
		['tailscale', { TLS_MODE: 'tailscale', SITE_ADDRESS: 'media.tail-scale.ts.net' }],
	])('accepts %s in the Caddyfile', { timeout: 120_000 }, async (_name, environment) => {
		await expect(validate(environment)).resolves.toBeUndefined();
	});

	it('refuses a mode that does not exist', { timeout: 120_000 }, async () => {
		await expect(validate({ TLS_MODE: 'plain' })).rejects.toThrow('tls-plain');
	});
});

describe.skipIf(!hasDocker)('the Compose stack', () => {
	const stack = () => composeConfig(['docker-compose.yml']);

	it('has a health check on every service', async () => {
		const { services } = await stack();

		expect(Object.keys(services).sort()).toEqual(['api', 'caddy', 'worker']);
		for (const service of Object.values(services)) {
			expect(service.healthcheck?.test.length).toBeGreaterThan(0);
		}
	});

	it('starts a service only once what it needs is healthy', async () => {
		const { services } = await stack();

		const conditions = Object.values(services).flatMap(({ depends_on = {} }) =>
			Object.values(depends_on).map(({ condition }) => condition),
		);
		expect(new Set(conditions)).toEqual(new Set(['service_healthy']));
		expect(Object.keys(services.caddy!.depends_on!)).toEqual(['api']);
		expect(Object.keys(services.worker!.depends_on!)).toEqual(['api']);
	});

	it('builds Caddy with the web app inside it, so that no Node server is on the public path', async () => {
		const { caddy } = (await stack()).services;

		expect(caddy!.build?.dockerfile).toBe('./apps/web/Dockerfile');
		expect(await caddyImage()).toMatch(/^caddy:\d+\.\d+\.\d+-alpine$/);
	});

	it('checks the API on a route that is already public', async () => {
		const { services } = await stack();

		expect(services.api!.healthcheck!.test.at(-1)).toBe('http://127.0.0.1:5000/auth/setup');
	});

	it('caps the size of every log', async () => {
		for (const { logging } of Object.values((await stack()).services)) {
			expect(logging).toEqual({ driver: 'json-file', options: { 'max-size': '10m', 'max-file': '3' } });
		}
	});

	it('gives an optional .env to the worker alone', async () => {
		const folder = await mkdtemp(path.join(tmpdir(), 'show-stream-compose-test-'));
		const inThisFolder = async () => {
			const { stdout } = await run('docker', ['compose', 'config', '--format', 'json'], { cwd: folder });
			return (JSON.parse(stdout) as ComposeConfig).services;
		};
		try {
			await cp(path.join(root, 'docker-compose.yml'), path.join(folder, 'docker-compose.yml'));

			expect((await inThisFolder()).worker!.environment).not.toHaveProperty('TMDB_API_READ_ACCESS_TOKEN');

			await writeFile(path.join(folder, '.env'), 'TMDB_API_READ_ACCESS_TOKEN=fake-token\n');

			const services = await inThisFolder();
			expect(services.worker!.environment).toHaveProperty('TMDB_API_READ_ACCESS_TOKEN', 'fake-token');
			expect(services.api!.environment).not.toHaveProperty('TMDB_API_READ_ACCESS_TOKEN');
		} finally {
			await rm(folder, { recursive: true, force: true });
		}
	});
});

describe.skipIf(!hasDocker)('.dockerignore', () => {
	let folder: string;

	beforeAll(async () => {
		folder = await mkdtemp(path.join(tmpdir(), 'show-stream-dockerignore-test-'));
	});

	afterAll(async () => {
		await rm(folder, { recursive: true, force: true });
	});

	it('keeps every env file out of an image, except the tracked defaults', { timeout: 120_000 }, async () => {
		const context = path.join(folder, 'context');
		const image = path.join(folder, 'image');
		const excluded = [
			'.env',
			'.env.local',
			'apps/api/.env',
			'apps/api/.env.local',
			'apps/api/.env.backup',
			'apps/api/.env.development',
			'apps/web/.env.production.local',
			'apps/web/dist/.env',
			'packages/new-package/.env',
		];
		const kept = ['apps/api/.env.production', 'apps/api/package.json', 'apps/web/.env.production'];
		for (const file of [...excluded, ...kept]) {
			await mkdir(path.dirname(path.join(context, file)), { recursive: true });
			await writeFile(path.join(context, file), 'fake\n');
		}
		await cp(path.join(root, '.dockerignore'), path.join(context, '.dockerignore'));
		await writeFile(path.join(context, 'Dockerfile'), 'FROM scratch\nCOPY . /\n');

		// `scratch` needs no pull, and this writes the files to a folder rather than leaving an image.
		await run('docker', ['build', '--quiet', '--output', `type=local,dest=${image}`, context]);

		const entries = await readdir(image, { recursive: true, withFileTypes: true });
		const files = entries
			.filter((entry) => entry.isFile())
			.map((entry) => path.relative(image, path.join(entry.parentPath, entry.name)));
		expect(files.sort()).toEqual(kept);
	});
});
