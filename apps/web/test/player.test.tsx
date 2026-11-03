import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { startFakeApi } from './support/fake-api';
import { fakeSocket } from './support/fake-socket';
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

/**
 * jsdom has no playback, so a video here keeps whether it plays and tells its listeners, as a
 * browser does. Muting and volume are jsdom's own. jsdom has no layout either, and Base UI keeps a
 * slider's thumb hidden until it has a size, so every element gets one.
 */
const playing = new WeakSet<HTMLMediaElement>();
const media = HTMLMediaElement.prototype;
const original = {
	paused: Object.getOwnPropertyDescriptor(media, 'paused')!,
	play: media.play,
	pause: media.pause,
	getBoundingClientRect: HTMLElement.prototype.getBoundingClientRect,
};

beforeAll(() => {
	Object.defineProperty(media, 'paused', {
		configurable: true,
		get(this: HTMLMediaElement) {
			return !playing.has(this);
		},
	});
	media.play = function (this: HTMLMediaElement) {
		playing.add(this);
		this.dispatchEvent(new Event('play'));
		return Promise.resolve();
	};
	media.pause = function (this: HTMLMediaElement) {
		playing.delete(this);
		this.dispatchEvent(new Event('pause'));
	};
	HTMLElement.prototype.getBoundingClientRect = () => DOMRect.fromRect({ width: 100, height: 20 });
});

afterAll(() => {
	Object.defineProperty(media, 'paused', original.paused);
	media.play = original.play;
	media.pause = original.pause;
	HTMLElement.prototype.getBoundingClientRect = original.getBoundingClientRect;
});

beforeEach(() => {
	fakeHls.url = undefined;
	fakeHls.config = undefined;
	fakeHls.destroyed = 0;
});

const readyMovie = { id: 7, title: 'Demo Movie', status: 'ready' as const };

const controls = () => within(screen.getByRole('group', { name: 'Player controls' }));

describe('the player', () => {
	it('plays a ready title from /streams, with its name and a way back to its page', async () => {
		startFakeApi({ signedIn: true, movies: [readyMovie] });

		openApp('/watch/7');

		expect(await screen.findByRole('heading', { level: 1, name: 'Demo Movie' })).toBeTruthy();
		await waitFor(() => expect(fakeHls.url).toBe('/streams/7/playlist.m3u8'));
		expect(fakeHls.config?.debug).toBe(true);
		const back = within(screen.getByRole('main')).getByRole('link', { name: 'Movie details' });
		expect(back.getAttribute('href')).toBe('/movies/7');
	});

	it('plays, pauses, lowers the volume and mutes by keyboard', async () => {
		startFakeApi({ signedIn: true, movies: [readyMovie] });
		const user = userEvent.setup();

		openApp('/watch/7');
		await screen.findByRole('group', { name: 'Player controls' });

		await user.keyboard('k');
		expect(controls().getByRole('button', { name: 'Pause' })).toBeTruthy();
		await user.keyboard(' ');
		expect(controls().getByRole('button', { name: 'Play' })).toBeTruthy();
		const volume = controls().getByRole('slider', { name: 'Volume' });
		expect(volume.getAttribute('aria-valuenow')).toBe('100');
		await user.keyboard('{ArrowDown}');
		expect(volume.getAttribute('aria-valuenow')).toBe('90');
		await user.keyboard('m');
		expect(controls().getByRole('button', { name: 'Unmute' })).toBeTruthy();
		expect(volume.getAttribute('aria-valuenow')).toBe('0');
	});

	it('returns to login on a 401 from a stream', async () => {
		const api = startFakeApi({ signedIn: true, movies: [readyMovie] });

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
		startFakeApi({ signedIn: true, movies: [readyMovie] });

		openApp('/watch/7');
		await waitFor(() => expect(fakeHls.url).toBeDefined());
		fakeHls.fail({ fatal: true, details: 'manifestLoadError', response: { code: 500 } });

		expect((await screen.findByRole('alert')).textContent).toContain('This title could not be played.');
	});

	it('shows the status of a title that is not ready, and prepares it with Play', async () => {
		const api = startFakeApi({ signedIn: true, movies: [{ id: 7, title: 'Demo Movie' }] });
		const user = userEvent.setup();

		openApp('/watch/7');

		expect(await screen.findByRole('heading', { name: 'Demo Movie is not ready to play' })).toBeTruthy();
		expect(screen.getByText('Not ready')).toBeTruthy();
		expect(fakeHls.url).toBeUndefined();

		await user.click(screen.getByRole('button', { name: 'Play Demo Movie' }));

		expect(await screen.findByRole('button', { name: 'Preparing Demo Movie' })).toBeTruthy();
		expect(api.playRequests.get(7)).toBe(1);
	});

	it('starts to play a title being prepared once it is ready', async () => {
		const api = startFakeApi({ signedIn: true, movies: [{ id: 7, title: 'Demo Movie', status: 'in progress' }] });

		openApp('/watch/7');
		expect(await screen.findByRole('button', { name: 'Preparing Demo Movie' })).toBeTruthy();

		api.movies[0]!.status = 'ready';
		fakeSocket.receive('notification', { type: 'transcode:ready', data: { id: 7, title: 'Demo Movie' } });

		await waitFor(() => expect(fakeHls.url).toBe('/streams/7/playlist.m3u8'));
		expect(screen.queryByRole('heading', { name: 'Demo Movie is not ready to play' })).toBeNull();
	});

	it('shows why a failed title failed, with Retry', async () => {
		startFakeApi({
			signedIn: true,
			movies: [{ id: 7, title: 'Demo Movie', status: 'failed', failureReason: 'Invalid data found' }],
		});

		openApp('/watch/7');

		expect(await screen.findByRole('heading', { name: 'Demo Movie is not ready to play' })).toBeTruthy();
		expect(screen.getAllByText('Invalid data found').length).toBeGreaterThan(0);
		expect(screen.getByRole('button', { name: 'Retry Demo Movie' })).toBeTruthy();
	});

	it('says so when the title is not in the library', async () => {
		startFakeApi({ signedIn: true });

		openApp('/watch/7');

		expect(await screen.findByRole('heading', { name: 'This movie is not in the library' })).toBeTruthy();
		expect(fakeHls.url).toBeUndefined();
	});
});
