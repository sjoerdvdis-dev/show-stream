import { readFileSync } from 'node:fs';
import path from 'node:path';
import { formatHex } from 'culori';
import { describe, expect, it } from 'vitest';
import { ownColors, readTheme, resolve, type Theme } from './support/tokens.js';

/**
 * `DESIGN.md` is where people and design agents read the tokens, and `tokens.css` is what ships.
 * These keep the two from drifting apart.
 */
const designMd = readFileSync(path.resolve(import.meta.dirname, '../../../DESIGN.md'), 'utf8');

const frontmatterColors = new Map(
	[...designMd.matchAll(/^ {2}([\w-]+): ["'](oklch\([^"']+\))["']$/gm)].map(([, key, value]) => [key!, value!]),
);

/** Rows of the table in Colors: token, role, dark, dark hex, light, light hex, each in backticks but the role. */
const tableRows = new Map(
	designMd
		.split('\n')
		.filter((line) => line.startsWith('| `'))
		.map((line) =>
			line
				.split('|')
				.slice(1, -1)
				.map((cell) => cell.trim().replace(/^`(.*)`$/, '$1')),
		)
		.map(([token, , dark, darkHex, light, lightHex]) => [token!, { dark, darkHex, light, lightHex }]),
);

const themes: Theme[] = ['dark', 'light'];
/** `overlay` and `overlay-foreground` are the same in both themes, so the frontmatter lists them once. */
const sharedTokens = ['overlay', 'overlay-foreground'];

describe('DESIGN.md', () => {
	it.each(themes)('lists every %s color in its frontmatter, with the shipped value', (theme) => {
		const tokens = readTheme(theme);
		for (const name of ownColors(tokens)) {
			const key = sharedTokens.includes(name) ? name : `${theme}-${name}`;
			expect(frontmatterColors.get(key), `colors.${key}`).toBe(resolve(tokens, name));
		}
	});

	it('lists no frontmatter color that does not ship', () => {
		const shipped = new Set([
			...sharedTokens,
			...themes.flatMap((theme) => ownColors(readTheme(theme)).map((name) => `${theme}-${name}`)),
		]);
		expect([...frontmatterColors.keys()].filter((key) => !shipped.has(key))).toEqual([]);
	});

	it.each(themes)('has a table row for every %s color, with the shipped value and its hex', (theme) => {
		const tokens = readTheme(theme);
		for (const name of ownColors(tokens)) {
			const row = tableRows.get(name);
			expect(row, `the row for ${name}`).toBeDefined();
			const value = resolve(tokens, name);
			expect(row?.[theme], `${name} in ${theme}`).toBe(value);
			expect(row?.[`${theme}Hex`], `${name} hex in ${theme}`).toBe(formatHex(value));
		}
	});
});
