import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runApiUntilExit, startApi, type TestApi } from './support/api';

describe('configuration', () => {
	it('names every invalid variable and prints no value', async () => {
		const { code, output } = await runApiUntilExit({
			PORT: 'marker-one',
			SESSION_COOKIE_SECURE: 'marker-two',
			MEDIA_FOLDER: '/marker-three/missing',
		});

		expect(code).toBe(1);
		for (const name of ['PORT', 'SESSION_COOKIE_SECURE', 'MEDIA_FOLDER']) {
			expect(output).toContain(name);
		}
		expect(output).not.toContain('marker');
	});

	it.each([
		['PORT', '70000'],
		['PORT', '0'],
		['SESSION_COOKIE_SECURE', 'no'],
	])('rejects %s=%s', async (name, value) => {
		const { code, output } = await runApiUntilExit({ [name]: value });

		expect(code).toBe(1);
		expect(output).toContain(name);
	});

	describe('from a .env file', () => {
		let api: TestApi | undefined;

		afterEach(async () => {
			await api?.stop();
			api = undefined;
		});

		const example = () => readFile(path.resolve(import.meta.dirname, '../.env.example'), 'utf8');

		it('starts with a .env made by scripts/setup.sh, which has no TMDB token', async () => {
			api = await startApi({ envFile: await example() });

			expect((await api.get('/auth/setup')).status).toBe(200);
		});

		it('treats empty optional values as unset', async () => {
			api = await startApi({
				envFile: [
					'TMDB_API_READ_ACCESS_TOKEN=',
					'NEXT_CLIENT_URL=',
					'MEDIA_FOLDER=',
					'SESSION_COOKIE_SECURE=',
				].join('\n'),
			});

			const owner = await api.createOwner();

			expect((await owner.get('/movies')).status).toBe(200);
			expect((await owner.post('/scan')).status).toBe(202);
		});

		// Upgrades keep their .env, and unknown variables are ignored.
		it('starts with a .env from before SQLite, which still has the MongoDB variables', async () => {
			api = await startApi({
				envFile: [
					'MONGO_DB_URL=mongodb',
					'MONGO_DB_PORT=not-a-port',
					'MONGO_DB_USERNAME=root',
					'MONGO_DB_PASSWORD=root',
				].join('\n'),
			});

			expect((await api.get('/auth/setup')).status).toBe(200);
		});

		it('starts with a .env from before sessions, which still has the JWT variables', async () => {
			api = await startApi({ envFile: ['JWT_SECRET=fake-secret', 'JWT_EXPIRES_IN=not-a-number'].join('\n') });

			expect((await api.get('/auth/setup')).status).toBe(200);
		});

		it('lets the environment win over .env, and .env win over .env.development', async () => {
			api = await startApi({
				// Invalid, so the API only starts if the port from the environment wins.
				envFile: ['PORT=not-a-port', 'SESSION_COOKIE_SECURE=true'].join('\n'),
				developmentEnvFile: 'SESSION_COOKIE_SECURE=not-a-boolean',
			});

			expect((await api.get('/auth/setup')).status).toBe(200);
		});
	});
});
