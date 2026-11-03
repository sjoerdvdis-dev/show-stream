import { act, fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerControls, VideoPlayer } from '@workspace/ui/patterns/video-player';

/** Stands in for hls.js, which needs a real browser, as `apps/web/test/player.test.tsx` does. */
const fakeHls = vi.hoisted(() => {
	const fake = {
		supported: true,
		created: 0,
		url: undefined as string | undefined,
		config: undefined as { debug?: boolean } | undefined,
		media: undefined as HTMLMediaElement | undefined,
		destroyed: 0,
		fail: (() => {}) as (data: unknown) => void,
		Class: class {
			static Events = { ERROR: 'hlsError' };
			static isSupported = () => fake.supported;

			constructor(config: { debug?: boolean }) {
				fake.created += 1;
				fake.config = config;
			}

			on(_event: string, listener: (event: string, data: unknown) => void) {
				fake.fail = (data) => listener('hlsError', data);
			}

			loadSource(url: string) {
				fake.url = url;
			}

			attachMedia(media: HTMLMediaElement) {
				fake.media = media;
			}

			destroy() {
				fake.destroyed += 1;
			}
		},
	};
	return fake;
});

vi.mock('hls.js', () => ({ default: fakeHls.Class }));

beforeEach(() => {
	Object.assign(fakeHls, {
		supported: true,
		created: 0,
		url: undefined,
		config: undefined,
		media: undefined,
		destroyed: 0,
	});
});

/** A video element that plays nothing, since jsdom has no playback, but keeps and announces its state. */
const stubMedia = ({ duration = 600, currentTime = 0 } = {}) => {
	const media = document.createElement('video');
	let paused = true;
	let time = currentTime;
	let volume = 1;
	let muted = false;
	const emit = (type: string) => media.dispatchEvent(new Event(type));
	Object.defineProperties(media, {
		paused: { get: () => paused },
		duration: { get: () => duration },
		currentTime: {
			get: () => time,
			set: (value: number) => {
				time = value;
				emit('timeupdate');
			},
		},
		volume: {
			get: () => volume,
			set: (value: number) => {
				volume = value;
				emit('volumechange');
			},
		},
		muted: {
			get: () => muted,
			set: (value: boolean) => {
				muted = value;
				emit('volumechange');
			},
		},
	});
	media.play = vi.fn(() => {
		paused = false;
		emit('play');
		return Promise.resolve();
	});
	media.pause = vi.fn(() => {
		paused = true;
		emit('pause');
	});
	return media;
};

let fullscreenElement: Element | null = null;
Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fullscreenElement });
document.exitFullscreen = vi.fn(() => {
	fullscreenElement = null;
	document.dispatchEvent(new Event('fullscreenchange'));
	return Promise.resolve();
});

/** Renders the controls over a stubbed video, inside a player container that can go fullscreen. */
const renderControls = (options?: { duration?: number; currentTime?: number }) => {
	const media = stubMedia(options);
	const container = document.createElement('div');
	container.requestFullscreen = vi.fn(() => {
		fullscreenElement = container;
		document.dispatchEvent(new Event('fullscreenchange'));
		return Promise.resolve();
	});
	container.append(media);
	document.body.append(container);
	const host = container.appendChild(document.createElement('div'));
	render(<PlayerControls media={media} container={container} />, { container: host });
	return { media, container };
};

afterEach(() => {
	fullscreenElement = null;
	document.body.replaceChildren();
	vi.useRealTimers();
});

