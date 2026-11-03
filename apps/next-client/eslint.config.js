import { nextJsConfig } from '@workspace/eslint-config/next-js';

/** @type {import("eslint").Linter.Config} */
export default [
	...nextJsConfig,
	{
		// The Radix primitives moved here from packages/ui, and leave with this app in Phase 2 item 8.
		files: ['components/ui/**'],
		rules: {
			'@eslint-react/no-array-index-key': 'off',
			'@eslint-react/no-context-provider': 'off',
			'@eslint-react/no-forward-ref': 'off',
			'@eslint-react/no-nested-component-definitions': 'off',
			'@eslint-react/no-use-context': 'off',
		},
	},
];
