import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { devOnly } from '@/lib/dev-only';

/**
 * Imported lazily, because Base UI has top-level code that a static import would keep in the
 * build even when nothing renders it. In a build `DEV` is false, so nothing imports it at all.
 */
// eslint-disable-next-line turbo/no-undeclared-env-vars -- Vite sets DEV, and it is false in a build.
const PrimitivesPreview = import.meta.env.DEV
	? lazy(() => import('@/features/dev/primitives-preview').then((module) => ({ default: module.PrimitivesPreview })))
	: null;

/** The primitives preview, for `pnpm dev` only. In a build the page answers as not found. */
export const Route = createFileRoute('/dev/primitives')({
	beforeLoad: devOnly,
	component: () =>
		PrimitivesPreview ? (
			<Suspense>
				<PrimitivesPreview />
			</Suspense>
		) : null,
});
