import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startApi, type TestApi } from '../support/api';

describe('audit finding 14', () => {
	let api: TestApi;

	beforeAll(async () => {
		api = await startApi();
		await mkdir(path.join(api.mediaFolder, 'movies', 'Unknown Film (2024)'));
	});

	afterAll(async () => {
		await api?.stop();
	});

	// TMDB is unreachable in these tests, so the lookup for this movie fails.
	it.fails('finding 14, fixed by item 8: a scan whose lookups all failed does not report success', async () => {
		const response = await api.get('/scan');

		expect(response.status).not.toBe(200);
	});
});
