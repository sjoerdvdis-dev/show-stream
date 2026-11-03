import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';

/**
 * Primitives take their colors from the tokens in `src/styles/tokens.css`, as `bg-popover` or
 * `bg-overlay/10`, so that both themes and the contrast test cover them. Upstream shadcn sometimes
 * writes `bg-black` or `bg-white`, which this catches after a `shadcn add`.
 */
const palette =
	'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const rawColors = [
	new RegExp(`\\b[a-z-]+-(?:${palette})-\\d{2,3}\\b`, 'g'),
	/\b[a-z-]+-(?:white|black)\b/g,
	/#[\da-f]{3,8}\b/gi,
	/\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color)\(/g,
];

const root = path.resolve(import.meta.dirname, '..');
const sources = ['components', 'hooks', 'lib'].flatMap((folder) =>
	readdirSync(path.join(root, 'src', folder))
		.filter((file) => /\.tsx?$/.test(file))
		.map((file) => path.join('src', folder, file)),
);

it('finds the sources it checks', () => {
	expect(sources).toContain(path.join('src', 'components', 'dialog.tsx'));
	expect(sources).toContain(path.join('src', 'hooks', 'use-mobile.ts'));
});

it.each(sources)('%s uses no raw colors', (file) => {
	const text = readFileSync(path.join(root, file), 'utf8');
	expect(rawColors.flatMap((pattern) => text.match(pattern) ?? [])).toEqual([]);
});
