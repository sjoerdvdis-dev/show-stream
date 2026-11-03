import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { server } from './support/fake-api';
import { resetFakeSocket } from './support/fake-socket';

vi.mock('socket.io-client', async () => {
	const { fakeIo } = await import('./support/fake-socket');
	return { io: fakeIo };
});

// Route components load on demand, so a first visit can take a moment. The signed-in layout loads
// AppShell and its primitives, which took over 5 seconds on a CI runner busy with other packages' tests.
configure({ asyncUtilTimeout: 15_000 });

// Sonner and the router ask for these, and jsdom does not have them.
window.matchMedia = () => new EventTarget() as MediaQueryList;
window.scrollTo = () => {};

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));

beforeEach(() => {
	resetFakeSocket();
});

afterEach(() => {
	cleanup();
	server.resetHandlers();
});

afterAll(() => server.close());
