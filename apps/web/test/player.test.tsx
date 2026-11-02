import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startFakeApi } from './support/fake-api';
import { currentPath, findLoginPage, openApp, returnPath } from './support/render-app';

/** Stands in for hls.js, which needs a real browser. Playback itself is checked in one. */
const fakeHls = vi.hoisted(() => {
	const fake = {
		url: undefined as string | undefined,
		config: undefined as { debug?: boolean } | undefined,
		destroyed: 0,
		fail: (() => {}) as (data: unknown) => void,
		Class: class {
			static Events = { ERROR: 'hlsError' };
			static isSupported = () => true;

			constructor(config: { debug?: boolean }) {
				fake.config = config;
			}

			on(_event: string, listener: (event: string, data: unknown) => void) {
				fake.fail = (data) => listener('hlsError', data);
			}

			loadSource(url: string) {
				fake.url = url;
			}

			attachMedia() {}

			destroy() {
				fake.destroyed += 1;
			}
		},
	};
	return fake;
});

vi.mock('hls.js', () => ({ default: fakeHls.Class }));

beforeEach(() => {
	fakeHls.url = undefined;
	fakeHls.destroyed = 0;
});

describe('the player', () => {
	it('asks for the playlist at /streams', async () => {
		startFakeApi({ signedIn: true });

		openApp('/watch/7');

		await waitFor(() => expect(fakeHls.url).toBe('/streams/7/playlist.m3u8'));
	});

	it('says so when a title is not prepared', async () => {
		startFakeApi({ signedIn: true });

		openApp('/watch/404');

		expect((await screen.findByRole('alert')).textContent).toBe('This title is not ready to play.');
	});

	it('returns to login on a 401 from a stream', async () => {
		const api = startFakeApi({ signedIn: true });

		openApp('/watch/7');
		await waitFor(() => expect(fakeHls.url).toBeDefined());
		api.signedIn = false;
		fakeHls.fail({ fatal: false, response: { code: 401 } });

		await findLoginPage();
		expect(currentPath()).toBe('/login');
		expect(returnPath()).toBe('/watch/7');
		await waitFor(() => expect(fakeHls.destroyed).toBeGreaterThan(0));
	});

	it('says so when a stream fails for another reason', async () => {
		startFakeApi({ signedIn: true });

		openApp('/watch/7');
		await waitFor(() => expect(fakeHls.url).toBeDefined());
		fakeHls.fail({ fatal: true, response: { code: 500 } });

		expect((await screen.findByRole('alert')).textContent).toBe('This title could not be played.');
	});
});
