import { cleanup, configure } from '@testing-library/react';
import { toast } from 'sonner';
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
// A toast captures the pointer to follow a swipe, which jsdom cannot.
Element.prototype.setPointerCapture = () => {};
Element.prototype.releasePointerCapture = () => {};

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));

beforeEach(() => {
	resetFakeSocket();
});

afterEach(() => {
	cleanup();
	// Sonner keeps its toasts in the module, and shows them again to the next test's Toaster.
	toast.dismiss();
	server.resetHandlers();
});

afterAll(() => server.close());
