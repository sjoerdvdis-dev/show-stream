import { config } from '@workspace/eslint-config/react-internal';

/** @type {import("eslint").Linter.Config} */
export default [
	...config,
	{
		// The Radix primitives are replaced in Phase 2, so these are not worth fixing.
		rules: {
			'@eslint-react/no-array-index-key': 'off',
			'@eslint-react/no-context-provider': 'off',
			'@eslint-react/no-forward-ref': 'off',
			'@eslint-react/no-nested-component-definitions': 'off',
			'@eslint-react/no-use-context': 'off',
		},
	},
];
