import { createFileRoute, notFound } from '@tanstack/react-router';
import { ThemePreview } from '@/features/dev/theme-preview';

/* eslint-disable turbo/no-undeclared-env-vars -- Vite sets DEV, and it is false in a build. */

/**
 * The theme preview, for `pnpm dev` only. In a build `DEV` is false, so the page answers as not
 * found, nothing refers to `ThemePreview`, and the build leaves it out.
 */
export const Route = createFileRoute('/dev/theme')({
	beforeLoad: () => {
		if (!import.meta.env.DEV) {
			throw notFound();
		}
	},
	component: import.meta.env.DEV ? ThemePreview : () => null,
});
