import { inGamut, parse, rgb, wcagContrast, type Color } from 'culori';
import { describe, expect, it } from 'vitest';
import { readBlock, readTheme, readThemeInline, type Theme } from './support/tokens.js';

/**
 * Checks the theme in the stylesheet that apps import, so that a theme pasted from shadcn, or an
 * edit, can be trusted once this passes: every variable shadcn's components use, each with its own
 * value in both themes, mapped to Tailwind, in the sRGB gamut, and at the contrast `DESIGN.md`
 * asks for. Text pairs at 4.5:1, foreground on background at 7:1, status colors, charts and the
 * focus ring at 3:1.
 */

/**
 * The variables of a current shadcn theme, from `cssVarsV4` in
 * https://ui.shadcn.com/r/colors/zinc.json, read on 2026-11-03 for the base-nova style.
 * `radius` is declared once, in `:root`.
 */
const shadcnColors = [
	'background',
	'foreground',
	'card',
	'card-foreground',
	'popover',
	'popover-foreground',
	'primary',
	'primary-foreground',
	'secondary',
	'secondary-foreground',
	'muted',
	'muted-foreground',
	'accent',
	'accent-foreground',
	'destructive',
	'border',
	'input',
	'ring',
	'chart-1',
	'chart-2',
	'chart-3',
	'chart-4',
	'chart-5',
	'sidebar',
	'sidebar-foreground',
	'sidebar-primary',
	'sidebar-primary-foreground',
	'sidebar-accent',
	'sidebar-accent-foreground',
	'sidebar-border',
	'sidebar-ring',
];

/** ShowStream's own colors, added as shadcn documents for new ones. */
const ownColors = ['destructive-foreground', 'success', 'warning', 'info', 'overlay', 'overlay-foreground'];

const allColors = [...shadcnColors, ...ownColors];

const color = (tokens: Map<string, string>, name: string): Color => {
	const value = tokens.get(name);
	const parsed = value === undefined ? undefined : parse(value);
	if (!parsed || parsed.mode !== 'oklch') {
		throw new Error(`--${name} is ${value}, which is not an OKLCH color`);
	}
	return parsed;
};

/** `top` at `alpha` over `under`, mixed in sRGB as browsers do. */
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

/** A color as it shows on `under`, which matters for themes that give `border` or `input` an alpha. */
const shown = (top: Color, under: Color): Color => over(top, top.alpha ?? 1, under);

const surfaces = ['background', 'card', 'popover', 'muted', 'secondary', 'sidebar'];
const statuses = ['destructive', 'success', 'warning', 'info'];
const charts = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'];

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
	['sidebar-foreground', 'sidebar'],
	['sidebar-primary-foreground', 'sidebar-primary'],
	['sidebar-accent-foreground', 'sidebar-accent'],
];

const inSrgb = inGamut('rgb');
const white: Color = { mode: 'rgb', r: 1, g: 1, b: 1 };

describe('the variables', () => {
	it.each(['light', 'dark'] as const)('give every color its own value in the %s block', (theme) => {
		const block = readBlock(theme === 'light' ? ':root' : '.dark');
		for (const name of allColors) {
			expect(block.get(name), `--${name}`).toMatch(/^oklch\(/);
		}
	});

	it('declare no color in one theme and not the other', () => {
		const light = [...readBlock(':root').keys()].filter((name) => name !== 'radius').sort();
		expect([...readBlock('.dark').keys()].sort()).toEqual(light);
	});

	it('refer to no other variable, so that a pasted theme is never replaced', () => {
		for (const theme of ['light', 'dark'] as const) {
			const references = [...readTheme(theme)].filter(([, value]) => value.includes('var('));
			expect(references, theme).toEqual([]);
		}
	});

	it('are each mapped to a Tailwind color', () => {
		const inline = readThemeInline();
		for (const name of allColors) {
			expect(inline.get(`color-${name}`), `--color-${name}`).toBe(`var(--${name})`);
		}
	});

	it('keep the 0.6rem radius', () => {
		expect(readBlock(':root').get('radius')).toBe('0.6rem');
	});
});

describe.each<Theme>(['dark', 'light'])('the %s theme', (theme) => {
	const tokens = readTheme(theme);
	const contrast = (a: string, b: string) => {
		const under = color(tokens, b);
		return wcagContrast(shown(color(tokens, a), under), under);
	};

	/** Every variable that holds a color, so that one added later is covered too. */
	const colorTokens = [...tokens.keys()].filter((name) => tokens.get(name)?.startsWith('oklch('));

	it('finds the color variables', () => {
		expect(colorTokens).toEqual(expect.arrayContaining(allColors));
	});

	it.each(colorTokens)('has --%s in the sRGB gamut', (name) => {
		expect(inSrgb(color(tokens, name))).toBe(true);
	});

	it('has foreground on background at 7:1 or better', () => {
		expect(contrast('foreground', 'background')).toBeGreaterThanOrEqual(7);
	});

	it.each(textPairs)('has %s text on %s at 4.5:1 or better', (text, surface) => {
		expect(contrast(text, surface)).toBeGreaterThanOrEqual(4.5);
	});

	it.each([...statuses, ...charts].flatMap((status) => surfaces.map((surface) => [status, surface])))(
		'has %s on %s at 3:1 or better',
		(status, surface) => {
			expect(contrast(status!, surface!)).toBeGreaterThanOrEqual(3);
		},
	);

	it.each(surfaces)('has a focus ring on %s at 3:1 or better', (surface) => {
		expect(contrast('ring', surface)).toBeGreaterThanOrEqual(3);
	});

	it('has the sidebar focus ring at 3:1 or better', () => {
		expect(contrast('sidebar-ring', 'sidebar')).toBeGreaterThanOrEqual(3);
	});

	it('keeps overlay text readable at 75% over a white poster', () => {
		const scrim = over(color(tokens, 'overlay'), 0.75, white);
		expect(wcagContrast(color(tokens, 'overlay-foreground'), scrim)).toBeGreaterThanOrEqual(4.5);
	});
});
