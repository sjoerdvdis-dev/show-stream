import { inGamut, parse, rgb, wcagContrast, type Color } from 'culori';
import { describe, expect, it } from 'vitest';
import { readTheme, resolve, type Theme } from './support/tokens.js';

/**
 * Checks the stylesheet that apps import against the thresholds in `DESIGN.md`: text pairs at
 * 4.5:1, foreground on background at 7:1, status colors and the focus ring at 3:1, all in sRGB.
 */

const color = (tokens: Map<string, string>, name: string): Color => {
	const value = resolve(tokens, name);
	const parsed = parse(value);
	if (!parsed || parsed.mode !== 'oklch') {
		throw new Error(`--${name} is ${value}, which is not an OKLCH color`);
	}
	return parsed;
};

/** `color` at `alpha` over `under`, mixed in sRGB as browsers do. */
const over = (top: Color, alpha: number, under: Color): Color => {
	const a = rgb(top);
	const b = rgb(under);
	return {
		mode: 'rgb',
		r: a.r * alpha + b.r * (1 - alpha),
		g: a.g * alpha + b.g * (1 - alpha),
		b: a.b * alpha + b.b * (1 - alpha),
	};
};

const surfaces = ['background', 'card', 'popover', 'muted', 'secondary'];
const statuses = ['destructive', 'success', 'warning', 'info'];

/** Text and its surface, at 4.5:1. */
const textPairs: [text: string, surface: string][] = [
	...surfaces.flatMap((surface) =>
		['foreground', 'muted-foreground', 'primary', 'destructive'].map((text): [string, string] => [text, surface]),
	),
	['card-foreground', 'card'],
	['popover-foreground', 'popover'],
	['secondary-foreground', 'secondary'],
	['accent-foreground', 'accent'],
	['primary-foreground', 'primary'],
	['destructive-foreground', 'destructive'],
];

const colorTokens = [
	...surfaces,
	'foreground',
	'card-foreground',
	'popover-foreground',
	'muted-foreground',
	'secondary-foreground',
	'accent',
	'accent-foreground',
	'primary',
	'primary-foreground',
	'destructive-foreground',
	'success',
	'warning',
	'info',
	'overlay',
	'overlay-foreground',
	'border',
	'input',
	'ring',
	...statuses,
];

const inSrgb = inGamut('rgb');
const white: Color = { mode: 'rgb', r: 1, g: 1, b: 1 };

describe.each<Theme>(['dark', 'light'])('the %s theme', (theme) => {
	const tokens = readTheme(theme);
	const contrast = (a: string, b: string) => wcagContrast(color(tokens, a), color(tokens, b));

	it.each(colorTokens)('has --%s in the sRGB gamut', (name) => {
		expect(inSrgb(color(tokens, name))).toBe(true);
	});

	it('has foreground on background at 7:1 or better', () => {
		expect(contrast('foreground', 'background')).toBeGreaterThanOrEqual(7);
	});

	it.each(textPairs)('has %s text on %s at 4.5:1 or better', (text, surface) => {
		expect(contrast(text, surface)).toBeGreaterThanOrEqual(4.5);
	});

	it.each(statuses.flatMap((status) => surfaces.map((surface) => [status, surface])))(
		'has %s on %s at 3:1 or better',
		(status, surface) => {
			expect(contrast(status!, surface!)).toBeGreaterThanOrEqual(3);
		},
	);

	it.each(surfaces)('has a focus ring on %s at 3:1 or better', (surface) => {
		expect(contrast('ring', surface)).toBeGreaterThanOrEqual(3);
	});

	it('keeps overlay text readable at 75% over a white poster', () => {
		const scrim = over(color(tokens, 'overlay'), 0.75, white);
		expect(wcagContrast(color(tokens, 'overlay-foreground'), scrim)).toBeGreaterThanOrEqual(4.5);
	});
});

describe('the token mappings', () => {
	it.each<Theme>(['dark', 'light'])('map accent, input and ring in the %s theme', (theme) => {
		const tokens = readTheme(theme);
		expect(resolve(tokens, 'accent')).toBe(resolve(tokens, 'secondary'));
		expect(resolve(tokens, 'input')).toBe(resolve(tokens, 'border'));
		expect(resolve(tokens, 'ring')).toBe(resolve(tokens, 'primary'));
	});

	it('keeps the 0.6rem radius', () => {
		expect(readTheme('light').get('radius')).toBe('0.6rem');
	});
});
