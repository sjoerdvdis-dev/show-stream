import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';

/**
 * Colors come from the tokens in `@workspace/ui/tokens.css`, as `bg-card` or `text-destructive`,
 * so that both themes and the contrast test cover them.
 * Images such as `src/features/dev/poster.svg` are content, like TMDB posters, and are not checked.
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
const sources = [
	'index.html',
	...readdirSync(path.join(root, 'src'), { recursive: true, encoding: 'utf8' })
		.filter((file) => /\.(tsx?|css)$/.test(file) && !file.endsWith('routeTree.gen.ts'))
		.map((file) => path.join('src', file)),
];

it('finds the sources it checks', () => {
	expect(sources).toContain(path.join('src', 'index.css'));
	expect(sources).toContain(path.join('src', 'features', 'auth', 'credentials-form.tsx'));
});

it.each(sources)('%s uses no raw colors', (file) => {
	const text = readFileSync(path.join(root, file), 'utf8');
	expect(rawColors.flatMap((pattern) => text.match(pattern) ?? [])).toEqual([]);
});
