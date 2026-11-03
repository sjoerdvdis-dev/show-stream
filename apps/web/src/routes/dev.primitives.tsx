import { createFileRoute, lazyRouteComponent, notFound } from '@tanstack/react-router';

/* eslint-disable turbo/no-undeclared-env-vars -- Vite sets DEV, and it is false in a build. */

/**
 * The primitives preview, for `pnpm dev` only. In a build `DEV` is false, so the page answers as
 * not found and nothing imports the preview. It is imported lazily, because Base UI has top-level
 * code that a static import would keep in the build even when nothing renders it.
 */
export const Route = createFileRoute('/dev/primitives')({
	beforeLoad: () => {
		if (!import.meta.env.DEV) {
			throw notFound();
		}
	},
	component: import.meta.env.DEV
		? lazyRouteComponent(() => import('@/features/dev/primitives-preview'), 'PrimitivesPreview')
		: () => null,
});
