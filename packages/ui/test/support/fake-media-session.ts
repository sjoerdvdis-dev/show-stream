/**
 * The Media Session API, which jsdom does not have, as the operating system's media controls see it:
 * the metadata, the playback state, the last position, and an action handler per action. `press`
 * calls a handler as a lock screen, a headset or a media key would. `apps/web/test/support` has the
 * same fake, since test support is not shared between packages.
 */
export const fakeMediaSession = () => {
	const handlers = new Map<MediaSessionAction, MediaSessionActionHandler>();
	const session = {
		metadata: null as MediaMetadata | null,
		playbackState: 'none' as MediaSessionPlaybackState,
		/** The last position state, or `null` once it was cleared. */
		position: null as MediaPositionState | null,
		positionUpdates: 0,
		setActionHandler(action: MediaSessionAction, handler: MediaSessionActionHandler | null) {
			if (handler) handlers.set(action, handler);
			else handlers.delete(action);
		},
		setPositionState(state?: MediaPositionState) {
			session.position = state ?? null;
			session.positionUpdates += 1;
		},
	};

	class FakeMediaMetadata {
		title: string;
		artwork: MediaImage[];

		constructor(init: MediaMetadataInit = {}) {
			this.title = init.title ?? '';
			this.artwork = [...(init.artwork ?? [])];
		}
	}

	Object.defineProperty(navigator, 'mediaSession', { configurable: true, value: session });
	Object.defineProperty(globalThis, 'MediaMetadata', { configurable: true, writable: true, value: FakeMediaMetadata });

	return {
		session,
		/** The actions that have a handler now. */
		actions: () => [...handlers.keys()].sort(),
		press: (action: MediaSessionAction, details: Partial<MediaSessionActionDetails> = {}) => {
			const handler = handlers.get(action);
			if (!handler) throw new Error(`No handler for ${action}`);
			handler({ action, ...details });
		},
		/** Takes the API away again, as in a browser without it. */
		remove: () => {
			Reflect.deleteProperty(navigator, 'mediaSession');
			Reflect.deleteProperty(globalThis, 'MediaMetadata');
		},
	};
};
