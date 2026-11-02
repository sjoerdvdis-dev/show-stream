import { execFile, spawnSync } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

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

type ComposeConfig = {
	services: Record<string, { image?: string; ports?: { host_ip?: string; published: string; protocol: string }[] }>;
};

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

const validate = async (environment: Record<string, string>) => {
	const { image } = (await composeConfig(['docker-compose.yml'])).services.caddy!;
	await run('docker', [
		'run', '--rm',
		'--volume', `${path.join(root, 'infra/caddy/Caddyfile')}:/etc/caddy/Caddyfile:ro`,
		...Object.entries(environment).flatMap(([name, value]) => ['--env', `${name}=${value}`]),
		image!,
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