describe('PlayerControls', () => {
	it('plays and pauses with Space and K', async () => {
		const user = userEvent.setup();
		const { media } = renderControls();

		await user.keyboard(' ');
		expect(media.paused).toBe(false);
		expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
		await user.keyboard('k');
		expect(media.paused).toBe(true);
		expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
		await user.keyboard('K');
		expect(media.paused).toBe(false);
	});

	it('seeks 10 seconds with the arrow keys, within the video, and shows the time', async () => {
		const user = userEvent.setup();
		const { media } = renderControls({ duration: 3725, currentTime: 5 });
		expect(screen.getByText('0:05')).toBeTruthy();
		expect(screen.getByText('1:02:05')).toBeTruthy();

		await user.keyboard('{ArrowLeft}');
		expect(media.currentTime).toBe(0);
		await user.keyboard('{ArrowRight}{ArrowRight}');
		expect(media.currentTime).toBe(20);
		expect(screen.getByText('0:20')).toBeTruthy();

		media.currentTime = 3720;
		await user.keyboard('{ArrowRight}');
		expect(media.currentTime).toBe(3725);
	});

	it('changes the volume by 10 percent with Up and Down, and mutes with M', async () => {
		const user = userEvent.setup();
		const { media } = renderControls();

		await user.keyboard('{ArrowUp}');
		expect(media.volume).toBe(1);
		await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
		expect(media.volume).toBeCloseTo(0.7);

		await user.keyboard('m');
		expect(media.muted).toBe(true);
		expect(screen.getByRole('button', { name: 'Unmute' })).toBeTruthy();
		await user.keyboard('M');
		expect(media.muted).toBe(false);
		expect(screen.getByRole('button', { name: 'Mute' })).toBeTruthy();
	});

	it('unmutes when the volume goes up', async () => {
		const user = userEvent.setup();
		const { media } = renderControls();
		media.volume = 0.5;
		media.muted = true;

		await user.keyboard('{ArrowUp}');
		expect(media.muted).toBe(false);
		expect(media.volume).toBeCloseTo(0.6);
	});

	it('toggles fullscreen on the player with F', async () => {
		const user = userEvent.setup();
		const { container } = renderControls();

		await user.keyboard('f');
		expect(container.requestFullscreen).toHaveBeenCalledOnce();
		expect(screen.getByRole('button', { name: 'Exit full screen' })).toBeTruthy();
		await user.keyboard('F');
		expect(document.exitFullscreen).toHaveBeenCalledOnce();
		expect(screen.getByRole('button', { name: 'Full screen' })).toBeTruthy();
	});

	it('leaves keys alone while focus is in a text field', async () => {
		const user = userEvent.setup();
		const { media, container } = renderControls({ currentTime: 30 });
		const search = document.createElement('input');
		search.setAttribute('aria-label', 'Search');
		document.body.append(search);

		await user.click(search);
		await user.keyboard('k m f {ArrowLeft}{ArrowDown}');

		expect(search.value).toBe('k m f ');
		expect(media.paused).toBe(true);
		expect(media.muted).toBe(false);
		expect(media.currentTime).toBe(30);
		expect(media.volume).toBe(1);
		expect(container.requestFullscreen).not.toHaveBeenCalled();
	});

	it('lets the seek bar and volume slider keep their own arrow keys', async () => {
		const user = userEvent.setup();
		const { media } = renderControls({ currentTime: 30 });
		const seek = await screen.findByRole('slider', { name: 'Seek' });
		const volume = screen.getByRole('slider', { name: 'Volume' });

		act(() => seek.focus());
		await user.keyboard('{ArrowRight}');
		expect(media.currentTime).toBe(35);
		expect(media.volume).toBe(1);

		act(() => volume.focus());
		await user.keyboard('{ArrowDown}{ArrowLeft}');
		expect(media.volume).toBeCloseTo(0.9);
		expect(media.currentTime).toBe(35);
	});

	it('lets Space press a focused button instead of playing', async () => {
		const user = userEvent.setup();
		const { media } = renderControls();

		act(() => screen.getByRole('button', { name: 'Mute' }).focus());
		await user.keyboard(' ');

		expect(media.muted).toBe(true);
		expect(media.paused).toBe(true);
	});

	// user-event waits on timers that fake timers hold, so these tests send events directly.
	it('hides after 3 seconds of playback, and comes back on pointer movement or a key', () => {
		vi.useFakeTimers();
		const { container } = renderControls();
		// The controls say whether they show in `data-state`, which their styles read.
		const controlsState = () => screen.getByRole('group', { name: 'Player controls' }).getAttribute('data-state');

		fireEvent.keyDown(document.body, { key: 'k' });
		act(() => vi.advanceTimersByTime(2500));
		expect(controlsState()).toBe('visible');
		act(() => vi.advanceTimersByTime(600));
		expect(controlsState()).toBe('hidden');

		fireEvent.pointerMove(container);
		expect(controlsState()).toBe('visible');
		act(() => vi.advanceTimersByTime(3100));
		expect(controlsState()).toBe('hidden');

		fireEvent.keyDown(document.body, { key: 'Shift' });
		expect(controlsState()).toBe('visible');
	});

	it('stays while paused', () => {
		vi.useFakeTimers();
		renderControls();

		fireEvent.keyDown(document.body, { key: 'k' });
		fireEvent.keyDown(document.body, { key: 'k' });
		act(() => vi.advanceTimersByTime(10_000));

		expect(screen.getByRole('group', { name: 'Player controls' }).getAttribute('data-state')).toBe('visible');
	});
});

