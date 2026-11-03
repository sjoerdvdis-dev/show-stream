import { readFileSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';

/** The stylesheet that apps import, so that tests never check a copy. */
const stylesheet = path.resolve(import.meta.dirname, '../../src/styles/tokens.css');

const parse = () => postcss.parse(readFileSync(stylesheet, 'utf8'));

export type Theme = 'light' | 'dark';

/** The custom properties declared in top-level rules for `selector`, in every such block. */
export const readBlock = (selector: ':root' | '.dark'): Map<string, string> => {
	const declared = new Map<string, string>();
	parse().walkRules((rule) => {
		if (rule.parent?.type !== 'root' || !rule.selectors.includes(selector)) {
			return;
		}
		rule.walkDecls(/^--/, (decl) => {
			declared.set(decl.prop.slice(2), decl.value);
		});
	});
	return declared;
};

/** The custom properties a theme ends up with: `:root` for light, then `.dark` on top for dark. */
export const readTheme = (theme: Theme): Map<string, string> =>
	theme === 'light' ? readBlock(':root') : new Map([...readBlock(':root'), ...readBlock('.dark')]);

/** What `@theme inline` declares, such as `color-card` and `radius-lg`. */
export const readThemeInline = (): Map<string, string> => {
	const declared = new Map<string, string>();
	parse().walkAtRules('theme', (atRule) => {
		atRule.walkDecls(/^--/, (decl) => {
			declared.set(decl.prop.slice(2), decl.value);
		});
	});
	return declared;
};
