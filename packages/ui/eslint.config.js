import { config } from '@workspace/eslint-config/react-internal';

/**
 * Upstream shadcn code breaks these rules, and is kept as it is so that `shadcn add --diff` shows
 * only real changes. Each rule is off only in the files that break it.
 *
 * @type {import("eslint").Linter.Config}
 */
export default [
	...config,
	{
		files: ['src/components/calendar.tsx'],
		rules: { '@eslint-react/no-nested-component-definitions': 'off' },
	},
	{
		files: ['src/components/drawer.tsx', 'src/components/sidebar.tsx'],
		rules: { '@eslint-react/no-context-provider': 'off', '@eslint-react/no-use-context': 'off' },
	},
	{
		files: ['src/components/field.tsx'],
		rules: { '@eslint-react/no-array-index-key': 'off' },
	},
	{
		files: ['src/components/sidebar.tsx', 'src/hooks/use-mobile.ts'],
		rules: { '@eslint-react/use-state': 'off', 'react-hooks/set-state-in-effect': 'off' },
	},
];
