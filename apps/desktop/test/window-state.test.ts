import { describe, expect, it } from 'vitest';
import { restoredBounds } from '../src/window-state';

const screens = [
	{ x: 0, y: 0, width: 1920, height: 1040 },
	{ x: 1920, y: 0, width: 2560, height: 1400 },
];

describe('restoredBounds', () => {
	it('opens where the window was, when that is on a screen', () => {
		const saved = { x: 2000, y: 100, width: 1280, height: 800 };
		expect(restoredBounds(saved, screens)).toEqual(saved);
	});

	it('keeps only the size when the window was on a screen that is gone', () => {
		expect(restoredBounds({ x: 5000, y: 100, width: 1280, height: 800 }, screens)).toEqual({ width: 1280, height: 800 });
	});

	it('keeps only the size when too little of the window would show', () => {
		expect(restoredBounds({ x: -1250, y: 100, width: 1280, height: 800 }, screens)).toEqual({
			width: 1280,
			height: 800,
		});
	});

	it('leaves the default with nothing saved', () => {
		expect(restoredBounds(undefined, screens)).toBeUndefined();
	});
});
