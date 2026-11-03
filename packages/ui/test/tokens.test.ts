import { readFileSync } from 'node:fs';
import path from 'node:path';
import { inGamut, parse, rgb, wcagContrast, type Color } from 'culori';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

/**
 * Reads the stylesheet that apps import, so that it can never test a copy. The thresholds are the
 * ones in `docs/PLAN.md` section 9.3 and `DESIGN.md`.
 */
const stylesheet = path.resolve(import.meta.dirname, '../src/styles/tokens.css');

type Theme = 'light' | 'dark';

/** The custom properties a theme ends up with: `:root` rules for light, then `.dark` rules on top for dark. */
const readTheme = (theme: Theme): Map<string, string> => {
	const declared = new Map<string, string>();
	const root = postcss.parse(readFileSync(stylesheet, 'utf8'));
	const pass = (selector: string) =>
		root.walkRules((rule) => {
			if (rule.parent?.type !== 'root' || !rule.selectors.includes(selector)) {
				return;
			}
			rule.walkDecls(/^--/, (decl) => {
				declared.set(decl.prop.slice(2), decl.value);
			});
		});
	pass(':root');
	if (theme === 'dark') {
		pass('.dark');
	}
	return declared;
};

const resolve = (tokens: Map<string, string>, name: string, seen: string[] = []): string => {
	const value = tokens.get(name);
	if (value === undefined) {
		throw new Error(`--${name} is not defined`);
	}
	const reference = /^var\(--([\w-]+)\)$/.exec(value);
	if (!reference) {
		return value;
	}
	if (seen.includes(name)) {
		throw new Error(`--${name} refers to itself`);
	}
	return resolve(tokens, reference[1]!, [...seen, name]);
};

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