describe('VideoPlayer', () => {
	it('loads the playlist through hls.js, with its debug log off unless asked', () => {
		const { rerender } = render(<VideoPlayer src="/streams/7/playlist.m3u8" title="Alien" onUnauthorized={() => {}} />);

		expect(fakeHls.url).toBe('/streams/7/playlist.m3u8');
		expect(fakeHls.media).toBeInstanceOf(HTMLVideoElement);
		expect(fakeHls.config?.debug).toBe(false);
		expect(screen.getByText('Alien')).toBeTruthy();

		rerender(<VideoPlayer src="/streams/8/playlist.m3u8" title="Aliens" debug onUnauthorized={() => {}} />);
		expect(fakeHls.destroyed).toBe(1);
		expect(fakeHls.url).toBe('/streams/8/playlist.m3u8');
		expect(fakeHls.config?.debug).toBe(true);
	});
});

describe('VideoPlayer errors', () => {
	const renderPlayer = () => {
		const onUnauthorized = vi.fn();
		const onFatalError = vi.fn();
		const view = render(
			<VideoPlayer
				src="/streams/7/playlist.m3u8"
				title="Alien"
				onUnauthorized={onUnauthorized}
				onFatalError={onFatalError}
			/>,
		);
		return { onUnauthorized, onFatalError, ...view };
	};

	it('reports a 401 from hls.js, without showing an error', () => {
		const { onUnauthorized, onFatalError } = renderPlayer();

		act(() => fakeHls.fail({ fatal: false, details: 'fragLoadError', response: { code: 401 } }));

		expect(onUnauthorized).toHaveBeenCalledOnce();
		expect(onFatalError).not.toHaveBeenCalled();
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('reports a fatal error, and shows it in place of the controls', () => {
		const { onUnauthorized, onFatalError } = renderPlayer();

		act(() => fakeHls.fail({ fatal: true, details: 'manifestLoadError', response: { code: 500 } }));

		expect(onFatalError).toHaveBeenCalledWith('manifestLoadError');
		expect(onUnauthorized).not.toHaveBeenCalled();
		expect(screen.getByRole('alert').textContent).toContain('This title could not be played.');
		expect(screen.queryByRole('button', { name: 'Play' })).toBeNull();
	});

	it('ignores an error hls.js recovers from', () => {
		const { onFatalError } = renderPlayer();

		act(() => fakeHls.fail({ fatal: false, details: 'fragLoadError', response: { code: 500 } }));

		expect(onFatalError).not.toHaveBeenCalled();
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('destroys hls.js when it unmounts', () => {
		const { unmount } = renderPlayer();

		unmount();

		expect(fakeHls.destroyed).toBe(1);
	});

	it('shows a fatal error without onFatalError', () => {
		render(<VideoPlayer src="/streams/7/playlist.m3u8" title="Alien" onUnauthorized={() => {}} />);

		act(() => fakeHls.fail({ fatal: true, details: 'manifestLoadError', response: { code: 500 } }));

		expect(screen.getByRole('alert').textContent).toContain('This title could not be played.');
	});

	it('plays HLS natively where hls.js is not supported, and shows a media error', () => {
		fakeHls.supported = false;
		const { onFatalError, container } = renderPlayer();
		const video = container.querySelector('video');

		expect(fakeHls.created).toBe(0);
		expect(video?.getAttribute('src')).toBe('/streams/7/playlist.m3u8');
		act(() => video?.dispatchEvent(new Event('error')));
		expect(onFatalError).toHaveBeenCalledWith('mediaError');
		expect(screen.getByRole('alert')).toBeTruthy();
	});
});
