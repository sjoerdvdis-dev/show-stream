export type Rectangle = { x: number; y: number; width: number; height: number };

/** How much of a saved window must still be on a screen for it to open there again. */
const minimumVisible = 64;

const overlap = (a: Rectangle, b: Rectangle) =>
	Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) >= minimumVisible &&
	Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) >= minimumVisible;

/**
 * The saved size and position, if enough of the window would still be on one of the screens.
 * After a screen is unplugged, only the size is kept, and the system places the window.
 */
export const restoredBounds = (
	saved: Rectangle | undefined,
	workAreas: Rectangle[],
): Rectangle | Pick<Rectangle, 'width' | 'height'> | undefined => {
	if (!saved) {
		return undefined;
	}
	if (workAreas.some((area) => overlap(saved, area))) {
		return saved;
	}
	return { width: saved.width, height: saved.height };
};
