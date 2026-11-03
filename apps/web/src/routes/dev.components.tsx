import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { devOnly } from '@/lib/dev-only';

/**
 * Imported lazily, because Base UI has top-level code that a static import would keep in the
 * build even when nothing renders it. In a build `DEV` is false, so nothing imports it at all.
 */
// eslint-disable-next-line turbo/no-undeclared-env-vars -- Vite sets DEV, and it is false in a build.
const ComponentsPreview = import.meta.env.DEV
	? lazy(() => import('@/features/dev/components-preview').then((module) => ({ default: module.ComponentsPreview })))
	: null;

/** Every token, primitive and pattern, for `pnpm dev` only. In a build the page answers as not found. */
export const Route = createFileRoute('/dev/components')({
	beforeLoad: devOnly,
	component: () =>
		ComponentsPreview ? (
			<Suspense>
				<ComponentsPreview />
			</Suspense>
		) : null,
});
