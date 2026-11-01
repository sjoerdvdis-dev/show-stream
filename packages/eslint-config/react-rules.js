import eslintReact from '@eslint-react/eslint-plugin';
import pluginReactHooks from 'eslint-plugin-react-hooks';

/**
 * React rules shared by the Next.js and React library configurations.
 *
 * @type {import("eslint").Linter.Config}
 * */
export const reactRules = [
	eslintReact.configs['recommended-typescript'],
	{
		plugins: {
			'react-hooks': pluginReactHooks,
		},
		rules: {
			...pluginReactHooks.configs.recommended.rules,
			// Already reported by react-hooks.
			'@eslint-react/error-boundaries': 'off',
			'@eslint-react/exhaustive-deps': 'off',
			'@eslint-react/purity': 'off',
			'@eslint-react/rules-of-hooks': 'off',
			'@eslint-react/set-state-in-effect': 'off',
			'@eslint-react/set-state-in-render': 'off',
			'@eslint-react/static-components': 'off',
			'@eslint-react/unsupported-syntax': 'off',
			'@eslint-react/use-memo': 'off',
		},
	},
];
