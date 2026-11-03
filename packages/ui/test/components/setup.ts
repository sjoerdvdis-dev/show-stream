import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom has no layout, so every element measures as zero. Base UI keeps a slider thumb hidden until
// it has a size, so give every element one.
HTMLElement.prototype.getBoundingClientRect = function () {
	return DOMRect.fromRect({ width: 100, height: 20 });
};

// cmdk asks for these, and jsdom does not have them.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
};
Element.prototype.scrollIntoView ??= () => {};

afterEach(() => {
	cleanup();
});
