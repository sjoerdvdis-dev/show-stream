import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startApi, type TestApi } from '../support/api';

describe('audit finding 9', () => {
	let api: TestApi;

	beforeAll(async () => {
		api = await startApi();
	});

	afterAll(async () => {
		await api?.stop();
	});

	it.fails('finding 9, fixed by item 6: login rejects a query operator as the username', async () => {
		const response = await api.post('/login', { username: { $ne: null }, password: 'admin' });

		expect([400, 401]).toContain(response.status);
	});
});
