import { vi } from 'vitest';

type Listener = (payload: unknown) => void;

/** Stands in for Socket.IO. The real connection is checked in a browser. */
export const fakeSocket = {
	opened: 0,
	closed: 0,
	listeners: new Map<string, Listener>(),
	receive(event: string, payload: unknown) {
		this.listeners.get(event)?.(payload);
	},
	get isOpen() {
		return this.opened > this.closed;
	},
};

export const fakeIo = vi.fn(() => {
	fakeSocket.opened += 1;
	return {
		on: (event: string, listener: Listener) => fakeSocket.listeners.set(event, listener),
		disconnect: () => {
			fakeSocket.closed += 1;
		},
	};
});

export const resetFakeSocket = () => {
	fakeSocket.opened = 0;
	fakeSocket.closed = 0;
	fakeSocket.listeners.clear();
	fakeIo.mockClear();
};
