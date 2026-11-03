import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startApi, type TestApi, type TestClient } from './support/api';
import { clearLibrary, seedMovie } from './support/seed';

type Page = { items: { id: number; title: string }[]; total: number; page: number; pageSize: number };

describe('the paged library list', () => {
	let api: TestApi;
	let owner: TestClient;

	const list = async (query = ''): Promise<Page> => {
		const response = await owner.get(`/library/movies${query}`);
		expect(response.status).toBe(200);
		return response.json();
	};

	const titles = async (query = '') => (await list(query)).items.map(({ title }) => title);

	beforeAll(async () => {
		api = await startApi();
		owner = await api.createOwner();
	});

	beforeEach(() => {
		clearLibrary(api);
	});

	afterAll(async () => {
		await api?.stop();
	});

	it('is empty for an empty library', async () => {
		expect(await list()).toEqual({ items: [], total: 0, page: 1, pageSize: 24 });
	});

	it('lists titles by name by default', async () => {
		await seedMovie(api, 1, 'Brazil');
		await seedMovie(api, 2, 'alien');
		await seedMovie(api, 3, 'Casablanca');

		expect(await titles()).toEqual(['alien', 'Brazil', 'Casablanca']);
	});
});
