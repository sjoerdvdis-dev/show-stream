import { readFileSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';

/** The stylesheet that apps import, so that tests never check a copy. */
const stylesheet = path.resolve(import.meta.dirname, '../../src/styles/tokens.css');

export type Theme = 'light' | 'dark';

/** The custom properties a theme ends up with: `:root` rules for light, then `.dark` rules on top for dark. */
export const readTheme = (theme: Theme): Map<string, string> => {
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

/** A token's value, following `var()` references to the value they end at. */
export const resolve = (tokens: Map<string, string>, name: string, seen: string[] = []): string => {
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

/** The tokens with a color of their own, rather than a reference to another. */
export const ownColors = (tokens: Map<string, string>) =>
	[...tokens].filter(([, value]) => value.startsWith('oklch(')).map(([name]) => name);
