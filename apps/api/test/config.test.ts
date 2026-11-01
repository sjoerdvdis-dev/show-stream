import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runApiUntilExit, startApi, type TestApi } from './support/api';

const validEnvironment = {
	JWT_SECRET: 'fake-secret',
	JWT_EXPIRES_IN: '3600',
};

describe('configuration', () => {
	it('refuses to start, and names every missing variable', async () => {
		const { code, output } = await runApiUntilExit({});

		expect(code).toBe(1);
		for (const name of Object.keys(validEnvironment)) {
			expect(output).toContain(name);
		}
	});

	it('treats an empty required value as missing', async () => {
		const { code, output } = await runApiUntilExit({ ...validEnvironment, JWT_SECRET: '' });

		expect(code).toBe(1);
		expect(output).toContain('JWT_SECRET is required');
	});

	it('names every invalid variable and prints no value', async () => {
		const { code, output } = await runApiUntilExit({
			...validEnvironment,
			PORT: 'marker-one',
			JWT_EXPIRES_IN: 'marker-two',
			MEDIA_FOLDER: '/marker-three/missing',
		});

		expect(code).toBe(1);
		for (const name of ['PORT', 'JWT_EXPIRES_IN', 'MEDIA_FOLDER']) {
			expect(output).toContain(name);
		}
		expect(output).not.toContain('marker');
		expect(output).not.toContain('fake-secret');
	});

	it.each([
		['PORT', '70000'],
		['PORT', '0'],
		['JWT_EXPIRES_IN', '0'],
		['JWT_EXPIRES_IN', '1h'],
	])('rejects %s=%s', async (name, value) => {
		const { code, output } = await runApiUntilExit({ ...validEnvironment, [name]: value });

		expect(code).toBe(1);
		expect(output).toContain(name);
	});

	describe('from a .env file', () => {
		let api: TestApi | undefined;

		afterEach(async () => {
			await api?.stop();
			api = undefined;
		});

		// The same substitution as create_env in scripts/setup.sh.
		const setupEnvFile = async () => {
			const example = await readFile(path.resolve(import.meta.dirname, '../.env.example'), 'utf8');
			return example.replace(/^JWT_SECRET=.*$/m, 'JWT_SECRET=0123456789abcdef');
		};

		it('starts with a .env made by scripts/setup.sh, which has no TMDB token', async () => {
			api = await startApi({ envFile: await setupEnvFile() });

			expect((await api.get('/movies')).status).toBe(200);
		});

		it('accepts a short JWT_SECRET and treats empty optional values as unset', async () => {
			api = await startApi({
				envFile: [
					'JWT_SECRET=short',
					'JWT_EXPIRES_IN=3600',
					'TMDB_API_READ_ACCESS_TOKEN=',
					'NEXT_CLIENT_URL=',
					'MEDIA_FOLDER=',
				].join('\n'),
			});

			expect((await api.get('/movies')).status).toBe(200);
			expect((await api.get('/scan')).status).toBe(200);
		});

		// Upgrades keep their .env, and unknown variables are ignored.
		it('starts with a .env from before SQLite, which still has the MongoDB variables', async () => {
			api = await startApi({
				envFile: [
					'MONGO_DB_URL=mongodb',
					'MONGO_DB_PORT=not-a-port',
					'MONGO_DB_USERNAME=root',
					'MONGO_DB_PASSWORD=root',
					'JWT_SECRET=fake-secret',
					'JWT_EXPIRES_IN=3600',
				].join('\n'),
			});

			expect((await api.get('/movies')).status).toBe(200);
		});

		it('lets the environment win over .env, and .env win over .env.development', async () => {
			api = await startApi({
				envFile: [
					'JWT_SECRET=fake-secret',
					'JWT_EXPIRES_IN=3600',
					// Invalid, so the API only starts if the port from the environment wins.
					'PORT=not-a-port',
				].join('\n'),
				developmentEnvFile: 'JWT_EXPIRES_IN=not-a-number',
			});

			expect((await api.get('/movies')).status).toBe(200);
		});
	});
});
